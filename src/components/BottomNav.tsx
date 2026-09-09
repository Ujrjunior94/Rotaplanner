import React from 'react';
import { Home, Calendar, PlusCircle, BarChart3, Menu } from 'lucide-react';

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
  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-slate-950/90 backdrop-blur-xl border-t border-white/10 px-2 py-1.5 flex justify-around items-center">
      {/* 1. INÍCIO */}
      <button
        onClick={() => onSelectTab('dashboard')}
        className={`flex flex-col items-center gap-0.5 py-1 px-2.5 rounded-xl transition ${
          activeTab === 'dashboard' ? 'text-emerald-400 font-bold' : 'text-slate-400 hover:text-slate-200'
        }`}
      >
        <Home className="w-5 h-5" />
        <span className="text-[10px]">Início</span>
      </button>

      {/* 2. PLANNER */}
      <button
        onClick={() => onSelectTab('planner')}
        className={`flex flex-col items-center gap-0.5 py-1 px-2.5 rounded-xl transition ${
          activeTab === 'planner' ? 'text-emerald-400 font-bold' : 'text-slate-400 hover:text-slate-200'
        }`}
      >
        <Calendar className="w-5 h-5" />
        <span className="text-[10px]">Planner</span>
      </button>

      {/* 3. LANÇAR (DESTAQUE CENTRAL) */}
      <button
        onClick={onOpenQuickModal}
        className="flex flex-col items-center -mt-4 group active:scale-95 transition"
      >
        <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-emerald-500 to-teal-400 flex items-center justify-center text-slate-950 shadow-lg shadow-emerald-500/30 group-hover:scale-105 transition">
          <PlusCircle className="w-6 h-6 stroke-[2.5]" />
        </div>
        <span className="text-[10px] font-black text-emerald-400 mt-1">Lançar</span>
      </button>

      {/* 4. RELATÓRIOS */}
      <button
        onClick={() => onSelectTab('reports')}
        className={`flex flex-col items-center gap-0.5 py-1 px-2.5 rounded-xl transition ${
          activeTab === 'reports' ? 'text-emerald-400 font-bold' : 'text-slate-400 hover:text-slate-200'
        }`}
      >
        <BarChart3 className="w-5 h-5" />
        <span className="text-[10px]">Relatórios</span>
      </button>

      {/* 5. MAIS (MENU / DRAWER) */}
      <button
        onClick={onOpenMoreMenu}
        className={`flex flex-col items-center gap-0.5 py-1 px-2.5 rounded-xl transition ${
          ['fuel', 'analyzer', 'vehicle', 'goals', 'insights', 'settings'].includes(activeTab)
            ? 'text-emerald-400 font-bold'
            : 'text-slate-400 hover:text-slate-200'
        }`}
      >
        <Menu className="w-5 h-5" />
        <span className="text-[10px]">Mais</span>
      </button>
    </nav>
  );
};
