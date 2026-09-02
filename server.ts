import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI } from '@google/genai';

const app = express();
const PORT = 3000;

app.use(express.json({ limit: '10mb' }));

// Lazy initializer for Google GenAI client
let aiClient: GoogleGenAI | null = null;
function getGenAI(): GoogleGenAI {
  if (!aiClient) {
    const apiKey = process.env.GEMINI_API_KEY || '';
    aiClient = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });
  }
  return aiClient;
}

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// AI Coach endpoint
app.post('/api/coach/chat', async (req, res) => {
  try {
    const { message, history = [], context } = req.body;

    if (!message || typeof message !== 'string') {
      return res.status(400).json({ error: 'Un message valide est requis.' });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return res.status(500).json({
        error: 'Clé API Gemini non configurée dans l’environnement.',
        code: 'MISSING_API_KEY',
      });
    }

    const ai = getGenAI();

    // Prepare rich system instruction with the trader's actual context
    const contextJson = context ? JSON.stringify(context, null, 2) : 'Aucun trade disponible.';

    const systemInstruction = `
Tu es l'AI Trading Coach & Performance Auditor personnel de l'utilisateur sur Thunder Edge.
Tu es propulsé par Gemini pour offrir un coaching trading institutionnel et quantitatif de pointe.
Tu es capable d'analyser l'historique de trading réel de l'utilisateur, mais aussi de répondre à TOUTES ses questions ouvertes sur le trading (concepts SMC, Order Blocks, FVG, Killzones, psychologie de trading, gestion des émotions, calcul et gestion du risque, comparaison de périodes, axes de progression, questions libres).

Voici les données réelles et vérifiées du trader (extraites en temps réel de son journal de trading) :
\`\`\`json
${contextJson}
\`\`\`

RÈGLES ET DIRECTIVES FONDAMENTALES :
1. VÉRITÉ STATISTIQUE SUR SES DONNÉES : Pour toute question sur ses performances, setups, paires, sessions, gains, pertes ou erreurs, base-toi EXCLUSIVEMENT sur les données réelles ci-dessus. Ne JAMAIS inventer de données ou de statistiques qui n'existent pas dans son journal.
2. QUESTIONS OUVERTES & EXPERTISE TRADING : Pour toute question ouverte ou théorique (ex: comment trader la Killzone London, comment éviter le FOMO, comment perfectionner un Risk/Reward 1:3), réponds avec une expertise institutionnelle claire, pédagogique et directement applicable.
3. ÉCHANTILLON INSUFFISANT : Si l'utilisateur demande une analyse sur un setup, une paire ou une session avec peu de trades (n < 4) ou sans trade, indique-le avec clarté (« Données insuffisantes dans votre journal (échantillon de X trade(s)) ») et complète par un conseil méthodologique.
4. STRUCTURE DE RÉPONSE :
   - Pour les analyses de performance : Structure avec clarté : **Fait statistique** -> **Observation / Analyse** -> **Action concrète à appliquer**.
   - Pour les questions ouvertes : Réponds de façon structurée, logique et immédiatement exploitable par un trader.
5. MÉMOIRE DE CONVERSATION : Garde le fil des questions précédentes pour une discussion naturelle et continue.
6. TON & STYLE :
   - Direct, professionnel, rigoureux, sans jargon inutile ni flatterie superficielle.
   - Vocabulaire institutionnel / SMC : Killzones, HTF Bias, Liquidity Sweep, MSS, CISD, FVG, Order Blocks, Expectancy R, R-Multiple, Risk/Reward.
   - En français, clair, fluide avec listes à puces et gras sur les données clés.
`;

    // Format chat contents
    const formattedContents: Array<{ role: 'user' | 'model'; parts: Array<{ text: string }> }> = [];

    // Add previous history turns
    if (Array.isArray(history)) {
      for (const turn of history) {
        if (turn.role === 'user' || turn.role === 'model') {
          formattedContents.push({
            role: turn.role,
            parts: [{ text: turn.text || '' }],
          });
        }
      }
    }

    // Add current user prompt
    formattedContents.push({
      role: 'user',
      parts: [{ text: message }],
    });

    const modelsToTry = ['gemini-3.7-flash', 'gemini-3.1-flash-lite', 'gemini-flash-latest'];
    let replyText = '';
    let lastError: any = null;

    for (const modelName of modelsToTry) {
      try {
        const response = await ai.models.generateContent({
          model: modelName,
          contents: formattedContents,
          config: {
            systemInstruction,
            temperature: 0.2, // Low temperature for high factual consistency
            maxOutputTokens: 1200,
          },
        });
        if (response && response.text) {
          replyText = response.text;
          break;
        }
      } catch (err: any) {
        console.warn(`[AI Coach model ${modelName} failed, trying next...]:`, err?.message || err);
        lastError = err;
      }
    }

    if (!replyText) {
      throw lastError || new Error('Impossible de générer une réponse.');
    }

    return res.json({
      reply: replyText,
    });
  } catch (error: any) {
    console.error('[AI Coach Error]:', error);
    return res.status(500).json({
      error: error?.message || 'Une erreur est survenue lors de la communication avec le coach IA.',
    });
  }
});

// Setup server and Vite middleware
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Thunder Edge server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer();
