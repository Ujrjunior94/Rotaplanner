import { ExpenseItem, Vehicle, WorkSession, EarningItem, FuelRecord, PlatformType, RideAnalysis, FuelCalculationMethod } from '../types';
import { calculateRangeFinancialTruth } from './financialTruth';
import { DEFAULT_TIMEZONE } from './timezone';

/**
 * Trata divisão por zero de forma estritamente segura
 */
export const safeDivide = (num: number, den: number): number => {
  if (!den || den === 0 || isNaN(den) || !isFinite(den)) return 0;
  const result = num / den;
  return isNaN(result) || !isFinite(result) ? 0 : result;
};

/**
 * Formatação em Real Brasileiro (BRL)
 */
export const formatCurrency = (val: number): string => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(val || 0);
};

export const formatKm = (km: number): string => `${(km || 0).toLocaleString('pt-BR', { maximumFractionDigits: 1 })} km`;

export const formatHours = (hoursDecimal: number): string => {
  const h = Math.floor(hoursDecimal || 0);
  const m = Math.round(((hoursDecimal || 0) - h) * 60);
  return `${h}h ${m.toString().padStart(2, '0')}m`;
};

export const formatTimer = (totalSeconds: number): string => {
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
};

/**
 * Custo de Depreciação Estimado por KM
 * Fórmula: (Valor de Compra - Valor Atual Residual Estimado) / Vida Útil Estimada (KM)
 */
export const calcDepreciationPerKm = (vehicle: Vehicle): number => {
  if (!vehicle.purchasePrice || !vehicle.estimatedLifespanKm || vehicle.estimatedLifespanKm <= 0) return 0.15;
  const totalDepreciation = Math.max(0, vehicle.purchasePrice - (vehicle.estimatedCurrentValue || 0));
  return safeDivide(totalDepreciation, vehicle.estimatedLifespanKm);
};

/**
 * Custo Real do Veículo Completo
 * (Combustível + Manutenção + Pneus/Óleo + Depreciação + Seguro/IPVA + Financiamento)
 */
export interface RealCarCostReport {
  fuelCostKm: number;
  depreciationKm: number;
  maintenanceKm: number;
  fixedCostMonthly: number;
  fixedCostKm: number;
  totalCostPerKm: number;
  dailyAvgCost: number; // baseado em 30 dias
  estimatedAnnualCost: number;
}

export const calcRealCarCost = (
  vehicle: Vehicle,
  fuelAvgPricePerLiter: number,
  expenses: ExpenseItem[],
  totalKmTracked: number
): RealCarCostReport => {
  const fuelCostKm = safeDivide(fuelAvgPricePerLiter, vehicle.avgConsumption || 10);
  const depreciationKm = calcDepreciationPerKm(vehicle);

  // Manutenções gerais e desgaste mecânico
  const maintenanceExpenses = expenses
    .filter(e => ['Manutenção', 'Pneus', 'Óleo', 'Freios'].includes(e.category))
    .reduce((acc, curr) => acc + curr.amount, 0);

  const maintenanceKm = totalKmTracked > 100 ? safeDivide(maintenanceExpenses, totalKmTracked) : 0.12;

  // Custos fixos mensais
  const insuranceMonthly = vehicle.insuranceMonthly || 0;
  const ipvaMonthly = safeDivide(vehicle.ipvaAnnual || 0, 12);
  const licensingMonthly = safeDivide(vehicle.licensingAnnual || 0, 12);
  const financingMonthly = vehicle.financed ? (vehicle.financingInstallment || 0) : 0;

  const fixedCostMonthly = insuranceMonthly + ipvaMonthly + licensingMonthly + financingMonthly;

  // Média estimada de 3.000 km por mês para um motorista full-time
  const estimatedMonthlyKm = 3000;
  const fixedCostKm = safeDivide(fixedCostMonthly, estimatedMonthlyKm);

  const totalCostPerKm = fuelCostKm + depreciationKm + maintenanceKm + fixedCostKm;
  const dailyAvgCost = safeDivide(fixedCostMonthly, 30) + (totalCostPerKm * 100); // 100km/dia médio
  const estimatedAnnualCost = (fixedCostMonthly * 12) + (totalCostPerKm * estimatedMonthlyKm * 12);

  return {
    fuelCostKm,
    depreciationKm,
    maintenanceKm,
    fixedCostMonthly,
    fixedCostKm,
    totalCostPerKm,
    dailyAvgCost,
    estimatedAnnualCost,
  };
};

/**
 * Cálculo Automático dos Custos da Rota / Expediente por KM Rodado
 */
export interface ShiftCostsResult {
  kmDriven: number;
  avgConsumption: number;
  fuelPricePerLiter: number;
  litersBurned: number;
  fuelCost: number;
  maintenanceReservePerKm: number;
  maintenanceCost: number;
  depreciationPerKm: number;
  depreciationCost: number;
  fixedCostPerKm: number;
  fixedCost: number;
  totalDirectCost: number; // Combustível + Manutenção
  totalCompleteCost: number; // Combustível + Manutenção + Depreciação + Custos Fixos
  directCostPerKm: number;
  completeCostPerKm: number;
}

