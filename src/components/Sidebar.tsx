import React from 'react';
import { MainTabType } from './BottomNav';
import {
  Home,
  Calendar,
  Calculator,
  Car,
  Target,
  BarChart3,
  Lightbulb,
  Settings,
  Sparkles,
  Mic,
  Fuel,
} from 'lucide-react';

interface SidebarProps {
  activeTab: MainTabType;
  onSelectTab: (tab: MainTabType) => void;
  onOpenVoiceModal?: () => void;
  onOpenDriverMode?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  onSelectTab,
  onOpenVoiceModal,
  onOpenDriverMode,
}) => {
  const menuItems: { id: MainTabType; label: string; icon: React.ElementType; badge?: string }[] = [
    { id: 'dashboard', label: 'Início', icon: Home },
    { id: 'planner', label: 'Planner & Escalas', icon: Calendar },
    { id: 'fuel', label: 'Tanque & Abastecimento', icon: Fuel, badge: 'Sandero' },
    { id: 'analyzer', label: 'Vale a Pena?', icon: Calculator, badge: 'Calculadora' },
    { id: 'vehicle', label: 'Custo do Carro', icon: Car },
    { id: 'goals', label: 'Metas & Progresso', icon: Target },
    { id: 'insights', label: 'Estratégias & Insights', icon: Lightbulb, badge: 'Playbook' },
    { id: 'reports', label: 'Relatórios & Gráficos', icon: BarChart3 },
    { id: 'settings', label: 'Configurações', icon: Settings },
  ];

  return (
    <aside className="hidden md:flex flex-col w-64 shrink-0 space-y-1.5 p-1">
      
      {/* DRIVER VOICE & MODO MOTORISTA ACTIONS */}
      <div className="space-y-1.5 mb-3">
        {onOpenVoiceModal && (
          <button
            type="button"
            onClick={onOpenVoiceModal}
            className="w-full flex items-center justify-between px-3.5 py-2.5 rounded-2xl bg-gradient-to-r from-emerald-500/20 to-teal-500/15 hover:from-emerald-500/30 hover:to-teal-500/25 text-emerald-300 border border-emerald-500/30 font-black text-sm shadow-md shadow-emerald-500/10 transition group"
          >
            <div className="flex items-center gap-2.5">
              <div className="w-6 h-6 rounded-lg bg-emerald-500 text-slate-950 flex items-center justify-center group-hover:scale-110 transition-transform">
                <Mic className="w-3.5 h-3.5 stroke-[2.5]" />
              </div>
              <span>DRIVER VOICE</span>
            </div>
            <span className="text-[9px] bg-emerald-500/30 text-emerald-200 px-1.5 py-0.5 rounded font-bold">
              VOZ
            </span>
          </button>
        )}

        {onOpenDriverMode && (
          <button
            type="button"
            onClick={onOpenDriverMode}
            className="w-full flex items-center justify-between px-3.5 py-2 rounded-2xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 font-bold text-xs transition"
          >
            <div className="flex items-center gap-2.5">
              <Car className="w-4 h-4 text-amber-400" />
              <span>Modo Motorista</span>
            </div>
            <span className="text-[9px] bg-amber-500/20 text-amber-300 px-1.5 py-0.5 rounded font-bold">
              COCKPIT
            </span>
          </button>
        )}
      </div>

      <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider px-3 mb-2">
        Navegação Principal
      </div>

      {menuItems.map(item => {
        const Icon = item.icon;
        const isActive = activeTab === item.id;

        return (
          <button
            key={item.id}
            onClick={() => onSelectTab(item.id)}
            className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-2xl font-semibold text-sm transition-all duration-200 ${
              isActive
                ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 shadow-sm shadow-emerald-500/10'
                : 'text-slate-400 hover:text-slate-100 hover:bg-white/5 border border-transparent'
            }`}
          >
            <div className="flex items-center gap-3">
              <Icon className={`w-4 h-4 ${isActive ? 'text-emerald-400' : 'text-slate-400'}`} />
              <span>{item.label}</span>
            </div>
            {item.badge && (
              <span className="text-[10px] bg-white/10 text-emerald-300 px-2 py-0.5 rounded-md font-bold">
                {item.badge}
              </span>
            )}
          </button>
        );
      })}

      <div className="pt-6 mt-6 border-t border-white/10">
        <div className="bg-white/5 backdrop-blur-lg border border-white/10 rounded-2xl p-3.5 text-center">
          <div className="text-xs font-bold text-slate-200 flex items-center justify-center gap-1.5 mb-1">
            <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
            Vibe Coding Pro
          </div>
          <p className="text-[11px] text-slate-400">
            Painel otimizado para máxima produtividade nas ruas.
          </p>
        </div>
      </div>
    </aside>
  );
};
