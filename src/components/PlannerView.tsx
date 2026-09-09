import React, { useState, useMemo } from 'react';
import { useDriver } from '../context/DriverContext';
import {
  PlannerEvent,
  PlannerEventType,
  PlatformType,
  RecurringScheduleDay,
  ExpenseCategory,
  WorkSession,
  EarningItem,
  ExpenseItem,
} from '../types';
import { formatCurrency, safeDivide } from '../utils/calc';
import {
  Calendar as CalendarIcon,
  Clock,
  Target,
  Plus,
  Edit2,
  Trash2,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  Repeat,
  Fuel,
  TrendingUp,
  TrendingDown,
  ArrowUpRight,
  ArrowDownRight,
  DollarSign,
  Wallet,
  Utensils,
  Coffee,
  Wrench,
  Car,
  FileText,
  Filter,
  Search,
  Receipt,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
} from 'lucide-react';

interface PlannerViewProps {
  onOpenFuelAdvisor?: () => void;
  onOpenQuickModal?: (
    tab?: 'earning' | 'ride' | 'fuel' | 'expense' | 'maintenance',
    fuelData?: { liters?: number; pricePerLiter?: number; totalAmount?: number; fuelType?: string },
    initialDate?: string
  ) => void;
  onOpenShiftModal?: () => void;
}

export interface PlannerTransactionItem {
  id: string;
  date: string; // YYYY-MM-DD
  time?: string;
  kind: 'earning' | 'expense';
  source: 'earning' | 'session' | 'expense' | 'session_fuel' | 'session_other';
  title: string;
  categoryOrPlatform: string;
  amount: number;
  tip?: number;
  tripsCount?: number;
  notes?: string;
  canDelete: boolean;
  originalId?: string;
}