export const calcShiftCostsFromKm = (
  kmDriven: number,
  vehicle: Vehicle,
  fuelPricePerLiter: number = 5.89,
  customMaintenancePerKm?: number
): ShiftCostsResult => {
  const safeKm = Math.max(0, kmDriven || 0);
  const avgConsumption = vehicle.avgConsumption > 0 ? vehicle.avgConsumption : 11.5;
  const safeFuelPrice = fuelPricePerLiter > 0 ? fuelPricePerLiter : 5.89;

  const litersBurned = safeDivide(safeKm, avgConsumption);
  const fuelCost = litersBurned * safeFuelPrice;

  const maintenanceReservePerKm = customMaintenancePerKm !== undefined && customMaintenancePerKm >= 0
    ? customMaintenancePerKm
    : 0.15; // R$ 0.15/km padrão para revisão, pneus, pastilhas e óleo
  const maintenanceCost = safeKm * maintenanceReservePerKm;

  const depreciationPerKm = calcDepreciationPerKm(vehicle);
  const depreciationCost = safeKm * depreciationPerKm;

  // Custos fixos proporcionais (mensalidade / 3000 km médios)
  const insuranceMonthly = vehicle.insuranceMonthly || 0;
  const ipvaMonthly = safeDivide(vehicle.ipvaAnnual || 0, 12);
  const financingMonthly = vehicle.financed ? (vehicle.financingInstallment || 0) : 0;
  const fixedMonthly = insuranceMonthly + ipvaMonthly + financingMonthly;
  const fixedCostPerKm = safeDivide(fixedMonthly, 3000);
  const fixedCost = safeKm * fixedCostPerKm;

  const totalDirectCost = fuelCost + maintenanceCost;
  const totalCompleteCost = totalDirectCost + depreciationCost + fixedCost;

  return {
    kmDriven: safeKm,
    avgConsumption,
    fuelPricePerLiter: safeFuelPrice,
    litersBurned: Math.round(litersBurned * 100) / 100,
    fuelCost: Math.round(fuelCost * 100) / 100,
    maintenanceReservePerKm,
    maintenanceCost: Math.round(maintenanceCost * 100) / 100,
    depreciationPerKm: Math.round(depreciationPerKm * 100) / 100,
    depreciationCost: Math.round(depreciationCost * 100) / 100,
    fixedCostPerKm: Math.round(fixedCostPerKm * 100) / 100,
    fixedCost: Math.round(fixedCost * 100) / 100,
    totalDirectCost: Math.round(totalDirectCost * 100) / 100,
    totalCompleteCost: Math.round(totalCompleteCost * 100) / 100,
    directCostPerKm: safeDivide(totalDirectCost, safeKm),
    completeCostPerKm: safeDivide(totalCompleteCost, safeKm),
  };
};

/**
 * Avaliador "Vale a Pena?" (FASE F: Inteligência Multicritério e Decisão Operacional)
 */
