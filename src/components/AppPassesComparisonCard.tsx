import React, { useState, useMemo } from 'react';
import { useDriver } from '../context/DriverContext';
import { formatCurrency, safeDivide } from '../utils/calc';
import {
  Ticket,
  Zap,
  TrendingUp,
  Award,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  HelpCircle,
  Layers,
  Fuel,
  ArrowRight,
  ShieldCheck,
  Percent,
  DollarSign,
  ChevronRight,
  Info,
  Clock,
  Target,
  Flame,
  Lightbulb,
  Check,
  Sliders,
  AlertTriangle,
  Gift,
} from 'lucide-react';

interface AppPassesComparisonCardProps {
  onNavigateTab?: (tab: string) => void;
}

export const AppPassesComparisonCard: React.FC<AppPassesComparisonCardProps> = () => {
  const { sessions, profile } = useDriver();

  // Abas do componente
  const [activeTab, setActiveTab] = useState<'simulator' | 'catalog' | 'strategies' | 'missions'>('simulator');

  // Calcular médias reais do motorista com base no histórico
  const historicalWeeklyEstimates = useMemo(() => {
    if (sessions.length === 0) {
      return {
        weeklyTrips: 60,
        weeklyGross: 1200,
        weeklyFuel: 320,
      };
    }

    const totalGross = sessions.reduce((acc, s) => acc + s.grossEarnings + s.tips, 0);
    const totalFuel = sessions.reduce((acc, s) => acc + s.fuelExpenses, 0);
    const totalTrips = sessions.reduce((acc, s) => acc + s.tripsCount, 0);
    const sessionCount = Math.max(sessions.length, 1);

    // Projetar para 6 dias de trabalho por semana
    const dailyGross = totalGross / sessionCount;
    const dailyFuel = totalFuel / sessionCount;
    const dailyTrips = totalTrips / sessionCount;

    return {
      weeklyTrips: Math.round(dailyTrips * 6) || 60,
      weeklyGross: Math.round(dailyGross * 6) || 1200,
      weeklyFuel: Math.round(dailyFuel * 6) || 320,
    };
  }, [sessions]);

  // Estados interativos da simulação comparativa
  const [weeklyTrips, setWeeklyTrips] = useState<number>(historicalWeeklyEstimates.weeklyTrips);
  const [weeklyGross, setWeeklyGross] = useState<number>(historicalWeeklyEstimates.weeklyGross);
  const [weeklyFuel, setWeeklyFuel] = useState<number>(historicalWeeklyEstimates.weeklyFuel);

  // Modalidade de passe da 99 selecionada
  const [pass99Category, setPass99Category] = useState<'time_7d' | 'time_3d' | 'time_1d' | 'earnings_300' | 'earnings_150' | 'custom'>('time_7d');
  const [customPass99Cost, setCustomPass99Cost] = useState<number>(119.00);

  // Nível Uber Pro selecionado
  const [uberProTier, setUberProTier] = useState<'diamond' | 'platinum' | 'gold' | 'blue'>('platinum');
  const [uberBonusTierEligible, setUberBonusTierEligible] = useState<boolean>(true);

  // Estados para a calculadora de Missões Uber
  const [missionTargetTrips, setMissionTargetTrips] = useState<number>(50);
  const [missionBonusAmount, setMissionBonusAmount] = useState<number>(180);
  const [missionCurrentTrips, setMissionCurrentTrips] = useState<number>(28);

  // Atualizar custo do passe 99 quando a categoria mudar
  const handlePass99CategoryChange = (cat: 'time_7d' | 'time_3d' | 'time_1d' | 'earnings_300' | 'earnings_150' | 'custom') => {
    setPass99Category(cat);
    if (cat === 'time_7d') setCustomPass99Cost(119.00);
    else if (cat === 'time_3d') setCustomPass99Cost(68.00);
    else if (cat === 'time_1d') setCustomPass99Cost(24.90);
    else if (cat === 'earnings_300') setCustomPass99Cost(49.90);
    else if (cat === 'earnings_150') setCustomPass99Cost(26.90);
  };

  // Cálculos matemáticos comparativos
  const analysis = useMemo(() => {
    const avgTicket = safeDivide(weeklyGross, weeklyTrips) || 20;

    // 1. ANÁLISE 99 SEM PASSE vs COM PASSE
    const standard99FeePercent = 0.185; // Taxa média padrão 99 (~18.5%)
    const standard99FeeCost = weeklyGross * standard99FeePercent;

    let pass99Cost = customPass99Cost;
    let feeWith99Pass = 0;

    if (pass99Category === 'time_7d') {
      pass99Cost = customPass99Cost;
      feeWith99Pass = 0; // Taxa zero
    } else if (pass99Category === 'time_3d') {
      // 3 dias com taxa zero, 3 dias com taxa normal
      pass99Cost = customPass99Cost;
      feeWith99Pass = (weeklyGross * 0.5) * standard99FeePercent;
    } else if (pass99Category === 'time_1d') {
      // 1 dia com taxa zero (ex: sábado ou domingo)
      pass99Cost = customPass99Cost;
      feeWith99Pass = (weeklyGross * (5 / 6)) * standard99FeePercent;
    } else if (pass99Category === 'earnings_300') {
      // Isenção nos primeiros R$ 300, resto taxa normal
      pass99Cost = customPass99Cost;
      const taxableGross = Math.max(0, weeklyGross - 300);
      feeWith99Pass = taxableGross * standard99FeePercent;
    } else if (pass99Category === 'earnings_150') {
      pass99Cost = customPass99Cost;
      const taxableGross = Math.max(0, weeklyGross - 150);
      feeWith99Pass = taxableGross * standard99FeePercent;
    } else {
      pass99Cost = customPass99Cost;
      feeWith99Pass = 0;
    }

    const totalCost99WithPass = pass99Cost + feeWith99Pass;
    const netSavings99Weekly = standard99FeeCost - totalCost99WithPass;
    const netSavings99Monthly = netSavings99Weekly * 4.33;

    // Ponto de equilíbrio 99 (quantas corridas para o passe pagar a si mesmo)
    const feeSavedPerTrip = avgTicket * standard99FeePercent;
    const breakEvenTrips99 = Math.ceil(safeDivide(pass99Cost, feeSavedPerTrip));
    const breakEvenGross99 = Math.ceil(safeDivide(pass99Cost, standard99FeePercent));

    // 2. ANÁLISE UBER PRO & BENEFÍCIOS
    const standardUberFeePercent = 0.235; // Taxa média padrão Uber (~23.5%)
    const standardUberFeeCost = weeklyGross * standardUberFeePercent;

    let fuelDiscountPercent = 0.04; // Platina = 4%
    let uberXBonusPercent = 0;

    if (uberProTier === 'diamond') {
      fuelDiscountPercent = 0.06; // 6% cashback
      uberXBonusPercent = uberBonusTierEligible ? 0.15 : 0; // +15% em viagens elegíveis
    } else if (uberProTier === 'platinum') {
      fuelDiscountPercent = 0.04; // 4% cashback
      uberXBonusPercent = uberBonusTierEligible ? 0.15 : 0; // +15%
    } else if (uberProTier === 'gold') {
      fuelDiscountPercent = 0.03; // 3% cashback
      uberXBonusPercent = uberBonusTierEligible ? 0.10 : 0; // +10%
    } else {
      fuelDiscountPercent = 0.01; // 1%
      uberXBonusPercent = 0;
    }

    const weeklyFuelSavingsUber = weeklyFuel * fuelDiscountPercent;
    const monthlyFuelSavingsUber = weeklyFuelSavingsUber * 4.33;
    const weeklyUberExtraTierEarnings = weeklyGross * uberXBonusPercent;
    const netUberFeeWithBenefits = standardUberFeeCost - weeklyFuelSavingsUber - weeklyUberExtraTierEarnings;

    // 3. COMPARAÇÃO DIRETA E VEREDITO DE VANTAGENS
    const netTakeHome99WithPass = weeklyGross - totalCost99WithPass;
    const netTakeHomeUberPro = weeklyGross - standardUberFeeCost + weeklyFuelSavingsUber + weeklyUberExtraTierEarnings;

    let winnerModal: '99_PASS' | 'UBER_PRO' = '99_PASS';
    let verdictTitle = '';
    let verdictDescription = '';

    if (netTakeHome99WithPass >= netTakeHomeUberPro) {
      winnerModal = '99_PASS';
      const advantageDiffWeekly = netTakeHome99WithPass - netTakeHomeUberPro;
      verdictTitle = `🏆 99 com Passe Taxa Zero é a mais vantajosa (+${formatCurrency(advantageDiffWeekly)}/sem no seu bolso)`;
      verdictDescription = `Com ${weeklyTrips} corridas e faturamento de ${formatCurrency(weeklyGross)}, o Passe 99 economiza ${formatCurrency(netSavings99Weekly)}/semana em taxas, superando os descontos do Uber Pro.`;
    } else {
      winnerModal = 'UBER_PRO';
      const advantageDiffWeekly = netTakeHomeUberPro - netTakeHome99WithPass;
      verdictTitle = `🏆 Uber Pro (${uberProTier.toUpperCase()}) é mais vantajoso (+${formatCurrency(advantageDiffWeekly)}/sem)`;
      verdictDescription = `Para o seu volume e cashback de combustível (${fuelDiscountPercent * 100}%), o Uber Pro entrega maior rentabilidade líquida sem a necessidade de pagar taxa fixa antecipada.`;
    }

    return {
      avgTicket,
      standard99FeeCost,
      totalCost99WithPass,
      netSavings99Weekly,
      netSavings99Monthly,
      breakEvenTrips99,
      breakEvenGross99,
      standardUberFeeCost,
      weeklyFuelSavingsUber,
      monthlyFuelSavingsUber,
      weeklyUberExtraTierEarnings,
      netTakeHome99WithPass,
      netTakeHomeUberPro,
      winnerModal,
      verdictTitle,
      verdictDescription,
      fuelDiscountPercent,
      uberXBonusPercent,
    };
  }, [weeklyTrips, weeklyGross, weeklyFuel, pass99Category, customPass99Cost, uberProTier, uberBonusTierEligible]);

  // Cálculos de Missões Uber
  const missionAnalysis = useMemo(() => {
    const remainingTrips = Math.max(0, missionTargetTrips - missionCurrentTrips);
    const progressPercent = Math.min(100, Math.round(safeDivide(missionCurrentTrips, missionTargetTrips) * 100));
    const bonusPerTrip = safeDivide(missionBonusAmount, missionTargetTrips);
    const bonusPerRemainingTrip = remainingTrips > 0 ? safeDivide(missionBonusAmount, remainingTrips) : 0;
    const isCompleted = missionCurrentTrips >= missionTargetTrips;

    return {
      remainingTrips,
      progressPercent,
      bonusPerTrip,
      bonusPerRemainingTrip,
      isCompleted,
    };
  }, [missionTargetTrips, missionBonusAmount, missionCurrentTrips]);

  return (
    <div className="bg-gradient-to-br from-slate-900 via-slate-900/95 to-amber-950/20 border border-white/15 p-5 sm:p-6 rounded-3xl space-y-6 shadow-xl relative overflow-hidden">
      {/* GLOW DE FUNDO */}
      <div className="absolute top-0 right-0 w-80 h-80 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* HEADER DA SEÇÃO */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/10 pb-4 relative z-10">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-amber-400 to-orange-500 text-slate-950 flex items-center justify-center font-black shadow-lg shadow-amber-500/20 shrink-0">
            <Ticket className="w-6 h-6 stroke-[2.5]" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm sm:text-base font-black text-white tracking-tight uppercase">
                PASSES & PLANOS: UBER vs 99 (ESTRATÉGIAS 2026)
              </h3>
              <span className="text-[10px] bg-amber-500/20 text-amber-300 font-bold px-2 py-0.5 rounded-full border border-amber-500/30">
                Taxa Zero & Benefícios
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Descubra os valores oficiais dos pacotes da 99, benefícios do Uber Pro e as melhores estratégias para lucrar mais.
            </p>
          </div>
        </div>

        {/* NAVEGAÇÃO ENTRE ABAS DO CARD */}
        <div className="flex items-center gap-1 bg-black/40 p-1 rounded-2xl border border-white/10 self-start sm:self-auto text-xs overflow-x-auto custom-scrollbar">
          <button
            type="button"
            onClick={() => setActiveTab('simulator')}
            className={`px-3 py-1.5 rounded-xl font-bold transition flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'simulator'
                ? 'bg-amber-400 text-slate-950 font-black shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Sliders className="w-3.5 h-3.5" />
            Simulador
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('catalog')}
            className={`px-3 py-1.5 rounded-xl font-bold transition flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'catalog'
                ? 'bg-amber-400 text-slate-950 font-black shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            Tipos & Valores
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('strategies')}
            className={`px-3 py-1.5 rounded-xl font-bold transition flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'strategies'
                ? 'bg-amber-400 text-slate-950 font-black shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Zap className="w-3.5 h-3.5" />
            Estratégias de Uso
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('missions')}
            className={`px-3 py-1.5 rounded-xl font-bold transition flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'missions'
                ? 'bg-amber-400 text-slate-950 font-black shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Target className="w-3.5 h-3.5" />
            Missões Uber
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* ABA 1: SIMULADOR COMPARATIVO DE RENTABILIDADE (99 PASSE vs UBER PRO) */}
      {/* ========================================================================= */}
      {activeTab === 'simulator' && (
        <div className="space-y-5 relative z-10">
          {/* VEREDITO INTELIGENTE */}
          <div className="bg-gradient-to-r from-amber-950/40 via-slate-900 to-emerald-950/40 border border-amber-500/40 p-4 sm:p-5 rounded-2xl space-y-2 shadow-lg">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-amber-400 shrink-0" />
                <h4 className="text-xs sm:text-sm font-black text-white">
                  {analysis.verdictTitle}
                </h4>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-black bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 px-2.5 py-0.5 rounded-full">
                  Break-even: {analysis.breakEvenTrips99} corridas ({formatCurrency(analysis.breakEvenGross99)})
                </span>
              </div>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              {analysis.verdictDescription}
            </p>
          </div>

          {/* SIMULADOR DE DADOS DA SEMANA */}
          <div className="bg-black/30 p-4 rounded-2xl border border-white/10 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                <DollarSign className="w-4 h-4 text-amber-400" />
                Simule Sua Rotina Semanal de Trabalho
              </span>
              <span className="text-[10px] text-slate-400">
                Ticket Médio: <strong className="text-white">{formatCurrency(analysis.avgTicket)}/corrida</strong>
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              <div className="bg-white/5 p-3 rounded-xl border border-white/5 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-slate-400 font-bold">Faturamento Bruto:</span>
                  <span className="text-white font-black">{formatCurrency(weeklyGross)}</span>
                </div>
                <input
                  type="range"
                  min={400}
                  max={3500}
                  step={50}
                  value={weeklyGross}
                  onChange={e => setWeeklyGross(Number(e.target.value))}
                  className="w-full accent-amber-400 cursor-pointer"
                />
              </div>

              <div className="bg-white/5 p-3 rounded-xl border border-white/5 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-slate-400 font-bold">Corridas Feitas:</span>
                  <span className="text-emerald-400 font-black">{weeklyTrips} corridas</span>
                </div>
                <input
                  type="range"
                  min={10}
                  max={150}
                  step={5}
                  value={weeklyTrips}
                  onChange={e => setWeeklyTrips(Number(e.target.value))}
                  className="w-full accent-emerald-400 cursor-pointer"
                />
              </div>

              <div className="bg-white/5 p-3 rounded-xl border border-white/5 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-slate-400 font-bold">Gasto com Combustível:</span>
                  <span className="text-sky-400 font-black">{formatCurrency(weeklyFuel)}</span>
                </div>
                <input
                  type="range"
                  min={100}
                  max={1000}
                  step={20}
                  value={weeklyFuel}
                  onChange={e => setWeeklyFuel(Number(e.target.value))}
                  className="w-full accent-sky-400 cursor-pointer"
                />
              </div>
            </div>
          </div>

          {/* GRID COMPARATIVO: 99 PASS vs UBER PRO */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            
            {/* CARD 99: PACOTES TAXA ZERO */}
            <div className={`p-5 rounded-2xl border transition-all space-y-4 ${
              analysis.winnerModal === '99_PASS'
                ? 'bg-amber-950/25 border-amber-500/50 ring-1 ring-amber-500/30'
                : 'bg-white/5 border-white/10'
            }`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-xl">🟡</span>
                  <div>
                    <h4 className="text-sm font-black text-white">99 (PACOTES TAXA ZERO)</h4>
                    <span className="text-[10px] text-amber-400 font-bold">100% dos Ganhos no Período Contratado</span>
                  </div>
                </div>
                {analysis.winnerModal === '99_PASS' && (
                  <span className="text-[10px] font-black bg-amber-400 text-slate-950 px-2.5 py-0.5 rounded-full">
                    MAIS VANTAJOSO
                  </span>
                )}
              </div>

              {/* SELEÇÃO DO PACOTE 99 */}
              <div className="space-y-1.5">
                <span className="text-[11px] text-slate-400 font-bold block">Selecione o Pacote Taxa Zero:</span>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5 text-[10px]">
                  <button
                    type="button"
                    onClick={() => handlePass99CategoryChange('time_7d')}
                    className={`p-2 rounded-xl border text-center font-bold transition ${
                      pass99Category === 'time_7d'
                        ? 'bg-amber-400 text-slate-950 border-amber-300'
                        : 'bg-black/40 text-slate-300 border-white/10 hover:bg-white/5'
                    }`}
                  >
                    7 Dias (R$ 119,00)
                  </button>
                  <button
                    type="button"
                    onClick={() => handlePass99CategoryChange('time_3d')}
                    className={`p-2 rounded-xl border text-center font-bold transition ${
                      pass99Category === 'time_3d'
                        ? 'bg-amber-400 text-slate-950 border-amber-300'
                        : 'bg-black/40 text-slate-300 border-white/10 hover:bg-white/5'
                    }`}
                  >
                    3 Dias (R$ 68,00)
                  </button>
                  <button
                    type="button"
                    onClick={() => handlePass99CategoryChange('time_1d')}
                    className={`p-2 rounded-xl border text-center font-bold transition ${
                      pass99Category === 'time_1d'
                        ? 'bg-amber-400 text-slate-950 border-amber-300'
                        : 'bg-black/40 text-slate-300 border-white/10 hover:bg-white/5'
                    }`}
                  >
                    1 Dia (R$ 24,90)
                  </button>
                  <button
                    type="button"
                    onClick={() => handlePass99CategoryChange('earnings_300')}
                    className={`p-2 rounded-xl border text-center font-bold transition ${
                      pass99Category === 'earnings_300'
                        ? 'bg-amber-400 text-slate-950 border-amber-300'
                        : 'bg-black/40 text-slate-300 border-white/10 hover:bg-white/5'
                    }`}
                  >
                    R$ 300 Ganho (R$ 49,90)
                  </button>
                  <button
                    type="button"
                    onClick={() => handlePass99CategoryChange('earnings_150')}
                    className={`p-2 rounded-xl border text-center font-bold transition ${
                      pass99Category === 'earnings_150'
                        ? 'bg-amber-400 text-slate-950 border-amber-300'
                        : 'bg-black/40 text-slate-300 border-white/10 hover:bg-white/5'
                    }`}
                  >
                    R$ 150 Ganho (R$ 26,90)
                  </button>
                  <button
                    type="button"
                    onClick={() => handlePass99CategoryChange('custom')}
                    className={`p-2 rounded-xl border text-center font-bold transition ${
                      pass99Category === 'custom'
                        ? 'bg-amber-400 text-slate-950 border-amber-300'
                        : 'bg-black/40 text-slate-300 border-white/10 hover:bg-white/5'
                    }`}
                  >
                    Personalizado
                  </button>
                </div>
              </div>

              {pass99Category === 'custom' && (
                <div className="bg-white/5 p-2.5 rounded-xl border border-white/5 flex items-center justify-between text-xs">
                  <span className="text-slate-400">Valor do Pacote na sua Cidade:</span>
                  <input
                    type="number"
                    step="1.00"
                    value={customPass99Cost}
                    onChange={e => setCustomPass99Cost(Math.max(0, Number(e.target.value)))}
                    className="w-24 bg-black/60 border border-white/15 rounded px-2 py-1 font-bold text-white text-right"
                  />
                </div>
              )}

              {/* DETALHAMENTO FINANCEIRO 99 */}
              <div className="space-y-2 text-xs bg-black/40 p-3.5 rounded-xl border border-white/5">
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Taxa 99 Padrão SEM Pacote (~18.5%):</span>
                  <span className="text-rose-400 font-bold">{formatCurrency(analysis.standard99FeeCost)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Custo do Pacote + Taxa Residual:</span>
                  <span className="text-white font-black">{formatCurrency(analysis.totalCost99WithPass)}</span>
                </div>
                <div className="flex items-center justify-between pt-1.5 border-t border-white/5 text-emerald-400 font-black">
                  <span>Economia Líquida na Semana:</span>
                  <span className="text-sm">+{formatCurrency(analysis.netSavings99Weekly)}</span>
                </div>
                <div className="flex items-center justify-between text-emerald-300 text-[11px]">
                  <span>Projeção Mensal de Economia:</span>
                  <span className="font-bold">+{formatCurrency(analysis.netSavings99Monthly)}</span>
                </div>
              </div>

              <div className="text-[11px] text-amber-300/90 bg-amber-500/10 p-2.5 rounded-xl border border-amber-500/20 flex items-start gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
                <span>
                  <strong>Atenção ao relógio:</strong> Pacotes por tempo não podem ser pausados. Se comprar o pacote de 7 dias, programe-se para rodar firme todos os dias para maximizar o retorno!
                </span>
              </div>
            </div>

            {/* CARD UBER: UBER PRO & RECOMPENSAS */}
            <div className={`p-5 rounded-2xl border transition-all space-y-4 ${
              analysis.winnerModal === 'UBER_PRO'
                ? 'bg-zinc-900/90 border-zinc-500/50 ring-1 ring-zinc-500/30'
                : 'bg-white/5 border-white/10'
            }`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-xl">⚫</span>
                  <div>
                    <h4 className="text-sm font-black text-white">UBER (UBER PRO & CASHBACK)</h4>
                    <span className="text-[10px] text-slate-400 font-bold">Sem Custo de Assinatura • Benefícios por Pontuação</span>
                  </div>
                </div>
                {analysis.winnerModal === 'UBER_PRO' && (
                  <span className="text-[10px] font-black bg-white text-slate-950 px-2.5 py-0.5 rounded-full">
                    MAIS VANTAJOSO
                  </span>
                )}
              </div>

              {/* SELETOR DE NÍVEL UBER PRO */}
              <div className="space-y-1.5">
                <span className="text-[11px] text-slate-400 font-bold block">Seu Nível no Uber Pro:</span>
                <div className="grid grid-cols-4 gap-1.5 text-[10px]">
                  {(['diamond', 'platinum', 'gold', 'blue'] as const).map(tier => (
                    <button
                      key={tier}
                      type="button"
                      onClick={() => setUberProTier(tier)}
                      className={`p-2 rounded-xl border text-center font-bold capitalize transition ${
                        uberProTier === tier
                          ? 'bg-white text-slate-950 border-white font-black'
                          : 'bg-black/40 text-slate-300 border-white/10 hover:bg-white/5'
                      }`}
                    >
                      {tier === 'diamond' && '💎 Diamante (6%)'}
                      {tier === 'platinum' && '🥈 Platina (4%)'}
                      {tier === 'gold' && '🥇 Ouro (3%)'}
                      {tier === 'blue' && '🔹 Azul (1%)'}
                    </button>
                  ))}
                </div>
              </div>

              {/* TOGGLE NOVO GANHO EXTRA UBERX */}
              <div className="bg-white/5 p-2.5 rounded-xl border border-white/5 flex items-center justify-between text-xs">
                <div>
                  <span className="text-slate-300 font-bold block">Ganhos Extras UberX ({analysis.uberXBonusPercent * 100}%)</span>
                  <span className="text-[10px] text-slate-400">Benefício Ouro/Platina/Diamante em cidades selecionadas</span>
                </div>
                <button
                  type="button"
                  onClick={() => setUberBonusTierEligible(!uberBonusTierEligible)}
                  className={`w-10 h-5 rounded-full transition-colors relative shrink-0 ${
                    uberBonusTierEligible ? 'bg-emerald-500' : 'bg-slate-700'
                  }`}
                >
                  <div
                    className={`w-3.5 h-3.5 rounded-full bg-white transition-transform absolute top-0.5 ${
                      uberBonusTierEligible ? 'left-5' : 'left-1'
                    }`}
                  />
                </button>
              </div>

              {/* DETALHAMENTO FINANCEIRO UBER */}
              <div className="space-y-2 text-xs bg-black/40 p-3.5 rounded-xl border border-white/5">
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Taxa Média Retida (~23.5%):</span>
                  <span className="text-rose-400 font-bold">{formatCurrency(analysis.standardUberFeeCost)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Cashback Postos (Abastece Aí / Ipiranga):</span>
                  <span className="text-emerald-400 font-bold">-{formatCurrency(analysis.weeklyFuelSavingsUber)}/sem</span>
                </div>
                {analysis.weeklyUberExtraTierEarnings > 0 && (
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">Adicional de Nível UberX (+{analysis.uberXBonusPercent * 100}%):</span>
                    <span className="text-emerald-400 font-bold">+{formatCurrency(analysis.weeklyUberExtraTierEarnings)}/sem</span>
                  </div>
                )}
                <div className="flex items-center justify-between pt-1.5 border-t border-white/5 text-white font-black">
                  <span>Ganhos Líquidos Sem Taxas Fixas:</span>
                  <span className="text-sm">{formatCurrency(analysis.netTakeHomeUberPro)}</span>
                </div>
              </div>

              <div className="text-[11px] text-slate-300 bg-white/5 p-2.5 rounded-xl border border-white/10 space-y-0.5">
                <span className="font-bold text-white block">Vantagens Operacionais Uber Pro:</span>
                <p className="text-slate-400">
                  Prioridade em filas de aeroportos, destinos extras sem consumir limite diário e suporte prioritário 24 horas.
                </p>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* ABA 2: CATÁLOGO COMPLETO DE TIPOS E VALORES DE PASSES (99 E UBER) */}
      {/* ========================================================================= */}
      {activeTab === 'catalog' && (
        <div className="space-y-4 relative z-10">
          <div className="bg-black/30 p-4 rounded-2xl border border-white/10 text-xs text-slate-300 leading-relaxed">
            <span className="font-bold text-white block mb-1">📋 Como Funcionam os Passes e Pacotes no Brasil:</span>
            A <strong>99</strong> adota o modelo de <em>Pacote Taxa Zero</em> (pré-pago por tempo ou meta de ganhos), enquanto a <strong>Uber</strong> trabalha com o <em>Uber Pro</em> (benefícios conquistados por qualidade e pontuação) combinados com <em>Missões e Tarifas Turbo</em>. Veja os valores e regras oficiais:
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            
            {/* PACOTES 99 TAXA ZERO */}
            <div className="bg-amber-950/20 border border-amber-500/30 p-4 sm:p-5 rounded-2xl space-y-3">
              <div className="flex items-center gap-2 border-b border-amber-500/20 pb-3">
                <span className="text-xl">🟡</span>
                <div>
                  <h4 className="text-sm font-black text-white">PACOTES 99 TAXA ZERO (VALORES MÉDIOS)</h4>
                  <span className="text-[10px] text-amber-400">Disponível para 99Pop, Plus, Negocia e 99Moto</span>
                </div>
              </div>

              <div className="space-y-2.5 text-xs">
                
                {/* DIÁRIO */}
                <div className="bg-black/40 p-3 rounded-xl border border-white/5 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-black text-white flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-amber-400" /> Pacote 24 Horas (Diário)
                    </span>
                    <span className="text-amber-300 font-black">R$ 18,20 a R$ 40,99</span>
                  </div>
                  <p className="text-[11px] text-slate-300">
                    Garante 100% dos ganhos das corridas durante 24 horas consecutivas. Ativação imediata sem pausa.
                  </p>
                </div>

                {/* 3 DIAS */}
                <div className="bg-black/40 p-3 rounded-xl border border-white/5 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-black text-white flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-amber-400" /> Pacote 72 Horas (3 Dias / FDS)
                    </span>
                    <span className="text-amber-300 font-black">R$ 58,10 a R$ 78,99</span>
                  </div>
                  <p className="text-[11px] text-slate-300">
                    Excelente para quem foca nos fins de semana (Sexta, Sábado e Domingo). Não expira por limite de valor.
                  </p>
                </div>

                {/* 7 DIAS */}
                <div className="bg-black/40 p-3 rounded-xl border border-white/5 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-black text-white flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-amber-400" /> Pacote 168 Horas (Semanal)
                    </span>
                    <span className="text-amber-300 font-black">R$ 89,90 a R$ 149,90</span>
                  </div>
                  <p className="text-[11px] text-slate-300">
                    O favorito dos motoristas full-time. Paga-se com cerca de 18 a 25 corridas no início da semana.
                  </p>
                </div>

                {/* PACOTE POR GANHOS (SEM PRAZO DE 24H) */}
                <div className="bg-black/40 p-3 rounded-xl border border-white/5 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-black text-emerald-400 flex items-center gap-1.5">
                      <Target className="w-3.5 h-3.5 text-emerald-400" /> Pacotes por Meta de Ganhos (Até 180 dias)
                    </span>
                    <span className="text-emerald-300 font-black">R$ 14,99 a cada R$ 100</span>
                  </div>
                  <p className="text-[11px] text-slate-300">
                    Ex: Pague R$ 44,90 para ter taxa zero até faturar R$ 300. Ideal para motoristas de meio período ou horários livres.
                  </p>
                </div>

              </div>
            </div>

            {/* MODALIDADES UBER */}
            <div className="bg-zinc-900/80 border border-zinc-500/30 p-4 sm:p-5 rounded-2xl space-y-3">
              <div className="flex items-center gap-2 border-b border-zinc-500/20 pb-3">
                <span className="text-xl">⚫</span>
                <div>
                  <h4 className="text-sm font-black text-white">UBER PRO, TURBO & MISSÕES</h4>
                  <span className="text-[10px] text-slate-400">Recompensas por Performance e Desafios</span>
                </div>
              </div>

              <div className="space-y-2.5 text-xs">
                
                {/* UBER PRO NÍVEIS */}
                <div className="bg-black/40 p-3 rounded-xl border border-white/5 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-black text-white flex items-center gap-1.5">
                      <Award className="w-3.5 h-3.5 text-sky-400" /> Níveis Uber Pro (Azul a Diamante)
                    </span>
                    <span className="text-sky-300 font-black">Gratuito (Pontos)</span>
                  </div>
                  <p className="text-[11px] text-slate-300">
                    Cashback de 1% a 6% em combustíveis Ipiranga, até 12% em recarga elétrica, prioridade de aeroportos e destinos extras.
                  </p>
                </div>

                {/* UBER MISSÕES */}
                <div className="bg-black/40 p-3 rounded-xl border border-white/5 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-black text-emerald-400 flex items-center gap-1.5">
                      <Flame className="w-3.5 h-3.5 text-emerald-400" /> Desafios / Missões Semanais
                    </span>
                    <span className="text-emerald-300 font-black">+R$ 80 a +R$ 350 bônus</span>
                  </div>
                  <p className="text-[11px] text-slate-300">
                    Bônus pago diretamente na conta ao completar metas (ex: 40 viagens = +R$ 120 extras / 60 viagens = +R$ 250 extras).
                  </p>
                </div>

                {/* UBER TURBO / PREÇO DINÂMICO */}
                <div className="bg-black/40 p-3 rounded-xl border border-white/5 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-black text-amber-400 flex items-center gap-1.5">
                      <Zap className="w-3.5 h-3.5 text-amber-400" /> Tarifa Turbo / Horário Garantido
                    </span>
                    <span className="text-amber-300 font-black">+R$ 3,00 a +R$ 10,00/corrida</span>
                  </div>
                  <p className="text-[11px] text-slate-300">
                    Adicional fixo por corrida realizada dentro de zonas de alta demanda em horários pré-agendados.
                  </p>
                </div>

                {/* UBER CHIP & PARCERIAS */}
                <div className="bg-black/40 p-3 rounded-xl border border-white/5 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-black text-indigo-400 flex items-center gap-1.5">
                      <Gift className="w-3.5 h-3.5 text-indigo-400" /> Uber Chip & Saúde
                    </span>
                    <span className="text-indigo-300 font-black">Até 60% desconto</span>
                  </div>
                  <p className="text-[11px] text-slate-300">
                    Plano de celular com Waze e Uber ilimitados sem consumir franquia de internet, além de consultas TotalPass e Vale Saúde.
                  </p>
                </div>

              </div>
            </div>

          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* ABA 3: 5 ESTRATÉGIAS DE OURO PARA MELHOR UTILIZAR OS PASSES */}
      {/* ========================================================================= */}
      {activeTab === 'strategies' && (
        <div className="space-y-4 relative z-10">
          <div className="bg-gradient-to-r from-teal-950/60 to-slate-900 border border-teal-500/30 p-4 rounded-2xl text-xs text-teal-200">
            <span className="font-black text-white flex items-center gap-1.5 mb-1">
              <Lightbulb className="w-4 h-4 text-teal-400" />
              Guia Estratégico do Motorista Profissional:
            </span>
            Comprar passe sem planejamento pode dar prejuízo. Siga as 5 regras comprovadas para extrair o máximo de cada modalidade:
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            
            {/* ESTRATÉGIA 1 */}
            <div className="bg-white/5 border border-white/10 hover:border-amber-500/40 p-4 rounded-2xl space-y-2 transition">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black text-white flex items-center gap-1.5">
                  <span className="w-5 h-5 rounded-full bg-amber-400 text-slate-950 flex items-center justify-center text-[10px] font-black">1</span>
                  O Combo do Fim de Semana (Passe 72h 99)
                </span>
                <span className="text-[9px] font-bold bg-amber-500/20 text-amber-300 px-2 py-0.5 rounded-full">
                  Foco: Sex, Sáb, Dom
                </span>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed">
                Ative o pacote de <strong>3 dias (72h) da 99 na sexta-feira às 12h</strong>. Ele cobrirá toda a sexta à noite, sábado e domingo até o almoço de segunda. Nesse período de altíssimo volume de eventos e bares, 100% da receita fica com você sem comissão retida.
              </p>
            </div>

            {/* ESTRATÉGIA 2 */}
            <div className="bg-white/5 border border-white/10 hover:border-emerald-500/40 p-4 rounded-2xl space-y-2 transition">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black text-white flex items-center gap-1.5">
                  <span className="w-5 h-5 rounded-full bg-emerald-400 text-slate-950 flex items-center justify-center text-[10px] font-black">2</span>
                  Pacote por Meta para Quem Roda Pouco
                </span>
                <span className="text-[9px] font-bold bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded-full">
                  Foco: Part-Time
                </span>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed">
                Se você roda menos de 6 horas por dia ou tem outro emprego, <strong>NUNCA compre pacotes por tempo (24h/7d)</strong> porque o relógio continua rodando enquanto você descansa. Compre os <strong>pacotes por meta de faturamento (ex: R$ 300)</strong> que têm validade de 180 dias.
              </p>
            </div>

            {/* ESTRATÉGIA 3 */}
            <div className="bg-white/5 border border-white/10 hover:border-sky-500/40 p-4 rounded-2xl space-y-2 transition">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black text-white flex items-center gap-1.5">
                  <span className="w-5 h-5 rounded-full bg-sky-400 text-slate-950 flex items-center justify-center text-[10px] font-black">3</span>
                  Filtro de Corridas Curtas para Missões Uber
                </span>
                <span className="text-[9px] font-bold bg-sky-500/20 text-sky-300 px-2 py-0.5 rounded-full">
                  Foco: Bônus de Viagens
                </span>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed">
                Quando a Uber lançar missões como "50 viagens por +R$ 180", foque em <strong>bairros com alta densidade e trajetos curtos (3 a 5 km)</strong>. Uma corrida de R$ 10 vira R$ 13,60 pelo bônus da missão, permitindo bater a meta em menos horas de volante.
              </p>
            </div>

            {/* ESTRATÉGIA 4 */}
            <div className="bg-white/5 border border-white/10 hover:border-teal-500/40 p-4 rounded-2xl space-y-2 transition">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black text-white flex items-center gap-1.5">
                  <span className="w-5 h-5 rounded-full bg-teal-400 text-slate-950 flex items-center justify-center text-[10px] font-black">4</span>
                  Blindagem de Taxa em Corridas Longas
                </span>
                <span className="text-[9px] font-bold bg-teal-500/20 text-teal-300 px-2 py-0.5 rounded-full">
                  Foco: Viagens R$ 60+
                </span>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed">
                Em corridas de longa distância (R$ 80 a R$ 150), a taxa de 25% da Uber retém de <strong>R$ 20 a R$ 37,50</strong> em uma única corrida! Se você estiver com o <strong>Passe 99 Taxa Zero ativo</strong>, priorize aceitar viagens longas na 99 para receber o valor bruto integral.
              </p>
            </div>

            {/* ESTRATÉGIA 5 */}
            <div className="bg-white/5 border border-white/10 hover:border-purple-500/40 p-4 rounded-2xl space-y-2 transition md:col-span-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black text-white flex items-center gap-1.5">
                  <span className="w-5 h-5 rounded-full bg-purple-400 text-slate-950 flex items-center justify-center text-[10px] font-black">5</span>
                  Estratégia Híbrida Multi-App (O Melhor dos Dois Mundos)
                </span>
                <span className="text-[9px] font-bold bg-purple-500/20 text-purple-300 px-2 py-0.5 rounded-full">
                  Foco: Lucro Máximo
                </span>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed">
                Rode na <strong>99 com Passe Semanal Taxa Zero como aplicativo base</strong> para garantir ganho limpo em horários mornos. Mantenha a <strong>Uber ligada em segundo plano</strong>: só aceite chamadas da Uber quando houver <strong>tarifa dinâmica acima de 1.4x ou Turbo ativo</strong>, pois o valor adicional cobre a taxa da Uber e gera lucro superior!
              </p>
            </div>

          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* ABA 4: CALCULADORA DE MISSÕES & DESAFIOS DA UBER */}
      {/* ========================================================================= */}
      {activeTab === 'missions' && (
        <div className="space-y-4 relative z-10">
          <div className="bg-black/30 p-4 sm:p-5 rounded-2xl border border-white/10 space-y-4">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div className="flex items-center gap-2">
                <Target className="w-5 h-5 text-emerald-400" />
                <div>
                  <h4 className="text-sm font-black text-white">CALCULADORA DE META & MISSÃO UBER</h4>
                  <span className="text-[10px] text-slate-400">Descubra quanto cada corrida da missão agrega ao seu bolso</span>
                </div>
              </div>
              <span className={`text-xs font-black px-2.5 py-1 rounded-full border ${
                missionAnalysis.isCompleted
                  ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                  : 'bg-amber-500/20 text-amber-300 border-amber-500/40'
              }`}>
                {missionAnalysis.isCompleted ? '🎉 Missão Cumprida!' : `${missionAnalysis.progressPercent}% Concluído`}
              </span>
            </div>

            {/* INPUTS DA MISSÃO */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              <div className="bg-white/5 p-3 rounded-xl border border-white/5 space-y-1">
                <label className="text-slate-400 font-bold block">Meta de Viagens da Missão:</label>
                <input
                  type="number"
                  min="5"
                  max="120"
                  step="5"
                  value={missionTargetTrips}
                  onChange={e => setMissionTargetTrips(Math.max(1, Number(e.target.value)))}
                  className="w-full bg-black/60 border border-white/15 rounded-lg px-2.5 py-1.5 font-bold text-white text-sm"
                />
              </div>

              <div className="bg-white/5 p-3 rounded-xl border border-white/5 space-y-1">
                <label className="text-slate-400 font-bold block">Bônus Prometido (R$):</label>
                <input
                  type="number"
                  min="20"
                  max="800"
                  step="10"
                  value={missionBonusAmount}
                  onChange={e => setMissionBonusAmount(Math.max(0, Number(e.target.value)))}
                  className="w-full bg-black/60 border border-white/15 rounded-lg px-2.5 py-1.5 font-bold text-emerald-400 text-sm"
                />
              </div>

              <div className="bg-white/5 p-3 rounded-xl border border-white/5 space-y-1">
                <label className="text-slate-400 font-bold block">Viagens Já Realizadas:</label>
                <input
                  type="number"
                  min="0"
                  max={missionTargetTrips}
                  value={missionCurrentTrips}
                  onChange={e => setMissionCurrentTrips(Math.max(0, Number(e.target.value)))}
                  className="w-full bg-black/60 border border-white/15 rounded-lg px-2.5 py-1.5 font-bold text-white text-sm"
                />
              </div>
            </div>

            {/* RESULTADOS DA MISSÃO */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-center">
              <div className="bg-white/5 p-3 rounded-xl border border-white/5 space-y-0.5">
                <span className="text-[10px] text-slate-400 uppercase font-bold">Faltam Realizar</span>
                <div className="text-base font-black text-amber-400">
                  {missionAnalysis.remainingTrips} viagens
                </div>
              </div>

              <div className="bg-white/5 p-3 rounded-xl border border-white/5 space-y-0.5">
                <span className="text-[10px] text-slate-400 uppercase font-bold">Bônus Por Corrida</span>
                <div className="text-base font-black text-emerald-400">
                  +{formatCurrency(missionAnalysis.bonusPerTrip)}
                </div>
              </div>

              <div className="bg-white/5 p-3 rounded-xl border border-white/5 space-y-0.5">
                <span className="text-[10px] text-slate-400 uppercase font-bold">Valor por Restante</span>
                <div className="text-base font-black text-sky-400">
                  +{formatCurrency(missionAnalysis.bonusPerRemainingTrip)}
                </div>
              </div>

              <div className="bg-emerald-950/40 p-3 rounded-xl border border-emerald-500/30 space-y-0.5">
                <span className="text-[10px] text-emerald-300 uppercase font-black">Bônus no Bolso</span>
                <div className="text-base font-black text-emerald-400">
                  {formatCurrency(missionBonusAmount)}
                </div>
              </div>
            </div>

            {/* BARRA DE PROGRESSO */}
            <div className="space-y-1">
              <div className="flex justify-between text-xs text-slate-400">
                <span>Progresso: {missionCurrentTrips} de {missionTargetTrips} viagens</span>
                <span className="text-emerald-400 font-bold">{missionAnalysis.progressPercent}%</span>
              </div>
              <div className="w-full h-2.5 bg-slate-950 rounded-full overflow-hidden p-0.5 border border-white/10">
                <div
                  style={{ width: `${missionAnalysis.progressPercent}%` }}
                  className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 rounded-full transition-all"
                />
              </div>
            </div>

            <p className="text-xs text-slate-300 bg-white/5 p-3 rounded-xl border border-white/5">
              💡 <strong>Dica tática:</strong> Cada uma das {missionAnalysis.remainingTrips} corridas restantes está valendo <strong>+{formatCurrency(missionAnalysis.bonusPerRemainingTrip)} a mais</strong> além da tarifa normal. Se fizer 10 corridas curtas hoje, você garante {formatCurrency(missionAnalysis.bonusPerRemainingTrip * 10)} só em bônus!
            </p>
          </div>
        </div>
      )}

    </div>
  );
};