export const PlannerView: React.FC<PlannerViewProps> = ({
  onOpenFuelAdvisor,
  onOpenQuickModal,
  onOpenShiftModal,
}) => {
  const {
    plannerEvents,
    recurringSchedule,
    addPlannerEvent,
    updatePlannerEvent,
    deletePlannerEvent,
    setRecurringSchedule,
    applyRecurringScheduleToRange,
    sessions,
    earnings,
    expenses,
    fuelRecords,
    maintenances,
    addEarning,
    deleteEarning,
    addExpense,
    deleteExpense,
    activeStrategy,
    activateStrategy,
    expenseCategories,
    customExpenseCategories,
    syncAllLaunchesToPlanner,
  } = useDriver();

  const [viewMode, setViewMode] = useState<'day' | 'week' | 'month' | 'transactions' | 'recurring'>('week');
  const [selectedDate, setSelectedDate] = useState<string>(() => new Date().toISOString().split('T')[0]);
  const [syncFeedback, setSyncFeedback] = useState<string | null>(null);
  
  // Modais
  const [showEventModal, setShowEventModal] = useState(false);
  const [editingEvent, setEditingEvent] = useState<PlannerEvent | null>(null);
  const [showLaunchModal, setShowLaunchModal] = useState(false);
  const [launchType, setLaunchType] = useState<'earning' | 'expense'>('earning');

  // Formulário do modal de planejamento
  const [formDate, setFormDate] = useState(selectedDate);
  const [formType, setFormType] = useState<PlannerEventType>('work');
  const [formStartTime, setFormStartTime] = useState('06:00');
  const [formEndTime, setFormEndTime] = useState('14:00');
  const [formTargetEarnings, setFormTargetEarnings] = useState('250');
  const [formPlatforms, setFormPlatforms] = useState<PlatformType[]>(['Uber', '99']);
  const [formNotes, setFormNotes] = useState('');

  // Formulário de Novo Lançamento Rápido no Planner
  const [launchDate, setLaunchDate] = useState(selectedDate);
  const [launchPlatform, setLaunchPlatform] = useState<PlatformType>('Uber');
  const [launchEarnAmount, setLaunchEarnAmount] = useState('');
  const [launchEarnTip, setLaunchEarnTip] = useState('');
  const [launchEarnTrips, setLaunchEarnTrips] = useState('1');
  const [launchEarnNotes, setLaunchEarnNotes] = useState('');
  
  const [launchCategory, setLaunchCategory] = useState<ExpenseCategory>('Alimentação');
  const [launchExpAmount, setLaunchExpAmount] = useState('');
  const [launchExpDesc, setLaunchExpDesc] = useState('');

  // Filtros da aba de extrato de lançamentos
  const [txPeriodFilter, setTxPeriodFilter] = useState<'all' | 'today' | 'week' | 'month'>('week');
  const [txTypeFilter, setTxTypeFilter] = useState<'all' | 'earning' | 'expense'>('all');
  const [txSearch, setTxSearch] = useState('');

  // Escala recorrente state
  const [recSchedule, setRecSchedule] = useState<RecurringScheduleDay[]>(recurringSchedule);

  // Cores e configurações dos tipos de agendamento
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

  // Funções de data da semana
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

  // Função central para obter todos os lançamentos financeiros de um determinado dia
  const getDayFinancials = (dateStr: string) => {
    const daySessions = sessions.filter(s => s.startTime && s.startTime.startsWith(dateStr));
    const dayEarnings = earnings.filter(e => e.timestamp && e.timestamp.startsWith(dateStr));
    const dayExpenses = expenses.filter(e => e.date && (e.date === dateStr || e.date.startsWith(dateStr)));

    const earningsItems: PlannerTransactionItem[] = [];
    const expensesItems: PlannerTransactionItem[] = [];

    // 1. Processar ganhos
    dayEarnings.forEach(e => {
      earningsItems.push({
        id: e.id,
        originalId: e.id,
        date: dateStr,
        time: e.timestamp ? e.timestamp.slice(11, 16) : undefined,
        kind: 'earning',
        source: 'earning',
        title: `Ganho ${e.platform}`,
        categoryOrPlatform: e.platform,
        amount: e.amount,
        tip: e.tip || 0,
        tripsCount: e.tripsCount || 1,
        notes: e.notes,
        canDelete: true,
      });
    });

    // Se houver sessões (turnos fechados)
    daySessions.forEach(s => {
      // Se não houver itens avulsos em dayEarnings cobrindo esta data, adicionar os dados da sessão
      if (dayEarnings.length === 0) {
        if (s.platformEarnings && Object.keys(s.platformEarnings).length > 0) {
          Object.entries(s.platformEarnings as Record<string, { amount: number; trips: number }>).forEach(([plat, pData]) => {
            if (pData && pData.amount > 0) {
              earningsItems.push({
                id: `${s.id}-${plat}`,
                date: dateStr,
                time: `${s.startTime.slice(11, 16)} - ${s.endTime ? s.endTime.slice(11, 16) : '...' }`,
                kind: 'earning',
                source: 'session',
                title: `Turno (${plat})`,
                categoryOrPlatform: plat,
                amount: pData.amount,
                tripsCount: pData.trips,
                canDelete: false,
              });
            }
          });
        } else {
          earningsItems.push({
            id: s.id,
            date: dateStr,
            time: `${s.startTime.slice(11, 16)} - ${s.endTime ? s.endTime.slice(11, 16) : '...' }`,
            kind: 'earning',
            source: 'session',
            title: 'Turno Fechado',
            categoryOrPlatform: 'Turno',
            amount: s.grossEarnings,
            tip: s.tips || 0,
            tripsCount: s.tripsCount,
            notes: s.notes,
            canDelete: false,
          });
        }
      }
    });

    // 2. Processar despesas
    dayExpenses.forEach(e => {
      expensesItems.push({
        id: e.id,
        originalId: e.id,
        date: dateStr,
        kind: 'expense',
        source: 'expense',
        title: e.category,
        categoryOrPlatform: e.category,
        amount: e.amount,
        notes: e.description,
        canDelete: true,
      });
    });

    // Despesas de sessões que não foram lançadas em expenses
    daySessions.forEach(s => {
      if (s.fuelExpenses > 0 && !dayExpenses.some(e => e.sessionId === s.id && e.category === 'Combustível')) {
        expensesItems.push({
          id: `${s.id}-fuel`,
          date: dateStr,
          kind: 'expense',
          source: 'session_fuel',
          title: 'Combustível no Turno',
          categoryOrPlatform: 'Combustível',
          amount: s.fuelExpenses,
          notes: 'Abastecimento em posto durante o expediente',
          canDelete: false,
        });
      }
      if (s.otherExpenses > 0 && !dayExpenses.some(e => e.sessionId === s.id && e.category !== 'Combustível')) {
        expensesItems.push({
          id: `${s.id}-other`,
          date: dateStr,
          kind: 'expense',
          source: 'session_other',
          title: 'Despesas do Turno',
          categoryOrPlatform: 'Outros',
          amount: s.otherExpenses,
          notes: 'Despesas imediatas de alimentação/pedágio do turno',
          canDelete: false,
        });
      }
    });

    // Totais financeiros normalizados e harmonizados com Dashboard
    const grossFromSessions = daySessions.reduce((acc, s) => acc + s.grossEarnings + s.tips, 0);
    const grossFromItems = dayEarnings.reduce((acc, e) => acc + e.amount + (e.tip || 0), 0);
    const totalGross = Math.max(grossFromSessions, grossFromItems);

    const expFromSessions = daySessions.reduce((acc, s) => acc + s.fuelExpenses + s.otherExpenses, 0);
    const expFromItems = dayExpenses.reduce((acc, e) => acc + e.amount, 0);
    const totalExpenses = Math.max(expFromSessions, expFromItems);

    const dayFuelReserve = daySessions.reduce((acc, s) => acc + (s.fuelReserve || 0), 0);
    const dayMaintReserve = daySessions.reduce((acc, s) => acc + (s.maintenanceReserve || 0), 0);
    const totalReserves = dayFuelReserve + dayMaintReserve;
    const netProfit = totalGross - totalExpenses - totalReserves;

    const tripsCount = daySessions.reduce((acc, s) => acc + s.tripsCount, 0) ||
      dayEarnings.reduce((acc, e) => acc + (e.tripsCount || 1), 0);

    return {
      dateStr,
      totalGross,
      totalExpenses,
      totalReserves,
      netProfit,
      tripsCount,
      earningsCount: earningsItems.length,
      expensesCount: expensesItems.length,
      earningsItems,
      expensesItems,
      allTransactions: [...earningsItems, ...expensesItems],
    };
  };

  // Dados financeiros do dia atualmente selecionado
  const selectedDayFinancials = useMemo(() => {
    return getDayFinancials(selectedDate);
  }, [selectedDate, sessions, earnings, expenses]);

  // Resumo financeiro de toda a semana selecionada
  const weekFinancials = useMemo(() => {
    let gross = 0;
    let exp = 0;
    let reserves = 0;
    let earningsCount = 0;
    let expensesCount = 0;
    let trips = 0;

    currentWeekDays.forEach(dateStr => {
      const day = getDayFinancials(dateStr);
      gross += day.totalGross;
      exp += day.totalExpenses;
      reserves += day.totalReserves;
      earningsCount += day.earningsCount;
      expensesCount += day.expensesCount;
      trips += day.tripsCount;
    });

    const net = gross - exp - reserves;
    const margin = gross > 0 ? (net / gross) * 100 : 0;

    return {
      gross,
      exp,
      reserves,
      net,
      margin,
      earningsCount,
      expensesCount,
      totalEntries: earningsCount + expensesCount,
      trips,
    };
  }, [currentWeekDays, sessions, earnings, expenses]);

  // Extrato completo filtrado para a aba "Extrato de Lançamentos"
  const filteredAllTransactions = useMemo(() => {
    // Coletar todas as datas únicas que têm sessões, earnings ou expenses
    const datesSet = new Set<string>();
    sessions.forEach(s => s.startTime && datesSet.add(s.startTime.split('T')[0]));
    earnings.forEach(e => e.timestamp && datesSet.add(e.timestamp.split('T')[0]));
    expenses.forEach(e => e.date && datesSet.add(e.date.split('T')[0]));
    fuelRecords.forEach(f => f.date && datesSet.add(f.date.split('T')[0]));
    maintenances.forEach(m => m.date && datesSet.add(m.date.split('T')[0]));
    plannerEvents.forEach(p => datesSet.add(p.date));
    datesSet.add(selectedDate);

    const todayStr = new Date().toISOString().split('T')[0];
    const currMonthStr = todayStr.slice(0, 7);

    const allTx: PlannerTransactionItem[] = [];

    datesSet.forEach(dStr => {
      // Filtrar pelo período selecionado
      if (txPeriodFilter === 'today' && dStr !== todayStr) return;
      if (txPeriodFilter === 'week' && !currentWeekDays.includes(dStr)) return;
      if (txPeriodFilter === 'month' && !dStr.startsWith(currMonthStr)) return;

      const dayFin = getDayFinancials(dStr);
      allTx.push(...dayFin.allTransactions);
    });

    // Ordenar de forma decrescente (mais recentes primeiro)
    let list = allTx.sort((a, b) => b.date.localeCompare(a.date));

    // Filtrar por tipo (Ganhos / Despesas)
    if (txTypeFilter !== 'all') {
      list = list.filter(t => t.kind === txTypeFilter);
    }

    // Filtrar por busca de texto
    if (txSearch.trim().length > 0) {
      const q = txSearch.toLowerCase();
      list = list.filter(
        t =>
          t.title.toLowerCase().includes(q) ||
          t.categoryOrPlatform.toLowerCase().includes(q) ||
          (t.notes && t.notes.toLowerCase().includes(q)) ||
          t.amount.toString().includes(q)
      );
    }

    return list;
  }, [sessions, earnings, expenses, fuelRecords, maintenances, plannerEvents, txPeriodFilter, txTypeFilter, txSearch, currentWeekDays, selectedDate]);

  // Totais do extrato filtrado
  const filteredTotals = useMemo(() => {
    let gross = 0;
    let exp = 0;
    filteredAllTransactions.forEach(t => {
      if (t.kind === 'earning') gross += t.amount + (t.tip || 0);
      else exp += t.amount;
    });
    return { gross, exp, net: gross - exp, count: filteredAllTransactions.length };
  }, [filteredAllTransactions]);

  // Abertura do modal de planejamento
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

  // Abrir modal de novo lançamento rápido
  const handleOpenNewLaunch = (type: 'earning' | 'expense' = 'earning', targetDate?: string) => {
    setLaunchType(type);
    setLaunchDate(targetDate || selectedDate);
    setLaunchEarnAmount('');
    setLaunchEarnTip('');
    setLaunchEarnTrips('1');
    setLaunchEarnNotes('');
    setLaunchExpAmount('');
    setLaunchExpDesc('');
    setShowLaunchModal(true);
  };

  // Salvar lançamento no Planner
  const handleSaveLaunch = (e: React.FormEvent) => {
    e.preventDefault();
    if (launchType === 'earning') {
      const amount = parseFloat(launchEarnAmount) || 0;
      const tip = parseFloat(launchEarnTip) || 0;
      const trips = parseInt(launchEarnTrips) || 1;
      
      const currentTime = new Date().toISOString().slice(11, 19);
      addEarning({
        platform: launchPlatform,
        amount,
        tip,
        tripsCount: trips,
        notes: launchEarnNotes,
        timestamp: `${launchDate}T${currentTime}.000Z`,
      });
    } else {
      const amount = parseFloat(launchExpAmount) || 0;
      addExpense({
        category: launchCategory,
        amount,
        description: launchExpDesc || launchCategory,
        date: launchDate,
      });
    }
    setShowLaunchModal(false);
  };

  // Sincronizar todos os lançamentos ao Planner
  const handleSyncAll = () => {
    syncAllLaunchesToPlanner();
    setSyncFeedback('✅ Todos os lançamentos (ganhos, abastecimentos, despesas e turnos) foram sincronizados ao Planner!');
    setTimeout(() => setSyncFeedback(null), 3500);
  };

  // Excluir lançamento
  const handleDeleteTransaction = (tx: PlannerTransactionItem) => {
    if (!tx.canDelete || !tx.originalId) return;
    if (tx.kind === 'earning') {
      deleteEarning(tx.originalId);
    } else {
      deleteExpense(tx.originalId);
    }
    setSyncFeedback(`Lançamento "${tx.title}" de ${formatCurrency(tx.amount)} excluído e Planner atualizado.`);
    setTimeout(() => setSyncFeedback(null), 3000);
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

  // Helper para ícones de categorias
  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'Combustível':
        return <Fuel className="w-4 h-4 text-amber-400" />;
      case 'Alimentação':
        return <Utensils className="w-4 h-4 text-emerald-400" />;
      case 'Multas':
      case 'Multa':
        return <AlertTriangle className="w-4 h-4 text-rose-500" />;
      case 'Limpeza':
        return <Sparkles className="w-4 h-4 text-sky-400" />;
      case 'Lavagem':
        return <Car className="w-4 h-4 text-cyan-400" />;
      case 'Manutenção':
      case 'Óleo':
      case 'Freios':
      case 'Pneus':
        return <Wrench className="w-4 h-4 text-orange-400" />;
      case 'Pedágio':
      case 'Estacionamento':
        return <Car className="w-4 h-4 text-blue-400" />;
      default:
        return <Receipt className="w-4 h-4 text-rose-400" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* HEADER DO PLANNER */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-white/5 backdrop-blur-lg border border-white/10 p-4 sm:p-5 rounded-3xl shadow-xl">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[10px] bg-emerald-500/20 text-emerald-300 font-bold px-2 py-0.5 rounded-full border border-emerald-500/30">
              Planner Financeiro & Operacional
            </span>
          </div>
          <h2 className="text-base sm:text-xl font-black text-white tracking-tight flex items-center gap-2">
            <CalendarIcon className="w-5 h-5 text-emerald-400" />
            PLANNER DE TURNOS, GANHOS & DESPESAS
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Visualize todos os seus lançamentos de receitas, saídas e metas organizados por dia, semana e mês.
          </p>
        </div>

        {/* TABS DE VISUALIZAÇÃO */}
        <div className="flex flex-wrap items-center gap-1 bg-black/40 p-1.5 rounded-2xl border border-white/10 self-start lg:self-auto">
          {[
            { id: 'day', label: 'Dia & Lançamentos' },
            { id: 'week', label: 'Semana' },
            { id: 'month', label: 'Mês' },
            { id: 'transactions', label: 'Extrato Completo' },
            { id: 'recurring', label: 'Escala Padrão' },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setViewMode(tab.id as any)}
              className={`px-3 py-1.5 text-xs font-bold rounded-xl transition ${
                viewMode === tab.id
                  ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20 font-black'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* BARRA DE NAVEGAÇÃO DE DATAS E AÇÕES RÁPIDAS (QUANDO NÃO EM RECORRENTE / EXTRATO GERAL) */}
      {viewMode !== 'recurring' && viewMode !== 'transactions' && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white/5 backdrop-blur-lg border border-white/10 px-4 py-3 rounded-2xl">
          <div className="flex items-center gap-2">
            <button
              onClick={() => changeSelectedDate(viewMode === 'day' ? -1 : -7)}
              className="p-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 transition"
              title="Período anterior"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={() => setSelectedDate(new Date().toISOString().split('T')[0])}
              className="text-xs font-black text-emerald-400 hover:underline px-2 bg-emerald-500/10 py-1 rounded-lg border border-emerald-500/20"
            >
              Hoje
            </button>
            <button
              onClick={() => changeSelectedDate(viewMode === 'day' ? 1 : 7)}
              className="p-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 transition"
              title="Próximo período"
            >
              <ChevronRight className="w-4 h-4" />
            </button>

            <div className="ml-2 text-xs sm:text-sm font-bold text-slate-200">
              {viewMode === 'week' ? (
                <span>
                  Semana de {new Date(currentWeekDays[0] + 'T00:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })} a{' '}
                  {new Date(currentWeekDays[6] + 'T00:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}
                </span>
              ) : (
                <span>{new Date(selectedDate + 'T00:00:00').toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' })}</span>
              )}
            </div>
          </div>

          {/* BOTÕES DE AÇÃO RÁPIDA DE LANÇAMENTO CONECTADOS AO PLANNER */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => onOpenQuickModal ? onOpenQuickModal('earning', undefined, selectedDate) : handleOpenNewLaunch('earning', selectedDate)}
              className="text-xs font-bold text-emerald-300 bg-emerald-500/20 hover:bg-emerald-500/30 px-2.5 py-1.5 rounded-xl border border-emerald-500/30 flex items-center gap-1.5 transition shadow-sm"
              title="Lançar novo ganho com 1 toque conectado ao Planner"
            >
              <Plus className="w-3.5 h-3.5 text-emerald-400" />
              <span>+ Ganho</span>
            </button>

            <button
              onClick={() => onOpenQuickModal ? onOpenQuickModal('ride', undefined, selectedDate) : handleOpenNewLaunch('earning', selectedDate)}
              className="text-xs font-bold text-teal-300 bg-teal-500/20 hover:bg-teal-500/30 px-2.5 py-1.5 rounded-xl border border-teal-500/30 flex items-center gap-1.5 transition shadow-sm"
              title="Lançar corrida individual conectada ao Planner"
            >
              <Car className="w-3.5 h-3.5 text-teal-400" />
              <span>+ Corrida</span>
            </button>

            <button
              onClick={() => onOpenQuickModal ? onOpenQuickModal('fuel', undefined, selectedDate) : handleOpenNewLaunch('expense', selectedDate)}
              className="text-xs font-bold text-amber-300 bg-amber-500/20 hover:bg-amber-500/30 px-2.5 py-1.5 rounded-xl border border-amber-500/30 flex items-center gap-1.5 transition shadow-sm"
              title="Lançar abastecimento com cálculo de consumo conectado ao Planner"
            >
              <Fuel className="w-3.5 h-3.5 text-amber-400" />
              <span>+ Posto</span>
            </button>

            <button
              onClick={() => onOpenQuickModal ? onOpenQuickModal('expense', undefined, selectedDate) : handleOpenNewLaunch('expense', selectedDate)}
              className="text-xs font-bold text-rose-300 bg-rose-500/20 hover:bg-rose-500/30 px-2.5 py-1.5 rounded-xl border border-rose-500/30 flex items-center gap-1.5 transition shadow-sm"
              title="Lançar despesa conectada ao Planner"
            >
              <Plus className="w-3.5 h-3.5 text-rose-400" />
              <span>+ Despesa</span>
            </button>

            <button
              onClick={handleSyncAll}
              className="text-xs font-bold text-cyan-300 bg-cyan-500/15 hover:bg-cyan-500/25 px-2.5 py-1.5 rounded-xl border border-cyan-500/30 flex items-center gap-1.5 transition"
              title="Recalcular e sincronizar todos os lançamentos históricos e turnos com o Planner"
            >
              <CheckCircle2 className="w-3.5 h-3.5 text-cyan-400" />
              <span className="hidden sm:inline">Sincronizar Lançamentos</span>
            </button>

            {onOpenFuelAdvisor && (
              <button
                onClick={onOpenFuelAdvisor}
                className="text-xs font-bold text-amber-300 bg-amber-500/10 hover:bg-amber-500/20 px-2.5 py-1.5 rounded-xl border border-amber-500/30 flex items-center gap-1.5 transition"
                title="Consultar se deve abastecer hoje com base na escala"
              >
                <Fuel className="w-3.5 h-3.5 text-amber-400" />
                <span className="hidden sm:inline">Abastecer Hoje?</span>
              </button>
            )}

            {activeStrategy && viewMode === 'week' && (
              <button
                type="button"
                onClick={() => {
                  activateStrategy(activeStrategy.id, true);
                  applyRecurringScheduleToRange(currentWeekDays[0], 7);
                  setSyncFeedback(`Escala da estratégia "${activeStrategy.name}" aplicada com sucesso a esta semana!`);
                  setTimeout(() => setSyncFeedback(null), 3500);
                }}
                className="text-xs font-bold text-emerald-300 bg-emerald-500/15 hover:bg-emerald-500/25 px-2.5 py-1.5 rounded-xl border border-emerald-500/30 flex items-center gap-1.5 transition"
                title={`Carrega os turnos e metas da estratégia ativa (${activeStrategy.name})`}
              >
                <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
                <span className="hidden md:inline">Estratégia</span>
              </button>
            )}

            {viewMode === 'week' && (
              <button
                onClick={handleApplyRecurringWeek}
                className="text-xs font-bold text-slate-300 bg-white/10 hover:bg-white/15 px-2.5 py-1.5 rounded-xl border border-white/10 flex items-center gap-1.5 transition"
                title="Aplica seu modelo padrão de escala aos dias desta semana"
              >
                <Repeat className="w-3.5 h-3.5 text-emerald-400" />
                <span className="hidden sm:inline">Repetir Escala</span>
              </button>
            )}
          </div>
        </div>
      )}

      {/* FEEDBACK DE SINCRONIZAÇÃO COM O PLANNER */}
      {syncFeedback && (
        <div className="bg-emerald-500/20 border border-emerald-500/40 text-emerald-200 px-4 py-2.5 rounded-2xl text-xs font-bold flex items-center justify-between gap-3 shadow-lg">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{syncFeedback}</span>
          </div>
          <button
            onClick={() => setSyncFeedback(null)}
            className="text-slate-400 hover:text-white text-xs font-black ml-2"
          >
            ✕
          </button>
        </div>
      )}

      {/* 1. VISUALIZAÇÃO: SEMANA (COM LANÇAMENTOS DETALHADOS EM CADA DIA) */}
      {viewMode === 'week' && (
        <div className="space-y-4">
          {/* BARRA DE RESUMO FINANCEIRO DA SEMANA */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-white/5 backdrop-blur-lg border border-white/10 p-4 rounded-2xl">
            <div className="space-y-0.5">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                <ArrowUpRight className="w-3.5 h-3.5 text-emerald-400" /> GANHOS DA SEMANA
              </span>
              <div className="text-base sm:text-lg font-black text-emerald-400">
                {formatCurrency(weekFinancials.gross)}
              </div>
              <span className="text-[10px] text-slate-400 font-medium">
                {weekFinancials.earningsCount} lançamento(s)
              </span>
            </div>

            <div className="space-y-0.5">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                <ArrowDownRight className="w-3.5 h-3.5 text-rose-400" /> DESPESAS DA SEMANA
              </span>
              <div className="text-base sm:text-lg font-black text-rose-400">
                {formatCurrency(weekFinancials.exp)}
              </div>
              <span className="text-[10px] text-slate-400 font-medium">
                {weekFinancials.expensesCount} lançamento(s)
              </span>
            </div>

            <div className="space-y-0.5">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                <Wallet className="w-3.5 h-3.5 text-cyan-400" /> LUCRO LÍQUIDO REAL
              </span>
              <div className="text-base sm:text-lg font-black text-white">
                {formatCurrency(weekFinancials.net)}
              </div>
              <span className="text-[10px] text-emerald-400 font-bold">
                {Math.round(weekFinancials.margin)}% margem líquida
              </span>
            </div>

            <div className="space-y-0.5">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5 text-amber-400" /> RESERVAS GUARDADAS
              </span>
              <div className="text-base sm:text-lg font-black text-amber-300">
                {formatCurrency(weekFinancials.reserves)}
              </div>
              <span className="text-[10px] text-slate-400 font-medium">
                Combustível e Manutenção
              </span>
            </div>
          </div>

          {/* GRID DOS 7 DIAS DA SEMANA */}
          <div className="grid grid-cols-1 sm:grid-cols-7 gap-3">
            {currentWeekDays.map(dateStr => {
              const ev = plannerEvents.find(e => e.date === dateStr);
              const dateObj = new Date(dateStr + 'T00:00:00');
              const isToday = dateStr === new Date().toISOString().split('T')[0];
              const isSelected = dateStr === selectedDate;
              const dayFin = getDayFinancials(dateStr);

              const target = ev?.targetEarnings || 0;
              let achievementStatus: 'ATTAINED' | 'PARTIAL' | 'NOT_ATTAINED' | 'OFF' = 'OFF';
              if (ev?.type === 'work' && target > 0) {
                const pct = (dayFin.totalGross / target) * 100;
                if (pct >= 100) achievementStatus = 'ATTAINED';
                else if (pct >= 50) achievementStatus = 'PARTIAL';
                else achievementStatus = 'NOT_ATTAINED';
              }

              return (
                <div
                  key={dateStr}
                  onClick={() => setSelectedDate(dateStr)}
                  className={`bg-white/5 backdrop-blur-lg border p-3.5 rounded-2xl cursor-pointer transition relative group flex flex-col justify-between min-h-[220px] ${
                    isSelected
                      ? 'border-emerald-500 shadow-xl shadow-emerald-500/15 bg-emerald-500/5'
                      : isToday
                      ? 'border-emerald-500/50 shadow-lg shadow-emerald-500/10'
                      : 'border-white/10 hover:border-white/20'
                  }`}
                >
                  <div>
                    {/* CABEÇALHO DO CARD DO DIA */}
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-black text-slate-400 uppercase">
                        {dayNames[dateObj.getDay()]}
                      </span>
                      <span
                        className={`text-xs font-black px-2 py-0.5 rounded-lg ${
                          isToday
                            ? 'bg-emerald-500 text-slate-950 font-black'
                            : isSelected
                            ? 'bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/30'
                            : 'text-slate-300'
                        }`}
                      >
                        {dateObj.getDate()}
                      </span>
                    </div>

                    {/* STATUS / TIPO PLANEJADO */}
                    {ev ? (
                      <div className="mt-2">
                        <span className={`inline-flex items-center gap-1 text-[9px] font-bold px-1.5 py-0.5 rounded-md border ${typeConfig[ev.type].badgeClass}`}>
                          {typeConfig[ev.type].label}
                        </span>

                        {ev.type === 'work' && (
                          <div className="mt-1.5 space-y-0.5 text-[10px] text-slate-400">
                            {ev.startTime && ev.endTime && (
                              <div className="text-slate-300 flex items-center gap-1">
                                <Clock className="w-2.5 h-2.5 text-slate-400" />
                                {ev.startTime} - {ev.endTime}
                              </div>
                            )}
                            {target > 0 && (
                              <div className="flex items-center gap-1">
                                <Target className="w-2.5 h-2.5 text-emerald-400" />
                                Meta: <strong className="text-slate-200">{formatCurrency(target)}</strong>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    ) : (
                      <div
                        onClick={(e) => {
                          e.stopPropagation();
                          openNewEventForDate(dateStr);
                        }}
                        className="mt-2 text-center text-[10px] text-slate-500 font-medium py-1.5 hover:text-emerald-300 transition"
                      >
                        + Planejar escala
                      </div>
                    )}
                  </div>

                  {/* BLOCO DE LANÇAMENTOS FINANCEIROS DO DIA */}
                  <div className="mt-3 pt-2.5 border-t border-white/10 space-y-1.5">
                    {/* GANHOS DO DIA */}
                    <div className="flex justify-between items-center text-[11px]">
                      <span className="text-slate-400 flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block" />
                        Ganhos:
                      </span>
                      <span className="font-black text-emerald-400">
                        {dayFin.totalGross > 0 ? `+${formatCurrency(dayFin.totalGross)}` : '--'}
                      </span>
                    </div>

                    {/* DESPESAS DO DIA */}
                    <div className="flex justify-between items-center text-[11px]">
                      <span className="text-slate-400 flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-rose-400 inline-block" />
                        Despesas:
                      </span>
                      <span className={`font-black ${dayFin.totalExpenses > 0 ? 'text-rose-400' : 'text-slate-500'}`}>
                        {dayFin.totalExpenses > 0 ? `-${formatCurrency(dayFin.totalExpenses)}` : '--'}
                      </span>
                    </div>

                    {/* SALDO LÍQUIDO DO DIA */}
                    {(dayFin.totalGross > 0 || dayFin.totalExpenses > 0) && (
                      <div className="flex justify-between items-center text-[11px] pt-1 border-t border-white/5 font-bold">
                        <span className="text-slate-400">Líquido:</span>
                        <span className={dayFin.netProfit >= 0 ? 'text-white' : 'text-rose-400'}>
                          {formatCurrency(dayFin.netProfit)}
                        </span>
                      </div>
                    )}

                    {/* CHIPS DE LANÇAMENTOS (Uber, 99, Combustível, etc.) */}
                    {dayFin.allTransactions.length > 0 && (
                      <div className="flex flex-wrap gap-1 pt-1">
                        {dayFin.allTransactions.slice(0, 3).map((tx, i) => (
                          <span
                            key={i}
                            className={`text-[8px] font-bold px-1.5 py-0.5 rounded truncate max-w-[70px] ${
                              tx.kind === 'earning'
                                ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/20'
                                : 'bg-rose-500/15 text-rose-300 border border-rose-500/20'
                            }`}
                            title={`${tx.title}: ${formatCurrency(tx.amount)}`}
                          >
                            {tx.categoryOrPlatform}
                          </span>
                        ))}
                        {dayFin.allTransactions.length > 3 && (
                          <span className="text-[8px] text-slate-400 font-bold bg-white/5 px-1 py-0.5 rounded">
                            +{dayFin.allTransactions.length - 3}
                          </span>
                        )}
                      </div>
                    )}

                    {/* STATUS DE META */}
                    {target > 0 && dayFin.totalGross > 0 && (
                      <div className="mt-1">
                        {achievementStatus === 'ATTAINED' && (
                          <span className="text-[8px] font-black text-emerald-400 bg-emerald-500/10 px-1 py-0.5 rounded border border-emerald-500/30 block text-center">
                            META ATINGIDA
                          </span>
                        )}
                        {achievementStatus === 'PARTIAL' && (
                          <span className="text-[8px] font-black text-amber-400 bg-amber-500/10 px-1 py-0.5 rounded border border-amber-500/30 block text-center">
                            PARCIAL ({Math.round((dayFin.totalGross / target) * 100)}%)
                          </span>
                        )}
                      </div>
                    )}

                    {/* BOTÃO RÁPIDO PARA VER DETALHES DO DIA E LANÇAR */}
                    <div className="pt-1 flex items-center justify-between gap-1">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedDate(dateStr);
                          setViewMode('day');
                        }}
                        className="text-[10px] text-emerald-400 hover:text-emerald-300 font-bold hover:underline truncate"
                      >
                        Lançamentos ({dayFin.allTransactions.length}) →
                      </button>

                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (onOpenQuickModal) {
                            onOpenQuickModal('earning', undefined, dateStr);
                          } else {
                            handleOpenNewLaunch('earning', dateStr);
                          }
                        }}
                        className="text-[9px] font-black text-slate-200 bg-white/10 hover:bg-emerald-500 hover:text-slate-950 px-1.5 py-0.5 rounded transition flex items-center gap-0.5 shrink-0"
                        title={`Novo lançamento para ${dateStr} conectado ao Planner`}
                      >
                        <Plus className="w-2.5 h-2.5" /> Lançar
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 2. VISUALIZAÇÃO: DIA (COM TODOS OS LANÇAMENTOS DETALHADOS E BOTÕES DE AÇÃO) */}
      {viewMode === 'day' && (
        <div className="space-y-6 max-w-4xl mx-auto">
          {(() => {
            const ev = plannerEvents.find(e => e.date === selectedDate);
            const dayFin = selectedDayFinancials;

            return (
              <div className="space-y-6">
                {/* CABEÇALHO DO DIA E CARDS DE RESUMO */}
                <div className="bg-white/5 backdrop-blur-lg border border-white/10 p-5 sm:p-6 rounded-3xl shadow-xl space-y-5">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                          EXTRATO DO DIA SELECIONADO
                        </span>
                        <span className="text-[10px] font-black text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20 flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" /> Conectado ao Planner
                        </span>
                      </div>
                      <h3 className="text-xl sm:text-2xl font-black text-white mt-1">
                        {new Date(selectedDate + 'T00:00:00').toLocaleDateString('pt-BR', {
                          weekday: 'long',
                          day: '2-digit',
                          month: 'long',
                          year: 'numeric',
                        })}
                      </h3>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        onClick={() => openNewEventForDate(selectedDate)}
                        className="bg-white/10 hover:bg-white/15 text-slate-200 font-bold px-3 py-1.5 rounded-xl text-xs flex items-center gap-1.5 border border-white/10 transition"
                      >
                        <Edit2 className="w-3.5 h-3.5 text-emerald-400" />
                        {ev ? 'Editar Escala' : 'Planejar Dia'}
                      </button>

                      <button
                        onClick={() => onOpenQuickModal ? onOpenQuickModal('earning', undefined, selectedDate) : handleOpenNewLaunch('earning', selectedDate)}
                        className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black px-3 py-1.5 rounded-xl text-xs flex items-center gap-1.5 shadow-md shadow-emerald-500/20 transition"
                        title="Lançar ganho conectado ao Planner"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        + Ganho
                      </button>

                      <button
                        onClick={() => onOpenQuickModal ? onOpenQuickModal('ride', undefined, selectedDate) : handleOpenNewLaunch('earning', selectedDate)}
                        className="bg-teal-500/20 hover:bg-teal-500/30 text-teal-300 font-black px-3 py-1.5 rounded-xl text-xs flex items-center gap-1.5 border border-teal-500/30 transition"
                        title="Lançar corrida conectada ao Planner"
                      >
                        <Car className="w-3.5 h-3.5 text-teal-400" />
                        + Corrida
                      </button>

                      <button
                        onClick={() => onOpenQuickModal ? onOpenQuickModal('fuel', undefined, selectedDate) : handleOpenNewLaunch('expense', selectedDate)}
                        className="bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 font-black px-3 py-1.5 rounded-xl text-xs flex items-center gap-1.5 border border-amber-500/30 transition"
                        title="Lançar abastecimento no posto conectado ao Planner"
                      >
                        <Fuel className="w-3.5 h-3.5 text-amber-400" />
                        + Posto
                      </button>

                      <button
                        onClick={() => onOpenQuickModal ? onOpenQuickModal('expense', undefined, selectedDate) : handleOpenNewLaunch('expense', selectedDate)}
                        className="bg-rose-500 hover:bg-rose-400 text-white font-black px-3 py-1.5 rounded-xl text-xs flex items-center gap-1.5 shadow-md shadow-rose-500/20 transition"
                        title="Lançar despesa conectada ao Planner"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        + Despesa
                      </button>

                      <button
                        onClick={handleSyncAll}
                        className="bg-white/5 hover:bg-cyan-500/20 text-cyan-300 font-bold px-2.5 py-1.5 rounded-xl text-xs flex items-center gap-1 border border-cyan-500/25 transition"
                        title="Sincronizar todos os lançamentos com o Planner"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5 text-cyan-400" />
                        <span className="hidden md:inline">Sincronizar</span>
                      </button>
                    </div>
                  </div>

                  {/* CARDS DE RESUMO FINANCEIRO DO DIA */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div className="bg-white/5 border border-white/5 p-3.5 rounded-2xl">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                        <TrendingUp className="w-3 h-3 text-emerald-400" /> GANHOS REALIZADOS
                      </span>
                      <div className="text-lg font-black text-emerald-400 mt-0.5">
                        {formatCurrency(dayFin.totalGross)}
                      </div>
                      <span className="text-[10px] text-slate-400">
                        {dayFin.earningsCount} lançamento(s) de receita
                      </span>
                    </div>

                    <div className="bg-white/5 border border-white/5 p-3.5 rounded-2xl">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                        <TrendingDown className="w-3 h-3 text-rose-400" /> DESPESAS REALIZADAS
                      </span>
                      <div className="text-lg font-black text-rose-400 mt-0.5">
                        {formatCurrency(dayFin.totalExpenses)}
                      </div>
                      <span className="text-[10px] text-slate-400">
                        {dayFin.expensesCount} despesa(s) diretas
                      </span>
                    </div>

                    <div className="bg-white/5 border border-white/5 p-3.5 rounded-2xl">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                        <Wallet className="w-3 h-3 text-cyan-400" /> LUCRO LÍQUIDO
                      </span>
                      <div className="text-lg font-black text-white mt-0.5">
                        {formatCurrency(dayFin.netProfit)}
                      </div>
                      <span className="text-[10px] text-emerald-400 font-bold">
                        {dayFin.totalGross > 0 ? `${Math.round((dayFin.netProfit / dayFin.totalGross) * 100)}% margem` : 'Disponível no bolso'}
                      </span>
                    </div>

                    <div className="bg-white/5 border border-white/5 p-3.5 rounded-2xl">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                        <ShieldCheck className="w-3 h-3 text-amber-400" /> RESERVA FUTURA
                      </span>
                      <div className="text-lg font-black text-amber-300 mt-0.5">
                        {formatCurrency(dayFin.totalReserves)}
                      </div>
                      <span className="text-[10px] text-slate-400">
                        Combustível e Manutenção
                      </span>
                    </div>
                  </div>

                  {/* BLOCO DE PLANEJAMENTO / ESCALA (SE HOUVER) */}
                  {ev && (
                    <div className="p-4 rounded-2xl bg-black/40 border border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className={`px-2.5 py-0.5 rounded-md text-[10px] font-black border ${typeConfig[ev.type].badgeClass}`}>
                            {typeConfig[ev.type].label}
                          </span>
                          {ev.platforms && ev.platforms.map(p => (
                            <span key={p} className="text-[10px] bg-white/10 px-2 py-0.5 rounded font-bold text-slate-300">
                              {p}
                            </span>
                          ))}
                        </div>
                        <div className="text-xs text-slate-300 font-semibold flex items-center gap-3 pt-1">
                          <span>Horário Previsto: <strong>{ev.startTime || '--'} às {ev.endTime || '--'}</strong></span>
                          <span>Meta do Dia: <strong className="text-emerald-400">{formatCurrency(ev.targetEarnings)}</strong></span>
                        </div>
                        {ev.notes && (
                          <p className="text-xs text-slate-400 pt-0.5 italic">"{ev.notes}"</p>
                        )}
                      </div>

                      {ev.targetEarnings > 0 && dayFin.totalGross > 0 && (
                        <div className="text-right sm:border-l sm:border-white/10 sm:pl-4">
                          <span className="text-[10px] text-slate-400 uppercase font-bold block">Desempenho da Meta</span>
                          <span className={`text-sm font-black ${dayFin.totalGross >= ev.targetEarnings ? 'text-emerald-400' : 'text-amber-400'}`}>
                            {Math.round((dayFin.totalGross / ev.targetEarnings) * 100)}% atingido
                          </span>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* LISTA 1: LANÇAMENTOS DE GANHOS (RECEITAS) */}
                <div className="bg-white/5 backdrop-blur-lg border border-white/10 p-5 sm:p-6 rounded-3xl shadow-xl space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <h4 className="text-sm font-black text-white uppercase tracking-wider flex items-center gap-2">
                      <ArrowUpRight className="w-4 h-4 text-emerald-400" />
                      LANÇAMENTOS DE GANHOS ({dayFin.earningsItems.length})
                    </h4>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => onOpenQuickModal ? onOpenQuickModal('ride', undefined, selectedDate) : handleOpenNewLaunch('earning', selectedDate)}
                        className="text-xs font-bold text-teal-300 hover:text-teal-200 bg-teal-500/10 px-2.5 py-1 rounded-lg border border-teal-500/20 flex items-center gap-1"
                      >
                        <Car className="w-3 h-3" /> + Corrida
                      </button>
                      <button
                        onClick={() => onOpenQuickModal ? onOpenQuickModal('earning', undefined, selectedDate) : handleOpenNewLaunch('earning', selectedDate)}
                        className="text-xs font-bold text-emerald-400 hover:text-emerald-300 bg-emerald-500/10 px-2.5 py-1 rounded-lg border border-emerald-500/20 flex items-center gap-1"
                      >
                        <Plus className="w-3.5 h-3.5" /> + Ganho
                      </button>
                    </div>
                  </div>

                  {dayFin.earningsItems.length > 0 ? (
                    <div className="space-y-2.5">
                      {dayFin.earningsItems.map((tx) => (
                        <div
                          key={tx.id}
                          className="bg-white/5 hover:bg-white/10 border border-white/5 p-3.5 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition"
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center flex-shrink-0">
                              <DollarSign className="w-5 h-5 text-emerald-400" />
                            </div>
                            <div>
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="text-xs font-black text-white">{tx.title}</span>
                                <span className="text-[10px] font-bold bg-white/10 text-slate-300 px-2 py-0.5 rounded-full">
                                  {tx.categoryOrPlatform}
                                </span>
                                <span className="text-[9px] font-bold text-emerald-400 bg-emerald-500/15 border border-emerald-500/25 px-1.5 py-0.2 rounded inline-flex items-center gap-0.5">
                                  <CheckCircle2 className="w-2.5 h-2.5" /> Planner
                                </span>
                                {tx.time && (
                                  <span className="text-[10px] text-slate-400 flex items-center gap-0.5">
                                    <Clock className="w-2.5 h-2.5" /> {tx.time}
                                  </span>
                                )}
                              </div>
                              <div className="text-[11px] text-slate-400 mt-0.5 flex flex-wrap items-center gap-2">
                                {tx.tripsCount && tx.tripsCount > 0 && <span>{tx.tripsCount} corrida(s)</span>}
                                {tx.tip && tx.tip > 0 ? <span className="text-emerald-400 font-medium">Gorjeta: +{formatCurrency(tx.tip)}</span> : null}
                                {tx.notes && <span className="italic text-slate-500">"{tx.notes}"</span>}
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center justify-between sm:justify-end gap-3">
                            <span className="text-sm font-black text-emerald-400">
                              +{formatCurrency(tx.amount + (tx.tip || 0))}
                            </span>
                            {tx.canDelete && (
                              <button
                                onClick={() => handleDeleteTransaction(tx)}
                                className="p-1.5 rounded-lg bg-white/5 hover:bg-rose-500/20 text-slate-400 hover:text-rose-400 transition"
                                title="Excluir este lançamento"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-6 border border-dashed border-white/10 rounded-2xl">
                      <p className="text-xs text-slate-400 mb-2">Nenhum ganho lançado para este dia ainda.</p>
                      <button
                        onClick={() => onOpenQuickModal ? onOpenQuickModal('earning', undefined, selectedDate) : handleOpenNewLaunch('earning', selectedDate)}
                        className="text-xs font-bold text-emerald-400 hover:text-emerald-300 inline-flex items-center gap-1"
                      >
                        <Plus className="w-3.5 h-3.5" /> Registrar ganho agora
                      </button>
                    </div>
                  )}
                </div>

                {/* LISTA 2: LANÇAMENTOS DE DESPESAS (SAÍDAS) */}
                <div className="bg-white/5 backdrop-blur-lg border border-white/10 p-5 sm:p-6 rounded-3xl shadow-xl space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <h4 className="text-sm font-black text-white uppercase tracking-wider flex items-center gap-2">
                      <ArrowDownRight className="w-4 h-4 text-rose-400" />
                      LANÇAMENTOS DE DESPESAS ({dayFin.expensesItems.length})
                    </h4>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => onOpenQuickModal ? onOpenQuickModal('fuel', undefined, selectedDate) : handleOpenNewLaunch('expense', selectedDate)}
                        className="text-xs font-bold text-amber-300 hover:text-amber-200 bg-amber-500/10 px-2.5 py-1 rounded-lg border border-amber-500/20 flex items-center gap-1"
                      >
                        <Fuel className="w-3 h-3" /> + Posto
                      </button>
                      <button
                        onClick={() => onOpenQuickModal ? onOpenQuickModal('expense', undefined, selectedDate) : handleOpenNewLaunch('expense', selectedDate)}
                        className="text-xs font-bold text-rose-400 hover:text-rose-300 bg-rose-500/10 px-2.5 py-1 rounded-lg border border-rose-500/20 flex items-center gap-1"
                      >
                        <Plus className="w-3.5 h-3.5" /> + Despesa
                      </button>
                    </div>
                  </div>

                  {dayFin.expensesItems.length > 0 ? (
                    <div className="space-y-2.5">
                      {dayFin.expensesItems.map((tx) => (
                        <div
                          key={tx.id}
                          className="bg-white/5 hover:bg-white/10 border border-white/5 p-3.5 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition"
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-rose-500/15 border border-rose-500/30 flex items-center justify-center flex-shrink-0">
                              {getCategoryIcon(tx.categoryOrPlatform)}
                            </div>
                            <div>
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="text-xs font-black text-white">{tx.title}</span>
                                <span className="text-[10px] font-bold bg-white/10 text-slate-300 px-2 py-0.5 rounded-full">
                                  {tx.categoryOrPlatform}
                                </span>
                                <span className="text-[9px] font-bold text-emerald-400 bg-emerald-500/15 border border-emerald-500/25 px-1.5 py-0.2 rounded inline-flex items-center gap-0.5">
                                  <CheckCircle2 className="w-2.5 h-2.5" /> Planner
                                </span>
                              </div>
                              {tx.notes && (
                                <div className="text-[11px] text-slate-400 mt-0.5">
                                  {tx.notes}
                                </div>
                              )}
                            </div>
                          </div>

                          <div className="flex items-center justify-between sm:justify-end gap-3">
                            <span className="text-sm font-black text-rose-400">
                              -{formatCurrency(tx.amount)}
                            </span>
                            {tx.canDelete && (
                              <button
                                onClick={() => handleDeleteTransaction(tx)}
                                className="p-1.5 rounded-lg bg-white/5 hover:bg-rose-500/20 text-slate-400 hover:text-rose-400 transition"
                                title="Excluir esta despesa"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-6 border border-dashed border-white/10 rounded-2xl">
                      <p className="text-xs text-slate-400 mb-2">Nenhuma despesa lançada para este dia.</p>
                      <button
                        onClick={() => handleOpenNewLaunch('expense', selectedDate)}
                        className="text-xs font-bold text-rose-400 hover:text-rose-300 inline-flex items-center gap-1"
                      >
                        <Plus className="w-3.5 h-3.5" /> Registrar despesa agora
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })()}
        </div>
      )}

      {/* 3. VISUALIZAÇÃO: MÊS (COM TOTALIZADORES DIÁRIOS DE GANHOS E DESPESAS) */}
      {viewMode === 'month' && (
        <div className="bg-white/5 backdrop-blur-lg border border-white/10 p-5 rounded-3xl shadow-xl space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-black text-white uppercase tracking-wider">VISÃO GERAL DO MÊS</h3>
              <p className="text-xs text-slate-400 mt-0.5">Clique em qualquer dia para ver os lançamentos detalhados ou lançar novas entradas.</p>
            </div>
            <button
              onClick={handleApplyRecurringMonth}
              className="text-xs font-bold bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/30 px-3 py-1.5 rounded-xl transition"
            >
              Preencher Mês com Escala Padrão
            </button>
          </div>

          <div className="grid grid-cols-7 gap-2 text-center text-[11px] font-black text-slate-400 mb-1">
            <span>DOM</span><span>SEG</span><span>TER</span><span>QUA</span><span>QUI</span><span>SEX</span><span>SÁB</span>
          </div>

          {/* Grid de 35 dias */}
          <div className="grid grid-cols-7 gap-2">
            {Array.from({ length: 35 }).map((_, i) => {
              const d = new Date();
              d.setDate(d.getDate() - d.getDay() + i);
              const dateStr = d.toISOString().split('T')[0];
              const ev = plannerEvents.find(e => e.date === dateStr);
              const dayFin = getDayFinancials(dateStr);
              const isToday = dateStr === new Date().toISOString().split('T')[0];
              const isSelected = dateStr === selectedDate;

              return (
                <div
                  key={dateStr}
                  onClick={() => {
                    setSelectedDate(dateStr);
                    setViewMode('day');
                  }}
                  className={`border rounded-xl p-2 min-h-[75px] text-left cursor-pointer transition flex flex-col justify-between ${
                    isSelected
                      ? 'bg-emerald-500/10 border-emerald-500 shadow-md'
                      : isToday
                      ? 'bg-white/10 border-emerald-500/40'
                      : 'bg-white/5 hover:bg-white/10 border-white/5'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className={`text-[10px] font-black ${isToday ? 'text-emerald-400 font-black' : 'text-slate-400'}`}>
                      {d.getDate()}
                    </span>
                    {ev && (
                      <span className={`w-1.5 h-1.5 rounded-full ${typeConfig[ev.type].dotClass}`} title={typeConfig[ev.type].label} />
                    )}
                  </div>

                  <div className="space-y-0.5 mt-1">
                    {dayFin.totalGross > 0 && (
                      <div className="text-[9px] font-black text-emerald-400 truncate">
                        +{formatCurrency(dayFin.totalGross)}
                      </div>
                    )}
                    {dayFin.totalExpenses > 0 && (
                      <div className="text-[8px] font-bold text-rose-400 truncate">
                        -{formatCurrency(dayFin.totalExpenses)}
                      </div>
                    )}
                    {dayFin.totalGross === 0 && dayFin.totalExpenses === 0 && ev && (
                      <div className="text-[8px] text-slate-500 truncate">
                        {ev.type === 'work' ? `Meta R$${ev.targetEarnings}` : ev.type}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 4. VISUALIZAÇÃO: EXTRATO COMPLETO DE LANÇAMENTOS DO PLANNER */}
      {viewMode === 'transactions' && (
        <div className="space-y-5">
          {/* HEADER DO EXTRATO E CONTROLES */}
          <div className="bg-white/5 backdrop-blur-lg border border-white/10 p-5 rounded-3xl shadow-xl space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-base font-black text-white uppercase tracking-wider flex items-center gap-2">
                  <FileText className="w-5 h-5 text-emerald-400" />
                  EXTRATO DE TODOS OS LANÇAMENTOS DO PLANNER
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Consulte todos os ganhos e despesas registrados cronologicamente no sistema.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  onClick={() => onOpenQuickModal ? onOpenQuickModal('earning') : handleOpenNewLaunch('earning')}
                  className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black px-3 py-1.5 rounded-xl text-xs flex items-center gap-1.5 shadow-md shadow-emerald-500/20"
                >
                  <Plus className="w-3.5 h-3.5" /> + Ganho
                </button>
                <button
                  onClick={() => onOpenQuickModal ? onOpenQuickModal('ride') : handleOpenNewLaunch('earning')}
                  className="bg-teal-500/20 hover:bg-teal-500/30 text-teal-300 font-black px-3 py-1.5 rounded-xl text-xs flex items-center gap-1.5 border border-teal-500/30"
                >
                  <Car className="w-3.5 h-3.5 text-teal-400" /> + Corrida
                </button>
                <button
                  onClick={() => onOpenQuickModal ? onOpenQuickModal('fuel') : handleOpenNewLaunch('expense')}
                  className="bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 font-black px-3 py-1.5 rounded-xl text-xs flex items-center gap-1.5 border border-amber-500/30"
                >
                  <Fuel className="w-3.5 h-3.5 text-amber-400" /> + Posto
                </button>
                <button
                  onClick={() => onOpenQuickModal ? onOpenQuickModal('expense') : handleOpenNewLaunch('expense')}
                  className="bg-rose-500 hover:bg-rose-400 text-white font-black px-3 py-1.5 rounded-xl text-xs flex items-center gap-1.5 shadow-md shadow-rose-500/20"
                >
                  <Plus className="w-3.5 h-3.5" /> + Despesa
                </button>
                <button
                  onClick={handleSyncAll}
                  className="bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 font-black px-3 py-1.5 rounded-xl text-xs flex items-center gap-1.5 border border-cyan-500/30"
                  title="Recalcular e sincronizar todos os lançamentos ao Planner"
                >
                  <CheckCircle2 className="w-3.5 h-3.5 text-cyan-400" /> Sincronizar Tudo
                </button>
              </div>
            </div>

            {/* FILTROS DE PERÍODO E TIPO */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pt-2 border-t border-white/10">
              <div className="flex flex-wrap items-center gap-2">
                <div className="flex items-center gap-1 bg-black/40 p-1 rounded-xl border border-white/10">
                  {[
                    { id: 'today', label: 'Hoje' },
                    { id: 'week', label: 'Esta Semana' },
                    { id: 'month', label: 'Este Mês' },
                    { id: 'all', label: 'Todos' },
                  ].map(p => (
                    <button
                      key={p.id}
                      onClick={() => setTxPeriodFilter(p.id as any)}
                      className={`px-2.5 py-1 text-xs font-bold rounded-lg transition ${
                        txPeriodFilter === p.id
                          ? 'bg-white/15 text-white'
                          : 'text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>

                <div className="flex items-center gap-1 bg-black/40 p-1 rounded-xl border border-white/10">
                  {[
                    { id: 'all', label: 'Todos' },
                    { id: 'earning', label: 'Ganhos (+)' },
                    { id: 'expense', label: 'Despesas (-)' },
                  ].map(t => (
                    <button
                      key={t.id}
                      onClick={() => setTxTypeFilter(t.id as any)}
                      className={`px-2.5 py-1 text-xs font-bold rounded-lg transition ${
                        txTypeFilter === t.id
                          ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                          : 'text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* BUSCA RÁPIDA */}
              <div className="relative w-full md:w-64">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={txSearch}
                  onChange={e => setTxSearch(e.target.value)}
                  placeholder="Buscar por app, posto, comida..."
                  className="w-full bg-black/40 border border-white/10 rounded-xl pl-8 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>

            {/* TOTALIZADORES DO FILTRO ATUAL */}
            <div className="grid grid-cols-3 gap-3 pt-2">
              <div className="bg-white/5 p-3 rounded-xl border border-white/5">
                <span className="text-[10px] font-bold text-slate-400 uppercase">TOTAL DE GANHOS</span>
                <div className="text-base font-black text-emerald-400 mt-0.5">
                  +{formatCurrency(filteredTotals.gross)}
                </div>
              </div>
              <div className="bg-white/5 p-3 rounded-xl border border-white/5">
                <span className="text-[10px] font-bold text-slate-400 uppercase">TOTAL DE DESPESAS</span>
                <div className="text-base font-black text-rose-400 mt-0.5">
                  -{formatCurrency(filteredTotals.exp)}
                </div>
              </div>
              <div className="bg-white/5 p-3 rounded-xl border border-white/5">
                <span className="text-[10px] font-bold text-slate-400 uppercase">SALDO LÍQUIDO</span>
                <div className={`text-base font-black mt-0.5 ${filteredTotals.net >= 0 ? 'text-white' : 'text-rose-400'}`}>
                  {formatCurrency(filteredTotals.net)}
                </div>
              </div>
            </div>
          </div>

          {/* LISTA COMPLETA DOS LANÇAMENTOS */}
          <div className="bg-white/5 backdrop-blur-lg border border-white/10 p-5 sm:p-6 rounded-3xl shadow-xl space-y-3">
            {filteredAllTransactions.length > 0 ? (
              <div className="space-y-2">
                {filteredAllTransactions.map((tx) => (
                  <div
                    key={tx.id}
                    className="bg-white/5 hover:bg-white/10 border border-white/5 p-3.5 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition"
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 border ${
                          tx.kind === 'earning'
                            ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400'
                            : 'bg-rose-500/15 border-rose-500/30 text-rose-400'
                        }`}
                      >
                        {tx.kind === 'earning' ? (
                          <DollarSign className="w-5 h-5" />
                        ) : (
                          getCategoryIcon(tx.categoryOrPlatform)
                        )}
                      </div>

                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-xs font-black text-white">{tx.title}</span>
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                              tx.kind === 'earning'
                                ? 'bg-emerald-500/20 text-emerald-300'
                                : 'bg-rose-500/20 text-rose-300'
                            }`}
                          >
                            {tx.categoryOrPlatform}
                          </span>
                          <span className="text-[9px] font-bold text-emerald-400 bg-emerald-500/15 border border-emerald-500/25 px-1.5 py-0.2 rounded inline-flex items-center gap-0.5">
                            <CheckCircle2 className="w-2.5 h-2.5" /> Planner
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-400 mt-0.5 flex flex-wrap items-center gap-2">
                          <span className="text-slate-300 font-semibold">
                            {new Date(tx.date + 'T00:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                          </span>
                          {tx.time && <span>às {tx.time}</span>}
                          {tx.tripsCount && tx.tripsCount > 0 ? <span>• {tx.tripsCount} corrida(s)</span> : null}
                          {tx.notes && <span className="italic text-slate-500">• "{tx.notes}"</span>}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between sm:justify-end gap-3">
                      <span className={`text-sm font-black ${tx.kind === 'earning' ? 'text-emerald-400' : 'text-rose-400'}`}>
                        {tx.kind === 'earning' ? '+' : '-'}{formatCurrency(tx.amount + (tx.tip || 0))}
                      </span>
                      {tx.canDelete && (
                        <button
                          onClick={() => handleDeleteTransaction(tx)}
                          className="p-1.5 rounded-lg bg-white/5 hover:bg-rose-500/20 text-slate-400 hover:text-rose-400 transition"
                          title="Excluir este lançamento"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12 text-slate-400">
                <FileText className="w-10 h-10 text-slate-600 mx-auto mb-2" />
                <p className="text-sm font-bold text-slate-300">Nenhum lançamento encontrado para os filtros selecionados.</p>
                <p className="text-xs text-slate-500 mt-1">Experimente alterar o período ou registrar um novo ganho/despesa.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 5. VISUALIZAÇÃO: ESCALA RECORRENTE (MODELO SEMANAL PADRÃO) */}
      {viewMode === 'recurring' && (
        <div className="bg-white/5 backdrop-blur-lg border border-white/10 p-5 sm:p-6 rounded-3xl shadow-xl space-y-4">
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

      {/* MODAL 1: NOVO LANÇAMENTO RÁPIDO NO PLANNER (GANHO OU DESPESA) */}
      {showLaunchModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fadeIn">
          <div className="bg-slate-900 border border-white/15 rounded-3xl w-full max-w-md p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-black text-white flex items-center gap-2">
                {launchType === 'earning' ? (
                  <>
                    <ArrowUpRight className="w-5 h-5 text-emerald-400" />
                    Lançar Novo Ganho no Planner
                  </>
                ) : (
                  <>
                    <ArrowDownRight className="w-5 h-5 text-rose-400" />
                    Lançar Nova Despesa no Planner
                  </>
                )}
              </h3>
              <button
                onClick={() => setShowLaunchModal(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg"
              >
                ✕
              </button>
            </div>

            {/* SELETOR DE TIPO: GANHO OU DESPESA */}
            <div className="grid grid-cols-2 gap-2 bg-black/40 p-1 rounded-xl border border-white/10">
              <button
                type="button"
                onClick={() => setLaunchType('earning')}
                className={`py-2 text-xs font-black rounded-lg transition ${
                  launchType === 'earning'
                    ? 'bg-emerald-500 text-slate-950 shadow-md'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                🟢 Ganho / Receita
              </button>
              <button
                type="button"
                onClick={() => setLaunchType('expense')}
                className={`py-2 text-xs font-black rounded-lg transition ${
                  launchType === 'expense'
                    ? 'bg-rose-500 text-white shadow-md'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                🔴 Despesa / Saída
              </button>
            </div>

            <form onSubmit={handleSaveLaunch} className="space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-400 uppercase block mb-1">Data do Lançamento</label>
                <input
                  type="date"
                  value={launchDate}
                  onChange={e => setLaunchDate(e.target.value)}
                  className="w-full bg-white/5 border border-white/15 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
                  required
                />
              </div>

              {launchType === 'earning' ? (
                <>
                  <div>
                    <label className="text-xs font-bold text-slate-400 uppercase block mb-1">Plataforma / App</label>
                    <div className="grid grid-cols-3 gap-2">
                      {(['Uber', '99', 'inDrive', 'Particular', 'Outro'] as PlatformType[]).map(p => (
                        <button
                          key={p}
                          type="button"
                          onClick={() => setLaunchPlatform(p)}
                          className={`py-1.5 px-2 rounded-xl text-xs font-bold border transition ${
                            launchPlatform === p
                              ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500'
                              : 'bg-white/5 text-slate-400 border-white/10'
                          }`}
                        >
                          {p}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-bold text-slate-400 uppercase block mb-1">Valor Bruto (R$)</label>
                      <input
                        type="number"
                        step="0.01"
                        value={launchEarnAmount}
                        onChange={e => setLaunchEarnAmount(e.target.value)}
                        placeholder="180.00"
                        className="w-full bg-white/5 border border-white/15 rounded-xl px-3 py-2 text-sm text-emerald-400 font-black focus:outline-none focus:border-emerald-500"
                        required
                      />
                    </div>
                    <div>
                      <label className="text-xs font-bold text-slate-400 uppercase block mb-1">Gorjeta (R$)</label>
                      <input
                        type="number"
                        step="0.01"
                        value={launchEarnTip}
                        onChange={e => setLaunchEarnTip(e.target.value)}
                        placeholder="0.00"
                        className="w-full bg-white/5 border border-white/15 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-400 uppercase block mb-1">Qtd. de Corridas</label>
                    <input
                      type="number"
                      value={launchEarnTrips}
                      onChange={e => setLaunchEarnTrips(e.target.value)}
                      className="w-full bg-white/5 border border-white/15 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
                      min="1"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-400 uppercase block mb-1">Observações (opcional)</label>
                    <input
                      type="text"
                      value={launchEarnNotes}
                      onChange={e => setLaunchEarnNotes(e.target.value)}
                      placeholder="Ex: Corridas na zona sul, chuva..."
                      className="w-full bg-white/5 border border-white/15 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                </>
              ) : (
                <>
                  <div>
                    <label className="text-xs font-bold text-slate-400 uppercase block mb-1">Categoria de Despesa</label>
                    <select
                      value={launchCategory}
                      onChange={e => setLaunchCategory(e.target.value as ExpenseCategory)}
                      className="w-full bg-slate-900 border border-white/15 rounded-xl px-3 py-2 text-xs text-white font-bold focus:outline-none focus:border-rose-500"
                    >
                      {customExpenseCategories.length > 0 && (
                        <optgroup label="✨ Minhas Categorias Personalizadas">
                          {customExpenseCategories.map(cat => (
                            <option key={`planner-custom-${cat}`} value={cat}>
                              ⭐ {cat} (Personalizada)
                            </option>
                          ))}
                        </optgroup>
                      )}
                      <optgroup label="📁 Categorias">
                        {expenseCategories
                          .filter(c => !customExpenseCategories.includes(c))
                          .map(cat => (
                            <option key={`planner-cat-${cat}`} value={cat}>
                              {cat}
                            </option>
                          ))}
                      </optgroup>
                    </select>
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-400 uppercase block mb-1">Valor da Despesa (R$)</label>
                    <input
                      type="number"
                      step="0.01"
                      value={launchExpAmount}
                      onChange={e => setLaunchExpAmount(e.target.value)}
                      placeholder="35.00"
                      className="w-full bg-white/5 border border-white/15 rounded-xl px-3 py-2 text-sm text-rose-400 font-black focus:outline-none focus:border-rose-500"
                      required
                    />
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-400 uppercase block mb-1">Descrição</label>
                    <input
                      type="text"
                      value={launchExpDesc}
                      onChange={e => setLaunchExpDesc(e.target.value)}
                      placeholder="Ex: Almoço no self-service, 20L de gasolina..."
                      className="w-full bg-white/5 border border-white/15 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-rose-500"
                    />
                  </div>
                </>
              )}

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowLaunchModal(false)}
                  className="bg-white/10 hover:bg-white/15 text-slate-300 font-bold px-4 py-2 rounded-xl text-xs"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className={`font-black px-5 py-2 rounded-xl text-xs shadow-lg transition ${
                    launchType === 'earning'
                      ? 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-emerald-500/20'
                      : 'bg-rose-500 hover:bg-rose-400 text-white shadow-rose-500/20'
                  }`}
                >
                  Salvar Lançamento
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: ADICIONAR / EDITAR EVENTO DE ESCALA DO PLANNER */}
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