export const analyzeRide = (
  grossAmount: number,
  distanceKm: number,
  durationMinutes: number,
  vehicle: Vehicle,
  minRateKm: number,
  minRateHour: number,
  gasPriceReference: number = 5.89,
  deadheadKm: number = 0
): RideAnalysis => {
  const safeDistance = Math.max(0.1, distanceKm);
  const totalDistanceWithDeadhead = safeDistance + Math.max(0, deadheadKm);
  const deadheadRatio = totalDistanceWithDeadhead > 0 ? (deadheadKm / totalDistanceWithDeadhead) : 0;
  
  // Duração estimada considerando tempo de retorno proporcional
  const estimatedDeadheadMinutes = deadheadKm > 0 ? Math.round((durationMinutes / safeDistance) * deadheadKm * 0.8) : 0;
  const totalDurationMinutes = durationMinutes + estimatedDeadheadMinutes;
  const totalDurationHours = safeDivide(totalDurationMinutes, 60);
  const durationHours = safeDivide(durationMinutes, 60);

  // Taxas brutas e efetivas
  const ratePerKm = safeDivide(grossAmount, safeDistance);
  const effectiveRatePerKm = safeDivide(grossAmount, totalDistanceWithDeadhead);
  const ratePerHour = safeDivide(grossAmount, durationHours);
  const effectiveRatePerHour = safeDivide(grossAmount, totalDurationHours);

  // Custos calculados com a distância real total percorrida
  const fuelCostPerKm = safeDivide(gasPriceReference, vehicle.avgConsumption || 10);
  const estimatedFuelCost = fuelCostPerKm * totalDistanceWithDeadhead;
  const depreciationPerKm = calcDepreciationPerKm(vehicle);
  const estimatedDepreciationCost = depreciationPerKm * totalDistanceWithDeadhead;

  const totalEstimatedCost = estimatedFuelCost + estimatedDepreciationCost;
  const estimatedNetProfit = grossAmount - totalEstimatedCost;
  const marginPercent = grossAmount > 0 ? (estimatedNetProfit / grossAmount) * 100 : 0;
  const netPerHour = safeDivide(estimatedNetProfit, totalDurationHours);

  // Cálculo de Score Multicritério de Atratividade (0 a 100)
  // Critério 1: R$/KM vs Meta (peso 35%)
  const kmRatio = minRateKm > 0 ? (effectiveRatePerKm / minRateKm) : 1;
  const scoreKm = Math.min(40, Math.max(0, kmRatio * 35));

  // Critério 2: R$/Hora vs Meta (peso 35%)
  const hourRatio = minRateHour > 0 ? (effectiveRatePerHour / minRateHour) : 1;
  const scoreHour = Math.min(40, Math.max(0, hourRatio * 35));

  // Critério 3: Margem Líquida (peso 20%)
  const scoreMargin = Math.min(20, Math.max(0, (marginPercent / 70) * 20));

  // Critério 4: Penalidade de Retorno Vazio (até -15 pontos)
  const deadheadPenalty = deadheadRatio * 15;

  const rawScore = scoreKm + scoreHour + scoreMargin - deadheadPenalty;
  const score = Math.min(100, Math.max(0, Math.round(rawScore)));

  let status: 'EXCELLENT' | 'FAIR' | 'BAD' = 'BAD';
  let recommendation = 'Rentabilidade abaixo dos seus parâmetros mínimos de corte.';

  if (score >= 80 && effectiveRatePerKm >= minRateKm && effectiveRatePerHour >= minRateHour) {
    status = 'EXCELLENT';
    recommendation = `Excelente corrida (Score ${score}/100)! Supera com folga suas metas de corte (${formatCurrency(minRateKm)}/km e ${formatCurrency(minRateHour)}/h).`;
  } else if (score >= 60 || effectiveRatePerKm >= minRateKm * 0.85 || effectiveRatePerHour >= minRateHour * 0.85) {
    status = 'FAIR';
    if (deadheadKm > 0 && deadheadRatio > 0.3) {
      recommendation = `Atenção ao retorno vazio (${deadheadKm.toFixed(1)} km). O ganho é aceitável, mas o deslocamento de volta reduz o lucro por KM para ${formatCurrency(effectiveRatePerKm)}/km.`;
    } else {
      recommendation = `Corrida aceitável (Score ${score}/100). Fica próxima do seu padrão ideal, avalie o destino e a probabilidade de novas chamadas na chegada.`;
    }
  } else {
    status = 'BAD';
    if (deadheadKm > 0 && effectiveRatePerKm < minRateKm * 0.7) {
      recommendation = `Inviável com retorno vazio: O ganho real cai para ${formatCurrency(effectiveRatePerKm)}/km, muito abaixo do corte de ${formatCurrency(minRateKm)}/km.`;
    } else {
      recommendation = `Não recomendada (Score ${score}/100): Abaixo dos parâmetros configurados (${formatCurrency(minRateKm)}/km e ${formatCurrency(minRateHour)}/h).`;
    }
  }

  // Simulação Comparativa por Plataforma
  const platformEstimates: RideAnalysis['platformEstimates'] = {
    Uber: {
      gross: grossAmount,
      platformFeePercent: 24.5,
      platformFeeAmount: grossAmount * 0.245,
      netProfit: grossAmount * 0.755 - totalEstimatedCost,
      hourlyNet: safeDivide(grossAmount * 0.755 - totalEstimatedCost, totalDurationHours),
      highlight: 'Maior liquidez e volume de chamadas imediatas',
    },
    '99': {
      gross: grossAmount,
      platformFeePercent: 19.9,
      platformFeeAmount: grossAmount * 0.199,
      netProfit: grossAmount * 0.801 - totalEstimatedCost,
      hourlyNet: safeDivide(grossAmount * 0.801 - totalEstimatedCost, totalDurationHours),
      highlight: 'Melhor repasse percentual em corridas médias',
    },
    inDrive: {
      gross: grossAmount,
      platformFeePercent: 10.5,
      platformFeeAmount: grossAmount * 0.105,
      netProfit: grossAmount * 0.895 - totalEstimatedCost,
      hourlyNet: safeDivide(grossAmount * 0.895 - totalEstimatedCost, totalDurationHours),
      highlight: 'Taxa reduzida (apenas 10,5% de comissão)',
    },
    Particular: {
      gross: grossAmount,
      platformFeePercent: 0,
      platformFeeAmount: 0,
      netProfit: grossAmount - totalEstimatedCost,
      hourlyNet: safeDivide(grossAmount - totalEstimatedCost, totalDurationHours),
      highlight: '100% de repasse líquido direto ao motorista',
    },
  };

  return {
    ratePerKm,
    ratePerHour,
    estimatedFuelCost,
    estimatedDepreciationCost,
    totalEstimatedCost,
    estimatedNetProfit,
    marginPercent,
    status,
    recommendation,
    score,
    deadheadKm,
    totalDistanceWithDeadhead,
    effectiveRatePerKm,
    effectiveRatePerHour,
    netPerHour,
    platformEstimates,
  };
};

/**
 * Estatísticas de Abastecimento
 */
export const calcFuelStats = (fuelRecords: FuelRecord[], totalKm: number) => {
  const totalSpent = fuelRecords.reduce((acc, curr) => acc + curr.totalAmount, 0);
  const totalLiters = fuelRecords.reduce((acc, curr) => acc + curr.liters, 0);
  const avgPricePerLiter = safeDivide(totalSpent, totalLiters);
  const costPerKm = safeDivide(totalSpent, totalKm);

  return {
    totalSpent,
    totalLiters,
    avgPricePerLiter,
    costPerKm,
  };
};

/**
 * Estatísticas por Plataforma (Uber, 99, inDrive, etc.)
 */
