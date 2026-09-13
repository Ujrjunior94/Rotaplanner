export type PlatformType = 'Uber' | '99' | 'inDrive' | 'Particular' | 'Outro';

export type PlannerEventType = 'work' | 'off' | 'goal' | 'maintenance' | 'appointment' | 'other';

/**
 * Centros de Custo (FASE D - Item 8)
 * Distingue a natureza contábil e operacional de cada saída financeira
 */
export type CostCenterType =
  | 'custo_operacional_direto' // relacionado diretamente ao turno (combustível consumido, pedágio, alimentação, etc.)
  | 'custo_fixo'                // relacionado ao veículo/mês (seguro, IPVA, licenciamento, financiamento)
  | 'reserva'                   // dinheiro separado preventivamente (combustível, manutenção, emergência)
  | 'movimentacao_caixa';        // saída imediata de caixa (compra/abastecimento no posto)

/**
 * Métodos de Cálculo do Custo de Combustível (FASE D - Item 7)
 * Evita rigorosamente a duplicidade entre compra no posto e consumo em KM
 */
export type FuelCalculationMethod =
  | 'real_abastecimento' // Método 1: Custo real por abastecimento
  | 'estimado_km'        // Método 2: Custo estimado por km rodado
  | 'hibrido';           // Método 3: Modelo híbrido (abastecimento real se houver no dia, senão estimado por km)

export type ExpenseCategory =
  | 'Combustível'
  | 'Pedágio'
  | 'Estacionamento'
  | 'Lavagem'
  | 'Manutenção'
  | 'Pneus'
  | 'Seguro'
  | 'IPVA'
  | 'Licenciamento'
  | 'Financiamento'
  | 'Alimentação'
  | 'Óleo'
  | 'Freios'
  | 'Documentação'
  | 'Internet'
  | 'Limpeza'
  | 'Multas'
  | 'Outros'
  | (string & {});

/**
 * Registro de Reserva Financeira Estruturada (FASE D - Item 9)
 */
export interface ReserveItem {
  id: string;
  type: 'combustivel' | 'manutencao' | 'emergencia';
  amount: number;
  origin: 'sessao' | 'manual' | 'regra_km';
  date: string;
  operationalDate?: string;
  sessionId?: string;
  status: 'ativo' | 'utilizado' | 'liberado';
  notes?: string;
  balanceAfter?: number;
}

/**
 * Fechamento Periódico Contábil e Auditoria de Exercício (FASE E)
 * Garante a imutabilidade e comprovação fiscal/contábil de períodos encerrados
 */
export interface AccountingClosing {
  id: string;
  type: 'weekly' | 'monthly';
  periodLabel: string;
  startDate: string; // YYYY-MM-DD
  endDate: string;   // YYYY-MM-DD
  closedAt: string;  // ISO timestamp
  closingHash: string; // Identificador único de integridade
  grossEarnings: number;
  fuelExpenses: number;
  fuelCalculationMethod: FuelCalculationMethod;
  otherExpenses: number;
  directOperatingCosts: number;
  fixedCostsProportional: number;
  totalExpenses: number;
  contributionMargin: number; // grossEarnings - directOperatingCosts
  realNetProfit: number;      // grossEarnings - (directOperatingCosts + fixedCostsProportional)
  reservesAllocated: number;  // total guardado em reservas
  availableCash: number;      // saldo líquido livre no bolso
  totalKm: number;
  totalHours: number;
  totalTrips: number;
  ratePerKm: number;
  ratePerHour: number;
  status: 'AUDITED_AND_CLOSED';
  notes?: string;
}

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

export type DashboardCardId =
  | 'cockpit_metrics'
  | 'reserves_wallet'
  | 'unit_efficiency'
  | 'daily_goal'
  | 'weekly_goal'
  | 'next_service'
  | 'fuel_advisor'
  | 'sandero_fuel_gauge'
  | 'performance_chart'
  | 'smart_summary'
  | 'recent_rides';

export interface DashboardCardConfig {
  id: DashboardCardId;
  title: string;
  description: string;
  visible: boolean;
  category?: 'financial' | 'goals' | 'vehicle' | 'insights' | 'history';
}

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
  fuelCalculationMethod?: FuelCalculationMethod; // FASE D: 'real_abastecimento' | 'estimado_km' | 'hibrido'
  emergencyReserveBalance?: number; // Saldo acumulado de emergência
  timezone?: string; // Fuso horário operacional do motorista (padrão 'America/Bahia')
  platforms: PlatformType[];
  darkMode: boolean;
  onboardingCompleted: boolean;
  dashboardCards?: DashboardCardConfig[];
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
  operationalDate?: string; // Data operacional YYYY-MM-DD
  timezone?: string;
  startTime: string; // ISO string
  endTime: string | null;
  startOdometer: number;
  endOdometer: number | null;
  status: 'active' | 'completed';
  grossEarnings: number;
  tips: number;
  tripsCount: number;
  distanceKm?: number;
  fuelExpenses: number; // Despesa com combustível estimada/consumida no turno
  otherExpenses: number; // Despesas diretas imediatas (alimentação, pedágio, etc.)
  fuelReserve?: number; // Valor a por na reserva para abastecimento futuro
  maintenanceReserve?: number; // Valor a por na reserva para manutenção preventiva
  platformEarnings?: Partial<Record<PlatformType, { amount: number; trips: number }>>;
  notes?: string;
  needsReview?: boolean;
}

export interface PlannerEvent {
  id: string;
  date: string; // YYYY-MM-DD
  operationalDate?: string; // Data operacional YYYY-MM-DD
  timezone?: string;
  sessionId?: string; // Vínculo 1:1 com a sessão de trabalho correspondente
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
  realizedNetProfit?: number;
  realizedTrips?: number;
  needsReview?: boolean;
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
  operationalDate?: string;
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
  fuelRecordId?: string; // Vínculo com abastecimento físico para evitar duplicidade
  category: ExpenseCategory;
  costType?: CostCenterType; // Centro de custo
  amount: number;
  description: string;
  date: string; // YYYY-MM-DD
  operationalDate?: string;
  needsReview?: boolean;
}

export interface FuelRecord {
  id: string;
  stationName: string;
  fuelType: string;
  liters: number;
  pricePerLiter: number;
  totalAmount: number;
  totalCost?: number; // Compatibilidade com calculadoras
  odometer: number;
  date: string; // YYYY-MM-DD
  operationalDate?: string;
  sessionId?: string;
  expenseId?: string; // Vínculo com a saída de caixa lançada
  isFullTank?: boolean;
  notes?: string;
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
  // Fase F: Inteligência Multicritério e Decisão Operacional
  score?: number; // Pontuação de atratividade de 0 a 100
  deadheadKm?: number; // KM de deslocamento vazio / retorno considerado
  totalDistanceWithDeadhead?: number; // Distância total (ida + retorno)
  effectiveRatePerKm?: number; // R$/KM real considerando retorno vazio
  effectiveRatePerHour?: number; // R$/Hora real considerando tempo de retorno
  netPerHour?: number; // Lucro líquido real por hora
  platformEstimates?: Partial<Record<PlatformType, {
    gross: number;
    platformFeePercent: number;
    platformFeeAmount: number;
    netProfit: number;
    hourlyNet: number;
    highlight?: string;
  }>>;
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
