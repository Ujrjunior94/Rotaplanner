import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import {
  UserProfile,
  Vehicle,
  WorkSession,
  EarningItem,
  ExpenseItem,
  FuelRecord,
  MaintenanceRecord,
  PlatformType,
} from '../types';
import {
  formatCurrency,
  formatKm,
  formatHours,
  safeDivide,
  calcDepreciationPerKm,
} from './calc';

export interface PDFExportOptions {
  includeVehicleDetails?: boolean;
  includeDailyBreakdown?: boolean;
  includePlatformBreakdown?: boolean;
  includeExpensesBreakdown?: boolean;
  includeFuelLogs?: boolean;
  includeMaintenanceLogs?: boolean;
  includeGoalsComparison?: boolean;
  includeFixedCosts?: boolean;
}

export interface DateRange {
  startDate: Date;
  endDate: Date;
  label: string;
}

// Helpers para cálculo de períodos
export const getWeekRange = (baseDate: Date = new Date()): DateRange => {
  const d = new Date(baseDate);
  const day = d.getDay();
  // 0 = Domingo, 1 = Segunda, etc.
  // Fazemos a semana começar na Segunda (1) e terminar no Domingo (0)
  const diffToMonday = day === 0 ? -6 : 1 - day;
  const start = new Date(d);
  start.setDate(d.getDate() + diffToMonday);
  start.setHours(0, 0, 0, 0);

  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  end.setHours(23, 59, 59, 999);

  const startFormatted = start.toLocaleDateString('pt-BR');
  const endFormatted = end.toLocaleDateString('pt-BR');

  return {
    startDate: start,
    endDate: end,
    label: `Semana de ${startFormatted} a ${endFormatted}`,
  };
};

export const getMonthRange = (year: number, monthIndex: number): DateRange => {
  const start = new Date(year, monthIndex, 1, 0, 0, 0, 0);
  const end = new Date(year, monthIndex + 1, 0, 23, 59, 59, 999);
  
  const monthNames = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
  ];

  return {
    startDate: start,
    endDate: end,
    label: `${monthNames[monthIndex]} de ${year}`,
  };
};

// Formatação amigável de datas
const formatDateBR = (dateStrOrObj: string | Date): string => {
  const d = typeof dateStrOrObj === 'string' ? new Date(dateStrOrObj) : dateStrOrObj;
  return d.toLocaleDateString('pt-BR');
};

const getDayOfWeekName = (date: Date): string => {
  const days = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];
  return days[date.getDay()];
};

// ============================================================================
// CÁLCULO DOS DADOS DO RELATÓRIO SEMANAL
// ============================================================================
export interface WeeklyReportData {
  range: DateRange;
  grossTotal: number;
  tipsTotal: number;
  fuelExpenses: number;
  otherExpenses: number;
  totalExpenses: number;
  netProfit: number;
  netMarginPercent: number;
  totalKm: number;
  totalHours: number;
  totalTrips: number;
  grossPerHour: number;
  netPerHour: number;
  grossPerKm: number;
  netPerKm: number;
  avgPerTrip: number;
  goalTarget: number;
  goalAchievementPercent: number;
  
  // Detalhamento diário (7 dias)
  dailyRows: {
    dateStr: string;
    dayName: string;
    gross: number;
    tips: number;
    fuelExp: number;
    otherExp: number;
    totalExp: number;
    net: number;
    km: number;
    hours: number;
    trips: number;
    rateKm: number;
    rateHour: number;
  }[];

  // Detalhamento por plataforma
  platformRows: {
    platform: PlatformType;
    gross: number;
    tips: number;
    total: number;
    trips: number;
    avgPerTrip: number;
    sharePercent: number;
  }[];

  // Detalhamento por categoria de despesas
  expenseCategoryRows: {
    category: string;
    amount: number;
    sharePercent: number;
  }[];

  // Abastecimentos da semana
  fuelRecords: FuelRecord[];
}