export const calcPlatformBreakdown = (earnings: EarningItem[]) => {
  const map: Record<PlatformType, { gross: number; tips: number; trips: number }> = {
    Uber: { gross: 0, tips: 0, trips: 0 },
    99: { gross: 0, tips: 0, trips: 0 },
    inDrive: { gross: 0, tips: 0, trips: 0 },
    Particular: { gross: 0, tips: 0, trips: 0 },
    Outro: { gross: 0, tips: 0, trips: 0 },
  };

  earnings.forEach(e => {
    const plat = e.platform || 'Outro';
    if (!map[plat]) {
      map[plat] = { gross: 0, tips: 0, trips: 0 };
    }
    map[plat].gross += e.amount;
    map[plat].tips += e.tip;
    map[plat].trips += e.tripsCount || 1;
  });

  const totalGross = Object.values(map).reduce((acc, p) => acc + p.gross + p.tips, 0);

  return Object.entries(map).map(([platform, data]) => {
    const total = data.gross + data.tips;
    const avgPerTrip = safeDivide(total, data.trips);
    const sharePercent = totalGross > 0 ? (total / totalGross) * 100 : 0;

    return {
      platform: platform as PlatformType,
      gross: data.gross,
      tips: data.tips,
      total,
      trips: data.trips,
      avgPerTrip,
      sharePercent,
    };
  }).filter(p => p.total > 0 || p.trips > 0);
};

/**
 * Comparativo Mês Atual vs Mês Anterior (FASE E - Fonte Única da Verdade)
 */
export const calcMonthlyComparison = (
  sessions: WorkSession[],
  expenses: ExpenseItem[],
  fuelRecords: FuelRecord[] = [],
  earnings: EarningItem[] = [],
  fuelMethod: FuelCalculationMethod = 'hibrido',
  timezone: string = DEFAULT_TIMEZONE
) => {
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth();

  const prevMonthDate = new Date(currentYear, currentMonth - 1, 1);
  const prevYear = prevMonthDate.getFullYear();
  const prevMonth = prevMonthDate.getMonth();

  const daysInCurMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
  const curDates: string[] = [];
  for (let d = 1; d <= daysInCurMonth; d++) {
    curDates.push(`${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`);
  }

  const daysInPrevMonth = new Date(prevYear, prevMonth + 1, 0).getDate();
  const prevDates: string[] = [];
  for (let d = 1; d <= daysInPrevMonth; d++) {
    prevDates.push(`${prevYear}-${String(prevMonth + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`);
  }

  const curTruth = calculateRangeFinancialTruth(
    curDates,
    sessions,
    expenses,
    fuelRecords,
    earnings,
    fuelMethod,
    timezone
  );

  const prevTruth = calculateRangeFinancialTruth(
    prevDates,
    sessions,
    expenses,
    fuelRecords,
    earnings,
    fuelMethod,
    timezone
  );

  const currentGross = curTruth.grossTotal;
  const prevGross = prevTruth.grossTotal;

  const currentExpensesDirect = curTruth.expensesTotal;
  const prevExpensesDirect = prevTruth.expensesTotal;

  const currentNet = curTruth.netProfitTotal;
  const prevNet = prevTruth.netProfitTotal;

  const grossChange = prevGross > 0 ? ((currentGross - prevGross) / prevGross) * 100 : 0;
  const expensesChange = prevExpensesDirect > 0 ? ((currentExpensesDirect - prevExpensesDirect) / prevExpensesDirect) * 100 : 0;
  const netChange = prevNet > 0 ? ((currentNet - prevNet) / prevNet) * 100 : 0;

  const currentSessions = sessions.filter(s => {
    const d = new Date(s.startTime);
    return d.getFullYear() === currentYear && d.getMonth() === currentMonth;
  });

  return {
    currentGross,
    prevGross,
    grossChange,
    currentExpenses: currentExpensesDirect,
    prevExpenses: prevExpensesDirect,
    expensesChange,
    currentNet,
    prevNet,
    netChange,
    currentSessionsCount: currentSessions.length,
    currentTripsCount: curTruth.tripsTotal,
    currentKm: curTruth.distanceKmTotal,
    currentHours: curTruth.durationHoursTotal,
    availableCash: curTruth.availableCashTotal,
    reservesTotal: curTruth.reservesTotal,
  };
};

/**
 * ============================================================================
 * CONSULTOR & SUGESTÃO DE ABASTECIMENTO DIÁRIO ("DEVO ABASTECER HOJE?")
 * ============================================================================
 */

export type FuelAdvisorStatus = 'NO_NEED' | 'STRATEGIC' | 'MUST_REFUEL' | 'OFF_DAY';

export interface FuelParityResult {
  isFlex: boolean;
  ethanolPrice: number;
  gasolinePrice: number;
  ethanolRatioPercent: number; // ex: 68.5%
  betterOption: 'Etanol' | 'Gasolina';
  costPerKmEthanol: number;
  costPerKmGasoline: number;
  savingsPerKm: number;
  estimatedFullTankSavings: number;
  reason: string;
}

export interface FuelAdvisorResult {
  status: FuelAdvisorStatus;
  badgeLabel: string;
  badgeColor: 'emerald' | 'amber' | 'rose' | 'sky';
  title: string;
  headline: string;
  explanation: string;
  currentTankPct: number; // 0 a 100
  currentLiters: number;
  currentRangeKm: number;
  neededKmToday: number;
  marginKm: number; // currentRangeKm - neededKmToday
  litersNeededToday: number;
  costEstimateToday: number;
  suggestedRefuelLiters: number;
  suggestedRefuelCost: number;
  fullTankCost: number;
  fullTankRange: number;
  parity: FuelParityResult;
}

