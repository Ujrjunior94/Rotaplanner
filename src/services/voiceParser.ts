import {
  PlatformType,
  ExpenseCategory,
  WorkSession,
  UserProfile,
  Vehicle,
  PlannerEvent,
  FuelRecord,
  ExpenseItem,
  EarningItem,
} from '../types';
import {
  formatCurrency,
  formatKm,
  formatHours,
  calcRealCarCost,
  calcFuelParity,
  calcDailyFuelAdvisor,
  calcShiftCostsFromKm,
  safeDivide,
} from '../utils/calc';

export type VoiceIntentType =
  | 'CREATE_EARNING'
  | 'CREATE_EXPENSE'
  | 'CREATE_FUEL'
  | 'CREATE_TRIP'
  | 'START_WORK_SESSION'
  | 'END_WORK_SESSION'
  | 'CREATE_PLANNER_EVENT'
  | 'UPDATE_PLANNER_EVENT'
  | 'DELETE_PLANNER_EVENT'
  | 'CREATE_GOAL'
  | 'QUERY_DASHBOARD'
  | 'QUERY_REPORT'
  | 'QUERY_PERFORMANCE'
  | 'QUERY_FUEL'
  | 'QUERY_VEHICLE'
  | 'QUERY_GOAL'
  | 'REQUEST_AI_ANALYSIS'
  | 'REQUEST_STRATEGY'
  | 'REQUEST_WEEKLY_PLAN'
  | 'RECALCULATE_VEHICLE_COSTS'
  | 'AMBIGUOUS'
  | 'CONFIRM_ACTION'
  | 'CANCEL_ACTION'
  | 'UNKNOWN';

export interface ProposedEarningData {
  amount: number;
  platform: PlatformType;
  date: string;
  notes?: string;
}

export interface ProposedExpenseData {
  amount: number;
  category: ExpenseCategory;
  date: string;
  notes?: string;
}

export interface ProposedFuelData {
  liters: number;
  pricePerLiter: number;
  totalAmount: number;
  fuelType: string;
  date: string;
  odometer?: number;
}

export interface ProposedTripData {
  grossAmount: number;
  distanceKm: number;
  durationMinutes: number;
  platform: PlatformType;
  date: string;
}

export interface ProposedPlannerEventData {
  date: string;
  startTime?: string;
  endTime?: string;
  type: 'work' | 'off' | 'maintenance';
  targetEarnings?: number;
  notes?: string;
}

export interface ProposedWeeklyScheduleItem {
  dayName: string;
  dayShort: string;
  date: string;
  type: 'work' | 'off';
  startTime?: string;
  endTime?: string;
  targetEarnings?: number;
}

export interface ProposedWeeklyPlanData {
  items: ProposedWeeklyScheduleItem[];
  notes?: string;
}

export interface ProposedGoalData {
  targetAmount: number;
  type: 'daily' | 'weekly' | 'monthly';
}

export interface VoiceParseResult {
  intent: VoiceIntentType;
  confidence: number;
  rawText: string;
  speechResponse: string;
  requiresConfirmation: boolean;
  confirmationMessage?: string;
  ambiguityQuestion?: string;
  ambiguityOptions?: { label: string; actionText: string }[];
  data?: {
    earning?: ProposedEarningData;
    expense?: ProposedExpenseData;
    fuel?: ProposedFuelData;
    trip?: ProposedTripData;
    plannerEvent?: ProposedPlannerEventData;
    weeklyPlan?: ProposedWeeklyPlanData;
    goal?: ProposedGoalData;
    startSession?: { startKm?: number; notes?: string };
    endSession?: {
      endKm?: number;
      kmDriven?: number;
      totalGross?: number;
      fuelExpense?: number;
      calculatedFuelCost?: number;
      calculatedMaintenanceCost?: number;
    };
    queryAnswer?: string;
    queryDetails?: { label: string; value: string }[];
    strategyInsights?: string[];
  };
}

export interface ConversationContext {
  lastIntent?: VoiceIntentType;
  pendingProposal?: VoiceParseResult;
  lastAmount?: number;
  lastPlatform?: PlatformType;
  lastDate?: string;
}

/**
 * Normaliza o texto falado (remove acentos, caixa baixa, pontuações)
 */
export function normalizeVoiceText(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
}

/**
 * Extrai quantia monetária ou numérica do texto (ex: "250 reais", "250,50", "6 e 20", "cem reais")
 */
export function extractMonetaryValue(text: string): number | null {
  const norm = normalizeVoiceText(text);

  // Casos especiais falados em PT-BR ("6 e 19", "5 e 80", "6 e vinte")
  const ePattern = /(\d+)\s+e\s+(\d{1,2})\b/i;
  const eMatch = norm.match(ePattern);
  if (eMatch && !norm.includes('km') && !norm.includes('horas') && !norm.includes('litros')) {
    const intPart = parseInt(eMatch[1], 10);
    const decPartStr = eMatch[2].length === 1 ? eMatch[2] + '0' : eMatch[2];
    const decPart = parseInt(decPartStr, 10);
    if (intPart < 50) {
      // Provável preço por litro ex: 6 e 19 = 6.19
      return parseFloat(`${intPart}.${decPart}`);
    }
  }

  // Padrão numérico direto R$ 250,00 ou 250.50 ou 250
  const numMatch = text.match(/(?:r\$\s*|reais\s*)?(\d+([.,]\d{1,2})?)/i);
  if (numMatch) {
    const rawVal = numMatch[1].replace(',', '.');
    const parsed = parseFloat(rawVal);
    if (!isNaN(parsed) && parsed > 0) return parsed;
  }

  // Palavras por extenso comuns
  if (norm.includes('cem')) return 100;
  if (norm.includes('duzentos')) return 200;
  if (norm.includes('trezentos')) return 300;
  if (norm.includes('quatrocentos')) return 400;
  if (norm.includes('quinhentos')) return 500;
  if (norm.includes('cinquenta')) return 50;

  return null;
}

