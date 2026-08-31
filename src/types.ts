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
  | 'Outros';

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
  fuelExpenses: number;
  otherExpenses: number;
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
