function safeNum(value: any): number | null {
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function deterministicReply(userMessage: string, metrics: any, history: any[] = []): string {
  const question = String(userMessage || '').trim();
  const q = question.toLowerCase();
  const total = Number(metrics?.totalTrades || 0);
  const wr = safeNum(metrics?.winrate);
  const exp = safeNum(metrics?.expectancy);
  const pnl = safeNum(metrics?.totalPnL);
  const pf = safeNum(metrics?.profitFactor);
  const dd = safeNum(metrics?.maxDrawdownPercent);
  const score = safeNum(metrics?.score);
  const base = `Sur ${total} trades, ton Win Rate est ${wr == null ? 'N/A' : wr.toFixed(1) + '%'}, ton expectancy ${exp == null ? 'N/A' : '$' + exp.toFixed(2)} et ton PnL ${pnl == null ? 'N/A' : '$' + pnl.toFixed(2)}.`;

  if (q.includes('leak') || q.includes('erreur') || q.includes('faiblesse')) {
    return `🎯 **Mon avis sur ton principal leak**\n\n${base}\n\nJe ne regarderais pas uniquement ton Win Rate. Je chercherais le groupe de trades qui détruit le plus ton expectancy : setup, session, actif ou comportement.\n\n**À faire :** compare les pertes par setup et session, puis vérifie si le problème vient de la sélection du trade ou de son exécution. Un leak avec peu de trades ne doit pas être traité comme une conclusion définitive.`;
  }
  if (q.includes('setup') || q.includes('meilleur') || q.includes('edge')) {
    const edges = Array.isArray(metrics?.edges) && metrics.edges.length ? metrics.edges.slice(0, 5).join(' ; ') : 'aucun groupe suffisamment documenté';
    return `📈 **Ce que j'en pense**\n\n${base}\n\nLes groupes actuellement remontés par ton journal sont : ${edges}.\n\nJe privilégierais le setup qui combine **expectancy positive + échantillon suffisant + drawdown acceptable**, plutôt que celui qui a simplement le meilleur Win Rate.`;
  }
  if (q.includes('comment') || q.includes('gérer') || q.includes('gere') || q.includes('que faire') || q.includes('conseil') || q.includes('pense') || q.includes('avis') || q.includes('devrais') || q.includes('pourquoi') || q.includes('est-ce') || q.includes('est ce')) {
    return `🧠 **Mon avis**\n\n${base}\n\nTa question est ouverte, donc je ne vais pas te donner une réponse générique. Avec tes données, je commencerais par **${metrics?.currentFocus || 'protéger la qualité de l’exécution et la stabilité du risque'}**.\n\n**Comment le gérer concrètement :**\n1. définis une règle mesurable ;\n2. applique-la pendant les prochains trades ;\n3. mesure son effet sur le PnL et l’expectancy ;\n4. ne change pas plusieurs variables en même temps.\n\n${dd != null ? `Ton drawdown observé est de ${dd.toFixed(1)}%, donc toute amélioration doit préserver cette contrainte.` : ''}\n\nSi tu me demandes ton avis sur une décision précise, donne-moi le contexte du trade ou de la situation et je l'analyserai avec tes statistiques.`;
  }
  if (q.includes('discipline') || q.includes('risque') || q.includes('risk')) {
    return `🛡️ **Risque & discipline**\n\n${base}\n\nJe vérifierais trois choses : stabilité de la taille de position, respect du Stop Loss et comportement après une perte.\n\n${pf != null ? `Ton Profit Factor est ${pf.toFixed(2)} : il faut le lire avec l'échantillon de ${total} trades, pas isolément.` : ''}`;
  }
  if (q.includes('bilan') || q.includes('résumé') || q.includes('resume') || q.includes('global')) {
    return `📊 **Bilan**\n\n${base}\n\n${pf != null ? `Profit Factor : ${pf.toFixed(2)}.` : ''} ${dd != null ? `Drawdown max : ${dd.toFixed(1)}%.` : ''} ${score != null ? `Score actuel : ${score.toFixed(0)}/100.` : ''}\n\nLe point important est de suivre l'évolution de l'expectancy et du drawdown, pas seulement une série récente de gains.`;
  }
  const recent = Array.isArray(history) && history.length ? `J'ai aussi le fil récent de la conversation (${history.length} messages), donc ta prochaine question peut être une relance directe.` : '';
  return `💬 **Je t'écoute**\n\nTu me demandes : « ${question} »\n\n${base}\n\nJe peux répondre à des questions ouvertes comme **« tu en penses quoi ? », « comment je peux gérer ça ? », « est-ce que je dois changer quelque chose ? »**. Donne-moi simplement la situation que tu veux analyser ; je la relierai à tes données plutôt que de te renvoyer un diagnostic standard.\n\n${recent}`;
}

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  const { userMessage, metricsContext, chatHistory } = req.body || {};
  if (!String(userMessage || '').trim()) return res.status(400).json({ error: 'userMessage is required' });
  const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_AI_API_KEY;
  if (apiKey) {
    try {
      const history = Array.isArray(chatHistory) ? chatHistory.slice(-8).map((m:any) => ({role:m.sender === 'user' ? 'user' : 'model', parts:[{text:String(m.text || '')}]})) : [];
      const prompt = `Tu es le coach de trading personnel de l'utilisateur. Réponds en français, naturellement et de façon conversationnelle. Tu dois répondre aux questions ouvertes, y compris « tu en penses quoi ? », « comment je peux gérer ça ? », « qu'est-ce que tu ferais ? », même si elles ne contiennent aucun mot-clé de trading. Utilise uniquement les données fournies et distingue clairement faits, interprétation et conseil. Ne promets jamais de gains et ne fabrique aucune statistique.\n\nQUESTION ACTUELLE : ${question}\n\nCONTEXTE STATISTIQUE : ${JSON.stringify(metricsContext)}\n\nHISTORIQUE RECENT : ${JSON.stringify(history)}`;
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${encodeURIComponent(apiKey)}`, {
        method:'POST', headers:{'Content-Type':'application/json'},
        body:JSON.stringify({contents:[...history,{role:'user',parts:[{text:prompt}]}], generationConfig:{temperature:0.55, maxOutputTokens:900}})
      });
      if(response.ok){const data:any=await response.json();const reply=data?.candidates?.[0]?.content?.parts?.map((p:any)=>p.text||'').join(' ').trim();if(reply)return res.status(200).json({reply});}
    } catch(error){console.error('Gemini coach error',error);}
  }
  return res.status(200).json({reply:deterministicReply(String(userMessage),metricsContext,chatHistory)});
}
