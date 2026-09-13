import React from 'react';
import { MainTabType } from './BottomNav';
import {
  Target,
  Calculator,
  Car,
  Lightbulb,
  Bell,
  Settings,
  X,
  Sparkles,
  Fuel,
  Mic,
  BarChart3,
  ChevronRight,
  Shield,
  FileText,
} from 'lucide-react';

interface MoreMenuModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectTab: (tab: MainTabType) => void;
  onOpenAlerts: () => void;
  onOpenFuelAdvisor?: () => void;
  onOpenVoiceModal?: () => void;
  onOpenDriverMode?: () => void;
}

export const MoreMenuModal: React.FC<MoreMenuModalProps> = ({
  isOpen,
  onClose,
  onSelectTab,
  onOpenAlerts,
  onOpenFuelAdvisor,
  onOpenVoiceModal,
  onOpenDriverMode,
}) => {
  if (!isOpen) return null;

  const sections = [
    {
      title: 'ANÁLISE & DESEMPENHO',
      items: [
        {
          id: 'reports' as MainTabType,
          label: 'Relatórios & DRE em PDF',
          desc: 'Demonstrativos em PDF (A4), fechamentos e gráficos',
          icon: BarChart3,
          color: 'text-emerald-400',
          bg: 'bg-emerald-500/10',
        },
        {
          id: 'goals' as MainTabType,
          label: 'Metas & Progresso',
          desc: 'Meta semanal/mensal e ritmo diário restante',
          icon: Target,
          color: 'text-emerald-400',
          bg: 'bg-emerald-500/10',
        },
        {
          id: 'analyzer' as MainTabType,
          label: 'Calculadora "Vale a Pena?"',
          desc: 'Score 0-100 em 3 segundos para aceitar corridas',
          icon: Calculator,
          color: 'text-teal-400',
          bg: 'bg-teal-500/10',
        },
      ],
    },
    {
      title: 'VEÍCULO & GESTÃO',
      items: [
        {
          id: 'vehicle' as MainTabType,
          label: 'Custo Real do Carro',
          desc: 'Custo por KM, depreciação e manutenção preventiva',
          icon: Car,
          color: 'text-sky-400',
          bg: 'bg-sky-500/10',
        },
        {
          id: 'insights' as MainTabType,
          label: 'Driver Insights',
          desc: 'Melhores dias, horários e estratégias operacionais',
          icon: Lightbulb,
          color: 'text-amber-400',
          bg: 'bg-amber-500/10',
        },
      ],
    },
    {
      title: 'FERRAMENTAS & SISTEMA',
      items: [
        {
          id: 'driverMode',
          label: 'Modo Motorista (Cockpit)',
          desc: 'Interface segura e ampliada para uso no suporte',
          icon: Car,
          color: 'text-amber-400',
          bg: 'bg-amber-500/10',
          isAction: true,
          action: () => {
            if (onOpenDriverMode) onOpenDriverMode();
          },
        },
        {
          id: 'driverVoice',
          label: 'Driver Voice 🎙️',
          desc: 'Comandos de voz naturais para registrar dados',
          icon: Mic,
          color: 'text-emerald-400',
          bg: 'bg-emerald-500/10',
          isAction: true,
          action: () => {
            if (onOpenVoiceModal) onOpenVoiceModal();
          },
        },
        {
          id: 'settings' as MainTabType,
          label: 'Configurações & Backups',
          desc: 'Perfil, exportações CSV/JSON e integridade',
          icon: Settings,
          color: 'text-slate-300',
          bg: 'bg-slate-800',
        },
      ],
    },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center p-0 bg-slate-950/80 backdrop-blur-md md:hidden">
      <div className="bg-slate-900 border-t border-slate-800 rounded-t-3xl w-full p-4 sm:p-5 shadow-2xl space-y-4 max-h-[85vh] overflow-y-auto">
        {/* CABEÇALHO DO MENU */}
        <div className="flex items-center justify-between pb-2 border-b border-slate-800/80">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-emerald-500 flex items-center justify-center font-black text-slate-950 text-sm">
              DP
            </div>
            <div>
              <h3 className="text-sm font-black text-white uppercase tracking-wider">Mais Ferramentas</h3>
              <p className="text-[11px] text-slate-400">Recursos de gestão e análise</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-800 text-slate-400 hover:text-white flex items-center justify-center transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* SEÇÕES AGRUPADAS (REDUÇÃO DE CARGA COGNITIVA) */}
        <div className="space-y-4">
          {sections.map((section, idx) => (
            <div key={idx} className="space-y-1.5">
              <div className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-1">
                {section.title}
              </div>
              <div className="space-y-1.5">
                {section.items.map(item => {
                  const Icon = item.icon;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => {
                        if (item.isAction && item.action) {
                          item.action();
                        } else {
                          onSelectTab(item.id as MainTabType);
                          onClose();
                        }
                      }}
                      className="w-full flex items-center justify-between p-3 rounded-2xl bg-slate-800/60 hover:bg-slate-800 border border-slate-700/50 transition text-left active:scale-[0.99] group"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className={`w-9 h-9 rounded-xl ${item.bg} ${item.color} flex items-center justify-center shrink-0`}>
                          <Icon className="w-4 h-4" />
                        </div>
                        <div className="min-w-0">
                          <div className="text-xs font-bold text-white group-hover:text-emerald-300 transition truncate">
                            {item.label}
                          </div>
                          <div className="text-[10px] text-slate-400 truncate mt-0.5">
                            {item.desc}
                          </div>
                        </div>
                      </div>
                      <ChevronRight className="w-4 h-4 text-slate-500 group-hover:text-slate-300 transition shrink-0 ml-2" />
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        {/* BOTÃO DE FECHAR */}
        <div className="pt-2">
          <button
            type="button"
            onClick={onClose}
            className="w-full bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold py-3 rounded-2xl text-xs transition"
          >
            Fechar Menu
          </button>
        </div>
      </div>
    </div>
  );
};
