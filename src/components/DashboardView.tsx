import React, { useState, useMemo, useEffect } from 'react';
import { useDriver } from '../context/DriverContext';
import { DashboardCardId, FuelCalculationMethod } from '../types';
import {
  formatCurrency,
  formatKm,
  formatHours,
  formatTimer,
  safeDivide,
} from '../utils/calc';
import { calculateDayFinancialTruth } from '../utils/financialTruth';
import { getOperationalDate, DEFAULT_TIMEZONE } from '../utils/timezone';
import { FuelAdvisorCard } from './FuelAdvisorCard';
import { SanderoFuelGaugeCard } from './SanderoFuelGaugeCard';
import { WeeklyGoalCard } from './WeeklyGoalCard';
import { NextServiceCard } from './NextServiceCard';
import { RecentRidesCard } from './RecentRidesCard';
import { DashboardCustomizerModal } from './DashboardCustomizerModal';
import {
  TrendingUp,
  DollarSign,
  Fuel,
  Clock,
  Navigation,
  Car,
  Award,
  Zap,
  ChevronRight,
  ArrowUpRight,
  ArrowDownRight,
  Calendar,
  Layers,
  PiggyBank,
  Wallet,
  ShieldCheck,
  Sliders,
  Play,
  Square,
  PlusCircle,
  Calculator,
  Compass,
} from 'lucide-react';

