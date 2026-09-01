import React, { useState, useMemo } from 'react';
import { useDriver } from '../context/DriverContext';
import {
  formatCurrency,
  formatKm,
  formatHours,
  safeDivide,
} from '../utils/calc';
import { FuelAdvisorCard } from './FuelAdvisorCard';
import { SmartTipsCard } from './SmartTipsCard';
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
    loadDemoData,
  } = useDriver();

  const [chartMetric, setChartMetric] = useState<'gross' | 'net' | 'trips' | 'hours'>('gross');

  // Dados de hoje
  const todayStr = new Date().toISOString().split('T')[0];
  const todaySessions = useMemo(() => sessions.filter(s => s.startTime.startsWith(todayStr)), [sessions, todayStr]);
  const todayExpensesItems = useMemo(() => expenses.filter(e => e.date === todayStr), [expenses, todayStr]);

  const todayGross = useMemo(() => {
    const fromCompleted = todaySessions.reduce((acc, s) => acc + s.grossEarnings + s.tips, 0);
    const fromActive = activeSession ? activeSession.grossEarnings + activeSession.tips : 0;
    return fromCompleted + fromActive;
  }, [todaySessions, activeSession]);

  const todayExpenses = useMemo(() => {
    const fromSessions = todaySessions.reduce((acc, s) => acc + s.fuelExpenses + s.otherExpenses, 0);
    const fromItems = todayExpensesItems.reduce((acc, e) => acc + e.amount, 0);
    const fromActive = activeSession ? activeSession.fuelExpenses + activeSession.otherExpenses : 0;
    return Math.max(fromSessions, fromItems) + fromActive;
  }, [todaySessions, todayExpensesItems, activeSession]);

  const todayNetProfit = todayGross - todayExpenses;

  const todayTrips = useMemo(() => {
    const fromCompleted = todaySessions.reduce((acc, s) => acc + s.tripsCount, 0);
    const fromActive = activeSession ? activeSession.tripsCount : 0;
    return fromCompleted + fromActive;
  }, [todaySessions, activeSession]);

  const todayKm = useMemo(() => {
    const fromCompleted = todaySessions.reduce((acc, s) => {
      if (s.endOdometer && s.startOdometer) return acc + (s.endOdometer - s.startOdometer);
      return acc;
    }, 0);
    return fromCompleted;
  }, [todaySessions]);

  const todayHoursDecimal = useMemo(() => {
    let total = todaySessions.reduce((acc, s) => {
      if (!s.endTime) return acc;
      return acc + (new Date(s.endTime).getTime() - new Date(s.startTime).getTime()) / 3600000;
    }, 0);
    if (activeSession) {
      const liveHours = (Date.now() - new Date(activeSession.startTime).getTime()) / 3600000;
      total += Math.max(0, liveHours);
    }
    return total;
  }, [todaySessions, activeSession]);

  const ratePerHour = safeDivide(todayGross, todayHoursDecimal);
  const ratePerKm = safeDivide(todayGross, todayKm);
  const costPerKm = safeDivide(todayExpenses, todayKm);
  const goalProgress = Math.min(100, Math.round(safeDivide(todayGross, profile.dailyGoal) * 100));

  // Estatísticas dos últimos 7 dias para o gráfico
  const last7DaysData = useMemo(() => {
    const days: { dateStr: string; label: string; gross: number; expenses: number; net: number; trips: number; hours: number }[] = [];
    const dayNames = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
    
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      const dayName = dayNames[d.getDay()];

      const daySessions = sessions.filter(s => s.startTime.startsWith(dateStr));
      const gross = daySessions.reduce((acc, s) => acc + s.grossEarnings + s.tips, 0);
      const exp = daySessions.reduce((acc, s) => acc + s.fuelExpenses + s.otherExpenses, 0);
      const trips = daySessions.reduce((acc, s) => acc + s.tripsCount, 0);
      const hours = daySessions.reduce((acc, s) => {
        if (!s.endTime) return acc;
        return acc + (new Date(s.endTime).getTime() - new Date(s.startTime).getTime()) / 3600000;
      }, 0);

      days.push({
        dateStr,
        label: i === 0 ? 'Hoje' : dayName,
        gross,
        expenses: exp,
        net: gross - exp,
        trips,
        hours,
      });
    }
    return days;
  }, [sessions]);

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

  return (
    <div className="space-y-6">
      
      {/* COCKPIT PRINCIPAL (4 CARDS DESTAQUE) */}
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

        {/* 2. DESPESAS HOJE */}
        <div className="bg-white/5 backdrop-blur-lg border border-white/10 p-4 sm:p-5 rounded-2xl relative overflow-hidden group hover:border-rose-500/30 transition">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">DESPESAS HOJE</span>
            <div className="w-8 h-8 rounded-xl bg-rose-500/10 text-rose-400 flex items-center justify-center">
              <Fuel className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-rose-400 mt-2 tracking-tight">
            {formatCurrency(todayExpenses)}
          </div>
          <div className="text-[11px] text-slate-400 mt-1">
            Combustível + alimentação
          </div>
        </div>

        {/* 3. LUCRO LÍQUIDO */}
        <div className="bg-white/5 backdrop-blur-lg border border-white/10 p-4 sm:p-5 rounded-2xl relative overflow-hidden group hover:border-white/30 transition">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">LUCRO LÍQUIDO</span>
            <div className="w-8 h-8 rounded-xl bg-white/10 text-white flex items-center justify-center">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-white mt-2 tracking-tight">
            {formatCurrency(todayNetProfit)}
          </div>
          <div className="text-[11px] font-bold text-emerald-400 mt-1">
            {todayGross > 0 ? `${Math.round((todayNetProfit / todayGross) * 100)}% de margem no bolso` : 'Sem lançamentos'}
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

      {/* LINHA DE INDICADORES DE EFICIÊNCIA UNITÁRIA */}
      <div className="bg-white/5 backdrop-blur-lg border border-white/10 p-4 rounded-2xl grid grid-cols-3 gap-2 text-center divide-x divide-white/10">
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

      {/* META DO DIA COM BARRA DE PROGRESSO VISUAL */}
      <div className="bg-white/5 backdrop-blur-lg border border-white/10 p-5 rounded-2xl">
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

      {/* CONSULTOR & SUGESTÃO DE ABASTECIMENTO DO DIA ("DEVO ABASTECER HOJE?") */}
      <FuelAdvisorCard
        onOpenAdvisorModal={onOpenFuelAdvisorModal}
        onOpenQuickFuel={onOpenQuickFuel}
      />

      {/* DICAS INTELIGENTES: HORÁRIOS DE PICO, ROTAS ESTRATÉGICAS E RECOMENDAÇÕES */}
      <SmartTipsCard onNavigateTab={onNavigateTab} />

      {/* GRÁFICO DOS ÚLTIMOS 7 DIAS */}
      <div className="bg-white/5 backdrop-blur-lg border border-white/10 p-5 sm:p-6 rounded-2xl space-y-4">
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

      {/* RESUMO INTELIGENTE (SECTION 4 PROMPT) */}
      <div className="bg-white/5 backdrop-blur-lg border border-white/10 p-5 rounded-2xl">
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

      {/* ÚLTIMOS EXPEDIENTES / ESTADO VAZIO COM GUIA */}
      <div className="bg-white/5 backdrop-blur-lg border border-white/10 p-5 rounded-2xl">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-black text-white uppercase tracking-wider">ÚLTIMOS EXPEDIENTES</h3>
          {sessions.length > 0 && (
            <span className="text-xs font-bold text-slate-400">{sessions.length} turnos registrados</span>
          )}
        </div>

        {sessions.length === 0 ? (
          <div className="text-center py-8 px-4 bg-white/5 rounded-2xl border border-white/5">
            <Car className="w-12 h-12 text-slate-500 mx-auto mb-3 opacity-60" />
            <h4 className="text-base font-bold text-slate-200">Você ainda não registrou nenhum expediente</h4>
            <p className="text-xs text-slate-400 max-w-md mx-auto mt-1 mb-5">
              Inicie seu primeiro turno de trabalho para calcular automaticamente ganhos, horas, km e lucro real.
            </p>
            <div className="flex flex-wrap justify-center gap-3">
              <button
                onClick={onOpenShiftModal}
                className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black px-5 py-2.5 rounded-xl text-xs shadow-lg shadow-emerald-500/20 active:scale-95 transition"
              >
                🚗 INICIAR PRIMEIRO EXPEDIENTE
              </button>
              <button
                onClick={loadDemoData}
                className="bg-white/10 hover:bg-white/15 text-slate-200 font-bold px-4 py-2.5 rounded-xl text-xs border border-white/10 active:scale-95 transition"
              >
                Carregar Dados Demonstrativos
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-2.5">
            {sessions.slice(0, 5).map(s => {
              const dateFormatted = new Date(s.startTime).toLocaleDateString('pt-BR', {
                day: '2-digit',
                month: '2-digit',
                weekday: 'short',
              });
              const kmRodados = s.endOdometer && s.startOdometer ? s.endOdometer - s.startOdometer : 0;
              const gross = s.grossEarnings + s.tips;
              const despesas = s.fuelExpenses + s.otherExpenses;
              const liquido = gross - despesas;

              return (
                <div
                  key={s.id}
                  className="flex items-center justify-between p-3.5 rounded-xl bg-white/5 border border-white/5 hover:border-white/15 transition"
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-2 h-9 rounded-full ${s.status === 'active' ? 'bg-emerald-400 animate-pulse' : 'bg-slate-600'}`} />
                    <div>
                      <div className="text-xs font-bold text-slate-200 capitalize flex items-center gap-2">
                        {dateFormatted}
                        {s.status === 'active' && (
                          <span className="text-[9px] bg-emerald-500/20 text-emerald-300 font-black px-2 py-0.5 rounded-full border border-emerald-500/30">
                            RODANDO
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-slate-400 mt-0.5">
                        {s.tripsCount} corridas • {kmRodados} km • {s.notes || 'Sem observações'}
                      </div>
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="text-sm font-black text-emerald-400">{formatCurrency(gross)}</div>
                    <div className="text-[11px] text-slate-400 font-medium">Líq: {formatCurrency(liquido)}</div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

const BarChart3Icon = () => (
  <svg className="w-4 h-4 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
  </svg>
);
