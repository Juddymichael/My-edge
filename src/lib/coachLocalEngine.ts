import { CoachContextPayload } from './coachContext';
import { formatCurrency, formatPercent, formatRMultiple } from './formatting';

/**
 * Deterministic local quantitative analysis engine.
 * Answers trader questions directly using the rigorous mathematical metrics
 * whenever an immediate response or offline fallback is needed.
 */
export function generateLocalCoachAnalysis(
  query: string,
  context: CoachContextPayload,
  history: Array<{ role: 'user' | 'model'; text: string }> = []
): string {
  const q = query.toLowerCase().trim();
  const summary = context.summary;

  if (summary.closedTrades === 0) {
    return `### **Fait statistique**
Aucun trade clôturé n'est actuellement enregistré dans votre journal de trading (0 trade).

### **Interprétation**
L'AI Coach nécessite un historique d'exécutions réelles pour identifier vos patterns, votre Edge statistique et vos fuites psychologiques.

### **Action concrète**
1. Enregistrez vos premières positions via le bouton **"Log New Trade"** ou importez un historique (CSV / Excel).
2. Vous pouvez également cliquer sur **"Load Seed Dataset"** pour explorer les capacités d'analyse avec un échantillon institutionnel vérifié.`;
  }

  // 1. BEST SETUP / QUEL EST MON MEILLEUR SETUP
  if (q.includes('meilleur setup') || q.includes('best setup') || q.includes('quel setup')) {
    const validSetups = context.setups.filter((s) => s.sampleSize >= 2);
    if (validSetups.length === 0 && context.setups.length > 0) {
      const single = context.setups[0];
      return `### **Fait statistique**
Setup le plus documenté : **${single.name}** (${single.sampleSize} trade(s), Win Rate ${formatPercent(single.winRate, 1)}, P&L net ${single.netPnL >= 0 ? '+' : ''}${single.netPnL}€).

### **Interprétation**
⚠️ **Données insuffisantes pour conclure.**
Un échantillon de ${single.sampleSize} trade(s) est trop faible pour établir un Edge statistiquement fiable ($n < 5$).

### **Action concrète**
Continuez à exécuter ce setup selon vos règles strictes jusqu'à atteindre un minimum de 15 trades pour valider sa viabilité mathématique.`;
    }

    const best = validSetups.sort((a, b) => b.edgeScore - a.edgeScore || b.netPnL - a.netPnL)[0];
    if (!best) {
      return `### **Fait statistique**
Aucun setup catégorisé avec au moins 2 trades.

### **Interprétation**
Données insuffisantes pour conclure. Vos trades ne sont pas encore étiquetés avec des setups précis.

### **Action concrète**
Assignez vos setups (ex: FVG, Breaker Block, Sweep OB) lors de l'enregistrement de chaque trade.`;
    }

    return `### **Fait statistique**
- **Meilleur Setup** : **${best.name}**
- **Score d'Edge** : **${best.edgeScore}/100** (${best.rating})
- **Échantillon** : ${best.sampleSize} trades (${best.confidenceTier === 'CONFIRMED' ? 'Échantillon robuste' : 'En cours de validation'})
- **Taux de réussite (Win Rate)** : **${formatPercent(best.winRate, 1)}**
- **P&L Net total** : **${best.netPnL >= 0 ? '+' : ''}${best.netPnL}€**
${best.rExpectancy !== null ? `- **Espérance mathématique** : **+${best.rExpectancy.toFixed(2)}R** par trade` : ''}

### **Observation & Interprétation**
Le setup **${best.name}** présente l'asymétrie statistique la plus favorable de votre playbook. La rentabilité est confirmée par une espérance positive et une exécution disciplinée.

### **Action concrète**
1. Faites de **${best.name}** votre modèle principal de prise de position (Core Strategy).
2. Augmentez la sélectivité sur les autres configurations pour concentrer votre capital sur cet Edge vérifié.`;
  }

  // 2. BEST PAIR / SYMBOL
  if (q.includes('paire') || q.includes('symbole') || q.includes('asset') || q.includes('sur quelle paire')) {
    const validPairs = context.pairs.filter((p) => p.sampleSize >= 2);
    if (validPairs.length === 0) {
      return `### **Fait statistique**
Échantillon par paire trop restreint ($n < 2$).

### **Interprétation**
Données insuffisantes pour conclure sur un actif spécifique.

### **Action concrète**
Concentrez vos prochaines prises de position sur 1 ou 2 actifs majeurs (ex: EURUSD, XAUUSD, NAS100) pour accumuler un échantillon pertinent.`;
    }

    const best = validPairs.sort((a, b) => b.netPnL - a.netPnL)[0];
    const worst = validPairs[validPairs.length - 1];

    return `### **Fait statistique**
- **Paire dominante** : **${best.symbol}** (${best.sampleSize} trades, Win Rate **${formatPercent(best.winRate, 1)}**, P&L net **${best.netPnL >= 0 ? '+' : ''}${best.netPnL}€**${best.profitFactor ? `, Profit Factor **${best.profitFactor}**` : ''}).
${worst && worst.netPnL < 0 && worst.symbol !== best.symbol ? `- **Paire la plus déficitaire** : **${worst.symbol}** (${worst.sampleSize} trades, Win Rate **${formatPercent(worst.winRate, 1)}**, P&L net **${worst.netPnL}€**).` : ''}

### **Observation & Interprétation**
Votre lecture de la liquidité et des impulsions de prix est nettement plus précise sur **${best.symbol}**.
${worst && worst.netPnL < 0 ? `À l'inverse, **${worst.symbol}** constitue une source de fuite de capital active.` : ''}

### **Action concrète**
1. Allouez en priorité votre risque journalier sur **${best.symbol}**.
${worst && worst.netPnL < 0 ? `2. Mettez en pause ou réduisez de 50% la taille de position sur **${worst.symbol}** jusqu'à identification des causes de slippage ou d'invalidation.` : ''}`;
  }

  // 3. BEST KILLZONE / SESSION
  if (q.includes('killzone') || q.includes('session') || q.includes('horaire') || q.includes('londres') || q.includes('new york')) {
    const validSessions = context.sessions.filter((s) => s.sampleSize >= 2);
    if (validSessions.length === 0) {
      return `### **Fait statistique**
Données de sessions insuffisantes ($n < 2$ trades par session).

### **Interprétation**
Données insuffisantes pour conclure sur la session optimale.

### **Action concrète**
Renseignez systématiquement la session de trading (London, New York AM/PM, Asia) lors de l'enregistrement de vos ordres.`;
    }

    const best = validSessions.sort((a, b) => b.netPnL - a.netPnL)[0];
    const worst = validSessions[validSessions.length - 1];

    return `### **Fait statistique**
- **Meilleure Session / Killzone** : **${best.session}** (${best.sampleSize} trades, Win Rate **${formatPercent(best.winRate, 1)}**, P&L net **${best.netPnL >= 0 ? '+' : ''}${best.netPnL}€**).
${worst && worst.session !== best.session ? `- **Session la moins performante** : **${worst.session}** (${worst.sampleSize} trades, Win Rate **${formatPercent(worst.winRate, 1)}**, P&L net **${worst.netPnL >= 0 ? '+' : ''}${worst.netPnL}€**).` : ''}

### **Observation & Interprétation**
La session **${best.session}** offre les expansions de prix et les livraisons institutionnelles les plus conformes à vos critères de timing d'entrée.

### **Action concrète**
Planifiez votre présence devant les écrans exclusivement durant la session **${best.session}** et évitez les prises de position en fin de journée ou hors horaires de liquidité majeure.`;
  }

  // 4. POST-LOSS BEHAVIOR / APRES UNE PERTE
  if (q.includes('perte') || q.includes('après une perte') || q.includes('post-perte') || q.includes('revenge')) {
    const pl = context.postLossBehavior;
    if (pl.tradesImmediatelyAfterLoss === 0) {
      return `### **Fait statistique**
Aucune séquence de trades consécutifs post-perte n'a été identifiée dans l'historique récent.

### **Interprétation**
Votre journal ne contient pas encore assez d'occurrences pour quantifier les biais psychologiques post-perte.

### **Action concrète**
Respectez une pause obligatoire de 15 minutes après tout Stop Loss déclenché pour neutraliser les réflexes de sur-trading.`;
    }

    return `### **Fait statistique**
- **Trades exécutés immédiatement après une perte** : **${pl.tradesImmediatelyAfterLoss}**
- **Taux de réussite post-perte** : **${formatPercent(pl.winRateAfterLoss, 1)}** (vs **${formatPercent(summary.winRate, 1)}** global)
- **Taux de fautes de discipline post-perte** : **${formatPercent(pl.mistakeRateAfterLoss, 1)}**
${pl.mostFrequentMistakeAfterLoss ? `- **Erreur la plus fréquente après une perte** : **${pl.mostFrequentMistakeAfterLoss}**` : ''}
${pl.avgRMultipleAfterLoss !== null ? `- **R moyen réalisé post-perte** : **${pl.avgRMultipleAfterLoss >= 0 ? '+' : ''}${pl.avgRMultipleAfterLoss.toFixed(2)}R**` : ''}

### **Observation & Interprétation**
${pl.winRateAfterLoss < summary.winRate ? `Vos performances chutent de ${(summary.winRate - pl.winRateAfterLoss).toFixed(1)}% sur le trade qui suit une perte. Cela indique un biais de précipitation ou de compensation (Revenge Trading).` : `Votre taux de rebond après perte est stable (${formatPercent(pl.winRateAfterLoss, 1)}%), démontrant une bonne résilience émotionnelle.`}

### **Action concrète**
1. Installez un coupe-circuit strict : **Règle des 20 minutes sans écran** après un trade perdant.
2. Interdiction formelle d'augmenter le lotage après un Stop Loss.`;
  }

  // 5. EDGE CONFIRMATION / MON EDGE EST-IL CONFIRMÉ
  if (q.includes('confirmé') || q.includes('edge') || q.includes('fiable') || q.includes('solidité')) {
    const verdict = context.myEdgeVerdict;
    const robustSetups = context.setups.filter((s) => s.sampleSize >= 15 && s.winRate >= 50);

    return `### **Fait statistique**
- **Trades totaux analysés** : **${summary.closedTrades}**
- **Espérance globale** : **${summary.rExpectancy !== null ? `+${summary.rExpectancy.toFixed(2)}R` : `${summary.monetaryExpectancy >= 0 ? '+' : ''}${summary.monetaryExpectancy}€`}** par trade
- **Facteur de Profit** : **${summary.profitFactor !== null ? summary.profitFactor.toFixed(2) : 'N/A'}**
- **Setups robustes (≥15 trades)** : **${robustSetups.length}** (${robustSetups.map((s) => s.name).join(', ') || 'Aucun setup à ≥15 trades'})

### **Observation & Interprétation**
${summary.closedTrades >= 30 && summary.profitFactor && summary.profitFactor >= 1.5 ? `Votre Edge global est **CONFIRMÉ**. Vos métriques dépassent les seuils d'exigence institutionnels avec un échantillon représentatif.` : summary.closedTrades >= 10 ? `Votre Edge est **EN COURS DE VALIDATION**. Les tendances sont positives mais requièrent davantage d'exécutions pour éliminer la variance de court terme.` : `**Données insuffisantes pour conclure.** L'échantillon actuel (${summary.closedTrades} trades) est trop faible pour confirmer un Edge mathématique absolu.`}

### **Action concrète**
${verdict.keyTakeaway ? `Consigne directrice : ${verdict.keyTakeaway}` : `Accumulez 30 exécutions strictes sur votre setup dominant sans dévier de votre plan de trading.`}`;
  }

  // 6. WEEKLY COMPARISON / COMPARAISON SEMAINE
  if (q.includes('semaine') || q.includes('comparer') || q.includes('évolution') || q.includes('progression')) {
    const wc = context.weeklyComparison;
    return `### **Fait statistique**
- **Semaine en cours (7 derniers jours)** : **${wc.currentWeekTrades}** trades | Win Rate **${formatPercent(wc.currentWeekWinRate, 1)}** | P&L **${wc.currentWeekPnL >= 0 ? '+' : ''}${wc.currentWeekPnL}€**
- **Semaine précédente (J-14 à J-7)** : **${wc.previousWeekTrades}** trades | Win Rate **${formatPercent(wc.previousWeekWinRate, 1)}** | P&L **${wc.previousWeekPnL >= 0 ? '+' : ''}${wc.previousWeekPnL}€**

### **Observation & Interprétation**
${wc.currentWeekPnL >= wc.previousWeekPnL ? `Progression positive du P&L net (+${(wc.currentWeekPnL - wc.previousWeekPnL).toFixed(2)}€ vs semaine précédente).` : `Régression temporaire du P&L (${(wc.currentWeekPnL - wc.previousWeekPnL).toFixed(2)}€ vs semaine précédente). Surveillez le respect des critères d'entrée.`}

### **Action concrète**
Conservez le même dimensionnement de risque ($1R) sans chercher à forcer le volume pour compenser ou sur-optimiser.`;
  }

  // 7. RECENT TRADES ANALYSIS / DERNIERS TRADES
  if (q.includes('derniers trades') || q.includes('analyse mes') || q.includes('récents') || q.includes('historique')) {
    const recent = context.recentTrades.slice(0, 5);
    if (recent.length === 0) {
      return `### **Fait statistique**
Aucun trade récent à analyser.

### **Action concrète**
Enregistrez vos trades pour débloquer l'audit des séquences récentes.`;
    }

    const winsCount = recent.filter((t) => t.netPnL && t.netPnL > 0).length;
    const mistakesCount = recent.filter((t) => t.mistake !== 'NONE').length;

    const list = recent
      .map(
        (t) =>
          `• **${t.date}** | **${t.symbol}** (${t.direction}) | Setup: **${t.setup}** | Résultat: **${t.netPnL !== null && t.netPnL >= 0 ? '+' : ''}${t.netPnL}€** (${t.rMultiple !== null ? `${t.rMultiple >= 0 ? '+' : ''}${t.rMultiple}R` : 'N/A'})${t.mistake !== 'NONE' ? ` ⚠️ *${t.mistake}*` : ''}`
      )
      .join('\n');

    return `### **Fait statistique (5 derniers trades)**
${list}

- **Bilan de la séquence** : ${winsCount}/${recent.length} gagnants (${Math.round((winsCount / recent.length) * 100)}% Win Rate)
- **Fautes de discipline étiquetées** : ${mistakesCount} faute(s) sur 5 positions.

### **Observation & Interprétation**
${mistakesCount > 0 ? `Présence de fautes de discipline sur les dernières exécutions. Chaque entorse aux règles érode directement votre espérance mathématique.` : `Excellente rigueur d'exécution sur les 5 dernières prises de position avec zéro faute majeure tagguée.`}