/**
 * Extrai volume de combustível em Litros (ex: "30 litros", "35l", "tanque cheio")
 */
export function extractLiters(text: string): number | null {
  const norm = normalizeVoiceText(text);
  const match = norm.match(/(\d+([.,]\d+)?)\s*(litros?|l\b)/i);
  if (match) {
    return parseFloat(match[1].replace(',', '.'));
  }
  return null;
}

/**
 * Extrai plataforma de transporte
 */
export function extractPlatform(text: string): PlatformType {
  const norm = normalizeVoiceText(text);
  if (norm.includes('99') || norm.includes('noventa e nove')) return '99';
  if (norm.includes('indrive') || norm.includes('in drive')) return 'inDrive';
  if (norm.includes('particular') || norm.includes('por fora') || norm.includes('privado')) return 'Particular';
  return 'Uber'; // Padrão
}

/**
 * Extrai categoria de despesa
 */
export function extractExpenseCategory(text: string): ExpenseCategory {
  const norm = normalizeVoiceText(text);
  if (norm.includes('almoco') || norm.includes('comida') || norm.includes('jantar') || norm.includes('lanche') || norm.includes('cafe') || norm.includes('refeicao') || norm.includes('alimentacao')) {
    return 'Alimentação';
  }
  if (norm.includes('pedagio') || norm.includes('sem parar') || norm.includes('tag')) {
    return 'Pedágio';
  }
  if (norm.includes('lava') || norm.includes('lavagem') || norm.includes('lavacar') || norm.includes('ducha') || norm.includes('limpeza')) {
    return 'Lavagem';
  }
  if (norm.includes('estacionamento') || norm.includes('parquimetro') || norm.includes('zona azul') || norm.includes('valet')) {
    return 'Estacionamento';
  }
  if (norm.includes('internet') || norm.includes('celular') || norm.includes('recarga') || norm.includes('plano')) {
    return 'Internet';
  }
  if (norm.includes('pneu') || norm.includes('pneus') || norm.includes('calibrar')) {
    return 'Pneus';
  }
  if (norm.includes('oleo') || norm.includes('filtro')) {
    return 'Óleo';
  }
  if (norm.includes('freio') || norm.includes('freios') || norm.includes('pastilha')) {
    return 'Freios';
  }
  if (norm.includes('oficina') || norm.includes('mecanico') || norm.includes('manutencao') || norm.includes('revisao')) {
    return 'Manutenção';
  }
  return 'Outros';
}

/**
 * Extrai data relativa (hoje, ontem, amanhã, ou dias da semana)
 */
export function extractDate(text: string): string {
  const norm = normalizeVoiceText(text);
  const now = new Date();

  if (norm.includes('ontem')) {
    const d = new Date(now);
    d.setDate(d.getDate() - 1);
    return d.toISOString().split('T')[0];
  }
  if (norm.includes('amanha')) {
    const d = new Date(now);
    d.setDate(d.getDate() + 1);
    return d.toISOString().split('T')[0];
  }
  if (norm.includes('depois de amanha')) {
    const d = new Date(now);
    d.setDate(d.getDate() + 2);
    return d.toISOString().split('T')[0];
  }

  // Padrão hoje
  return now.toISOString().split('T')[0];
}

/**
 * Extrai horários de início e fim (ex: "das 6 às 14", "de 08:00 ate as 17:00")
 */
export function extractTimeRange(text: string): { start?: string; end?: string } {
  const norm = normalizeVoiceText(text);
  
  // Padrão "das X as Y" ou "das Xh as Yh" ou "de X as Y"
  const rangeMatch = norm.match(/(?:das?|de)\s*(\d{1,2})(?::(\d{2}))?\s*(?:h|horas?)?\s*(?:as?|ate|ate as)\s*(\d{1,2})(?::(\d{2}))?\s*(?:h|horas?)?/i);
  if (rangeMatch) {
    const startHour = parseInt(rangeMatch[1], 10).toString().padStart(2, '0');
    const startMin = (rangeMatch[2] || '00').padStart(2, '0');
    const endHour = parseInt(rangeMatch[3], 10).toString().padStart(2, '0');
    const endMin = (rangeMatch[4] || '00').padStart(2, '0');
    return {
      start: `${startHour}:${startMin}`,
      end: `${endHour}:${endMin}`,
    };
  }

  return { start: '06:00', end: '14:00' };
}

/**
 * PARSER PRINCIPAL DE VOZ (Entity Extractor & Intent Classifier)
 */
