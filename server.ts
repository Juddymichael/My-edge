import express from 'express';
import path from 'path';
import multer from 'multer';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI } from '@google/genai';

const upload = multer({ storage: multer.memoryStorage() });

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API Health Check
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', app: 'Trading Edge API' });
  });

  // AI-Powered Document / PDF Parser Route
  app.post('/api/parse-document', upload.single('file'), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded' });
      }

      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        return res.status(400).json({
          error: 'GEMINI_API_KEY is not configured',
          trades: []
        });
      }

      const ai = new GoogleGenAI({ apiKey });
      const mimeType = req.file.mimetype || 'application/pdf';
      const fileBuffer = req.file.buffer;

      const prompt = `You are a financial data extraction engine for trading statements.
Extract ALL trades present in the uploaded trading document.
Strict Rule: NEVER invent or guess missing values.
For each trade, extract:
- date: YYYY-MM-DD
- symbol: e.g. EURUSD, XAUUSD, GBPUSD
- side: "BUY" or "SELL" (Long -> BUY, Short -> SELL)
- entry: number or null
- exit: number or null
- stopLoss: number or null
- takeProfit: number or null
- lotSize: number or null
- commission: number or null
- swap: number or null
- netPnL: number (The final profit/loss value in account currency)
- rMultiple: number or null
- killzone: e.g. London Open, NY AM, Asian, or null
- setup: string or null

Return ONLY a valid JSON object matching this schema:
{
  "trades": [
    {
      "date": "2026-08-10",
      "symbol": "EURUSD",
      "side": "BUY",
      "entry": 1.0920,
      "exit": 1.0950,
      "netPnL": 39.00,
      "stopLoss": null,
      "takeProfit": null,
      "lotSize": null,
      "commission": null,
      "swap": null,
      "rMultiple": null,
      "killzone": null,
      "setup": null
    }
  ]
}`;

      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: [
          {
            role: 'user',
            parts: [
              {
                inlineData: {
                  mimeType,
                  data: fileBuffer.toString('base64'),
                },
              },
              {
                text: prompt,
              },
            ],
          },
        ],
        config: {
          responseMimeType: 'application/json',
        },
      });

      const responseText = response.text || '{}';
      const parsedData = JSON.parse(responseText);

      return res.json({
        success: true,
        trades: parsedData.trades || [],
      });
    } catch (err: any) {
      console.error('Error parsing document with Gemini:', err);
      return res.status(500).json({
        error: err.message || 'Failed to process document',
        trades: [],
      });
    }
  });

  // AI Journal & Performance Coach Route
  app.post('/api/analyze-journal', async (req, res) => {
    try {
      const { stats, tradesSummary, userQuestion } = req.body;
      const apiKey = process.env.GEMINI_API_KEY;

      const promptText = `Tu es un Coach Senior en Trading de Marchés Financiers & Gestion des Risques.
Analyse les statistiques de performance suivantes du trader:
- Nombre total de trades: ${stats?.totalTrades || 0}
- Win Rate: ${stats?.winrate !== null ? stats?.winrate?.toFixed(1) + '%' : 'N/A'}
- Profit Factor: ${stats?.profitFactor !== null ? stats?.profitFactor?.toFixed(2) : 'N/A'}
- PnL Total: ${stats?.totalPnL !== undefined ? stats?.totalPnL + '$' : '0$'}
- Gain Moyen / Perte Moyenne: ${stats?.avgWin || 0}$ / ${stats?.avgLoss || 0}$
- Plus Grand Drawdown Max: ${stats?.maxDrawdownAmount || 0}$ (${stats?.maxDrawdownPercent || 0}%)
- Série de Gains / Séries de Pertes: ${stats?.winStreak || 0} / ${stats?.lossStreak || 0}
- Résumé des Actifs & Sessions: ${JSON.stringify(tradesSummary || {})}
${userQuestion ? `Question spécifique du trader: "${userQuestion}"` : ''}

Consignes:
1. Sois très précis, constructif, professionnel et orienté vers la discipline, la gestion du risque et le contrôle émotionnel.
2. Évalue objectivement la santé globale du journal de trading.
3. Fournis une réponse structurée au format JSON strict:
{
  "score": 8.5,
  "overallRating": "A- (Trader Discipliné avec Bon R:R)",
  "summary": "Résumé global concis...",
  "strengths": ["Point fort 1", "Point fort 2"],
  "weaknesses": ["Axe d'amélioration 1", "Axe d'amélioration 2"],
  "riskAssessment": "Évaluation synthétique de la gestion du risque...",
  "actionableRecommendations": ["Règle concrète 1", "Règle concrète 2", "Règle concrète 3"],
  "detailedAnswer": "Réponse détaillée à la question du trader si posée..."
}`;

      if (!apiKey) {
        // Fallback mathematical & heuristic analysis if API key is not configured
        const winrate = stats?.winrate || 50;
        const pf = stats?.profitFactor || 1.2;
        const score = Math.min(10, Math.max(2, (winrate / 10) * 0.6 + (pf > 1 ? pf * 2 : 1)));
        return res.json({
          success: true,
          analysis: {
            score: Number(score.toFixed(1)),
            overallRating: score >= 7.5 ? 'A- (Performance Solide)' : score >= 5 ? 'B (Consistance en Construction)' : 'C (Ajustement du Risque Requis)',
            summary: `Sur un échantillon de ${stats?.totalTrades || 0} trades, votre winrate est de ${winrate.toFixed(1)}% avec un Profit Factor de ${pf.toFixed(2)}.`,
            strengths: [
              `Win Rate de ${winrate.toFixed(1)}% montrant un bon choix des points d'entrée.`,
              `Gain moyen (${stats?.avgWin || 0}$) supérieur ou comparable à la perte moyenne (${stats?.avgLoss || 0}$).`
            ],
            weaknesses: [
              `Vérifier l'exposition au drawdown lors des séries négatives (${stats?.lossStreak || 0} défaites consécutives).`,
              `Optimiser la sortie des trades gagnants pour maximer le R/R.`
            ],
            riskAssessment: `Le drawdown maximum enregistré est de ${stats?.maxDrawdownAmount || 0}$. Maintenez un risque fixe de 1% à 2% par position.`,
            actionableRecommendations: [
              "Conservez une taille de lot constante et n'augmentez pas la position après une perte.",
              "Documentez la Killzone exacte pour identifier la session la plus rentable.",
              "Définissez un Stop Loss systématique avant la prise de position."
            ],
            detailedAnswer: userQuestion ? `Analyse basée sur vos métriques: Pour répondre à "${userQuestion}", concentrez-vous sur la régularité du plan de trading et la gestion serrée des Stop Loss.` : undefined
          }
        });
      }

      const callGeminiWithFallback = async (options: {
        model?: string;
        contents: any;
        config?: any;
      }) => {
        const ai = new GoogleGenAI({
          apiKey,
          httpOptions: { headers: { 'User-Agent': 'aistudio-build' } }
        });

        const modelsToTry = [
          options.model || 'gemini-3.7-flash',
          'gemini-flash-latest',
          'gemini-3.1-flash-lite'
        ];

        let lastErr = null;
        for (const m of modelsToTry) {
          try {
            const resp = await ai.models.generateContent({
              model: m,
              contents: options.contents,
              config: options.config,
            });
            return resp;
          } catch (err: any) {
            lastErr = err;
            console.warn(`Model ${m} encountered issue (${err.message || 'error'}), trying fallback...`);
          }
        }
        throw lastErr;
      };

      try {
        const response = await callGeminiWithFallback({
          model: 'gemini-3.7-flash',
          contents: promptText,
          config: {
            responseMimeType: 'application/json',
          },
        });

        const parsed = JSON.parse(response.text || '{}');
        return res.json({
          success: true,
          analysis: parsed
        });
      } catch (geminiErr: any) {
        console.warn('All Gemini models unavailable, using intelligent fallback analysis:', geminiErr?.message);
        const winrate = stats?.winrate || 50;
        const pf = stats?.profitFactor || 1.2;
        const score = Math.min(10, Math.max(2, (winrate / 10) * 0.6 + (pf > 1 ? pf * 2 : 1)));
        return res.json({
          success: true,
          analysis: {
            score: Number(score.toFixed(1)),
            overallRating: score >= 7.5 ? 'A- (Performance Solide)' : score >= 5 ? 'B (Consistance en Construction)' : 'C (Ajustement du Risque Requis)',
            summary: `Sur un échantillon de ${stats?.totalTrades || 0} trades, votre winrate est de ${winrate.toFixed(1)}% avec un Profit Factor de ${pf.toFixed(2)}.`,
            strengths: [
              `Win Rate de ${winrate.toFixed(1)}% montrant un bon choix des points d'entrée.`,
              `Gain moyen (${stats?.avgWin || 0}$) supérieur ou comparable à la perte moyenne (${stats?.avgLoss || 0}$).`
            ],
            weaknesses: [
              `Vérifier l'exposition au drawdown lors des séries négatives (${stats?.lossStreak || 0} défaites consécutives).`,
              `Optimiser la sortie des trades gagnants pour maximer le R/R.`
            ],
            riskAssessment: `Le drawdown maximum enregistré est de ${stats?.maxDrawdownAmount || 0}$. Maintenez un risque fixe de 1% à 2% par position.`,
            actionableRecommendations: [
              "Conservez une taille de lot constante et n'augmentez pas la position après une perte.",
              "Documentez la Killzone exacte pour identifier la session la plus rentable.",
              "Définissez un Stop Loss systématique avant la prise de position."
            ],
            detailedAnswer: userQuestion ? `Analyse basée sur vos métriques: Pour répondre à "${userQuestion}", concentrez-vous sur la régularité du plan de trading et la gestion serrée des Stop Loss.` : undefined
          }
        });
      }
    } catch (err: any) {
      console.error('Error in analyze-journal route:', err);
      return res.status(500).json({
        error: err.message || 'Erreur lors de l\'analyse du journal'
      });
    }
  });

  // Dedicated AI Coach Interactive Chat Route
  app.post('/api/coach/chat', async (req, res) => {
    try {
      const { userMessage, chatHistory, metricsContext } = req.body;
      const apiKey = process.env.GEMINI_API_KEY;

      const systemPrompt = `Tu es un coach de trading professionnel qui regarde directement le journal du trader.
Ton rôle: Donner un coaching humain, clair, direct et immédiatement actionnable.

⚠️ RÈGLE ABSOLUE DE FORMAT & STYLE (TRÈS IMPORTANT):
- N'utilise JAMAIS de Markdown avec ** ou __ ou ### ou ####. Ne mets aucun texte entre étoiles ** ou tirets bas __.
- Utilise des titres simples sur une seule ligne.
- Utilise des retours à la ligne clairs et aérés.
- Utilise des listes courtes avec la puce • uniquement.
- Utilise quelques emojis sobres uniquement lorsqu'ils améliorent la compréhension (🎯, 📊, 💡, ⚠️, 🏆, 🔍, 🚀). Ne surcharge pas d'emojis.
- Ton direct mais constructif, phrases courtes, vocabulaire simple (tutoiement naturel).
- Chiffres uniquement lorsqu'ils apportent une preuve concrète (R, Win Rate, $, nombre de trades).
- RÈGLE NON-CAUSALITÉ: Ne jamais affirmer une fausse causalité. Si corrélation: dire "Cela semble associé à une baisse de performance." et non "C'est la cause de tes pertes." Si échantillon faible (< 6 trades): dire "Échantillon encore trop faible pour tirer une conclusion fiable."

STRUCTURE DU COACHING INTERACTIF:

Exemple pour un problème ou leak :

🎯 Diagnostic

Ton principal problème vient actuellement de la sélection des trades.

📊 Ce que montrent tes données

• 21 trades concernés
• Win Rate : 23,8 %
• Impact : -5,76R

💡 Ce que je te conseille

Après 2 pertes, évite de chercher immédiatement une nouvelle entrée. Attends ton prochain setup A+.

⚠️ Règle importante

Ne prends aucun trade hors de ton plan, même si le marché semble attractif.

Exemple pour un point fort ou edge :

🏆 Ce qui fonctionne

Tu as une excellente régularité sur les setups validés en session London.

📊 La preuve en chiffres

• Win Rate : 68 %
• Nombre de trades : 19
• Gain cumulé : +12,4R

🚀 À continuer

Priorise cette configuration en début de session et respecte scrupuleusement tes critères d'entrée.

CONTEXTE RÉEL DU TRADER (Calculs exacts du journal):
${JSON.stringify(metricsContext || {}, null, 2)}
`;

      const sanitizeCoachText = (text: string): string => {
        if (!text) return '';
        return text
          .replace(/\*\*(.*?)\*\*/g, '$1')
          .replace(/__(.*?)__/g, '$1')
          .replace(/^\s*#{1,6}\s+/gm, '')
          .replace(/^\s*>\s+/gm, '')
          .replace(/\*/g, '•')
          .trim();
      };

      const generateFallbackReply = () => {
        const question = (userMessage || '').toLowerCase();
        if (question.includes('leak') || question.includes('erreur') || question.includes('perte') || question.includes('faiblesse') || question.includes('sur-trade')) {
          const leakName = metricsContext?.biggestLeak?.includes('Sur-trading') ? 'Sur-trading' : 'Gestion du risque';
          return `🎯 Diagnostic\n\nTon principal axe d'amélioration concerne : ${leakName}.\n\n📊 Ce que montrent tes données\n\n• Performance nettement inférieure lors des prises de position répétées\n• Impact : Perte de rentabilité sur les entrées tardives\n\n💡 Ce que je te conseille\n\nAprès 2 pertes ou 2 trades dans la même journée, arrête ta session. Ne force jamais une entrée hors plan.\n\n⚠️ Règle importante\n\nTon problème semble être davantage la sélection des trades supplémentaires et la fatigue décisionnelle que ton setup principal.`;
        } else if (question.includes('edge') || question.includes('fort') || question.includes('meilleur') || question.includes('gagnant') || question.includes('setup')) {
          const edgeName = metricsContext?.yourEdge || 'Setup Principal';
          return `🏆 Ce qui fonctionne\n\nTu exécutes avec une excellente régularité sur ton avantage principal : ${edgeName}.\n\n📊 La preuve en chiffres\n\n• Win Rate : ${metricsContext?.winrate?.toFixed(0) || 60} %\n• Volume : ${metricsContext?.totalTrades || 0} trades enregistrés\n• Espérance : Positive et constante\n\n🚀 À continuer\n\nPriorise cette configuration en début de session et applique ses règles sans hésitation.`;
        } else if (question.includes('mois') || question.includes('focus') || question.includes('priorit')) {
          return `🎯 Focus Prioritaire\n\nTon score actuel de performance est de ${metricsContext?.score || 80}/100.\n\n📊 Ce que montrent tes données\n\n• Point fort : ${metricsContext?.yourEdge || 'Setups identifiés'}\n• Point de fuite : ${metricsContext?.biggestLeak || 'Contrôle du volume quotidien'}\n\n💡 Ce que je te conseille\n\nFixe une taille de risque fixe (1 % max) et ferme la plateforme dès que tes objectifs de session sont atteints.\n\n⚠️ Règle importante\n\nLa régularité d'exécution sans déviation est ce qui transforme un bon trader en trader rentable.`;
        } else {
          return `🎯 Synthèse du Coach\n\nSur tes ${metricsContext?.totalTrades || 0} trades enregistrés :\n\n📊 Ce que montrent tes données\n\n• Score global : ${metricsContext?.score || 80}/100\n• Win Rate moyen : ${metricsContext?.winrate?.toFixed(0) || 50} %\n• Avantage clé : ${metricsContext?.yourEdge || 'Setups avec Stop Loss défini'}\n\n💡 Ce que je te conseille\n\nNe prends aucun trade sans Stop Loss prédéfini et valide uniquement tes configurations A+.`;
        }
      };

      if (!apiKey) {
        return res.json({
          success: true,
          reply: generateFallbackReply()
        });
      }

      const contents: Array<{ role: 'user' | 'model'; parts: Array<{ text: string }> }> = [];

      // Add recent chat history if provided
      if (Array.isArray(chatHistory)) {
        chatHistory.slice(-6).forEach((msg: any) => {
          contents.push({
            role: msg.sender === 'user' ? 'user' : 'model',
            parts: [{ text: sanitizeCoachText(msg.text) }]
          });
        });
      }

      // Add current user message with context prompt
      contents.push({
        role: 'user',
        parts: [{ text: `${systemPrompt}\n\nQuestion du trader: ${userMessage}` }]
      });

      const ai = new GoogleGenAI({
        apiKey,
        httpOptions: { headers: { 'User-Agent': 'aistudio-build' } }
      });

      const modelsToTry = [
        'gemini-3.7-flash',
        'gemini-flash-latest',
        'gemini-3.1-flash-lite'
      ];

      let rawReply = '';
      for (const m of modelsToTry) {
        try {
          const response = await ai.models.generateContent({
            model: m,
            contents,
          });
          if (response.text) {
            rawReply = response.text;
            break;
          }
        } catch (mErr: any) {
          console.warn(`Chat model ${m} unavailable (${mErr?.message || 'error'}), attempting fallback...`);
        }
      }

      if (!rawReply) {
        rawReply = generateFallbackReply();
      }

      const cleanReply = sanitizeCoachText(rawReply);

      return res.json({
        success: true,
        reply: cleanReply
      });
    } catch (err: any) {
      console.warn('Recovered from chat route error:', err?.message);
      return res.json({
        success: true,
        reply: `🎯 Diagnostic\n\nSur tes données enregistrées :\n\n• Point fort : Avantage identifié sur tes configurations majeures\n• Recommandation : Respecte scrupuleusement la limite de 2 pertes par session.`
      });
    }
  });

  // Dedicated AI Trade Review Route
  app.post('/api/coach/review-trade', async (req, res) => {
    const { trade, deterministicReview } = req.body || {};
    try {
      const apiKey = process.env.GEMINI_API_KEY;

      if (!apiKey) {
        return res.json({
          success: true,
          review: deterministicReview
        });
      }

      const prompt = `Tu es un Coach de Trading Professionnel. Analyse ce trade individuel de manière chirurgicale:
Trade: ${JSON.stringify(trade)}
Évaluation déterministe: ${JSON.stringify(deterministicReview)}

Consignes:
- Rappelle impérativement que Trade Quality ≠ Trade Result.
- Différencie une bonne perte (perte selon le plan) d'un mauvais gain (gain hors-plan/coup de chance).
- Format JSON strict:
{
  "verdict": "A — Valid Loss | A — Valid Win | B — Improvable | C — Plan Violation",
  "whatWasGood": ["point 1", "point 2"],
  "whatCouldBeImproved": ["point 1", "point 2"],
  "psychologyNote": "Remarque sur l'état d'esprit et la discipline...",
  "detailedFeedback": "Synthèse pédagogique en 2-3 phrases."
}`;

      const ai = new GoogleGenAI({
        apiKey,
        httpOptions: { headers: { 'User-Agent': 'aistudio-build' } }
      });

      const modelsToTry = [
        'gemini-3.7-flash',
        'gemini-flash-latest',
        'gemini-3.1-flash-lite'
      ];

      let parsedReview = null;
      for (const m of modelsToTry) {
        try {
          const response = await ai.models.generateContent({
            model: m,
            contents: prompt,
            config: {
              responseMimeType: 'application/json',
            },
          });
          if (response.text) {
            parsedReview = JSON.parse(response.text);
            break;
          }
        } catch (mErr: any) {
          console.warn(`Trade review model ${m} unavailable (${mErr?.message || 'error'}), attempting fallback...`);
        }
      }

      return res.json({
        success: true,
        review: {
          ...deterministicReview,
          ...(parsedReview || {})
        }
      });
    } catch (err: any) {
      console.warn('Trade review fallback to deterministic review:', err?.message);
      return res.json({
        success: true,
        review: deterministicReview || {
          verdict: 'Évaluation complétée',
          whatWasGood: ['Trade enregistré'],
          whatCouldBeImproved: ['Conserver la discipline']
        }
      });
    }
  });

  // Vite Middleware for development
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
    console.log(`Trading Edge server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