export const aggregateWeeklyData = (
  range: DateRange,
  sessions: WorkSession[],
  earnings: EarningItem[],
  expenses: ExpenseItem[],
  fuelRecords: FuelRecord[],
  profile: UserProfile,
  vehicle: Vehicle
): WeeklyReportData => {
  const startTimeMs = range.startDate.getTime();
  const endTimeMs = range.endDate.getTime();

  // Filtrar sessões no período
  const periodSessions = sessions.filter(s => {
    const sTime = new Date(s.startTime).getTime();
    return sTime >= startTimeMs && sTime <= endTimeMs;
  });

  // Filtrar ganhos individuais se houver (para plataformas)
  const periodEarnings = earnings.filter(e => {
    const eTime = new Date(e.timestamp).getTime();
    return eTime >= startTimeMs && eTime <= endTimeMs;
  });

  // Filtrar despesas
  const periodExpenses = expenses.filter(e => {
    const eTime = new Date(e.date + 'T12:00:00').getTime();
    return eTime >= startTimeMs && eTime <= endTimeMs;
  });

  // Filtrar abastecimentos
  const periodFuel = fuelRecords.filter(f => {
    const fTime = new Date(f.date + 'T12:00:00').getTime();
    return fTime >= startTimeMs && fTime <= endTimeMs;
  });

  // Totais das sessões
  const sessionGross = periodSessions.reduce((sum, s) => sum + s.grossEarnings, 0);
  const sessionTips = periodSessions.reduce((sum, s) => sum + s.tips, 0);
  const sessionFuelExp = periodSessions.reduce((sum, s) => sum + s.fuelExpenses, 0);
  const sessionOtherExp = periodSessions.reduce((sum, s) => sum + s.otherExpenses, 0);
  const sessionTrips = periodSessions.reduce((sum, s) => sum + s.tripsCount, 0);

  // Considerar despesas registradas avulsas + despesas de sessões
  const directExpensesFromList = periodExpenses.reduce((sum, e) => sum + e.amount, 0);
  const directFuelFromList = periodFuel.reduce((sum, f) => sum + f.totalAmount, 0);

  // Evitar duplicar combustível se já estiver na lista de despesas ou no turno
  const totalFuelCost = Math.max(sessionFuelExp, directFuelFromList);
  const totalOtherExpenses = Math.max(sessionOtherExp, directExpensesFromList);
  const totalExpenses = totalFuelCost + totalOtherExpenses;

  // Ganhos totais
  const grossEarningsFromItems = periodEarnings.reduce((sum, e) => sum + e.amount, 0);
  const tipsFromItems = periodEarnings.reduce((sum, e) => sum + e.tip, 0);

  const grossTotal = Math.max(sessionGross, grossEarningsFromItems);
  const tipsTotal = Math.max(sessionTips, tipsFromItems);
  const totalRevenue = grossTotal + tipsTotal;

  const netProfit = totalRevenue - totalExpenses;
  const netMarginPercent = totalRevenue > 0 ? (netProfit / totalRevenue) * 100 : 0;

  // KM e Horas
  let totalKm = 0;
  let totalHours = 0;

  periodSessions.forEach(s => {
    if (s.startOdometer && s.endOdometer && s.endOdometer >= s.startOdometer) {
      totalKm += (s.endOdometer - s.startOdometer);
    }
    if (s.startTime && s.endTime) {
      const durMs = new Date(s.endTime).getTime() - new Date(s.startTime).getTime();
      totalHours += Math.max(0, durMs / (1000 * 60 * 60));
    }
  });

  const totalTrips = Math.max(sessionTrips, periodEarnings.reduce((sum, e) => sum + (e.tripsCount || 1), 0));
  const grossPerHour = safeDivide(totalRevenue, totalHours);
  const netPerHour = safeDivide(netProfit, totalHours);
  const grossPerKm = safeDivide(totalRevenue, totalKm);
  const netPerKm = safeDivide(netProfit, totalKm);
  const avgPerTrip = safeDivide(totalRevenue, totalTrips);

  const goalTarget = profile.weeklyGoal || 1500;
  const goalAchievementPercent = safeDivide(totalRevenue, goalTarget) * 100;

  // Construir 7 dias da semana
  const dailyRows: WeeklyReportData['dailyRows'] = [];
  for (let i = 0; i < 7; i++) {
    const dayDate = new Date(range.startDate);
    dayDate.setDate(range.startDate.getDate() + i);
    const dayStr = dayDate.toISOString().split('T')[0];
    const dayFormatted = dayDate.toLocaleDateString('pt-BR');
    const dayName = getDayOfWeekName(dayDate);

    // Filtrar sessões do dia
    const daySessions = periodSessions.filter(s => s.startTime.startsWith(dayStr));
    const dayEarnings = periodEarnings.filter(e => e.timestamp.startsWith(dayStr));
    const dayExpenses = periodExpenses.filter(e => e.date === dayStr);
    const dayFuel = periodFuel.filter(f => f.date === dayStr);

    const dGross = daySessions.length > 0
      ? daySessions.reduce((sum, s) => sum + s.grossEarnings, 0)
      : dayEarnings.reduce((sum, e) => sum + e.amount, 0);

    const dTips = daySessions.length > 0
      ? daySessions.reduce((sum, s) => sum + s.tips, 0)
      : dayEarnings.reduce((sum, e) => sum + e.tip, 0);

    const dFuelExp = Math.max(
      daySessions.reduce((sum, s) => sum + s.fuelExpenses, 0),
      dayFuel.reduce((sum, f) => sum + f.totalAmount, 0)
    );

    const dOtherExp = Math.max(
      daySessions.reduce((sum, s) => sum + s.otherExpenses, 0),
      dayExpenses.reduce((sum, e) => sum + e.amount, 0)
    );

    const dTotalExp = dFuelExp + dOtherExp;
    const dNet = (dGross + dTips) - dTotalExp;

    let dKm = 0;
    let dHours = 0;
    daySessions.forEach(s => {
      if (s.startOdometer && s.endOdometer && s.endOdometer >= s.startOdometer) {
        dKm += (s.endOdometer - s.startOdometer);
      }
      if (s.startTime && s.endTime) {
        const ms = new Date(s.endTime).getTime() - new Date(s.startTime).getTime();
        dHours += Math.max(0, ms / (1000 * 60 * 60));
      }
    });

    const dTrips = Math.max(
      daySessions.reduce((sum, s) => sum + s.tripsCount, 0),
      dayEarnings.reduce((sum, e) => sum + (e.tripsCount || 1), 0)
    );

    dailyRows.push({
      dateStr: dayFormatted,
      dayName,
      gross: dGross,
      tips: dTips,
      fuelExp: dFuelExp,
      otherExp: dOtherExp,
      totalExp: dTotalExp,
      net: dNet,
      km: dKm,
      hours: dHours,
      trips: dTrips,
      rateKm: safeDivide(dGross + dTips, dKm),
      rateHour: safeDivide(dGross + dTips, dHours),
    });
  }

  // Detalhamento por plataforma
  const platformMap: Record<PlatformType, { gross: number; tips: number; trips: number }> = {
    Uber: { gross: 0, tips: 0, trips: 0 },
    99: { gross: 0, tips: 0, trips: 0 },
    inDrive: { gross: 0, tips: 0, trips: 0 },
    Particular: { gross: 0, tips: 0, trips: 0 },
    Outro: { gross: 0, tips: 0, trips: 0 },
  };

  periodEarnings.forEach(e => {
    const p = e.platform || 'Outro';
    if (!platformMap[p]) platformMap[p] = { gross: 0, tips: 0, trips: 0 };
    platformMap[p].gross += e.amount;
    platformMap[p].tips += e.tip;
    platformMap[p].trips += (e.tripsCount || 1);
  });

  // Se não houver earnings individuais mas houver sessions com platformEarnings
  if (periodEarnings.length === 0) {
    periodSessions.forEach(s => {
      if (s.platformEarnings) {
        Object.entries(s.platformEarnings).forEach(([plat, val]) => {
          if (val && val.amount > 0) {
            const p = plat as PlatformType;
            if (!platformMap[p]) platformMap[p] = { gross: 0, tips: 0, trips: 0 };
            platformMap[p].gross += val.amount;
            platformMap[p].trips += val.trips || 0;
          }
        });
      }
    });
  }

  const platformTotalGross = Object.values(platformMap).reduce((acc, p) => acc + p.gross + p.tips, 0) || totalRevenue;
  const platformRows = Object.entries(platformMap)
    .map(([plat, data]) => {
      const tot = data.gross + data.tips;
      return {
        platform: plat as PlatformType,
        gross: data.gross,
        tips: data.tips,
        total: tot,
        trips: data.trips,
        avgPerTrip: safeDivide(tot, data.trips),
        sharePercent: platformTotalGross > 0 ? (tot / platformTotalGross) * 100 : 0,
      };
    })
    .filter(p => p.total > 0 || p.trips > 0)
    .sort((a, b) => b.total - a.total);

  // Despesas por categoria
  const expCatMap: Record<string, number> = {};
  if (totalFuelCost > 0) expCatMap['Combustível'] = totalFuelCost;
  periodExpenses.forEach(e => {
    expCatMap[e.category] = (expCatMap[e.category] || 0) + e.amount;
  });

  const sumExpenses = Object.values(expCatMap).reduce((a, b) => a + b, 0);
  const expenseCategoryRows = Object.entries(expCatMap)
    .map(([cat, amt]) => ({
      category: cat,
      amount: amt,
      sharePercent: sumExpenses > 0 ? (amt / sumExpenses) * 100 : 0,
    }))
    .sort((a, b) => b.amount - a.amount);

  return {
    range,
    grossTotal,
    tipsTotal,
    fuelExpenses: totalFuelCost,
    otherExpenses: totalOtherExpenses,
    totalExpenses,
    netProfit,
    netMarginPercent,
    totalKm,
    totalHours,
    totalTrips,
    grossPerHour,
    netPerHour,
    grossPerKm,
    netPerKm,
    avgPerTrip,
    goalTarget,
    goalAchievementPercent,
    dailyRows,
    platformRows,
    expenseCategoryRows,
    fuelRecords: periodFuel,
  };
};

// ============================================================================
// CÁLCULO DOS DADOS DO RELATÓRIO MENSAL
// ============================================================================
export interface MonthlyReportData {
  range: DateRange;
  year: number;
  monthIndex: number;
  monthName: string;
  grossTotal: number;
  tipsTotal: number;
  directExpenses: number;
  fixedCostsProportional: number;
  totalExpensesWithFixed: number;
  grossOperatingProfit: number;
  realNetProfit: number;
  netMarginPercent: number;
  totalKm: number;
  totalHours: number;
  totalTrips: number;
  daysWorkedCount: number;
  grossPerHour: number;
  netPerHour: number;
  grossPerKm: number;
  netPerKm: number;
  avgDailyGross: number;
  avgDailyNet: number;
  estimatedDepreciation: number;
  finalProfitAfterDepreciation: number;
  goalTarget: number;
  goalAchievementPercent: number;
  
  // Comparativo vs Mês anterior
  prevMonthGross: number;
  prevMonthExpenses: number;
  prevMonthNet: number;
  grossChangePercent: number;
  expensesChangePercent: number;
  netChangePercent: number;

  // Detalhamento por semana do mês
  weeklyBreakdown: {
    weekLabel: string;
    gross: number;
    expenses: number;
    net: number;
    km: number;
    hours: number;
    trips: number;
  }[];

  // Detalhamento de plataformas
  platformRows: {
    platform: PlatformType;
    gross: number;
    tips: number;
    total: number;
    trips: number;
    avgPerTrip: number;
    sharePercent: number;
  }[];

  // Despesas categorizadas
  expenseCategoryRows: {
    category: string;
    amount: number;
    sharePercent: number;
  }[];

  // Abastecimentos do mês
  fuelRecords: FuelRecord[];
  
  // Manutenções realizadas no mês
  maintenances: MaintenanceRecord[];

  // Detalhamento dos custos fixos do veículo
  fixedCostDetails: {
    insurance: number;
    ipva: number;
    licensing: number;
    financing: number;
    total: number;
  };
}

