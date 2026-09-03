import React, { useMemo, useState } from 'react';
import { AlertTriangle, BarChart3, CheckCircle2, ChevronRight, CircleHelp, Clock3, Lightbulb, Loader2, Plus, Sparkles, Target, TrendingDown, TrendingUp, Zap } from 'lucide-react';
import { Trade } from '../types/trade';
import { Setup } from '../types/setup';
import { buildCoachContext } from '../lib/coachContext';
import { calculateWinRate, calculateProfitFactor } from '../lib/calculations/statistics';
import { useRiskAlerts } from '../hooks/useRiskAlerts';
import { UserSettings } from '../types/settings';

type Tab = 'analysis' | 'charts' | 'recommendations';
type AIAnalysis = { summary: string; keyPoints: string[]; confidenceScore: number };
type Recommendation = { id: string; title: string; description: string; priority: 'Élevée'|'Moyenne'|'Faible'; impact: number; effort: number; quickFixes: string[]; category: string; estimatedCost: number; status: 'Nouveau'|'En cours'|'Résolu' };

const card = 'rounded-3xl border border-slate-800/80 bg-[#111118] shadow-[0_18px_50px_rgba(0,0,0,.18)]';
const labelMap: Record<string,string> = { ASIA:'Asia', TOKYO:'Asia', LONDON:'London', NEW_YORK:'New York', SYDNEY:'Asia', CUSTOM:'Custom', OFF_HOURS:'Hors session' };
const currencyValue = (value:number, currency:string) => `${value >= 0 ? '+' : ''}${value.toLocaleString('fr-FR',{minimumFractionDigits:2,maximumFractionDigits:2})} ${currency}`;
const pct = (value:number) => `${value.toFixed(1)}%`;

function aggregate(trades: Trade[], key: (t:Trade)=>string, labels?:Record<string,string>) {
  const map = new Map<string, Trade[]>();
  trades.filter(t=>t.status !== 'OPEN' && typeof t.netPnL === 'number').forEach(t => { const k=key(t); if(k) map.set(k,[...(map.get(k)||[]),t]); });
  return [...map.entries()].map(([name,ts])=>({ name: labels?.[name] || name, pnl: ts.reduce((s,t)=>s+(t.netPnL||0),0)/ts.length, winRate: ts.filter(t=>(t.netPnL||0)>0).length/ts.length*100, count:ts.length })).sort((a,b)=>a.name.localeCompare(b.name));
}

function PerformanceChart({ title, data, info }: {title:string;data:{name:string;pnl:number;winRate:number;count:number}[];info:string}) {
  const maxAbs = Math.max(1,...data.map(d=>Math.abs(d.pnl)));
  const width=620,height=230,padL=48,padR=42,padT=28,padB=45;
  const plotW=width-padL-padR, plotH=height-padT-padB, zeroY=padT+plotH/2;
  const points=data.map((d,i)=>({ ...d, x:padL+(i+0.5)*(plotW/data.length), y:padT+plotH-(d.winRate/100)*plotH }));
  return <div className={`${card} p-5`}>
    <div className="flex items-center justify-between mb-3"><div><h3 className="text-sm font-bold text-white">{title}</h3><p className="text-[10px] text-slate-500 mt-1">{data.reduce((s,d)=>s+d.count,0)} trades analysés</p></div><div title={info} className="text-slate-500 hover:text-fuchsia-300 cursor-help"><CircleHelp className="w-4 h-4"/></div></div>
    {data.length===0 ? <div className="h-[230px] flex items-center justify-center text-xs text-slate-500">Pas assez de données.</div> : <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto overflow-visible" role="img" aria-label={title}>
      <line x1={padL} y1={zeroY} x2={width-padR} y2={zeroY} stroke="#334155" strokeDasharray="3 4"/>
      <line x1={padL} y1={padT} x2={padL} y2={height-padB} stroke="#334155"/><line x1={width-padR} y1={padT} x2={width-padR} y2={height-padB} stroke="#334155"/>
      {data.map((d,i)=>{const x=padL+(i+0.5)*(plotW/data.length), bw=Math.min(52,plotW/data.length*.52), bh=Math.abs(d.pnl)/maxAbs*(plotH/2-6), y=d.pnl>=0?zeroY-bh:zeroY; return <g key={d.name}><rect x={x-bw/2} y={y} width={bw} height={Math.max(2,bh)} rx="5" fill="url(#pnlGradient)" opacity=".82"/><text x={x} y={height-18} textAnchor="middle" fontSize="9" fill="#94a3b8">{d.name}</text></g>})}
      <polyline fill="none" stroke="#F472B6" strokeWidth="2.5" points={points.map(p=>`${p.x},${p.y}`).join(' ')}/>
      {points.map(p=><circle key={p.name} cx={p.x} cy={p.y} r="3.5" fill="#F472B6"><title>{p.name}: P&L moyen {currencyValue(p.pnl,'')} · Win rate {pct(p.winRate)}</title></circle>)}
      <defs><linearGradient id="pnlGradient" x1="0" x2="1"><stop offset="0%" stopColor="#7C3AED"/><stop offset="100%" stopColor="#EC4899"/></linearGradient></defs>
      <text x="8" y={padT+5} fontSize="9" fill="#94a3b8">P&L moyen</text><text x={width-5} y={padT+5} textAnchor="end" fontSize="9" fill="#F472B6">Win rate</text>
    </svg>}
    <div className="flex items-center gap-5 text-[10px] text-slate-400 mt-1"><span className="flex items-center gap-1.5"><i className="w-2.5 h-2.5 rounded-sm bg-gradient-to-r from-violet-600 to-fuchsia-500"/>P&L moyen</span><span className="flex items-center gap-1.5"><i className="w-2.5 h-2.5 rounded-full bg-pink-400"/>Win rate</span></div>
  </div>;
}