interface DashboardViewProps {
  onOpenShiftModal: () => void;
  onOpenQuickModal: () => void;
  onNavigateTab: (tab: any) => void;
  onOpenFuelAdvisorModal?: () => void;
  onOpenQuickFuel?: () => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  onOpenShiftModal,
  onOpenQuickModal,
  onNavigateTab,
  onOpenFuelAdvisorModal = () => {},
  onOpenQuickFuel = () => {},
}) => {
  const {
    profile,
    vehicle,
    sessions,
    activeSession,
    earnings,
    expenses,
    fuelRecords,
    fuelCalculationMethod,
    setFuelCalculationMethod,
    loadDemoData,
    dashboardCards,
  } = useDriver();

  const [chartMetric, setChartMetric] = useState<'gross' | 'net' | 'trips' | 'hours'>('gross');
  const [showCustomizerModal, setShowCustomizerModal] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  // Timer da sessão ativa
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

  // Dados de hoje integrados à Fonte Única da Verdade com suporte a timezone
  const timezone = profile.timezone || DEFAULT_TIMEZONE;
  const todayStr = useMemo(() => getOperationalDate(new Date(), timezone), [timezone]);

  const todayTruth = useMemo(() => {
    return calculateDayFinancialTruth(
      todayStr,
      sessions,
      expenses,
      fuelRecords,
      earnings,
      fuelCalculationMethod || 'hibrido',
      timezone
    );
  }, [todayStr, sessions, expenses, fuelRecords, earnings, fuelCalculationMethod, timezone]);

  const activeGross = activeSession ? activeSession.grossEarnings + activeSession.tips : 0;
  const activeExpenses = activeSession ? activeSession.fuelExpenses + activeSession.otherExpenses : 0;
  const activeTrips = activeSession ? activeSession.tripsCount : 0;
  const activeKm = activeSession && activeSession.startOdometer ? Math.max(0, vehicle.currentOdometer - activeSession.startOdometer) : 0;

  const todayGross = todayTruth.grossEarnings + activeGross;
  const todayExpenses = todayTruth.totalExpenses + activeExpenses;

  // Reservas estratégicas para abastecimento futuro e manutenção
  const todayFuelReserve = todayTruth.fuelReserve;
  const todayMaintReserve = todayTruth.maintenanceReserve;
  const todayTotalReserves = todayTruth.reserves;

  // Saldo imediato em dinheiro no bolso hoje (Bruto - Despesas Diretas desembolsadas)
  const todayImmediateBalance = todayGross - todayExpenses;

  // Lucro líquido real (após guardar o valor para a reserva de abastecimento futuro e manutenção)
  const todayNetProfit = todayGross - todayExpenses - todayTotalReserves;

  const todayTrips = todayTruth.tripsCount + activeTrips;
  const todayKm = todayTruth.distanceKm + activeKm;

  const todayHoursDecimal = useMemo(() => {
    let total = todayTruth.durationHours;
    if (activeSession) {
      const liveHours = (Date.now() - new Date(activeSession.startTime).getTime()) / 3600000;
      total += Math.max(0, liveHours);
    }
    return total;
  }, [todayTruth.durationHours, activeSession]);

  const ratePerHour = safeDivide(todayGross, todayHoursDecimal);
  const ratePerKm = safeDivide(todayGross, todayKm);
  const costPerKm = safeDivide(todayExpenses, todayKm);
  const goalProgress = Math.min(100, Math.round(safeDivide(todayGross, profile.dailyGoal) * 100));

  // Estatísticas dos últimos 7 dias para o gráfico via Fonte da Verdade
  const last7DaysData = useMemo(() => {
    const days: { dateStr: string; label: string; gross: number; expenses: number; reserves: number; net: number; trips: number; hours: number }[] = [];
    const dayNames = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
    
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = getOperationalDate(d, timezone);
      const dayName = dayNames[d.getDay()];

      const truth = calculateDayFinancialTruth(
        dateStr,
        sessions,
        expenses,
        fuelRecords,
        earnings,
        fuelCalculationMethod || 'hibrido',
        timezone
      );

      const isToday = i === 0;
      const gross = truth.grossEarnings + (isToday && activeSession ? activeSession.grossEarnings + activeSession.tips : 0);
      const exp = truth.totalExpenses + (isToday && activeSession ? activeSession.fuelExpenses + activeSession.otherExpenses : 0);
      const res = truth.reserves;
      const trips = truth.tripsCount + (isToday && activeSession ? activeSession.tripsCount : 0);

      days.push({
        dateStr,
        label: isToday ? 'Hoje' : dayName,
        gross,
        expenses: exp,
        reserves: res,
        net: gross - exp - res,
        trips,
        hours: truth.durationHours,
      });
    }
    return days;
  }, [sessions, expenses, fuelRecords, earnings, fuelCalculationMethod, timezone, activeSession]);

  // Resumo inteligente
  const summaryIntelligence = useMemo(() => {
    if (sessions.length === 0) {
      return {
        bestDay: 'Sem dados suficientes',
        worstDay: 'Sem dados suficientes',
        bestHour: '06:00 - 10:00 (Pico Matinal)',
        bestPlatform: 'Uber (Padrão)',
        dailyAverage: 0,
      };
    }

    const dayEarnings: { [key: number]: { total: number; count: number } } = {};
    sessions.forEach(s => {
      const day = new Date(s.startTime).getDay();
      if (!dayEarnings[day]) dayEarnings[day] = { total: 0, count: 0 };
      dayEarnings[day].total += s.grossEarnings + s.tips;
      dayEarnings[day].count += 1;
    });

    const dayNames = ['Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado'];
    let bestDayIdx = 5; // default Sexta
    let maxAvg = 0;
    let worstDayIdx = 1;
    let minAvg = Infinity;

    Object.entries(dayEarnings).forEach(([d, data]) => {
      const avg = safeDivide(data.total, data.count);
      if (avg > maxAvg) {
        maxAvg = avg;
        bestDayIdx = Number(d);
      }
      if (avg < minAvg && data.count > 0) {
        minAvg = avg;
        worstDayIdx = Number(d);
      }
    });

    const totalHistoricalGross = sessions.reduce((acc, s) => acc + s.grossEarnings + s.tips, 0);
    const dailyAverage = safeDivide(totalHistoricalGross, sessions.length);

    return {
      bestDay: dayNames[bestDayIdx] || 'Sexta-feira',
      worstDay: minAvg !== Infinity ? dayNames[worstDayIdx] : 'Segunda-feira',
      bestHour: '06h - 10h (Pico Matutino)',
      bestPlatform: 'Uber (65% share)',
      dailyAverage,
    };
  }, [sessions]);

  const maxChartValue = useMemo(() => {
    const values = last7DaysData.map(d => {
      if (chartMetric === 'gross') return d.gross;
      if (chartMetric === 'net') return d.net;
      if (chartMetric === 'trips') return d.trips;
      return d.hours;
    });
    return Math.max(...values, 10);
  }, [last7DaysData, chartMetric]);

  const renderCard = (cardId: DashboardCardId) => {
    switch (cardId) {
      case 'cockpit_metrics':
        return (
          <div key={cardId} className="space-y-3">
            {/* Seletor de Modo de Apuração de Combustível */}
            <div className="flex flex-wrap items-center justify-between gap-2 px-1 text-xs">
              <div className="flex items-center gap-1.5 text-slate-400 font-medium">
                <Fuel className="w-3.5 h-3.5 text-amber-400" />
                <span>Apuração de Combustível:</span>
              </div>
              <div className="flex items-center bg-black/40 p-0.5 rounded-lg border border-white/10 text-[11px]">
                <button
                  type="button"
                  onClick={() => setFuelCalculationMethod('hibrido')}
                  className={`px-2.5 py-1 rounded-md transition font-semibold ${
                    fuelCalculationMethod === 'hibrido'
                      ? 'bg-amber-500 text-slate-950 shadow-sm'
                      : 'text-slate-400 hover:text-white'
                  }`}
                  title="Abastecimento no dia da compra; nos demais dias, custo estimado pelo KM rodado"
                >
                  Híbrido (Inteligente)
                </button>
                <button
                  type="button"
                  onClick={() => setFuelCalculationMethod('real_abastecimento')}
                  className={`px-2.5 py-1 rounded-md transition font-semibold ${
                    fuelCalculationMethod === 'real_abastecimento'
                      ? 'bg-amber-500 text-slate-950 shadow-sm'
                      : 'text-slate-400 hover:text-white'
                  }`}
                  title="Apenas despesas reais de notas e comprovantes no posto"
                >
                  Real (Posto)
                </button>
                <button
                  type="button"
                  onClick={() => setFuelCalculationMethod('estimado_km')}
                  className={`px-2.5 py-1 rounded-md transition font-semibold ${
                    fuelCalculationMethod === 'estimado_km'
                      ? 'bg-amber-500 text-slate-950 shadow-sm'
                      : 'text-slate-400 hover:text-white'
                  }`}
                  title="Custo calculado pelo consumo de KM rodados x preço do combustível"
                >
                  Estimado (KM)
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
              {/* 1. GANHOS HOJE */}
              <div className="bg-white/5 backdrop-blur-lg border border-white/10 p-4 sm:p-5 rounded-2xl relative overflow-hidden group hover:border-emerald-500/30 transition">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">GANHOS HOJE</span>
                  <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
                    <DollarSign className="w-4 h-4" />
                  </div>
                </div>
                <div className="text-2xl sm:text-3xl font-black text-emerald-400 mt-2 tracking-tight">
                  {formatCurrency(todayGross)}
                </div>
                <div className="text-[11px] text-slate-400 mt-1 flex items-center gap-1">
                  <span className="font-semibold text-slate-200">{todayTrips}</span> corridas realizadas
                </div>
              </div>

              {/* 2. DESPESAS DIRETAS HOJE */}
              <div className="bg-white/5 backdrop-blur-lg border border-white/10 p-4 sm:p-5 rounded-2xl relative overflow-hidden group hover:border-rose-500/30 transition">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">DESPESAS DIRETAS</span>
                  <div className="w-8 h-8 rounded-xl bg-rose-500/10 text-rose-400 flex items-center justify-center">
                    <Fuel className="w-4 h-4" />
                  </div>
                </div>
                <div className="text-2xl sm:text-3xl font-black text-rose-400 mt-2 tracking-tight">
                  {formatCurrency(todayExpenses)}
                </div>
                <div className="text-[11px] text-slate-400 mt-1">
                  Gastos operacionais no dia
                </div>
              </div>

              {/* 3. LUCRO LÍQUIDO REAL */}
              <div className="bg-white/5 backdrop-blur-lg border border-white/10 p-4 sm:p-5 rounded-2xl relative overflow-hidden group hover:border-white/30 transition">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">LUCRO REAL</span>
                  <div className="w-8 h-8 rounded-xl bg-white/10 text-white flex items-center justify-center">
                    <TrendingUp className="w-4 h-4" />
                  </div>
                </div>
                <div className="text-2xl sm:text-3xl font-black text-white mt-2 tracking-tight">
                  {formatCurrency(todayNetProfit)}
                </div>
                <div className="text-[11px] text-slate-300 mt-1 flex flex-col gap-0.5">
                  <span className="font-bold text-emerald-400">
                    {todayGross > 0 ? `${Math.round((todayNetProfit / todayGross) * 100)}% margem real` : 'Sem lançamentos'}
                  </span>
                  <span className="text-[10px] text-sky-300">
                    Disponível no bolso: {formatCurrency(todayImmediateBalance)}
                  </span>
                </div>
              </div>

              {/* 4. TEMPO & KM */}
              <div className="bg-white/5 backdrop-blur-lg border border-white/10 p-4 sm:p-5 rounded-2xl relative overflow-hidden group hover:border-amber-500/30 transition">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">TEMPO EM ROTA</span>
                  <div className="w-8 h-8 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center">
                    <Clock className="w-4 h-4" />
                  </div>
                </div>
                <div className="text-2xl sm:text-3xl font-black text-amber-400 mt-2 tracking-tight">
                  {formatHours(todayHoursDecimal)}
                </div>
                <div className="text-[11px] text-slate-400 mt-1 flex items-center gap-1">
                  <Navigation className="w-3 h-3 text-slate-500" />
                  <span className="font-semibold text-slate-200">{formatKm(todayKm)}</span> rodados
                </div>
              </div>
            </div>
          </div>
        );

      case 'reserves_wallet':
        if (todayTotalReserves <= 0) return null;
        return (
          <div key={cardId} className="bg-amber-500/10 border border-amber-500/20 rounded-2xl p-3 sm:p-4 flex flex-col gap-2.5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-300 flex items-center justify-center flex-shrink-0">
                  <PiggyBank className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs font-black text-amber-200 uppercase tracking-wide flex items-center gap-2 flex-wrap">
                    <span>Reserva para Abastecimento: {formatCurrency(todayFuelReserve)}</span>
                    {todayMaintReserve > 0 && (
                      <span className="text-sky-300 font-bold">• Reserva Manutenção: {formatCurrency(todayMaintReserve)}</span>
                    )}
                  </div>
                  <p className="text-[11px] text-slate-300">
                    Valor separado dos ganhos de hoje para cobrir o próximo abastecimento sem desfalcar seu lucro.
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 bg-black/40 px-3 py-1.5 rounded-xl border border-white/10 self-start sm:self-auto">
                <Wallet className="w-3.5 h-3.5 text-sky-400" />
                <span className="text-[11px] text-slate-300">Disponível Imediato em Mãos:</span>
                <strong className="text-xs font-black text-white font-mono">{formatCurrency(todayImmediateBalance)}</strong>
              </div>
            </div>

            {/* Fórmula Explícita e Transparente */}
            <div className="pt-2 border-t border-amber-500/15 flex flex-wrap items-center justify-between gap-1 text-[10px] text-slate-400 font-mono">
              <span>
                Faturamento ({formatCurrency(todayGross)}) - Custos ({formatCurrency(todayExpenses)}) - Reservas ({formatCurrency(todayTotalReserves)}) = <strong className="text-sky-300 font-bold">{formatCurrency(todayImmediateBalance)}</strong>
              </span>
              <span className="text-amber-300/80 italic font-sans text-[10px]">
                * Disponível imediato não significa necessariamente lucro contábil.
              </span>
            </div>
          </div>
        );

      case 'unit_efficiency':
        return (
          <div key={cardId} className="bg-white/5 backdrop-blur-lg border border-white/10 p-4 rounded-2xl grid grid-cols-3 gap-2 text-center divide-x divide-white/10">
            <div>
              <span className="text-[11px] font-bold text-slate-400 uppercase">GANHO / HORA</span>
              <div className="text-lg sm:text-xl font-black text-emerald-300 mt-0.5">
                {formatCurrency(ratePerHour)}<span className="text-xs text-slate-400 font-normal">/h</span>
              </div>
              <span className="text-[10px] text-slate-500 hidden sm:inline">Meta mín: {formatCurrency(profile.minAcceptableRateHour)}/h</span>
            </div>

            <div>
              <span className="text-[11px] font-bold text-slate-400 uppercase">GANHO / KM</span>
              <div className="text-lg sm:text-xl font-black text-emerald-300 mt-0.5">
                {formatCurrency(ratePerKm)}<span className="text-xs text-slate-400 font-normal">/km</span>
              </div>
              <span className="text-[10px] text-slate-500 hidden sm:inline">Meta mín: {formatCurrency(profile.minAcceptableRateKm)}/km</span>
            </div>

            <div>
              <span className="text-[11px] font-bold text-slate-400 uppercase">CUSTO / KM</span>
              <div className="text-lg sm:text-xl font-black text-rose-300 mt-0.5">
                {formatCurrency(costPerKm)}<span className="text-xs text-slate-400 font-normal">/km</span>
              </div>
              <span className="text-[10px] text-slate-500 hidden sm:inline">Gastos diretos hoje</span>
            </div>
          </div>
        );

      case 'daily_goal':
        return (
          <div key={cardId} className="bg-white/5 backdrop-blur-lg border border-white/10 p-5 rounded-2xl">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Award className="w-4 h-4 text-emerald-400" />
                <span className="text-xs font-bold text-slate-200 uppercase tracking-wider">
                  META DIÁRIA ({formatCurrency(profile.dailyGoal)})
                </span>
              </div>
              <span className="text-sm font-black text-emerald-400">{goalProgress}%</span>
            </div>

            <div className="w-full bg-slate-900/80 rounded-full h-3.5 overflow-hidden p-0.5 border border-white/10">
              <div
                className="bg-gradient-to-r from-emerald-500 via-teal-400 to-emerald-300 h-full rounded-full transition-all duration-700 ease-out shadow-lg shadow-emerald-500/30"
                style={{ width: `${goalProgress}%` }}
              />
            </div>

            <div className="flex justify-between items-center text-xs text-slate-400 mt-2.5">
              <span>Realizado: <strong className="text-emerald-300 font-bold">{formatCurrency(todayGross)}</strong></span>
              <span>
                {todayGross >= profile.dailyGoal ? (
                  <span className="text-emerald-400 font-bold">🎉 Meta Batida! (+{formatCurrency(todayGross - profile.dailyGoal)})</span>
                ) : (
                  <span>Falta: <strong className="text-amber-300 font-bold">{formatCurrency(profile.dailyGoal - todayGross)}</strong></span>
                )}
              </span>
            </div>
          </div>
        );

      case 'weekly_goal':
        return <WeeklyGoalCard key={cardId} onNavigateTab={onNavigateTab} />;

      case 'next_service':
        return <NextServiceCard key={cardId} onNavigateTab={onNavigateTab} />;

      case 'fuel_advisor':
        return (
          <FuelAdvisorCard
            key={cardId}
            onOpenAdvisorModal={onOpenFuelAdvisorModal}
            onOpenQuickFuel={onOpenQuickFuel}
          />
        );

      case 'sandero_fuel_gauge':
        return (
          <SanderoFuelGaugeCard
            key={cardId}
            onNavigateTab={onNavigateTab}
            onOpenQuickFuel={onOpenQuickFuel}
          />
        );

      case 'performance_chart':
        return (
          <div key={cardId} className="bg-white/5 backdrop-blur-lg border border-white/10 p-5 sm:p-6 rounded-2xl space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-black text-white uppercase tracking-wider flex items-center gap-2">
                  <BarChart3Icon />
                  DESEMPENHO DOS ÚLTIMOS 7 DIAS
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">Acompanhe seu ritmo de faturamento e rentabilidade recente.</p>
              </div>

              {/* TOGGLE DE MÉTRICAS */}
              <div className="flex items-center gap-1 bg-black/40 p-1 rounded-xl border border-white/10 self-start sm:self-auto">
                {[
                  { id: 'gross', label: 'Faturamento' },
                  { id: 'net', label: 'Lucro' },
                  { id: 'trips', label: 'Corridas' },
                  { id: 'hours', label: 'Horas' },
                ].map(tab => (
                  <button
                    key={tab.id}
                    onClick={() => setChartMetric(tab.id as any)}
                    className={`px-2.5 py-1 text-xs font-bold rounded-lg transition ${
                      chartMetric === tab.id
                        ? 'bg-emerald-500 text-slate-950 shadow-md'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>

            {/* BARRAS DO GRÁFICO SVG/HTML */}
            <div className="h-44 sm:h-52 flex items-end justify-between gap-2 sm:gap-4 pt-8 pb-2 px-1">
              {last7DaysData.map((d, idx) => {
                let val = 0;
                let formattedDisplay = '';
                if (chartMetric === 'gross') {
                  val = d.gross;
                  formattedDisplay = formatCurrency(d.gross);
                } else if (chartMetric === 'net') {
                  val = Math.max(0, d.net);
                  formattedDisplay = formatCurrency(d.net);
                } else if (chartMetric === 'trips') {
                  val = d.trips;
                  formattedDisplay = `${d.trips} corr`;
                } else {
                  val = d.hours;
                  formattedDisplay = formatHours(d.hours);
                }

                const heightPct = Math.min(100, Math.max(8, (val / maxChartValue) * 100));

                return (
                  <div key={idx} className="flex-1 flex flex-col items-center h-full justify-end group relative">
                    {/* TOOLTIP HOVER */}
                    <div className="opacity-0 group-hover:opacity-100 transition absolute -top-8 bg-slate-900 border border-white/20 px-2 py-1 rounded-lg text-[10px] font-bold text-white whitespace-nowrap z-20 pointer-events-none shadow-xl">
                      {d.label}: {formattedDisplay}
                    </div>

                    <div className="w-full max-w-[40px] flex items-end justify-center h-full">
                      <div
                        className={`w-full rounded-t-xl transition-all duration-500 relative group-hover:brightness-125 ${
                          val > 0
                            ? 'bg-gradient-to-t from-emerald-600 to-teal-400 shadow-md shadow-emerald-500/20'
                            : 'bg-white/10'
                        }`}
                        style={{ height: `${heightPct}%` }}
                      />
                    </div>

                    <span className="text-[11px] font-bold text-slate-400 mt-2 group-hover:text-emerald-300 transition">
                      {d.label}
                    </span>
                    <span className="text-[9px] text-slate-500 font-mono hidden sm:block">
                      {val > 0 ? (chartMetric === 'trips' ? val : chartMetric === 'hours' ? `${val.toFixed(1)}h` : `R$${Math.round(val)}`) : '-'}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        );

      case 'smart_summary':
        return (
          <div key={cardId} className="bg-white/5 backdrop-blur-lg border border-white/10 p-5 rounded-2xl">
            <h3 className="text-sm font-black text-white uppercase tracking-wider mb-3 flex items-center gap-2">
              <Zap className="w-4 h-4 text-amber-400" />
              RESUMO INTELIGENTE DA SUA OPERAÇÃO
            </h3>

            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 text-center">
              <div className="bg-white/5 p-3 rounded-xl border border-white/5">
                <span className="text-[10px] font-bold text-slate-400 uppercase">MELHOR DIA</span>
                <div className="text-xs sm:text-sm font-black text-emerald-400 mt-1">{summaryIntelligence.bestDay}</div>
              </div>
              <div className="bg-white/5 p-3 rounded-xl border border-white/5">
                <span className="text-[10px] font-bold text-slate-400 uppercase">PIOR DIA</span>
                <div className="text-xs sm:text-sm font-black text-rose-400 mt-1">{summaryIntelligence.worstDay}</div>
              </div>
              <div className="bg-white/5 p-3 rounded-xl border border-white/5">
                <span className="text-[10px] font-bold text-slate-400 uppercase">MELHOR HORÁRIO</span>
                <div className="text-xs sm:text-sm font-black text-amber-400 mt-1">{summaryIntelligence.bestHour}</div>
              </div>
              <div className="bg-white/5 p-3 rounded-xl border border-white/5">
                <span className="text-[10px] font-bold text-slate-400 uppercase">MELHOR APP</span>
                <div className="text-xs sm:text-sm font-black text-slate-200 mt-1">{summaryIntelligence.bestPlatform}</div>
              </div>
              <div className="bg-white/5 p-3 rounded-xl border border-white/5 col-span-2 sm:col-span-1">
                <span className="text-[10px] font-bold text-slate-400 uppercase">MÉDIA DIÁRIA</span>
                <div className="text-xs sm:text-sm font-black text-emerald-300 mt-1">
                  {formatCurrency(summaryIntelligence.dailyAverage)}
                </div>
              </div>
            </div>
          </div>
        );

      case 'recent_rides':
        return (
          <RecentRidesCard
            key={cardId}
            onOpenShiftModal={onOpenShiftModal}
            onNavigateTab={onNavigateTab}
          />
        );

      default:
        return null;
    }
  };

  const visibleCards = dashboardCards.filter(c => c.visible);

  return (
    <div className="space-y-5">
      {/* 1. COCKPIT OPERACIONAL HERO HEADER (ONDE ESTOU? O QUE ESTOU FAZENDO? AÇÃO PRINCIPAL) */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-4 sm:p-6 shadow-xl relative overflow-hidden">
        {/* Glow sutil */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 relative z-10">
          <div className="space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                {new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long' })}
              </span>
              {activeSession ? (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-xs font-black animate-pulse">
                  <span className="w-2 h-2 rounded-full bg-emerald-400" />
                  TURNO ATIVO
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700 text-xs font-bold">
                  <span className="w-2 h-2 rounded-full bg-slate-400" />
                  FORA DE TURNO
                </span>
              )}
            </div>

            <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">
              {activeSession ? 'Cockpit em Operação' : 'Pronto para Rodar?'}
            </h2>
            <p className="text-xs text-slate-400 max-w-xl">
              {activeSession
                ? `Expediente iniciado às ${new Date(activeSession.startTime).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })} • Tempo decorrido: ${formatTimer(elapsedSeconds)}`
                : 'Inicie seu turno para monitorar ganhos, consumo do Sandero e métricas em tempo real.'}
            </p>
          </div>

          {/* BOTÕES DE AÇÃO PRINCIPAL IMEDIATA */}
          <div className="flex items-center gap-2.5 flex-wrap sm:flex-nowrap">
            {activeSession ? (
              <>
                <button
                  type="button"
                  onClick={() => onOpenQuickModal()}
                  className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-3 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs sm:text-sm shadow-lg shadow-emerald-500/20 transition active:scale-95"
                >
                  <PlusCircle className="w-4 h-4 stroke-[2.5]" />
                  <span>+ Ganho</span>
                </button>
                <button
                  type="button"
                  onClick={onOpenShiftModal}
                  className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-3 rounded-2xl bg-slate-800 hover:bg-slate-700 text-rose-300 hover:text-rose-200 font-black text-xs sm:text-sm border border-slate-700 transition active:scale-95"
                >
                  <Square className="w-4 h-4 fill-current" />
                  <span>Encerrar Turno</span>
                </button>
              </>
            ) : (
              <button
                type="button"
                onClick={onOpenShiftModal}
                className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-3.5 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-400 hover:from-emerald-400 hover:to-teal-300 text-slate-950 font-black text-sm shadow-xl shadow-emerald-500/25 transition active:scale-95"
              >
                <Play className="w-4 h-4 fill-current" />
                <span>INICIAR TURNO AGORA</span>
              </button>
            )}
          </div>
        </div>

        {/* ATALHOS RÁPIDOS DE 1 TOQUE */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-4 mt-4 border-t border-slate-800/80">
          <button
            type="button"
            onClick={() => onOpenQuickModal()}
            className="p-2.5 rounded-xl bg-slate-800/60 hover:bg-slate-800 text-left border border-slate-700/60 transition group flex items-center gap-2.5"
          >
            <div className="w-7 h-7 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center shrink-0">
              <DollarSign className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <span className="text-xs font-black text-white group-hover:text-emerald-300 block truncate">Lançar Ganho</span>
              <span className="text-[10px] text-slate-400 block truncate">Uber, 99, inDrive</span>
            </div>
          </button>

          <button
            type="button"
            onClick={onOpenQuickFuel}
            className="p-2.5 rounded-xl bg-slate-800/60 hover:bg-slate-800 text-left border border-slate-700/60 transition group flex items-center gap-2.5"
          >
            <div className="w-7 h-7 rounded-lg bg-amber-500/10 text-amber-400 flex items-center justify-center shrink-0">
              <Fuel className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <span className="text-xs font-black text-white group-hover:text-amber-300 block truncate">Abastecer</span>
              <span className="text-[10px] text-slate-400 block truncate">Litros & Odômetro</span>
            </div>
          </button>

          <button
            type="button"
            onClick={() => onNavigateTab('analyzer')}
            className="p-2.5 rounded-xl bg-slate-800/60 hover:bg-slate-800 text-left border border-slate-700/60 transition group flex items-center gap-2.5"
          >
            <div className="w-7 h-7 rounded-lg bg-teal-500/10 text-teal-400 flex items-center justify-center shrink-0">
              <Calculator className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <span className="text-xs font-black text-white group-hover:text-teal-300 block truncate">Analisar Corrida</span>
              <span className="text-[10px] text-slate-400 block truncate">Score 0-100 em 3s</span>
            </div>
          </button>

          <button
            type="button"
            onClick={() => onNavigateTab('planner')}
            className="p-2.5 rounded-xl bg-slate-800/60 hover:bg-slate-800 text-left border border-slate-700/60 transition group flex items-center gap-2.5"
          >
            <div className="w-7 h-7 rounded-lg bg-sky-500/10 text-sky-400 flex items-center justify-center shrink-0">
              <Calendar className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <span className="text-xs font-black text-white group-hover:text-sky-300 block truncate">Planner Semanal</span>
              <span className="text-[10px] text-slate-400 block truncate">Escalas & Metas</span>
            </div>
          </button>
        </div>
      </div>

      {/* BARRA SUPERIOR DE PERSONALIZAÇÃO E STATUS DO PAINEL */}
      <div className="flex items-center justify-between gap-3 bg-slate-900/60 border border-slate-800 px-4 py-2 rounded-2xl">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-xs font-bold text-slate-300">
            Cockpit Modular • <strong className="text-emerald-400 font-black">{visibleCards.length}</strong> de {dashboardCards.length} módulos ativos
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowCustomizerModal(true)}
            className="flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 px-3 py-1.5 rounded-xl text-xs font-bold border border-slate-700 transition active:scale-95"
            title="Personalizar quais cards aparecem e a sua ordem no painel"
          >
            <Sliders className="w-3.5 h-3.5 text-emerald-400" />
            <span>Personalizar</span>
          </button>
        </div>
      </div>

      {/* RENDERIZAÇÃO DINÂMICA DOS CARDS CONFORME ORDEM E VISIBILIDADE */}
      {visibleCards.map(c => renderCard(c.id))}

      {/* ESTADO SE TODOS OS CARDS FOREM OCULTADOS PELO USUÁRIO */}
      {visibleCards.length === 0 && (
        <div className="bg-white/5 border border-white/10 p-8 rounded-2xl text-center">
          <Sliders className="w-10 h-10 text-slate-500 mx-auto mb-3 opacity-60" />
          <h3 className="text-base font-bold text-white">Nenhum card visível no momento</h3>
          <p className="text-xs text-slate-400 max-w-sm mx-auto mt-1 mb-4">
            Você ocultou todos os cards do seu painel. Ative os que deseja visualizar no seu dia a dia.
          </p>
          <button
            onClick={() => setShowCustomizerModal(true)}
            className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black px-4 py-2 rounded-xl text-xs transition"
          >
            Configurar Cards do Painel
          </button>
        </div>
      )}

      {/* MODAL DE PERSONALIZAÇÃO RÁPIDA */}
      <DashboardCustomizerModal
        isOpen={showCustomizerModal}
        onClose={() => setShowCustomizerModal(false)}
      />
    </div>
  );
};

const BarChart3Icon = () => (
  <svg className="w-4 h-4 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
  </svg>
);
