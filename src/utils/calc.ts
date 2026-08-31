import { ExpenseItem, Vehicle, WorkSession, EarningItem, FuelRecord, PlatformType, RideAnalysis } from '../types';

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
 * Avaliador "Vale a Pena?"
 */
export const analyzeRide = (
  grossAmount: number,
  distanceKm: number,
  durationMinutes: number,
  vehicle: Vehicle,
  minRateKm: number,
  minRateHour: number,
  gasPriceReference: number = 5.89
): RideAnalysis => {
  const durationHours = safeDivide(durationMinutes, 60);
  const ratePerKm = safeDivide(grossAmount, distanceKm);
  const ratePerHour = safeDivide(grossAmount, durationHours);

  const fuelCostPerKm = safeDivide(gasPriceReference, vehicle.avgConsumption || 10);
  const estimatedFuelCost = fuelCostPerKm * distanceKm;
  const depreciationPerKm = calcDepreciationPerKm(vehicle);
  const estimatedDepreciationCost = depreciationPerKm * distanceKm;

  const totalEstimatedCost = estimatedFuelCost + estimatedDepreciationCost;
  const estimatedNetProfit = grossAmount - totalEstimatedCost;
  const marginPercent = grossAmount > 0 ? (estimatedNetProfit / grossAmount) * 100 : 0;

  let status: 'EXCELLENT' | 'FAIR' | 'BAD' = 'BAD';
  let recommendation = 'Rentabilidade abaixo dos seus parâmetros mínimos de corte.';

  if (ratePerKm >= minRateKm && ratePerHour >= minRateHour) {
    status = 'EXCELLENT';
    recommendation = `Excelente corrida! Supera suas metas de corte (${formatCurrency(minRateKm)}/km e ${formatCurrency(minRateHour)}/h).`;
  } else if (ratePerKm >= minRateKm * 0.85 || ratePerHour >= minRateHour * 0.85) {
    status = 'FAIR';
    recommendation = `Corrida aceitável. Fica próxima do seu padrão ideal, avalie o destino e o trânsito da região.`;
  } else {
    status = 'BAD';
    recommendation = `Não recomendada pelos seus parâmetros configurados (${formatCurrency(minRateKm)}/km e ${formatCurrency(minRateHour)}/h).`;
  }

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
 * Comparativo Mês Atual vs Mês Anterior
 */
export const calcMonthlyComparison = (sessions: WorkSession[], expenses: ExpenseItem[]) => {
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth();

  const prevMonthDate = new Date(currentYear, currentMonth - 1, 1);
  const prevYear = prevMonthDate.getFullYear();
  const prevMonth = prevMonthDate.getMonth();

  const isCurrentMonth = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.getFullYear() === currentYear && d.getMonth() === currentMonth;
  };

  const isPrevMonth = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.getFullYear() === prevYear && d.getMonth() === prevMonth;
  };

  const currentSessions = sessions.filter(s => isCurrentMonth(s.startTime));
  const prevSessions = sessions.filter(s => isPrevMonth(s.startTime));

  const currentGross = currentSessions.reduce((acc, s) => acc + s.grossEarnings + s.tips, 0);
  const prevGross = prevSessions.reduce((acc, s) => acc + s.grossEarnings + s.tips, 0);

  const currentFuel = currentSessions.reduce((acc, s) => acc + s.fuelExpenses, 0);
  const currentOtherExp = currentSessions.reduce((acc, s) => acc + s.otherExpenses, 0);
  const currentExpensesDirect = currentFuel + currentOtherExp;

  const prevFuel = prevSessions.reduce((acc, s) => acc + s.fuelExpenses, 0);
  const prevOtherExp = prevSessions.reduce((acc, s) => acc + s.otherExpenses, 0);
  const prevExpensesDirect = prevFuel + prevOtherExp;

  const currentNet = currentGross - currentExpensesDirect;
  const prevNet = prevGross - prevExpensesDirect;

  const grossChange = prevGross > 0 ? ((currentGross - prevGross) / prevGross) * 100 : 0;
  const expensesChange = prevExpensesDirect > 0 ? ((currentExpensesDirect - prevExpensesDirect) / prevExpensesDirect) * 100 : 0;
  const netChange = prevNet > 0 ? ((currentNet - prevNet) / prevNet) * 100 : 0;

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
    currentTripsCount: currentSessions.reduce((acc, s) => acc + s.tripsCount, 0),
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
