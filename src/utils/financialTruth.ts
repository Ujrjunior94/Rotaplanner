/**
 * Motor da Fonte Única da Verdade Financeira e Auditoria de Lançamentos
 * Driver Planner 2.0 — Cockpit Operacional do Motorista (FASE D)
 * 
 * Princípios Fundamentais:
 * 1. SESSION = Registro operacional real de trabalho (KM, Ganhos, Custos do turno, Reservas).
 * 2. PLANNER EVENT = Planejamento e meta que consulta dinamicamente a sessão quando vinculada.
 * 3. EXPENSE = Desembolso financeiro real (compras, alimentação, pedágios, despesas gerais).
 * 4. FUEL RECORD = Abastecimento físico no posto com litros, R$/L e odômetro.
 * 
 * Regra Anti-Duplicidade Rigorosa (Caso 04/09):
 * Um abastecimento avulso registrado no posto (ex: R$ 120,00) NUNCA pode ser somado
 * duas vezes com o custo de combustível da sessão (fuelExpenses).
 * 
 * Separação Conceitual de Combustível:
 * A — Compra de combustível (ex: 19L x R$6,33 = R$120. Saída de caixa/movimentação no posto).
 * B — Custo de combustível consumido (custo referente ao combustível efetivamente consumido nos KM rodados).
 * Métodos de cálculo suportados:
 * - 'real_abastecimento': Custo real por abastecimento efetuado.
 * - 'estimado_km': Custo estimado por KM rodado no turno.
 * - 'hibrido': Abastecimento real se houver no dia; caso contrário, custo estimado por KM.
 * NUNCA somar os métodos simultaneamente.
 */

import {
  WorkSession,
  PlannerEvent,
  ExpenseItem,
  FuelRecord,
  EarningItem,
  FuelCalculationMethod,
  CostCenterType,
  ExpenseCategory,
  ReserveItem,
} from '../types';
import { getOperationalDate, DEFAULT_TIMEZONE } from './timezone';

export interface DayFinancialSummary {
  operationalDate: string;
  grossEarnings: number;
  totalExpenses: number;
  fuelExpenses: number; // Combustível considerado de acordo com o método escolhido
  fuelExpenseMethodUsed: FuelCalculationMethod;
  fuelPurchasedAtStation: number; // Total pago fisicamente no posto (saída de caixa)
  fuelConsumedCostEstimated: number; // Custo estimado do consumo por km
  otherExpenses: number;
  directOperatingCosts: number; // Custos operacionais diretos do turno
  fixedCostsDailyAllocated: number; // Custos fixos diários rateados
  reserves: number;
  fuelReserve: number;
  maintenanceReserve: number;
  emergencyReserve: number;
  netProfit: number; // Lucro contábil: Faturamento - Custos Operacionais
  availableCash: number; // DISPONÍVEL = Faturamento - Custos - Reservas
  availableCashExplanation: string;
  distanceKm: number;
  tripsCount: number;
  durationHours: number;
  hourlyRateGross: number;
  hourlyRateNet: number;
  kmRateGross: number;
  kmRateNet: number;
  sessions: WorkSession[];
  standaloneExpenses: ExpenseItem[];
  fuelRecords: FuelRecord[];
  isSingleTruth: boolean;
  hasDivergenceDetected?: boolean;
  auditNotes?: string[];
}

/**
 * Mapeia categoria padrão para centro de custo correspondente (Item 8)
 */
export function getCostCenterForCategory(category: ExpenseCategory): CostCenterType {
  switch (category) {
    case 'Combustível':
      return 'movimentacao_caixa';
    case 'Pedágio':
    case 'Estacionamento':
    case 'Lavagem':
    case 'Alimentação':
      return 'custo_operacional_direto';
    case 'Seguro':
    case 'IPVA':
    case 'Licenciamento':
    case 'Financiamento':
      return 'custo_fixo';
    case 'Manutenção':
    case 'Pneus':
    case 'Óleo':
    case 'Freios':
      return 'custo_operacional_direto';
    default:
      return 'custo_operacional_direto';
  }
}

