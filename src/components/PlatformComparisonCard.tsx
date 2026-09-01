import React, { useMemo, useState } from 'react';
import { useDriver } from '../context/DriverContext';
import { PlatformType } from '../types';
import { formatCurrency, formatKm, safeDivide } from '../utils/calc';
import { AppPassesComparisonCard } from './AppPassesComparisonCard';
import {
  TrendingUp,
  Award,
  Clock,
  Car,
  DollarSign,
  Zap,
  ChevronRight,
  Info,
  Layers,
  Sparkles,
  BarChart3,
  CheckCircle2,
  AlertTriangle,
  Ticket,
} from 'lucide-react';

interface PlatformStat {
  platform: PlatformType;
  grossAmount: number;
  tipsAmount: number;
  totalAmount: number;
  tripsCount: number;
  estimatedHours: number;
  ratePerHour: number;
  avgTicket: number;
  ratePerKm: number;
  totalKm: number;
  percentageShare: number;
  colorBg: string;
  colorBorder: string;
  colorText: string;
  brandColor: string;
  badge: string;
}

export const PlatformComparisonCard: React.FC = () => {
  const { sessions, earnings, profile } = useDriver();
  const [activeMainTab, setActiveMainTab] = useState<'ranking' | 'passes'>('ranking');
  const [selectedPeriod, setSelectedPeriod] = useState<'all' | '30days' | '7days'>('all');

  // Filtrar sessões e ganhos pelo período selecionado
  const filteredData = useMemo(() => {
    const now = new Date().getTime();
    const daysLimit = selectedPeriod === '7days' ? 7 : selectedPeriod === '30days' ? 30 : 9999;
    const cutoffTime = now - daysLimit * 24 * 3600 * 1000;

    const filteredEarnings = earnings.filter(e => {
      if (selectedPeriod === 'all') return true;
      return new Date(e.timestamp).getTime() >= cutoffTime;
    });

    const filteredSessions = sessions.filter(s => {
      if (selectedPeriod === 'all') return true;
      return new Date(s.startTime).getTime() >= cutoffTime;
    });

    return { filteredEarnings, filteredSessions };
  }, [sessions, earnings, selectedPeriod]);

  // Estatísticas calculadas por plataforma
  const platformStats = useMemo(() => {
    const { filteredEarnings, filteredSessions } = filteredData;

    // Inicializar mapa de plataformas
    const platforms: PlatformType[] = ['Uber', '99', 'inDrive', 'Particular'];
    const dataMap: Record<PlatformType, {
      gross: number;
      tips: number;
      trips: number;
      km: number;
      minutes: number;
      sessionTimeWeight: number;
    }> = {
      Uber: { gross: 0, tips: 0, trips: 0, km: 0, minutes: 0, sessionTimeWeight: 0 },
      99: { gross: 0, tips: 0, trips: 0, km: 0, minutes: 0, sessionTimeWeight: 0 },
      inDrive: { gross: 0, tips: 0, trips: 0, km: 0, minutes: 0, sessionTimeWeight: 0 },
      Particular: { gross: 0, tips: 0, trips: 0, km: 0, minutes: 0, sessionTimeWeight: 0 },
      Outro: { gross: 0, tips: 0, trips: 0, km: 0, minutes: 0, sessionTimeWeight: 0 },
    };

    // 1. Somar a partir dos registros detalhados de Earnings
    filteredEarnings.forEach(e => {
      const p = e.platform || 'Uber';
      if (!dataMap[p]) {
        dataMap[p] = { gross: 0, tips: 0, trips: 0, km: 0, minutes: 0, sessionTimeWeight: 0 };
      }
      dataMap[p].gross += e.amount;
      dataMap[p].tips += e.tip || 0;
      dataMap[p].trips += e.tripsCount || 1;
      dataMap[p].km += e.distanceKm || 0;
      dataMap[p].minutes += e.durationMinutes || 0;
    });

    // 2. Somar a partir das sessões de trabalho consolidadas (caso não haja earnings detalhados para cada sessão)
    let totalSessionHours = 0;
    filteredSessions.forEach(s => {
      if (!s.endTime) return;
      const durationHours = (new Date(s.endTime).getTime() - new Date(s.startTime).getTime()) / 3600000;
      totalSessionHours += durationHours;

      if (s.platformEarnings) {
        Object.entries(s.platformEarnings).forEach(([platKey, val]) => {
          const p = platKey as PlatformType;
          const platVal = val as { amount: number; trips?: number } | undefined;
          if (platVal && platVal.amount > 0) {
            // Se já não tiver vindo via earnings
            if (filteredEarnings.length === 0) {
              if (!dataMap[p]) dataMap[p] = { gross: 0, tips: 0, trips: 0, km: 0, minutes: 0, sessionTimeWeight: 0 };
              dataMap[p].gross += platVal.amount;
              dataMap[p].trips += platVal.trips || 1;
            }
            // Ponderação do tempo de sessão proporcional ao faturamento do app no turno
            const sessionTotalGross = s.grossEarnings || 1;
            const ratio = safeDivide(platVal.amount, sessionTotalGross);
            if (dataMap[p]) {
              dataMap[p].sessionTimeWeight += durationHours * ratio;
            }
          }
        });
      }
    });

    const grandTotalGross = Object.values(dataMap).reduce((acc, v) => acc + v.gross + v.tips, 0);

    const result: PlatformStat[] = [];

    const brandConfigs: Record<PlatformType, { colorBg: string; colorBorder: string; colorText: string; brandColor: string }> = {
      Uber: {
        colorBg: 'bg-zinc-900/60',
        colorBorder: 'border-zinc-700/60',
        colorText: 'text-zinc-200',
        brandColor: '#ffffff',
      },
      99: {
        colorBg: 'bg-amber-950/30',
        colorBorder: 'border-amber-500/40',
        colorText: 'text-amber-300',
        brandColor: '#f59e0b',
      },
      inDrive: {
        colorBg: 'bg-emerald-950/30',
        colorBorder: 'border-emerald-500/40',
        colorText: 'text-emerald-300',
        brandColor: '#10b981',
      },
      Particular: {
        colorBg: 'bg-purple-950/30',
        colorBorder: 'border-purple-500/40',
        colorText: 'text-purple-300',
        brandColor: '#a855f7',
      },
      Outro: {
        colorBg: 'bg-slate-900/60',
        colorBorder: 'border-slate-700/60',
        colorText: 'text-slate-300',
        brandColor: '#64748b',
      },
    };

    platforms.forEach(platform => {
      const data = dataMap[platform];
      if (!data || (data.gross === 0 && data.trips === 0)) return;

      const totalAmount = data.gross + data.tips;
      const tripsCount = Math.max(data.trips, 1);

      // Calcular horas dedicadas à plataforma
      let estimatedHours = 0;
      if (data.sessionTimeWeight > 0) {
        estimatedHours = data.sessionTimeWeight;
      } else if (data.minutes > 0) {
        estimatedHours = data.minutes / 60;
      } else if (totalSessionHours > 0 && grandTotalGross > 0) {
        estimatedHours = totalSessionHours * (totalAmount / grandTotalGross);
      } else {
        // Média de mercado de 22 minutos por corrida
        estimatedHours = (tripsCount * 22) / 60;
      }

      estimatedHours = Math.max(estimatedHours, 0.5);

      const ratePerHour = safeDivide(totalAmount, estimatedHours);
      const avgTicket = safeDivide(totalAmount, tripsCount);
      const ratePerKm = data.km > 0 ? safeDivide(totalAmount, data.km) : 0;
      const percentageShare = grandTotalGross > 0 ? (totalAmount / grandTotalGross) * 100 : 0;

      const cfg = brandConfigs[platform] || brandConfigs.Outro;

      result.push({
        platform,
        grossAmount: data.gross,
        tipsAmount: data.tips,
        totalAmount,
        tripsCount,
        estimatedHours,
        ratePerHour,
        avgTicket,
        ratePerKm,
        totalKm: data.km,
        percentageShare,
        ...cfg,
        badge: '',
      });
    });

    // Ordenar do maior R$/hora para o menor
    result.sort((a, b) => b.ratePerHour - a.ratePerHour);

    // Atribuir medalhas
    if (result.length > 0) result[0].badge = '🥇 1º Mais Lucrativo';
    if (result.length > 1) result[1].badge = '🥈 2º Lugar';
    if (result.length > 2) result[2].badge = '🥉 3º Lugar';

    return result;
  }, [filteredData]);

  // Vencedor e conclusões estatísticas
  const topApp = platformStats[0];
  const secondApp = platformStats[1];

  const comparisonVerdict = useMemo(() => {
    if (!topApp) return null;

    if (!secondApp) {
      return {
        title: `${topApp.platform} é sua principal fonte de faturamento`,
        text: `Com média de ${formatCurrency(topApp.ratePerHour)}/hora e ticket médio de ${formatCurrency(topApp.avgTicket)} por corrida. Adicione registros de outras plataformas (99, inDrive) para desbloquear a comparação direta.`,
        diffPercent: 0,
      };
    }

    const diffPercent = safeDivide(topApp.ratePerHour - secondApp.ratePerHour, secondApp.ratePerHour) * 100;

    let text = `O aplicativo ${topApp.platform} está rendendo ${diffPercent > 0 ? `+${diffPercent.toFixed(1)}%` : 'igual'} por hora em relação ao ${secondApp.platform}. `;
    
    if (topApp.platform === 'Uber') {
      text += `O Uber apresenta maior densidade de viagens consecutivas e volume de gorjetas. Mantenha o Uber prioritário durante os horários de pico.`;
    } else if (topApp.platform === '99') {
      text += `A 99 está gerando maior rendimento líquido por hora, provavelmente devido a menores taxas de desconto da plataforma ou dinâmicos locais mais agressivos.`;
    } else if (topApp.platform === 'inDrive') {
      text += `O inDrive destaca-se por permitir negociação de preço, gerando maior rentabilidade por hora nas corridas selecionadas.`;
    } else if (topApp.platform === 'Particular') {
      text += `Corridas particulares não pagam taxa de aplicativo, gerando a maior margem líquida por hora e por km rodado.`;
    }

    return {
      title: `🏆 ${topApp.platform} lidera o rendimento por hora com ${formatCurrency(topApp.ratePerHour)}/h`,
      text,
      diffPercent,
    };
  }, [topApp, secondApp]);

  return (
    <div className="bg-gradient-to-br from-slate-900 via-slate-900/95 to-emerald-950/20 border border-white/15 p-5 sm:p-6 rounded-3xl space-y-5 shadow-xl relative overflow-hidden">
      
      {/* GLOW DECORATIVO */}
      <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* HEADER DA SEÇÃO DE COMPARAÇÃO */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/10 pb-4 relative z-10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-amber-400 to-emerald-400 text-slate-950 flex items-center justify-center font-black shadow-lg shadow-emerald-500/20 shrink-0">
            <BarChart3 className="w-5 h-5 stroke-[2.5]" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm sm:text-base font-black text-white tracking-tight uppercase">
                COMPARAÇÃO DE APLICATIVOS (UBER vs 99 vs INDRIVE)
              </h3>
              <span className="text-[10px] bg-emerald-500/20 text-emerald-300 font-bold px-2 py-0.5 rounded-full border border-emerald-500/30">
                {activeMainTab === 'ranking' ? 'R$/Hora Real' : 'Taxas & Passes'}
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Descubra qual app rende mais por hora e simule os custos dos passes de taxa da 99 vs Uber Pro.
            </p>
          </div>
        </div>

        {/* TABS DE MODALIDADE (RANKING vs PASSES) */}
        <div className="flex items-center gap-1.5 bg-black/40 p-1 rounded-2xl border border-white/10 self-start sm:self-auto">
          <button
            type="button"
            onClick={() => setActiveMainTab('ranking')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
              activeMainTab === 'ranking'
                ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20 font-black'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <BarChart3 className="w-3.5 h-3.5" />
            Rentabilidade R$/h
          </button>
          <button
            type="button"
            onClick={() => setActiveMainTab('passes')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
              activeMainTab === 'passes'
                ? 'bg-amber-400 text-slate-950 shadow-md shadow-amber-400/20 font-black'
                : 'text-amber-400/80 hover:text-amber-300 hover:bg-white/5'
            }`}
          >
            <Ticket className="w-3.5 h-3.5" />
            Passes Uber vs 99
          </button>
        </div>
      </div>

      {activeMainTab === 'passes' ? (
        <div className="relative z-10">
          <AppPassesComparisonCard />
        </div>
      ) : (
        <>
          {/* FILTRO DE PERÍODO (RANKING) */}
          <div className="flex items-center justify-between gap-2 relative z-10">
            <span className="text-xs font-bold text-slate-400">Filtrar histórico por período:</span>
            <div className="flex items-center gap-1 bg-black/40 p-1 rounded-xl border border-white/10">
              <button
                type="button"
                onClick={() => setSelectedPeriod('7days')}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition ${
                  selectedPeriod === '7days' ? 'bg-emerald-500 text-slate-950' : 'text-slate-400 hover:text-white'
                }`}
              >
                7 Dias
              </button>
              <button
                type="button"
                onClick={() => setSelectedPeriod('30days')}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition ${
                  selectedPeriod === '30days' ? 'bg-emerald-500 text-slate-950' : 'text-slate-400 hover:text-white'
                }`}
              >
                30 Dias
              </button>
              <button
                type="button"
                onClick={() => setSelectedPeriod('all')}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition ${
                  selectedPeriod === 'all' ? 'bg-emerald-500 text-slate-950' : 'text-slate-400 hover:text-white'
                }`}
              >
                Geral
              </button>
            </div>
          </div>

      {platformStats.length === 0 ? (
        <div className="bg-black/30 border border-white/10 rounded-2xl p-6 text-center space-y-2">
          <Info className="w-8 h-8 text-slate-400 mx-auto opacity-70" />
          <h4 className="text-sm font-bold text-white">Nenhum ganho por aplicativo registrado no período</h4>
          <p className="text-xs text-slate-400 max-w-md mx-auto">
            Ao finalizar seus turnos ou adicionar corridas rápidas, informe a plataforma (Uber, 99 ou inDrive) para calcular a rentabilidade por hora automaticamente.
          </p>
        </div>
      ) : (
        <>
          {/* VEREDITO INTELIGENTE DO APP MAIS LUCRATIVO */}
          {comparisonVerdict && (
            <div className="bg-gradient-to-r from-emerald-950/50 via-slate-900 to-emerald-950/40 border border-emerald-500/40 p-4 sm:p-5 rounded-2xl relative z-10 space-y-2 shadow-lg shadow-emerald-500/5">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-amber-400 shrink-0" />
                  <h4 className="text-xs sm:text-sm font-black text-white">
                    {comparisonVerdict.title}
                  </h4>
                </div>
                {comparisonVerdict.diffPercent > 0 && (
                  <span className="text-[11px] font-black bg-emerald-500 text-slate-950 px-2 py-0.5 rounded-full shrink-0">
                    +{comparisonVerdict.diffPercent.toFixed(1)}% mais rentável
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-300 leading-relaxed">
                {comparisonVerdict.text}
              </p>
            </div>
          )}

          {/* GRID DE CARDS COMPARATIVOS POR APLICATIVO */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5 relative z-10">
            {platformStats.map((stat, index) => {
              const isWinner = index === 0;
              return (
                <div
                  key={stat.platform}
                  className={`p-4 rounded-2xl border transition-all duration-200 flex flex-col justify-between relative overflow-hidden ${
                    stat.colorBg
                  } ${stat.colorBorder} ${
                    isWinner ? 'ring-1 ring-emerald-400/50 shadow-lg shadow-emerald-500/10' : ''
                  }`}
                >
                  {/* BADGE DE RANKING */}
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <span className="text-base font-black text-white flex items-center gap-1.5">
                        {stat.platform === 'Uber' && '⚫'}
                        {stat.platform === '99' && '🟡'}
                        {stat.platform === 'inDrive' && '🟢'}
                        {stat.platform === 'Particular' && '🟣'}
                        {stat.platform}
                      </span>
                    </div>
                    <span className={`text-[10px] font-black px-2 py-0.5 rounded-full border ${
                      isWinner
                        ? 'bg-amber-400 text-slate-950 border-amber-300 font-extrabold'
                        : 'bg-white/10 text-slate-300 border-white/10'
                    }`}>
                      {stat.badge}
                    </span>
                  </div>

                  {/* MÉTRICA PRINCIPAL: R$/HORA */}
                  <div className="bg-black/40 p-3 rounded-xl border border-white/10 mb-3 space-y-0.5">
                    <span className="text-[10px] font-bold text-slate-400 block uppercase">
                      Rendimento Médio por Hora
                    </span>
                    <div className="flex items-baseline gap-1.5">
                      <span className={`text-xl sm:text-2xl font-black ${
                        isWinner ? 'text-emerald-400' : 'text-white'
                      }`}>
                        {formatCurrency(stat.ratePerHour)}
                      </span>
                      <span className="text-xs text-slate-400 font-bold">/ hora</span>
                    </div>

                    {/* Comparação com a meta do motorista */}
                    <div className="flex items-center gap-1 pt-1 text-[10px]">
                      {stat.ratePerHour >= profile.minAcceptableRateHour ? (
                        <span className="text-emerald-400 font-bold flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" /> Acima da meta ({formatCurrency(profile.minAcceptableRateHour)}/h)
                        </span>
                      ) : (
                        <span className="text-amber-400 font-bold flex items-center gap-1">
                          <AlertTriangle className="w-3 h-3" /> Abaixo da meta ({formatCurrency(profile.minAcceptableRateHour)}/h)
                        </span>
                      )}
                    </div>
                  </div>

                  {/* SUBMÉTRICAS DETALHADAS */}
                  <div className="space-y-2 text-xs border-t border-white/10 pt-3">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400">Total Faturado:</span>
                      <span className="font-bold text-white">{formatCurrency(stat.totalAmount)}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400">Ticket Médio:</span>
                      <span className="font-bold text-slate-200">{formatCurrency(stat.avgTicket)}/corrida</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400">Corridas Realizadas:</span>
                      <span className="font-bold text-slate-200">{stat.tripsCount} viagens</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400">Horas Estimadas:</span>
                      <span className="font-bold text-slate-200">{stat.estimatedHours.toFixed(1)} h</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400">Participação nos Ganhos:</span>
                      <span className="font-bold text-emerald-400">{stat.percentageShare.toFixed(1)}%</span>
                    </div>
                  </div>

                  {/* BARRA DE PARTICIPAÇÃO VISUAL */}
                  <div className="mt-3 pt-2 border-t border-white/5">
                    <div className="w-full bg-white/10 h-1.5 rounded-full overflow-hidden">
                      <div
                        className="bg-emerald-400 h-full rounded-full transition-all duration-500"
                        style={{ width: `${Math.min(stat.percentageShare, 100)}%` }}
                      />
                    </div>
                  </div>

                </div>
              );
            })}
          </div>

          {/* DICA DE ESTRATÉGIA MULTI-APP */}
          <div className="bg-white/5 p-3.5 rounded-2xl border border-white/10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-xs text-slate-300 relative z-10">
            <div className="flex items-center gap-2">
              <Zap className="w-4 h-4 text-amber-400 shrink-0" />
              <span>
                <strong className="text-white">Dica Multi-App:</strong> Ligue os 2 aplicativos mais lucrativos simultaneamente. Ao tocar uma chamada vantajosa no aplicativo com maior R$/h, pause o outro para evitar penalidades na taxa de aceitação.
              </span>
            </div>
          </div>
        </>
      )}
        </>
      )}

    </div>
  );
};