export const aggregateMonthlyData = (
  year: number,
  monthIndex: number,
  sessions: WorkSession[],
  earnings: EarningItem[],
  expenses: ExpenseItem[],
  fuelRecords: FuelRecord[],
  maintenances: MaintenanceRecord[],
  profile: UserProfile,
  vehicle: Vehicle
): MonthlyReportData => {
  const range = getMonthRange(year, monthIndex);
  const startTimeMs = range.startDate.getTime();
  const endTimeMs = range.endDate.getTime();

  // Filtrar sessões do mês
  const periodSessions = sessions.filter(s => {
    const t = new Date(s.startTime).getTime();
    return t >= startTimeMs && t <= endTimeMs;
  });

  const periodEarnings = earnings.filter(e => {
    const t = new Date(e.timestamp).getTime();
    return t >= startTimeMs && t <= endTimeMs;
  });

  const periodExpenses = expenses.filter(e => {
    const t = new Date(e.date + 'T12:00:00').getTime();
    return t >= startTimeMs && t <= endTimeMs;
  });

  const periodFuel = fuelRecords.filter(f => {
    const t = new Date(f.date + 'T12:00:00').getTime();
    return t >= startTimeMs && t <= endTimeMs;
  });

  const periodMaintenances = maintenances.filter(m => {
    const t = new Date(m.date + 'T12:00:00').getTime();
    return t >= startTimeMs && t <= endTimeMs;
  });

  // Ganhos brutos e gorjetas
  const sessionGross = periodSessions.reduce((sum, s) => sum + s.grossEarnings, 0);
  const sessionTips = periodSessions.reduce((sum, s) => sum + s.tips, 0);
  const earningsGross = periodEarnings.reduce((sum, e) => sum + e.amount, 0);
  const earningsTips = periodEarnings.reduce((sum, e) => sum + e.tip, 0);

  const grossTotal = Math.max(sessionGross, earningsGross);
  const tipsTotal = Math.max(sessionTips, earningsTips);
  const totalRevenue = grossTotal + tipsTotal;

  // Despesas diretas
  const sessionFuelExp = periodSessions.reduce((sum, s) => sum + s.fuelExpenses, 0);
  const directFuel = periodFuel.reduce((sum, f) => sum + f.totalAmount, 0);
  const totalFuelCost = Math.max(sessionFuelExp, directFuel);

  const sessionOtherExp = periodSessions.reduce((sum, s) => sum + s.otherExpenses, 0);
  const directOtherExp = periodExpenses.reduce((sum, e) => sum + e.amount, 0);
  const totalOtherExp = Math.max(sessionOtherExp, directOtherExp);

  const directExpenses = totalFuelCost + totalOtherExp;

  // Custos fixos do carro mensais
  const insuranceMonthly = vehicle.insuranceMonthly || 0;
  const ipvaMonthly = safeDivide(vehicle.ipvaAnnual || 0, 12);
  const licensingMonthly = safeDivide(vehicle.licensingAnnual || 0, 12);
  const financingMonthly = vehicle.financed ? (vehicle.financingInstallment || 0) : 0;
  const fixedCostsProportional = insuranceMonthly + ipvaMonthly + licensingMonthly + financingMonthly;

  const totalExpensesWithFixed = directExpenses + fixedCostsProportional;
  const grossOperatingProfit = totalRevenue - directExpenses;
  const realNetProfit = totalRevenue - totalExpensesWithFixed;
  const netMarginPercent = totalRevenue > 0 ? (realNetProfit / totalRevenue) * 100 : 0;

  // KM e Horas
  let totalKm = 0;
  let totalHours = 0;
  const workedDaysSet = new Set<string>();

  periodSessions.forEach(s => {
    workedDaysSet.add(s.startTime.split('T')[0]);
    if (s.startOdometer && s.endOdometer && s.endOdometer >= s.startOdometer) {
      totalKm += (s.endOdometer - s.startOdometer);
    }
    if (s.startTime && s.endTime) {
      const ms = new Date(s.endTime).getTime() - new Date(s.startTime).getTime();
      totalHours += Math.max(0, ms / (1000 * 60 * 60));
    }
  });

  periodEarnings.forEach(e => {
    workedDaysSet.add(e.timestamp.split('T')[0]);
  });

  const daysWorkedCount = workedDaysSet.size || Math.max(1, periodSessions.length);
  const totalTrips = Math.max(
    periodSessions.reduce((sum, s) => sum + s.tripsCount, 0),
    periodEarnings.reduce((sum, e) => sum + (e.tripsCount || 1), 0)
  );

  const grossPerHour = safeDivide(totalRevenue, totalHours);
  const netPerHour = safeDivide(realNetProfit, totalHours);
  const grossPerKm = safeDivide(totalRevenue, totalKm);
  const netPerKm = safeDivide(realNetProfit, totalKm);
  const avgDailyGross = safeDivide(totalRevenue, daysWorkedCount);
  const avgDailyNet = safeDivide(realNetProfit, daysWorkedCount);

  // Depreciação estimada
  const depRateKm = calcDepreciationPerKm(vehicle);
  const estimatedDepreciation = totalKm * depRateKm;
  const finalProfitAfterDepreciation = realNetProfit - estimatedDepreciation;

  const goalTarget = profile.monthlyGoal || 6000;
  const goalAchievementPercent = safeDivide(totalRevenue, goalTarget) * 100;

  // Comparativo com mês anterior
  const prevMonthDate = new Date(year, monthIndex - 1, 1);
  const prevYear = prevMonthDate.getFullYear();
  const prevMonthIdx = prevMonthDate.getMonth();
  const prevRange = getMonthRange(prevYear, prevMonthIdx);
  const prevStartMs = prevRange.startDate.getTime();
  const prevEndMs = prevRange.endDate.getTime();

  const prevSessions = sessions.filter(s => {
    const t = new Date(s.startTime).getTime();
    return t >= prevStartMs && t <= prevEndMs;
  });
  const prevExpensesList = expenses.filter(e => {
    const t = new Date(e.date + 'T12:00:00').getTime();
    return t >= prevStartMs && t <= prevEndMs;
  });
  const prevFuelList = fuelRecords.filter(f => {
    const t = new Date(f.date + 'T12:00:00').getTime();
    return t >= prevStartMs && t <= prevEndMs;
  });

  const prevGross = prevSessions.reduce((sum, s) => sum + s.grossEarnings + s.tips, 0);
  const prevFuelExp = Math.max(
    prevSessions.reduce((sum, s) => sum + s.fuelExpenses, 0),
    prevFuelList.reduce((sum, f) => sum + f.totalAmount, 0)
  );
  const prevOtherExp = Math.max(
    prevSessions.reduce((sum, s) => sum + s.otherExpenses, 0),
    prevExpensesList.reduce((sum, e) => sum + e.amount, 0)
  );
  const prevExpenses = prevFuelExp + prevOtherExp;
  const prevNet = prevGross - prevExpenses;

  const grossChangePercent = prevGross > 0 ? ((totalRevenue - prevGross) / prevGross) * 100 : 0;
  const expensesChangePercent = prevExpenses > 0 ? ((directExpenses - prevExpenses) / prevExpenses) * 100 : 0;
  const netChangePercent = prevNet > 0 ? ((grossOperatingProfit - prevNet) / prevNet) * 100 : 0;

  // Quebra por semana (Semanas 1 a 5)
  const weeklyBreakdown: MonthlyReportData['weeklyBreakdown'] = [];
  const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();
  const weekCount = Math.ceil(daysInMonth / 7);

  for (let w = 0; w < weekCount; w++) {
    const startDay = w * 7 + 1;
    const endDay = Math.min(daysInMonth, (w + 1) * 7);
    const wStart = new Date(year, monthIndex, startDay, 0, 0, 0);
    const wEnd = new Date(year, monthIndex, endDay, 23, 59, 59);

    const wSessions = periodSessions.filter(s => {
      const t = new Date(s.startTime).getTime();
      return t >= wStart.getTime() && t <= wEnd.getTime();
    });

    const wEarnings = periodEarnings.filter(e => {
      const t = new Date(e.timestamp).getTime();
      return t >= wStart.getTime() && t <= wEnd.getTime();
    });

    const wExpenses = periodExpenses.filter(e => {
      const t = new Date(e.date + 'T12:00:00').getTime();
      return t >= wStart.getTime() && t <= wEnd.getTime();
    });

    const wFuel = periodFuel.filter(f => {
      const t = new Date(f.date + 'T12:00:00').getTime();
      return t >= wStart.getTime() && t <= wEnd.getTime();
    });

    const wGross = Math.max(
      wSessions.reduce((sum, s) => sum + s.grossEarnings + s.tips, 0),
      wEarnings.reduce((sum, e) => sum + e.amount + e.tip, 0)
    );

    const wExp = Math.max(
      wSessions.reduce((sum, s) => sum + s.fuelExpenses + s.otherExpenses, 0),
      wFuel.reduce((sum, f) => sum + f.totalAmount, 0) + wExpenses.reduce((sum, e) => sum + e.amount, 0)
    );

    let wKm = 0;
    let wHours = 0;
    wSessions.forEach(s => {
      if (s.startOdometer && s.endOdometer && s.endOdometer >= s.startOdometer) {
        wKm += (s.endOdometer - s.startOdometer);
      }
      if (s.startTime && s.endTime) {
        const dur = new Date(s.endTime).getTime() - new Date(s.startTime).getTime();
        wHours += Math.max(0, dur / (1000 * 60 * 60));
      }
    });

    const wTrips = Math.max(
      wSessions.reduce((sum, s) => sum + s.tripsCount, 0),
      wEarnings.reduce((sum, e) => sum + (e.tripsCount || 1), 0)
    );

    weeklyBreakdown.push({
      weekLabel: `Semana ${w + 1} (${startDay.toString().padStart(2, '0')}/${(monthIndex + 1).toString().padStart(2, '0')} a ${endDay.toString().padStart(2, '0')}/${(monthIndex + 1).toString().padStart(2, '0')})`,
      gross: wGross,
      expenses: wExp,
      net: wGross - wExp,
      km: wKm,
      hours: wHours,
      trips: wTrips,
    });
  }

  // Detalhamento de plataformas
  const platMap: Record<PlatformType, { gross: number; tips: number; trips: number }> = {
    Uber: { gross: 0, tips: 0, trips: 0 },
    99: { gross: 0, tips: 0, trips: 0 },
    inDrive: { gross: 0, tips: 0, trips: 0 },
    Particular: { gross: 0, tips: 0, trips: 0 },
    Outro: { gross: 0, tips: 0, trips: 0 },
  };

  periodEarnings.forEach(e => {
    const p = e.platform || 'Outro';
    if (!platMap[p]) platMap[p] = { gross: 0, tips: 0, trips: 0 };
    platMap[p].gross += e.amount;
    platMap[p].tips += e.tip;
    platMap[p].trips += (e.tripsCount || 1);
  });

  if (periodEarnings.length === 0) {
    periodSessions.forEach(s => {
      if (s.platformEarnings) {
        Object.entries(s.platformEarnings).forEach(([plat, val]) => {
          if (val && val.amount > 0) {
            const p = plat as PlatformType;
            if (!platMap[p]) platMap[p] = { gross: 0, tips: 0, trips: 0 };
            platMap[p].gross += val.amount;
            platMap[p].trips += val.trips || 0;
          }
        });
      }
    });
  }

  const platTotal = Object.values(platMap).reduce((sum, p) => sum + p.gross + p.tips, 0) || totalRevenue;
  const platformRows = Object.entries(platMap)
    .map(([plat, data]) => {
      const tot = data.gross + data.tips;
      return {
        platform: plat as PlatformType,
        gross: data.gross,
        tips: data.tips,
        total: tot,
        trips: data.trips,
        avgPerTrip: safeDivide(tot, data.trips),
        sharePercent: platTotal > 0 ? (tot / platTotal) * 100 : 0,
      };
    })
    .filter(p => p.total > 0 || p.trips > 0)
    .sort((a, b) => b.total - a.total);

  // Despesas categorizadas
  const catMap: Record<string, number> = {};
  if (totalFuelCost > 0) catMap['Combustível'] = totalFuelCost;
  periodExpenses.forEach(e => {
    catMap[e.category] = (catMap[e.category] || 0) + e.amount;
  });

  const sumExp = Object.values(catMap).reduce((a, b) => a + b, 0);
  const expenseCategoryRows = Object.entries(catMap)
    .map(([cat, amt]) => ({
      category: cat,
      amount: amt,
      sharePercent: sumExp > 0 ? (amt / sumExp) * 100 : 0,
    }))
    .sort((a, b) => b.amount - a.amount);

  return {
    range,
    year,
    monthIndex,
    monthName: range.label,
    grossTotal,
    tipsTotal,
    directExpenses,
    fixedCostsProportional,
    totalExpensesWithFixed,
    grossOperatingProfit,
    realNetProfit,
    netMarginPercent,
    totalKm,
    totalHours,
    totalTrips,
    daysWorkedCount,
    grossPerHour,
    netPerHour,
    grossPerKm,
    netPerKm,
    avgDailyGross,
    avgDailyNet,
    estimatedDepreciation,
    finalProfitAfterDepreciation,
    goalTarget,
    goalAchievementPercent,
    prevMonthGross: prevGross,
    prevMonthExpenses: prevExpenses,
    prevMonthNet: prevNet,
    grossChangePercent,
    expensesChangePercent,
    netChangePercent,
    weeklyBreakdown,
    platformRows,
    expenseCategoryRows,
    fuelRecords: periodFuel,
    maintenances: periodMaintenances,
    fixedCostDetails: {
      insurance: insuranceMonthly,
      ipva: ipvaMonthly,
      licensing: licensingMonthly,
      financing: financingMonthly,
      total: fixedCostsProportional,
    },
  };
};

