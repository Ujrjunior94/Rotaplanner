import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';
import {
  UserProfile,
  Vehicle,
  WorkSession,
  PlannerEvent,
  RecurringScheduleDay,
  EarningItem,
  ExpenseItem,
  FuelRecord,
  MaintenanceRecord,
  DriverAlert,
  PlatformType,
  DriverStrategy,
} from '../types';
import { defaultStrategyPresets } from '../data/defaultStrategies';
import {
  RecalculationOptions,
  RecalculationSummary,
  previewRecalculateSessions,
  formatCurrency,
  formatKm,
} from '../utils/calc';

export const DEFAULT_EXPENSE_CATEGORIES: string[] = [
  'Alimentação',
  'Combustível',
  'Lavagem',
  'Limpeza',
  'Multas',
  'Estacionamento',
  'Pedágio',
  'Internet',
  'Seguro',
  'IPVA',
  'Documentação',
  'Manutenção',
  'Óleo',
  'Freios',
  'Pneus',
  'Acessórios',
  'Outros',
];

interface DriverContextType {
  profile: UserProfile;
  vehicle: Vehicle;
  sessions: WorkSession[];
  activeSession: WorkSession | null;
  plannerEvents: PlannerEvent[];
  recurringSchedule: RecurringScheduleDay[];
  earnings: EarningItem[];
  expenses: ExpenseItem[];
  fuelRecords: FuelRecord[];
  maintenances: MaintenanceRecord[];
  alerts: DriverAlert[];
  isDemoData: boolean;
  strategies: DriverStrategy[];
  activeStrategy: DriverStrategy | null;

  // Expense Categories
  expenseCategories: string[];
  customExpenseCategories: string[];
  addCustomExpenseCategory: (category: string) => void;
  removeCustomExpenseCategory: (category: string) => void;
  resetCustomExpenseCategories: () => void;
  
  // Actions
  updateProfile: (data: Partial<UserProfile>) => void;
  updateVehicle: (data: Partial<Vehicle>) => void;
  startShift: (startKm: number, platforms?: PlatformType[]) => void;
  endShift: (
    endKm: number,
    gross: number,
    tips: number,
    trips: number,
    fuelExp: number,
    otherExp: number,
    notes?: string,
    platformEarnings?: Partial<Record<PlatformType, { amount: number; trips: number }>>,
    reserves?: { fuelReserve?: number; maintenanceReserve?: number }
  ) => void;
  addCompletedShift: (sessionData: {
    startTime?: string;
    endTime?: string;
    startOdometer: number;
    endOdometer: number;
    grossEarnings: number;
    tips?: number;
    tripsCount?: number;
    fuelExpenses?: number;
    otherExpenses?: number;
    fuelReserve?: number;
    maintenanceReserve?: number;
    notes?: string;
    platformEarnings?: Partial<Record<PlatformType, { amount: number; trips: number }>>;
  }) => void;
  cancelShift: () => void;
  recalculateSessionsWithVehicleData: (options?: RecalculationOptions) => RecalculationSummary;
  
  // Strategies
  createStrategy: (strategy: Omit<DriverStrategy, 'id' | 'createdAt'>) => DriverStrategy;
  updateStrategy: (id: string, data: Partial<DriverStrategy>) => void;
  deleteStrategy: (id: string) => void;
  activateStrategy: (id: string, applyToSchedule?: boolean) => void;
  resetStrategiesToDefault: () => void;
  
  // Planner
  addPlannerEvent: (event: Omit<PlannerEvent, 'id'>) => void;
  updatePlannerEvent: (id: string, event: Partial<PlannerEvent>) => void;
  deletePlannerEvent: (id: string) => void;
  setRecurringSchedule: (schedule: RecurringScheduleDay[]) => void;
  applyRecurringScheduleToRange: (startDateStr: string, daysCount: number) => void;
  duplicateScheduleToWeek: (sourceWeekStartDate: string, targetWeekStartDate: string) => void;
  
  // Transactions
  addEarning: (earning: Omit<EarningItem, 'id' | 'timestamp'>) => void;
  deleteEarning: (id: string) => void;
  addExpense: (expense: Omit<ExpenseItem, 'id'>) => void;
  deleteExpense: (id: string) => void;
  addFuelRecord: (fuel: Omit<FuelRecord, 'id'>) => void;
  deleteFuelRecord: (id: string) => void;
  addMaintenance: (maint: Omit<MaintenanceRecord, 'id'>) => void;
  updateMaintenance: (id: string, maint: Partial<MaintenanceRecord>) => void;
  deleteMaintenance: (id: string) => void;
  
  // Alerts
  markAlertRead: (id: string) => void;
  clearAlerts: () => void;
  
  // Data management
  loadDemoData: () => void;
  clearAllData: () => void;
  exportDataJSON: () => void;
  exportDataCSV: () => void;
  importDataJSON: (jsonString: string) => boolean;
}

const defaultProfile: UserProfile = {
  id: 'usr-1',
  name: 'Motorista Parceiro',
  dailyGoal: 250,
  weeklyGoal: 1500,
  monthlyGoal: 6000,
  annualGoal: 72000,
  minAcceptableRateKm: 2.20,
  minAcceptableRateHour: 38.00,
  gasPriceReference: 5.89,
  platforms: ['Uber', '99'],
  darkMode: true,
  onboardingCompleted: true,
};

