import { useCallback, useEffect, useRef, useState } from 'react';
import { db, CoachHistoryMessage } from '../lib/database/db';

export interface ChatMessage extends CoachHistoryMessage {}

const DAILY_LIMIT = 100;
const BURST_LIMIT = 5;
const BURST_WINDOW_MS = 10_000;
const BURST_COOLDOWN_MS = 5_000;
const DAILY_USAGE_KEY = 'thunder-edge-coach-daily-usage';
const ACTIVE_HISTORY_LIMIT = 50;

const createMessage = (role: ChatMessage['role'], text: string, isError = false): ChatMessage => ({
  id: `${role}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
  role,
  text,
  timestamp: new Date().toISOString(),
  ...(isError ? { isError: true } : {}),
});

const createWelcomeMessage = (): ChatMessage => ({
  id: `welcome-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
  role: 'model',
  text: `Bonjour 👋 Je suis votre **Trading Coach**.\n\nJe peux discuter avec vous de trading, de stratégie, de discipline, de psychologie et de gestion du risque. Posez-moi vos questions comme dans une conversation normale et je vous répondrai directement.\n\nPour cette première version, cette conversation reste générale : je ne consulte pas encore vos données de trading personnelles.`,
  timestamp: new Date().toISOString(),
});

interface DailyUsage {
  date: string;
  count: number;
}

function todayKey() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}

function readDailyUsage(): DailyUsage {
  const date = todayKey();
  try {
    const raw = localStorage.getItem(DAILY_USAGE_KEY);
    if (!raw) return { date, count: 0 };
    const parsed = JSON.parse(raw) as Partial<DailyUsage>;
    if (parsed.date !== date || typeof parsed.count !== 'number' || parsed.count < 0) {
      localStorage.setItem(DAILY_USAGE_KEY, JSON.stringify({ date, count: 0 }));
      return { date, count: 0 };
    }
    return { date, count: Math.floor(parsed.count) };
  } catch {
    return { date, count: 0 };
  }
}

function incrementDailyUsage() {
  const usage = readDailyUsage();
  const next = { date: usage.date, count: Math.min(DAILY_LIMIT, usage.count + 1) };
  try {
    localStorage.setItem(DAILY_USAGE_KEY, JSON.stringify(next));
  } catch {
    // The in-memory state remains authoritative for this session if storage is unavailable.
  }
  return next.count;
}

export function useAICoach() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const [dailyCount, setDailyCount] = useState(() => readDailyUsage().count);
  const [cooldownUntil, setCooldownUntil] = useState(0);
  const recentSendTimesRef = useRef<number[]>([]);
  const cooldownTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inMemoryDailyCountRef = useRef(dailyCount);

  useEffect(() => {
    let cancelled = false;

    const loadHistory = async () => {
      try {
        const stored = await db.coachHistory.orderBy('timestamp').toArray();
        if (cancelled) return;

        if (stored.length > 0) {
          setMessages(stored.slice(-ACTIVE_HISTORY_LIMIT));
        } else {
          const welcome = createWelcomeMessage();
          await db.coachHistory.put(welcome);
          if (!cancelled) setMessages([welcome]);
        }
      } catch {
        if (!cancelled) setMessages([createWelcomeMessage()]);
      } finally {
        if (!cancelled) setIsReady(true);
      }
    };

    void loadHistory();
    return () => {
      cancelled = true;
      if (cooldownTimerRef.current) clearTimeout(cooldownTimerRef.current);
    };
  }, []);

  useEffect(() => {
    inMemoryDailyCountRef.current = dailyCount;
  }, [dailyCount]);

  const addMessage = useCallback(async (message: ChatMessage) => {
    await db.coachHistory.put(message);
    setMessages((previous) => [...previous, message].slice(-ACTIVE_HISTORY_LIMIT));
  }, []);

  const clearHistory = useCallback(async () => {
    if (isLoading) return;
    const confirmed = window.confirm('Effacer toute la conversation du Trading Coach ? Cette action est irréversible.');
    if (!confirmed) return;

    await db.coachHistory.clear();
    const welcome = createWelcomeMessage();
    await db.coachHistory.put(welcome);
    setMessages([welcome]);
  }, [isLoading]);

  const sendMessage = useCallback(
    async (userText: string) => {
      const trimmed = userText.trim();
      if (!trimmed || isLoading || !isReady) return;

      const now = Date.now();
      const usage = readDailyUsage();
      if (usage.count >= DAILY_LIMIT || inMemoryDailyCountRef.current >= DAILY_LIMIT) {
        setDailyCount(DAILY_LIMIT);
        const limitMessage = createMessage('model', '⚠️ **Limite quotidienne de messages atteinte, réessaie demain**', true);
        await addMessage(limitMessage);
        return;
      }

      if (cooldownUntil > now) {
        const cooldownMessage = createMessage('model', '⚠️ **Trop de messages envoyés rapidement, patiente un instant**', true);
        await addMessage(cooldownMessage);
        return;
      }

      const recent = recentSendTimesRef.current.filter((time) => now - time < BURST_WINDOW_MS);
      if (recent.length >= BURST_LIMIT) {
        const until = now + BURST_COOLDOWN_MS;
        recentSendTimesRef.current = recent;
        setCooldownUntil(until);
        if (cooldownTimerRef.current) clearTimeout(cooldownTimerRef.current);
        cooldownTimerRef.current = setTimeout(() => setCooldownUntil(0), BURST_COOLDOWN_MS);
        const burstMessage = createMessage('model', '⚠️ **Trop de messages envoyés rapidement, patiente un instant**', true);
        await addMessage(burstMessage);
        return;
      }

      recentSendTimesRef.current = [...recent, now];
      const userMessage = createMessage('user', trimmed);
      const historyForRequest = messages
        .filter((message) => !message.isError)
        .map((message) => ({ role: message.role, text: message.text }));

      await addMessage(userMessage);
      setIsLoading(true);

      const nextCount = incrementDailyUsage();
      setDailyCount(nextCount);

      try {
        const response = await fetch('/api/coach', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            message: trimmed,
            history: [...historyForRequest, { role: 'user', text: trimmed }],
          }),
        });

        const data = await response.json().catch(() => ({}));

        if (!response.ok) {
          const detail = typeof data?.error === 'string' ? data.error : 'Le relais Gemini est momentanément indisponible.';
          await addMessage(createMessage('model', `⚠️ **Impossible d'obtenir une réponse du coach.**\n\n${detail}\n\nVérifiez la configuration du relais /api/coach puis réessayez.`, true));
          return;
        }

        const reply = typeof data?.reply === 'string' && data.reply.trim()
          ? data.reply.trim()
          : 'Le coach n’a pas renvoyé de réponse. Veuillez réessayer.';

        await addMessage(createMessage('model', reply));
      } catch {
        await addMessage(createMessage('model', '⚠️ **Connexion au coach impossible.**\n\nLe relais /api/coach n’est pas accessible pour le moment. Vérifiez votre connexion ou la configuration du déploiement, puis réessayez.', true));
      } finally {
        setIsLoading(false);
      }
    },
    [addMessage, cooldownUntil, isLoading, isReady, messages]
  );

  return {
    messages,
    isLoading,
    isReady,
    sendMessage,
    clearHistory,
    dailyCount,
    dailyLimit: DAILY_LIMIT,
    cooldownUntil,
  };
}