### **Action concrète**
Maintenez le focus sur l'exécution propre plutôt que sur le résultat monétaire immédiat du prochain trade.`;
  }

  // 8. POINTS TO IMPROVE / ERREURS RECURRENTES
  if (q.includes('améliorer') || q.includes('erreur') || q.includes('faiblesse') || q.includes('leak') || q.includes('points')) {
    if (context.mistakes.length === 0) {
      return `### **Fait statistique**
- **Taux de discipline** : **${summary.disciplineRate}%**
- Aucune faute de discipline récurrente étiquetée dans le journal.

### **Observation & Interprétation**
Votre journal est exempt d'erreurs flagrantes tagguées (FOMO, Revenge, Sortie anticipée).

### **Action concrète**
Continuez à documenter scrupuleusement la dimension psychologique de chaque position fermée afin de détecter immédiatement toute dérive d'exécution.`;
    }

    const topMistake = context.mistakes[0];
    const totalMistakeCost = context.mistakes.reduce((acc, m) => acc + m.totalCost, 0);

    return `### **Fait statistique**
- **Fuite de capital identifiée** : **-${totalMistakeCost.toFixed(2)}€** cumulés sur des fautes de discipline.
- **Erreur #1** : **${topMistake.mistake}** (${topMistake.count} occurrence(s), coût direct: **-${topMistake.totalCost.toFixed(2)}€**).
- **Indice de discipline global** : **${summary.disciplineRate}%**.

### **Observation & Interprétation**
L'élimination de l'erreur **${topMistake.mistake}** augmenterait instantanément votre P&L net de **+${topMistake.totalCost.toFixed(2)}€** sans rien changer à votre stratégie technique.

### **Action concrète**
1. Rédigez une checklist pré-trade de 3 points éliminant spécifiquement le déclencheur de **${topMistake.mistake}**.
2. Réduisez votre levier de moitié dès lors que vous ressentez une impulsion d'entrée non planifiée.`;
  }

  // DEFAULT / GENERAL OVERVIEW
  return `### **Fait statistique**
- **Volume global** : **${summary.closedTrades}** trades clôturés
- **Taux de réussite** : **${formatPercent(summary.winRate, 1)}** (${summary.wins}W / ${summary.losses}L / ${summary.breakevens}BE)
- **P&L Net total** : **${summary.netPnL >= 0 ? '+' : ''}${summary.netPnL}€**
- **Facteur de Profit** : **${summary.profitFactor ? summary.profitFactor.toFixed(2) : 'N/A'}**
${summary.rExpectancy !== null ? `- **Espérance R** : **+${summary.rExpectancy.toFixed(2)}R** par trade` : ''}

### **Observation & Interprétation**
${context.myEdgeVerdict.keyTakeaway}

### **Action concrète**
Posez une question ciblée pour approfondir votre analyse :
- « Quel est mon meilleur setup ? »
- « Sur quelle paire suis-je le plus performant ? »
- « Quels sont mes comportements après une perte ? »
- « Analyse mes 5 derniers trades »`;
}
