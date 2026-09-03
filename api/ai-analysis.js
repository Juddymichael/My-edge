const GEMINI_MODEL = 'gemini-3.6-flash';
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;
const REQUEST_TIMEOUT_MS = 60000;
const OVERLOAD_RETRY_DELAY_MS = 2000;

function json(res, status, payload) { res.status(status).json(payload); }

function sanitizeJsonText(text) {
  if (typeof text !== 'string') return '';
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  return (fenced ? fenced[1] : text).trim();
}

function isHighDemand(response, data) {
  const message = typeof data?.error?.message === 'string' ? data.error.message.toLowerCase() : '';
  return response.status === 429 || response.status === 503 || /high demand|overload|overloaded|temporarily unavailable|resource exhausted|rate limit/.test(message);
}

const SCHEMAS = {
  analysis: {
    type: 'OBJECT',
    properties: {
      summary: { type: 'STRING' },
      keyPoints: { type: 'ARRAY', items: { type: 'STRING' } },
      confidenceScore: { type: 'NUMBER' }
    },
    required: ['summary', 'keyPoints', 'confidenceScore']
  },
  recommendations: {
    type: 'OBJECT',
    properties: {
      recommendations: {
        type: 'ARRAY',
        items: {
          type: 'OBJECT',
          properties: {
            title: { type: 'STRING' },
            description: { type: 'STRING' },
            priority: { type: 'STRING', enum: ['Élevée', 'Moyenne', 'Faible'] },
            impact: { type: 'NUMBER' },
            effort: { type: 'NUMBER' },
            quickFixes: { type: 'ARRAY', items: { type: 'STRING' } },
            category: { type: 'STRING' }
          },
          required: ['title', 'description', 'priority', 'impact', 'effort', 'quickFixes', 'category']
        }
      }
    },
    required: ['recommendations']
  }
};

async function callGeminiOnce(apiKey, prompt, schema) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const response = await fetch(GEMINI_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: prompt.system }] },
        contents: [{ role: 'user', parts: [{ text: prompt.user }] }],
        generationConfig: {
          responseMimeType: 'application/json',
          responseSchema: schema,
          temperature: 0.25,
          maxOutputTokens: 1800
        }
      }),
      signal: controller.signal
    });
    const data = await response.json().catch(() => null);
    if (!response.ok) {
      const message = typeof data?.error?.message === 'string' ? data.error.message : 'Gemini n’a pas pu générer l’analyse.';
      const error = new Error(message.slice(0, 1000));
      error.code = isHighDemand(response, data) ? 'GEMINI_HIGH_DEMAND' : 'GEMINI_API_ERROR';
      error.retryable = error.code === 'GEMINI_HIGH_DEMAND';
      throw error;
    }
    const text = data?.candidates?.[0]?.content?.parts?.map((p) => p?.text || '').join('') || '';
    if (!text) throw new Error('Gemini a renvoyé une réponse vide.');
    return JSON.parse(sanitizeJsonText(text));
  } finally {
    clearTimeout(timeout);
  }
}

async function callGemini(apiKey, prompt, schema) {
  try {
    return await callGeminiOnce(apiKey, prompt, schema);
  } catch (error) {
    if (error?.retryable !== true) throw error;
    await new Promise((resolve) => setTimeout(resolve, OVERLOAD_RETRY_DELAY_MS));
    try {
      return await callGeminiOnce(apiKey, prompt, schema);
    } catch (retryError) {
      if (retryError?.retryable === true) retryError.code = 'GEMINI_HIGH_DEMAND';
      throw retryError;
    }
  }
}

function analysisPrompt(context) {
  return {
    system: `Tu es l’analyste de performance de Thunder Edge. Tu analyses UNIQUEMENT les données statistiques fournies. Ne fabrique jamais de chiffres. Réponds en français professionnel, direct et utile. Le score de confiance doit refléter la taille et la qualité de l’échantillon : très faible sous 10 trades, intermédiaire autour de 20-30, élevé avec davantage de trades et de données par setup/session. Retourne uniquement le JSON demandé.`,
    user: `Génère un résumé exécutif de 3 à 4 phrases et 3 à 4 points clés à partir de ce contexte réel :\n${JSON.stringify(context).slice(0, 30000)}`
  };
}

function recommendationsPrompt(context) {
  return {
    system: `Tu es l’analyste de performance de Thunder Edge. À partir des statistiques réelles et des alertes déjà détectées, propose uniquement des recommandations concrètes et mesurables. Ne crée aucun pattern absent des données. L’impact est une ESTIMATION, pas une promesse : reste prudent et base-toi sur le coût observé. Effort est une note entière de 1 à 10. Maximum 8 recommandations. Retourne uniquement le JSON demandé.`,
    user: `Génère les recommandations à partir de ce contexte réel :\n${JSON.stringify(context).slice(0, 30000)}`
  };
}

export default async function handler(req, res) {
  if (req.method !== 'POST') { res.setHeader('Allow', 'POST'); return json(res, 405, { error: 'Méthode non autorisée. Utilisez POST.' }); }
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return json(res, 500, { error: 'La variable d’environnement GEMINI_API_KEY est manquante sur le serveur.', code: 'MISSING_API_KEY' });
  const body = req.body || {};
  const mode = body.mode === 'recommendations' ? 'recommendations' : 'analysis';
  if (!body.context || typeof body.context !== 'object') return json(res, 400, { error: 'Le contexte statistique est requis.', code: 'INVALID_CONTEXT' });
  try {
    const result = await callGemini(apiKey, mode === 'analysis' ? analysisPrompt(body.context) : recommendationsPrompt(body.context), SCHEMAS[mode]);
    return json(res, 200, { mode, data: result });
  } catch (error) {
    console.error('[Gemini AI Analysis Error]', error);
    if (error?.code === 'GEMINI_HIGH_DEMAND') {
      return json(res, 503, { error: 'Gemini est temporairement surchargé, réessaie dans quelques instants', code: 'GEMINI_HIGH_DEMAND', retryable: true });
    }
    const message = error?.name === 'AbortError' ? 'Gemini n’a pas répondu dans le délai de 60 secondes.' : (error?.message || 'Analyse IA indisponible.');
    return json(res, 502, { error: message, code: error?.name === 'AbortError' ? 'GEMINI_TIMEOUT' : 'GEMINI_API_ERROR' });
  }
}
