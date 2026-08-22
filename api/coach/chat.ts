function deterministicReply(userMessage: string, metrics: any): string {
  const q = String(userMessage || '').toLowerCase();
  const total = Number(metrics?.totalTrades || 0);
  const wr = metrics?.winrate == null ? 'N/A' : `${Number(metrics.winrate).toFixed(1)}%`;
  const exp = metrics?.expectancy == null ? 'N/A' : `$${Number(metrics.expectancy).toFixed(2)}`;
  const pnl = metrics?.totalPnL == null ? 'N/A' : `$${Number(metrics.totalPnL).toFixed(2)}`;
  if (q.includes('leak') || q.includes('erreur') || q.includes('faiblesse')) return `🎯 **Ton leak prioritaire**\n\nSur ${total} trades, je chercherais d'abord le facteur qui dégrade le plus ton expectancy, pas simplement ton Win Rate.\n\n• Win Rate : ${wr}\n• Expectancy : ${exp}\n• PnL total : ${pnl}\n\nCompare tes pertes par setup, session et actif. Le groupe avec expectancy négative et un échantillon suffisant est le premier candidat à corriger.`;
  if (q.includes('setup') || q.includes('meilleur')) { const edges=Array.isArray(metrics?.edges)&&metrics.edges.length?metrics.edges.slice(0,3).join(' ; '):'pas encore assez de groupes identifiés'; return `📈 **Tes setups**\n\nD'après les données transmises au coach :\n\n${edges}\n\nNe choisis pas un setup uniquement parce qu'il affiche le meilleur Win Rate : vérifie aussi le nombre de trades, le PnL et l'expectancy.`; }
  if (q.includes('discipline') || q.includes('risque') || q.includes('risk')) return `🧠 **Discipline & risque**\n\nJe regarderais le respect du Stop Loss, la stabilité de la taille de position et ton comportement après une perte.\n\nAvec ${total} trades, évite de conclure sur une habitude avec seulement quelques observations. Ton objectif est de rendre le risque reproductible.`;
  if (q.includes('bilan') || q.includes('résumé') || q.includes('resume') || q.includes('global')) return `📊 **Bilan actuel**\n\n• Trades : ${total}\n• Win Rate : ${wr}\n• Expectancy : ${exp}\n• PnL : ${pnl}\n\nLe point essentiel est de suivre l'évolution de l'expectancy et du drawdown dans le temps. Une bonne série de gains ne suffit pas à prouver que l'edge est robuste.`;
  return `🎯 **Analyse de ta question**\n\nTu me demandes : « ${String(userMessage).trim()} »\n\nJe base cette réponse sur ${total} trades. Ton Win Rate est ${wr}, ton expectancy est ${exp} et ton PnL total est ${pnl}.\n\nJe relie maintenant ta question à ces métriques plutôt que de répéter un diagnostic générique.`;
}

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  const { userMessage, metricsContext } = req.body || {};
  if (!String(userMessage || '').trim()) return res.status(400).json({ error: 'userMessage is required' });
  const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_AI_API_KEY;
  if (apiKey) {
    try {
      const prompt = `Tu es un coach de trading méthodique. Réponds en français, sans promesse de gain. Utilise uniquement les données fournies. Question utilisateur: ${userMessage}\nContexte statistiques: ${JSON.stringify(metricsContext)}`;
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${encodeURIComponent(apiKey)}`, { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({contents:[{parts:[{text:prompt}]}]}) });
      if(response.ok){const data:any=await response.json();const reply=data?.candidates?.[0]?.content?.parts?.map((p:any)=>p.text||'').join(' ').trim();if(reply)return res.status(200).json({reply});}
    } catch(error){console.error('Gemini coach error',error);}
  }
  return res.status(200).json({reply:deterministicReply(String(userMessage),metricsContext)});
}
