import React, { useState } from 'react';
import { useDriver } from '../context/DriverContext';
import { formatCurrency, safeDivide } from '../utils/calc';
import { Target, Award, Calendar, TrendingUp, CheckCircle, Edit2, AlertCircle } from 'lucide-react';

export const GoalsView: React.FC = () => {
  const { profile, updateProfile, sessions } = useDriver();

  const [isEditing, setIsEditing] = useState(false);
  const [daily, setDaily] = useState(profile.dailyGoal.toString());
  const [weekly, setWeekly] = useState(profile.weeklyGoal.toString());
  const [monthly, setMonthly] = useState(profile.monthlyGoal.toString());
  const [annual, setAnnual] = useState(profile.annualGoal.toString());

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    updateProfile({
      dailyGoal: parseFloat(daily) || 250,
      weeklyGoal: parseFloat(weekly) || 1500,
      monthlyGoal: parseFloat(monthly) || 6000,
      annualGoal: parseFloat(annual) || 72000,
    });
    setIsEditing(false);
  };

  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth();
  const todayStr = now.toISOString().split('T')[0];

  // Cálculos do mês atual
  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
  const currentDayOfMonth = now.getDate();
  const remainingDaysInMonth = Math.max(1, daysInMonth - currentDayOfMonth);

  // Mês atual sessões
  const monthlySessions = sessions.filter(s => {
    const d = new Date(s.startTime);
    return d.getFullYear() === currentYear && d.getMonth() === currentMonth;
  });

  const monthGross = monthlySessions.reduce((acc, s) => acc + s.grossEarnings + s.tips, 0);
  const monthRemaining = Math.max(0, profile.monthlyGoal - monthGross);
  const neededPerDay = safeDivide(monthRemaining, remainingDaysInMonth);
  const monthProgress = Math.min(100, Math.round(safeDivide(monthGross, profile.monthlyGoal) * 100));

  // Projeção no ritmo atual
  const dailyAverageSoFar = safeDivide(monthGross, Math.max(1, currentDayOfMonth));
  const projectedMonthEnd = monthGross + (dailyAverageSoFar * remainingDaysInMonth);

  // Semana atual
  const currentWeekSessions = sessions.filter(s => {
    const d = new Date(s.startTime);
    const diff = Math.floor((now.getTime() - d.getTime()) / (1000 * 3600 * 24));
    return diff >= 0 && diff < 7;
  });
  const weekGross = currentWeekSessions.reduce((acc, s) => acc + s.grossEarnings + s.tips, 0);
  const weekProgress = Math.min(100, Math.round(safeDivide(weekGross, profile.weeklyGoal) * 100));

  // Hoje
  const todaySessions = sessions.filter(s => s.startTime.startsWith(todayStr));
  const todayGross = todaySessions.reduce((acc, s) => acc + s.grossEarnings + s.tips, 0);
  const todayProgress = Math.min(100, Math.round(safeDivide(todayGross, profile.dailyGoal) * 100));

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white/5 backdrop-blur-lg border border-white/10 p-5 rounded-2xl">
        <div>
          <h2 className="text-base sm:text-lg font-black text-white tracking-tight flex items-center gap-2">
            <Target className="w-5 h-5 text-emerald-400" />
            METAS DE FATURAMENTO & PROGRESSO
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Acompanhe o ritmo diário necessário para atingir seus objetivos financeiros.
          </p>
        </div>

        <button
          onClick={() => setIsEditing(!isEditing)}
          className="bg-white/10 hover:bg-white/15 text-slate-200 font-bold px-3.5 py-1.5 rounded-xl text-xs border border-white/10 flex items-center gap-1.5 self-start sm:self-auto transition"
        >
          <Edit2 className="w-3.5 h-3.5" />
          {isEditing ? 'Fechar' : 'Ajustar Metas'}
        </button>
      </div>

      {/* FORMULÁRIO DE EDIÇÃO */}
      {isEditing && (
        <form onSubmit={handleSave} className="bg-white/5 backdrop-blur-lg border border-emerald-500/30 p-5 rounded-2xl space-y-4">
          <h3 className="text-xs font-black text-emerald-400 uppercase tracking-wider">
            CONFIGURAR SUAS METAS
          </h3>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div>
              <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Meta Diária (R$)</label>
              <input type="number" value={daily} onChange={e => setDaily(e.target.value)} className="w-full bg-black/40 border border-white/15 rounded-xl px-3 py-2 text-xs text-emerald-300 font-bold" />
            </div>
            <div>
              <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Meta Semanal (R$)</label>
              <input type="number" value={weekly} onChange={e => setWeekly(e.target.value)} className="w-full bg-black/40 border border-white/15 rounded-xl px-3 py-2 text-xs text-emerald-300 font-bold" />
            </div>
            <div>
              <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Meta Mensal (R$)</label>
              <input type="number" value={monthly} onChange={e => setMonthly(e.target.value)} className="w-full bg-black/40 border border-white/15 rounded-xl px-3 py-2 text-xs text-emerald-300 font-bold" />
            </div>
            <div>
              <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Meta Anual (R$)</label>
              <input type="number" value={annual} onChange={e => setAnnual(e.target.value)} className="w-full bg-black/40 border border-white/15 rounded-xl px-3 py-2 text-xs text-emerald-300 font-bold" />
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => setIsEditing(false)} className="px-3 py-1.5 rounded-xl text-xs font-bold text-slate-400">
              Cancelar
            </button>
            <button type="submit" className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 px-4 py-1.5 rounded-xl text-xs font-black">
              Salvar Metas
            </button>
          </div>
        </form>
      )}

      {/* META MENSAL EM DESTAQUE (SECTION 16) */}
      <div className="bg-white/5 backdrop-blur-lg border border-white/10 p-5 sm:p-6 rounded-3xl space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Award className="w-5 h-5 text-emerald-400" />
            <span className="text-xs font-black text-white uppercase tracking-wider">
              META MENSAL ({formatCurrency(profile.monthlyGoal)})
            </span>
          </div>
          <span className="text-xl font-black text-emerald-400">{monthProgress}%</span>
        </div>

        {/* BARRA DE PROGRESSO */}
        <div className="w-full bg-slate-900/80 rounded-full h-4 overflow-hidden p-0.5 border border-white/10">
          <div
            className="bg-gradient-to-r from-emerald-500 via-teal-400 to-emerald-300 h-full rounded-full transition-all duration-700 ease-out shadow-lg shadow-emerald-500/30"
            style={{ width: `${monthProgress}%` }}
          />
        </div>

        {/* 4 CARDS DETALHADOS DE PROJEÇÃO */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2 text-center">
          <div className="bg-black/30 p-3 rounded-xl border border-white/5">
            <span className="text-[10px] font-bold text-slate-400 uppercase">REALIZADO NO MÊS</span>
            <div className="text-base font-black text-emerald-400 mt-0.5">
              {formatCurrency(monthGross)}
            </div>
          </div>

          <div className="bg-black/30 p-3 rounded-xl border border-white/5">
            <span className="text-[10px] font-bold text-slate-400 uppercase">FALTA PARA A META</span>
            <div className="text-base font-black text-amber-300 mt-0.5">
              {formatCurrency(monthRemaining)}
            </div>
          </div>

          <div className="bg-black/30 p-3 rounded-xl border border-white/5">
            <span className="text-[10px] font-bold text-slate-400 uppercase">DIAS RESTANTES</span>
            <div className="text-base font-black text-slate-200 mt-0.5">
              {remainingDaysInMonth} dias
            </div>
          </div>

          <div className="bg-emerald-500/10 p-3 rounded-xl border border-emerald-500/30">
            <span className="text-[10px] font-black text-emerald-400 uppercase">NECESSÁRIO / DIA</span>
            <div className="text-base font-black text-emerald-300 mt-0.5">
              {formatCurrency(neededPerDay)}
            </div>
          </div>
        </div>

        {/* PROJEÇÃO FINAL DE MÊS */}
        <div className="bg-white/5 p-3.5 rounded-xl border border-white/10 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-emerald-400" />
            <span className="text-slate-300">
              Ritmo diário atual: <strong>{formatCurrency(dailyAverageSoFar)}/dia</strong>
            </span>
          </div>
          <div className="text-right">
            <span className="text-slate-400 mr-1.5">Projeção no fim do mês:</span>
            <strong className={`font-black ${projectedMonthEnd >= profile.monthlyGoal ? 'text-emerald-400' : 'text-amber-300'}`}>
              {formatCurrency(projectedMonthEnd)}
            </strong>
          </div>
        </div>
      </div>

      {/* METAS DIÁRIA E SEMANAL */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* META DIÁRIA */}
        <div className="bg-white/5 backdrop-blur-lg border border-white/10 p-5 rounded-2xl space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-black text-slate-200 uppercase">META HOJE ({formatCurrency(profile.dailyGoal)})</span>
            <span className="text-sm font-black text-emerald-400">{todayProgress}%</span>
          </div>
          <div className="w-full bg-slate-900 rounded-full h-2.5 overflow-hidden border border-white/10">
            <div className="bg-emerald-400 h-full rounded-full" style={{ width: `${todayProgress}%` }} />
          </div>
          <div className="flex justify-between text-xs text-slate-400">
            <span>Realizado: <strong className="text-emerald-300">{formatCurrency(todayGross)}</strong></span>
            <span>Falta: <strong className="text-slate-300">{formatCurrency(Math.max(0, profile.dailyGoal - todayGross))}</strong></span>
          </div>
        </div>

        {/* META SEMANAL */}
        <div className="bg-white/5 backdrop-blur-lg border border-white/10 p-5 rounded-2xl space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-black text-slate-200 uppercase">META SEMANAL ({formatCurrency(profile.weeklyGoal)})</span>
            <span className="text-sm font-black text-teal-400">{weekProgress}%</span>
          </div>
          <div className="w-full bg-slate-900 rounded-full h-2.5 overflow-hidden border border-white/10">
            <div className="bg-teal-400 h-full rounded-full" style={{ width: `${weekProgress}%` }} />
          </div>
          <div className="flex justify-between text-xs text-slate-400">
            <span>Realizado: <strong className="text-teal-300">{formatCurrency(weekGross)}</strong></span>
            <span>Falta: <strong className="text-slate-300">{formatCurrency(Math.max(0, profile.weeklyGoal - weekGross))}</strong></span>
          </div>
        </div>
      </div>
    </div>
  );
};