const defaultVehicle: Vehicle = {
  id: 'veh-1',
  make: 'Chevrolet',
  model: 'Onix Plus 1.0 Flex',
  year: 2023,
  plate: 'BRA-2E19',
  fuelType: 'Flex',
  tankCapacity: 44,
  avgConsumption: 12.5, // km/L
  currentOdometer: 45800,
  purchasePrice: 78000,
  estimatedCurrentValue: 69000,
  estimatedLifespanKm: 300000,
  financed: true,
  financingInstallment: 1250,
  financingInstallmentsLeft: 22,
  financingInterestRate: 1.49,
  insuranceMonthly: 210,
  ipvaAnnual: 2400,
  licensingAnnual: 160,
};

const defaultRecurringSchedule: RecurringScheduleDay[] = [
  { dayOfWeek: 1, type: 'work', startTime: '06:00', endTime: '14:00', targetEarnings: 250, platforms: ['Uber', '99'], notes: 'Foco na manhã' },
  { dayOfWeek: 2, type: 'work', startTime: '06:00', endTime: '14:00', targetEarnings: 250, platforms: ['Uber', '99'], notes: 'Centro e Aeroporto' },
  { dayOfWeek: 3, type: 'off', startTime: '', endTime: '', targetEarnings: 0, platforms: [], notes: 'Dia de descanso' },
  { dayOfWeek: 4, type: 'work', startTime: '14:00', endTime: '22:00', targetEarnings: 220, platforms: ['Uber', '99'], notes: 'Horário de pico noturno' },
  { dayOfWeek: 5, type: 'work', startTime: '14:00', endTime: '23:00', targetEarnings: 320, platforms: ['Uber', '99', 'inDrive'], notes: 'Sexta-feira movimentada' },
  { dayOfWeek: 6, type: 'work', startTime: '16:00', endTime: '01:00', targetEarnings: 350, platforms: ['Uber', '99'], notes: 'Sábado noturno' },
  { dayOfWeek: 0, type: 'off', startTime: '', endTime: '', targetEarnings: 0, platforms: [], notes: 'Domingo com a família' },
];

const DriverContext = createContext<DriverContextType | undefined>(undefined);

