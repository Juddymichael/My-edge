import { useState, useEffect } from 'react';

export interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

export function usePwa() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstallPromptAvailable, setIsInstallPromptAvailable] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const [needRefresh, setNeedRefresh] = useState(false);
  const [swRegistration, setSwRegistration] = useState<ServiceWorkerRegistration | null>(null);
  const [isIos, setIsIos] = useState(false);
  const [showIosPrompt, setShowIosPrompt] = useState(false);

  useEffect(() => {
    const checkStandalone = () => {
      const mediaStandalone = window.matchMedia('(display-mode: standalone)').matches;
      const iosStandalone = (navigator as any).standalone === true;
      return mediaStandalone || iosStandalone;
    };

    setIsStandalone(checkStandalone());

    const userAgent = window.navigator.userAgent.toLowerCase();
    setIsIos(/iphone|ipad|ipod/.test(userAgent));

    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setIsInstallPromptAvailable(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    const handleAppInstalled = () => {
      setIsInstallPromptAvailable(false);
      setIsStandalone(true);
      setDeferredPrompt(null);
    };
    window.addEventListener('appinstalled', handleAppInstalled);

    if ('serviceWorker' in navigator) {
      navigator.serviceWorker
        .register('/sw.js')
        .then((reg) => {
          setSwRegistration(reg);
          if (reg.waiting) setNeedRefresh(true);
          reg.addEventListener('updatefound', () => {
            const newWorker = reg.installing;
            if (newWorker) {
              newWorker.addEventListener('statechange', () => {
                if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                  setNeedRefresh(true);
                }
              });
            }
          });
        })
        .catch((err) => console.warn('PWA Service Worker registration failed:', err));

      let refreshing = false;
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        if (!refreshing) {
          refreshing = true;
          window.location.reload();
        }
      });
    }

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const installApp = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const choice = await deferredPrompt.userChoice;
      if (choice.outcome === 'accepted') {
        setIsInstallPromptAvailable(false);
        setIsStandalone(true);
      }
      setDeferredPrompt(null);
      return;
    }

    // iOS does not expose beforeinstallprompt: show the manual Add to Home Screen guide.
    if (isIos && !isStandalone) {
      setShowIosPrompt(true);
      return;
    }

    // Some Android/desktop browsers delay or suppress beforeinstallprompt. Keep an
    // installation action visible and give the user a reliable manual path instead
    // of silently doing nothing.
    if (!isStandalone) {
      window.alert(
        'Installation de TradeStudio\n\n' +
        'Chrome / Edge : ouvrez le menu du navigateur puis choisissez « Installer TradeStudio » ou « Installer cette application ».\n\n' +
        'Si cette option n’apparaît pas encore, rechargez l’application après l’avoir utilisée quelques secondes avec Internet.'
      );
    }
  };

  const updateServiceWorker = () => {
    if (swRegistration?.waiting) {
      swRegistration.waiting.postMessage({ type: 'SKIP_WAITING' });
    } else {
      window.location.reload();
    }
  };

  return {
    // Keep the Settings installation action visible whenever the app is not installed.
    // The floating banner still uses isPromptAvailable so it does not become intrusive.
    isInstallable: !isStandalone,
    isInstallPromptAvailable,
    isStandalone,
    isOffline,
    needRefresh,
    showIosPrompt,
    setShowIosPrompt,
    installApp,
    updateServiceWorker,
  };
}