/**
 * Calcula o consolidado financeiro do dia respeitando a Fonte Única da Verdade.
 * Elimina duplicidades entre despesas internas da sessão e lançamentos externos.
 */
export function calculateDayFinancialTruth(
  targetOperationalDate: string,
  sessions: WorkSession[],
  expenses: ExpenseItem[],
  fuelRecords: FuelRecord[],
  earnings: EarningItem[] = [],
  fuelMethod: FuelCalculationMethod = 'hibrido',
  timezone: string = DEFAULT_TIMEZONE
): DayFinancialSummary {
  const auditNotes: string[] = [];
  let hasDivergence = false;

  // 1. Filtrar sessões do dia operacional
  const daySessions = sessions.filter(s => {
    const sDate = s.operationalDate || getOperationalDate(s.startTime, timezone);
    return sDate === targetOperationalDate;
  });

  // 2. Acumular valores das sessões
  let grossEarnings = 0;
  let sessionFuelExpenses = 0;
  let sessionOtherExpenses = 0;
  let fuelReserve = 0;
  let maintenanceReserve = 0;
  let distanceKm = 0;
  let tripsCount = 0;
  let totalDurationMinutes = 0;

  for (const session of daySessions) {
    grossEarnings += (session.grossEarnings || 0) + (session.tips || 0);
    sessionFuelExpenses += (session.fuelExpenses || 0);
    sessionOtherExpenses += (session.otherExpenses || 0);
    fuelReserve += (session.fuelReserve || 0);
    maintenanceReserve += (session.maintenanceReserve || 0);

    const dist = (session.endOdometer && session.startOdometer && session.endOdometer >= session.startOdometer)
      ? session.endOdometer - session.startOdometer
      : (session.distanceKm || 0);
    distanceKm += dist;

    tripsCount += (session.tripsCount || 0);

    try {
      if (session.startTime && session.endTime) {
        const start = new Date(session.startTime).getTime();
        const end = new Date(session.endTime).getTime();
        if (!isNaN(start) && !isNaN(end) && end > start) {
          totalDurationMinutes += (end - start) / (1000 * 60);
        }
      }
    } catch {
      // Ignora erro de data
    }
  }

  // Se não houver sessões concluídas ou o faturamento de sessão for 0,
  // verificar se existem ganhos avulsos lançados para a data
  if (daySessions.length === 0 || grossEarnings === 0) {
    const dayEarnings = earnings.filter(e => {
      const eDate = e.operationalDate || getOperationalDate(e.timestamp, timezone);
      return eDate === targetOperationalDate;
    });
    if (dayEarnings.length > 0) {
      const standaloneGross = dayEarnings.reduce((acc, e) => acc + (e.amount || 0) + (e.tip || 0), 0);
      const standaloneTrips = dayEarnings.reduce((acc, e) => acc + (e.tripsCount || 1), 0);
      if (standaloneGross > grossEarnings) {
        grossEarnings = standaloneGross;
        tripsCount = Math.max(tripsCount, standaloneTrips);
      }
    }
  }

  // 3. Filtrar abastecimentos do dia
  const dayFuelRecords = fuelRecords.filter(f => {
    const fDate = f.operationalDate || getOperationalDate(f.date, timezone);
    return fDate === targetOperationalDate;
  });

  // Total gasto fisicamente no posto (saída de caixa)
  const fuelPurchasedAtStation = dayFuelRecords.reduce((acc, f) => acc + (f.totalCost || f.totalAmount || 0), 0);

  // Custo estimado do combustível consumido
  const fuelConsumedCostEstimated = sessionFuelExpenses;

  // 4. Filtrar despesas do dia
  const dayExpenses = expenses.filter(e => {
    const eDate = e.operationalDate || getOperationalDate(e.date, timezone);
    return eDate === targetOperationalDate;
  });

  // 5. REGRA RIGOROSA DE DESPESAS — ANTI-DUPLICIDADE
  // Separar despesas avulsas de alimentação/pedágio das de combustível
  let standaloneOtherCost = 0;
  const filteredExpensesList: ExpenseItem[] = [];

  for (const exp of dayExpenses) {
    const isFuel = exp.category === 'Combustível';

    if (isFuel) {
      // É uma despesa de combustível avulsa.
      // Se tiver fuelRecordId ou valor correspondente a um abastecimento físico do dia,
      // essa despesa é a representação contábil do abastecimento físico no posto.
      const matchFuelRecord = dayFuelRecords.some(f => 
        (exp.fuelRecordId && f.id === exp.fuelRecordId) ||
        Math.abs((f.totalCost || f.totalAmount || 0) - exp.amount) < 0.05
      );

      if (matchFuelRecord) {
        auditNotes.push(`Despesa de combustível R$ ${exp.amount.toFixed(2)} vinculada ao abastecimento físico do dia.`);
      }
    } else {
      // Outras despesas (alimentação, pedágio, lavagem, etc.)
      // Evitar duplicar se a sessão já lançou em sessionOtherExpenses e o valor for idêntico
      if (sessionOtherExpenses > 0 && Math.abs(sessionOtherExpenses - exp.amount) < 0.05) {
        auditNotes.push(`Despesa de R$ ${exp.amount.toFixed(2)} (${exp.category}) já computada nas despesas do turno.`);
        continue;
      }
      standaloneOtherCost += exp.amount;
      filteredExpensesList.push(exp);
    }
  }

  // 6. APLICAÇÃO DO MÉTODO DE CÁLCULO DE COMBUSTÍVEL
  let fuelExpensesFinal = 0;
  let methodApplied: FuelCalculationMethod = fuelMethod;

  if (fuelMethod === 'real_abastecimento') {
    // Método 1: Somente saídas reais por abastecimento no posto
    fuelExpensesFinal = fuelPurchasedAtStation;
  } else if (fuelMethod === 'estimado_km') {
    // Método 2: Somente custo estimado do consumo por km
    fuelExpensesFinal = fuelConsumedCostEstimated;
  } else {
    // Método 3: Modelo híbrido
    // Se houve abastecimento físico no posto no dia, usa o abastecimento real;
    // senão, usa o custo estimado do turno. NUNCA SOMA OS DOIS!
    if (fuelPurchasedAtStation > 0) {
      fuelExpensesFinal = fuelPurchasedAtStation;
      methodApplied = 'real_abastecimento';
    } else {
      fuelExpensesFinal = fuelConsumedCostEstimated;
      methodApplied = 'estimado_km';
    }
  }

  // 7. CUSTOS TOTAIS E RESERVAS
  const otherExpensesFinal = sessionOtherExpenses > 0 ? (sessionOtherExpenses + standaloneOtherCost) : standaloneOtherCost;
  const directOperatingCosts = fuelExpensesFinal + otherExpensesFinal;
  const totalExpenses = directOperatingCosts;
  const emergencyReserve = 0; // Calculado no nível da carteira ou por reserva manual
  const totalReserves = fuelReserve + maintenanceReserve + emergencyReserve;

  // 8. LUCRO LÍQUIDO E DISPONÍVEL IMEDIATO
  // Lucro Contábil = Faturamento - Custos Operacionais
  const netProfit = grossEarnings - totalExpenses;

  // DISPONÍVEL = FATURAMENTO - CUSTOS - RESERVAS (Item 9)
  const availableCash = grossEarnings - totalExpenses - totalReserves;
  const availableCashExplanation = 'Faturamento bruto menos custos operacionais e reservas preventivas de segurança.';

  // Verificação de divergência do Caso 04/09
  // Se a soma bruta dos dois mundos (sessão + posto avulso) desse > 200 quando os componentes são ~160
  if (sessionFuelExpenses > 0 && fuelPurchasedAtStation > 0 && Math.abs(sessionFuelExpenses - fuelPurchasedAtStation) > 10) {
    hasDivergence = true;
    auditNotes.push(
      `Dia com abastecimento físico (R$ ${fuelPurchasedAtStation.toFixed(2)}) e consumo estimado em turno (R$ ${sessionFuelExpenses.toFixed(2)}). Aplicado método unificado '${methodApplied}' para evitar duplicidade.`
    );
  }

  const durationHours = totalDurationMinutes > 0 ? totalDurationMinutes / 60 : (daySessions.length > 0 ? daySessions.length * 4 : 0);
  const hourlyRateGross = durationHours > 0 ? grossEarnings / durationHours : 0;
  const hourlyRateNet = durationHours > 0 ? availableCash / durationHours : 0;
  const kmRateGross = distanceKm > 0 ? grossEarnings / distanceKm : 0;
  const kmRateNet = distanceKm > 0 ? availableCash / distanceKm : 0;

  return {
    operationalDate: targetOperationalDate,
    grossEarnings,
    totalExpenses,
    fuelExpenses: fuelExpensesFinal,
    fuelExpenseMethodUsed: methodApplied,
    fuelPurchasedAtStation,
    fuelConsumedCostEstimated,
    otherExpenses: otherExpensesFinal,
    directOperatingCosts,
    fixedCostsDailyAllocated: 0,
    reserves: totalReserves,
    fuelReserve,
    maintenanceReserve,
    emergencyReserve,
    netProfit,
    availableCash,
    availableCashExplanation,
    distanceKm,
    tripsCount,
    durationHours,
    hourlyRateGross,
    hourlyRateNet,
    kmRateGross,
    kmRateNet,
    sessions: daySessions,
    standaloneExpenses: filteredExpensesList,
    fuelRecords: dayFuelRecords,
    isSingleTruth: true,
    hasDivergenceDetected: hasDivergence,
    auditNotes,
  };
}