export const DriverProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [profile, setProfile] = useState<UserProfile>(() => {
    const saved = localStorage.getItem('@driver_profile_v2');
    return saved ? JSON.parse(saved) : defaultProfile;
  });

  const [vehicle, setVehicle] = useState<Vehicle>(() => {
    const saved = localStorage.getItem('@driver_vehicle_v2');
    return saved ? JSON.parse(saved) : defaultVehicle;
  });

  const [sessions, setSessions] = useState<WorkSession[]>(() => {
    const saved = localStorage.getItem('@driver_sessions_v2');
    return saved ? JSON.parse(saved) : [];
  });

  const [plannerEvents, setPlannerEvents] = useState<PlannerEvent[]>(() => {
    const saved = localStorage.getItem('@driver_planner_v2');
    return saved ? JSON.parse(saved) : [];
  });

  const [recurringSchedule, setRecurringScheduleState] = useState<RecurringScheduleDay[]>(() => {
    const saved = localStorage.getItem('@driver_recurring_v2');
    return saved ? JSON.parse(saved) : defaultRecurringSchedule;
  });

  const [earnings, setEarnings] = useState<EarningItem[]>(() => {
    const saved = localStorage.getItem('@driver_earnings_v2');
    return saved ? JSON.parse(saved) : [];
  });

  const [expenses, setExpenses] = useState<ExpenseItem[]>(() => {
    const saved = localStorage.getItem('@driver_expenses_v2');
    return saved ? JSON.parse(saved) : [];
  });

  const [fuelRecords, setFuelRecords] = useState<FuelRecord[]>(() => {
    const saved = localStorage.getItem('@driver_fuel_v2');
    return saved ? JSON.parse(saved) : [];
  });

  const [maintenances, setMaintenances] = useState<MaintenanceRecord[]>(() => {
    const saved = localStorage.getItem('@driver_maint_v2');
    return saved ? JSON.parse(saved) : [];
  });

  const [alerts, setAlerts] = useState<DriverAlert[]>(() => {
    const saved = localStorage.getItem('@driver_alerts_v2');
    return saved ? JSON.parse(saved) : [];
  });

  const [strategies, setStrategies] = useState<DriverStrategy[]>(() => {
    const saved = localStorage.getItem('@driver_strategies_v2');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      } catch (e) {
        console.error('Erro ao ler estratégias salvas:', e);
      }
    }
    return defaultStrategyPresets;
  });

  const [isDemoData, setIsDemoData] = useState<boolean>(() => {
    return localStorage.getItem('@driver_is_demo_v2') === 'true';
  });

  const [customExpenseCategories, setCustomExpenseCategories] = useState<string[]>(() => {
    const saved = localStorage.getItem('@driver_custom_expense_cats_v2');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      } catch (e) {
        console.error('Erro ao ler categorias personalizadas:', e);
      }
    }
    return [];
  });

  // Lista consolidada de categorias de despesa (padrão + personalizadas pelo motorista)
  const expenseCategories = useMemo(() => {
    const list = [...DEFAULT_EXPENSE_CATEGORIES, ...customExpenseCategories];
    return Array.from(new Set(list.map(c => c.trim()))).filter(Boolean);
  }, [customExpenseCategories]);

  const addCustomExpenseCategory = (cat: string) => {
    const trimmed = cat.trim();
    if (!trimmed) return;
    setCustomExpenseCategories(prev => {
      const exists =
        prev.some(c => c.toLowerCase() === trimmed.toLowerCase()) ||
        DEFAULT_EXPENSE_CATEGORIES.some(c => c.toLowerCase() === trimmed.toLowerCase());
      if (exists) return prev;
      return [...prev, trimmed];
    });
  };

  const removeCustomExpenseCategory = (cat: string) => {
    setCustomExpenseCategories(prev => prev.filter(c => c.toLowerCase() !== cat.toLowerCase()));
  };

  const resetCustomExpenseCategories = () => {
    setCustomExpenseCategories([]);
  };

  // Estratégia ativa atual
  const activeStrategy = strategies.find(s => s.isActive) || strategies[0] || null;

  // Salvar no localStorage de forma contínua
  useEffect(() => {
    localStorage.setItem('@driver_profile_v2', JSON.stringify(profile));
    localStorage.setItem('@driver_vehicle_v2', JSON.stringify(vehicle));
    localStorage.setItem('@driver_sessions_v2', JSON.stringify(sessions));
    localStorage.setItem('@driver_planner_v2', JSON.stringify(plannerEvents));
    localStorage.setItem('@driver_recurring_v2', JSON.stringify(recurringSchedule));
    localStorage.setItem('@driver_earnings_v2', JSON.stringify(earnings));
    localStorage.setItem('@driver_expenses_v2', JSON.stringify(expenses));
    localStorage.setItem('@driver_fuel_v2', JSON.stringify(fuelRecords));
    localStorage.setItem('@driver_maint_v2', JSON.stringify(maintenances));
    localStorage.setItem('@driver_alerts_v2', JSON.stringify(alerts));
    localStorage.setItem('@driver_strategies_v2', JSON.stringify(strategies));
    localStorage.setItem('@driver_custom_expense_cats_v2', JSON.stringify(customExpenseCategories));
    localStorage.setItem('@driver_is_demo_v2', String(isDemoData));
  }, [profile, vehicle, sessions, plannerEvents, recurringSchedule, earnings, expenses, fuelRecords, maintenances, alerts, strategies, customExpenseCategories, isDemoData]);

  // Checagem proativa de alertas
  useEffect(() => {
    const newAlerts: DriverAlert[] = [];
    const todayStr = new Date().toISOString().split('T')[0];

    // Alertas de Manutenção Próxima
    maintenances.forEach(m => {
      if (m.nextOdometer && !m.completed) {
        const remainingKm = m.nextOdometer - vehicle.currentOdometer;
        if (remainingKm > 0 && remainingKm <= 1000) {
          newAlerts.push({
            id: `alert-maint-${m.id}`,
            title: `Aviso de Manutenção: ${m.category}`,
            message: `Faltam ${remainingKm} km para a próxima revisão de ${m.category} (prevista em ${m.nextOdometer.toLocaleString('pt-BR')} km).`,
            type: 'maintenance',
            date: todayStr,
            read: false,
          });
        }
      }
    });

    // Alerta de Escala do Dia
    const todayPlan = plannerEvents.find(p => p.date === todayStr);
    if (todayPlan && todayPlan.type === 'work') {
      newAlerts.push({
        id: `alert-plan-${todayStr}`,
        title: 'Expediente Planejado Hoje',
        message: `Seu turno planejado é das ${todayPlan.startTime || '06:00'} às ${todayPlan.endTime || '14:00'} com meta de R$ ${todayPlan.targetEarnings}.`,
        type: 'shift',
        date: todayStr,
        read: false,
      });
    }

    if (newAlerts.length > 0) {
      setAlerts(prev => {
        const existingIds = new Set(prev.map(a => a.id));
        const filtered = newAlerts.filter(a => !existingIds.has(a.id));
        return [...filtered, ...prev];
      });
    }
  }, [vehicle.currentOdometer, maintenances, plannerEvents]);

  const activeSession = sessions.find(s => s.status === 'active') || null;

  const updateProfile = (data: Partial<UserProfile>) => setProfile(p => ({ ...p, ...data }));
  const updateVehicle = (data: Partial<Vehicle>) => setVehicle(v => ({ ...v, ...data }));

  const startShift = (startKm: number, platforms?: PlatformType[]) => {
    if (activeSession) return;
    const newSession: WorkSession = {
      id: 'ses-' + Date.now(),
      startTime: new Date().toISOString(),
      endTime: null,
      startOdometer: startKm,
      endOdometer: null,
      status: 'active',
      grossEarnings: 0,
      tips: 0,
      tripsCount: 0,
      fuelExpenses: 0,
      otherExpenses: 0,
      notes: platforms && platforms.length > 0 ? `Plataformas: ${platforms.join(', ')}` : undefined,
    };
    setSessions(prev => [newSession, ...prev]);
    setVehicle(v => ({ ...v, currentOdometer: startKm }));
  };

  const endShift = (
    endKm: number,
    gross: number,
    tips: number,
    trips: number,
    fuelExp: number,
    otherExp: number,
    notes?: string,
    platformEarnings?: Partial<Record<PlatformType, { amount: number; trips: number }>>,
    reserves?: { fuelReserve?: number; maintenanceReserve?: number }
  ) => {
    if (!activeSession) return;
    const safeEndKm = Math.max(endKm, activeSession.startOdometer);
    const kmDriven = Math.max(0, safeEndKm - activeSession.startOdometer);
    const calculatedFuelReserve = reserves?.fuelReserve !== undefined
      ? reserves.fuelReserve
      : Math.round(((kmDriven / (vehicle.avgConsumption || 11.5)) * (profile.gasPriceReference || 5.89)) * 100) / 100;
    const maintenanceRate = activeStrategy?.fuelAndMaintenancePlan.reserveMaintenancePerKm || 0.15;
    const calculatedMaintReserve = reserves?.maintenanceReserve !== undefined
      ? reserves.maintenanceReserve
      : Math.round((kmDriven * maintenanceRate) * 100) / 100;

    const finished: WorkSession = {
      ...activeSession,
      endTime: new Date().toISOString(),
      endOdometer: safeEndKm,
      status: 'completed',
      grossEarnings: gross,
      tips,
      tripsCount: trips,
      fuelExpenses: fuelExp || 0,
      otherExpenses: otherExp || 0,
      fuelReserve: calculatedFuelReserve,
      maintenanceReserve: calculatedMaintReserve,
      platformEarnings,
      notes,
    };
    setSessions(prev => prev.map(s => (s.id === activeSession.id ? finished : s)));
    setVehicle(v => ({ ...v, currentOdometer: Math.max(v.currentOdometer, safeEndKm) }));

    // Atualiza evento do planner do dia se houver:
    // Apenas as despesas diretas desembolsadas entram em realizedExpenses; o combustível gasto entra em realizedReserves
    const todayStr = activeSession.startTime.split('T')[0];
    setPlannerEvents(prev =>
      prev.map(p =>
        p.date === todayStr
          ? {
              ...p,
              realizedGross: gross + tips,
              realizedExpenses: (fuelExp || 0) + (otherExp || 0),
              realizedReserves: (p.realizedReserves || 0) + calculatedFuelReserve + calculatedMaintReserve,
              realizedTrips: trips,
            }
          : p
      )
    );
  };

  const addCompletedShift = (data: {
    startTime?: string;
    endTime?: string;
    startOdometer: number;
    endOdometer: number;
    grossEarnings: number;
    tips?: number;
    tripsCount?: number;
    fuelExpenses?: number;
    otherExpenses?: number;
    fuelReserve?: number;
    maintenanceReserve?: number;
    notes?: string;
    platformEarnings?: Partial<Record<PlatformType, { amount: number; trips: number }>>;
  }) => {
    const kmDriven = Math.max(0, data.endOdometer - data.startOdometer);
    const calculatedFuelReserve = data.fuelReserve !== undefined
      ? data.fuelReserve
      : Math.round(((kmDriven / (vehicle.avgConsumption || 11.5)) * (profile.gasPriceReference || 5.89)) * 100) / 100;
    const maintenanceRate = activeStrategy?.fuelAndMaintenancePlan.reserveMaintenancePerKm || 0.15;
    const calculatedMaintReserve = data.maintenanceReserve !== undefined
      ? data.maintenanceReserve
      : Math.round((kmDriven * maintenanceRate) * 100) / 100;

    const newSession: WorkSession = {
      id: 'ses-' + Date.now(),
      startTime: data.startTime || new Date(Date.now() - 6 * 3600000).toISOString(),
      endTime: data.endTime || new Date().toISOString(),
      startOdometer: data.startOdometer,
      endOdometer: data.endOdometer,
      status: 'completed',
      grossEarnings: data.grossEarnings,
      tips: data.tips || 0,
      tripsCount: data.tripsCount || 1,
      fuelExpenses: data.fuelExpenses || 0,
      otherExpenses: data.otherExpenses || 0,
      fuelReserve: calculatedFuelReserve,
      maintenanceReserve: calculatedMaintReserve,
      platformEarnings: data.platformEarnings,
      notes: data.notes,
    };

    setSessions(prev => [newSession, ...prev]);
    setVehicle(v => ({ ...v, currentOdometer: Math.max(v.currentOdometer, data.endOdometer) }));

    const sessionDate = newSession.startTime.split('T')[0];
    setPlannerEvents(prev =>
      prev.map(p =>
        p.date === sessionDate
          ? {
              ...p,
              realizedGross: (p.realizedGross || 0) + data.grossEarnings + (data.tips || 0),
              realizedExpenses: (p.realizedExpenses || 0) + (newSession.fuelExpenses + (data.otherExpenses || 0)),
              realizedReserves: (p.realizedReserves || 0) + calculatedFuelReserve + calculatedMaintReserve,
              realizedTrips: (p.realizedTrips || 0) + (data.tripsCount || 1),
            }
          : p
      )
    );
  };

  const cancelShift = () => {
    if (!activeSession) return;
    setSessions(prev => prev.filter(s => s.id !== activeSession.id));
  };

  const recalculateSessionsWithVehicleData = (options: RecalculationOptions = {}): RecalculationSummary => {
    const summary = previewRecalculateSessions(sessions, vehicle, {
      ...options,
      gasPrice: options.gasPrice || profile.gasPriceReference || 5.89,
      avgConsumption: options.avgConsumption || vehicle.avgConsumption || 11.5,
    });

    if (summary.items.length === 0) {
      return summary;
    }

    const itemsMap = new Map<string, (typeof summary.items)[0]>();
    summary.items.forEach(item => {
      itemsMap.set(item.sessionId, item);
    });

    // 1. Atualizar sessões
    const updatedSessions = sessions.map(s => {
      const recalculated = itemsMap.get(s.id);
      if (!recalculated) return s;

      const newFuel = recalculated.newFuelExpenses;
      const otherExp = s.otherExpenses || 0;
      const maintCost = options.includeMaintenance ? recalculated.maintenanceReserveCost : 0;

      return {
        ...s,
        fuelExpenses: newFuel,
        otherExpenses: options.includeMaintenance ? otherExp + maintCost : otherExp,
        notes: s.notes
          ? (s.notes.includes('[Recalculado') ? s.notes : `${s.notes} [Recalculado ${options.avgConsumption || vehicle.avgConsumption}km/L]`)
          : `Recalculado com consumo ${options.avgConsumption || vehicle.avgConsumption} km/L`,
      };
    });

    setSessions(updatedSessions);

    // 2. Atualizar eventos do planejador para manter realizado sincronizado
    const datesToUpdate = new Map<string, { fuel: number; gross: number; other: number }>();
    updatedSessions.forEach(s => {
      const date = s.startTime.split('T')[0];
      const existing = datesToUpdate.get(date) || { fuel: 0, gross: 0, other: 0 };
      datesToUpdate.set(date, {
        fuel: existing.fuel + (s.fuelExpenses || 0),
        gross: existing.gross + (s.grossEarnings || 0) + (s.tips || 0),
        other: existing.other + (s.otherExpenses || 0),
      });
    });

    setPlannerEvents(prev =>
      prev.map(p => {
        const stats = datesToUpdate.get(p.date);
        if (stats) {
          return {
            ...p,
            realizedGross: stats.gross,
            realizedExpenses: stats.fuel + stats.other,
          };
        }
        return p;
      })
    );

    // 3. Gerar alerta informativo no sistema
    const todayStr = new Date().toISOString().split('T')[0];
    const newAlert: DriverAlert = {
      id: `alert-recalc-${Date.now()}`,
      title: 'Lançamentos Recalculados com Sucesso',
      message: `${summary.totalSessions} expedientes foram recalculados com base no consumo de ${summary.avgConsumptionUsed} km/L e combustível a ${formatCurrency(summary.fuelPriceUsed)}/L. Total de combustível ajustado para ${formatCurrency(summary.newTotalFuel)}.`,
      type: 'info',
      date: todayStr,
      read: false,
    };

    setAlerts(prev => [newAlert, ...prev]);

    return summary;
  };

  // Funções de Gerenciamento de Estratégias
  const createStrategy = (strategyData: Omit<DriverStrategy, 'id' | 'createdAt'>): DriverStrategy => {
    const newStrategy: DriverStrategy = {
      ...strategyData,
      id: 'strat-custom-' + Date.now(),
      isPreset: false,
      isActive: false,
      createdAt: new Date().toISOString(),
    };
    setStrategies(prev => [newStrategy, ...prev]);
    return newStrategy;
  };

  const updateStrategy = (id: string, data: Partial<DriverStrategy>) => {
    setStrategies(prev =>
      prev.map(s => (s.id === id ? { ...s, ...data } : s))
    );
  };

  const deleteStrategy = (id: string) => {
    setStrategies(prev => {
      const filtered = prev.filter(s => s.id !== id);
      if (filtered.length === 0) {
        return defaultStrategyPresets;
      }
      // Se deletou a ativa, ativa a primeira disponível
      if (!filtered.some(s => s.isActive)) {
        filtered[0] = { ...filtered[0], isActive: true };
      }
      return filtered;
    });
  };

  const activateStrategy = (id: string, applyToSchedule: boolean = false) => {
    const target = strategies.find(s => s.id === id);
    if (!target) return;

    setStrategies(prev =>
      prev.map(s => ({
        ...s,
        isActive: s.id === id,
      }))
    );

    // Sincronizar parâmetros do perfil do motorista com a estratégia ativada
    setProfile(prev => ({
      ...prev,
      weeklyGoal: target.targetWeeklyGross,
      dailyGoal: Math.round(target.targetWeeklyGross / Math.max(target.workingWindows.length, 1)),
      minAcceptableRateKm: target.acceptanceRules.minRateKm,
      minAcceptableRateHour: target.acceptanceRules.minRateHour,
      platforms: target.primaryPlatforms,
    }));

    // Se o motorista optar por aplicar a escala ao Planner
    if (applyToSchedule && target.workingWindows.length > 0) {
      const newRecSchedule: RecurringScheduleDay[] = [0, 1, 2, 3, 4, 5, 6].map(dayNum => {
        const win = target.workingWindows.find(w => w.dayOfWeek === dayNum);
        if (win) {
          return {
            dayOfWeek: dayNum,
            type: 'work',
            startTime: win.startTime,
            endTime: win.endTime,
            targetEarnings: win.targetDailyEarnings,
            platforms: [win.recommendedApp, ...target.primaryPlatforms.filter(p => p !== win.recommendedApp)],
            notes: `${win.focusArea} ${win.passActive ? `[${win.passActive}]` : ''}`.trim(),
          };
        } else {
          return {
            dayOfWeek: dayNum,
            type: 'off',
            startTime: '',
            endTime: '',
            targetEarnings: 0,
            platforms: [],
            notes: 'Descanso planejado',
          };
        }
      });
      setRecurringScheduleState(newRecSchedule);
    }
  };

  const resetStrategiesToDefault = () => {
    setStrategies(defaultStrategyPresets);
  };

  const addPlannerEvent = (event: Omit<PlannerEvent, 'id'>) => {
    const newEv: PlannerEvent = { ...event, id: 'ev-' + Date.now() };
    setPlannerEvents(prev => [...prev.filter(e => e.date !== event.date), newEv]);
  };

  const updatePlannerEvent = (id: string, event: Partial<PlannerEvent>) => {
    setPlannerEvents(prev => prev.map(e => (e.id === id ? { ...e, ...event } : e)));
  };

  const deletePlannerEvent = (id: string) => {
    setPlannerEvents(prev => prev.filter(e => e.id !== id));
  };

  const setRecurringSchedule = (schedule: RecurringScheduleDay[]) => {
    setRecurringScheduleState(schedule);
  };

  const applyRecurringScheduleToRange = (startDateStr: string, daysCount: number = 7) => {
    const start = new Date(startDateStr + 'T00:00:00');
    const newEvents: PlannerEvent[] = [];

    for (let i = 0; i < daysCount; i++) {
      const current = new Date(start);
      current.setDate(current.getDate() + i);
      const dayOfWeek = current.getDay();
      const dateStr = current.toISOString().split('T')[0];

      const model = recurringSchedule.find(r => r.dayOfWeek === dayOfWeek);
      if (model) {
        newEvents.push({
          id: 'ev-rec-' + dateStr + '-' + Date.now(),
          date: dateStr,
          type: model.type,
          startTime: model.startTime,
          endTime: model.endTime,
          targetEarnings: model.targetEarnings,
          platforms: model.platforms,
          notes: model.notes,
        });
      }
    }

    setPlannerEvents(prev => {
      const datesToReplace = new Set(newEvents.map(e => e.date));
      const kept = prev.filter(e => !datesToReplace.has(e.date));
      return [...kept, ...newEvents];
    });
  };

  const duplicateScheduleToWeek = (sourceWeekStartDate: string, targetWeekStartDate: string) => {
    const srcDate = new Date(sourceWeekStartDate + 'T00:00:00');
    const targetDate = new Date(targetWeekStartDate + 'T00:00:00');
    const diffTime = targetDate.getTime() - srcDate.getTime();
    const diffDays = Math.round(diffTime / (1000 * 3600 * 24));

    const sourceEvents = plannerEvents.filter(e => {
      const d = new Date(e.date + 'T00:00:00');
      const diff = Math.round((d.getTime() - srcDate.getTime()) / (1000 * 3600 * 24));
      return diff >= 0 && diff < 7;
    });

    const newEvents = sourceEvents.map(e => {
      const d = new Date(e.date + 'T00:00:00');
      d.setDate(d.getDate() + diffDays);
      return {
        ...e,
        id: 'ev-dup-' + Math.random().toString(36).substr(2, 9),
        date: d.toISOString().split('T')[0],
      };
    });

    setPlannerEvents(prev => {
      const datesToReplace = new Set(newEvents.map(e => e.date));
      const kept = prev.filter(e => !datesToReplace.has(e.date));
      return [...kept, ...newEvents];
    });
  };

  const addEarning = (earning: Omit<EarningItem, 'id' | 'timestamp'>) => {
    const item: EarningItem = {
      ...earning,
      id: 'earn-' + Date.now(),
      timestamp: new Date().toISOString(),
    };
    setEarnings(prev => [item, ...prev]);

    if (activeSession) {
      setSessions(prev =>
        prev.map(s =>
          s.id === activeSession.id
            ? {
                ...s,
                grossEarnings: s.grossEarnings + item.amount,
                tips: s.tips + item.tip,
                tripsCount: s.tripsCount + item.tripsCount,
              }
            : s
        )
      );
    }
  };

  const deleteEarning = (id: string) => {
    setEarnings(prev => prev.filter(e => e.id !== id));
  };

  const addExpense = (exp: Omit<ExpenseItem, 'id'>) => {
    const item: ExpenseItem = {
      ...exp,
      id: 'exp-' + Date.now(),
    };
    setExpenses(prev => [item, ...prev]);

    if (activeSession && exp.sessionId === activeSession.id) {
      setSessions(prev =>
        prev.map(s =>
          s.id === activeSession.id
            ? {
                ...s,
                otherExpenses: s.otherExpenses + exp.amount,
              }
            : s
        )
      );
    }
  };

  const deleteExpense = (id: string) => {
    setExpenses(prev => prev.filter(e => e.id !== id));
  };

  const addFuelRecord = (fuel: Omit<FuelRecord, 'id'>) => {
    const item: FuelRecord = {
      ...fuel,
      id: 'fuel-' + Date.now(),
    };
    setFuelRecords(prev => [item, ...prev]);

    // Registrar como despesa de combustível
    addExpense({
      category: 'Combustível',
      amount: fuel.totalAmount,
      description: `${fuel.liters.toFixed(1)}L de ${fuel.fuelType} @ ${fuel.stationName || 'Posto'}`,
      date: fuel.date,
      sessionId: activeSession?.id,
    });

    if (fuel.odometer && fuel.odometer > vehicle.currentOdometer) {
      setVehicle(v => ({ ...v, currentOdometer: fuel.odometer }));
    }
  };

  const deleteFuelRecord = (id: string) => {
    setFuelRecords(prev => prev.filter(f => f.id !== id));
  };

  const addMaintenance = (maint: Omit<MaintenanceRecord, 'id'>) => {
    const item: MaintenanceRecord = {
      ...maint,
      id: 'maint-' + Date.now(),
    };
    setMaintenances(prev => [item, ...prev]);

    addExpense({
      category: 'Manutenção',
      amount: maint.amount,
      description: `${maint.category}: ${maint.description}`,
      date: maint.date,
    });

    if (maint.odometer && maint.odometer > vehicle.currentOdometer) {
      setVehicle(v => ({ ...v, currentOdometer: maint.odometer }));
    }
  };

  const updateMaintenance = (id: string, maint: Partial<MaintenanceRecord>) => {
    setMaintenances(prev => prev.map(m => (m.id === id ? { ...m, ...maint } : m)));
  };

  const deleteMaintenance = (id: string) => {
    setMaintenances(prev => prev.filter(m => m.id !== id));
  };

  const markAlertRead = (id: string) => {
    setAlerts(prev => prev.map(a => (a.id === id ? { ...a, read: true } : a)));
  };

  const clearAlerts = () => {
    setAlerts([]);
  };

  const loadDemoData = () => {
    const today = new Date();
    const demoSessions: WorkSession[] = [];
    const demoEarnings: EarningItem[] = [];
    const demoExpenses: ExpenseItem[] = [];
    const demoFuel: FuelRecord[] = [];
    const demoMaintenances: MaintenanceRecord[] = [];
    const demoPlanner: PlannerEvent[] = [];

    // Gerar 14 dias de histórico detalhado e verossímil
    for (let i = 13; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      const isOffDay = i % 5 === 0;

      if (isOffDay) {
        demoPlanner.push({
          id: `demo-plan-${i}`,
          date: dateStr,
          type: 'off',
          startTime: '',
          endTime: '',
          targetEarnings: 0,
          platforms: [],
          notes: 'Folga planejada / descanso',
        });
        continue;
      }

      const km = 130 + Math.floor(Math.random() * 70);
      const gross = 260 + Math.floor(Math.random() * 110);
      const tips = 12 + Math.floor(Math.random() * 15);
      const fuel = 60 + Math.floor(Math.random() * 25);
      const trips = 13 + Math.floor(Math.random() * 8);

      const startHour = 6 + (i % 2 === 0 ? 0 : 7);
      const durationHours = 7.5 + (Math.random() * 1.5);
      const endHour = startHour + Math.floor(durationHours);
      const startIso = `${dateStr}T${startHour.toString().padStart(2, '0')}:00:00.000Z`;
      const endIso = `${dateStr}T${endHour.toString().padStart(2, '0')}:30:00.000Z`;

      const startOdo = 44000 + (14 - i) * 140;
      const endOdo = startOdo + km;

      const uberGross = Math.round(gross * 0.55);
      const ninetyNineGross = Math.round(gross * 0.30);
      const inDriveGross = Math.max(gross - uberGross - ninetyNineGross, 0);

      const uberTrips = Math.max(Math.round(trips * 0.55), 1);
      const ninetyNineTrips = Math.max(Math.round(trips * 0.30), 1);
      const inDriveTrips = Math.max(trips - uberTrips - ninetyNineTrips, 1);

      demoSessions.push({
        id: `demo-ses-${i}`,
        startTime: startIso,
        endTime: endIso,
        startOdometer: startOdo,
        endOdometer: endOdo,
        status: 'completed',
        grossEarnings: gross,
        tips,
        tripsCount: trips,
        fuelExpenses: fuel,
        otherExpenses: 18,
        platformEarnings: {
          Uber: { amount: uberGross, trips: uberTrips },
          99: { amount: ninetyNineGross, trips: ninetyNineTrips },
          inDrive: { amount: inDriveGross, trips: inDriveTrips },
        },
        notes: 'Expediente regular na zona sul e centro expandido.',
      });

      demoEarnings.push(
        {
          id: `demo-earn-uber-${i}`,
          platform: 'Uber',
          amount: uberGross,
          tip: Math.round(tips * 0.6),
          tripsCount: uberTrips,
          timestamp: `${dateStr}T10:00:00.000Z`,
        },
        {
          id: `demo-earn-99-${i}`,
          platform: '99',
          amount: ninetyNineGross,
          tip: Math.round(tips * 0.25),
          tripsCount: ninetyNineTrips,
          timestamp: `${dateStr}T13:00:00.000Z`,
        },
        {
          id: `demo-earn-indrive-${i}`,
          platform: 'inDrive',
          amount: inDriveGross,
          tip: Math.round(tips * 0.15),
          tripsCount: inDriveTrips,
          timestamp: `${dateStr}T16:00:00.000Z`,
        }
      );

      if (i % 3 === 0) {
        demoFuel.push({
          id: `demo-fuel-${i}`,
          stationName: 'Posto Ipiranga Rodo',
          fuelType: 'Gasolina Comum',
          liters: 28.5,
          pricePerLiter: 5.79,
          totalAmount: 165.01,
          odometer: endOdo,
          date: dateStr,
        });
      }

      demoPlanner.push({
        id: `demo-plan-${i}`,
        date: dateStr,
        type: 'work',
        startTime: `${startHour.toString().padStart(2, '0')}:00`,
        endTime: `${endHour.toString().padStart(2, '0')}:00`,
        targetEarnings: 250,
        platforms: ['Uber', '99'],
        notes: 'Meta cumprida com foco em aeroporto',
        realizedGross: gross + tips,
        realizedExpenses: fuel + 18,
        realizedTrips: trips,
      });
    }

    demoExpenses.push(
      { id: 'exp-demo-1', category: 'Alimentação', amount: 28.0, description: 'Almoço Executivo', date: today.toISOString().split('T')[0] },
      { id: 'exp-demo-2', category: 'Lavagem', amount: 45.0, description: 'Lavagem Completa c/ Cera', date: today.toISOString().split('T')[0] },
      { id: 'exp-demo-3', category: 'Internet', amount: 69.9, description: 'Plano Celular 40GB', date: today.toISOString().split('T')[0] }
    );

    demoMaintenances.push(
      {
        id: 'maint-demo-1',
        category: 'Troca de Óleo',
        description: 'Óleo Sintético 5W30 + Filtros (Óleo, Ar, Combustível)',
        amount: 280.0,
        odometer: 40000,
        nextOdometer: 50000,
        date: '2026-07-15',
        completed: true,
      },
      {
        id: 'maint-demo-2',
        category: 'Freios',
        description: 'Pastilhas dianteiras e fluído DOT4',
        amount: 320.0,
        odometer: 42000,
        nextOdometer: 62000,
        date: '2026-08-01',
        completed: true,
      }
    );

    setSessions(demoSessions);
    setEarnings(demoEarnings);
    setExpenses(demoExpenses);
    setFuelRecords(demoFuel);
    setMaintenances(demoMaintenances);
    setPlannerEvents(demoPlanner);
    setIsDemoData(true);
  };

  const clearAllData = () => {
    setSessions([]);
    setEarnings([]);
    setExpenses([]);
    setFuelRecords([]);
    setMaintenances([]);
    setPlannerEvents([]);
    setAlerts([]);
    setCustomExpenseCategories([]);
    setIsDemoData(false);
    localStorage.clear();
  };

  const exportDataJSON = () => {
    const payload = {
      profile,
      vehicle,
      sessions,
      plannerEvents,
      recurringSchedule,
      earnings,
      expenses,
      fuelRecords,
      maintenances,
      customExpenseCategories,
      exportedAt: new Date().toISOString(),
      appVersion: '2.0.0',
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `DriverPlanner_Backup_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const exportDataCSV = () => {
    let csv = '\uFEFF'; // BOM para compatibilidade com Excel em UTF-8
    csv += 'Data,Tipo,Descricao / Plataforma,Valor Bruto,Despesas,Lucro Liquido,KM Rodados,Corridas\n';
    
    sessions.forEach(s => {
      const date = s.startTime.split('T')[0];
      const km = s.endOdometer && s.startOdometer ? s.endOdometer - s.startOdometer : 0;
      const despesas = s.fuelExpenses + s.otherExpenses;
      const liquido = (s.grossEarnings + s.tips) - despesas;
      csv += `${date},Expediente,"Turno Realizado",${(s.grossEarnings + s.tips).toFixed(2)},${despesas.toFixed(2)},${liquido.toFixed(2)},${km},${s.tripsCount}\n`;
    });

    expenses.forEach(e => {
      csv += `${e.date},Despesa,"${e.category}: ${e.description.replace(/"/g, '""')}",0.00,${e.amount.toFixed(2)},-${e.amount.toFixed(2)},0,0\n`;
    });

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `DriverPlanner_Extrato_Financeiro_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const importDataJSON = (jsonStr: string): boolean => {
    try {
      const data = JSON.parse(jsonStr);
      if (data.profile) setProfile(data.profile);
      if (data.vehicle) setVehicle(data.vehicle);
      if (data.sessions) setSessions(data.sessions);
      if (data.plannerEvents) setPlannerEvents(data.plannerEvents);
      if (data.recurringSchedule) setRecurringScheduleState(data.recurringSchedule);
      if (data.earnings) setEarnings(data.earnings);
      if (data.expenses) setExpenses(data.expenses);
      if (data.fuelRecords) setFuelRecords(data.fuelRecords);
      if (data.maintenances) setMaintenances(data.maintenances);
      if (Array.isArray(data.customExpenseCategories)) {
        setCustomExpenseCategories(data.customExpenseCategories);
      }
      setIsDemoData(false);
      return true;
    } catch {
      return false;
    }
  };

  return (
    <DriverContext.Provider
      value={{
        profile,
        vehicle,
        sessions,
        activeSession,
        plannerEvents,
        recurringSchedule,
        earnings,
        expenses,
        fuelRecords,
        maintenances,
        alerts,
        isDemoData,
        strategies,
        activeStrategy,
        createStrategy,
        updateStrategy,
        deleteStrategy,
        activateStrategy,
        resetStrategiesToDefault,
        updateProfile,
        updateVehicle,
        startShift,
        endShift,
        addCompletedShift,
        cancelShift,
        recalculateSessionsWithVehicleData,
        addPlannerEvent,
        updatePlannerEvent,
        deletePlannerEvent,
        setRecurringSchedule,
        applyRecurringScheduleToRange,
        duplicateScheduleToWeek,
        addEarning,
        deleteEarning,
        addExpense,
        deleteExpense,
        addFuelRecord,
        deleteFuelRecord,
        addMaintenance,
        updateMaintenance,
        deleteMaintenance,
        markAlertRead,
        clearAlerts,
        loadDemoData,
        clearAllData,
        exportDataJSON,
        exportDataCSV,
        importDataJSON,
        expenseCategories,
        customExpenseCategories,
        addCustomExpenseCategory,
        removeCustomExpenseCategory,
        resetCustomExpenseCategories,
      }}
    >
      {children}
    </DriverContext.Provider>
  );
};

export const useDriver = () => {
  const ctx = useContext(DriverContext);
  if (!ctx) throw new Error('useDriver must be used within a DriverProvider');
  return ctx;
};