// ============================================================================
// GERADOR DE PDF SEMANAL (jspdf + jspdf-autotable)
// ============================================================================
export const generateWeeklyPDF = (
  data: WeeklyReportData,
  profile: UserProfile,
  vehicle: Vehicle,
  options: PDFExportOptions = {}
): jsPDF => {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 14;
  let currentY = margin;

  // --- CABEÇALHO PRINCIPAL ---
  // Barra superior colorida
  doc.setFillColor(16, 185, 129); // Emerald 500
  doc.rect(margin, currentY, pageWidth - (margin * 2), 22, 'F');

  // Título e Subtítulo
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.text('DRIVER PLANNER • RELATÓRIO FINANCEIRO SEMANAL', margin + 6, currentY + 9);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.text(`Período: ${data.range.label} | Emitido em: ${new Date().toLocaleDateString('pt-BR')} às ${new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`, margin + 6, currentY + 16);

  currentY += 26;

  // --- INFORMAÇÕES DO MOTORISTA & VEÍCULO ---
  doc.setFillColor(248, 250, 252); // Slate 50
  doc.setDrawColor(226, 232, 240); // Slate 200
  doc.roundedRect(margin, currentY, pageWidth - (margin * 2), 16, 2, 2, 'FD');

  doc.setTextColor(15, 23, 42); // Slate 900
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.text(`Motorista: ${profile.name || 'Motorista Parceiro'}`, margin + 4, currentY + 6);
  doc.text(`Veículo: ${vehicle.make} ${vehicle.model} (${vehicle.year})`, margin + 4, currentY + 12);

  doc.setFont('helvetica', 'normal');
  doc.setTextColor(71, 85, 105); // Slate 600
  doc.text(`Placa: ${vehicle.plate} | Combustível: ${vehicle.fuelType}`, pageWidth - margin - 75, currentY + 6);
  doc.text(`Odômetro Atual: ${vehicle.currentOdometer.toLocaleString('pt-BR')} km`, pageWidth - margin - 75, currentY + 12);

  currentY += 20;

  // --- CARDS DE RESUMO FINANCEIRO (KPIs) ---
  const kpiWidth = (pageWidth - (margin * 2) - 9) / 4;
  const kpiHeight = 18;

  // Card 1: Faturamento Bruto
  doc.setFillColor(240, 253, 244); // Emerald 50
  doc.setDrawColor(187, 247, 208);
  doc.roundedRect(margin, currentY, kpiWidth, kpiHeight, 2, 2, 'FD');
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(22, 101, 52);
  doc.text('FATURAMENTO BRUTO', margin + 3, currentY + 5);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text(formatCurrency(data.grossTotal + data.tipsTotal), margin + 3, currentY + 13);

  // Card 2: Despesas Totais
  const card2X = margin + kpiWidth + 3;
  doc.setFillColor(255, 241, 242); // Rose 50
  doc.setDrawColor(254, 205, 211);
  doc.roundedRect(card2X, currentY, kpiWidth, kpiHeight, 2, 2, 'FD');
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(159, 18, 57);
  doc.text('DESPESAS DIRETAS', card2X + 3, currentY + 5);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text(formatCurrency(data.totalExpenses), card2X + 3, currentY + 13);

  // Card 3: Lucro Líquido Real
  const card3X = card2X + kpiWidth + 3;
  doc.setFillColor(236, 253, 245); // Teal 50
  doc.setDrawColor(167, 243, 208);
  doc.roundedRect(card3X, currentY, kpiWidth, kpiHeight, 2, 2, 'FD');
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(17, 94, 89);
  doc.text('LUCRO LÍQUIDO REAL', card3X + 3, currentY + 5);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text(formatCurrency(data.netProfit), card3X + 3, currentY + 13);

  // Card 4: Margem & Eficiência
  const card4X = card3X + kpiWidth + 3;
  doc.setFillColor(241, 245, 249); // Slate 100
  doc.setDrawColor(203, 213, 225);
  doc.roundedRect(card4X, currentY, kpiWidth, kpiHeight, 2, 2, 'FD');
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(51, 65, 85);
  doc.text('MARGEM LÍQUIDA', card4X + 3, currentY + 5);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text(`${data.netMarginPercent.toFixed(1)}%`, card4X + 3, currentY + 13);

  currentY += kpiHeight + 4;

  // --- SEGUNDA LINHA DE MÉTRICAS OPERACIONAIS ---
  doc.setFillColor(255, 255, 255);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(margin, currentY, pageWidth - (margin * 2), 12, 2, 2, 'FD');

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(71, 85, 105);

  const colWidth = (pageWidth - (margin * 2)) / 5;
  doc.text(`KM Rodados:`, margin + 3, currentY + 5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text(formatKm(data.totalKm), margin + 3, currentY + 9.5);

  doc.setFont('helvetica', 'normal');
  doc.setTextColor(71, 85, 105);
  doc.text(`Horas Turno:`, margin + colWidth + 3, currentY + 5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text(formatHours(data.totalHours), margin + colWidth + 3, currentY + 9.5);

  doc.setFont('helvetica', 'normal');
  doc.setTextColor(71, 85, 105);
  doc.text(`Corridas Feitas:`, margin + (colWidth * 2) + 3, currentY + 5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text(`${data.totalTrips} viagens`, margin + (colWidth * 2) + 3, currentY + 9.5);

  doc.setFont('helvetica', 'normal');
  doc.setTextColor(71, 85, 105);
  doc.text(`Média R$/Hora:`, margin + (colWidth * 3) + 3, currentY + 5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(22, 101, 52);
  doc.text(formatCurrency(data.grossPerHour) + '/h', margin + (colWidth * 3) + 3, currentY + 9.5);

  doc.setFont('helvetica', 'normal');
  doc.setTextColor(71, 85, 105);
  doc.text(`Média R$/KM:`, margin + (colWidth * 4) + 3, currentY + 5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(22, 101, 52);
  doc.text(formatCurrency(data.grossPerKm) + '/km', margin + (colWidth * 4) + 3, currentY + 9.5);

  currentY += 16;

  // --- TABELA 1: DETALHAMENTO DIÁRIO DA SEMANA ---
  doc.setTextColor(15, 23, 42);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text('1. DESEMPENHO DIÁRIO NA SEMANA (SEGUNDA A DOMINGO)', margin, currentY);
  currentY += 3;

  const dailyTableBody = data.dailyRows.map(row => [
    `${row.dayName}\n${row.dateStr.slice(0, 5)}`,
    formatCurrency(row.gross + row.tips),
    formatCurrency(row.fuelExp),
    formatCurrency(row.otherExp),
    formatCurrency(row.totalExp),
    formatCurrency(row.net),
    formatKm(row.km),
    formatHours(row.hours),
    `${row.trips}`,
    formatCurrency(row.rateKm) + '/km',
    formatCurrency(row.rateHour) + '/h',
  ]);

  // Linha de Totalizador
  dailyTableBody.push([
    'TOTAL SEMANAL',
    formatCurrency(data.grossTotal + data.tipsTotal),
    formatCurrency(data.fuelExpenses),
    formatCurrency(data.otherExpenses),
    formatCurrency(data.totalExpenses),
    formatCurrency(data.netProfit),
    formatKm(data.totalKm),
    formatHours(data.totalHours),
    `${data.totalTrips}`,
    formatCurrency(data.grossPerKm) + '/km',
    formatCurrency(data.grossPerHour) + '/h',
  ]);

  autoTable(doc, {
    startY: currentY,
    margin: { left: margin, right: margin },
    head: [[
      'Dia / Data',
      'Faturamento',
      'Combustível',
      'Outros',
      'Total Desp.',
      'Lucro Líq.',
      'KM',
      'Horas',
      'Corridas',
      'R$/KM',
      'R$/Hora',
    ]],
    body: dailyTableBody,
    theme: 'grid',
    headStyles: {
      fillColor: [15, 23, 42],
      textColor: [255, 255, 255],
      fontSize: 7.5,
      fontStyle: 'bold',
      halign: 'center',
    },
    bodyStyles: {
      fontSize: 7,
      textColor: [15, 23, 42],
      halign: 'center',
      cellPadding: 2,
    },
    columnStyles: {
      0: { halign: 'left', fontStyle: 'bold', cellWidth: 20 },
      1: { halign: 'right', fontStyle: 'bold', textColor: [22, 101, 52] },
      2: { halign: 'right', textColor: [159, 18, 57] },
      3: { halign: 'right', textColor: [159, 18, 57] },
      4: { halign: 'right', fontStyle: 'bold', textColor: [159, 18, 57] },
      5: { halign: 'right', fontStyle: 'bold', textColor: [15, 23, 42] },
      6: { halign: 'center' },
      7: { halign: 'center' },
      8: { halign: 'center' },
      9: { halign: 'right' },
      10: { halign: 'right' },
    },
    didParseCell: function(dataCell) {
      if (dataCell.row.index === dailyTableBody.length - 1) {
        dataCell.cell.styles.fontStyle = 'bold';
        dataCell.cell.styles.fillColor = [241, 245, 249];
      }
    },
  });

  // Obter posição Y após a tabela diária
  // @ts-ignore
  currentY = doc.lastAutoTable.finalY + 8;

  // --- SEÇÃO 2: PLATAFORMAS & DESPESAS (DUAS TABELAS LADO A LADO OU SEQUENCIAIS) ---
  if (currentY > pageHeight - 65) {
    doc.addPage();
    currentY = margin;
  }

  doc.setTextColor(15, 23, 42);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text('2. PARTICIPAÇÃO POR APLICATIVO & CATEGORIAS DE DESPESAS', margin, currentY);
  currentY += 4;

  const halfWidth = (pageWidth - (margin * 2) - 6) / 2;

  // Tabela Aplicativos
  const platTableBody = data.platformRows.length > 0
    ? data.platformRows.map(p => [
        p.platform,
        formatCurrency(p.total),
        `${p.trips}`,
        formatCurrency(p.avgPerTrip),
        `${p.sharePercent.toFixed(1)}%`,
      ])
    : [['Sem registros', 'R$ 0,00', '0', 'R$ 0,00', '0%']];

  autoTable(doc, {
    startY: currentY,
    margin: { left: margin, right: margin + halfWidth + 6 },
    head: [['Aplicativo', 'Total', 'Corridas', 'Média/Corr.', 'Share']],
    body: platTableBody,
    theme: 'grid',
    headStyles: {
      fillColor: [16, 185, 129],
      textColor: [255, 255, 255],
      fontSize: 7.5,
      fontStyle: 'bold',
      halign: 'center',
    },
    bodyStyles: {
      fontSize: 7,
      textColor: [15, 23, 42],
      halign: 'center',
      cellPadding: 2,
    },
    columnStyles: {
      0: { halign: 'left', fontStyle: 'bold' },
      1: { halign: 'right', fontStyle: 'bold' },
      2: { halign: 'center' },
      3: { halign: 'right' },
      4: { halign: 'center', fontStyle: 'bold' },
    },
  });

  // Tabela Despesas por Categoria (ao lado)
  const expTableBody = data.expenseCategoryRows.length > 0
    ? data.expenseCategoryRows.map(e => [
        e.category,
        formatCurrency(e.amount),
        `${e.sharePercent.toFixed(1)}%`,
      ])
    : [['Sem despesas', 'R$ 0,00', '0%']];

  autoTable(doc, {
    startY: currentY,
    margin: { left: margin + halfWidth + 6, right: margin },
    head: [['Categoria de Gasto', 'Valor', '% do Total']],
    body: expTableBody,
    theme: 'grid',
    headStyles: {
      fillColor: [225, 29, 72],
      textColor: [255, 255, 255],
      fontSize: 7.5,
      fontStyle: 'bold',
      halign: 'center',
    },
    bodyStyles: {
      fontSize: 7,
      textColor: [15, 23, 42],
      halign: 'center',
      cellPadding: 2,
    },
    columnStyles: {
      0: { halign: 'left', fontStyle: 'bold' },
      1: { halign: 'right', fontStyle: 'bold' },
      2: { halign: 'center', fontStyle: 'bold' },
    },
  });

  // @ts-ignore
  currentY = Math.max(doc.lastAutoTable.finalY, currentY + 35) + 6;

  // --- SEÇÃO 3: ABASTECIMENTOS DA SEMANA SE HOUVER ---
  if (data.fuelRecords.length > 0) {
    if (currentY > pageHeight - 45) {
      doc.addPage();
      currentY = margin;
    }

    doc.setTextColor(15, 23, 42);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.text('3. REGISTROS DE ABASTECIMENTO DA SEMANA', margin, currentY);
    currentY += 3;

    const fuelTableBody = data.fuelRecords.map(f => [
      formatDateBR(f.date),
      f.stationName || 'Posto de Combustível',
      f.fuelType || vehicle.fuelType,
      `${f.liters.toFixed(1)} L`,
      formatCurrency(f.pricePerLiter),
      formatCurrency(f.totalAmount),
      f.odometer ? `${f.odometer.toLocaleString('pt-BR')} km` : '-',
    ]);

    autoTable(doc, {
      startY: currentY,
      margin: { left: margin, right: margin },
      head: [['Data', 'Posto / Estabelecimento', 'Combustível', 'Volume', 'Preço/L', 'Valor Total', 'Odômetro']],
      body: fuelTableBody,
      theme: 'grid',
      headStyles: {
        fillColor: [71, 85, 105],
        textColor: [255, 255, 255],
        fontSize: 7.5,
        fontStyle: 'bold',
        halign: 'center',
      },
      bodyStyles: {
        fontSize: 7,
        textColor: [15, 23, 42],
        halign: 'center',
        cellPadding: 2,
      },
      columnStyles: {
        0: { halign: 'center' },
        1: { halign: 'left', fontStyle: 'bold' },
        2: { halign: 'center' },
        3: { halign: 'center' },
        4: { halign: 'right' },
        5: { halign: 'right', fontStyle: 'bold' },
        6: { halign: 'center' },
      },
    });

    // @ts-ignore
    currentY = doc.lastAutoTable.finalY + 6;
  }

  // --- SEÇÃO DE META & CONCLUSÃO ---
  if (currentY > pageHeight - 35) {
    doc.addPage();
    currentY = margin;
  }

  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(margin, currentY, pageWidth - (margin * 2), 16, 2, 2, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(15, 23, 42);
  doc.text('Progresso da Meta Semanal:', margin + 4, currentY + 6);

  doc.setFont('helvetica', 'normal');
  doc.setTextColor(71, 85, 105);
  doc.text(`Meta configurada: ${formatCurrency(data.goalTarget)} | Realizado: ${formatCurrency(data.grossTotal + data.tipsTotal)} (${data.goalAchievementPercent.toFixed(1)}% atingido)`, margin + 4, currentY + 11.5);

  const goalDiff = (data.grossTotal + data.tipsTotal) - data.goalTarget;
  doc.setFont('helvetica', 'bold');
  if (goalDiff >= 0) {
    doc.setTextColor(22, 101, 52);
    doc.text(`Superou a meta em +${formatCurrency(goalDiff)}! Parabéns pelo resultado!`, pageWidth - margin - 90, currentY + 11.5);
  } else {
    doc.setTextColor(225, 29, 72);
    doc.text(`Faltou ${formatCurrency(Math.abs(goalDiff))} para a meta semanal.`, pageWidth - margin - 75, currentY + 11.5);
  }

  // Rodapé em todas as páginas
  const totalPages = doc.internal.pages.length - 1;
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(148, 163, 184); // Slate 400
    doc.text(
      `Driver Planner • Documento gerado automaticamente para gestão financeira • Página ${i} de ${totalPages}`,
      pageWidth / 2,
      pageHeight - 6,
      { align: 'center' }
    );
  }

  return doc;
};

// ============================================================================
// GERADOR DE PDF MENSAL (jspdf + jspdf-autotable)
// ============================================================================
export const generateMonthlyPDF = (
  data: MonthlyReportData,
  profile: UserProfile,
  vehicle: Vehicle,
  options: PDFExportOptions = {}
): jsPDF => {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 14;
  let currentY = margin;

  // --- CABEÇALHO PRINCIPAL DO MÊS ---
  doc.setFillColor(15, 23, 42); // Slate 900
  doc.rect(margin, currentY, pageWidth - (margin * 2), 22, 'F');

  // Detalhe verde lateral
  doc.setFillColor(16, 185, 129);
  doc.rect(margin, currentY, 3, 22, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.text('DRIVER PLANNER • RELATÓRIO FINANCEIRO MENSAL', margin + 7, currentY + 9);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(203, 213, 225);
  doc.text(`Mês de Referência: ${data.monthName} | Emitido em: ${new Date().toLocaleDateString('pt-BR')} às ${new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`, margin + 7, currentY + 16);

  currentY += 26;

  // --- INFORMAÇÕES DO MOTORISTA & VEÍCULO ---
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(margin, currentY, pageWidth - (margin * 2), 16, 2, 2, 'FD');

  doc.setTextColor(15, 23, 42);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.text(`Motorista: ${profile.name || 'Motorista Parceiro'}`, margin + 4, currentY + 6);
  doc.text(`Veículo: ${vehicle.make} ${vehicle.model} (${vehicle.year})`, margin + 4, currentY + 12);

  doc.setFont('helvetica', 'normal');
  doc.setTextColor(71, 85, 105);
  doc.text(`Placa: ${vehicle.plate} | Combustível: ${vehicle.fuelType} | Média: ${vehicle.avgConsumption} km/L`, pageWidth - margin - 90, currentY + 6);
  doc.text(`Odômetro Atual: ${vehicle.currentOdometer.toLocaleString('pt-BR')} km | Dias Trabalhados: ${data.daysWorkedCount} dias`, pageWidth - margin - 90, currentY + 12);

  currentY += 20;

  // --- CARDS PRINCIPAIS DE CONSOLIDAÇÃO FINANCEIRA ---
  const kpiWidth = (pageWidth - (margin * 2) - 9) / 4;
  const kpiHeight = 18;

  // 1. Faturamento Total
  doc.setFillColor(240, 253, 244);
  doc.setDrawColor(187, 247, 208);
  doc.roundedRect(margin, currentY, kpiWidth, kpiHeight, 2, 2, 'FD');
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(22, 101, 52);
  doc.text('FATURAMENTO TOTAL', margin + 3, currentY + 5);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text(formatCurrency(data.grossTotal + data.tipsTotal), margin + 3, currentY + 13);

  // 2. Despesas Diretas + Fixas
  const c2X = margin + kpiWidth + 3;
  doc.setFillColor(255, 241, 242);
  doc.setDrawColor(254, 205, 211);
  doc.roundedRect(c2X, currentY, kpiWidth, kpiHeight, 2, 2, 'FD');
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(159, 18, 57);
  doc.text('DESPESAS (DIR. + FIXAS)', c2X + 3, currentY + 5);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text(formatCurrency(data.totalExpensesWithFixed), c2X + 3, currentY + 13);

  // 3. Lucro Líquido Real Final
  const c3X = c2X + kpiWidth + 3;
  doc.setFillColor(236, 253, 245);
  doc.setDrawColor(167, 243, 208);
  doc.roundedRect(c3X, currentY, kpiWidth, kpiHeight, 2, 2, 'FD');
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(17, 94, 89);
  doc.text('LUCRO LÍQUIDO REAL', c3X + 3, currentY + 5);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text(formatCurrency(data.realNetProfit), c3X + 3, currentY + 13);

  // 4. Margem Operacional %
  const c4X = c3X + kpiWidth + 3;
  doc.setFillColor(241, 245, 249);
  doc.setDrawColor(203, 213, 225);
  doc.roundedRect(c4X, currentY, kpiWidth, kpiHeight, 2, 2, 'FD');
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(51, 65, 85);
  doc.text('MARGEM LÍQUIDA', c4X + 3, currentY + 5);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text(`${data.netMarginPercent.toFixed(1)}%`, c4X + 3, currentY + 13);

  currentY += kpiHeight + 4;

  // --- SEGUNDA LINHA: MÉTRICAS COMPLEMENTARES ---
  doc.setFillColor(255, 255, 255);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(margin, currentY, pageWidth - (margin * 2), 12, 2, 2, 'FD');

  const colW = (pageWidth - (margin * 2)) / 6;
  
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(71, 85, 105);
  doc.text('KM Mensal:', margin + 2, currentY + 4.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text(formatKm(data.totalKm), margin + 2, currentY + 9.5);

  doc.setFont('helvetica', 'normal');
  doc.setTextColor(71, 85, 105);
  doc.text('Horas Turno:', margin + colW + 2, currentY + 4.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text(formatHours(data.totalHours), margin + colW + 2, currentY + 9.5);

  doc.setFont('helvetica', 'normal');
  doc.setTextColor(71, 85, 105);
  doc.text('Média Diária:', margin + (colW * 2) + 2, currentY + 4.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(22, 101, 52);
  doc.text(formatCurrency(data.avgDailyGross) + '/dia', margin + (colW * 2) + 2, currentY + 9.5);

  doc.setFont('helvetica', 'normal');
  doc.setTextColor(71, 85, 105);
  doc.text('Média R$/KM:', margin + (colW * 3) + 2, currentY + 4.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(22, 101, 52);
  doc.text(formatCurrency(data.grossPerKm) + '/km', margin + (colW * 3) + 2, currentY + 9.5);

  doc.setFont('helvetica', 'normal');
  doc.setTextColor(71, 85, 105);
  doc.text('Média R$/Hora:', margin + (colW * 4) + 2, currentY + 4.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(22, 101, 52);
  doc.text(formatCurrency(data.grossPerHour) + '/h', margin + (colW * 4) + 2, currentY + 9.5);

  doc.setFont('helvetica', 'normal');
  doc.setTextColor(71, 85, 105);
  doc.text('Total Corridas:', margin + (colW * 5) + 2, currentY + 4.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text(`${data.totalTrips} viagens`, margin + (colW * 5) + 2, currentY + 9.5);

  currentY += 16;

  // --- COMPARATIVO MENSAL VS MÊS ANTERIOR (BANNER) ---
  doc.setFillColor(241, 245, 249);
  doc.setDrawColor(203, 213, 225);
  doc.roundedRect(margin, currentY, pageWidth - (margin * 2), 10, 2, 2, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(15, 23, 42);
  doc.text('Comparativo vs Mês Anterior:', margin + 4, currentY + 6.5);

  doc.setFont('helvetica', 'normal');
  doc.setTextColor(71, 85, 105);
  const grossDiffStr = data.grossChangePercent >= 0 ? `+${data.grossChangePercent.toFixed(1)}%` : `${data.grossChangePercent.toFixed(1)}%`;
  const netDiffStr = data.netChangePercent >= 0 ? `+${data.netChangePercent.toFixed(1)}%` : `${data.netChangePercent.toFixed(1)}%`;

  doc.text(
    `Faturamento: ${grossDiffStr} | Despesas: ${data.expensesChangePercent.toFixed(1)}% | Lucro Operacional: ${netDiffStr} (Mês Anterior: ${formatCurrency(data.prevMonthGross)})`,
    margin + 48,
    currentY + 6.5
  );

  currentY += 14;

  // --- TABELA 1: DESEMPENHO SEMANAL DO MÊS ---
  doc.setTextColor(15, 23, 42);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text('1. CONSOLIDAÇÃO POR SEMANAS DO MÊS', margin, currentY);
  currentY += 3;

  const weeklyTableBody = data.weeklyBreakdown.map(w => [
    w.weekLabel,
    formatCurrency(w.gross),
    formatCurrency(w.expenses),
    formatCurrency(w.net),
    formatKm(w.km),
    formatHours(w.hours),
    `${w.trips}`,
    formatCurrency(safeDivide(w.gross, w.km)) + '/km',
    formatCurrency(safeDivide(w.gross, w.hours)) + '/h',
  ]);

  weeklyTableBody.push([
    'TOTAL MENSAL CONSOLIDADO',
    formatCurrency(data.grossTotal + data.tipsTotal),
    formatCurrency(data.directExpenses),
    formatCurrency(data.grossOperatingProfit),
    formatKm(data.totalKm),
    formatHours(data.totalHours),
    `${data.totalTrips}`,
    formatCurrency(data.grossPerKm) + '/km',
    formatCurrency(data.grossPerHour) + '/h',
  ]);

  autoTable(doc, {
    startY: currentY,
    margin: { left: margin, right: margin },
    head: [[
      'Semana / Período',
      'Faturamento Bruto',
      'Despesas Diretas',
      'Lucro Operacional',
      'KM',
      'Horas',
      'Corridas',
      'R$/KM',
      'R$/Hora',
    ]],
    body: weeklyTableBody,
    theme: 'grid',
    headStyles: {
      fillColor: [15, 23, 42],
      textColor: [255, 255, 255],
      fontSize: 7.5,
      fontStyle: 'bold',
      halign: 'center',
    },
    bodyStyles: {
      fontSize: 7.5,
      textColor: [15, 23, 42],
      halign: 'center',
      cellPadding: 2,
    },
    columnStyles: {
      0: { halign: 'left', fontStyle: 'bold', cellWidth: 38 },
      1: { halign: 'right', fontStyle: 'bold', textColor: [22, 101, 52] },
      2: { halign: 'right', textColor: [159, 18, 57] },
      3: { halign: 'right', fontStyle: 'bold', textColor: [15, 23, 42] },
      4: { halign: 'center' },
      5: { halign: 'center' },
      6: { halign: 'center' },
      7: { halign: 'right' },
      8: { halign: 'right' },
    },
    didParseCell: function(dataCell) {
      if (dataCell.row.index === weeklyTableBody.length - 1) {
        dataCell.cell.styles.fontStyle = 'bold';
        dataCell.cell.styles.fillColor = [241, 245, 249];
      }
    },
  });

  // @ts-ignore
  currentY = doc.lastAutoTable.finalY + 8;

  // --- SEÇÃO 2: PLATAFORMAS & CUSTOS FIXOS DO VEÍCULO ---
  if (currentY > pageHeight - 75) {
    doc.addPage();
    currentY = margin;
  }

  doc.setTextColor(15, 23, 42);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text('2. PARTICIPAÇÃO POR APLICATIVO & CUSTOS DO VEÍCULO NO MÊS', margin, currentY);
  currentY += 4;

  const halfW = (pageWidth - (margin * 2) - 6) / 2;

  // Tabela Aplicativos
  const platTableBody = data.platformRows.length > 0
    ? data.platformRows.map(p => [
        p.platform,
        formatCurrency(p.total),
        `${p.trips}`,
        formatCurrency(p.avgPerTrip),
        `${p.sharePercent.toFixed(1)}%`,
      ])
    : [['Sem registros', 'R$ 0,00', '0', 'R$ 0,00', '0%']];

  autoTable(doc, {
    startY: currentY,
    margin: { left: margin, right: margin + halfW + 6 },
    head: [['Aplicativo', 'Faturamento', 'Viagens', 'Média/Viagem', 'Share']],
    body: platTableBody,
    theme: 'grid',
    headStyles: {
      fillColor: [16, 185, 129],
      textColor: [255, 255, 255],
      fontSize: 7.5,
      fontStyle: 'bold',
      halign: 'center',
    },
    bodyStyles: {
      fontSize: 7,
      textColor: [15, 23, 42],
      halign: 'center',
      cellPadding: 2,
    },
    columnStyles: {
      0: { halign: 'left', fontStyle: 'bold' },
      1: { halign: 'right', fontStyle: 'bold' },
      2: { halign: 'center' },
      3: { halign: 'right' },
      4: { halign: 'center', fontStyle: 'bold' },
    },
  });

  // Tabela Custos Fixos e Proporcionais do Carro
  const fixedCostBody = [
    ['Seguro Veicular (Mensal)', formatCurrency(data.fixedCostDetails.insurance)],
    ['IPVA Proporcional (Mensal)', formatCurrency(data.fixedCostDetails.ipva)],
    ['Licenciamento Proporcional', formatCurrency(data.fixedCostDetails.licensing)],
    ['Parcela Financiamento', formatCurrency(data.fixedCostDetails.financing)],
    ['TOTAL CUSTOS FIXOS DO MÊS', formatCurrency(data.fixedCostDetails.total)],
  ];

  autoTable(doc, {
    startY: currentY,
    margin: { left: margin + halfW + 6, right: margin },
    head: [['Custo Fixo do Veículo', 'Valor Mensal']],
    body: fixedCostBody,
    theme: 'grid',
    headStyles: {
      fillColor: [51, 65, 85],
      textColor: [255, 255, 255],
      fontSize: 7.5,
      fontStyle: 'bold',
      halign: 'center',
    },
    bodyStyles: {
      fontSize: 7,
      textColor: [15, 23, 42],
      halign: 'left',
      cellPadding: 2,
    },
    columnStyles: {
      0: { halign: 'left', fontStyle: 'normal' },
      1: { halign: 'right', fontStyle: 'bold' },
    },
    didParseCell: function(dataCell) {
      if (dataCell.row.index === fixedCostBody.length - 1) {
        dataCell.cell.styles.fontStyle = 'bold';
        dataCell.cell.styles.fillColor = [241, 245, 249];
      }
    },
  });

  // @ts-ignore
  currentY = Math.max(doc.lastAutoTable.finalY, currentY + 36) + 6;

  // --- SEÇÃO 3: DESPESAS POR CATEGORIA DO MÊS ---
  if (currentY > pageHeight - 50) {
    doc.addPage();
    currentY = margin;
  }

  doc.setTextColor(15, 23, 42);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text('3. DESPESAS DIRETAS OPERACIONAIS POR CATEGORIA', margin, currentY);
  currentY += 3;

  const expTableBody = data.expenseCategoryRows.length > 0
    ? data.expenseCategoryRows.map(e => [
        e.category,
        formatCurrency(e.amount),
        `${e.sharePercent.toFixed(1)}%`,
      ])
    : [['Sem despesas operacionais', 'R$ 0,00', '0%']];

  autoTable(doc, {
    startY: currentY,
    margin: { left: margin, right: margin },
    head: [['Categoria de Despesa', 'Valor Total no Mês', 'Participação no Custo Operacional']],
    body: expTableBody,
    theme: 'grid',
    headStyles: {
      fillColor: [225, 29, 72],
      textColor: [255, 255, 255],
      fontSize: 7.5,
      fontStyle: 'bold',
      halign: 'center',
    },
    bodyStyles: {
      fontSize: 7.5,
      textColor: [15, 23, 42],
      halign: 'center',
      cellPadding: 2,
    },
    columnStyles: {
      0: { halign: 'left', fontStyle: 'bold' },
      1: { halign: 'right', fontStyle: 'bold' },
      2: { halign: 'center', fontStyle: 'bold' },
    },
  });

  // @ts-ignore
  currentY = doc.lastAutoTable.finalY + 6;

  // --- SEÇÃO 4: MANUTENÇÕES DO MÊS SE HOUVER ---
  if (data.maintenances.length > 0) {
    if (currentY > pageHeight - 45) {
      doc.addPage();
      currentY = margin;
    }

    doc.setTextColor(15, 23, 42);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.text('4. MANUTENÇÕES & REVISÕES EXECUTADAS NO MÊS', margin, currentY);
    currentY += 3;

    const maintTableBody = data.maintenances.map(m => [
      formatDateBR(m.date),
      m.category,
      m.description,
      formatCurrency(m.amount),
      m.odometer ? `${m.odometer.toLocaleString('pt-BR')} km` : '-',
      m.nextOdometer ? `${m.nextOdometer.toLocaleString('pt-BR')} km` : '-',
    ]);

    autoTable(doc, {
      startY: currentY,
      margin: { left: margin, right: margin },
      head: [['Data', 'Tipo de Serviço', 'Descrição', 'Valor', 'Odômetro', 'Próxima Revisão']],
      body: maintTableBody,
      theme: 'grid',
      headStyles: {
        fillColor: [71, 85, 105],
        textColor: [255, 255, 255],
        fontSize: 7.5,
        fontStyle: 'bold',
        halign: 'center',
      },
      bodyStyles: {
        fontSize: 7,
        textColor: [15, 23, 42],
        halign: 'center',
        cellPadding: 2,
      },
      columnStyles: {
        0: { halign: 'center' },
        1: { halign: 'left', fontStyle: 'bold' },
        2: { halign: 'left' },
        3: { halign: 'right', fontStyle: 'bold' },
        4: { halign: 'center' },
        5: { halign: 'center' },
      },
    });

    // @ts-ignore
    currentY = doc.lastAutoTable.finalY + 6;
  }

  // --- SEÇÃO DE DRE RESUMIDO FINAL & DEPRECIAÇÃO ---
  if (currentY > pageHeight - 45) {
    doc.addPage();
    currentY = margin;
  }

  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(203, 213, 225);
  doc.roundedRect(margin, currentY, pageWidth - (margin * 2), 22, 2, 2, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(15, 23, 42);
  doc.text('DRE OPERACIONAL & RESERVA DE MANUTENÇÃO / DEPRECIAÇÃO', margin + 4, currentY + 6);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(71, 85, 105);
  doc.text(
    `Faturamento Bruto: ${formatCurrency(data.grossTotal + data.tipsTotal)} (-) Despesas Operacionais: ${formatCurrency(data.directExpenses)} = Lucro Operacional: ${formatCurrency(data.grossOperatingProfit)}`,
    margin + 4,
    currentY + 11
  );
  doc.text(
    `(-) Custos Fixos do Veículo (Seguro/IPVA/Financ.): ${formatCurrency(data.fixedCostsProportional)} = Lucro Líquido Real: ${formatCurrency(data.realNetProfit)} (${data.netMarginPercent.toFixed(1)}% margem)`,
    margin + 4,
    currentY + 15.5
  );
  doc.text(
    `(-) Desgaste/Depreciação Estimada (${formatKm(data.totalKm)} rodados): ${formatCurrency(data.estimatedDepreciation)} • Lucro Final Contábil: ${formatCurrency(data.finalProfitAfterDepreciation)}`,
    margin + 4,
    currentY + 20
  );

  // Rodapé em todas as páginas
  const totalPages = doc.internal.pages.length - 1;
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(148, 163, 184);
    doc.text(
      `Driver Planner • Relatório Contábil e Financeiro Mensal • Página ${i} de ${totalPages}`,
      pageWidth / 2,
      pageHeight - 6,
      { align: 'center' }
    );
  }

  return doc;
};
