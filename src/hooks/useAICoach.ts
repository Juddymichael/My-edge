import { useCallback, useState } from 'react';

export interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  text: string;
  timestamp: string;
  isError?: boolean;
}

const createMessage = (role: ChatMessage['role'], text: string, isError = false): ChatMessage => ({
  id: `${role}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
  role,
  text,
  timestamp: new Date().toISOString(),
  ...(isError ? { isError: true } : {}),
});

const WELCOME_MESSAGE: ChatMessage = {
  id: 'welcome-msg',
  role: 'model',
  text: `Bonjour 👋 Je suis votre **Trading Coach**.\n\nJe peux discuter avec vous de trading, de stratégie, de discipline, de psychologie et de gestion du risque. Posez-moi vos questions comme dans une conversation normale et je vous répondrai directement.\n\nPour cette première version, cette conversation reste générale : je ne consulte pas encore vos données de trading personnelles.`,
  timestamp: new Date().toISOString(),
};

export function useAICoach() {
  const [messages, setMessages] = useState<ChatMessage[]>([WELCOME_MESSAGE]);
  const [isLoading, setIsLoading] = useState(false);

  const clearHistory = useCallback(() => {
    setMessages([{ ...WELCOME_MESSAGE, id: `welcome-${Date.now()}`, timestamp: new Date().toISOString() }]);
  }, []);

  const sendMessage = useCallback(
    async (userText: string) => {
      const trimmed = userText.trim();
      if (!trimmed || isLoading) return;

      const userMessage = createMessage('user', trimmed);
      const historyForRequest = messages
        .filter((message) => !message.isError)
        .map((message) => ({ role: message.role, text: message.text }));

      setMessages((previous) => [...previous, userMessage]);
      setIsLoading(true);

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
          setMessages((previous) => [
            ...previous,
            createMessage('model', `⚠️ **Impossible d'obtenir une réponse du coach.**\n\n${detail}\n\nVérifiez la configuration du relais /api/coach puis réessayez.`, true),
          ]);
          return;
        }

        const reply = typeof data?.reply === 'string' && data.reply.trim()
          ? data.reply.trim()
          : 'Le coach n’a pas renvoyé de réponse. Veuillez réessayer.';

        setMessages((previous) => [...previous, createMessage('model', reply)]);
      } catch {
        setMessages((previous) => [
          ...previous,
          createMessage('model', `⚠️ **Connexion au coach impossible.**\n\nLe relais /api/coach n’est pas accessible pour le moment. Vérifiez votre connexion ou la configuration du déploiement, puis réessayez.`, true),
        ]);
      } finally {
        setIsLoading(false);
      }
    },
    [isLoading, messages]
  );

  return { messages, isLoading, sendMessage, clearHistory };
}
