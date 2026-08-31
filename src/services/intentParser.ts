import {
  PlatformType,
  ExpenseCategory,
  WorkSession,
  UserProfile,
  Vehicle,
  PlannerEvent,
  FuelRecord,
  ExpenseItem,
} from '../types';
import {
  formatCurrency,
  formatKm,
  calcRealCarCost,
  calcDailyFuelAdvisor,
} from '../utils/calc';
import {
  VoiceIntentType,
  ConversationContext,
  VoiceParseResult,
  parseVoiceCommand,
} from './voiceParser';

export type IntentType = VoiceIntentType;

export interface ExtractedEntities {
  amount?: number | null;
  platform?: PlatformType | null;
  liters?: number | null;
  pricePerLiter?: number | null;
  fuelType?: string | null;
  expenseCategory?: ExpenseCategory | null;
  date?: string | null;
  startTime?: string | null;
  endTime?: string | null;
  targetAmount?: number | null;
  goalType?: 'daily' | 'weekly' | 'monthly' | null;
  odometer?: number | null;
  durationMinutes?: number | null;
  distanceKm?: number | null;
  notes?: string | null;
  isOffDay?: boolean | null;
}

export interface MissingParameterFlags {
  isMissingAmount: boolean;
  isMissingPlatform: boolean;
  isMissingCategory: boolean;
  isMissingLiters: boolean;
  isMissingPricePerLiter: boolean;
  isMissingDate: boolean;
  isMissingTimeRange: boolean;
  isMissingGoalType: boolean;
  missingParameters: string[];
  canExecuteImmediately: boolean;
}

export interface StandardizedIntentResult {
  intent: IntentType;
  confidence: number;
  rawTranscript: string;
  speechResponse: string;
  requiresConfirmation: boolean;
  confirmationMessage?: string;
  entities: ExtractedEntities;
  missingParameterFlags: MissingParameterFlags;
  ambiguityQuestion?: string;
  ambiguityOptions?: { label: string; actionText: string }[];
  strategyInsights?: string[];
  queryDetails?: { label: string; value: string }[];
  weeklyPlanItems?: {
    dayName: string;
    dayShort: string;
    date: string;
    type: 'work' | 'off';
    startTime?: string;
    endTime?: string;
    targetEarnings?: number;
  }[];
  data?: VoiceParseResult['data'];
  source: 'gemini' | 'rule_based_fallback';
}

export interface DriverStateContext {
  profile: UserProfile;
  vehicle: Vehicle;
  activeSession: WorkSession | null;
  workSessions: WorkSession[];
  dailyEarnings: { date: string; amount: number; platform?: PlatformType }[];
  expenses: ExpenseItem[];
  fuelRecords: FuelRecord[];
  goals: any[];
  plannerEvents: PlannerEvent[];
}

/**
 * Computa as flags de parâmetros faltantes com base na intenção e entidades extraídas
 */
export function computeMissingParameterFlags(
  intent: IntentType,
  entities: ExtractedEntities
): MissingParameterFlags {
  const missing: string[] = [];

  let isMissingAmount = false;
  let isMissingPlatform = false;
  let isMissingCategory = false;
  let isMissingLiters = false;
  let isMissingPricePerLiter = false;
  let isMissingDate = false;
  let isMissingTimeRange = false;
  let isMissingGoalType = false;

  switch (intent) {
    case 'CREATE_EARNING':
      if (entities.amount == null || entities.amount <= 0) {
        isMissingAmount = true;
        missing.push('amount (valor do ganho)');
      }
      if (!entities.platform) {
        isMissingPlatform = true;
        missing.push('platform (plataforma)');
      }
      break;

    case 'CREATE_EXPENSE':
      if (entities.amount == null || entities.amount <= 0) {
        isMissingAmount = true;
        missing.push('amount (valor da despesa)');
      }
      if (!entities.expenseCategory) {
        isMissingCategory = true;
        missing.push('expenseCategory (categoria)');
      }
      break;

    case 'CREATE_FUEL':
      if ((entities.liters == null || entities.liters <= 0) && (entities.amount == null || entities.amount <= 0)) {
        isMissingLiters = true;
        isMissingAmount = true;
        missing.push('liters ou amount (quantidade de litros ou valor total)');
      }
      break;

    case 'CREATE_PLANNER_EVENT':
      if (!entities.date) {
        isMissingDate = true;
        missing.push('date (data do agendamento)');
      }
      break;

    case 'CREATE_GOAL':
      if (entities.targetAmount == null || entities.targetAmount <= 0) {
        isMissingAmount = true;
        missing.push('targetAmount (valor da meta)');
      }
      if (!entities.goalType) {
        isMissingGoalType = true;
        missing.push('goalType (tipo de meta: diária, semanal ou mensal)');
      }
      break;

    default:
      break;
  }

  const canExecuteImmediately = missing.length === 0 && intent !== 'UNKNOWN' && intent !== 'AMBIGUOUS';

  return {
    isMissingAmount,
    isMissingPlatform,
    isMissingCategory,
    isMissingLiters,
    isMissingPricePerLiter,
    isMissingDate,
    isMissingTimeRange,
    isMissingGoalType,
    missingParameters: missing,
    canExecuteImmediately,
  };
}

