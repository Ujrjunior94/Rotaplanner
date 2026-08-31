import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { usePWA } from '../hooks/usePWA';
import {
  Download,
  Smartphone,
  Share,
  PlusSquare,
  CheckCircle,
  WifiOff,
  RefreshCw,
  X,
  Sparkles,
} from 'lucide-react';

export const PWAInstallBanner: React.FC = () => {
  const {
    isInstallable,
    isInstalled,
    isOnline,
    isUpdateAvailable,
    isIOS,
    promptInstall,
    updateServiceWorker,
  } = usePWA();

  const [dismissed, setDismissed] = useState(false);
  const [showIosGuide, setShowIosGuide] = useState(false);

  const handleInstallClick = async () => {
    if (isIOS) {
      setShowIosGuide(true);
      return;
    }
    const success = await promptInstall();
    if (!success && !isInstallable) {
      setShowIosGuide(true);
    }
  };

  return (
    <>
      {/* OFFLINE STATUS PILL */}
      <AnimatePresence>
        {!isOnline && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed top-3 left-1/2 -translate-x-1/2 z-50 bg-amber-500/95 text-slate-950 px-4 py-1.5 rounded-full font-bold text-xs shadow-xl flex items-center gap-2 border border-amber-300"
          >
            <WifiOff className="w-4 h-4 animate-pulse" />
            <span>Modo Offline: o Driver Planner continua funcionando normalmente!</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* UPDATE AVAILABLE BANNER */}
      <AnimatePresence>
        {isUpdateAvailable && (
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 30 }}
            className="fixed bottom-20 sm:bottom-6 left-1/2 -translate-x-1/2 z-50 bg-emerald-600 text-white px-5 py-3 rounded-2xl font-bold text-xs sm:text-sm shadow-2xl flex items-center gap-3 border border-emerald-400 max-w-md w-[92%]"
          >
            <RefreshCw className="w-5 h-5 animate-spin shrink-0 text-emerald-200" />
            <div className="flex-1">
              <div className="text-white font-black">Nova versão disponível!</div>
              <div className="text-emerald-100 text-[11px]">Atualize para carregar as últimas melhorias.</div>
            </div>
            <button
              onClick={updateServiceWorker}
              className="bg-white text-slate-950 font-black px-3.5 py-1.5 rounded-xl hover:bg-emerald-50 transition shrink-0"
            >
              Atualizar
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* PWA INSTALL BANNER / FLOATING PROMPT (Shows if not installed and not dismissed) */}
      <AnimatePresence>
        {!isInstalled && !dismissed && (isInstallable || isIOS) && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="fixed bottom-20 sm:bottom-6 right-4 sm:right-6 z-40 bg-slate-900/95 backdrop-blur-xl border border-emerald-500/30 p-4 rounded-2xl shadow-2xl max-w-sm w-[90%] sm:w-auto text-slate-100"
          >
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-emerald-500 to-teal-400 flex items-center justify-center text-slate-950 shrink-0 shadow-md shadow-emerald-500/20">
                  <Smartphone className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-xs font-black text-white flex items-center gap-1.5">
                    <span>Instalar App no Celular</span>
                    <span className="bg-emerald-500/20 text-emerald-300 text-[9px] px-1.5 py-0.5 rounded-full font-mono">
                      PWA
                    </span>
                  </h4>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Acesso rápido na tela inicial e funciona 100% offline.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setDismissed(true)}
                className="text-slate-500 hover:text-slate-300 p-1 rounded-lg transition"
                title="Fechar"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="mt-3 flex items-center gap-2">
              <button
                onClick={handleInstallClick}
                className="flex-1 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs py-2 px-3 rounded-xl flex items-center justify-center gap-1.5 transition shadow-lg shadow-emerald-500/20"
              >
                <Download className="w-3.5 h-3.5" />
                <span>{isIOS ? 'Como Instalar no iPhone' : 'Instalar Agora'}</span>
              </button>
              <button
                onClick={() => setDismissed(true)}
                className="text-slate-400 hover:text-white text-xs font-bold py-2 px-3 rounded-xl hover:bg-white/5 transition"
              >
                Depois
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* IOS INSTALLATION GUIDE MODAL */}
      <AnimatePresence>
        {showIosGuide && (
          <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-slate-900 border border-white/10 rounded-3xl p-6 max-w-sm w-full space-y-4 text-slate-100 shadow-2xl"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                    <Smartphone className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-black text-sm text-white">Instalar no iPhone / iPad</h3>
                    <p className="text-[11px] text-slate-400">Siga os 2 passos rápidos no Safari</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowIosGuide(false)}
                  className="text-slate-400 hover:text-white p-1 rounded-xl"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-3 bg-black/40 p-4 rounded-2xl border border-white/5 text-xs">
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-emerald-500 text-slate-950 font-black flex items-center justify-center text-xs shrink-0 mt-0.5">
                    1
                  </div>
                  <div>
                    <span className="font-bold text-white block">Toque em Compartilhar</span>
                    <span className="text-slate-400 text-[11px] flex items-center gap-1 mt-0.5">
                      No Safari, toque no ícone <Share className="w-3.5 h-3.5 text-sky-400 inline" /> na barra inferior do navegador.
                    </span>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-emerald-500 text-slate-950 font-black flex items-center justify-center text-xs shrink-0 mt-0.5">
                    2
                  </div>
                  <div>
                    <span className="font-bold text-white block">Adicionar à Tela de Início</span>
                    <span className="text-slate-400 text-[11px] flex items-center gap-1 mt-0.5">
                      Role para baixo e selecione <PlusSquare className="w-3.5 h-3.5 text-emerald-400 inline" /> "Adicionar à Tela de Início".
                    </span>
                  </div>
                </div>
              </div>

              <button
                onClick={() => setShowIosGuide(false)}
                className="w-full bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black py-2.5 rounded-xl text-xs transition"
              >
                Entendi, Pronto!
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
};
