const GEMINI_MODEL = 'gemini-3.6-flash';
const GEMINI_API_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;
const GEMINI_STREAM_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:streamGenerateContent?alt=sse`;

const REQUEST_TIMEOUT_MS = 20000;
const STREAM_TIMEOUT_MS = 60000;
const MAX_RETRIES = 1;
const RETRY_DELAY_MS = 500;
const MAX_HISTORY_TURNS = 16;
const MAX_HISTORY_TEXT = 6000;
const MAX_OUTPUT_TOKENS = 800;

function sendJson(res, status, payload) { res.status(status).json(payload); }

const FUNCTION_DECLARATIONS = [
  { name: 'getTradesByPeriod', description: 'Récupère tous les trades de l’utilisateur ouverts dans une plage de dates précise. Utilise cette fonction lorsque la question demande les trades eux-mêmes sur une période.', parameters: { type: 'OBJECT', properties: { dateDebut: { type: 'STRING', description: 'Date de début au format YYYY-MM-DD, incluse.' }, dateFin: { type: 'STRING', description: 'Date de fin au format YYYY-MM-DD, incluse.' } }, required: ['dateDebut', 'dateFin'] } },
  { name: 'getTradesByPair', description: 'Récupère tous les trades correspondant à une paire/instrument précis.', parameters: { type: 'OBJECT', properties: { paire: { type: 'STRING', description: 'Paire/instrument, par exemple GBPUSD ou XAUUSD.' } }, required: ['paire'] } },
  { name: 'getTradesBySetup', description: 'Récupère tous les trades correspondant à un setup précis.', parameters: { type: 'OBJECT', properties: { setup: { type: 'STRING', description: 'Nom exact du setup/PD Array.' } }, required: ['setup'] } },
  { name: 'getStatsForFilter', description: 'Calcule les statistiques exactes des trades correspondant à une combinaison de filtres. Utilise cette fonction pour répondre à une question de performance filtrée.', parameters: { type: 'OBJECT', properties: { filtres: { type: 'OBJECT', description: 'Filtres optionnels combinables : paire, dateDebut, dateFin, session, setup.', properties: { paire: { type: 'STRING', description: 'Paire/instrument, par exemple GBPUSD ou XAUUSD.' }, dateDebut: { type: 'STRING', description: 'Date de début YYYY-MM-DD.' }, dateFin: { type: 'STRING', description: 'Date de fin YYYY-MM-DD.' }, session: { type: 'STRING', description: 'Session de trading, par exemple LONDON, NEW_YORK, TOKYO ou SYDNEY.' }, setup: { type: 'STRING', description: 'Nom exact du setup/PD Array.' } } } } } },
  { name: 'compareTwoPeriods', description: 'Compare les statistiques exactes de deux périodes.', parameters: { type: 'OBJECT', properties: { dateDebut1: { type: 'STRING', description: 'Début période 1 YYYY-MM-DD.' }, dateFin1: { type: 'STRING', description: 'Fin période 1 YYYY-MM-DD.' }, dateDebut2: { type: 'STRING', description: 'Début période 2 YYYY-MM-DD.' }, dateFin2: { type: 'STRING', description: 'Fin période 2 YYYY-MM-DD.' } }, required: ['dateDebut1', 'dateFin1', 'dateDebut2', 'dateFin2'] } },
  { name: 'getBestTrades', description: 'Renvoie les N meilleurs trades selon le PnL net, avec leurs détails. Utilise-la pour les questions sur les meilleurs trades.', parameters: { type: 'OBJECT', properties: { nombre: { type: 'INTEGER', description: 'Nombre de trades à retourner, entre 1 et 50.' } }, required: ['nombre'] } },
  { name: 'getWorstTrades', description: 'Renvoie les N pires trades selon le PnL net, avec leurs détails. Utilise-la pour les questions sur les pertes ou les pires trades.', parameters: { type: 'OBJECT', properties: { nombre: { type: 'INTEGER', description: 'Nombre de trades à retourner, entre 1 et 50.' } }, required: ['nombre'] } },
];

function normalizeHistory(history) {
  if (!Array.isArray(history)) return [];
  return history.slice(-MAX_HISTORY_TURNS).flatMap((turn) => {
    if (!turn || !['user', 'model'].includes(turn.role)) return [];

    // Prefer the exact model content returned by Gemini. This is critical for
    // Gemini 3: thoughtSignature is positional metadata on the original Part.
    // Never rebuild a functionCall Part from only name/args.
    if (turn.role === 'model' && Array.isArray(turn.parts)) {
      const parts = turn.parts.filter((part) => part && typeof part === 'object').map((part) => {
        const copy = { ...part };
        if (copy.thoughtSignature === '') delete copy.thoughtSignature;
        return copy;
      });
      if (parts.length) return [{ role: 'model', parts }];
    }

    if (turn.role === 'user' && Array.isArray(turn.parts)) {
      const parts = turn.parts.filter((part) => part && typeof part === 'object');
      if (parts.length) return [{ role: 'user', parts }];
    }

    if (turn.role === 'model' && Array.isArray(turn.functionCalls)) {
      return [{ role: 'model', parts: turn.functionCalls.map((call) => ({
        functionCall: call.functionCall || call,
        ...(typeof call.thoughtSignature === 'string' && call.thoughtSignature
          ? { thoughtSignature: call.thoughtSignature }
          : {}),
      })) }];
    }

    if (turn.functionCall && typeof turn.functionCall === 'object') {
      const part = { functionCall: turn.functionCall };
      if (typeof turn.thoughtSignature === 'string' && turn.thoughtSignature) {
        part.thoughtSignature = turn.thoughtSignature;
      }
      return [{ role: 'model', parts: [part] }];
    }

    if (turn.functionResponse && typeof turn.functionResponse === 'object') {
      return [{ role: 'user', parts: [{ functionResponse: turn.functionResponse }] }];
    }

    if (typeof turn.text !== 'string' || !turn.text.trim()) return [];
    return [{ role: turn.role, parts: [{ text: turn.text.slice(0, MAX_HISTORY_TEXT) }] }];
  });
}
function extractGeminiError(data) {
  const message = data?.error?.message;
  if (typeof message !== 'string') return 'Réponse invalide du service Gemini.';
  return message.replace(/AIza[\w-]{20,}/g, '[REDACTED_API_KEY]').slice(0, 1000);
}
function isRetryableStatus(status) { return status === 408 || status === 429 || status === 500 || status === 502 || status === 503 || status === 504; }
function sleep(ms) { return new Promise((resolve) => setTimeout(resolve, ms)); }

async function callGemini(apiKey, payload) {
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt += 1) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
    try {
      const response = await fetch(GEMINI_API_URL, { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey }, body: JSON.stringify(payload), signal: controller.signal });
      const data = await response.json().catch(() => null);
      if (response.ok || !isRetryableStatus(response.status) || attempt === MAX_RETRIES) return { response, data };
      console.warn('[Gemini retry]', { status: response.status, attempt: attempt + 1 });
    } catch (error) {
      if (error?.name === 'AbortError') throw error;
      if (attempt === MAX_RETRIES) throw error;
      console.warn('[Gemini retry]', { reason: error?.message || 'request failed', attempt: attempt + 1 });
    } finally { clearTimeout(timeout); }
    await sleep(RETRY_DELAY_MS * (attempt + 1));
  }
  throw new Error('Gemini request failed');
}

function writeSse(res, payload) { res.write(`data: ${JSON.stringify(payload)}\n\n`); }

async function streamGemini(apiKey, payload, res) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), STREAM_TIMEOUT_MS);
  try {
    const response = await fetch(GEMINI_STREAM_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
      body: JSON.stringify(payload),
      signal: controller.signal
    });
    if (!response.ok) {
      const data = await response.json().catch(() => null);
      const details = extractGeminiError(data);
      console.error('[Gemini stream error]', response.status, details);
      writeSse(res, { type: 'error', error: 'Gemini n’a pas pu traiter la demande.', code: 'GEMINI_API_ERROR', details, providerStatus: response.status });
      writeSse(res, { type: 'done' });
      return;
    }
    if (!response.body) throw new Error('Le flux Gemini est indisponible.');

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    const modelParts = [];

    const processEvent = (rawEvent) => {
      const dataLine = rawEvent.split('\n').find((line) => line.startsWith('data:'));
      if (!dataLine) return;
      const raw = dataLine.slice(5).trim();
      if (!raw || raw === '[DONE]') return;

      let chunk;
      try { chunk = JSON.parse(raw); } catch { return; }

      const parts = chunk?.candidates?.[0]?.content?.parts || [];
      for (const part of parts) {
        if (part && typeof part === 'object') modelParts.push(part);
        if (typeof part?.text === 'string' && part.text) {
          writeSse(res, { type: 'delta', text: part.text });
        }
      }
    };

    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true }).replace(/\\r\\n/g, '\\n');
      let separatorIndex = buffer.indexOf('\\n\\n');
      while (separatorIndex !== -1) {
        const event = buffer.slice(0, separatorIndex);
        buffer = buffer.slice(separatorIndex + 2);
        processEvent(event);
        separatorIndex = buffer.indexOf('\\n\\n');
      }
    }
    if (buffer.trim()) processEvent(buffer);

    const functionParts = modelParts.filter((part) => part?.functionCall?.name);
    if (functionParts.length) {
      // Do not emit a function call until the complete streamed response is
      // assembled. A signature can be attached to a later chunk; emitting
      // early was the source of the missing-thoughtSignature bug.
      writeSse(res, {
        type: 'function_calls',
        toolCalls: functionParts.map((part) => part.functionCall),
        modelParts,
      });
    }
    writeSse(res, { type: 'done', functionCall: functionParts.length > 0 });
  } catch (error) {
    if (error?.name === 'AbortError') {
      writeSse(res, { type: 'error', error: 'Gemini n’a pas répondu dans le délai de 60 secondes.', code: 'GEMINI_TIMEOUT' });
    } else {
      console.error('[Coach stream relay error]', error);
      writeSse(res, { type: 'error', error: 'Connexion au relais Gemini impossible.', code: 'INTERNAL_ERROR', details: String(error?.message || 'Erreur inconnue').slice(0, 500) });
    }
    writeSse(res, { type: 'done' });
  } finally {
    clearTimeout(timeout);
  }
}
export default async function handler(req, res) {
  if (req.method !== 'POST') { res.setHeader('Allow', 'POST'); return sendJson(res, 405, { error: 'Méthode non autorisée. Utilisez POST.' }); }
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return sendJson(res, 500, { error: 'La variable d’environnement GEMINI_API_KEY est manquante sur le serveur.', code: 'MISSING_API_KEY' });
  const body = req.body || {};
  const message = typeof body.message === 'string' ? body.message.trim() : '';
  const continuation = body.continuation === true;
  const stream = body.stream === true && !continuation;
  if (!continuation && !message) return sendJson(res, 400, { error: 'Un message utilisateur valide est requis.', code: 'INVALID_MESSAGE' });
  if (message.length > 12000) return sendJson(res, 413, { error: 'Le message est trop long. Limite : 12 000 caractères.', code: 'MESSAGE_TOO_LARGE' });
  const history = normalizeHistory(body.history);
  const contextText = JSON.stringify(body.context ?? 'Aucun contexte fourni.').slice(0, 8000);
  const systemInstruction = `Tu es l’AI Trading Coach & Performance Auditor de Thunder Edge. Réponds en français, clairement, professionnellement et rigoureusement. Pour toute question portant sur les données personnelles de trading, utilise les fonctions disponibles plutôt que d’inventer ou d’inférer des chiffres. Les données retournées par les fonctions sont la source de vérité. Ne révèle pas les détails techniques du function calling. Pour les questions théoriques, réponds directement et de façon concise.\n\nRésumé statistique global / contexte de base :\n${contextText}`;
  const contents = [...history];
  if (!continuation) contents.push({ role: 'user', parts: [{ text: message }] });
  const payload = { systemInstruction: { parts: [{ text: systemInstruction }] }, contents, tools: [{ functionDeclarations: FUNCTION_DECLARATIONS }], generationConfig: { maxOutputTokens: MAX_OUTPUT_TOKENS, thinkingConfig: { thinkingLevel: 'minimal' } } };
  if (stream) {
    res.statusCode = 200; res.setHeader('Content-Type', 'text/event-stream; charset=utf-8'); res.setHeader('Cache-Control', 'no-cache, no-transform'); res.setHeader('Connection', 'keep-alive'); res.setHeader('X-Accel-Buffering', 'no'); if (typeof res.flushHeaders === 'function') res.flushHeaders(); writeSse(res, { type: 'start' }); await streamGemini(apiKey, payload, res); return res.end();
  }
  try {
    const { response, data } = await callGemini(apiKey, payload);
    if (!response.ok) { const details = extractGeminiError(data); console.error('[Gemini API error]', response.status, details); return sendJson(res, 502, { error: 'Gemini n’a pas pu traiter la demande.', code: 'GEMINI_API_ERROR', details, providerStatus: response.status }); }
    const parts = data?.candidates?.[0]?.content?.parts || [];
    const functionCallPart = parts.find((part) => part?.functionCall?.name);
    if (functionCallPart) {
      const functionParts = parts.filter((part) => part?.functionCall?.name);
      return sendJson(res, 200, {
        type: 'function_calls',
        toolCalls: functionParts.map((part) => part.functionCall),
        modelParts: parts,
      });
    }
    const reply = parts.map((part) => part?.text || '').join('').trim();
    if (!reply) { const finishReason = data?.candidates?.[0]?.finishReason || null; console.error('[Gemini empty response]', { finishReason, promptFeedback: data?.promptFeedback || null }); return sendJson(res, 502, { error: 'Gemini a renvoyé une réponse vide.', code: 'EMPTY_GEMINI_RESPONSE', finishReason }); }
    return sendJson(res, 200, { type: 'message', reply });
  } catch (error) {
    if (error?.name === 'AbortError') return sendJson(res, 504, { error: 'Gemini n’a pas répondu dans le délai de 20 secondes. Réessayez.', code: 'GEMINI_TIMEOUT' });
    console.error('[Coach relay error]', error); return sendJson(res, 500, { error: 'Erreur interne lors de la communication avec Gemini.', code: 'INTERNAL_ERROR', details: String(error?.message || 'Erreur inconnue').slice(0, 500) });
  }
}
