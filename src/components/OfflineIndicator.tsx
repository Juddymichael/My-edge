import { CloudOff } from 'lucide-react';
import { useEffect, useState } from 'react';

export function OfflineIndicator() {
  const [offline, setOffline] = useState(() =>
    typeof navigator !== 'undefined' ? !navigator.onLine : false,
  );

  useEffect(() => {
    const goOffline = () => setOffline(true);
    const goOnline = () => setOffline(false);
    window.addEventListener('offline', goOffline);
    window.addEventListener('online', goOnline);
    return () => {
      window.removeEventListener('offline', goOffline);
      window.removeEventListener('online', goOnline);
    };
  }, []);

  if (!offline) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed left-1/2 top-2 z-[200] flex -translate-x-1/2 items-center gap-1.5 rounded-full border border-amber-200 bg-amber-50/95 px-3 py-1.5 text-[11px] font-bold text-amber-800 shadow-sm backdrop-blur dark:border-amber-900 dark:bg-amber-950/95 dark:text-amber-200"
    >
      <CloudOff className="h-3.5 w-3.5 shrink-0" />
      <span>Hors ligne · données locales disponibles</span>
    </div>
  );
}