/**
 * Calcula a Paridade Etanol vs Gasolina (Regra dos 70% ou Consumo Real)
 */
export const calcFuelParity = (
  ethanolPrice: number = 3.99,
  gasolinePrice: number = 5.89,
  avgConsumptionGas: number = 12.5,
  isFlex: boolean = true
): FuelParityResult => {
  const safeEth = ethanolPrice > 0 ? ethanolPrice : 3.99;
  const safeGas = gasolinePrice > 0 ? gasolinePrice : 5.89;
  const ratio = safeDivide(safeEth, safeGas) * 100;

  // Consumo típico no etanol é ~70% do consumo na gasolina
  const avgConsumptionEth = avgConsumptionGas * 0.70;

  const costPerKmGas = safeDivide(safeGas, avgConsumptionGas);
  const costPerKmEth = safeDivide(safeEth, avgConsumptionEth);

  const betterOption: 'Etanol' | 'Gasolina' = ratio <= 70.0 ? 'Etanol' : 'Gasolina';
  const savingsPerKm = Math.abs(costPerKmGas - costPerKmEth);
  const estimatedFullTankSavings = savingsPerKm * 400; // base ~400km rodados

  let reason = '';
  if (!isFlex) {
    reason = 'Veículo configurado para combustível único ou não-flex.';
  } else if (ratio <= 68.0) {
    reason = `Etanol muito vantajoso hoje (${ratio.toFixed(1)}% do preço da gasolina, bem abaixo dos 70%). Custo de ${formatCurrency(costPerKmEth)}/km contra ${formatCurrency(costPerKmGas)}/km da gasolina.`;
  } else if (ratio <= 70.0) {
    reason = `Etanol ligeiramente vantajoso (${ratio.toFixed(1)}% do valor da gasolina). Custo de ${formatCurrency(costPerKmEth)}/km.`;
  } else if (ratio <= 73.0) {
    reason = `Gasolina mais vantajosa (${ratio.toFixed(1)}% da paridade). A gasolina proporciona maior autonomia e menos paradas no posto por ${formatCurrency(costPerKmGas)}/km.`;
  } else {
    reason = `Gasolina amplamente mais econômica hoje (${ratio.toFixed(1)}% de paridade). Etanol não compensa nessa faixa de preço.`;
  }

  return {
    isFlex,
    ethanolPrice: safeEth,
    gasolinePrice: safeGas,
    ethanolRatioPercent: ratio,
    betterOption,
    costPerKmEthanol: costPerKmEth,
    costPerKmGasoline: costPerKmGas,
    savingsPerKm,
    estimatedFullTankSavings,
    reason,
  };
};

/**
 * Motor de Inteligência para Indicação Diária de Abastecimento
 */
