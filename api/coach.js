const GEMINI_MODEL = 'gemini-3.6-flash';
const GEMINI_API_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;

// Latency-first configuration for an interactive chat.
const REQUEST_TIMEOUT_MS = 20000;
const MAX_RETRIES = 1;
const RETRY_DELAY_MS = 500;
const MAX_HISTORY_TURNS = 16;
const MAX_HISTORY_TEXT = 6000;
const MAX_OUTPUT_TOKENS = 800;

function sendJson(res, status, payload) { res.status(status).json(payload); }

const FUNCTION_DECLARATIONS = [
  {
    name: 'getTradesByPeriod',
    description: 'Récupère tous les trades de l’utilisateur ouverts dans une plage de dates précise. Utilise cette fonction lorsque la question demande les trades eux-mêmes sur une période.',
    parameters: {
      type: 'OBJECT',
      properties: {
        dateDebut: { type: 'STRING', description: 'Date de début au format YYYY-MM-DD, incluse.' },
        dateFin: { type: 'STRING', description: 'Date de fin au format YYYY-MM-DD, incluse.' },
      },
      required: ['dateDebut', 'dateFin'],
    },
  },
  {
    name: 'getStatsForFilter',
    description: 'Calcule les statistiques exactes des trades correspondant à une combinaison de filtres. Utilise cette fonction pour répondre à une question de performance filtrée.',
    parameters: {
      type: 'OBJECT',
      properties: {
        filtres: {
          type: 'OBJECT',
          description: 'Filtres optionnels combinables : paire, dateDebut, dateFin, session, setup.',
          properties: {
            paire: { type: 'STRING', description: 'Paire/instrument, par exemple GBPUSD ou XAUUSD.' },
            dateDebut: { type: 'STRING', description: 'Date de début YYYY-MM-DD.' },
            dateFin: { type: 'STRING', description: 'Date de fin YYYY-MM-DD.' },
            session: { type: 'STRING', description: 'Session de trading, par exemple LONDON, NEW_YORK, TOKYO ou SYDNEY.' },
            setup: { type: 'STRING', description: 'Nom exact du setup/PD Array.' },
          },
        },
      },
    },
  },
  {
    name: 'getBestTrades',
    description: 'Renvoie les N meilleurs trades selon le PnL net, avec leurs détails. Utilise-la pour les questions sur les meilleurs trades.',
    parameters: {
      type: 'OBJECT',
      properties: { nombre: { type: 'INTEGER', description: 'Nombre de trades à retourner, entre 1 et 50.' } },
      required: ['nombre'],
    },
  },
  {
    name: 'getWorstTrades',
    description: 'Renvoie les N pires trades selon le PnL net, avec leurs détails. Utilise-la pour les questions sur les pertes ou les pires trades.',
    parameters: {
      type: 'OBJECT',
      properties: { nombre: { type: 'INTEGER', description: 'Nombre de trades à retourner, entre 1 et 50.' } },
      required: ['nombre'],
    },
  },
];

function normalizeHistory(history) {
  if (!Array.isArray(history)) return [];
  return history.slice(-MAX_HISTORY_TURNS).flatMap((turn) => {
    if (!turn || !['user', 'model'].includes(turn.role)) return [];
    if (turn.functionCall) return [{ role: 'model', parts: [{ functionCall: turn.functionCall }] }];
    if (turn.functionResponse) return [{ role: 'user', parts: [{ functionResponse: turn.functionResponse }] }];
    if (typeof turn.text !== 'string' || !turn.text.trim()) return [];
    return [{ role: turn.role, parts: [{ text: turn.text.slice(0, MAX_HISTORY_TEXT) }] }];
  });
}

function extractGeminiError(data) {
  const message = data?.error?.message;
  if (typeof message !== 'string') return 'Réponse invalide du service Gemini.';
  return message.replace(/AIza[\w-]{20,}/g, '[REDACTED_API_KEY]').slice(0, 1000);
}

