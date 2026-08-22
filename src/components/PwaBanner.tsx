import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Download, RefreshCw, WifiOff, X, Share, PlusSquare, Smartphone } from 'lucide-react';
import { usePwa } from '../hooks/usePwa';

interface PwaBannerProps {
  isLight?: boolean;
}

export const PwaBanner: React.FC<PwaBannerProps> = ({ isLight = false }) => {
  const {
    isInstallPromptAvailable,
    isOffline,
    needRefresh,
    showIosPrompt,
    setShowIosPrompt,
    installApp,
    updateServiceWorker,
  } = usePwa();

  return (
    <>
      <AnimatePresence>
        {needRefresh && (
          <motion.div
            initial={{ scale: 0.9, opacity: 0, y: -20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: -20 }}
            transition={{ type: 'spring', stiffness: 350, damping: 28 }}
            className="fixed top-3 left-1/2 -translate-x-1/2 z-50 w-11/12 max-w-md p-3 rounded-2xl text-white shadow-2xl flex items-center justify-between gap-3 border border-white/20 bg-gradient-to-r from-violet-600 via-purple-700 to-indigo-800"
          >
            <div className="flex items-center gap-2.5">
              <RefreshCw className="w-4 h-4 animate-spin" />
              <div>
                <p className="font-bold text-xs">Mise à jour disponible</p>
                <p className="text-[11px] text-purple-100">Nouvelle version prête.</p>
              </div>
            </div>
            <motion.button
              whileHover={{ scale: 1.02, y: -1 }}
              whileTap={{ scale: 0.96 }}
              transition={{ type: 'spring', stiffness: 400, damping: 25 }}
              onClick={updateServiceWorker}
              className="py-1.5 px-3 font-bold text-xs rounded-xl shadow-md transition-all cursor-pointer whitespace-nowrap bg-white text-purple-900 hover:bg-purple-50"
            >
              Mettre à jour
            </motion.button>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isOffline && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="fixed top-3 right-4 z-40 px-3 py-1.5 rounded-xl bg-amber-500/90 text-slate-950 font-bold text-xs flex items-center gap-2 shadow-lg backdrop-blur-xs"
          >
            <WifiOff className="w-3.5 h-3.5 stroke-[2.5]" />
            <span>Mode Hors-ligne</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Only show the floating CTA when the browser exposes a native install prompt.
          The Settings page always exposes the install action as a reliable fallback. */}
      <AnimatePresence>
        {isInstallPromptAvailable && (
          <motion.div
            initial={{ scale: 0.8, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.8, opacity: 0, y: 20 }}
            transition={{ type: 'spring', stiffness: 400, damping: 25 }}
            className="fixed bottom-20 md:bottom-6 right-4 z-40"
          >
            <motion.button
              whileHover={{ scale: 1.02, y: -1 }}
              whileTap={{ scale: 0.96 }}
              transition={{ type: 'spring', stiffness: 400, damping: 25 }}
              onClick={installApp}
              className="py-2.5 px-4 rounded-2xl font-black text-xs shadow-md shadow-orange-500/30 border border-amber-200/40 flex items-center gap-2 cursor-pointer bg-gradient-to-r from-amber-400 via-orange-500 to-amber-500 text-white"
              title="Installer TradeStudio PWA"
            >
              <Download className="w-4 h-4 stroke-[2.5]" />
              <span>Installer TradeStudio</span>
            </motion.button>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showIosPrompt && (
          <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-purple-950/40 backdrop-blur-md">
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 8 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 8 }}
              transition={{ type: 'spring', stiffness: 350, damping: 28 }}
              className={`w-full max-w-md rounded-3xl p-5 space-y-3 shadow-2xl border ${
                isLight ? 'bg-white border-purple-200/90 text-slate-900' : 'bg-[#151622] border-purple-900/50 text-slate-100'
              }`}
            >
              <div className={`flex items-center justify-between border-b pb-2.5 ${isLight ? 'border-purple-200/80' : 'border-purple-900/40'}`}>
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center bg-gradient-to-br from-violet-600 to-indigo-800 text-white">
                    <Smartphone className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="font-bold text-sm">Installer TradeStudio</h3>
                    <p className="text-xs text-slate-400">Ajouter l'application à votre appareil</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowIosPrompt(false)}
                  className="w-7 h-7 rounded-lg border border-purple-300/40 text-slate-400 hover:text-slate-100 flex items-center justify-center cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-2 text-xs leading-relaxed">
                <div className="flex items-start gap-2.5 p-2.5 rounded-xl bg-purple-500/10">
                  <span className="w-5 h-5 rounded-full font-bold flex items-center justify-center text-[10px] shrink-0 bg-violet-600 text-white">1</span>
                  <p>Sur iPhone/iPad : appuyez sur <strong>Partager</strong> <Share className="w-3.5 h-3.5 inline mx-1 text-sky-400" /> dans Safari.</p>
                </div>
                <div className="flex items-start gap-2.5 p-2.5 rounded-xl bg-purple-500/10">
                  <span className="w-5 h-5 rounded-full font-bold flex items-center justify-center text-[10px] shrink-0 bg-violet-600 text-white">2</span>
                  <p>Sélectionnez <strong>Sur l'écran d'accueil</strong> <PlusSquare className="w-3.5 h-3.5 inline mx-1 text-emerald-400" />.</p>
                </div>
                <div className="flex items-start gap-2.5 p-2.5 rounded-xl bg-purple-500/10">
                  <span className="w-5 h-5 rounded-full font-bold flex items-center justify-center text-[10px] shrink-0 bg-violet-600 text-white">3</span>
                  <p>Confirmez en appuyant sur <strong>Ajouter</strong>.</p>
                </div>
              </div>

              <motion.button
                whileHover={{ scale: 1.02, y: -1 }}
                whileTap={{ scale: 0.96 }}
                transition={{ type: 'spring', stiffness: 400, damping: 25 }}
                onClick={() => setShowIosPrompt(false)}
                className="w-full py-2.5 text-white font-bold text-xs rounded-xl transition-all cursor-pointer bg-gradient-to-r from-violet-600 via-purple-700 to-indigo-800 shadow-md shadow-purple-500/25"
              >
                J'ai compris
              </motion.button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
};