export const calcDailyFuelAdvisor = (
  vehicle: Vehicle,
  fuelRecords: FuelRecord[],
  plannedKmToday: number,
  isOffDay: boolean = false,
  manualFuelLevelPct: number | null = null,
  gasolinePrice: number = 5.89,
  ethanolPrice: number = 3.99
): FuelAdvisorResult => {
  const tankCapacity = vehicle.tankCapacity || 44;
  const avgConsumption = vehicle.avgConsumption || 12.0;

  // 1. Determinar o nível atual do tanque (% e litros)
  let currentTankPct = 50; // default 50%
  let calculatedCurrentLiters = tankCapacity * 0.5;

  if (manualFuelLevelPct !== null && manualFuelLevelPct >= 0 && manualFuelLevelPct <= 100) {
    currentTankPct = manualFuelLevelPct;
    calculatedCurrentLiters = (manualFuelLevelPct / 100) * tankCapacity;
  } else if (fuelRecords && fuelRecords.length > 0) {
    // Ordenar do mais recente
    const sorted = [...fuelRecords].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    const latestFuel = sorted[0];
    const kmSinceFuel = Math.max(0, vehicle.currentOdometer - latestFuel.odometer);
    const litersBurned = safeDivide(kmSinceFuel, avgConsumption);

    // Se o último abastecimento foi de volume conhecido
    const initialLiters = latestFuel.liters > 0 ? Math.min(tankCapacity, latestFuel.liters + (tankCapacity * 0.2)) : (tankCapacity * 0.85);
    calculatedCurrentLiters = Math.max(0, initialLiters - litersBurned);
    currentTankPct = Math.min(100, Math.max(0, Math.round((calculatedCurrentLiters / tankCapacity) * 100)));
  }

  const currentLiters = calculatedCurrentLiters;
  const currentRangeKm = Math.round(currentLiters * avgConsumption);
  const fullTankRange = Math.round(tankCapacity * avgConsumption);

  // 2. Demanda do dia
  const neededKmToday = Math.round(plannedKmToday > 0 ? plannedKmToday : 120); // base 120km padrão se não houver escala
  const litersNeededToday = safeDivide(neededKmToday, avgConsumption);
  const effectivePricePerLiter = vehicle.fuelType === 'Etanol' ? ethanolPrice : gasolinePrice;
  const costEstimateToday = litersNeededToday * effectivePricePerLiter;

  // Margem restante após rodar hoje
  const marginKm = currentRangeKm - neededKmToday;

  // Paridade de combustível
  const isFlex = vehicle.fuelType === 'Flex';
  const parity = calcFuelParity(ethanolPrice, gasolinePrice, avgConsumption, isFlex);

  // 3. Custos e sugestões de litragem
  const litersToFill = Math.max(0, tankCapacity - currentLiters);
  const fullTankCost = litersToFill * effectivePricePerLiter;

  // Litros sugeridos se for abastecer hoje:
  // Se for abastecer, sugerimos colocar o necessário para o turno de hoje com margem de segurança de +35%, ou completar.
  const suggestedRefuelLiters = Math.min(
    tankCapacity - currentLiters,
    Math.max(10, Math.round(litersNeededToday * 1.35))
  );
  const suggestedRefuelCost = suggestedRefuelLiters * effectivePricePerLiter;

  // 4. Determinação do status e veredito do dia
  let status: FuelAdvisorStatus = 'NO_NEED';
  let badgeLabel = '🟢 NÃO PRECISA ABASTECER HOJE';
  let badgeColor: 'emerald' | 'amber' | 'rose' | 'sky' = 'emerald';
  let title = 'Você tem autonomia suficiente para o dia todo!';
  let headline = `Tanque com ${currentTankPct}% (~${currentRangeKm} km de autonomia).`;
  let explanation = `Sua previsão de rodagem hoje é de ~${neededKmToday} km. Você terminará o dia com ~${Math.max(0, marginKm)} km de sobra segura. Não perca tempo parado em filas de postos no início do seu turno.`;

  if (isOffDay) {
    status = 'OFF_DAY';
    badgeLabel = '🔵 DIA DE FOLGA PLANEJADO';
    badgeColor = 'sky';
    title = 'Hoje é seu dia de descanso planejado.';
    headline = `Carro com ~${currentRangeKm} km de autonomia guardada no tanque.`;
    explanation = `Se avistar um posto de confiança com preço promocional de ${parity.betterOption} (${formatCurrency(parity.betterOption === 'Etanol' ? ethanolPrice : gasolinePrice)}), pode valer a pena abastecer com calma para deixar o carro 100% pronto para o próximo turno de trabalho.`;
  } else if (currentRangeKm < neededKmToday * 0.4 || currentTankPct <= 15 || currentRangeKm <= 60) {
    // Nível Crítico / Reserva
    status = 'MUST_REFUEL';
    badgeLabel = '🔴 DEVE ABASTECER ANTES DE INICIAR';
    badgeColor = 'rose';
    title = 'Atenção: Autonomia insuficiente para o seu turno!';
    headline = `Tanque na reserva (${currentTankPct}% • apenas ~${currentRangeKm} km restantes).`;
    explanation = `Sua meta/escala de hoje prevê rodar ~${neededKmToday} km. Iniciar o turno agora criará risco de pane seca ou fará você recusar corridas longas e lucrativas. Abasteça ao menos ${Math.round(suggestedRefuelLiters)}L (${formatCurrency(suggestedRefuelCost)}) ou complete o tanque antes de abrir os aplicativos.`;
  } else if (currentRangeKm < neededKmToday * 1.15 || currentTankPct <= 30) {
    // Atenção / Estratégico
    status = 'STRATEGIC';
    badgeLabel = '🟡 ABASTECIMENTO ESTRATÉGICO SUGERIDO';
    badgeColor = 'amber';
    title = 'Autonomia no limite do seu dia de trabalho.';
    headline = `Tanque com ${currentTankPct}% (~${currentRangeKm} km de autonomia para ~${neededKmToday} km previstos).`;
    explanation = `Você consegue iniciar o turno, mas o carro entrará na reserva perto do final da jornada (margem de apenas ~${Math.max(0, marginKm)} km). Recomendação: aproveite postos em avenidas menos congestionadas fora dos horários de pico (ex: entre 10h e 13h) para colocar ~${Math.round(suggestedRefuelLiters)}L (${formatCurrency(suggestedRefuelCost)}).`;
  }

  return {
    status,
    badgeLabel,
    badgeColor,
    title,
    headline,
    explanation,
    currentTankPct,
    currentLiters: Math.round(currentLiters * 10) / 10,
    currentRangeKm,
    neededKmToday,
    marginKm,
    litersNeededToday: Math.round(litersNeededToday * 10) / 10,
    costEstimateToday,
    suggestedRefuelLiters,
    suggestedRefuelCost,
    fullTankCost,
    fullTankRange,
    parity,
  };
};

/**
 * Interface para item de prévia de recálculo de lançamento
 */
export interface RecalculationPreviewItem {
  sessionId: string;
  date: string;
  startTime: string;
  endTime: string | null;
  kmDriven: number;
  startOdometer: number;
  endOdometer: number;
  grossEarnings: number;
  tips: number;
  oldFuelExpenses: number;
  newFuelExpenses: number;
  deltaFuel: number; // newFuelExpenses - oldFuelExpenses
  maintenanceReserveCost: number;
  otherExpenses: number;
  oldNet: number;
  newNet: number;
  deltaNet: number; // newNet - oldNet
  tripsCount: number;
  notes?: string;
}

