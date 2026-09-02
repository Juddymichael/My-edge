import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { CheckCircle2, AlertCircle, Info, X, Sparkles } from 'lucide-react';

export interface ToastItem {
  id: string;
  type: 'success' | 'error' | 'info';
  title?: string;
  message: string;
  duration?: number;
}

interface ToastNotificationProps {
  notification?: { type: 'success' | 'error' | 'info'; message: string; title?: string } | null;
  onClose?: () => void;
  toasts?: ToastItem[];
  onDismiss?: (id: string) => void;
}

export const ToastNotification: React.FC<ToastNotificationProps> = ({
  notification,
  onClose,
  toasts = [],
  onDismiss,
}) => {
  // If single notification prop is passed, wrap it as a toast
  const activeToasts: ToastItem[] = [
    ...(toasts || []),
    ...(notification
      ? [
          {
            id: 'single-notification',
            type: notification.type,
            title: notification.title,
            message: notification.message,
            duration: 4000,
          },
        ]
      : []),
  ];

  const handleDismiss = (id: string) => {
    if (id === 'single-notification') {
      if (onClose) onClose();
    } else if (onDismiss) {
      onDismiss(id);
    }
  };

  return (
    <div
      aria-live="polite"
      id="thunder-edge-toast-container"
      className="fixed bottom-6 right-6 z-50 flex flex-col gap-2.5 max-w-sm w-full pointer-events-none"
    >
      <AnimatePresence>
        {activeToasts.map((toast) => (
          <ToastCard key={toast.id} toast={toast} onDismiss={() => handleDismiss(toast.id)} />
        ))}
      </AnimatePresence>
    </div>
  );
};

const ToastCard: React.FC<{ toast: ToastItem; onDismiss: () => void }> = ({ toast, onDismiss }) => {
  const duration = toast.duration || 4500;
  const [progress, setProgress] = useState(100);

  useEffect(() => {
    const startTime = Date.now();
    const interval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const remaining = Math.max(0, 100 - (elapsed / duration) * 100);
      setProgress(remaining);
      if (remaining <= 0) {
        clearInterval(interval);
      }
    }, 50);

    return () => clearInterval(interval);
  }, [duration]);

  const isSuccess = toast.type === 'success';
  const isError = toast.type === 'error';

  return (
    <motion.div
      initial={{ opacity: 0, y: 20, x: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, x: 0, scale: 1 }}
      exit={{ opacity: 0, x: 30, scale: 0.95 }}
      transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
      className={`pointer-events-auto relative overflow-hidden rounded-2xl p-4 shadow-xl backdrop-blur-md border transition-all duration-200 ${
        isSuccess
          ? 'bg-white/95 dark:bg-[#12151D]/95 border-emerald-500/30 text-slate-900 dark:text-[#F5F5F5] shadow-emerald-500/10'
          : isError
          ? 'bg-white/95 dark:bg-[#12151D]/95 border-rose-500/30 text-slate-900 dark:text-[#F5F5F5] shadow-rose-500/10'
          : 'bg-white/95 dark:bg-[#12151D]/95 border-orange-500/30 text-slate-900 dark:text-[#F5F5F5] shadow-orange-500/10'
      }`}
    >
      <div className="flex items-start gap-3">
        <div
          className={`p-2 rounded-xl shrink-0 ${
            isSuccess
              ? 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
              : isError
              ? 'bg-rose-50 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400'
              : 'bg-orange-50 dark:bg-[#F97316]/10 text-[#F97316]'
          }`}
        >
          {isSuccess ? (
            <CheckCircle2 className="w-5 h-5" />
          ) : isError ? (
            <AlertCircle className="w-5 h-5" />
          ) : (
            <Sparkles className="w-5 h-5" />
          )}
        </div>

        <div className="flex-1 min-w-0 pr-2">
          {toast.title && (
            <h4 className="text-xs font-bold text-slate-900 dark:text-white tracking-tight mb-0.5">
              {toast.title}
            </h4>
          )}
          <p className="text-xs font-medium text-slate-600 dark:text-[#9299A8] leading-relaxed">
            {toast.message}
          </p>
        </div>

        <button
          onClick={onDismiss}
          className="text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300 p-1 rounded-lg transition-colors cursor-pointer"
          aria-label="Fermer la notification"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Progress countdown bar */}
      <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-slate-100 dark:bg-[#181C25]">
        <div
          className={`h-full transition-all duration-100 ease-linear ${
            isSuccess
              ? 'bg-emerald-500'
              : isError
              ? 'bg-rose-500'
              : 'bg-[#F97316]'
          }`}
          style={{ width: `${progress}%` }}
        />
      </div>
    </motion.div>
  );
};