/**
 * Converte o resultado do parser de regras local em StandardizedIntentResult
 */
export function convertLocalResultToStandardized(
  localResult: VoiceParseResult,
  rawTranscript: string
): StandardizedIntentResult {
  const entities: ExtractedEntities = {};

  if (localResult.data?.earning) {
    entities.amount = localResult.data.earning.amount;
    entities.platform = localResult.data.earning.platform;
    entities.date = localResult.data.earning.date;
    entities.notes = localResult.data.earning.notes;
  } else if (localResult.data?.expense) {
    entities.amount = localResult.data.expense.amount;
    entities.expenseCategory = localResult.data.expense.category;
    entities.date = localResult.data.expense.date;
    entities.notes = localResult.data.expense.notes;
  } else if (localResult.data?.fuel) {
    entities.liters = localResult.data.fuel.liters;
    entities.pricePerLiter = localResult.data.fuel.pricePerLiter;
    entities.amount = localResult.data.fuel.totalAmount;
    entities.fuelType = localResult.data.fuel.fuelType;
    entities.date = localResult.data.fuel.date;
    entities.odometer = localResult.data.fuel.odometer;
  } else if (localResult.data?.plannerEvent) {
    entities.date = localResult.data.plannerEvent.date;
    entities.startTime = localResult.data.plannerEvent.startTime;
    entities.endTime = localResult.data.plannerEvent.endTime;
    entities.targetAmount = localResult.data.plannerEvent.targetEarnings;
    entities.isOffDay = localResult.data.plannerEvent.type === 'off';
    entities.notes = localResult.data.plannerEvent.notes;
  } else if (localResult.data?.goal) {
    entities.targetAmount = localResult.data.goal.targetAmount;
    entities.goalType = localResult.data.goal.type;
  } else if (localResult.data?.startSession) {
    entities.odometer = localResult.data.startSession.startKm;
  } else if (localResult.data?.endSession) {
    entities.odometer = localResult.data.endSession.endKm;
    entities.amount = localResult.data.endSession.totalGross;
  }

  const missingParameterFlags = computeMissingParameterFlags(localResult.intent, entities);

  return {
    intent: localResult.intent,
    confidence: localResult.confidence,
    rawTranscript,
    speechResponse: localResult.speechResponse,
    requiresConfirmation: localResult.requiresConfirmation,
    confirmationMessage: localResult.confirmationMessage,
    entities,
    missingParameterFlags,
    ambiguityQuestion: localResult.ambiguityQuestion,
    ambiguityOptions: localResult.ambiguityOptions,
    strategyInsights: localResult.data?.strategyInsights,
    queryDetails: localResult.data?.queryDetails,
    weeklyPlanItems: localResult.data?.weeklyPlan?.items,
    data: localResult.data,
    source: 'rule_based_fallback',
  };
}

/**
 * Função dedicada 'IntentParser' que usa Gemini via API route server-side
 * com fallback transparente e resiliente para o analisador de regras local.
 */