/**
 * Resumo consolidado do recálculo de lançamentos
 */
export interface RecalculationSummary {
  totalSessions: number;
  totalKm: number;
  avgConsumptionUsed: number;
  fuelPriceUsed: number;
  maintenanceRateUsed: number;
  includeMaintenance: boolean;
  oldTotalFuel: number;
  newTotalFuel: number;
  deltaTotalFuel: number;
  totalMaintenanceReserve: number;
  oldTotalNet: number;
  newTotalNet: number;
  deltaTotalNet: number;
  oldAvgCostPerKm: number;
  newAvgCostPerKm: number;
  items: RecalculationPreviewItem[];
}

export interface RecalculationOptions {
  gasPrice?: number;
  avgConsumption?: number;
  maintenanceRate?: number;
  includeMaintenance?: boolean;
  dateFilter?: 'all' | '7days' | '30days' | 'current_month' | 'last_month';
  sessionIds?: string[];
}

/**
 * Gera simulação e prévia do recálculo de lançamentos/expedientes utilizando os dados do veículo
 */
export const previewRecalculateSessions = (
  sessions: WorkSession[],
  vehicle: Vehicle,
  options: RecalculationOptions = {}
): RecalculationSummary => {
  const avgConsumption = options.avgConsumption && options.avgConsumption > 0
    ? options.avgConsumption
    : vehicle.avgConsumption || 11.5;

  const fuelPrice = options.gasPrice && options.gasPrice > 0
    ? options.gasPrice
    : 5.89;

  const maintenanceRate = options.maintenanceRate !== undefined && options.maintenanceRate >= 0
    ? options.maintenanceRate
    : 0.15;

  const includeMaintenance = !!options.includeMaintenance;
  const dateFilter = options.dateFilter || 'all';

  const now = new Date();
  const todayStr = now.toISOString().split('T')[0];

  // Filtro de data
  const filteredSessions = sessions.filter(s => {
    if (s.status !== 'completed') return false;
    if (!s.startOdometer || !s.endOdometer || s.endOdometer <= s.startOdometer) return false;
    if (options.sessionIds && options.sessionIds.length > 0 && !options.sessionIds.includes(s.id)) return false;

    if (dateFilter === 'all') return true;

    const sessionDate = new Date(s.startTime);
    const diffMs = now.getTime() - sessionDate.getTime();
    const diffDays = diffMs / (1000 * 3600 * 24);

    if (dateFilter === '7days') return diffDays <= 7;
    if (dateFilter === '30days') return diffDays <= 30;

    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();

    if (dateFilter === 'current_month') {
      return sessionDate.getFullYear() === currentYear && sessionDate.getMonth() === currentMonth;
    }

    if (dateFilter === 'last_month') {
      const prevMonthDate = new Date(currentYear, currentMonth - 1, 1);
      return (
        sessionDate.getFullYear() === prevMonthDate.getFullYear() &&
        sessionDate.getMonth() === prevMonthDate.getMonth()
      );
    }

    return true;
  });

  let totalKm = 0;
  let oldTotalFuel = 0;
  let newTotalFuel = 0;
  let totalMaintenanceReserve = 0;
  let oldTotalNet = 0;
  let newTotalNet = 0;

  const items: RecalculationPreviewItem[] = filteredSessions.map(s => {
    const startOdo = s.startOdometer || 0;
    const endOdo = s.endOdometer || startOdo;
    const kmDriven = Math.max(0, endOdo - startOdo);
    
    // Cálculo do combustível com dados do veículo
    const litersBurned = safeDivide(kmDriven, avgConsumption);
    const newFuelExpenses = Math.round(litersBurned * fuelPrice * 100) / 100;
    const oldFuelExpenses = Math.round((s.fuelExpenses || 0) * 100) / 100;
    const deltaFuel = Math.round((newFuelExpenses - oldFuelExpenses) * 100) / 100;

    const maintenanceReserveCost = Math.round(kmDriven * maintenanceRate * 100) / 100;

    const gross = s.grossEarnings || 0;
    const tips = s.tips || 0;
    const totalGross = gross + tips;
    const otherExp = s.otherExpenses || 0;

    const oldExpenses = oldFuelExpenses + otherExp;
    const oldNet = Math.round((totalGross - oldExpenses) * 100) / 100;

    const newEffectiveExpenses = newFuelExpenses + otherExp + (includeMaintenance ? maintenanceReserveCost : 0);
    const newNet = Math.round((totalGross - newEffectiveExpenses) * 100) / 100;
    const deltaNet = Math.round((newNet - oldNet) * 100) / 100;

    totalKm += kmDriven;
    oldTotalFuel += oldFuelExpenses;
    newTotalFuel += newFuelExpenses;
    totalMaintenanceReserve += maintenanceReserveCost;
    oldTotalNet += oldNet;
    newTotalNet += newNet;

    return {
      sessionId: s.id,
      date: s.startTime.split('T')[0],
      startTime: s.startTime,
      endTime: s.endTime,
      kmDriven,
      startOdometer: startOdo,
      endOdometer: endOdo,
      grossEarnings: gross,
      tips,
      oldFuelExpenses,
      newFuelExpenses,
      deltaFuel,
      maintenanceReserveCost,
      otherExpenses: otherExp,
      oldNet,
      newNet,
      deltaNet,
      tripsCount: s.tripsCount || 1,
      notes: s.notes,
    };
  });

  const deltaTotalFuel = Math.round((newTotalFuel - oldTotalFuel) * 100) / 100;
  const deltaTotalNet = Math.round((newTotalNet - oldTotalNet) * 100) / 100;

  const oldAvgCostPerKm = safeDivide(oldTotalFuel, totalKm);
  const newAvgCostPerKm = safeDivide(newTotalFuel + (includeMaintenance ? totalMaintenanceReserve : 0), totalKm);

  return {
    totalSessions: items.length,
    totalKm: Math.round(totalKm * 10) / 10,
    avgConsumptionUsed: avgConsumption,
    fuelPriceUsed: fuelPrice,
    maintenanceRateUsed: maintenanceRate,
    includeMaintenance,
    oldTotalFuel: Math.round(oldTotalFuel * 100) / 100,
    newTotalFuel: Math.round(newTotalFuel * 100) / 100,
    deltaTotalFuel,
    totalMaintenanceReserve: Math.round(totalMaintenanceReserve * 100) / 100,
    oldTotalNet: Math.round(oldTotalNet * 100) / 100,
    newTotalNet: Math.round(newTotalNet * 100) / 100,
    deltaTotalNet,
    oldAvgCostPerKm: Math.round(oldAvgCostPerKm * 100) / 100,
    newAvgCostPerKm: Math.round(newAvgCostPerKm * 100) / 100,
    items,
  };
};

