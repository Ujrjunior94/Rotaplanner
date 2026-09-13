import React from 'react';
import { Home, Calendar, PlusCircle, Fuel, Menu, Activity } from 'lucide-react';
import { useDriver } from '../context/DriverContext';

export type MainTabType = 'dashboard' | 'planner' | 'fuel' | 'analyzer' | 'vehicle' | 'goals' | 'reports' | 'insights' | 'settings';

interface BottomNavProps {
  activeTab: MainTabType;
  onSelectTab: (tab: MainTabType) => void;
  onOpenQuickModal: () => void;
  onOpenMoreMenu: () => void;
}

export const BottomNav: React.FC<BottomNavProps> = ({
  activeTab,
  onSelectTab,
  onOpenQuickModal,
  onOpenMoreMenu,
}) => {
  const { activeSession } = useDriver();

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-slate-950/95 backdrop-blur-xl border-t border-slate-800/80 px-2 py-1 flex justify-around items-center">
      {/* 1. PLANNER (ESCALAS & ROTAS) */}
      <button
        type="button"
        onClick={() => onSelectTab('planner')}
        className={`flex flex-col items-center gap-0.5 py-1 px-2.5 rounded-xl transition min-w-[52px] min-h-[48px] justify-center active:scale-95 ${
          activeTab === 'planner' ? 'text-emerald-400 font-black' : 'text-slate-400 hover:text-slate-200'
        }`}
      >
        <Calendar className="w-5 h-5" />
        <span className="text-[10px]">Planner</span>
      </button>

      {/* 2. TANQUE (COMBUSTÍVEL SANDERO) */}
      <button
        type="button"
        onClick={() => onSelectTab('fuel')}
        className={`flex flex-col items-center gap-0.5 py-1 px-2.5 rounded-xl transition min-w-[52px] min-h-[48px] justify-center active:scale-95 ${
          activeTab === 'fuel' ? 'text-amber-400 font-black' : 'text-slate-400 hover:text-slate-200'
        }`}
      >
        <Fuel className="w-5 h-5" />
        <span className="text-[10px]">Tanque</span>
      </button>

      {/* 3. INÍCIO / COCKPIT (DESTAQUE CENTRAL ERGONÔMICO - PRINCIPAL AÇÃO OPERACIONAL) */}
      <button
        type="button"
        onClick={() => onSelectTab('dashboard')}
        className="flex flex-col items-center -mt-5 group active:scale-95 transition"
        title="Cockpit Operacional (Início)"
      >
        <div
          className={`w-13 h-13 rounded-2xl flex items-center justify-center transition shadow-lg relative ${
            activeTab === 'dashboard'
              ? 'bg-emerald-500 text-slate-950 shadow-emerald-500/30 scale-105 ring-2 ring-emerald-400/50'
              : 'bg-slate-900 border border-slate-700 text-emerald-400 shadow-black/60 group-hover:border-emerald-500/40'
          }`}
        >
          <Home className="w-6 h-6 stroke-[2.3]" />

          {/* Indicador de Turno Ativo ao Vivo no Botão Central */}
          {activeSession && (
            <span className="absolute -top-1 -right-1 flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500 border border-slate-950"></span>
            </span>
          )}
        </div>
        <span
          className={`text-[10px] mt-1 tracking-tight ${
            activeTab === 'dashboard' ? 'font-black text-emerald-400' : 'font-semibold text-slate-400'
          }`}
        >
          Início
        </span>
      </button>

      {/* 4. LANÇAR (REGISTRO RÁPIDO OPERACIONAL) */}
      <button
        type="button"
        onClick={onOpenQuickModal}
        className="flex flex-col items-center gap-0.5 py-1 px-2.5 rounded-xl transition min-w-[52px] min-h-[48px] justify-center active:scale-95 text-slate-400 hover:text-emerald-300"
        title="Lançamento Rápido (Ganho, Abastecimento, Despesa)"
      >
        <PlusCircle className="w-5 h-5 text-emerald-400" />
        <span className="text-[10px]">Lançar</span>
      </button>

      {/* 5. MAIS (MENU CONSOLIDADO DE BAIXA FREQUÊNCIA) */}
      <button
        type="button"
        onClick={onOpenMoreMenu}
        className={`flex flex-col items-center gap-0.5 py-1 px-2.5 rounded-xl transition min-w-[52px] min-h-[48px] justify-center active:scale-95 ${
          ['analyzer', 'vehicle', 'goals', 'reports', 'insights', 'settings'].includes(activeTab)
            ? 'text-emerald-400 font-black'
            : 'text-slate-400 hover:text-slate-200'
        }`}
      >
        <Menu className="w-5 h-5" />
        <span className="text-[10px]">Mais</span>
      </button>
    </nav>
  );
};
