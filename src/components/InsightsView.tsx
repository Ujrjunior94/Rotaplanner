import React, { useMemo, useState } from 'react';
import { useDriver } from '../context/DriverContext';
import { formatCurrency, formatKm, safeDivide } from '../utils/calc';
import { ProfitabilitySimulatorCard } from './ProfitabilitySimulatorCard';
import { PlatformComparisonCard } from './PlatformComparisonCard';
import { VehicleSpecsCard } from './VehicleSpecsCard';
import { AppPassesComparisonCard } from './AppPassesComparisonCard';
import { StrategyBuilderCard } from './StrategyBuilderCard';
import {
  Lightbulb,
  Zap,
  TrendingUp,
  AlertCircle,
  Clock,
  Fuel,
  Award,
  BarChart3,
  Car,
  Layers,
  Sparkles,
  Ticket,
  Calculator,
} from 'lucide-react';

export const InsightsView: React.FC = () => {
  const { sessions, earnings, expenses, fuelRecords, vehicle, profile } = useDriver();
  const [activeSubTab, setActiveSubTab] = useState<'all' | 'strategies' | 'simulator' | 'platforms' | 'passes' | 'vehicle' | 'financial'>('strategies');

  const insights = useMemo(() => {
    if (sessions.length < 3) {
      return null;
    }

    const items: { id: string; title: string; desc: string; type: 'success' | 'warning' | 'info'; icon: React.ElementType }[] = [];

    // 1. ANÁLISE DE DIA MAIS LUCRATIVO
    const dayProfits: Record<number, { gross: number; exp: number; count: number }> = {};
    sessions.forEach(s => {
      const day = new Date(s.startTime).getDay();
      if (!dayProfits[day]) dayProfits[day] = { gross: 0, exp: 0, count: 0 };
      dayProfits[day].gross += s.grossEarnings + s.tips;
      dayProfits[day].exp += s.fuelExpenses + s.otherExpenses;
      dayProfits[day].count += 1;
    });

    const dayNames = ['Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado'];
    let bestDay = 5;
    let maxAvgNet = 0;

    Object.entries(dayProfits).forEach(([d, val]) => {
      const net = val.gross - val.exp;
      const avgNet = safeDivide(net, val.count);
      if (avgNet > maxAvgNet) {
        maxAvgNet = avgNet;
        bestDay = Number(d);
      }
    });

    if (maxAvgNet > 0) {
      items.push({
        id: 'ins-best-day',
        title: `Seu dia mais rentável é ${dayNames[bestDay]}`,
        desc: `Com média líquida de ${formatCurrency(maxAvgNet)} por turno. Vale a pena priorizar sua escala e estender a jornada neste dia.`,
        type: 'success',
        icon: TrendingUp,
      });
    }

    // 2. ANÁLISE DE PESO DO COMBUSTÍVEL
    const totalGross = sessions.reduce((acc, s) => acc + s.grossEarnings + s.tips, 0);
    const fuelMethod = profile.fuelCalculationMethod || 'hibrido';
    const totalFuel = fuelMethod === 'real_abastecimento' && fuelRecords.length > 0
      ? fuelRecords.reduce((sum, f) => sum + f.totalAmount, 0)
      : sessions.reduce((acc, s) => acc + s.fuelExpenses, 0);
    const fuelShare = safeDivide(totalFuel, totalGross) * 100;

    if (fuelShare > 30) {
      items.push({
        id: 'ins-fuel-heavy',
        title: `Atenção: O combustível consome ${fuelShare.toFixed(1)}% do seu faturamento`,
        desc: `Taxa acima do ideal (20-25%). Experimente calibrar pneus semanalmente e evitar corridas com deslocamento vazio longo.`,
        type: 'warning',
        icon: Fuel,
      });
    } else if (fuelShare > 0) {
      items.push({
        id: 'ins-fuel-good',
        title: `Excelente gestão de combustível (${fuelShare.toFixed(1)}% do faturamento)`,
        desc: `Seu gasto com combustível está saudável em relação ao faturamento bruto total gerado.`,
        type: 'success',
        icon: Fuel,
      });
    }

    // 3. ANÁLISE DE GANHO POR KM
    const totalKm = sessions.reduce((acc, s) => {
      if (s.endOdometer && s.startOdometer) return acc + (s.endOdometer - s.startOdometer);
      return acc;
    }, 0);
    const avgRatePerKm = safeDivide(totalGross, totalKm);

    if (avgRatePerKm < profile.minAcceptableRateKm && totalKm > 0) {
      items.push({
        id: 'ins-rate-km-low',
        title: `Média de ganho por KM (${formatCurrency(avgRatePerKm)}/km) abaixo da sua meta`,
        desc: `Sua meta mínima configurada é ${formatCurrency(profile.minAcceptableRateKm)}/km. Use o analisador "Vale a Pena?" para filtrar corridas com baixa remuneração.`,
        type: 'warning',
        icon: AlertCircle,
      });
    } else if (totalKm > 0) {
      items.push({
        id: 'ins-rate-km-ok',
        title: `Média de ${formatCurrency(avgRatePerKm)}/km acima da sua meta de corte`,
        desc: `Você está mantendo um excelente critério de seleção de viagens sem desgastar o veículo excessivamente.`,
        type: 'success',
        icon: Award,
      });
    }

    return items;
  }, [sessions, earnings, expenses, fuelRecords, vehicle, profile]);

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* HEADER */}
      <div className="bg-white/5 backdrop-blur-lg border border-white/10 p-5 sm:p-6 rounded-3xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-emerald-500 to-teal-400 text-slate-950 flex items-center justify-center font-black shadow-lg shadow-emerald-500/20 shrink-0">
              <Lightbulb className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black text-white tracking-tight flex items-center gap-2">
                INSIGHTS & INTELIGÊNCIA OPERACIONAL
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Comparativo de rendimento por aplicativo, autonomia padrão do veículo e diagnóstico financeiro real.
              </p>
            </div>
          </div>

          {/* FILTRO DE VISUALIZAÇÃO */}
          <div className="flex items-center gap-1.5 bg-black/40 p-1 rounded-2xl border border-white/10 self-start sm:self-auto overflow-x-auto custom-scrollbar">
            <button
              type="button"
              onClick={() => setActiveSubTab('strategies')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 whitespace-nowrap ${
                activeSubTab === 'strategies'
                  ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20 font-black'
                  : 'text-emerald-400 hover:text-emerald-300'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" />
              Estratégias & Playbook
            </button>
            <button
              type="button"
              onClick={() => setActiveSubTab('all')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 whitespace-nowrap ${
                activeSubTab === 'all'
                  ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20 font-black'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              Visão Geral
            </button>
            <button
              type="button"
              onClick={() => setActiveSubTab('simulator')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 whitespace-nowrap ${
                activeSubTab === 'simulator'
                  ? 'bg-teal-400 text-slate-950 shadow-md shadow-teal-400/20 font-black'
                  : 'text-teal-400 hover:text-teal-200'
              }`}
            >
              <Calculator className="w-3.5 h-3.5" />
              Simulador R$/km
            </button>
            <button
              type="button"
              onClick={() => setActiveSubTab('platforms')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 whitespace-nowrap ${
                activeSubTab === 'platforms'
                  ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20 font-black'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <BarChart3 className="w-3.5 h-3.5" />
              Apps (R$/h)
            </button>
            <button
              type="button"
              onClick={() => setActiveSubTab('passes')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 whitespace-nowrap ${
                activeSubTab === 'passes'
                  ? 'bg-amber-400 text-slate-950 shadow-md shadow-amber-400/20 font-black'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Ticket className="w-3.5 h-3.5 text-amber-400" />
              Passes Uber vs 99
            </button>
            <button
              type="button"
              onClick={() => setActiveSubTab('vehicle')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 whitespace-nowrap ${
                activeSubTab === 'vehicle'
                  ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20 font-black'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Car className="w-3.5 h-3.5" />
              Veículo & Autonomia
            </button>
            <button
              type="button"
              onClick={() => setActiveSubTab('financial')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 whitespace-nowrap ${
                activeSubTab === 'financial'
                  ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20 font-black'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <TrendingUp className="w-3.5 h-3.5" />
              Diagnóstico
            </button>
          </div>
        </div>
      </div>

      {/* 0. SEÇÃO DE ESTRATÉGIAS OPERACIONAIS & PLAYBOOK */}
      {(activeSubTab === 'all' || activeSubTab === 'strategies') && (
        <StrategyBuilderCard />
      )}

      {/* 1. SEÇÃO DE SIMULADOR DE RENTABILIDADE POR KM */}
      {(activeSubTab === 'all' || activeSubTab === 'simulator') && (
        <ProfitabilitySimulatorCard />
      )}

      {/* 2. SEÇÃO DE COMPARAÇÃO DE APLICATIVOS (UBER vs 99 vs INDRIVE) */}
      {(activeSubTab === 'all' || activeSubTab === 'platforms') && (
        <PlatformComparisonCard />
      )}

      {/* 3. SEÇÃO DE PASSES E TAXAS (UBER vs 99) */}
      {activeSubTab === 'passes' && (
        <AppPassesComparisonCard />
      )}

      {/* 4. SEÇÃO DE FICHA TÉCNICA E AUTONOMIA PADRÃO DO VEÍCULO */}
      {(activeSubTab === 'all' || activeSubTab === 'vehicle') && (
        <VehicleSpecsCard />
      )}

      {/* 5. SEÇÃO DE DIAGNÓSTICO E PADRÕES FINANCEIROS */}
      {(activeSubTab === 'all' || activeSubTab === 'financial') && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-black text-slate-300 uppercase tracking-wider flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-emerald-400" />
              DIAGNÓSTICO FINANCEIRO & PADRÕES DE TRABALHO
            </h3>
            {sessions.length > 0 && (
              <span className="text-[11px] text-slate-400">
                Baseado em {sessions.length} turnos registrados
              </span>
            )}
          </div>

          {!insights || insights.length === 0 ? (
            <div className="text-center py-10 px-4 bg-white/5 backdrop-blur-lg border border-white/10 rounded-3xl">
              <Lightbulb className="w-10 h-10 text-slate-500 mx-auto mb-2.5 opacity-60" />
              <h4 className="text-sm font-bold text-slate-200">
                Continue registrando seus expedientes para gerar o diagnóstico
              </h4>
              <p className="text-xs text-slate-400 max-w-md mx-auto mt-1">
                O diagnóstico precisa de pelo menos 3 turnos concluídos para calcular médias precisas de dias e custos operacionais.
              </p>
            </div>
          ) : (
            <div className="space-y-3.5">
              {insights.map(item => {
                const Icon = item.icon;
                return (
                  <div
                    key={item.id}
                    className={`p-5 rounded-2xl border transition-all ${
                      item.type === 'success'
                        ? 'bg-emerald-500/10 border-emerald-500/30 shadow-lg shadow-emerald-500/5'
                        : item.type === 'warning'
                        ? 'bg-amber-500/10 border-amber-500/30 shadow-lg shadow-amber-500/5'
                        : 'bg-white/5 border-white/10'
                    }`}
                  >
                    <div className="flex items-start gap-3.5">
                      <div className={`p-2.5 rounded-xl shrink-0 ${
                        item.type === 'success' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-amber-500/20 text-amber-400'
                      }`}>
                        <Icon className="w-5 h-5" />
                      </div>
                      <div>
                        <h4 className="text-sm font-black text-white">{item.title}</h4>
                        <p className="text-xs text-slate-300 mt-1 leading-relaxed">{item.desc}</p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

