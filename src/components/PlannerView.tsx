import React, { useState, useMemo } from 'react';
import { useDriver } from '../context/DriverContext';
import { PlannerEvent, PlannerEventType, PlatformType, RecurringScheduleDay } from '../types';
import { formatCurrency, safeDivide } from '../utils/calc';
import {
  Calendar as CalendarIcon,
  Clock,
  Target,
  Plus,
  Edit2,
  Trash2,
  Copy,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Repeat,
  Layers,
  Fuel,
} from 'lucide-react';

interface PlannerViewProps {
  onOpenFuelAdvisor?: () => void;
}

export const PlannerView: React.FC<PlannerViewProps> = ({ onOpenFuelAdvisor }) => {
  const {
    plannerEvents,
    recurringSchedule,
    addPlannerEvent,
    updatePlannerEvent,
    deletePlannerEvent,
    setRecurringSchedule,
    applyRecurringScheduleToRange,
    duplicateScheduleToWeek,
    sessions,
  } = useDriver();

  const [viewMode, setViewMode] = useState<'day' | 'week' | 'month' | 'recurring'>('week');
  const [selectedDate, setSelectedDate] = useState<string>(() => new Date().toISOString().split('T')[0]);
  const [showEventModal, setShowEventModal] = useState(false);
  const [editingEvent, setEditingEvent] = useState<PlannerEvent | null>(null);

  // Formulário do modal de evento
  const [formDate, setFormDate] = useState(selectedDate);
  const [formType, setFormType] = useState<PlannerEventType>('work');
  const [formStartTime, setFormStartTime] = useState('06:00');
  const [formEndTime, setFormEndTime] = useState('14:00');
  const [formTargetEarnings, setFormTargetEarnings] = useState('250');
  const [formPlatforms, setFormPlatforms] = useState<PlatformType[]>(['Uber', '99']);
  const [formNotes, setFormNotes] = useState('');

  // Escala recorrente state
  const [recSchedule, setRecSchedule] = useState<RecurringScheduleDay[]>(recurringSchedule);

  // Mapeamento de Cores e Nomes
  const typeConfig: Record<PlannerEventType, { label: string; badgeClass: string; dotClass: string; bgClass: string }> = {
    work: {
      label: '🟢 TRABALHO',
      badgeClass: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
      dotClass: 'bg-emerald-400',
      bgClass: 'hover:border-emerald-500/40',
    },
    off: {
      label: '🔵 FOLGA',
      badgeClass: 'bg-sky-500/20 text-sky-300 border-sky-500/30',
      dotClass: 'bg-sky-400',
      bgClass: 'hover:border-sky-500/40',
    },
    goal: {
      label: '🟡 META',
      badgeClass: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
      dotClass: 'bg-amber-400',
      bgClass: 'hover:border-amber-500/40',
    },
    maintenance: {
      label: '🟠 MANUTENÇÃO',
      badgeClass: 'bg-orange-500/20 text-orange-300 border-orange-500/30',
      dotClass: 'bg-orange-400',
      bgClass: 'hover:border-orange-500/40',
    },
    appointment: {
      label: '🟣 COMPROMISSO',
      badgeClass: 'bg-purple-500/20 text-purple-300 border-purple-500/30',
      dotClass: 'bg-purple-400',
      bgClass: 'hover:border-purple-500/40',
    },
    other: {
      label: '🔴 OUTRO',
      badgeClass: 'bg-rose-500/20 text-rose-300 border-rose-500/30',
      dotClass: 'bg-rose-400',
      bgClass: 'hover:border-rose-500/40',
    },
  };

  // Funções de data
  const currentWeekDays = useMemo(() => {
    const curr = new Date(selectedDate + 'T00:00:00');
    const first = curr.getDate() - curr.getDay(); // Domingo
    const days: string[] = [];
    for (let i = 0; i < 7; i++) {
      const next = new Date(curr.setDate(first + i));
      days.push(next.toISOString().split('T')[0]);
    }
    return days;
  }, [selectedDate]);

  const openNewEventForDate = (date: string) => {
    const existing = plannerEvents.find(e => e.date === date);
    if (existing) {
      setEditingEvent(existing);
      setFormDate(existing.date);
      setFormType(existing.type);
      setFormStartTime(existing.startTime || '06:00');
      setFormEndTime(existing.endTime || '14:00');
      setFormTargetEarnings(existing.targetEarnings.toString());
      setFormPlatforms(existing.platforms || ['Uber']);
      setFormNotes(existing.notes || '');
    } else {
      setEditingEvent(null);
      setFormDate(date);
      setFormType('work');
      setFormStartTime('06:00');
      setFormEndTime('14:00');
      setFormTargetEarnings('250');
      setFormPlatforms(['Uber', '99']);
      setFormNotes('');
    }
    setShowEventModal(true);
  };

  const handleSaveEvent = (e: React.FormEvent) => {
    e.preventDefault();
    const payload = {
      date: formDate,
      type: formType,
      startTime: formStartTime,
      endTime: formEndTime,
      targetEarnings: parseFloat(formTargetEarnings) || 0,
      platforms: formPlatforms,
      notes: formNotes,
    };

    if (editingEvent) {
      updatePlannerEvent(editingEvent.id, payload);
    } else {
      addPlannerEvent(payload);
    }
    setShowEventModal(false);
  };

  const togglePlatform = (p: PlatformType) => {
    setFormPlatforms(prev =>
      prev.includes(p) ? prev.filter(item => item !== p) : [...prev, p]
    );
  };

  const handleApplyRecurringWeek = () => {
    applyRecurringScheduleToRange(currentWeekDays[0], 7);
  };

  const handleApplyRecurringMonth = () => {
    applyRecurringScheduleToRange(currentWeekDays[0], 30);
  };

  const handleSaveRecurringModel = () => {
    setRecurringSchedule(recSchedule);
    alert('Modelo de escala semanal salvo com sucesso!');
  };

  const changeSelectedDate = (days: number) => {
    const d = new Date(selectedDate + 'T00:00:00');
    d.setDate(d.getDate() + days);
    setSelectedDate(d.toISOString().split('T')[0]);
  };

  const dayNames = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];

  return (
    <div className="space-y-6">
      {/* HEADER DO PLANNER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white/5 backdrop-blur-lg border border-white/10 p-4 sm:p-5 rounded-2xl">
        <div>
          <h2 className="text-base sm:text-lg font-black text-white tracking-tight flex items-center gap-2">
            <CalendarIcon className="w-5 h-5 text-emerald-400" />
            PLANNER INTELIGENTE & ESCALAS
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Organize seus turnos, defina metas diárias e compare planejado vs realizado.
          </p>
        </div>

        {/* TABS DE VISUALIZAÇÃO */}
        <div className="flex items-center gap-1 bg-black/40 p-1 rounded-xl border border-white/10 self-start sm:self-auto">
          {[
            { id: 'day', label: 'Dia' },
            { id: 'week', label: 'Semana' },
            { id: 'month', label: 'Mês' },
            { id: 'recurring', label: 'Escala Recorrente' },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setViewMode(tab.id as any)}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition ${
                viewMode === tab.id
                  ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* BARRA DE NAVEGAÇÃO DE DATAS (QUANDO NÃO EM RECORRENTE) */}
      {viewMode !== 'recurring' && (
        <div className="flex items-center justify-between bg-white/5 backdrop-blur-lg border border-white/10 px-4 py-3 rounded-2xl">
          <div className="flex items-center gap-2">
            <button
              onClick={() => changeSelectedDate(viewMode === 'day' ? -1 : -7)}
              className="p-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 transition"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={() => setSelectedDate(new Date().toISOString().split('T')[0])}
              className="text-xs font-bold text-emerald-400 hover:underline px-2"
            >
              Hoje
            </button>
            <button
              onClick={() => changeSelectedDate(viewMode === 'day' ? 1 : 7)}
              className="p-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 transition"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <div className="text-xs sm:text-sm font-bold text-slate-200">
            {viewMode === 'week' ? (
              <span>
                Semana de {new Date(currentWeekDays[0] + 'T00:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })} a{' '}
                {new Date(currentWeekDays[6] + 'T00:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}
              </span>
            ) : (
              <span>{new Date(selectedDate + 'T00:00:00').toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' })}</span>
            )}
          </div>

          <div className="flex items-center gap-2">
            {onOpenFuelAdvisor && (
              <button
                onClick={onOpenFuelAdvisor}
                className="text-xs font-bold text-amber-300 bg-amber-500/10 hover:bg-amber-500/20 px-2.5 py-1.5 rounded-xl border border-amber-500/30 flex items-center gap-1.5 transition"
                title="Consultar se deve abastecer hoje com base na escala"
              >
                <Fuel className="w-3.5 h-3.5 text-amber-400" />
                <span className="hidden sm:inline">Abastecimento Hoje?</span>
              </button>
            )}

            <button
              onClick={handleApplyRecurringWeek}
              className="text-xs font-bold text-slate-300 bg-white/10 hover:bg-white/15 px-2.5 py-1.5 rounded-xl border border-white/10 flex items-center gap-1.5 transition"
              title="Aplica seu modelo padrão de escala aos dias desta semana"
            >
              <Repeat className="w-3.5 h-3.5 text-emerald-400" />
              <span className="hidden sm:inline">Repetir Escala</span>
            </button>
          </div>
        </div>
      )}

      {/* 1. VISUALIZAÇÃO: SEMANA */}
      {viewMode === 'week' && (
        <div className="grid grid-cols-1 sm:grid-cols-7 gap-3">
          {currentWeekDays.map((dateStr, idx) => {
            const ev = plannerEvents.find(e => e.date === dateStr);
            const dateObj = new Date(dateStr + 'T00:00:00');
            const isToday = dateStr === new Date().toISOString().split('T')[0];

            // Sessões reais do dia para cálculo de realizado
            const daySessions = sessions.filter(s => s.startTime.startsWith(dateStr));
            const realizedGross = daySessions.reduce((acc, s) => acc + s.grossEarnings + s.tips, 0) || ev?.realizedGross || 0;
            const target = ev?.targetEarnings || 0;

            let achievementStatus: 'ATTAINED' | 'PARTIAL' | 'NOT_ATTAINED' | 'OFF' = 'OFF';
            if (ev?.type === 'work' && target > 0) {
              const pct = (realizedGross / target) * 100;
              if (pct >= 100) achievementStatus = 'ATTAINED';
              else if (pct >= 50) achievementStatus = 'PARTIAL';
              else achievementStatus = 'NOT_ATTAINED';
            }

            return (
              <div
                key={dateStr}
                onClick={() => openNewEventForDate(dateStr)}
                className={`bg-white/5 backdrop-blur-lg border p-3.5 rounded-2xl cursor-pointer transition relative group flex flex-col justify-between min-h-[170px] ${
                  isToday ? 'border-emerald-500/50 shadow-lg shadow-emerald-500/10' : 'border-white/10 hover:border-white/20'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-slate-400 uppercase">
                      {dayNames[dateObj.getDay()]}
                    </span>
                    <span className={`text-xs font-black px-2 py-0.5 rounded-lg ${isToday ? 'bg-emerald-500 text-slate-950 font-black' : 'text-slate-300'}`}>
                      {dateObj.getDate()}
                    </span>
                  </div>

                  {/* STATUS / TIPO */}
                  {ev ? (
                    <div className="mt-2.5">
                      <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-md border ${typeConfig[ev.type].badgeClass}`}>
                        {typeConfig[ev.type].label}
                      </span>

                      {ev.type === 'work' && (
                        <div className="mt-2 space-y-1">
                          <div className="text-[11px] text-slate-300 font-semibold flex items-center gap-1">
                            <Clock className="w-3 h-3 text-slate-400" />
                            {ev.startTime} - {ev.endTime}
                          </div>
                          <div className="text-[11px] text-slate-400 flex items-center gap-1">
                            <Target className="w-3 h-3 text-emerald-400" />
                            Meta: <strong className="text-slate-200">{formatCurrency(ev.targetEarnings)}</strong>
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="mt-4 text-center text-[11px] text-slate-500 font-medium py-3 group-hover:text-slate-300 transition">
                      + Adicionar dia
                    </div>
                  )}
                </div>

                {/* REALIZADO VS META (PÓS-EXPEDIENTE) */}
                {ev && ev.type === 'work' && (
                  <div className="mt-3 pt-2 border-t border-white/10">
                    <div className="flex justify-between items-center text-[10px]">
                      <span className="text-slate-400">Realizado:</span>
                      <span className="font-bold text-emerald-400">{formatCurrency(realizedGross)}</span>
                    </div>

                    {realizedGross > 0 && target > 0 && (
                      <div className="mt-1">
                        {achievementStatus === 'ATTAINED' && (
                          <span className="text-[9px] font-black text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/30 block text-center">
                            META ATINGIDA
                          </span>
                        )}
                        {achievementStatus === 'PARTIAL' && (
                          <span className="text-[9px] font-black text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/30 block text-center">
                            META PARCIAL ({Math.round((realizedGross / target) * 100)}%)
                          </span>
                        )}
                        {achievementStatus === 'NOT_ATTAINED' && (
                          <span className="text-[9px] font-black text-rose-400 bg-rose-500/10 px-1.5 py-0.5 rounded border border-rose-500/30 block text-center">
                            NÃO ATINGIDA
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* 2. VISUALIZAÇÃO: DIA */}
      {viewMode === 'day' && (
        <div className="bg-white/5 backdrop-blur-lg border border-white/10 p-6 rounded-2xl space-y-4 max-w-xl mx-auto">
          {(() => {
            const ev = plannerEvents.find(e => e.date === selectedDate);
            const daySessions = sessions.filter(s => s.startTime.startsWith(selectedDate));
            const realizedGross = daySessions.reduce((acc, s) => acc + s.grossEarnings + s.tips, 0) || ev?.realizedGross || 0;
            const realizedExp = daySessions.reduce((acc, s) => acc + s.fuelExpenses + s.otherExpenses, 0) || ev?.realizedExpenses || 0;
            const realizedTrips = daySessions.reduce((acc, s) => acc + s.tripsCount, 0) || ev?.realizedTrips || 0;

            return (
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <span className="text-xs font-bold text-slate-400 uppercase">DETALHES DO DIA</span>
                    <h3 className="text-xl font-black text-white">
                      {new Date(selectedDate + 'T00:00:00').toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long' })}
                    </h3>
                  </div>
                  <button
                    onClick={() => openNewEventForDate(selectedDate)}
                    className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black px-3 py-1.5 rounded-xl text-xs flex items-center gap-1"
                  >
                    <Edit2 className="w-3.5 h-3.5" /> Editar
                  </button>
                </div>

                {ev ? (
                  <div className="space-y-4">
                    <div className="flex items-center gap-2">
                      <span className={`px-3 py-1 rounded-lg text-xs font-black border ${typeConfig[ev.type].badgeClass}`}>
                        {typeConfig[ev.type].label}
                      </span>
                      {ev.platforms && ev.platforms.map(p => (
                        <span key={p} className="text-[11px] bg-white/10 px-2 py-0.5 rounded font-bold text-slate-300">
                          {p}
                        </span>
                      ))}
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="bg-white/5 p-3 rounded-xl border border-white/5">
                        <span className="text-[10px] text-slate-400 font-bold uppercase">HORÁRIO PLANEJADO</span>
                        <div className="text-sm font-bold text-slate-200 mt-1">{ev.startTime || '--'} até {ev.endTime || '--'}</div>
                      </div>
                      <div className="bg-white/5 p-3 rounded-xl border border-white/5">
                        <span className="text-[10px] text-slate-400 font-bold uppercase">META DE GANHOS</span>
                        <div className="text-sm font-black text-emerald-400 mt-1">{formatCurrency(ev.targetEarnings)}</div>
                      </div>
                    </div>

                    {ev.notes && (
                      <div className="bg-white/5 p-3 rounded-xl border border-white/5 text-xs text-slate-300">
                        <strong className="text-slate-400 block mb-1">Observações:</strong>
                        {ev.notes}
                      </div>
                    )}

                    {/* COMPARAÇÃO PLANEJADO VS REALIZADO */}
                    <div className="p-4 rounded-xl bg-black/40 border border-white/10 space-y-2">
                      <div className="text-xs font-black text-slate-300 uppercase tracking-wider">
                        PÓS-EXPEDIENTE (REALIZADO)
                      </div>
                      <div className="grid grid-cols-3 gap-2 text-center pt-2">
                        <div>
                          <span className="text-[10px] text-slate-400">GANHO REAL</span>
                          <div className="text-sm font-black text-emerald-400">{formatCurrency(realizedGross)}</div>
                        </div>
                        <div>
                          <span className="text-[10px] text-slate-400">DESPESAS</span>
                          <div className="text-sm font-black text-rose-400">{formatCurrency(realizedExp)}</div>
                        </div>
                        <div>
                          <span className="text-[10px] text-slate-400">CORRIDAS</span>
                          <div className="text-sm font-black text-slate-200">{realizedTrips}</div>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8 text-slate-400">
                    <p className="text-xs mb-3">Nenhum planejamento registrado para este dia.</p>
                    <button
                      onClick={() => openNewEventForDate(selectedDate)}
                      className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold px-4 py-2 rounded-xl text-xs"
                    >
                      + Planejar Este Dia
                    </button>
                  </div>
                )}
              </div>
            );
          })()}
        </div>
      )}

      {/* 3. VISUALIZAÇÃO: MÊS */}
      {viewMode === 'month' && (
        <div className="bg-white/5 backdrop-blur-lg border border-white/10 p-5 rounded-2xl space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-black text-white uppercase tracking-wider">VISÃO GERAL DO MÊS</h3>
            <button
              onClick={handleApplyRecurringMonth}
              className="text-xs font-bold bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/30 px-3 py-1.5 rounded-xl transition"
            >
              Preencher Mês com Escala Padrão
            </button>
          </div>

          <div className="grid grid-cols-7 gap-2 text-center text-[11px] font-bold text-slate-400 mb-1">
            <span>DOM</span><span>SEG</span><span>TER</span><span>QUA</span><span>QUI</span><span>SEX</span><span>SÁB</span>
          </div>

          {/* Grid de 35 dias */}
          <div className="grid grid-cols-7 gap-2">
            {Array.from({ length: 35 }).map((_, i) => {
              const d = new Date();
              d.setDate(d.getDate() - d.getDay() + i);
              const dateStr = d.toISOString().split('T')[0];
              const ev = plannerEvents.find(e => e.date === dateStr);

              return (
                <div
                  key={dateStr}
                  onClick={() => openNewEventForDate(dateStr)}
                  className="bg-white/5 hover:bg-white/10 border border-white/5 rounded-xl p-2 min-h-[60px] text-left cursor-pointer transition flex flex-col justify-between"
                >
                  <span className="text-[10px] font-bold text-slate-400">{d.getDate()}</span>
                  {ev && (
                    <div className="mt-1">
                      <span className={`w-2 h-2 rounded-full inline-block mr-1 ${typeConfig[ev.type].dotClass}`} />
                      <span className="text-[9px] font-bold text-slate-300 truncate">
                        {ev.type === 'work' ? `R$${ev.targetEarnings}` : ev.type}
                      </span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 4. VISUALIZAÇÃO: ESCALA RECORRENTE (MODELO SEMANAL) */}
      {viewMode === 'recurring' && (
        <div className="bg-white/5 backdrop-blur-lg border border-white/10 p-5 sm:p-6 rounded-2xl space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-black text-white uppercase tracking-wider flex items-center gap-2">
                <Repeat className="w-4 h-4 text-emerald-400" />
                MODELO DE ESCALA SEMANAL PADRÃO
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Configure sua rotina padrão de Segunda a Domingo. Você pode aplicá-la em 1 toque para qualquer semana ou mês.
              </p>
            </div>
            <button
              onClick={handleSaveRecurringModel}
              className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black px-4 py-2 rounded-xl text-xs shadow-lg shadow-emerald-500/20 active:scale-95 transition"
            >
              SALVAR MODELO
            </button>
          </div>

          <div className="space-y-2.5">
            {recSchedule.map((day, idx) => (
              <div
                key={day.dayOfWeek}
                className="bg-white/5 p-3.5 rounded-xl border border-white/5 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
              >
                <div className="flex items-center gap-3">
                  <span className="w-24 text-xs font-black text-slate-200">
                    {dayNames[day.dayOfWeek]}
                  </span>

                  <select
                    value={day.type}
                    onChange={e => {
                      const newType = e.target.value as PlannerEventType;
                      setRecSchedule(prev =>
                        prev.map((d, i) => (i === idx ? { ...d, type: newType } : d))
                      );
                    }}
                    className="bg-black/50 border border-white/15 rounded-lg px-2 py-1 text-xs text-slate-200 font-bold"
                  >
                    <option value="work">🟢 TRABALHO</option>
                    <option value="off">🔵 FOLGA</option>
                    <option value="goal">🟡 META</option>
                    <option value="maintenance">🟠 MANUTENÇÃO</option>
                    <option value="appointment">🟣 COMPROMISSO</option>
                    <option value="other">🔴 OUTRO</option>
                  </select>
                </div>

                {day.type === 'work' && (
                  <div className="flex flex-wrap items-center gap-2">
                    <div className="flex items-center gap-1 text-xs text-slate-400">
                      <span>Horário:</span>
                      <input
                        type="time"
                        value={day.startTime}
                        onChange={e => {
                          const val = e.target.value;
                          setRecSchedule(prev => prev.map((d, i) => (i === idx ? { ...d, startTime: val } : d)));
                        }}
                        className="bg-black/40 border border-white/15 rounded px-1.5 py-0.5 text-xs text-white"
                      />
                      <span>-</span>
                      <input
                        type="time"
                        value={day.endTime}
                        onChange={e => {
                          const val = e.target.value;
                          setRecSchedule(prev => prev.map((d, i) => (i === idx ? { ...d, endTime: val } : d)));
                        }}
                        className="bg-black/40 border border-white/15 rounded px-1.5 py-0.5 text-xs text-white"
                      />
                    </div>

                    <div className="flex items-center gap-1 text-xs text-slate-400">
                      <span>Meta: R$</span>
                      <input
                        type="number"
                        value={day.targetEarnings}
                        onChange={e => {
                          const val = parseFloat(e.target.value) || 0;
                          setRecSchedule(prev => prev.map((d, i) => (i === idx ? { ...d, targetEarnings: val } : d)));
                        }}
                        className="bg-black/40 border border-white/15 rounded px-1.5 py-0.5 text-xs text-emerald-400 font-bold w-16"
                      />
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* MODAL DE ADICIONAR / EDITAR EVENTO DO PLANNER */}
      {showEventModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
          <div className="bg-slate-900 border border-white/15 rounded-3xl w-full max-w-md p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-black text-white">
                {editingEvent ? 'Editar Dia no Planner' : 'Planejar Novo Dia'}
              </h3>
              <button
                onClick={() => setShowEventModal(false)}
                className="text-slate-400 hover:text-white p-1"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveEvent} className="space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-400 uppercase block mb-1">Data</label>
                <input
                  type="date"
                  value={formDate}
                  onChange={e => setFormDate(e.target.value)}
                  className="w-full bg-white/5 border border-white/15 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
                  required
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-400 uppercase block mb-1">Tipo de Dia</label>
                <div className="grid grid-cols-3 gap-2">
                  {(Object.keys(typeConfig) as PlannerEventType[]).map(t => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setFormType(t)}
                      className={`px-2 py-2 rounded-xl text-xs font-bold border text-center transition ${
                        formType === t
                          ? `${typeConfig[t].badgeClass} ring-2 ring-emerald-500/50`
                          : 'bg-white/5 text-slate-400 border-white/10 hover:bg-white/10'
                      }`}
                    >
                      {typeConfig[t].label}
                    </button>
                  ))}
                </div>
              </div>

              {formType === 'work' && (
                <>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-bold text-slate-400 uppercase block mb-1">Início Previsto</label>
                      <input
                        type="time"
                        value={formStartTime}
                        onChange={e => setFormStartTime(e.target.value)}
                        className="w-full bg-white/5 border border-white/15 rounded-xl px-3 py-2 text-sm text-white"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-bold text-slate-400 uppercase block mb-1">Término Previsto</label>
                      <input
                        type="time"
                        value={formEndTime}
                        onChange={e => setFormEndTime(e.target.value)}
                        className="w-full bg-white/5 border border-white/15 rounded-xl px-3 py-2 text-sm text-white"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-400 uppercase block mb-1">Meta de Ganho (R$)</label>
                    <input
                      type="number"
                      step="0.01"
                      value={formTargetEarnings}
                      onChange={e => setFormTargetEarnings(e.target.value)}
                      className="w-full bg-white/5 border border-white/15 rounded-xl px-3 py-2 text-sm text-emerald-400 font-bold"
                      placeholder="250.00"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-400 uppercase block mb-1">Plataformas em Foco</label>
                    <div className="flex flex-wrap gap-2">
                      {(['Uber', '99', 'inDrive', 'Particular', 'Outro'] as PlatformType[]).map(p => (
                        <button
                          key={p}
                          type="button"
                          onClick={() => togglePlatform(p)}
                          className={`px-3 py-1 rounded-lg text-xs font-bold border transition ${
                            formPlatforms.includes(p)
                              ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                              : 'bg-white/5 text-slate-400 border-white/10'
                          }`}
                        >
                          {p}
                        </button>
                      ))}
                    </div>
                  </div>
                </>
              )}

              <div>
                <label className="text-xs font-bold text-slate-400 uppercase block mb-1">Observações</label>
                <textarea
                  value={formNotes}
                  onChange={e => setFormNotes(e.target.value)}
                  className="w-full bg-white/5 border border-white/15 rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
                  rows={2}
                  placeholder="Ex: Focar em aeroporto no início da manhã..."
                />
              </div>

              <div className="flex items-center justify-between pt-2">
                {editingEvent ? (
                  <button
                    type="button"
                    onClick={() => {
                      deletePlannerEvent(editingEvent.id);
                      setShowEventModal(false);
                    }}
                    className="text-rose-400 hover:text-rose-300 text-xs font-bold flex items-center gap-1"
                  >
                    <Trash2 className="w-3.5 h-3.5" /> Excluir Dia
                  </button>
                ) : <div />}

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setShowEventModal(false)}
                    className="bg-white/10 hover:bg-white/15 text-slate-300 font-bold px-4 py-2 rounded-xl text-xs"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black px-5 py-2 rounded-xl text-xs shadow-lg shadow-emerald-500/20"
                  >
                    Salvar
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
