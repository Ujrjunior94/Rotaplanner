import React, { useState, useMemo } from 'react';
import { useDriver } from '../context/DriverContext';
import { formatCurrency, formatKm, safeDivide } from '../utils/calc';
import { findVehicleSpecs } from '../data/vehicleDatabase';
import {
  Calculator,
  Fuel,
  Wrench,
  TrendingUp,
  Percent,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Sliders,
  DollarSign,
  ArrowRight,
  Info,
  Car,
  ChevronDown,
  ChevronUp,
  Sparkles,
  ShieldCheck,
  Zap,
  HelpCircle,
  Clock,
  RefreshCw,
} from 'lucide-react';

interface ProfitabilitySimulatorCardProps {
  onNavigateTab?: (tab: string) => void;
}

export const ProfitabilitySimulatorCard: React.FC<ProfitabilitySimulatorCardProps> = () => {
  const { vehicle, profile, sessions, expenses } = useDriver();

  // Histórico real do motorista
  const historicalAverages = useMemo(() => {
    if (sessions.length === 0) {
      return {
        avgRatePerKm: 2.25,
        avgDailyKm: 140,
        avgMonthlyKm: 3200,
        hasHistory: false,
      };
    }

    let totalGross = 0;
    let totalKm = 0;

    sessions.forEach(s => {
      totalGross += s.grossEarnings + s.tips;
      if (s.endOdometer && s.startOdometer && s.endOdometer > s.startOdometer) {
        totalKm += s.endOdometer - s.startOdometer;
      }
    });

    const avgRatePerKm = totalKm > 0 ? safeDivide(totalGross, totalKm) : 2.25;
    const avgDailyKm = Math.round(safeDivide(totalKm, sessions.length)) || 140;

    return {
      avgRatePerKm: Number(avgRatePerKm.toFixed(2)),
      avgDailyKm,
      avgMonthlyKm: avgDailyKm * 24, // 24 dias úteis no mês
      hasHistory: totalKm > 0,
    };
  }, [sessions]);

  // Custo de manutenção histórico real ou padrão
  const historicalMaintenanceCostKm = useMemo(() => {
    let totalMaintExpense = 0;
    let totalOdometerKm = 0;

    expenses.forEach(e => {
      if (['Manutenção', 'Pneus', 'Óleo', 'Freios'].includes(e.category)) {
        totalMaintExpense += e.amount;
      }
    });

    sessions.forEach(s => {
      if (s.endOdometer && s.startOdometer && s.endOdometer > s.startOdometer) {
        totalOdometerKm += s.endOdometer - s.startOdometer;
      }
    });

    if (totalOdometerKm > 200 && totalMaintExpense > 0) {
      return Number(safeDivide(totalMaintExpense, totalOdometerKm).toFixed(3));
    }
    return 0.18; // R$ 0,18/km padrão de mercado
  }, [expenses, sessions]);

  // Modo de cálculo: Por Taxa (R$/km) ou Por Corrida Completa (Valor + KM)
  const [calcMode, setCalcMode] = useState<'rate' | 'trip'>('rate');

  // Valores da Simulação
  const [grossRatePerKm, setGrossRatePerKm] = useState<number>(2.30);
  const [tripGrossAmount, setTripGrossAmount] = useState<number>(32.00);
  const [tripDistanceKm, setTripDistanceKm] = useState<number>(14.0);
  const [tripDurationMin, setTripDurationMin] = useState<number>(28);

  // Parâmetros de Combustível
  const [selectedFuelType, setSelectedFuelType] = useState<string>(vehicle.fuelType === 'Etanol' ? 'Etanol' : 'Gasolina');
  const [fuelPrice, setFuelPrice] = useState<number>(profile.gasPriceReference || 5.89);
  const [vehicleConsumption, setVehicleConsumption] = useState<number>(vehicle.avgConsumption || 11.5);

  // Parâmetros de Manutenção e Desgaste (R$/km)
  const [oilFilterCostKm, setOilFilterCostKm] = useState<number>(0.04);
  const [tiresCostKm, setTiresCostKm] = useState<number>(0.05);
  const [brakesMechanicsCostKm, setBrakesMechanicsCostKm] = useState<number>(0.06);
  const [depreciationCostKm, setDepreciationCostKm] = useState<number>(0.07);
  const [showDetailedMaintenance, setShowDetailedMaintenance] = useState<boolean>(false);

  // Fator de KM Vazio / Deslocamento (Deadhead %)
  const [deadheadPercent, setDeadheadPercent] = useState<number>(15); // 15% de km morto padrão

  // Custos Fixos (Seguro/IPVA/Financiamento) opcional
  const [includeFixedCosts, setIncludeFixedCosts] = useState<boolean>(false);

  // Atualizar preço do combustível quando mudar o tipo
  const handleFuelTypeChange = (type: string) => {
    setSelectedFuelType(type);
    if (type === 'Etanol') {
      setFuelPrice(3.99);
      setVehicleConsumption(Number(((vehicle.avgConsumption || 11.5) * 0.72).toFixed(1)));
    } else if (type === 'GNV') {
      setFuelPrice(4.49);
      setVehicleConsumption(14.0);
    } else if (type === 'Elétrico') {
      setFuelPrice(0.95); // R$/kWh
      setVehicleConsumption(6.5); // km/kWh
    } else {
      setFuelPrice(profile.gasPriceReference || 5.89);
      setVehicleConsumption(vehicle.avgConsumption || 11.5);
    }
  };

  // Predefinições Rápidas (Presets)
  const applyPreset = (type: 'urban' | 'surge' | 'highway' | 'history' | 'short') => {
    if (type === 'urban') {
      setCalcMode('rate');
      setGrossRatePerKm(2.20);
      setDeadheadPercent(15);
    } else if (type === 'surge') {
      setCalcMode('rate');
      setGrossRatePerKm(3.20);
      setDeadheadPercent(10);
    } else if (type === 'highway') {
      setCalcMode('rate');
      setGrossRatePerKm(1.85);
      setDeadheadPercent(25);
    } else if (type === 'short') {
      setCalcMode('trip');
      setTripGrossAmount(12.50);
      setTripDistanceKm(3.8);
      setTripDurationMin(11);
      setDeadheadPercent(20);
    } else if (type === 'history') {
      setCalcMode('rate');
      setGrossRatePerKm(historicalAverages.avgRatePerKm || 2.25);
      setDeadheadPercent(15);
    }
  };

  // CÁLCULOS PRINCIPAIS DE RENTABILIDADE
  const simulation = useMemo(() => {
    // 1. Ganho Bruto por KM efetivo
    let effectiveGrossPerPaidKm = grossRatePerKm;
    let sampleTripKm = 12;
    let sampleTripGross = 12 * grossRatePerKm;

    if (calcMode === 'trip') {
      sampleTripKm = tripDistanceKm > 0 ? tripDistanceKm : 1;
      sampleTripGross = tripGrossAmount;
      effectiveGrossPerPaidKm = safeDivide(tripGrossAmount, sampleTripKm);
    } else {
      sampleTripGross = sampleTripKm * grossRatePerKm;
    }

    // 2. Custo do Combustível por KM
    const fuelCostPerKm = safeDivide(fuelPrice, vehicleConsumption);

    // 3. Custo de Manutenção e Desgaste por KM
    const totalMaintenanceCostPerKm = Number((oilFilterCostKm + tiresCostKm + brakesMechanicsCostKm + depreciationCostKm).toFixed(3));

    // 4. Custos Fixos por KM (opcional)
    let fixedCostPerKm = 0;
    if (includeFixedCosts) {
      const fixedMonthly = (vehicle.insuranceMonthly || 0) + safeDivide(vehicle.ipvaAnnual || 0, 12) + (vehicle.financed ? (vehicle.financingInstallment || 0) : 0);
      fixedCostPerKm = safeDivide(fixedMonthly, 3000); // base 3.000 km/mês
    }

    // 5. Custo Total Operacional por KM rodado no odômetro
    const totalOperatingCostPerOdometerKm = fuelCostPerKm + totalMaintenanceCostPerKm + fixedCostPerKm;

    // 6. Impacto do Deslocamento Vazio (Deadhead)
    // Para cada 100 km pagos, o motorista roda (100 + deadheadPercent) km no odômetro
    const odometerMultiplier = 1 + (deadheadPercent / 100);
    const realCostPerPaidKm = totalOperatingCostPerOdometerKm * odometerMultiplier;

    // 7. Lucro Líquido Real por KM Pago
    const netProfitPerPaidKm = effectiveGrossPerPaidKm - realCostPerPaidKm;
    const netProfitPerOdometerKm = safeDivide(effectiveGrossPerPaidKm, odometerMultiplier) - totalOperatingCostPerOdometerKm;

    // 8. Margem Líquida (%)
    const profitMarginPercent = effectiveGrossPerPaidKm > 0 ? (netProfitPerPaidKm / effectiveGrossPerPaidKm) * 100 : 0;

    // 9. Simulação da Viagem Amostra
    const sampleTripOdometerKm = sampleTripKm * odometerMultiplier;
    const sampleTripFuelCost = fuelCostPerKm * sampleTripOdometerKm;
    const sampleTripMaintenanceCost = totalMaintenanceCostPerKm * sampleTripOdometerKm;
    const sampleTripTotalCost = realCostPerPaidKm * sampleTripKm;
    const sampleTripNetProfit = sampleTripGross - sampleTripTotalCost;

    // 10. Projeções de Dia e Mês
    const dailyKm = 150;
    const dailyGross = dailyKm * effectiveGrossPerPaidKm;
    const dailyTotalCost = dailyKm * realCostPerPaidKm;
    const dailyNetProfit = dailyGross - dailyTotalCost;

    const monthlyKm = 3500;
    const monthlyGross = monthlyKm * effectiveGrossPerPaidKm;
    const monthlyTotalCost = monthlyKm * realCostPerPaidKm;
    const monthlyNetProfit = monthlyGross - monthlyTotalCost;

    // 11. Classificação e Diagnóstico de Saúde da Corrida
    let status: 'EXCELLENT' | 'FAIR' | 'BAD' = 'BAD';
    let statusLabel = '🔴 Prejuízo / Risco';
    let statusColor = 'text-rose-400 border-rose-500/30 bg-rose-500/10';
    let statusBg = 'from-rose-950/40 via-slate-900 to-rose-950/20 border-rose-500/40';
    let diagnosticTitle = 'Corrida com Margem Perigosa ou Insustentável';
    let diagnosticText = `O faturamento de ${formatCurrency(effectiveGrossPerPaidKm)}/km deixa apenas ${formatCurrency(netProfitPerPaidKm)}/km de sobra líquida após combustível (${formatCurrency(fuelCostPerKm)}/km) e manutenção (${formatCurrency(totalMaintenanceCostPerKm)}/km). Não cobre os riscos mecânicos.`;

    if (netProfitPerPaidKm >= 1.40 || profitMarginPercent >= 55) {
      status = 'EXCELLENT';
      statusLabel = '🟢 Altamente Lucrativa';
      statusColor = 'text-emerald-400 border-emerald-500/30 bg-emerald-500/10';
      statusBg = 'from-emerald-950/40 via-slate-900 to-teal-950/20 border-emerald-500/40';
      diagnosticTitle = 'Excelente Rentabilidade Real!';
      diagnosticText = `Esta faixa de ganho (${formatCurrency(effectiveGrossPerPaidKm)}/km) coloca ${formatCurrency(netProfitPerPaidKm)}/km limpo no seu bolso (${profitMarginPercent.toFixed(1)}% de margem líquida). Corrida ideal para bater a meta rápida!`;
    } else if (netProfitPerPaidKm >= 0.85 || profitMarginPercent >= 38) {
      status = 'FAIR';
      statusLabel = '🟡 Rentabilidade Moderada';
      statusColor = 'text-amber-400 border-amber-500/30 bg-amber-500/10';
      statusBg = 'from-amber-950/40 via-slate-900 to-orange-950/20 border-amber-500/40';
      diagnosticTitle = 'Corrida na Média Operacional';
      diagnosticText = `Gera ${formatCurrency(netProfitPerPaidKm)}/km de lucro líquido (${profitMarginPercent.toFixed(1)}% de margem). É aceitável para manter o fluxo se o destino tiver boa demanda de retorno.`;
    }

    // Distribuição de cada R$ 100 faturados
    const shareFuel = Math.min(100, Math.max(0, safeDivide(fuelCostPerKm * odometerMultiplier, effectiveGrossPerPaidKm) * 100));
    const shareMaintenance = Math.min(100, Math.max(0, safeDivide(totalMaintenanceCostPerKm * odometerMultiplier, effectiveGrossPerPaidKm) * 100));
    const shareFixed = Math.min(100, Math.max(0, safeDivide(fixedCostPerKm * odometerMultiplier, effectiveGrossPerPaidKm) * 100));
    const shareNet = Math.max(0, 100 - shareFuel - shareMaintenance - shareFixed);

    return {
      effectiveGrossPerPaidKm,
      fuelCostPerKm,
      totalMaintenanceCostPerKm,
      fixedCostPerKm,
      totalOperatingCostPerOdometerKm,
      odometerMultiplier,
      realCostPerPaidKm,
      netProfitPerPaidKm,
      netProfitPerOdometerKm,
      profitMarginPercent,
      sampleTripKm,
      sampleTripGross,
      sampleTripOdometerKm,
      sampleTripFuelCost,
      sampleTripMaintenanceCost,
      sampleTripTotalCost,
      sampleTripNetProfit,
      dailyKm,
      dailyGross,
      dailyTotalCost,
      dailyNetProfit,
      monthlyKm,
      monthlyGross,
      monthlyTotalCost,
      monthlyNetProfit,
      status,
      statusLabel,
      statusColor,
      statusBg,
      diagnosticTitle,
      diagnosticText,
      shareFuel,
      shareMaintenance,
      shareFixed,
      shareNet,
    };
  }, [
    calcMode,
    grossRatePerKm,
    tripGrossAmount,
    tripDistanceKm,
    fuelPrice,
    vehicleConsumption,
    oilFilterCostKm,
    tiresCostKm,
    brakesMechanicsCostKm,
    depreciationCostKm,
    deadheadPercent,
    includeFixedCosts,
    vehicle,
  ]);

  return (
    <div className="bg-gradient-to-br from-slate-900 via-slate-900/95 to-teal-950/20 border border-white/15 p-5 sm:p-6 rounded-3xl space-y-6 shadow-xl relative overflow-hidden">
      {/* GLOW DE FUNDO */}
      <div className="absolute top-0 right-0 w-80 h-80 bg-teal-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* HEADER DO SIMULADOR */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/10 pb-4 relative z-10">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-teal-400 to-emerald-500 text-slate-950 flex items-center justify-center font-black shadow-lg shadow-teal-500/20 shrink-0">
            <Calculator className="w-6 h-6 stroke-[2.5]" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm sm:text-base font-black text-white tracking-tight uppercase">
                SIMULADOR DE RENTABILIDADE REAL POR KM
              </h3>
              <span className="text-[10px] bg-teal-500/20 text-teal-300 font-bold px-2 py-0.5 rounded-full border border-teal-500/30">
                Líquido no Bolso
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Subtrai automaticamente o gasto do combustível e a reserva de manutenção para revelar seu lucro limpo.
            </p>
          </div>
        </div>

        {/* BOTAO PARA RESTAURAR VALORES DO HISTÓRICO */}
        {historicalAverages.hasHistory && (
          <button
            type="button"
            onClick={() => applyPreset('history')}
            className="flex items-center gap-1.5 bg-black/40 hover:bg-white/10 px-3 py-1.5 rounded-xl border border-white/10 text-xs font-bold text-teal-300 transition self-start sm:self-auto"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Minha Média ({formatCurrency(historicalAverages.avgRatePerKm)}/km)
          </button>
        )}
      </div>

      {/* PRESETS RÁPIDOS DE CORRIDAS */}
      <div className="space-y-1.5 relative z-10">
        <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
          Cenários Rápidos de Simulação:
        </span>
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 custom-scrollbar text-xs">
          <button
            type="button"
            onClick={() => applyPreset('urban')}
            className="px-3 py-1.5 rounded-xl bg-black/40 hover:bg-white/10 border border-white/10 text-slate-300 font-bold whitespace-nowrap transition flex items-center gap-1"
          >
            🏙️ Urbana Padrão (R$ 2,20/km)
          </button>
          <button
            type="button"
            onClick={() => applyPreset('surge')}
            className="px-3 py-1.5 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-amber-300 font-bold whitespace-nowrap transition flex items-center gap-1"
          >
            ⚡ Horário de Pico (R$ 3,20/km)
          </button>
          <button
            type="button"
            onClick={() => applyPreset('highway')}
            className="px-3 py-1.5 rounded-xl bg-sky-500/10 hover:bg-sky-500/20 border border-sky-500/30 text-sky-300 font-bold whitespace-nowrap transition flex items-center gap-1"
          >
            🛣️ Viagem Longa (R$ 1,85/km)
          </button>
          <button
            type="button"
            onClick={() => applyPreset('short')}
            className="px-3 py-1.5 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 font-bold whitespace-nowrap transition flex items-center gap-1"
          >
            📍 Corrida Curta de Bairro (R$ 12,50)
          </button>
        </div>
      </div>

      {/* PLACAR PRINCIPAL: RESULTADO DA RENTABILIDADE POR KM */}
      <div className={`bg-gradient-to-r ${simulation.statusBg} border p-4 sm:p-5 rounded-2xl space-y-4 relative z-10 shadow-lg`}>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/10 pb-3">
          <div className="flex items-center gap-2.5">
            <span className={`text-xs font-black px-2.5 py-1 rounded-full border ${simulation.statusColor}`}>
              {simulation.statusLabel}
            </span>
            <h4 className="text-sm font-black text-white">
              {simulation.diagnosticTitle}
            </h4>
          </div>

          <div className="text-left sm:text-right">
            <span className="text-[10px] text-slate-400 uppercase font-bold block">Margem Líquida</span>
            <span className="text-base font-black text-emerald-400">
              {simulation.profitMarginPercent.toFixed(1)}% do faturamento
            </span>
          </div>
        </div>

        {/* 4 GRANDES NÚMEROS: BRUTO vs COMBUSTÍVEL vs MANUTENÇÃO vs LUCRO LÍQUIDO */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-center">
          
          {/* BRUTO POR KM */}
          <div className="bg-black/40 p-3 rounded-xl border border-white/10 space-y-0.5">
            <span className="text-[10px] text-slate-400 uppercase font-bold flex items-center justify-center gap-1">
              <DollarSign className="w-3 h-3 text-white" /> Ganho Bruto / KM
            </span>
            <div className="text-base sm:text-lg font-black text-white">
              {formatCurrency(simulation.effectiveGrossPerPaidKm)}
            </div>
            <span className="text-[10px] text-slate-400 block">pago pelo app</span>
          </div>

          {/* CUSTO COMBUSTÍVEL */}
          <div className="bg-black/40 p-3 rounded-xl border border-white/10 space-y-0.5">
            <span className="text-[10px] text-rose-300/90 uppercase font-bold flex items-center justify-center gap-1">
              <Fuel className="w-3 h-3 text-rose-400" /> - Combustível / KM
            </span>
            <div className="text-base sm:text-lg font-black text-rose-400">
              -{formatCurrency(simulation.fuelCostPerKm)}
            </div>
            <span className="text-[10px] text-slate-400 block">
              {vehicleConsumption} km/L ({selectedFuelType})
            </span>
          </div>

          {/* CUSTO MANUTENÇÃO */}
          <div className="bg-black/40 p-3 rounded-xl border border-white/10 space-y-0.5">
            <span className="text-[10px] text-amber-300/90 uppercase font-bold flex items-center justify-center gap-1">
              <Wrench className="w-3 h-3 text-amber-400" /> - Manutenção / KM
            </span>
            <div className="text-base sm:text-lg font-black text-amber-400">
              -{formatCurrency(simulation.totalMaintenanceCostPerKm)}
            </div>
            <span className="text-[10px] text-slate-400 block">
              óleo, pneus, freios & desp.
            </span>
          </div>

          {/* LUCRO LÍQUIDO REAL */}
          <div className="bg-emerald-950/60 p-3 rounded-xl border border-emerald-500/40 space-y-0.5 shadow-lg shadow-emerald-500/10">
            <span className="text-[10px] text-emerald-300 uppercase font-black flex items-center justify-center gap-1">
              <Sparkles className="w-3 h-3 text-emerald-400" /> = LUCRO REAL / KM
            </span>
            <div className="text-base sm:text-xl font-black text-emerald-400">
              {formatCurrency(simulation.netProfitPerPaidKm)}
            </div>
            <span className="text-[10px] text-emerald-300 font-bold block">
              limpo no seu bolso
            </span>
          </div>

        </div>

        {/* BARRA DE DISTRIBUIÇÃO VISUAL DO FATURAMENTO */}
        <div className="space-y-1.5 pt-1">
          <div className="flex items-center justify-between text-[11px] font-bold text-slate-300">
            <span>Divisão de Cada R$ 100,00 que Você Fatura:</span>
            <span className="text-emerald-400 font-black">
              R$ {simulation.shareNet.toFixed(1)} Lucro Líquido
            </span>
          </div>

          <div className="w-full h-3 rounded-full bg-slate-950 flex overflow-hidden p-0.5 gap-0.5 border border-white/10">
            <div
              style={{ width: `${simulation.shareFuel}%` }}
              className="h-full bg-rose-500 rounded-l-full transition-all"
              title={`Combustível: ${simulation.shareFuel.toFixed(1)}%`}
            />
            <div
              style={{ width: `${simulation.shareMaintenance}%` }}
              className="h-full bg-amber-500 transition-all"
              title={`Manutenção: ${simulation.shareMaintenance.toFixed(1)}%`}
            />
            {simulation.shareFixed > 0 && (
              <div
                style={{ width: `${simulation.shareFixed}%` }}
                className="h-full bg-indigo-500 transition-all"
                title={`Custos Fixos: ${simulation.shareFixed.toFixed(1)}%`}
              />
            )}
            <div
              style={{ width: `${simulation.shareNet}%` }}
              className="h-full bg-emerald-500 rounded-r-full transition-all"
              title={`Lucro Líquido: ${simulation.shareNet.toFixed(1)}%`}
            />
          </div>

          <div className="flex items-center justify-between text-[10px] text-slate-400 pt-0.5">
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-rose-500 inline-block" /> Combustível ({simulation.shareFuel.toFixed(0)}%)
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-amber-500 inline-block" /> Manutenção ({simulation.shareMaintenance.toFixed(0)}%)
            </span>
            <span className="flex items-center gap-1 text-emerald-300 font-bold">
              <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" /> Lucro Líquido ({simulation.shareNet.toFixed(0)}%)
            </span>
          </div>
        </div>

        <p className="text-xs text-slate-300 leading-relaxed bg-black/30 p-2.5 rounded-xl border border-white/5">
          💡 {simulation.diagnosticText}
        </p>
      </div>

      {/* CONTROLES INTERATIVOS DA SIMULAÇÃO */}
      <div className="bg-black/30 p-4 sm:p-5 rounded-2xl border border-white/10 space-y-4 relative z-10">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-white/10 pb-3">
          <span className="text-xs font-black text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
            <Sliders className="w-4 h-4 text-teal-400" />
            Configurações & Parâmetros da Simulação
          </span>

          {/* ALTERNADOR DE MODO: POR TAXA (R$/KM) OU POR CORRIDA */}
          <div className="flex items-center gap-1 bg-black/40 p-0.5 rounded-xl border border-white/10 self-start sm:self-auto text-xs">
            <button
              type="button"
              onClick={() => setCalcMode('rate')}
              className={`px-2.5 py-1 rounded-lg font-bold transition ${
                calcMode === 'rate' ? 'bg-teal-500 text-slate-950' : 'text-slate-400 hover:text-white'
              }`}
            >
              Taxa Direta (R$/km)
            </button>
            <button
              type="button"
              onClick={() => setCalcMode('trip')}
              className={`px-2.5 py-1 rounded-lg font-bold transition ${
                calcMode === 'trip' ? 'bg-teal-500 text-slate-950' : 'text-slate-400 hover:text-white'
              }`}
            >
              Simular Corrida (R$ + KM)
            </button>
          </div>
        </div>

        {/* INPUTS DE GANHO BRUTO */}
        {calcMode === 'rate' ? (
          <div className="bg-white/5 p-3.5 rounded-xl border border-white/5 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-300 font-bold">Valor Bruto Pago por KM Rodado:</span>
              <span className="text-white font-black text-sm">{formatCurrency(grossRatePerKm)}/km</span>
            </div>
            <input
              type="range"
              min={1.20}
              max={5.00}
              step={0.05}
              value={grossRatePerKm}
              onChange={e => setGrossRatePerKm(Number(e.target.value))}
              className="w-full accent-teal-400 cursor-pointer"
            />
            <div className="flex justify-between text-[10px] text-slate-500">
              <span>R$ 1,20/km (Baixo)</span>
              <span>R$ 2,20/km (Padrão)</span>
              <span>R$ 3,50+/km (Pico/Dinâmica)</span>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="bg-white/5 p-3 rounded-xl border border-white/5 space-y-1">
              <label className="text-[11px] text-slate-400 font-bold block">Valor da Corrida (R$):</label>
              <input
                type="number"
                step="0.50"
                min="5"
                value={tripGrossAmount}
                onChange={e => setTripGrossAmount(Math.max(1, Number(e.target.value)))}
                className="w-full bg-black/60 border border-white/15 rounded-lg px-2.5 py-1.5 text-sm font-bold text-white focus:outline-none focus:border-teal-400"
              />
            </div>
            <div className="bg-white/5 p-3 rounded-xl border border-white/5 space-y-1">
              <label className="text-[11px] text-slate-400 font-bold block">Distância Paga (KM):</label>
              <input
                type="number"
                step="0.5"
                min="0.5"
                value={tripDistanceKm}
                onChange={e => setTripDistanceKm(Math.max(0.5, Number(e.target.value)))}
                className="w-full bg-black/60 border border-white/15 rounded-lg px-2.5 py-1.5 text-sm font-bold text-white focus:outline-none focus:border-teal-400"
              />
            </div>
            <div className="bg-white/5 p-3 rounded-xl border border-white/5 space-y-1">
              <label className="text-[11px] text-slate-400 font-bold block">Taxa Resultante:</label>
              <div className="text-sm font-black text-teal-300 py-1.5">
                {formatCurrency(safeDivide(tripGrossAmount, tripDistanceKm))}/km
              </div>
            </div>
          </div>
        )}

        {/* INPUTS DE COMBUSTÍVEL */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="bg-white/5 p-3 rounded-xl border border-white/5 space-y-1.5">
            <label className="text-[11px] text-slate-400 font-bold block">Tipo de Combustível:</label>
            <div className="grid grid-cols-2 gap-1 text-[11px]">
              {['Gasolina', 'Etanol', 'GNV', 'Elétrico'].map(type => (
                <button
                  key={type}
                  type="button"
                  onClick={() => handleFuelTypeChange(type)}
                  className={`p-1.5 rounded-lg font-bold transition text-center ${
                    selectedFuelType === type
                      ? 'bg-teal-500 text-slate-950'
                      : 'bg-black/40 text-slate-300 border border-white/10 hover:bg-white/5'
                  }`}
                >
                  {type}
                </button>
              ))}
            </div>
          </div>

          <div className="bg-white/5 p-3 rounded-xl border border-white/5 space-y-1">
            <div className="flex items-center justify-between">
              <label className="text-[11px] text-slate-400 font-bold">Preço ({selectedFuelType === 'GNV' ? 'R$/m³' : selectedFuelType === 'Elétrico' ? 'R$/kWh' : 'R$/Litro'}):</label>
              <span className="text-xs font-black text-white">{formatCurrency(fuelPrice)}</span>
            </div>
            <input
              type="number"
              step="0.05"
              min="0.5"
              value={fuelPrice}
              onChange={e => setFuelPrice(Math.max(0.1, Number(e.target.value)))}
              className="w-full bg-black/60 border border-white/15 rounded-lg px-2.5 py-1 text-sm font-bold text-white focus:outline-none focus:border-teal-400"
            />
          </div>

          <div className="bg-white/5 p-3 rounded-xl border border-white/5 space-y-1">
            <div className="flex items-center justify-between">
              <label className="text-[11px] text-slate-400 font-bold">Consumo Médio:</label>
              <span className="text-xs font-black text-white">{vehicleConsumption} {selectedFuelType === 'GNV' ? 'km/m³' : selectedFuelType === 'Elétrico' ? 'km/kWh' : 'km/L'}</span>
            </div>
            <input
              type="number"
              step="0.2"
              min="4"
              value={vehicleConsumption}
              onChange={e => setVehicleConsumption(Math.max(1, Number(e.target.value)))}
              className="w-full bg-black/60 border border-white/15 rounded-lg px-2.5 py-1 text-sm font-bold text-white focus:outline-none focus:border-teal-400"
            />
          </div>
        </div>

        {/* PROVISÃO DE MANUTENÇÃO & DESGASTE */}
        <div className="bg-white/5 p-3.5 rounded-xl border border-white/5 space-y-2.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Wrench className="w-4 h-4 text-amber-400" />
              <span className="text-xs font-bold text-slate-200">
                Provisão de Manutenção & Desgaste Mecânico:
              </span>
              <span className="text-xs font-black text-amber-400">
                {formatCurrency(simulation.totalMaintenanceCostPerKm)}/km
              </span>
            </div>

            <button
              type="button"
              onClick={() => setShowDetailedMaintenance(!showDetailedMaintenance)}
              className="text-[11px] text-teal-300 hover:text-teal-200 font-bold flex items-center gap-1 transition"
            >
              {showDetailedMaintenance ? 'Ocultar Detalhes' : 'Personalizar Itens'}
              {showDetailedMaintenance ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            </button>
          </div>

          {showDetailedMaintenance && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-white/5 text-[11px]">
              <div className="bg-black/40 p-2 rounded-lg border border-white/5 space-y-1">
                <span className="text-slate-400 block font-bold">Óleo & Filtros:</span>
                <input
                  type="number"
                  step="0.005"
                  value={oilFilterCostKm}
                  onChange={e => setOilFilterCostKm(Math.max(0, Number(e.target.value)))}
                  className="w-full bg-black/60 border border-white/15 rounded px-1.5 py-0.5 font-bold text-white"
                />
                <span className="text-[9px] text-slate-500 block">~R$ 0,035 - R$ 0,045/km</span>
              </div>

              <div className="bg-black/40 p-2 rounded-lg border border-white/5 space-y-1">
                <span className="text-slate-400 block font-bold">Pneus & Geometria:</span>
                <input
                  type="number"
                  step="0.005"
                  value={tiresCostKm}
                  onChange={e => setTiresCostKm(Math.max(0, Number(e.target.value)))}
                  className="w-full bg-black/60 border border-white/15 rounded px-1.5 py-0.5 font-bold text-white"
                />
                <span className="text-[9px] text-slate-500 block">~R$ 0,045 - R$ 0,060/km</span>
              </div>

              <div className="bg-black/40 p-2 rounded-lg border border-white/5 space-y-1">
                <span className="text-slate-400 block font-bold">Freios & Suspensão:</span>
                <input
                  type="number"
                  step="0.005"
                  value={brakesMechanicsCostKm}
                  onChange={e => setBrakesMechanicsCostKm(Math.max(0, Number(e.target.value)))}
                  className="w-full bg-black/60 border border-white/15 rounded px-1.5 py-0.5 font-bold text-white"
                />
                <span className="text-[9px] text-slate-500 block">~R$ 0,050 - R$ 0,075/km</span>
              </div>

              <div className="bg-black/40 p-2 rounded-lg border border-white/5 space-y-1">
                <span className="text-slate-400 block font-bold">Fundo de Troca/Desp.:</span>
                <input
                  type="number"
                  step="0.005"
                  value={depreciationCostKm}
                  onChange={e => setDepreciationCostKm(Math.max(0, Number(e.target.value)))}
                  className="w-full bg-black/60 border border-white/15 rounded px-1.5 py-0.5 font-bold text-white"
                />
                <span className="text-[9px] text-slate-500 block">~R$ 0,060 - R$ 0,090/km</span>
              </div>
            </div>
          )}
        </div>

        {/* FATOR KM MORTO & CUSTOS FIXOS */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
          <div className="bg-white/5 p-3 rounded-xl border border-white/5 space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-slate-300 font-bold">Deslocamento Vazio (KM Morto):</span>
              <span className="text-sky-300 font-black">{deadheadPercent}%</span>
            </div>
            <input
              type="range"
              min={0}
              max={50}
              step={5}
              value={deadheadPercent}
              onChange={e => setDeadheadPercent(Number(e.target.value))}
              className="w-full accent-sky-400 cursor-pointer"
            />
            <span className="text-[10px] text-slate-400 block">
              Para cada 10 km com passageiro, você roda {(10 * simulation.odometerMultiplier).toFixed(1)} km totais.
            </span>
          </div>

          <div className="bg-white/5 p-3 rounded-xl border border-white/5 flex items-center justify-between gap-3">
            <div>
              <span className="text-slate-300 font-bold block">Ratear Custos Fixos no KM</span>
              <span className="text-[10px] text-slate-400 block">
                Incluir IPVA, Seguro e Financiamento (+{formatCurrency(simulation.fixedCostPerKm)}/km)
              </span>
            </div>
            <button
              type="button"
              onClick={() => setIncludeFixedCosts(!includeFixedCosts)}
              className={`w-11 h-6 rounded-full transition-colors relative shrink-0 ${
                includeFixedCosts ? 'bg-teal-500' : 'bg-slate-700'
              }`}
            >
              <div
                className={`w-4 h-4 rounded-full bg-white transition-transform absolute top-1 ${
                  includeFixedCosts ? 'left-6' : 'left-1'
                }`}
              />
            </button>
          </div>
        </div>

      </div>

      {/* PROJEÇÕES FINANCEIRAS: CORRIDA vs DIA vs MÊS */}
      <div className="bg-black/30 p-4 sm:p-5 rounded-2xl border border-white/10 space-y-3 relative z-10">
        <span className="text-xs font-black text-slate-300 uppercase tracking-wider block">
          Projeções de Retorno Líquido Baseado nos Parâmetros
        </span>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
          
          {/* CORRIDA AMOSTRA */}
          <div className="bg-white/5 p-3.5 rounded-xl border border-white/10 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-slate-400 font-bold">1 Corrida ({simulation.sampleTripKm} km):</span>
              <span className="text-white font-bold">{formatCurrency(simulation.sampleTripGross)}</span>
            </div>
            <div className="space-y-1 text-[11px] text-slate-400 border-t border-white/5 pt-1.5">
              <div className="flex justify-between">
                <span>Combustível ({selectedFuelType}):</span>
                <span className="text-rose-400">-{formatCurrency(simulation.sampleTripFuelCost)}</span>
              </div>
              <div className="flex justify-between">
                <span>Reserva Manutenção:</span>
                <span className="text-amber-400">-{formatCurrency(simulation.sampleTripMaintenanceCost)}</span>
              </div>
              <div className="flex justify-between font-black text-emerald-400 pt-1 border-t border-white/5 text-xs">
                <span>Lucro Líquido:</span>
                <span>{formatCurrency(simulation.sampleTripNetProfit)}</span>
              </div>
            </div>
          </div>

          {/* TURNO DIÁRIO */}
          <div className="bg-white/5 p-3.5 rounded-xl border border-white/10 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-slate-400 font-bold">Turno Diário ({simulation.dailyKm} km):</span>
              <span className="text-white font-bold">{formatCurrency(simulation.dailyGross)}</span>
            </div>
            <div className="space-y-1 text-[11px] text-slate-400 border-t border-white/5 pt-1.5">
              <div className="flex justify-between">
                <span>Despesas Totais:</span>
                <span className="text-rose-400">-{formatCurrency(simulation.dailyTotalCost)}</span>
              </div>
              <div className="flex justify-between font-black text-emerald-400 pt-1 border-t border-white/5 text-xs">
                <span>Lucro Líquido / Dia:</span>
                <span>{formatCurrency(simulation.dailyNetProfit)}</span>
              </div>
            </div>
          </div>

          {/* PROJEÇÃO MENSAL */}
          <div className="bg-teal-950/30 p-3.5 rounded-xl border border-teal-500/30 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-teal-300 font-bold">Mês ({simulation.monthlyKm} km):</span>
              <span className="text-white font-bold">{formatCurrency(simulation.monthlyGross)}</span>
            </div>
            <div className="space-y-1 text-[11px] text-slate-400 border-t border-white/5 pt-1.5">
              <div className="flex justify-between">
                <span>Custos Operacionais:</span>
                <span className="text-rose-400">-{formatCurrency(simulation.monthlyTotalCost)}</span>
              </div>
              <div className="flex justify-between font-black text-emerald-400 pt-1 border-t border-white/5 text-xs">
                <span>Sobra Líquida / Mês:</span>
                <span className="text-sm">{formatCurrency(simulation.monthlyNetProfit)}</span>
              </div>
            </div>
          </div>

        </div>
      </div>

      {/* DICA DE OURO PARA SELEÇÃO DE CORRIDAS */}
      <div className="bg-teal-500/10 border border-teal-500/20 p-3.5 rounded-2xl flex items-start gap-2.5 text-xs text-teal-200 relative z-10">
        <Zap className="w-4 h-4 text-teal-400 shrink-0 mt-0.5" />
        <div>
          <strong className="text-white">Regra de Ouro do Motorista Profissional:</strong> Nunca avalie uma chamada apenas pelo valor total em reais (ex: "R$ 40"). Sempre divida o valor pelos quilômetros totais (incluindo o deslocamento para buscar o passageiro). Se a taxa resultante for menor que <strong>{formatCurrency(simulation.realCostPerPaidKm + 0.80)}/km</strong>, o lucro restante mal pagará o risco mecânico do veículo!
        </div>
      </div>

    </div>
  );
};
