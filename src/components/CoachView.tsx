import React, { useEffect, useRef, useState } from 'react';
import { AlertTriangle, Bot, Send, Sparkles, Trash2, User } from 'lucide-react';
import { motion } from 'motion/react';
import { useAICoach } from '../hooks/useAICoach';

interface CoachViewProps {
  trades?: unknown[];
  setups?: unknown[];
  currency?: string;
  initialBalance?: number;
}

const suggestions = [
  'Analyse ma dernière semaine',
  'Quel est mon setup le plus rentable ?',
  'Pourquoi je perds de l’argent en ce moment ?',
  'Comment améliorer ma discipline en trading ?',
];

function renderText(text: string) {
  return text.split('\n').map((line, index) => (
    <React.Fragment key={`${index}-${line}`}>
      {line.split(/(\*\*.*?\*\*)/g).map((part, partIndex) =>
        part.startsWith('**') && part.endsWith('**') ? (
          <strong key={partIndex}>{part.slice(2, -2)}</strong>
        ) : (
          <React.Fragment key={partIndex}>{part}</React.Fragment>
        )
      )}
      {index < text.split('\n').length - 1 && <br />}
    </React.Fragment>
  ));
}

export const CoachView: React.FC<CoachViewProps> = () => {
  const { messages, isLoading, isReady, sendMessage, clearHistory, dailyCount, dailyLimit } = useAICoach();
  const [input, setInput] = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [messages, isLoading]);

  const submit = async () => {
    const value = input.trim();
    if (!value || isLoading || !isReady) return;
    setInput('');
    await sendMessage(value);
    inputRef.current?.focus();
  };

  const onKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      void submit();
    }
  };

  return (
    <div id="view-coach" className="space-y-6 font-sans">
      <div className="p-6 rounded-3xl border border-[#ECE7FC] dark:border-[#292E38] bg-white dark:bg-[#12151D] shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-[#F5EEFF] dark:bg-[#FF8A00]/10 text-[#6D19E8] dark:text-[#FF8A00] border border-[#DDD5FA] dark:border-[#FF8A00]/30">
              <Bot className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-base font-bold text-[#0F0E26] dark:text-[#F5F5F5]">Trading Coach</h2>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/30">Gemini Connecté</span>
              </div>
              <p className="text-xs text-[#6B668D] dark:text-[#9299A8] font-medium mt-1">Conversation générale avec votre coach IA. L’accès aux données de trading sera ajouté dans une prochaine étape.</p>
            </div>
          </div>
          <button type="button" onClick={() => void clearHistory()} disabled={isLoading || !isReady} className="flex items-center justify-center gap-1.5 px-3.5 py-2 text-xs font-bold text-[#6B668D] dark:text-[#9299A8] bg-[#FAF8FF] dark:bg-[#181C25] hover:bg-[#F3EEFF] dark:hover:bg-[#202531] border border-[#ECE7FC] dark:border-[#292E38] rounded-2xl transition disabled:opacity-50 disabled:cursor-not-allowed">
            <Trash2 className="w-3.5 h-3.5" /> Effacer la conversation
          </button>
        </div>
      </div>

      <div className="rounded-3xl border border-[#ECE7FC] dark:border-[#292E38] bg-white dark:bg-[#12151D] shadow-sm overflow-hidden flex flex-col h-[min(700px,calc(100vh-250px))] min-h-[560px]">
        <div className="px-5 py-3.5 border-b border-[#ECE7FC] dark:border-[#292E38] bg-[#FAF8FF] dark:bg-[#181C25] flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" /><span className="text-xs font-bold text-[#0F0E26] dark:text-[#F5F5F5]">Conversation active</span></div>
          <span className="text-[11px] text-[#8E89AF] dark:text-[#9299A8] font-medium">{dailyCount}/{dailyLimit} messages aujourd’hui</span>
        </div>

        <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-6 space-y-5 scroll-smooth">
          {messages.map((message) => {
            const isUser = message.role === 'user';
            return (
              <motion.div key={message.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }} className={`flex items-end gap-2.5 ${isUser ? 'justify-end' : 'justify-start'}`}>
                {!isUser && <div className={`w-8 h-8 rounded-xl shrink-0 flex items-center justify-center ${message.isError ? 'bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400' : 'bg-[#F5EEFF] dark:bg-[#FF8A00]/10 text-[#6D19E8] dark:text-[#FF8A00]'}`}>{message.isError ? <AlertTriangle className="w-4 h-4" /> : <Bot className="w-4 h-4" />}</div>}
                <div className={`max-w-[85%] sm:max-w-[72%] rounded-2xl px-4 py-3 text-sm leading-relaxed break-words ${isUser ? 'rounded-br-md bg-[#6D19E8] text-white shadow-sm' : message.isError ? 'rounded-bl-md bg-red-50 dark:bg-red-500/10 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-500/20' : 'rounded-bl-md bg-[#F7F5FC] dark:bg-[#1A1E28] text-[#29263D] dark:text-[#E5E7EB] border border-[#ECE7FC] dark:border-[#292E38]'}`}>{renderText(message.text)}</div>
                {isUser && <div className="w-8 h-8 rounded-xl shrink-0 flex items-center justify-center bg-[#FFF1E3] dark:bg-[#FF8A00]/10 text-[#D96D00] dark:text-[#FF9D33]"><User className="w-4 h-4" /></div>}
              </motion.div>
            );
          })}

          {isLoading && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-end gap-2.5">
              <div className="w-8 h-8 rounded-xl shrink-0 flex items-center justify-center bg-[#F5EEFF] dark:bg-[#FF8A00]/10 text-[#6D19E8] dark:text-[#FF8A00]"><Bot className="w-4 h-4" /></div>
              <div className="rounded-2xl rounded-bl-md px-4 py-3 bg-[#F7F5FC] dark:bg-[#1A1E28] border border-[#ECE7FC] dark:border-[#292E38] text-[#6B668D] dark:text-[#9299A8] text-xs font-medium flex items-center gap-2">
                <span>Coach est en train d’écrire</span>
                <span className="flex gap-1" aria-label="Réponse en cours"><span className="w-1.5 h-1.5 rounded-full bg-[#6D19E8] dark:bg-[#FF8A00] animate-bounce [animation-delay:-0.3s]" /><span className="w-1.5 h-1.5 rounded-full bg-[#6D19E8] dark:bg-[#FF8A00] animate-bounce [animation-delay:-0.15s]" /><span className="w-1.5 h-1.5 rounded-full bg-[#6D19E8] dark:bg-[#FF8A00] animate-bounce" /></span>
              </div>
            </motion.div>
          )}
          <div ref={bottomRef} />
        </div>

        <div className="shrink-0 border-t border-[#ECE7FC] dark:border-[#292E38] bg-white dark:bg-[#12151D]">
          {messages.length === 1 && !isLoading && (
            <div className="px-4 sm:px-6 pt-4">
              <div className="flex items-center gap-2 mb-2 text-[10px] font-bold uppercase tracking-wider text-[#8E89AF] dark:text-[#9299A8]"><Sparkles className="w-3.5 h-3.5 text-[#6D19E8] dark:text-[#FF8A00]" /> Suggestions</div>
              <div className="flex flex-wrap gap-2">{suggestions.map((suggestion) => <button key={suggestion} type="button" onClick={() => { setInput(suggestion); inputRef.current?.focus(); }} className="px-3 py-2 rounded-xl border border-[#E5DDF8] dark:border-[#332B45] bg-[#FAF8FF] dark:bg-[#181C25] text-[11px] font-semibold text-[#5B4A80] dark:text-[#C9B8E8] hover:border-[#6D19E8]/40 hover:bg-[#F3EEFF] dark:hover:bg-[#211A2C] transition">{suggestion}</button>)}</div>
            </div>
          )}

          <form onSubmit={(event) => { event.preventDefault(); void submit(); }} className="p-4 sm:p-5">
            <div className="flex items-end gap-2 p-2 rounded-2xl border border-[#DDD5FA] dark:border-[#343946] bg-[#FAF8FF] dark:bg-[#181C25] focus-within:border-[#6D19E8] dark:focus-within:border-[#FF8A00]/70 focus-within:ring-2 focus-within:ring-[#6D19E8]/10 transition">
              <textarea ref={inputRef} value={input} onChange={(event) => setInput(event.target.value)} onKeyDown={onKeyDown} disabled={isLoading || !isReady} rows={1} placeholder="Écrivez votre message au coach…" aria-label="Message au Trading Coach" className="flex-1 resize-none max-h-32 min-h-10 px-2 py-2.5 bg-transparent outline-none text-sm text-[#29263D] dark:text-[#F5F5F5] placeholder:text-[#9A95B2] disabled:opacity-50" />
              <button type="submit" disabled={!input.trim() || isLoading || !isReady} aria-label="Envoyer le message" className="w-10 h-10 shrink-0 rounded-xl flex items-center justify-center bg-[#6D19E8] hover:bg-[#5D13C9] dark:bg-[#FF8A00] dark:hover:bg-[#E97800] text-white transition disabled:opacity-40 disabled:cursor-not-allowed"><Send className="w-4 h-4" /></button>
            </div>
            <p className="mt-2 text-[10px] text-center text-[#9A95B2] dark:text-[#6F7685]">Entrée pour envoyer • Maj + Entrée pour aller à la ligne</p>
          </form>
        </div>
      </div>
    </div>
  );
};
