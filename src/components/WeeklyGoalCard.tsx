import React, { useMemo } from 'react';
import { useDriver } from '../context/DriverContext';
import { formatCurrency, safeDivide } from '../utils/calc';
import { Target, TrendingUp, Calendar, CheckCircle2, ChevronRight, Zap } from 'lucide-react';

interface WeeklyGoalCardProps {
  onNavigateTab?: (tab: string) => void;
}

export const WeeklyGoalCard: React.FC<WeeklyGoalCardProps> = ({ onNavigateTab }) => {
  const { profile, sessions, activeSession } = useDriver();

  // Calcular ganhos acumulados na semana atual (Segunda a Domingo)
  const weekStats = useMemo(() => {
    const now = new Date();
    const currentDay = now.getDay(); // 0 = Domingo, 1 = Segunda, ...
    const diffToMonday = currentDay === 0 ? -6 : 1 - currentDay;
    
    const monday = new Date(now);
    monday.setDate(now.getDate() + diffToMonday);
    monday.setHours(0, 0, 0, 0);

    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    sunday.setHours(23, 59, 59, 999);

    const mondayStr = monday.toISOString().split('T')[0];
    const sundayStr = sunday.toISOString().split('T')[0];

    // Dias restantes na semana incluindo hoje
    const daysRemaining = currentDay === 0 ? 1 : 7 - currentDay + 1;
    const daysPassed = 7 - daysRemaining + 1;

    // Sessões que iniciaram dentro da semana atual
    const thisWeekSessions = sessions.filter(s => {
      const sDate = s.startTime.split('T')[0];
      return sDate >= mondayStr && sDate <= sundayStr;
    });

    let completedGross = thisWeekSessions.reduce((acc, s) => acc + s.grossEarnings + s.tips, 0);
    let completedExpenses = thisWeekSessions.reduce((acc, s) => acc + s.fuelExpenses + s.otherExpenses, 0);
    let completedTrips = thisWeekSessions.reduce((acc, s) => acc + s.tripsCount, 0);

    if (activeSession) {
      const aDate = activeSession.startTime.split('T')[0];
      if (aDate >= mondayStr && aDate <= sundayStr) {
        completedGross += activeSession.grossEarnings + activeSession.tips;
        completedExpenses += activeSession.fuelExpenses + activeSession.otherExpenses;
        completedTrips += activeSession.tripsCount;
      }
    }

    const weeklyGoal = profile.weeklyGoal > 0 ? profile.weeklyGoal : 1500;
    const percent = Math.min(100, Math.round(safeDivide(completedGross, weeklyGoal) * 100));
    const remaining = Math.max(0, weeklyGoal - completedGross);
    const requiredDailyPace = daysRemaining > 0 ? safeDivide(remaining, daysRemaining) : 0;
    const currentDailyAvg = daysPassed > 0 ? safeDivide(completedGross, daysPassed) : 0;

    return {
      mondayFormatted: monday.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' }),
      sundayFormatted: sunday.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' }),
      weeklyGoal,
      completedGross,
      completedExpenses,
      completedTrips,
      percent,
      remaining,
      daysRemaining,
      daysPassed,
      requiredDailyPace,
      currentDailyAvg,
      isGoalBeaten: completedGross >= weeklyGoal,
    };
  }, [sessions, activeSession, profile.weeklyGoal]);

  return (
    <div className="bg-white/5 backdrop-blur-lg border border-white/10 p-5 sm:p-6 rounded-2xl relative overflow-hidden group hover:border-emerald-500/30 transition">
      {/* HEADER DO CARD */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-emerald-500/15 text-emerald-400 flex items-center justify-center border border-emerald-500/30">
            <Target className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-black text-white uppercase tracking-wider">
                PROGRESSO DA META SEMANAL
              </span>
              <span className="text-[10px] font-bold text-slate-400 bg-white/5 px-2 py-0.5 rounded border border-white/10 flex items-center gap-1">
                <Calendar className="w-2.5 h-2.5" />
                {weekStats.mondayFormatted} - {weekStats.sundayFormatted}
              </span>
            </div>
            <p className="text-[11px] text-slate-400">
              Acompanhamento do ritmo para atingir sua meta da semana
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {weekStats.isGoalBeaten ? (
            <span className="text-xs font-black text-emerald-300 bg-emerald-500/20 border border-emerald-500/30 px-2.5 py-1 rounded-full flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5" /> Meta Batida!
            </span>
          ) : (
            <span className="text-xs font-black text-emerald-400">
              {weekStats.percent}% alcançado
            </span>
          )}
          {onNavigateTab && (
            <button
              onClick={() => onNavigateTab('goals')}
              className="text-slate-400 hover:text-white p-1 transition"
              title="Ver metas completas"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* VALORES PRINCIPAIS */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 my-3">
        <div className="bg-white/5 p-3 rounded-xl border border-white/5">
          <span className="text-[10px] font-bold text-slate-400 uppercase block">Faturado na Semana</span>
          <div className="text-lg sm:text-xl font-black text-emerald-400 mt-0.5">
            {formatCurrency(weekStats.completedGross)}
          </div>
          <span className="text-[10px] text-slate-500">{weekStats.completedTrips} corridas</span>
        </div>

        <div className="bg-white/5 p-3 rounded-xl border border-white/5">
          <span className="text-[10px] font-bold text-slate-400 uppercase block">Meta Estabelecida</span>
          <div className="text-lg sm:text-xl font-black text-white mt-0.5">
            {formatCurrency(weekStats.weeklyGoal)}
          </div>
          <span className="text-[10px] text-slate-500">7 dias</span>
        </div>

        <div className="bg-white/5 p-3 rounded-xl border border-white/5">
          <span className="text-[10px] font-bold text-slate-400 uppercase block">
            {weekStats.isGoalBeaten ? 'Excedente' : 'Faltam para Meta'}
          </span>
          <div className={`text-lg sm:text-xl font-black mt-0.5 ${weekStats.isGoalBeaten ? 'text-emerald-300' : 'text-amber-300'}`}>
            {weekStats.isGoalBeaten ? `+${formatCurrency(weekStats.completedGross - weekStats.weeklyGoal)}` : formatCurrency(weekStats.remaining)}
          </div>
          <span className="text-[10px] text-slate-500">{weekStats.daysRemaining} dia(s) restante(s)</span>
        </div>

        <div className="bg-white/5 p-3 rounded-xl border border-white/5">
          <span className="text-[10px] font-bold text-slate-400 uppercase block">Ritmo Diário Necessário</span>
          <div className="text-lg sm:text-xl font-black text-sky-300 mt-0.5">
            {weekStats.isGoalBeaten ? 'Meta Cumprida' : `${formatCurrency(weekStats.requiredDailyPace)}/dia`}
          </div>
          <span className="text-[10px] text-slate-500">Média atual: {formatCurrency(weekStats.currentDailyAvg)}/dia</span>
        </div>
      </div>

      {/* BARRA DE PROGRESSO COM MARCADORES */}
      <div className="space-y-1.5 pt-1">
        <div className="w-full bg-slate-900/80 rounded-full h-3 overflow-hidden p-0.5 border border-white/10 relative">
          <div
            className="bg-gradient-to-r from-emerald-500 via-teal-400 to-cyan-300 h-full rounded-full transition-all duration-700 ease-out shadow-md shadow-emerald-500/20"
            style={{ width: `${weekStats.percent}%` }}
          />
        </div>
        <div className="flex justify-between items-center text-[10px] text-slate-500 px-0.5 font-mono">
          <span>0%</span>
          <span>25%</span>
          <span>50%</span>
          <span>75%</span>
          <span className={weekStats.percent >= 100 ? 'text-emerald-400 font-bold' : ''}>100% Meta</span>
        </div>
      </div>

      {/* NOTA DE STATUS */}
      <div className="mt-3 pt-2.5 border-t border-white/5 flex items-center justify-between text-xs">
        <div className="flex items-center gap-1.5 text-slate-300">
          <Zap className="w-3.5 h-3.5 text-amber-400" />
          {weekStats.isGoalBeaten ? (
            <span className="text-emerald-300 font-medium">Parabéns! Você superou sua meta semanal com folga.</span>
          ) : weekStats.currentDailyAvg >= weekStats.requiredDailyPace ? (
            <span>Você está <strong>no ritmo ideal</strong> para fechar a semana na meta. Mantenha a constância!</span>
          ) : (
            <span>Para atingir a meta, você precisa de <strong>{formatCurrency(weekStats.requiredDailyPace)}</strong> em cada um dos {weekStats.daysRemaining} dias restantes.</span>
          )}
        </div>
        {onNavigateTab && (
          <button
            onClick={() => onNavigateTab('goals')}
            className="text-[11px] font-bold text-emerald-400 hover:text-emerald-300 shrink-0 ml-2"
          >
            Ajustar Meta →
          </button>
        )}
      </div>
    </div>
  );
};
