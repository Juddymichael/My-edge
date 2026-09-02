const GEMINI_MODEL = 'gemini-2.5-flash';
const GEMINI_API_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;
const REQUEST_TIMEOUT_MS = 30000;

function sendJson(res, status, payload) {
  res.status(status).json(payload);
}

function normalizeHistory(history) {
  if (!Array.isArray(history)) return [];

  return history
    .filter((turn) => turn && (turn.role === 'user' || turn.role === 'model'))
    .slice(-10)
    .map((turn) => ({
      role: turn.role,
      parts: [{ text: typeof turn.text === 'string' ? turn.text.slice(0, 12000) : '' }],
    }))
    .filter((turn) => turn.parts[0].text.trim());
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

  if (!message) {
    return sendJson(res, 400, {
      error: 'Un message utilisateur valide est requis.',
      code: 'INVALID_MESSAGE',
    });
  }

  if (message.length > 12000) {
    return sendJson(res, 413, {
      error: 'Le message est trop long. Limite : 12 000 caractères.',
      code: 'MESSAGE_TOO_LARGE',
    });
  }

  const history = normalizeHistory(body.history);
  const context = body.context ?? null;

  const systemInstruction = `
Tu es l’AI Trading Coach & Performance Auditor de Thunder Edge.
Réponds en français, de manière claire, professionnelle et rigoureuse.
Pour les analyses de performances, base-toi uniquement sur les données de trading fournies dans le contexte.
N’invente jamais de statistiques. Si les données sont insuffisantes, indique-le clairement.
Pour les questions théoriques, donne des explications pédagogiques et directement exploitables.

Contexte de trading fourni par l’application :
${JSON.stringify(context ?? 'Aucun contexte fourni.')}
`.trim();

  const contents = [
    ...history,
    { role: 'user', parts: [{ text: message }] },
  ];

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(`${GEMINI_API_URL}?key=${encodeURIComponent(apiKey)}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: systemInstruction }] },
        contents,
        generationConfig: {
          temperature: 0.2,
          maxOutputTokens: 1200,
        },
      }),
      signal: controller.signal,
    });

    const data = await response.json().catch(() => null);

    if (!response.ok) {
      console.error('[Gemini API error]', response.status, data?.error?.message || 'Unknown error');
      return sendJson(res, 502, {
        error: 'Gemini n’a pas pu traiter la demande.',
        code: 'GEMINI_API_ERROR',
      });
    }

    const reply = data?.candidates?.[0]?.content?.parts
      ?.map((part) => part?.text || '')
      .join('')
      .trim();

    if (!reply) {
      return sendJson(res, 502, {
        error: 'Gemini a renvoyé une réponse vide.',
        code: 'EMPTY_GEMINI_RESPONSE',
      });
    }

    return sendJson(res, 200, { reply });
  } catch (error) {
    if (error?.name === 'AbortError') {
      return sendJson(res, 504, {
        error: 'La requête vers Gemini a dépassé le délai de 30 secondes.',
        code: 'GEMINI_TIMEOUT',
      });
    }

    console.error('[Coach relay error]', error);
    return sendJson(res, 500, {
      error: 'Erreur interne lors de la communication avec Gemini.',
      code: 'INTERNAL_ERROR',
    });
  } finally {
    clearTimeout(timeout);
  }
}
