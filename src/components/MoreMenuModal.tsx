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

  const items = [
    {
      id: 'driverVoice',
      label: 'Driver Voice (Comandos de Voz)',
      desc: 'Controle o app por voz: registre ganhos, abastecimentos e consulte dados',
      icon: Mic,
      color: 'text-emerald-400',
      bg: 'bg-emerald-500/10',
      isAction: true,
      action: () => {
        if (onOpenVoiceModal) onOpenVoiceModal();
      },
    },
    {
      id: 'driverMode',
      label: 'Modo Motorista (Cockpit)',
      desc: 'Interface simplificada para o trânsito com comandos de voz integrados',
      icon: Car,
      color: 'text-amber-400',
      bg: 'bg-amber-500/10',
      isAction: true,
      action: () => {
        if (onOpenDriverMode) onOpenDriverMode();
      },
    },
    {
      id: 'fuelAdvisor',
      label: 'Devo Abastecer Hoje?',
      desc: 'Consultor de autonomia diária e calculadora Etanol vs Gasolina',
      icon: Fuel,
      color: 'text-amber-400',
      bg: 'bg-amber-500/10',
      isAction: true,
      action: () => {
        if (onOpenFuelAdvisor) onOpenFuelAdvisor();
      },
    },
    {
      id: 'fuel' as MainTabType,
      label: 'Tanque & Abastecimento (Painel Sandero)',
      desc: 'Nível em 8 barras LCD estilo Renault Sandero, autonomia e abastecimentos',
      icon: Fuel,
      color: 'text-amber-400',
      bg: 'bg-amber-500/10',
    },
    {
      id: 'reports' as MainTabType,
      label: 'Relatórios em PDF & Gráficos',
      desc: 'Emita demonstrativos semanais e mensais em PDF (A4)',
      icon: BarChart3,
      color: 'text-emerald-400',
      bg: 'bg-emerald-500/10',
    },
    {
      id: 'goals' as MainTabType,
      label: 'Metas & Progresso',
      desc: 'Meta diária, semanal e cálculo de R$/dia restante',
      icon: Target,
      color: 'text-emerald-400',
      bg: 'bg-emerald-500/10',
    },
    {
      id: 'analyzer' as MainTabType,
      label: 'Vale a Pena?',
      desc: 'Calculadora rápida de rentabilidade por corrida',
      icon: Calculator,
      color: 'text-teal-400',
      bg: 'bg-teal-500/10',
    },
    {
      id: 'vehicle' as MainTabType,
      label: 'Custo Real do Carro',
      desc: 'Depreciação, combustível, manutenções e revisões',
      icon: Car,
      color: 'text-sky-400',
      bg: 'bg-sky-500/10',
    },
    {
      id: 'insights' as MainTabType,
      label: 'Driver Insights',
      desc: 'Análise de inteligência com dados reais da sua operação',
      icon: Lightbulb,
      color: 'text-amber-400',
      bg: 'bg-amber-500/10',
    },
    {
      id: 'settings' as MainTabType,
      label: 'Configurações & Backups',
      desc: 'Perfil, exportação CSV/JSON e parâmetros de corte',
      icon: Settings,
      color: 'text-slate-300',
      bg: 'bg-white/10',
    },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center p-0 bg-slate-950/80 backdrop-blur-md md:hidden">
      <div className="bg-slate-900 border-t border-white/15 rounded-t-3xl w-full p-5 shadow-2xl space-y-4 max-h-[85vh] overflow-y-auto">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-emerald-500 to-teal-400 flex items-center justify-center font-bold text-slate-950">
              DP
            </div>
            <div>
              <h3 className="text-base font-black text-white">MAIS FERRAMENTAS</h3>
              <p className="text-[11px] text-slate-400">Atalhos rápidos para o seu cockpit</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 rounded-full text-slate-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-2">
          {items.map(item => {
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                onClick={() => {
                  if (item.isAction && item.action) {
                    item.action();
                  } else {
                    onSelectTab(item.id as MainTabType);
                    onClose();
                  }
                }}
                className="w-full flex items-center gap-3.5 p-3.5 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/5 transition text-left"
              >
                <div className={`w-10 h-10 rounded-xl ${item.bg} ${item.color} flex items-center justify-center shrink-0`}>
                  <Icon className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-xs font-black text-white">{item.label}</div>
                  <div className="text-[11px] text-slate-400 mt-0.5">{item.desc}</div>
                </div>
              </button>
            );
          })}
        </div>

        <div className="pt-2">
          <button
            onClick={onClose}
            className="w-full bg-white/10 text-slate-300 font-bold py-3 rounded-2xl text-xs"
          >
            Fechar Menu
          </button>
        </div>
      </div>
    </div>
  );
};