/**
 * Cálculo inteligente de Litros no Tanque do Sandero a partir de:
 * 1. Número de Barras LCD do Painel (0 a 8 barras)
 * 2. Autonomia exibida no Computador de Bordo (KM)
 * 3. Consumo Médio configurado (km/L) e Capacidade do Tanque (L)
 */
export interface SanderoTankCalculationResult {
  litersFromBars: number;
  litersFromAutonomy: number;
  recommendedLiters: number;
  autonomyEstimatedFromBars: number;
  impliedConsumption: number;
  barsPercentage: number;
  isReserve: boolean;
  explanation: string;
}

export const calcSanderoLitersFromBarsAndAutonomy = (params: {
  bars: number;
  autonomyKm?: number;
  tankCapacity?: number;
  avgConsumption?: number;
  totalBars?: number;
}): SanderoTankCalculationResult => {
  const {
    bars = 0,
    autonomyKm = 0,
    tankCapacity = 50,
    avgConsumption = 12.5,
    totalBars = 8,
  } = params;

  // Litros baseados na proporção de barras (cada barra em 50L = 6.25L)
  const clampedBars = Math.max(0, Math.min(totalBars, bars));
  const litersFromBars = Number(((clampedBars / totalBars) * tankCapacity).toFixed(1));
  const barsPercentage = Math.round((clampedBars / totalBars) * 100);

  // Litros baseados na autonomia informada
  const validAutonomy = Math.max(0, autonomyKm);
  const litersFromAutonomy = validAutonomy > 0 && avgConsumption > 0
    ? Number((validAutonomy / avgConsumption).toFixed(1))
    : 0;

  // Autonomia estimada a partir das barras
  const autonomyEstimatedFromBars = Math.round(litersFromBars * avgConsumption);

  // Consumo inferido se ambos foram informados
  let impliedConsumption = avgConsumption;
  if (litersFromBars > 0 && validAutonomy > 0) {
    impliedConsumption = Number(safeDivide(validAutonomy, litersFromBars).toFixed(1));
  }

  // Litros recomendados finais (se informou autonomia, usamos com precisão refinada; se não, usamos barras)
  let recommendedLiters = litersFromBars;
  let explanation = '';

  if (validAutonomy > 0 && litersFromBars > 0) {
    // Quando ambos são informados, a autonomia do computador de bordo oferece resolução contínua (ex: 284 km = 22.7L)
    // enquanto as barras dão o intervalo (ex: 4 barras = 25L).
    // Se a autonomia estiver dentro da faixa da barra +/- 1 barra, adotamos a autonomia refinada!
    const autonomyLitersClamped = Math.max(0, Math.min(tankCapacity, litersFromAutonomy));
    recommendedLiters = autonomyLitersClamped;
    explanation = `${clampedBars}/8 barras com ${validAutonomy} km de autonomia no computador de bordo equivalem a ~${recommendedLiters.toFixed(1)} L no tanque (média inferida: ${impliedConsumption} km/L).`;
  } else if (validAutonomy > 0) {
    recommendedLiters = Math.min(tankCapacity, litersFromAutonomy);
    explanation = `Autonomia de ${validAutonomy} km com consumo de ${avgConsumption.toFixed(1)} km/L indica ~${recommendedLiters.toFixed(1)} L no tanque.`;
  } else {
    explanation = `${clampedBars} de ${totalBars} barras (${barsPercentage}%) equivalem a exatamente ~${litersFromBars.toFixed(1)} L no tanque de ${tankCapacity}L.`;
  }

  const isReserve = recommendedLiters <= 6.5 || clampedBars <= 1;

  return {
    litersFromBars,
    litersFromAutonomy,
    recommendedLiters: Number(recommendedLiters.toFixed(1)),
    autonomyEstimatedFromBars,
    impliedConsumption,
    barsPercentage,
    isReserve,
    explanation,
  };
};