export async function parseIntentWithGemini(
  transcript: string,
  context?: ConversationContext,
  driverState?: DriverStateContext
): Promise<StandardizedIntentResult> {
  const trimmed = transcript.trim();
  if (!trimmed) {
    return {
      intent: 'UNKNOWN',
      confidence: 0,
      rawTranscript: '',
      speechResponse: 'Nenhum comando foi detectado.',
      requiresConfirmation: false,
      entities: {},
      missingParameterFlags: {
        isMissingAmount: false,
        isMissingPlatform: false,
        isMissingCategory: false,
        isMissingLiters: false,
        isMissingPricePerLiter: false,
        isMissingDate: false,
        isMissingTimeRange: false,
        isMissingGoalType: false,
        missingParameters: [],
        canExecuteImmediately: false,
      },
      source: 'rule_based_fallback',
    };
  }

  // Tentar analisar com o modelo Gemini no servidor backend
  try {
    const payload = {
      transcript: trimmed,
      context: {
        lastIntent: context?.lastIntent,
        lastAmount: context?.lastAmount,
        lastPlatform: context?.lastPlatform,
      },
      driverState: driverState
        ? {
            odometer: driverState.vehicle.currentOdometer,
            dailyGoal: driverState.profile.dailyGoal,
            monthlyGoal: driverState.profile.monthlyGoal,
            activeSession: !!driverState.activeSession,
            gasPriceReference: driverState.profile.gasPriceReference,
          }
        : undefined,
    };

    const response = await fetch('/api/gemini/parse-intent', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (response.ok) {
      const resJson = await response.json();
      if (resJson.success && resJson.data) {
        const d = resJson.data;
        const rawIntent: IntentType = d.intent || 'UNKNOWN';
        const entities: ExtractedEntities = d.entities || {};

        // Recalcular ou validar flags de parâmetros ausentes
        const missingFlags: MissingParameterFlags =
          d.missingParameterFlags || computeMissingParameterFlags(rawIntent, entities);

        // Mapear dados para as ações do App
        const appData: VoiceParseResult['data'] = {};
        const todayStr = new Date().toISOString().split('T')[0];

        if (rawIntent === 'CREATE_EARNING' && entities.amount) {
          appData.earning = {
            amount: entities.amount,
            platform: (entities.platform as PlatformType) || 'Uber',
            date: entities.date || todayStr,
            notes: entities.notes || 'Registrado via Gemini IntentParser',
          };
        } else if (rawIntent === 'CREATE_EXPENSE' && entities.amount) {
          appData.expense = {
            amount: entities.amount,
            category: (entities.expenseCategory as ExpenseCategory) || 'Outros',
            date: entities.date || todayStr,
            notes: entities.notes || 'Registrado via Gemini IntentParser',
          };
        } else if (rawIntent === 'CREATE_FUEL') {
          const liters = entities.liters || 30;
          const price = entities.pricePerLiter || driverState?.profile.gasPriceReference || 5.89;
          const total = entities.amount || Math.round(liters * price * 100) / 100;

          appData.fuel = {
            liters,
            pricePerLiter: price,
            totalAmount: total,
            fuelType: entities.fuelType || 'Gasolina Comum',
            date: entities.date || todayStr,
            odometer: entities.odometer || driverState?.vehicle.currentOdometer,
          };
        } else if (rawIntent === 'CREATE_PLANNER_EVENT' && entities.date) {
          appData.plannerEvent = {
            date: entities.date,
            type: entities.isOffDay ? 'off' : 'work',
            startTime: entities.isOffDay ? undefined : (entities.startTime || '06:00'),
            endTime: entities.isOffDay ? undefined : (entities.endTime || '14:00'),
            targetEarnings: entities.isOffDay ? 0 : (entities.targetAmount || driverState?.profile.dailyGoal || 250),
            notes: entities.notes || 'Agendado via Gemini IntentParser',
          };
        } else if (rawIntent === 'REQUEST_WEEKLY_PLAN' && d.weeklyPlanItems) {
          appData.weeklyPlan = {
            items: d.weeklyPlanItems.map((item: any) => ({
              dayName: item.dayName,
              dayShort: item.dayShort,
              date: item.date,
              type: item.type === 'work' ? 'work' : 'off',
              startTime: item.startTime,
              endTime: item.endTime,
              targetEarnings: item.targetEarnings,
            })),
            notes: 'Escala semanal gerada por Gemini',
          };
        } else if (rawIntent === 'CREATE_GOAL' && entities.targetAmount) {
          appData.goal = {
            targetAmount: entities.targetAmount,
            type: (entities.goalType as any) || 'daily',
          };
        } else if (rawIntent === 'START_WORK_SESSION') {
          appData.startSession = {
            startKm: entities.odometer || driverState?.vehicle.currentOdometer,
            notes: 'Iniciado via Gemini IntentParser',
          };
        } else if (rawIntent === 'END_WORK_SESSION') {
          appData.endSession = {
            endKm: entities.odometer || (driverState ? driverState.vehicle.currentOdometer + 60 : undefined),
            totalGross: entities.amount || 0,
          };
        } else if (d.queryDetails) {
          appData.queryDetails = d.queryDetails;
        } else if (d.strategyInsights) {
          appData.strategyInsights = d.strategyInsights;
        }

        return {
          intent: rawIntent,
          confidence: typeof d.confidence === 'number' ? d.confidence : 0.95,
          rawTranscript: trimmed,
          speechResponse: d.speechResponse || 'Comando processado com sucesso.',
          requiresConfirmation: Boolean(d.requiresConfirmation),
          confirmationMessage: d.confirmationMessage,
          entities,
          missingParameterFlags: missingFlags,
          ambiguityQuestion: d.ambiguityQuestion,
          ambiguityOptions: d.ambiguityOptions,
          strategyInsights: d.strategyInsights,
          queryDetails: d.queryDetails,
          weeklyPlanItems: d.weeklyPlanItems,
          data: appData,
          source: 'gemini',
        };
      }
    }
  } catch (error) {
    console.warn('Gemini server API unreachable, executing local rule-based intent parser fallback:', error);
  }

  // Fallback para parser de regras local se offline ou em caso de erro
  if (driverState) {
    const localResult = parseVoiceCommand(trimmed, context || {}, driverState);
    return convertLocalResultToStandardized(localResult, trimmed);
  }

  // Fallback padrão se não houver dados
  const defaultLocal = parseVoiceCommand(
    trimmed,
    context || {},
    {
      profile: { id: '1', name: 'Motorista', platformPreference: 'Uber', dailyGoal: 250, monthlyGoal: 5000, gasPriceReference: 5.89 } as any,
      vehicle: { id: '1', model: 'Carro', currentOdometer: 85400 } as any,
      activeSession: null,
      workSessions: [],
      dailyEarnings: [],
      expenses: [],
      fuelRecords: [],
      goals: [],
      plannerEvents: [],
    }
  );

  return convertLocalResultToStandardized(defaultLocal, trimmed);
}

/**
 * Função utilitária padrão para processamento de intenções
 */
export const parseVoiceIntent = parseIntentWithGemini;
export const intentParser = parseIntentWithGemini;
