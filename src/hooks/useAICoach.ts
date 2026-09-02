import { useState, useCallback, useEffect } from 'react';
import { Trade } from '../types/trade';
import { Setup } from '../types/setup';
import { buildCoachContext, CoachContextPayload } from '../lib/coachContext';
import { generateLocalCoachAnalysis } from '../lib/coachLocalEngine';

export interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  text: string;
  timestamp: string;
  isError?: boolean;
}

const STORAGE_KEY = 'thunder_edge_ai_coach_messages_v1';

export function useAICoach(
  trades: Trade[] = [],
  setups: Setup[] = [],
  initialBalance: number = 10000
) {
  const [messages, setMessages] = useState<ChatMessage[]>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch {
      // ignore
    }
    return [
      {
        id: 'welcome-msg',
        role: 'model',
        text: `Bonjour. Je suis votre **AI Trading Coach & Performance Auditor**.

Je suis connecté en temps réel à l'intégralité de vos données de trading :
- **Vos trades réels** (entrées, sorties, R-multiples, sessions, P&L)
- **Vos setups & votre Edge** quantifié
- **Votre discipline & psychologie** (erreurs récurrentes, comportements post-perte)

Posez-moi une question précise pour auditer vos performances.`,
        timestamp: new Date().toISOString(),
      },
    ];
  });

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Sync to local storage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(messages));
    } catch {
      // ignore
    }
  }, [messages]);

  const clearHistory = useCallback(() => {
    const welcome: ChatMessage = {
      id: `welcome-${Date.now()}`,
      role: 'model',
      text: `Historique réinitialisé. Que souhaitez-vous analyser sur vos performances ?`,
      timestamp: new Date().toISOString(),
    };
    setMessages([welcome]);
    setError(null);
  }, []);

  const sendMessage = useCallback(
    async (userText: string) => {
      const trimmed = userText.trim();
      if (!trimmed || isLoading) return;

      const userMsg: ChatMessage = {
        id: `user-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        role: 'user',
        text: trimmed,
        timestamp: new Date().toISOString(),
      };

      setMessages((prev) => [...prev, userMsg]);
      setIsLoading(true);
      setError(null);

      // Build real trading context
      const context: CoachContextPayload = buildCoachContext(trades, setups, initialBalance);

      // Build history payload for contextual memory (excluding welcome message if long)
      const historyPayload = messages
        .filter((m) => m.id !== 'welcome-msg' && !m.isError)
        .slice(-10)
        .map((m) => ({
          role: m.role,
          text: m.text,
        }));

      try {
        const response = await fetch('/api/coach/chat', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            message: trimmed,
            history: historyPayload,
            context,
          }),
        });

        if (!response.ok) {
          const errData = await response.json().catch(() => ({}));
          console.warn('[AI Coach API response not ok, switching to local analysis]:', errData);
          // If the server cannot answer (e.g. missing API key in dev or error), perform deterministic synthesis
          const localReply = generateLocalCoachAnalysis(trimmed, context, historyPayload);
          const modelMsg: ChatMessage = {
            id: `model-${Date.now()}`,
            role: 'model',
            text: localReply,
            timestamp: new Date().toISOString(),
          };
          setMessages((prev) => [...prev, modelMsg]);
          return;
        }

        const data = await response.json();
        const modelMsg: ChatMessage = {
          id: `model-${Date.now()}`,
          role: 'model',
          text: data.reply || 'Aucune réponse reçue.',
          timestamp: new Date().toISOString(),
        };

        setMessages((prev) => [...prev, modelMsg]);
      } catch (err: any) {
        console.warn('[AI Coach fetch failed, falling back to local engine]:', err);
        const localReply = generateLocalCoachAnalysis(trimmed, context, historyPayload);
        const modelMsg: ChatMessage = {
          id: `model-${Date.now()}`,
          role: 'model',
          text: localReply,
          timestamp: new Date().toISOString(),
        };
        setMessages((prev) => [...prev, modelMsg]);
      } finally {
        setIsLoading(false);
      }
    },
    [messages, isLoading, trades, setups, initialBalance]
  );

  return {
    messages,
    isLoading,
    error,
    sendMessage,
    clearHistory,
  };
}