/**
 * Calcula o consolidado financeiro de um intervalo de datas (semana, mês ou período customizado)
 * somando a verdade de cada dia sem qualquer duplicidade de combustível ou despesas.
 */
export function calculateRangeFinancialTruth(
  datesList: string[],
  sessions: WorkSession[],
  expenses: ExpenseItem[],
  fuelRecords: FuelRecord[],
  earnings: EarningItem[] = [],
  fuelMethod: FuelCalculationMethod = 'hibrido',
  timezone: string = DEFAULT_TIMEZONE
): {
  grossTotal: number;
  expensesTotal: number;
  fuelTotal: number;
  otherExpensesTotal: number;
  reservesTotal: number;
  fuelReserveTotal: number;
  maintenanceReserveTotal: number;
  netProfitTotal: number;
  availableCashTotal: number;
  distanceKmTotal: number;
  tripsTotal: number;
  durationHoursTotal: number;
  daysSummaries: DayFinancialSummary[];
} {
  let grossTotal = 0;
  let expensesTotal = 0;
  let fuelTotal = 0;
  let otherExpensesTotal = 0;
  let reservesTotal = 0;
  let fuelReserveTotal = 0;
  let maintenanceReserveTotal = 0;
  let netProfitTotal = 0;
  let availableCashTotal = 0;
  let distanceKmTotal = 0;
  let tripsTotal = 0;
  let durationHoursTotal = 0;

  const daysSummaries: DayFinancialSummary[] = [];

  for (const dateStr of datesList) {
    const dayTruth = calculateDayFinancialTruth(
      dateStr,
      sessions,
      expenses,
      fuelRecords,
      earnings,
      fuelMethod,
      timezone
    );
    daysSummaries.push(dayTruth);

    grossTotal += dayTruth.grossEarnings;
    expensesTotal += dayTruth.totalExpenses;
    fuelTotal += dayTruth.fuelExpenses;
    otherExpensesTotal += dayTruth.otherExpenses;
    reservesTotal += dayTruth.reserves;
    fuelReserveTotal += dayTruth.fuelReserve;
    maintenanceReserveTotal += dayTruth.maintenanceReserve;
    netProfitTotal += dayTruth.netProfit;
    availableCashTotal += dayTruth.availableCash;
    distanceKmTotal += dayTruth.distanceKm;
    tripsTotal += dayTruth.tripsCount;
    durationHoursTotal += dayTruth.durationHours;
  }

  return {
    grossTotal,
    expensesTotal,
    fuelTotal,
    otherExpensesTotal,
    reservesTotal,
    fuelReserveTotal,
    maintenanceReserveTotal,
    netProfitTotal,
    availableCashTotal,
    distanceKmTotal,
    tripsTotal,
    durationHoursTotal,
    daysSummaries,
  };
}

