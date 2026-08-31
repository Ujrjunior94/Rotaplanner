import React, { useState, useEffect } from 'react';
import { useDriver } from '../context/DriverContext';
import { formatTimer, calcDailyFuelAdvisor } from '../utils/calc';
import { Play, Square, Plus, Bell, Car, Sparkles, Moon, Sun, Fuel, Mic } from 'lucide-react';

interface NavbarProps {
  onOpenShiftModal: () => void;
  onOpenQuickModal: () => void;
  onOpenAlertsModal: () => void;
  onOpenFuelAdvisorModal?: () => void;
  onOpenVoiceModal?: () => void;
  onOpenDriverMode?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  onOpenShiftModal,
  onOpenQuickModal,
  onOpenAlertsModal,
  onOpenFuelAdvisorModal = () => {},
  onOpenVoiceModal = () => {},
  onOpenDriverMode = () => {},
}) => {
  const { activeSession, alerts, isDemoData, profile, vehicle, fuelRecords, plannerEvents } = useDriver();
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  // Status rápido de combustível
  const todayStr = new Date().toISOString().split('T')[0];
  const todayEvent = plannerEvents.find(e => e.date === todayStr);
  const isOffDay = todayEvent?.type === 'off';
  const fuelAdvisor = calcDailyFuelAdvisor(
    vehicle,
    fuelRecords,
    isOffDay ? 0 : 120,
    isOffDay,
    null,
    profile.gasPriceReference || 5.89
  );

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (activeSession) {
      const updateTimer = () => {
        const start = new Date(activeSession.startTime).getTime();
        const now = Date.now();
        setElapsedSeconds(Math.max(0, Math.floor((now - start) / 1000)));
      };
      updateTimer();
      timer = setInterval(updateTimer, 1000);
    } else {
      setElapsedSeconds(0);
    }
    return () => clearInterval(timer);
  }, [activeSession]);

  const unreadAlertsCount = alerts.filter(a => !a.read).length;

  return (
    <header className="sticky top-0 z-30 backdrop-blur-md bg-white/5 border-b border-white/10 px-4 sm:px-6 py-3.5 shrink-0 transition-colors">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-2">
        {/* LOGO & TITLE */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-emerald-500 to-teal-400 flex items-center justify-center font-black text-slate-950 text-xl shadow-lg shadow-emerald-500/20 shrink-0">
            DP
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base sm:text-lg font-black tracking-tight text-white leading-none">
                DRIVER PLANNER
              </h1>
              {isDemoData && (
                <span className="text-[10px] bg-amber-500/20 text-amber-300 font-bold px-2 py-0.5 rounded-full border border-amber-500/30 flex items-center gap-1">
                  <Sparkles className="w-2.5 h-2.5" /> DEMO
                </span>
              )}
            </div>
            <p className="text-[11px] text-slate-400 hidden sm:block mt-0.5">
              Seu painel pessoal para dirigir, planejar e lucrar.
            </p>
          </div>
        </div>

        {/* TOP CONTROLS & ACTIONS */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* DRIVER VOICE QUICK BUTTON */}
          <button
            onClick={onOpenVoiceModal}
            className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-emerald-500/20 to-teal-500/20 hover:from-emerald-500/30 hover:to-teal-500/30 border border-emerald-500/40 text-emerald-300 flex items-center gap-1.5 transition text-xs font-black shadow-md shadow-emerald-500/10 group active:scale-95"
            title="Driver Voice: Comandos de Voz Naturais"
          >
            <Mic className="w-3.5 h-3.5 text-emerald-400 group-hover:scale-110 transition-transform" />
            <span className="hidden sm:inline">VOICE</span>
          </button>

          {/* DRIVER MODE BUTTON */}
          <button
            onClick={onOpenDriverMode}
            className="px-2.5 py-1.5 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-amber-300 flex items-center gap-1.5 transition text-xs font-bold"
            title="Modo Motorista: Cockpit seguro com comandos de voz"
          >
            <Car className="w-3.5 h-3.5 text-amber-400" />
            <span className="hidden md:inline">Cockpit</span>
          </button>

          {/* FUEL ADVISOR QUICK BUTTON */}
          <button
            onClick={onOpenFuelAdvisorModal}
            className={`relative px-2.5 py-1.5 rounded-xl border flex items-center gap-1.5 transition text-xs font-bold ${
              fuelAdvisor.status === 'MUST_REFUEL'
                ? 'bg-rose-500/20 border-rose-500/40 text-rose-300 animate-pulse'
                : fuelAdvisor.status === 'STRATEGIC'
                ? 'bg-amber-500/20 border-amber-500/40 text-amber-300'
                : 'bg-white/5 hover:bg-white/10 border-white/10 text-slate-300'
            }`}
            title={`Consultor de Combustível: ${fuelAdvisor.title}`}
          >
            <Fuel className="w-3.5 h-3.5" />
            <span className="hidden sm:inline font-mono">{fuelAdvisor.currentTankPct}%</span>
          </button>

          {/* ALERTS BELL */}
          <button
            onClick={onOpenAlertsModal}
            className="relative w-9 h-9 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 flex items-center justify-center text-slate-300 transition"
            title="Alertas & Notificações"
          >
            <Bell className="w-4 h-4" />
            {unreadAlertsCount > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-rose-500 text-white text-[9px] font-black flex items-center justify-center animate-pulse">
                {unreadAlertsCount}
              </span>
            )}
          </button>

          {/* ACTIVE SHIFT STATUS OR START SHIFT BUTTON */}
          {activeSession ? (
            <button
              onClick={onOpenShiftModal}
              className="flex items-center gap-2 bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/40 text-emerald-300 px-3.5 py-1.5 rounded-xl text-xs font-bold transition shadow-lg shadow-emerald-500/10 animate-pulse"
            >
              <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
              <span className="hidden sm:inline">EM ROTA:</span>
              <span className="font-mono text-emerald-200">{formatTimer(elapsedSeconds)}</span>
              <Square className="w-3 h-3 ml-1 fill-emerald-400 text-emerald-400" />
            </button>
          ) : (
            <button
              onClick={onOpenShiftModal}
              className="flex items-center gap-1.5 bg-gradient-to-r from-emerald-500 to-teal-400 hover:from-emerald-400 hover:to-teal-300 text-slate-950 font-black px-3.5 py-1.5 rounded-xl text-xs transition shadow-lg shadow-emerald-500/25 active:scale-95"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>INICIAR TRABALHO</span>
            </button>
          )}

          {/* QUICK ADD BUTTON */}
          <button
            onClick={onOpenQuickModal}
            className="flex items-center gap-1.5 bg-white/10 hover:bg-white/15 text-emerald-400 font-bold px-3 py-1.5 rounded-xl text-xs border border-white/10 transition active:scale-95"
            title="Lançamento Rápido"
          >
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">LANÇAR</span>
          </button>
        </div>
      </div>
    </header>
  );
};
