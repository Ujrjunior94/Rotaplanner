export type PlatformType = 'Uber' | '99' | 'inDrive' | 'Particular' | 'Outro';

export type PlannerEventType = 'work' | 'off' | 'goal' | 'maintenance' | 'appointment' | 'other';

export type ExpenseCategory =
  | 'Combustível'
  | 'Manutenção'
  | 'Pneus'
  | 'Óleo'
  | 'Freios'
  | 'Documentação'
  | 'Seguro'
  | 'IPVA'
  | 'Alimentação'
  | 'Estacionamento'
  | 'Pedágio'
  | 'Internet'
  | 'Lavagem'
  | 'Limpeza'
  | 'Multas'
  | 'Outros'
  | (string & {});

export type MaintenanceCategory =
  | 'Troca de Óleo'
  | 'Pneus'
  | 'Freios'
  | 'Bateria'
  | 'Suspensão'
  | 'Alinhamento'
  | 'Balanceamento'
  | 'Revisão Periódica'
  | 'Outros';

export interface UserProfile {
  id: string;
  name: string;
  dailyGoal: number;
  weeklyGoal: number;
  monthlyGoal: number;
  annualGoal: number;
  minAcceptableRateKm: number; // ex: R$ 2.00
  minAcceptableRateHour: number; // ex: R$ 35.00
  gasPriceReference: number; // ex: R$ 5.89
  platforms: PlatformType[];
  darkMode: boolean;
  onboardingCompleted: boolean;
}

export interface Vehicle {
  id: string;
  make: string;
  model: string;
  year: number;
  plate: string;
  fuelType: 'Flex' | 'Gasolina' | 'Etanol' | 'GNV' | 'Diesel' | 'Elétrico';
  tankCapacity: number;
  avgConsumption: number; // km/L
  currentOdometer: number;
  purchasePrice: number;
  estimatedCurrentValue: number;
  estimatedLifespanKm: number;
  // Financiamento opcional
  financed: boolean;
  financingInstallment: number;
  financingInstallmentsLeft: number;
  financingInterestRate?: number;
  // Custos fixos anuais/mensais
  insuranceMonthly: number;
  ipvaAnnual: number;
  licensingAnnual: number;
}

export interface WorkSession {
  id: string;
  startTime: string; // ISO string
  endTime: string | null;
  startOdometer: number;
  endOdometer: number | null;
  status: 'active' | 'completed';
  grossEarnings: number;
  tips: number;
  tripsCount: number;
  fuelExpenses: number; // Despesa com abastecimento imediato no turno (se abasteceu no posto)
  otherExpenses: number; // Despesas diretas imediatas (alimentação, pedágio, etc.)
  fuelReserve?: number; // Valor a por na reserva para abastecimento futuro
  maintenanceReserve?: number; // Valor a por na reserva para manutenção preventiva
  platformEarnings?: Partial<Record<PlatformType, { amount: number; trips: number }>>;
  notes?: string;
}

export interface PlannerEvent {
  id: string;
  date: string; // YYYY-MM-DD
  type: PlannerEventType;
  startTime?: string; // HH:mm
  endTime?: string; // HH:mm
  targetEarnings: number;
  platforms: PlatformType[];
  notes?: string;
  // Dados realizados sincronizados
  realizedGross?: number;
  realizedExpenses?: number;
  realizedReserves?: number;
  realizedTrips?: number;
}

export interface RecurringScheduleDay {
  dayOfWeek: number; // 0=Domingo, 1=Segunda, ..., 6=Sábado
  type: PlannerEventType;
  startTime: string;
  endTime: string;
  targetEarnings: number;
  platforms: PlatformType[];
  notes?: string;
}

export interface EarningItem {
  id: string;
  sessionId?: string;
  platform: PlatformType;
  amount: number;
  tip: number;
  tripsCount: number;
  distanceKm?: number;
  durationMinutes?: number;
  timestamp: string;
  notes?: string;
}

export interface ExpenseItem {
  id: string;
  sessionId?: string;
  category: ExpenseCategory;
  amount: number;
  description: string;
  date: string; // YYYY-MM-DD
}

export interface FuelRecord {
  id: string;
  stationName: string;
  fuelType: string;
  liters: number;
  pricePerLiter: number;
  totalAmount: number;
  odometer: number;
  date: string; // YYYY-MM-DD
}

export interface MaintenanceRecord {
  id: string;
  category: MaintenanceCategory;
  description: string;
  amount: number;
  odometer: number;
  nextOdometer?: number;
  date: string; // YYYY-MM-DD
  completed: boolean;
}

export interface DriverAlert {
  id: string;
  title: string;
  message: string;
  type: 'maintenance' | 'goal' | 'shift' | 'warning' | 'info';
  date: string;
  read: boolean;
}

export interface RideAnalysis {
  ratePerKm: number;
  ratePerHour: number;
  estimatedFuelCost: number;
  estimatedDepreciationCost: number;
  totalEstimatedCost: number;
  estimatedNetProfit: number;
  marginPercent: number;
  status: 'EXCELLENT' | 'FAIR' | 'BAD';
  recommendation: string;
}

export type StrategyCategory =
  | 'hybrid'
  | 'weekend'
  | 'missions'
  | 'peak_hours'
  | 'long_trips'
  | 'economy'
  | 'night_shift'
  | 'custom';

export interface StrategyWorkingWindow {
  dayOfWeek: number; // 0=Dom, 1=Seg, ..., 6=Sab
  dayLabel: string;
  startTime: string;
  endTime: string;
  targetDailyEarnings: number;
  focusArea: string;
  recommendedApp: PlatformType;
  passActive?: string;
}

export interface DriverStrategy {
  id: string;
  name: string;
  tagline: string;
  category: StrategyCategory;
  targetWeeklyGross: number;
  targetWeeklyHours: number;
  targetWeeklyTrips: number;
  primaryPlatforms: PlatformType[];
  platformStrategy: {
    uberRole: string;
    ninetyNineRole: string;
    inDriveRole?: string;
    privateRole?: string;
  };
  passUsage: {
    use99Pass: boolean;
    pass99Type: 'time_7d' | 'time_3d' | 'time_1d' | 'earnings_300' | 'none';
    passCost: number;
    useUberMissions: boolean;
    targetUberProTier: 'diamond' | 'platinum' | 'gold' | 'blue';
  };
  acceptanceRules: {
    minRateKm: number; // ex: 2.20
    minRateHour: number; // ex: 38.00
    maxPickupDistanceKm: number; // ex: 2.5
    maxRideDurationMin: number; // ex: 45
    minPassengerRating: number; // ex: 4.80
    avoidRegionsNotes?: string;
  };
  fuelAndMaintenancePlan: {
    fuelChoice: string;
    stationCashbackTip: string;
    reserveMaintenancePerKm: number; // ex: 0.15
  };
  workingWindows: StrategyWorkingWindow[];
  tacticalPlaybook: Array<{
    title: string;
    tip: string;
    doText: string;
    dontText: string;
  }>;
  isActive?: boolean;
  isPreset?: boolean;
  createdAt: string;
}