function isRetryableStatus(status) {
  return status === 408 || status === 429 || status === 500 || status === 502 || status === 503 || status === 504;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function callGemini(apiKey, payload) {
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt += 1) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

    try {
      const response = await fetch(GEMINI_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-goog-api-key': apiKey,
        },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });

      const data = await response.json().catch(() => null);
      if (response.ok || !isRetryableStatus(response.status) || attempt === MAX_RETRIES) {
        return { response, data };
      }

      console.warn('[Gemini retry]', { status: response.status, attempt: attempt + 1 });
    } catch (error) {
      // Never retry a timeout: doing so doubles the perceived latency of chat.
      if (error?.name === 'AbortError') throw error;
      if (attempt === MAX_RETRIES) throw error;
      console.warn('[Gemini retry]', { reason: error?.message || 'request failed', attempt: attempt + 1 });
    } finally {
      clearTimeout(timeout);
    }

    await sleep(RETRY_DELAY_MS * (attempt + 1));
  }

  throw new Error('Gemini request failed');
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return sendJson(res, 405, { error: 'Méthode non autorisée. Utilisez POST.' });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return sendJson(res, 500, {
      error: 'La variable d’environnement GEMINI_API_KEY est manquante sur le serveur.',
      code: 'MISSING_API_KEY',
    });
  }

  const body = req.body || {};
  const message = typeof body.message === 'string' ? body.message.trim() : '';
  const continuation = body.continuation === true;

  if (!continuation && !message) {
    return sendJson(res, 400, { error: 'Un message utilisateur valide est requis.', code: 'INVALID_MESSAGE' });
  }
  if (message.length > 12000) {
    return sendJson(res, 413, { error: 'Le message est trop long. Limite : 12 000 caractères.', code: 'MESSAGE_TOO_LARGE' });
  }

  const history = normalizeHistory(body.history);
  const context = body.context ?? null;
  const contextText = JSON.stringify(context ?? 'Aucun contexte fourni.').slice(0, 8000);
  const systemInstruction = `Tu es l’AI Trading Coach & Performance Auditor de Thunder Edge. Réponds en français, clairement, professionnellement et rigoureusement. Pour toute question portant sur les données personnelles de trading, utilise les fonctions disponibles plutôt que d’inventer ou d’inférer des chiffres. Les données retournées par les fonctions sont la source de vérité. Ne révèle pas les détails techniques du function calling. Pour les questions théoriques, réponds directement et de façon concise.

Résumé statistique global / contexte de base :
${contextText}`;

  const contents = [...history];
  if (!continuation) contents.push({ role: 'user', parts: [{ text: message }] });

  const payload = {
    systemInstruction: { parts: [{ text: systemInstruction }] },
    contents,
    tools: [{ functionDeclarations: FUNCTION_DECLARATIONS }],
    generationConfig: {
      maxOutputTokens: MAX_OUTPUT_TOKENS,
      // IMPORTANT: thinkingConfig belongs inside generationConfig for REST generateContent.
      thinkingConfig: { thinkingLevel: 'minimal' },
    },
  };

  try {
    const { response, data } = await callGemini(apiKey, payload);

    if (!response.ok) {
      const details = extractGeminiError(data);
      console.error('[Gemini API error]', response.status, details);
      return sendJson(res, 502, {
        error: 'Gemini n’a pas pu traiter la demande.',
        code: 'GEMINI_API_ERROR',
        details,
        providerStatus: response.status,
      });
    }

    const parts = data?.candidates?.[0]?.content?.parts || [];
    const functionCallPart = parts.find((part) => part?.functionCall?.name);

    if (functionCallPart) {
      const functionCall = functionCallPart.functionCall;
      return sendJson(res, 200, {
        type: 'function_call',
        toolCall: { name: functionCall.name, args: functionCall.args || {} },
      });
    }

    const reply = parts.map((part) => part?.text || '').join('').trim();
    if (!reply) {
      const finishReason = data?.candidates?.[0]?.finishReason || null;
      console.error('[Gemini empty response]', { finishReason, promptFeedback: data?.promptFeedback || null });
      return sendJson(res, 502, {
        error: 'Gemini a renvoyé une réponse vide.',
        code: 'EMPTY_GEMINI_RESPONSE',
        finishReason,
      });
    }

    return sendJson(res, 200, { type: 'message', reply });
  } catch (error) {
    if (error?.name === 'AbortError') {
      return sendJson(res, 504, {
        error: 'Gemini n’a pas répondu dans le délai de 20 secondes. Réessayez.',
        code: 'GEMINI_TIMEOUT',
      });
    }
    console.error('[Coach relay error]', error);
    return sendJson(res, 500, {
      error: 'Erreur interne lors de la communication avec Gemini.',
      code: 'INTERNAL_ERROR',
      details: String(error?.message || 'Erreur inconnue').slice(0, 500),
    });
  }
}