function Confidence({ score }: {score:number}) {
  const safe=Math.max(0,Math.min(100,score)), r=35, c=2*Math.PI*r;
  return <div className="relative w-24 h-24 shrink-0"><svg viewBox="0 0 84 84" className="w-full h-full -rotate-90"><circle cx="42" cy="42" r={r} fill="none" stroke="#27272f" strokeWidth="7"/><circle cx="42" cy="42" r={r} fill="none" stroke="url(#confidenceGradient)" strokeWidth="7" strokeLinecap="round" strokeDasharray={c} strokeDashoffset={c*(1-safe/100)}/><defs><linearGradient id="confidenceGradient"><stop stopColor="#7C3AED"/><stop offset="1" stopColor="#EC4899"/></linearGradient></defs></svg><div className="absolute inset-0 flex flex-col items-center justify-center"><span className="text-lg font-black text-white">{Math.round(safe)}</span><span className="text-[8px] uppercase tracking-wider text-slate-500">confiance</span></div></div>;
}

function RecommendationCard({ rec, onStatus, onApply }: {rec:Recommendation;onStatus:(id:string,status:Recommendation['status'])=>void;onApply:(rec:Recommendation)=>void}) {
  const priorityClass=rec.priority==='Élevée'?'text-rose-300 bg-rose-500/10 border-rose-500/20':rec.priority==='Moyenne'?'text-amber-300 bg-amber-500/10 border-amber-500/20':'text-slate-300 bg-slate-700/30 border-slate-600';
  const effort=rec.effort<=3?'Faible':rec.effort<=6?'Moyen':'Élevé';
  return <div className={`${card} p-5`}>
    <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
      <div className="flex gap-3 min-w-0"><div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 border ${priorityClass}`}><AlertTriangle className="w-4 h-4"/></div><div><div className="flex flex-wrap items-center gap-2"><span className={`px-2 py-1 rounded-full border text-[9px] font-black uppercase tracking-wider ${priorityClass}`}>{rec.priority}</span><span className="text-[10px] text-slate-500">{rec.category}</span></div><h3 className="text-base font-bold text-white mt-2">{rec.title}</h3><p className="text-xs text-slate-400 leading-relaxed mt-1.5 max-w-3xl">{rec.description}</p></div></div>
      <div className="flex items-center gap-3 shrink-0"><div className="text-right"><div className="text-[9px] uppercase tracking-wider text-slate-500">Impact estimé</div><div className="text-sm font-black text-emerald-400">+{rec.impact.toFixed(0)} $/mois</div></div><div className="w-14 h-14 rounded-full border border-emerald-500/20 flex items-center justify-center text-xs font-bold text-white">{Math.min(100,Math.max(0,rec.impact>0?Math.round(rec.impact):0))}%</div></div>
    </div>
    <div className="grid md:grid-cols-[1fr_160px] gap-4 mt-5 pt-4 border-t border-slate-800/80">
      <div><div className="text-[9px] uppercase tracking-wider font-bold text-slate-500 mb-2">Quick-fix</div><ul className="space-y-1.5">{rec.quickFixes.slice(0,3).map((f,i)=><li key={i} className="text-xs text-slate-300 flex gap-2"><CheckCircle2 className="w-3.5 h-3.5 text-violet-400 shrink-0 mt-0.5"/>{f}</li>)}</ul></div>
      <div><div className="text-[9px] uppercase tracking-wider font-bold text-slate-500 mb-2">Effort requis</div><div className="flex gap-1.5 items-center">{Array.from({length:10},(_,i)=><span key={i} className={`h-1.5 flex-1 rounded-full ${i<rec.effort?'bg-gradient-to-r from-violet-600 to-fuchsia-500':'bg-slate-800'}`}/>)}</div><div className="text-[10px] text-slate-400 mt-1">{effort} · {rec.effort}/10</div></div>
    </div>
    <div className="flex flex-wrap items-center justify-between gap-3 mt-5">
      <select value={rec.status} onChange={e=>onStatus(rec.id,e.target.value as Recommendation['status'])} className="text-[11px] bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-slate-300 outline-none"><option>Nouveau</option><option>En cours</option><option>Résolu</option></select>
      <div className="flex gap-2"><button className="px-3 py-2 rounded-xl border border-slate-700 text-xs font-bold text-slate-300 hover:border-violet-500/50">Voir le plan d'action <ChevronRight className="inline w-3.5 h-3.5"/></button><button onClick={()=>onApply(rec)} className="px-3 py-2 rounded-xl bg-gradient-to-r from-violet-600 to-fuchsia-500 text-white text-xs font-bold"><Plus className="inline w-3.5 h-3.5 mr-1"/>Appliquer à mon plan</button></div>
    </div>
  </div>;
}

export const AIAnalysisView: React.FC<{trades:Trade[];setups:Setup[];settings:UserSettings;currency:string;onNotify?:(type:'success'|'error',message:string)=>void}> = ({trades,setups,settings,currency,onNotify}) => {
  const [tab,setTab]=useState<Tab>('analysis'); const [analysis,setAnalysis]=useState<AIAnalysis|null>(null); const [recommendations,setRecommendations]=useState<Recommendation[]>([]); const [loading,setLoading]=useState(false); const [error,setError]=useState<string|null>(null);
  const { activeAlerts } = useRiskAlerts(trades,settings);
  const context=useMemo(()=>buildCoachContext(trades,setups,settings.initialAccountBalance||10000),[trades,setups,settings.initialAccountBalance]);
  const closed=useMemo(()=>trades.filter(t=>t.status!=='OPEN'&&typeof t.netPnL==='number'),[trades]);
  const stats=useMemo(()=>{const wr=calculateWinRate(trades);const pf=calculateProfitFactor(trades);return {winRate:wr.winRate||0, trades:wr.closed, pnl:closed.reduce((s,t)=>s+(t.netPnL||0),0), pf:pf.profitFactor};},[trades,closed]);
  const chartData=useMemo(()=>({sessions:aggregate(closed,t=>t.session||'UNKNOWN',labelMap),timeframes:aggregate(closed,t=>t.timeframe||'Non renseigné'),days:aggregate(closed,t=>{const d=new Date(t.closedAt||t.openedAt);return ['Dim','Lun','Mar','Mer','Jeu','Ven','Sam'][d.getDay()]}),hours:aggregate(closed,t=>{const d=new Date(t.closedAt||t.openedAt);const h=d.toLocaleString('fr-FR',{hour:'2-digit',hour12:false,timeZone:t.timezone||'UTC'});return `${h}h`})}),[closed]);
  const runAnalysis=async()=>{setLoading(true);setError(null);try{const r=await fetch('/api/ai-analysis',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({mode:'analysis',context})});const j=await r.json();if(!r.ok)throw new Error(j.error||'Analyse indisponible');setAnalysis({summary:j.data.summary,keyPoints:Array.isArray(j.data.keyPoints)?j.data.keyPoints.slice(0,4):[],confidenceScore:Number(j.data.confidenceScore)||0});}catch(e){setError(e instanceof Error?e.message:'Analyse indisponible');}finally{setLoading(false);}};
  const runRecommendations=async()=>{setLoading(true);setError(null);try{const patternCosts=activeAlerts.map(a=>{const related=trades.filter(t=>a.relatedTradeIds.includes(t.id));const cost=Math.abs(related.filter(t=>(t.netPnL||0)<0).reduce((s,t)=>s+(t.netPnL||0),0));return {...a,estimatedCost:cost};});const r=await fetch('/api/ai-analysis',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({mode:'recommendations',context:{summary:context.summary,alerts:patternCosts,setups:context.setups,sessions:context.sessions,pairs:context.pairs}})});const j=await r.json();if(!r.ok)throw new Error(j.error||'Recommandations indisponibles');const next=(j.data.recommendations||[]).slice(0,8).map((x:any,i:number)=>{const alert=patternCosts[i];const cost=Number(alert?.estimatedCost)||0;return {...x,id:`${alert?.id||'ai'}-${i}`,impact:Number(x.impact)||Math.round(cost*.6),effort:Math.min(10,Math.max(1,Math.round(Number(x.effort)||5))),estimatedCost:cost,status:'Nouveau'};});setRecommendations(next);}catch(e){setError(e instanceof Error?e.message:'Recommandations indisponibles');}finally{setLoading(false);}};
  const ensureAnalysis=()=>{if(!analysis&&!loading)void runAnalysis();}; const ensureRecommendations=()=>{if(!recommendations.length&&!loading)void runRecommendations();};
  const updateStatus=(id:string,status:Recommendation['status'])=>setRecommendations(r=>r.map(x=>x.id===id?{...x,status}:x));
  const applyPlan=(rec:Recommendation)=>{try{const key='thunder-edge-followed-recommendations';const current=JSON.parse(localStorage.getItem(key)||'[]');localStorage.setItem(key,JSON.stringify([...current.filter((x:any)=>x.id!==rec.id),{...rec,addedAt:new Date().toISOString()}]));onNotify?.('success',`« ${rec.title} » ajoutée à vos recommandations suivies.`);}catch{onNotify?.('error','Impossible d’enregistrer la recommandation.');}};
  const metrics=[['Total P&L',currencyValue(stats.pnl,currency),stats.pnl>=0?'text-emerald-400':'text-rose-400',TrendingUp],['Win Rate',pct(stats.winRate),'text-emerald-400',Target],['Profit Factor',stats.pf===null?'—':stats.pf===Infinity?'∞':stats.pf.toFixed(2),stats.pf!==null&&stats.pf>=1?'text-emerald-400':'text-rose-400',Zap],['Total Trades',String(stats.trades),'text-white',BarChart3]] as const;
  return <div id="view-ai-analysis" className="space-y-6 font-sans text-slate-100">
    <div><div className="flex items-center gap-3"><div className="p-2.5 rounded-2xl bg-gradient-to-br from-violet-600/20 to-fuchsia-500/20 border border-violet-500/20"><Sparkles className="w-5 h-5 text-fuchsia-300"/></div><div><h1 className="text-2xl font-black tracking-tight text-white">Analyse IA</h1><p className="text-xs text-slate-500 mt-1">Audit structuré de votre performance, sans chat libre.</p></div></div>
      <div className="mt-5 p-1 rounded-2xl bg-[#111118] border border-slate-800 flex gap-1 w-full sm:w-fit">{[['analysis','Analyse'],['charts','Graphiques'],['recommendations','Recommandations']].map(([id,label])=><button key={id} onClick={()=>{setTab(id as Tab);if(id==='analysis')ensureAnalysis();if(id==='recommendations')ensureRecommendations();}} className={`px-5 py-2.5 rounded-xl text-xs font-bold transition-all ${tab===id?'bg-gradient-to-r from-violet-600 to-fuchsia-500 text-white shadow-lg shadow-fuchsia-500/10':'text-slate-500 hover:text-white'}`}>{label}</button>)}</div>
    </div>
    {error&&<div className="p-4 rounded-2xl border border-rose-500/20 bg-rose-500/5 text-rose-300 text-xs flex items-center gap-2"><AlertTriangle className="w-4 h-4"/>{error}</div>}
    {tab==='analysis'&&<div className="space-y-5">
      {!analysis&&!loading&&<button onClick={runAnalysis} className={`${card} w-full p-8 text-left hover:border-violet-500/40 transition-colors`}><div className="flex items-center gap-3"><Lightbulb className="w-5 h-5 text-fuchsia-300"/><div><div className="text-sm font-bold text-white">Générer mon résumé exécutif IA</div><div className="text-xs text-slate-500 mt-1">Un appel Gemini unique basé sur vos statistiques réelles.</div></div><ChevronRight className="w-5 h-5 ml-auto text-slate-600"/></div></button>}
      {loading&&!analysis&&<div className={`${card} p-6 animate-pulse`}><div className="h-4 w-48 bg-slate-800 rounded mb-4"/><div className="h-3 w-full bg-slate-800 rounded mb-2"/><div className="h-3 w-4/5 bg-slate-800 rounded"/></div>}
      {analysis&&<div className={`${card} p-6 lg:p-7`}><div className="grid lg:grid-cols-[1fr_auto] gap-7 items-center"><div><div className="flex items-center gap-2 mb-3"><span className="px-2.5 py-1 rounded-full bg-fuchsia-500/10 border border-fuchsia-400/20 text-fuchsia-300 text-[9px] font-black tracking-widest">NOUVEAU</span><span className="text-[10px] text-slate-500">Résumé exécutif IA</span></div><p className="text-sm md:text-base text-slate-200 leading-7">{analysis.summary}</p></div><Confidence score={analysis.confidenceScore}/></div><div className="mt-6 pt-5 border-t border-slate-800 grid md:grid-cols-[1fr_2fr] gap-5"><div className="text-[10px] uppercase tracking-wider font-black text-slate-500">Points clés</div><ul className="space-y-2">{analysis.keyPoints.map((p,i)=><li key={i} className="text-xs text-slate-300 flex gap-2"><span className="w-1.5 h-1.5 rounded-full bg-fuchsia-400 mt-1.5 shrink-0"/>{p}</li>)}</ul></div></div>}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">{metrics.map(([title,value,color,Icon])=><div key={title} className={`${card} p-5`}><div className="flex items-center justify-between"><span className="text-[10px] uppercase tracking-wider font-bold text-slate-500">{title}</span><Icon className="w-4 h-4 text-violet-400"/></div><div className={`text-xl font-black mt-3 ${color}`}>{value}</div></div>)}</div>
    </div>}
    {tab==='charts'&&<div className="grid lg:grid-cols-2 gap-5"><PerformanceChart title="Performance par session" data={chartData.sessions} info="Compare le P&L moyen et le win rate de vos sessions de trading enregistrées."/><PerformanceChart title="Performance par unité de temps" data={chartData.timeframes} info="Compare les résultats moyens et le win rate par timeframe enregistré."/><PerformanceChart title="Performance par jour de la semaine" data={chartData.days} info="Mesure la performance moyenne et le win rate selon le jour de clôture."/><PerformanceChart title="Performance par heure de la journée" data={chartData.hours} info="Utilise le fuseau horaire enregistré pour chaque trade afin de comparer les heures." /></div>}
    {tab==='recommendations'&&<div className="space-y-5">
      {!recommendations.length&&!loading&&<button onClick={runRecommendations} className={`${card} w-full p-7 text-left hover:border-fuchsia-500/40`}><div className="flex items-center gap-3"><Target className="w-5 h-5 text-fuchsia-300"/><div><div className="text-sm font-bold text-white">Générer les recommandations IA</div><div className="text-xs text-slate-500 mt-1">Gemini analyse vos alertes, setups, sessions et paires en un seul appel.</div></div><ChevronRight className="w-5 h-5 ml-auto text-slate-600"/></div></button>}
      {loading&&<div className={`${card} p-6 animate-pulse h-32`}/>}
      {recommendations.length>0&&<><div className="grid grid-cols-2 md:grid-cols-5 gap-3">{[['Trades analysés',String(stats.trades),'text-white'],['Pertes potentielles estimées',`-${recommendations.reduce((s,r)=>s+r.estimatedCost,0).toFixed(0)} ${currency}`,'text-rose-400'],['Gain potentiel estimé',`+${recommendations.reduce((s,r)=>s+r.impact,0).toFixed(0)} ${currency}/mois`,'text-emerald-400'],['Domaines d’amélioration',String(recommendations.filter(r=>r.status!=='Résolu').length),'text-white'],['Score d’optimisation',recommendations.length>=5?'Élevé':recommendations.length>=3?'Moyen':'Faible','text-fuchsia-300']].map(([a,b,c])=><div key={a} className={`${card} p-4`}><div className="text-[9px] uppercase tracking-wider text-slate-500 font-bold">{a}</div><div className={`text-sm font-black mt-2 ${c}`}>{b}</div></div>)}</div><div className="space-y-4">{recommendations.map(r=><RecommendationCard key={r.id} rec={r} onStatus={updateStatus} onApply={applyPlan}/>)}</div></>}
      {recommendations.length===0&&!loading&&activeAlerts.length===0&&<div className={`${card} p-8 text-center`}><CheckCircle2 className="w-8 h-8 mx-auto text-emerald-400 mb-2"/><div className="text-sm font-bold text-white">Aucun pattern préoccupant détecté</div><p className="text-xs text-slate-500 mt-1">Votre système d’alertes n’a pas identifié de recommandation prioritaire.</p></div>}
    </div>}
  </div>;
};