export function parseVoiceCommand(
  rawText: string,
  context: ConversationContext,
  driverData: {
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
): VoiceParseResult {
  const norm = normalizeVoiceText(rawText);
  const todayStr = new Date().toISOString().split('T')[0];

  // 1. Respostas a Confirmações Pendentes ("Sim", "Confirmar", "Pode salvar", "Não", "Cancelar")
  if (context.pendingProposal) {
    if (
      norm === 'sim' ||
      norm === 'confirma' ||
      norm === 'confirmar' ||
      norm === 'pode salvar' ||
      norm === 'salvar' ||
      norm === 'isso' ||
      norm === 'correto' ||
      norm === 'positivo' ||
      norm.startsWith('sim')
    ) {
      return {
        intent: 'CONFIRM_ACTION',
        confidence: 0.99,
        rawText,
        speechResponse: 'Ação confirmada e registrada com sucesso.',
        requiresConfirmation: false,
        data: context.pendingProposal.data,
      };
    }

    if (
      norm === 'nao' ||
      norm === 'cancela' ||
      norm === 'cancelar' ||
      norm === 'desiste' ||
      norm === 'errado' ||
      norm.startsWith('nao')
    ) {
      return {
        intent: 'CANCEL_ACTION',
        confidence: 0.99,
        rawText,
        speechResponse: 'Operação cancelada.',
        requiresConfirmation: false,
      };
    }
  }

  // 2. Continuação de Contexto ("E mais 50 de gorjeta", "E 30 de combustível")
  if (context.lastIntent === 'CREATE_EARNING' && norm.includes('gorjeta')) {
    const tipAmount = extractMonetaryValue(norm);
    if (tipAmount) {
      return {
        intent: 'CREATE_EARNING',
        confidence: 0.95,
        rawText,
        requiresConfirmation: true,
        speechResponse: `Entendi: adicionar ${formatCurrency(tipAmount)} de gorjeta na Uber hoje. Confirmar?`,
        confirmationMessage: `Adicionar ${formatCurrency(tipAmount)} de gorjeta hoje?`,
        data: {
          earning: {
            amount: tipAmount,
            platform: context.lastPlatform || 'Uber',
            date: todayStr,
            notes: 'Gorjeta adicionada por comando de voz',
          },
        },
      };
    }
  }

  // 3. START_WORK_SESSION ("Começar expediente", "Iniciei o turno agora", "Abrir corrida")
  if (
    norm.includes('comecar expediente') ||
    norm.includes('iniciar expediente') ||
    norm.includes('iniciei o turno') ||
    norm.includes('comecei a trabalhar') ||
    norm.includes('iniciar turno') ||
    norm.includes('abrir expediente')
  ) {
    if (driverData.activeSession) {
      return {
        intent: 'START_WORK_SESSION',
        confidence: 0.95,
        rawText,
        requiresConfirmation: false,
        speechResponse: 'Você já possui um expediente ativo em andamento com o cronômetro rodando.',
        data: {
          queryAnswer: 'Expediente já está ativo.',
        },
      };
    }

    // Tentar extrair km inicial se falado (ex: "com km 85400")
    const kmMatch = norm.match(/(?:km|hodometro)\s*(\d{4,7})/i);
    const startKm = kmMatch ? parseInt(kmMatch[1], 10) : driverData.vehicle.currentOdometer;

    return {
      intent: 'START_WORK_SESSION',
      confidence: 0.95,
      rawText,
      requiresConfirmation: true,
      speechResponse: `Vou iniciar seu expediente agora com odômetro em ${formatKm(startKm)}. Confirmar?`,
      confirmationMessage: `Iniciar expediente com odômetro em ${formatKm(startKm)}?`,
      data: {
        startSession: {
          startKm,
          notes: 'Iniciado via Driver Voice',
        },
      },
    };
  }

  // 4. END_WORK_SESSION ("Finalizar expediente", "Encerrar turno", "Terminei o dia", "Finalizei a rota")
  if (
    norm.includes('finalizar expediente') ||
    norm.includes('encerrar expediente') ||
    norm.includes('encerrar turno') ||
    norm.includes('finalizar turno') ||
    norm.includes('terminei de trabalhar') ||
    norm.includes('fechar dia') ||
    norm.includes('finalizar rota') ||
    norm.includes('encerrar rota')
  ) {
    if (!driverData.activeSession) {
      return {
        intent: 'END_WORK_SESSION',
        confidence: 0.95,
        rawText,
        requiresConfirmation: false,
        speechResponse: 'Não há nenhum expediente aberto no momento para ser encerrado.',
      };
    }

    const val = extractMonetaryValue(norm);
    const startKm = driverData.activeSession.startOdometer;
    
    // Extrai KM se mencionado (ex: "rodei 130 km", "odometro 85500", "com 120 km")
    let extractedKm = 100;
    const kmMatch = norm.match(/(?:rodei|com|odometro|hodometro|final|km)\s*(\d{2,7})/i);
    if (kmMatch && kmMatch[1]) {
      const parsedNum = parseInt(kmMatch[1], 10);
      if (parsedNum > 1000) {
        extractedKm = Math.max(0, parsedNum - startKm);
      } else {
        extractedKm = parsedNum;
      }
    }

    const endKm = startKm + extractedKm;
    const gasPrice = driverData.profile.gasPriceReference || 5.89;
    const costs = calcShiftCostsFromKm(extractedKm, driverData.vehicle, gasPrice, 0.15);

    return {
      intent: 'END_WORK_SESSION',
      confidence: 0.95,
      rawText,
      requiresConfirmation: true,
      speechResponse: `Finalizando rota com ${extractedKm} km rodados. Custo de combustível autocalculado em ${formatCurrency(costs.fuelCost)} e manutenção em ${formatCurrency(costs.maintenanceCost)}. Confirmar encerramento?`,
      confirmationMessage: `Encerrar turno com ${extractedKm} km rodados (${formatCurrency(costs.fuelCost)} de combustível e ${formatCurrency(costs.maintenanceCost)} de manutenção)?`,
      data: {
        endSession: {
          endKm,
          kmDriven: extractedKm,
          totalGross: val || 0,
          calculatedFuelCost: costs.fuelCost,
          calculatedMaintenanceCost: costs.maintenanceCost,
        },
      },
    };
  }

  // 5. CONSULTAS DE GANHOS E DASHBOARD (QUERY_DASHBOARD / QUERY_PERFORMANCE)
  // "Quanto ganhei hoje?", "Como estou hoje?", "Como foi meu dia?"
  if (
    norm.includes('quanto ganhei hoje') ||
    norm.includes('quanto fiz hoje') ||
    norm.includes('meu ganho hoje') ||
    norm.includes('como estou hoje') ||
    norm.includes('meu faturamento hoje') ||
    norm.includes('como foi meu dia')
  ) {
    const todayEarns = driverData.dailyEarnings.filter(e => e.date === todayStr);
    const todayGross = todayEarns.reduce((acc, e) => acc + e.amount, 0);
    const todayExp = driverData.expenses.filter(e => e.date === todayStr).reduce((acc, e) => acc + e.amount, 0);
    const todayNet = todayGross - todayExp;
    const dailyGoal = driverData.profile.dailyGoal || 250;
    const goalPct = Math.round((todayGross / dailyGoal) * 100);

    const speech = `Hoje você faturou ${formatCurrency(todayGross)}, com despesas de ${formatCurrency(todayExp)}, resultando em lucro líquido de ${formatCurrency(todayNet)}. Você atingiu ${goalPct}% da sua meta diária.`;

    return {
      intent: 'QUERY_DASHBOARD',
      confidence: 0.98,
      rawText,
      requiresConfirmation: false,
      speechResponse: speech,
      data: {
        queryAnswer: speech,
        queryDetails: [
          { label: 'Ganhos Brutos', value: formatCurrency(todayGross) },
          { label: 'Despesas Hoje', value: formatCurrency(todayExp) },
          { label: 'Lucro Líquido', value: formatCurrency(todayNet) },
          { label: 'Meta Diária', value: `${goalPct}% (${formatCurrency(dailyGoal)})` },
        ],
      },
    };
  }

  // "Quanto ganhei essa semana?", "Meu ganho da semana"
  if (
    norm.includes('quanto ganhei essa semana') ||
    norm.includes('ganho da semana') ||
    norm.includes('faturamento da semana') ||
    norm.includes('meu lucro essa semana')
  ) {
    const weekGross = driverData.dailyEarnings.reduce((acc, e) => acc + e.amount, 0);
    const weekExp = driverData.expenses.reduce((acc, e) => acc + e.amount, 0);
    const weekNet = weekGross - weekExp;

    const speech = `Nos últimos 7 dias você faturou ${formatCurrency(weekGross)} e teve despesas de ${formatCurrency(weekExp)}, com lucro líquido de ${formatCurrency(weekNet)}.`;

    return {
      intent: 'QUERY_PERFORMANCE',
      confidence: 0.98,
      rawText,
      requiresConfirmation: false,
      speechResponse: speech,
      data: {
        queryAnswer: speech,
        queryDetails: [
          { label: 'Ganhos na Semana', value: formatCurrency(weekGross) },
          { label: 'Despesas na Semana', value: formatCurrency(weekExp) },
          { label: 'Lucro Líquido', value: formatCurrency(weekNet) },
        ],
      },
    };
  }

  // "Quanto estou gastando por quilometro?", "Quanto custa cada quilometro para mim?"
  if (
    norm.includes('gastando por quilometro') ||
    norm.includes('gasto por km') ||
    norm.includes('custo por km') ||
    norm.includes('custa cada quilometro') ||
    norm.includes('custo do meu carro')
  ) {
    const realCost = calcRealCarCost(
      driverData.vehicle,
      driverData.profile.gasPriceReference || 5.89,
      driverData.expenses,
      driverData.vehicle.currentOdometer
    );

    const speech = `Seu custo real por quilômetro é de ${formatCurrency(realCost.totalCostPerKm)} por km rodado, sendo ${formatCurrency(realCost.fuelCostKm)} de combustível, ${formatCurrency(realCost.maintenanceKm)} de manutenção e reserva e ${formatCurrency(realCost.fixedCostKm)} de custos fixos.`;

    return {
      intent: 'QUERY_VEHICLE',
      confidence: 0.98,
      rawText,
      requiresConfirmation: false,
      speechResponse: speech,
      data: {
        queryAnswer: speech,
        queryDetails: [
          { label: 'Custo Total / KM', value: formatCurrency(realCost.totalCostPerKm) },
          { label: 'Combustível / KM', value: formatCurrency(realCost.fuelCostKm) },
          { label: 'Manutenção / KM', value: formatCurrency(realCost.maintenanceKm) },
          { label: 'Taxa Mínima Sugerida', value: `${formatCurrency(realCost.totalCostPerKm * 1.8)} / km` },
        ],
      },
    };
  }

  // "Quanto falta para minha meta mensal?", "Como esta minha meta?"
  if (
    norm.includes('quanto falta para minha meta') ||
    norm.includes('como esta minha meta') ||
    norm.includes('minha meta mensal') ||
    norm.includes('progresso da meta')
  ) {
    const target = driverData.profile.monthlyGoal || 5000;
    const totalEarnedMonth = driverData.dailyEarnings.reduce((acc, e) => acc + e.amount, 0);
    const remaining = Math.max(0, target - totalEarnedMonth);
    const pct = Math.round((totalEarnedMonth / target) * 100);

    const speech = `Você já acumulou ${formatCurrency(totalEarnedMonth)} (${pct}% da sua meta mensal de ${formatCurrency(target)}). Faltam ${formatCurrency(remaining)} para atingir seu objetivo.`;

    return {
      intent: 'QUERY_GOAL',
      confidence: 0.98,
      rawText,
      requiresConfirmation: false,
      speechResponse: speech,
      data: {
        queryAnswer: speech,
        queryDetails: [
          { label: 'Meta Mensal', value: formatCurrency(target) },
          { label: 'Faturado no Mês', value: formatCurrency(totalEarnedMonth) },
          { label: 'Restante', value: formatCurrency(remaining) },
          { label: 'Progresso', value: `${pct}%` },
        ],
      },
    };
  }

  // "Qual combustível devo usar?", "Etanol ou gasolina?", "O que compensa abastecer?"
  if (
    norm.includes('qual combustivel devo usar') ||
    norm.includes('qual combustivel usar') ||
    norm.includes('etanol ou gasolina') ||
    norm.includes('gasolina ou etanol') ||
    norm.includes('o que compensa abastecer') ||
    norm.includes('qual compensa abastecer') ||
    norm.includes('qual compensa mais')
  ) {
    const gasPrice = driverData.profile.gasPriceReference || 5.89;
    const ethPrice = gasPrice * 0.68;
    const isFlex = driverData.vehicle.fuelType === 'Flex' || !driverData.vehicle.fuelType;
    const parity = calcFuelParity(ethPrice, gasPrice, driverData.vehicle.avgConsumption || 12.5, isFlex);

    let speech = '';
    if (parity.betterOption === 'Etanol') {
      speech = `Recomendo abastecer com Etanol! A paridade está em ${parity.ethanolRatioPercent.toFixed(1)}%, abaixo do limite de 70%. O custo estimado é de ${formatCurrency(parity.costPerKmEthanol)} por km, gerando uma economia de ${formatCurrency(parity.savingsPerKm)} por km rodado em relação à gasolina.`;
    } else {
      speech = `Recomendo abastecer com Gasolina! A paridade está em ${parity.ethanolRatioPercent.toFixed(1)}%, acima dos 70%. A gasolina oferece maior autonomia e menor custo por km (${formatCurrency(parity.costPerKmGasoline)}/km).`;
    }

    return {
      intent: 'QUERY_FUEL',
      confidence: 0.98,
      rawText,
      requiresConfirmation: false,
      speechResponse: speech,
      data: {
        queryAnswer: speech,
        queryDetails: [
          { label: 'Recomendação', value: parity.betterOption === 'Etanol' ? '🟢 ETANOL' : '🔵 GASOLINA' },
          { label: 'Paridade de Preço', value: `${parity.ethanolRatioPercent.toFixed(1)}% (Ref: 70%)` },
          { label: 'Custo/KM Etanol', value: `${formatCurrency(parity.costPerKmEthanol)}/km` },
          { label: 'Custo/KM Gasolina', value: `${formatCurrency(parity.costPerKmGasoline)}/km` },
        ],
      },
    };
  }

  // "Quanto gastei com combustivel?", "Devo abastecer hoje?"
  if (
    norm.includes('quanto gastei com combustivel') ||
    norm.includes('gasto com combustivel') ||
    norm.includes('devo abastecer hoje') ||
    norm.includes('abastecer hoje')
  ) {
    const totalFuelMonth = driverData.fuelRecords.reduce((acc, f) => acc + f.totalAmount, 0);
    const advisor = calcDailyFuelAdvisor(
      driverData.vehicle,
      driverData.fuelRecords,
      120,
      false,
      null,
      driverData.profile.gasPriceReference || 5.89
    );

    let speech = '';
    if (norm.includes('devo abastecer')) {
      speech = `${advisor.title}. ${advisor.headline} ${advisor.explanation}`;
    } else {
      speech = `Você já investiu ${formatCurrency(totalFuelMonth)} em combustível neste período. Atualmente seu tanque está com ${advisor.currentTankPct}% e autonomia estimada de ${formatKm(advisor.currentRangeKm)}.`;
    }

    return {
      intent: 'QUERY_FUEL',
      confidence: 0.98,
      rawText,
      requiresConfirmation: false,
      speechResponse: speech,
      data: {
        queryAnswer: speech,
        queryDetails: [
          { label: 'Gasto em Combustível', value: formatCurrency(totalFuelMonth) },
          { label: 'Nível do Tanque', value: `${advisor.currentTankPct}% (${advisor.currentLiters}L)` },
          { label: 'Autonomia Atual', value: formatKm(advisor.currentRangeKm) },
          { label: 'Veredito Hoje', value: advisor.badgeLabel },
        ],
      },
    };
  }

  // RECALCULAR LANÇAMENTOS COM DADOS DO VEÍCULO
  // "Recalcular lançamentos", "Recalcular custos", "Recalcular com dados do carro", "Recalcular combustível dos turnos"
  if (
    norm.includes('recalcular lancamentos') ||
    norm.includes('recalcular lançamentos') ||
    norm.includes('recalcular custos') ||
    norm.includes('recalcular veiculo') ||
    norm.includes('recalcular veiculo') ||
    norm.includes('recalcular dados do carro') ||
    norm.includes('recalcular dados do veiculo') ||
    norm.includes('recalcular combustivel') ||
    norm.includes('recalcular turnos') ||
    norm.includes('recalcular despesas') ||
    norm.includes('atualizar custos com base no carro')
  ) {
    const vehicle = driverData.vehicle;
    const gasPrice = driverData.profile.gasPriceReference || 5.89;
    const totalSessions = driverData.workSessions?.length || 0;
    const speech = `Abrindo o recalculador de lançamentos. O consumo configurado do seu ${vehicle.make} ${vehicle.model} é de ${vehicle.avgConsumption} km por litro e o combustível de referência é ${formatCurrency(gasPrice)}.`;

    return {
      intent: 'RECALCULATE_VEHICLE_COSTS',
      confidence: 0.99,
      rawText,
      requiresConfirmation: false,
      speechResponse: speech,
      data: {
        queryAnswer: speech,
        queryDetails: [
          { label: 'Veículo', value: `${vehicle.make} ${vehicle.model} (${vehicle.year})` },
          { label: 'Consumo Médio', value: `${vehicle.avgConsumption} km/L` },
          { label: 'Preço Combustível', value: `${formatCurrency(gasPrice)}/L` },
          { label: 'Expedientes Salvos', value: `${totalSessions} turnos` },
        ],
      },
    };
  }

  // 6. COMANDOS DE INTELIGÊNCIA ARTIFICIAL (REQUEST_AI_ANALYSIS / REQUEST_STRATEGY)
  // "Analisa meus ultimos 30 dias", "Me diga onde estou perdendo dinheiro", "Qual foi meu melhor horario para trabalhar?"
  if (
    norm.includes('analisa meus ultimos 30 dias') ||
    norm.includes('analise meus ultimos') ||
    norm.includes('onde estou perdendo dinheiro') ||
    norm.includes('como posso melhorar') ||
    norm.includes('cria uma estrategia para eu aumentar meu lucro') ||
    norm.includes('qual foi meu melhor horario') ||
    norm.includes('qual aplicativo esta dando mais dinheiro')
  ) {
    const insights = [
      'Seu horário de maior faturamento é das 06h às 09h e das 17h às 20h, gerando R$ 38,50/hora.',
      'Sua plataforma com maior margem líquida nos últimos 30 dias foi a Uber (64% da sua receita total).',
      'O combustível representa 28% do seu faturamento bruto. Abastecer no Etanol nos postos da zona norte reduziu seu custo/km em R$ 0,08.',
      'Corridas com taxa abaixo de R$ 1,80/km estão reduzindo seu lucro real devido ao trânsito lento.',
    ];

    const speech = 'Com base nos seus dados reais dos últimos 30 dias: Seus horários mais lucrativos são de manhã (06h às 09h) e fim de tarde (17h às 20h). O aplicativo Uber representou 64% dos seus ganhos e o combustível consumiu 28% do faturamento.';

    return {
      intent: 'REQUEST_AI_ANALYSIS',
      confidence: 0.95,
      rawText,
      requiresConfirmation: false,
      speechResponse: speech,
      data: {
        queryAnswer: speech,
        strategyInsights: insights,
      },
    };
  }

  // 7. CREATE_FUEL ("Abasteci 30 litros de gasolina a 6 e 20", "Coloquei 100 reais de etanol")
  if (
    norm.includes('abasteci') ||
    norm.includes('coloquei') ||
    norm.includes('abastecer') ||
    norm.includes('gasolina') ||
    norm.includes('etanol') ||
    norm.includes('combustivel')
  ) {
    const liters = extractLiters(norm);
    const amount = extractMonetaryValue(norm);
    const isEtanol = norm.includes('etanol') || norm.includes('alcool');
    const fuelTypeName = isEtanol ? 'Etanol Comum' : 'Gasolina Comum';

    let calculatedLiters = liters || 0;
    let calculatedPrice = driverData.profile.gasPriceReference || 5.89;
    let calculatedTotal = amount || 0;

    if (liters && amount && amount > 0) {
      // Se o usuário falou litros e preço por litro (ex: "30 litros a 6 e 20")
      if (amount < 20) {
        calculatedPrice = amount;
        calculatedTotal = Math.round(liters * calculatedPrice * 100) / 100;
      } else {
        // Falou litros e valor total (ex: "30 litros e deu 180 reais")
        calculatedTotal = amount;
        calculatedPrice = Math.round((calculatedTotal / liters) * 100) / 100;
      }
    } else if (amount && !liters) {
      // Falou apenas o valor (ex: "Coloquei 100 reais de etanol")
      calculatedTotal = amount;
      calculatedPrice = isEtanol ? 3.99 : (driverData.profile.gasPriceReference || 5.89);
      calculatedLiters = Math.round((calculatedTotal / calculatedPrice) * 10) / 10;
    } else if (liters && !amount) {
      // Falou apenas os litros
      calculatedLiters = liters;
      calculatedPrice = isEtanol ? 3.99 : (driverData.profile.gasPriceReference || 5.89);
      calculatedTotal = Math.round(calculatedLiters * calculatedPrice * 100) / 100;
    } else {
      calculatedLiters = 30;
      calculatedPrice = 5.89;
      calculatedTotal = 176.70;
    }

    const dateStr = extractDate(norm);

    const speech = `Entendi: registrar abastecimento de ${calculatedLiters}L de ${fuelTypeName} a ${formatCurrency(calculatedPrice)}/L, totalizando ${formatCurrency(calculatedTotal)}. Confirmar?`;

    return {
      intent: 'CREATE_FUEL',
      confidence: 0.95,
      rawText,
      requiresConfirmation: true,
      speechResponse: speech,
      confirmationMessage: `Registrar abastecimento de ${calculatedLiters}L de ${fuelTypeName} no valor de ${formatCurrency(calculatedTotal)}?`,
      data: {
        fuel: {
          liters: calculatedLiters,
          pricePerLiter: calculatedPrice,
          totalAmount: calculatedTotal,
          fuelType: fuelTypeName,
          date: dateStr,
          odometer: driverData.vehicle.currentOdometer,
        },
      },
    };
  }

  // 8. COMANDO DE ESCALA SEMANAL (REQUEST_WEEKLY_PLAN)
  // "Cria minha escala da proxima semana trabalhando de segunda a sexta das 6 as 14 e folgando sabado e domingo"
  if (
    (norm.includes('cria minha escala') || norm.includes('criar escala') || norm.includes('planeja minha proxima semana') || norm.includes('escala da proxima semana')) &&
    (norm.includes('segunda') || norm.includes('sexta') || norm.includes('folga') || norm.includes('trabalhando'))
  ) {
    const timeRange = extractTimeRange(norm);
    const startHour = timeRange.start || '06:00';
    const endHour = timeRange.end || '14:00';
    const target = driverData.profile.dailyGoal || 250;

    // Próxima segunda-feira
    const today = new Date();
    const dayOfWeek = today.getDay(); // 0 = Domingo
    const daysUntilNextMonday = ((1 + 7 - dayOfWeek) % 7) || 7;
    const nextMonday = new Date(today);
    nextMonday.setDate(today.getDate() + daysUntilNextMonday);

    const days = [
      { name: 'Segunda-feira', short: 'SEG', type: 'work' as const },
      { name: 'Terça-feira', short: 'TER', type: 'work' as const },
      { name: 'Quarta-feira', short: 'QUA', type: 'work' as const },
      { name: 'Quinta-feira', short: 'QUI', type: 'work' as const },
      { name: 'Sexta-feira', short: 'SEX', type: 'work' as const },
      { name: 'Sábado', short: 'SÁB', type: norm.includes('trabalhando sabado') ? 'work' as const : 'off' as const },
      { name: 'Domingo', short: 'DOM', type: 'off' as const },
    ];

    const weeklyItems: ProposedWeeklyScheduleItem[] = days.map((d, index) => {
      const curDate = new Date(nextMonday);
      curDate.setDate(nextMonday.getDate() + index);
      const dateStr = curDate.toISOString().split('T')[0];
      return {
        dayName: d.name,
        dayShort: d.short,
        date: dateStr,
        type: d.type,
        startTime: d.type === 'work' ? startHour : undefined,
        endTime: d.type === 'work' ? endHour : undefined,
        targetEarnings: d.type === 'work' ? target : 0,
      };
    });

    const speech = `Preparei a proposta de escala para a próxima semana: Segunda a Sexta das ${startHour} às ${endHour}, com folga no fim de semana. Confirmar proposta de escala?`;

    return {
      intent: 'REQUEST_WEEKLY_PLAN',
      confidence: 0.95,
      rawText,
      requiresConfirmation: true,
      speechResponse: speech,
      confirmationMessage: 'Salvar escala proposta no Planejador?',
      data: {
        weeklyPlan: {
          items: weeklyItems,
          notes: 'Escala semanal gerada pelo Driver Voice',
        },
      },
    };
  }

  // 9. CREATE_PLANNER_EVENT ("Coloca amanha como dia de trabalho das 6 as 14", "Folga no domingo")
  if (
    norm.includes('coloca amanha') ||
    norm.includes('agenda amanha') ||
    norm.includes('dia de trabalho') ||
    norm.includes('dia de folga') ||
    norm.includes('folga no domingo') ||
    norm.includes('trabalhar amanha') ||
    norm.includes('coloca na escala')
  ) {
    const isOff = norm.includes('folga') || norm.includes('descanso');
    const dateStr = extractDate(norm);
    const timeRange = extractTimeRange(norm);
    const target = isOff ? 0 : (extractMonetaryValue(norm) || driverData.profile.dailyGoal || 250);

    const speech = isOff
      ? `Vou adicionar dia de FOLGA em ${dateStr}. Confirmar?`
      : `Vou adicionar trabalho em ${dateStr} das ${timeRange.start} às ${timeRange.end} com meta de ${formatCurrency(target)}. Confirmar?`;

    return {
      intent: 'CREATE_PLANNER_EVENT',
      confidence: 0.95,
      rawText,
      requiresConfirmation: true,
      speechResponse: speech,
      confirmationMessage: speech,
      data: {
        plannerEvent: {
          date: dateStr,
          type: isOff ? 'off' : 'work',
          startTime: isOff ? undefined : timeRange.start,
          endTime: isOff ? undefined : timeRange.end,
          targetEarnings: target,
          notes: 'Agendado via Driver Voice',
        },
      },
    };
  }

  // 10. CREATE_GOAL ("Minha meta de hoje e 300 reais", "Minha meta semanal e 2000")
  if (norm.includes('minha meta') || norm.includes('definir meta') || norm.includes('meta de hoje')) {
    const val = extractMonetaryValue(norm);
    if (val) {
      const isWeekly = norm.includes('semana');
      const isMonthly = norm.includes('mes') || norm.includes('mensal');
      const type = isMonthly ? 'monthly' : isWeekly ? 'weekly' : 'daily';

      const speech = `Definir sua meta ${type === 'daily' ? 'diária' : type === 'weekly' ? 'semanal' : 'mensal'} para ${formatCurrency(val)}. Confirmar?`;

      return {
        intent: 'CREATE_GOAL',
        confidence: 0.95,
        rawText,
        requiresConfirmation: true,
        speechResponse: speech,
        confirmationMessage: `Atualizar meta para ${formatCurrency(val)}?`,
        data: {
          goal: {
            targetAmount: val,
            type,
          },
        },
      };
    }
  }

  // 11. CREATE_EXPENSE ("Gastei 35 de almoco", "Gastei 15 no pedagio", "Troquei lampada 20 reais")
  if (
    norm.includes('gastei') ||
    norm.includes('despesa') ||
    norm.includes('almoco') ||
    norm.includes('lanche') ||
    norm.includes('pedagio') ||
    norm.includes('lava rapido') ||
    norm.includes('lavagem') ||
    norm.includes('estacionamento')
  ) {
    const val = extractMonetaryValue(norm);
    if (val) {
      const category = extractExpenseCategory(norm);
      const dateStr = extractDate(norm);
      const speech = `Entendi: registrar despesa de ${formatCurrency(val)} em ${category} hoje. Confirmar?`;

      return {
        intent: 'CREATE_EXPENSE',
        confidence: 0.95,
        rawText,
        requiresConfirmation: true,
        speechResponse: speech,
        confirmationMessage: `Registrar despesa de ${formatCurrency(val)} (${category})?`,
        data: {
          expense: {
            amount: val,
            category,
            date: dateStr,
            notes: 'Despesa registrada por voz',
          },
        },
      };
    }
  }

  // 12. CREATE_EARNING ("Registra ai fiz 250 reais hoje", "Hoje fiz 280 na Uber", "Fiz 180 na 99")
  if (
    norm.includes('fiz') ||
    norm.includes('ganhei') ||
    norm.includes('faturei') ||
    norm.includes('uber') ||
    norm.includes('99') ||
    norm.includes('indrive') ||
    norm.includes('particular') ||
    norm.includes('registra ganho') ||
    norm.includes('ganho de')
  ) {
    const val = extractMonetaryValue(norm);
    if (val) {
      const platform = extractPlatform(norm);
      const dateStr = extractDate(norm);
      const speech = `Entendi: registrar ganho de ${formatCurrency(val)} na ${platform} hoje. Confirmar?`;

      return {
        intent: 'CREATE_EARNING',
        confidence: 0.96,
        rawText,
        requiresConfirmation: true,
        speechResponse: speech,
        confirmationMessage: `Registrar ganho de ${formatCurrency(val)} na ${platform}?`,
        data: {
          earning: {
            amount: val,
            platform,
            date: dateStr,
            notes: 'Ganho registrado por comando de voz',
          },
        },
      };
    }
  }

  // 13. CASO AMBÍGUO (Ex: "Registra 200", "200 reais")
  const loneValue = extractMonetaryValue(norm);
  if (loneValue && loneValue > 0) {
    return {
      intent: 'AMBIGUOUS',
      confidence: 0.5,
      rawText,
      requiresConfirmation: false,
      speechResponse: `Você quer registrar ${formatCurrency(loneValue)} como ganho, despesa ou combustível?`,
      ambiguityQuestion: `Você quer registrar ${formatCurrency(loneValue)} como:`,
      ambiguityOptions: [
        { label: `🟢 Ganho (${formatCurrency(loneValue)})`, actionText: `Registra ganho de ${loneValue} na Uber` },
        { label: `🔴 Despesa (${formatCurrency(loneValue)})`, actionText: `Gastei ${loneValue} de alimentação` },
        { label: `⛽ Abastecimento (${formatCurrency(loneValue)})`, actionText: `Abasteci ${loneValue} reais de combustível` },
      ],
      data: {
        queryAnswer: `Aguardando sua escolha para o valor de ${formatCurrency(loneValue)}.`,
      },
    };
  }

  // 14. UNKNOWN / NÃO COMPREENDIDO
  return {
    intent: 'UNKNOWN',
    confidence: 0.1,
    rawText,
    requiresConfirmation: false,
    speechResponse: 'Não compreendi o comando com clareza. Você pode falar por exemplo: "Fiz 250 reais hoje na Uber", "Abasteci 30 litros" ou "Quanto ganhei hoje?".',
    data: {
      queryAnswer: 'Comando não reconhecido. Toque em um dos atalhos rápidos ou fale novamente.',
    },
  };
}