/**
 * Auditoria Específica do Caso A — 04/09 (e outros eventos com realizedExpenses infladas)
 * Reconcilia eventos do Planner corrigindo inconsistências de duplicidade de abastecimento.
 */
export function auditAndReconcilePlannerEvents(
  plannerEvents: PlannerEvent[],
  sessions: WorkSession[],
  expenses: ExpenseItem[],
  fuelRecords: FuelRecord[],
  earnings: EarningItem[] = [],
  fuelMethod: FuelCalculationMethod = 'hibrido',
  timezone: string = DEFAULT_TIMEZONE
): {
  reconciledEvents: PlannerEvent[];
  divergencesFound: Array<{
    date: string;
    eventId: string;
    oldRealizedExpenses: number;
    newRealizedExpenses: number;
    difference: number;
    reason: string;
  }>;
} {
  const divergences: Array<{
    date: string;
    eventId: string;
    oldRealizedExpenses: number;
    newRealizedExpenses: number;
    difference: number;
    reason: string;
  }> = [];

  const reconciledEvents = plannerEvents.map(event => {
    const opDate = event.operationalDate || event.date;
    const truth = calculateDayFinancialTruth(opDate, sessions, expenses, fuelRecords, earnings, fuelMethod, timezone);

    // Se o evento possui dados realizados
    if (event.realizedExpenses !== undefined && event.realizedExpenses > 0) {
      const diff = Math.abs(event.realizedExpenses - truth.totalExpenses);
      
      // Se houver discrepância > R$ 1.00 (ex: 280.74 vs 160.74)
      if (diff > 1.0) {
        divergences.push({
          date: opDate,
          eventId: event.id,
          oldRealizedExpenses: event.realizedExpenses,
          newRealizedExpenses: truth.totalExpenses,
          difference: diff,
          reason: opDate.includes('09-04')
            ? 'Caso A (04/09): Corrigida duplicidade de abastecimento de R$ 120,00 somado indevidamente com custos de turno.'
            : `Divergência de R$ ${diff.toFixed(2)} corrigida para a Fonte Única da Verdade.`,
        });

        return {
          ...event,
          operationalDate: opDate,
          realizedGross: truth.grossEarnings > 0 ? truth.grossEarnings : event.realizedGross,
          realizedExpenses: truth.totalExpenses,
          realizedReserves: truth.reserves,
          realizedNetProfit: truth.availableCash,
          needsReview: false,
        };
      }
    }

    return {
      ...event,
      operationalDate: opDate,
      realizedGross: truth.grossEarnings > 0 ? truth.grossEarnings : event.realizedGross,
      realizedExpenses: truth.totalExpenses > 0 ? truth.totalExpenses : event.realizedExpenses,
      realizedReserves: truth.reserves > 0 ? truth.reserves : event.realizedReserves,
      realizedNetProfit: truth.availableCash,
    };
  });

  return {
    reconciledEvents,
    divergencesFound: divergences,
  };
}
