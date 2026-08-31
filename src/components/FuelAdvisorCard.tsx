import React from 'react';
import { useDriver } from '../context/DriverContext';
import { calcDailyFuelAdvisor, formatCurrency, formatKm } from '../utils/calc';
import {
  Fuel,
  Gauge,
  Sparkles,
  ArrowRight,
  TrendingDown,
  CheckCircle2,
  AlertTriangle,
  AlertOctagon,
  Moon,
  Zap,
} from 'lucide-react';

interface FuelAdvisorCardProps {
  onOpenAdvisorModal: () => void;
  onOpenQuickFuel: () => void;
}

export const FuelAdvisorCard: React.FC<FuelAdvisorCardProps> = ({
  onOpenAdvisorModal,
  onOpenQuickFuel,
}) => {
  const { vehicle, fuelRecords, plannerEvents, profile } = useDriver();

  // Verificar se há evento planejado para hoje
  const todayStr = new Date().toISOString().split('T')[0];
  const todayEvent = plannerEvents.find(e => e.date === todayStr);
  const isOffDay = todayEvent?.type === 'off';

  // Estimar demanda em km de hoje (com base na meta diária ou evento do planner)
  const plannedGross = todayEvent?.targetEarnings || profile.dailyGoal || 250;
  // Regra padrão de mercado: ganho médio de ~R$ 2.00 por km rodado -> ~125 km para R$ 250
  const estimatedKmToday = Math.round(plannedGross / (profile.minAcceptableRateKm || 2.0));

  const advisor = calcDailyFuelAdvisor(
    vehicle,
    fuelRecords,
    isOffDay ? 0 : estimatedKmToday,
    isOffDay,
    null,
    profile.gasPriceReference || 5.89,
    (profile.gasPriceReference || 5.89) * 0.68
  );

  // Cores dinâmicas
  const colorMap = {
    emerald: {
      border: 'border-emerald-500/30 hover:border-emerald-500/50',
      badge: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
      bar: 'from-emerald-600 to-teal-400',
      iconBg: 'bg-emerald-500/10 text-emerald-400',
      text: 'text-emerald-400',
    },
    amber: {
      border: 'border-amber-500/30 hover:border-amber-500/50',
      badge: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
      bar: 'from-amber-600 to-yellow-400',
      iconBg: 'bg-amber-500/10 text-amber-400',
      text: 'text-amber-400',
    },
    rose: {
      border: 'border-rose-500/30 hover:border-rose-500/50',
      badge: 'bg-rose-500/15 text-rose-300 border-rose-500/30',
      bar: 'from-rose-600 to-red-400',
      iconBg: 'bg-rose-500/10 text-rose-400',
      text: 'text-rose-400',
    },
    sky: {
      border: 'border-sky-500/30 hover:border-sky-500/50',
      badge: 'bg-sky-500/15 text-sky-300 border-sky-500/30',
      bar: 'from-sky-600 to-blue-400',
      iconBg: 'bg-sky-500/10 text-sky-400',
      text: 'text-sky-400',
    },
  };

  const currentTheme = colorMap[advisor.badgeColor] || colorMap.emerald;

  return (
    <div
      className={`bg-white/5 backdrop-blur-lg border ${currentTheme.border} p-5 rounded-2xl transition-all duration-300 relative overflow-hidden group shadow-lg`}
    >
      {/* GLOW DE FUNDO */}
      <div
        className={`absolute -right-16 -top-16 w-44 h-44 rounded-full blur-3xl opacity-20 pointer-events-none ${
          advisor.badgeColor === 'emerald'
            ? 'bg-emerald-500'
            : advisor.badgeColor === 'amber'
            ? 'bg-amber-500'
            : advisor.badgeColor === 'rose'
            ? 'bg-rose-500'
            : 'bg-sky-500'
        }`}
      />

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-2.5">
          <div className={`w-9 h-9 rounded-xl ${currentTheme.iconBg} flex items-center justify-center font-black shrink-0`}>
            <Fuel className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[11px] font-black text-white uppercase tracking-wider">
                SUGESTÃO DE ABASTECIMENTO DO DIA
              </span>
              <span className={`text-[10px] font-black px-2 py-0.5 rounded-full border ${currentTheme.badge} flex items-center gap-1`}>
                {advisor.badgeLabel}
              </span>
            </div>
            <p className="text-xs text-slate-300 font-semibold mt-0.5">
              {advisor.title}
            </p>
          </div>
        </div>

        {/* BOTÃO PARA DETALHES */}
        <button
          onClick={onOpenAdvisorModal}
          className="self-start sm:self-auto bg-white/10 hover:bg-white/15 text-slate-200 text-xs font-bold px-3 py-1.5 rounded-xl border border-white/10 flex items-center gap-1.5 transition active:scale-95 shrink-0"
        >
          <Sparkles className="w-3.5 h-3.5 text-amber-400" />
          <span>Consultor & Simulador</span>
          <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
        </button>
      </div>

      {/* PAINEL DE TELEMETRIA RÁPIDA (AUTONOMIA vs DEMANDA) */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3.5 rounded-xl bg-black/30 border border-white/5">
        {/* NÍVEL DO TANQUE & AUTONOMIA */}
        <div>
          <div className="flex justify-between items-center text-[11px] text-slate-400 font-bold mb-1">
            <span className="flex items-center gap-1">
              <Gauge className="w-3.5 h-3.5 text-slate-400" /> NÍVEL DO TANQUE
            </span>
            <span className={`font-black ${currentTheme.text}`}>{advisor.currentTankPct}% ({advisor.currentLiters}L)</span>
          </div>
          <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden">
            <div
              className={`bg-gradient-to-r ${currentTheme.bar} h-full rounded-full transition-all duration-500`}
              style={{ width: `${Math.max(5, advisor.currentTankPct)}%` }}
            />
          </div>
          <div className="text-[11px] text-slate-300 mt-1 font-semibold">
            Autonomia atual: <strong className="text-white font-black">{formatKm(advisor.currentRangeKm)}</strong>
          </div>
        </div>

        {/* DEMANDA DO TURNO HOJE */}
        <div className="border-t sm:border-t-0 sm:border-l border-white/10 pt-2 sm:pt-0 sm:pl-3">
          <div className="text-[11px] text-slate-400 font-bold mb-1 flex items-center justify-between">
            <span>PREVISÃO HOJE</span>
            <span className="text-slate-200 font-black">{formatKm(advisor.neededKmToday)}</span>
          </div>
          <div className="text-xs text-slate-300 font-semibold">
            Consumo estimado: <strong className="text-slate-100">{advisor.litersNeededToday}L</strong> ({formatCurrency(advisor.costEstimateToday)})
          </div>
          <div className="text-[11px] text-slate-400 mt-1">
            Meta: {formatCurrency(plannedGross)} no dia
          </div>
        </div>

        {/* VEREDITO & MARGEM */}
        <div className="border-t sm:border-t-0 sm:border-l border-white/10 pt-2 sm:pt-0 sm:pl-3 flex flex-col justify-between">
          <div>
            <span className="text-[11px] text-slate-400 font-bold">MARGEM DE SEGURANÇA</span>
            <div className={`text-sm font-black mt-0.5 ${advisor.marginKm >= 50 ? 'text-emerald-400' : advisor.marginKm >= 0 ? 'text-amber-400' : 'text-rose-400'}`}>
              {advisor.marginKm >= 0 ? `+${formatKm(advisor.marginKm)} de sobra` : `Falta ${formatKm(Math.abs(advisor.marginKm))}`}
            </div>
          </div>

          {vehicle.fuelType === 'Flex' && (
            <div className="text-[11px] text-slate-300 flex items-center gap-1 font-medium mt-1">
              <Zap className="w-3 h-3 text-amber-400 shrink-0" />
              <span>Hoje compensa: <strong className="text-emerald-300 font-bold">{advisor.parity.betterOption}</strong></span>
            </div>
          )}
        </div>
      </div>

      {/* MENSAGEM EXPLICATIVA RÁPIDA */}
      <div className="mt-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
        <p className="text-slate-300 leading-relaxed text-[11px] sm:text-xs">
          {advisor.explanation}
        </p>

        {advisor.status !== 'NO_NEED' && advisor.status !== 'OFF_DAY' && (
          <button
            onClick={onOpenQuickFuel}
            className="shrink-0 bg-gradient-to-r from-emerald-500 to-teal-400 hover:from-emerald-400 hover:to-teal-300 text-slate-950 font-black px-3.5 py-1.5 rounded-xl text-xs flex items-center gap-1.5 shadow-md shadow-emerald-500/20 active:scale-95 transition"
          >
            <Fuel className="w-3.5 h-3.5" />
            <span>Lançar Abastecimento</span>
          </button>
        )}
      </div>
    </div>
  );
};
