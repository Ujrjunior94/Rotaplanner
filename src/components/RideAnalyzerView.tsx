import React, { useState } from 'react';
import { useDriver } from '../context/DriverContext';
import { analyzeRide, formatCurrency, safeDivide } from '../utils/calc';
import {
  Calculator,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Sliders,
  ArrowRight,
  Zap,
  Info,
  Compass,
  Layers,
  Fuel,
  TrendingUp,
  PlusCircle,
  Volume2,
  Sparkles,
  ShieldCheck,
  Gauge
} from 'lucide-react';
import { PlatformType } from '../types';

export const RideAnalyzerView: React.FC = () => {
  const { profile, vehicle, updateProfile, activeSession, addEarning } = useDriver();

  const [grossInput, setGrossInput] = useState('38.50');
  const [distanceInput, setDistanceInput] = useState('14.2');
  const [durationInput, setDurationInput] = useState('24');
  const [deadheadKmInput, setDeadheadKmInput] = useState('3.0');
  const [selectedPlatform, setSelectedPlatform] = useState<PlatformType>('Uber');
  const [addedSuccessMsg, setAddedSuccessMsg] = useState<string | null>(null);

  // Parâmetros do motorista
  const [showConfig, setShowConfig] = useState(false);
  const [minRateKm, setMinRateKm] = useState(profile.minAcceptableRateKm.toString());
  const [minRateHour, setMinRateHour] = useState(profile.minAcceptableRateHour.toString());
  const [gasPriceRef, setGasPriceRef] = useState(profile.gasPriceReference.toString());

  const parsedGross = parseFloat(grossInput) || 0;
  const parsedDistance = parseFloat(distanceInput) || 0;
  const parsedDuration = parseFloat(durationInput) || 0;
  const parsedDeadhead = parseFloat(deadheadKmInput) || 0;
  const parsedMinKm = parseFloat(minRateKm) || profile.minAcceptableRateKm;
  const parsedMinHour = parseFloat(minRateHour) || profile.minAcceptableRateHour;
  const parsedGas = parseFloat(gasPriceRef) || profile.gasPriceReference;

  const analysis = analyzeRide(
    parsedGross,
    parsedDistance,
    parsedDuration,
    vehicle,
    parsedMinKm,
    parsedMinHour,
    parsedGas,
    parsedDeadhead
  );

  const handleSaveParameters = (e: React.FormEvent) => {
    e.preventDefault();
    updateProfile({
      minAcceptableRateKm: parsedMinKm,
      minAcceptableRateHour: parsedMinHour,
      gasPriceReference: parsedGas,
    });
    setShowConfig(false);
  };

  const handleQuickAddEarn = () => {
    if (parsedGross <= 0) return;
    const now = new Date();
    const dateStr = now.toISOString().split('T')[0];
    const timeStr = now.toTimeString().slice(0, 5);

    addEarning({
      amount: parsedGross,
      platform: selectedPlatform,
      trips: 1,
      date: dateStr,
      time: timeStr,
      notes: `Corrida analisada: ${parsedDistance.toFixed(1)}km em ${parsedDuration}min (Score ${analysis.score ?? 80})`,
    });

    setAddedSuccessMsg(`Lançado com sucesso no turno (+${formatCurrency(parsedGross)} na ${selectedPlatform.toUpperCase()})!`);
    setTimeout(() => setAddedSuccessMsg(null), 4000);
  };

  const handleSpeakRecommendation = () => {
    if (!('speechSynthesis' in window)) return;
    const scoreText = analysis.score ? `Score ${analysis.score} de 100.` : '';
    const statusText = analysis.status === 'EXCELLENT' ? 'Corrida muito boa, vale a pena aceitar.' : analysis.status === 'FAIR' ? 'Corrida aceitável, avalie a região.' : 'Corrida desfavorável, abaixo da meta.';
    const textToSpeak = `${statusText} ${scoreText} Lucro líquido estimado em ${Math.round(analysis.estimatedNetProfit)} reais.`;

    const utterance = new SpeechSynthesisUtterance(textToSpeak);
    utterance.lang = 'pt-BR';
    utterance.rate = 1.05;
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utterance);
  };

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      {/* HEADER */}
      <div className="flex items-center justify-between bg-white/5 backdrop-blur-lg border border-white/10 p-5 rounded-2xl">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded-md bg-emerald-500/20 text-emerald-300 text-[10px] font-black uppercase tracking-wider border border-emerald-500/30">
              FASE F — INTELIGÊNCIA OPERACIONAL
            </span>
          </div>
          <h2 className="text-base sm:text-lg font-black text-white tracking-tight flex items-center gap-2 mt-1">
            <Calculator className="w-5 h-5 text-emerald-400" />
            ANALISADOR: "VALE A PENA ACEITAR?"
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Decisão em 3 segundos com cálculo de retorno vazio, desgaste do Sandero e simulador multi-apps.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleSpeakRecommendation}
            className="p-2.5 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 transition flex items-center gap-1.5 text-xs font-bold"
            title="Ouvir Recomendação por Voz"
          >
            <Volume2 className="w-4 h-4" />
            <span className="hidden sm:inline">Voz</span>
          </button>

          <button
            onClick={() => setShowConfig(!showConfig)}
            className="p-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 transition"
            title="Ajustar Parâmetros de Decisão"
          >
            <Sliders className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* PAINEL DE CONFIGURAÇÃO DE PARÂMETROS */}
      {showConfig && (
        <form onSubmit={handleSaveParameters} className="bg-white/5 backdrop-blur-lg border border-emerald-500/30 p-5 rounded-2xl space-y-4 animate-fadeIn">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-black text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
              <Sliders className="w-3.5 h-3.5" /> SEUS CRITÉRIOS DE CORTE
            </h3>
            <span className="text-[10px] text-slate-400">Personalize para a sua meta financeira</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="text-[11px] font-bold text-slate-400 block mb-1">Mínimo R$ / KM (Ida)</label>
              <input
                type="number"
                step="0.10"
                value={minRateKm}
                onChange={e => setMinRateKm(e.target.value)}
                className="w-full bg-black/40 border border-white/15 rounded-xl px-3 py-2 text-xs text-emerald-300 font-bold"
              />
            </div>
            <div>
              <label className="text-[11px] font-bold text-slate-400 block mb-1">Mínimo R$ / Hora</label>
              <input
                type="number"
                step="1.00"
                value={minRateHour}
                onChange={e => setMinRateHour(e.target.value)}
                className="w-full bg-black/40 border border-white/15 rounded-xl px-3 py-2 text-xs text-emerald-300 font-bold"
              />
            </div>
            <div>
              <label className="text-[11px] font-bold text-slate-400 block mb-1">Preço Combustível (R$/L)</label>
              <input
                type="number"
                step="0.01"
                value={gasPriceRef}
                onChange={e => setGasPriceRef(e.target.value)}
                className="w-full bg-black/40 border border-white/15 rounded-xl px-3 py-2 text-xs text-amber-300 font-bold"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={() => setShowConfig(false)}
              className="px-3 py-1.5 rounded-xl text-xs font-bold text-slate-400 hover:text-white"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 px-4 py-1.5 rounded-xl text-xs font-black shadow-lg shadow-emerald-500/20"
            >
              Salvar Parâmetros
            </button>
          </div>
        </form>
      )}

      {/* FORMULÁRIO DE ENTRADA RÁPIDA (3 CAMPOS + RETORNO VAZIO) */}
      <div className="bg-white/5 backdrop-blur-lg border border-white/10 p-5 rounded-2xl space-y-4">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div>
            <label className="text-[11px] font-bold text-slate-400 uppercase block mb-1">VALOR (R$)</label>
            <input
              type="number"
              step="0.10"
              value={grossInput}
              onChange={e => setGrossInput(e.target.value)}
              placeholder="38.50"
              className="w-full bg-black/40 border border-white/15 rounded-xl px-3 py-2.5 text-base sm:text-lg font-black text-emerald-400 focus:outline-none focus:border-emerald-500"
            />
          </div>

          <div>
            <label className="text-[11px] font-bold text-slate-400 uppercase block mb-1">DISTÂNCIA (KM)</label>
            <input
              type="number"
              step="0.1"
              value={distanceInput}
              onChange={e => setDistanceInput(e.target.value)}
              placeholder="14.2"
              className="w-full bg-black/40 border border-white/15 rounded-xl px-3 py-2.5 text-base sm:text-lg font-black text-white focus:outline-none focus:border-emerald-500"
            />
          </div>

          <div>
            <label className="text-[11px] font-bold text-slate-400 uppercase block mb-1">TEMPO (MIN)</label>
            <input
              type="number"
              value={durationInput}
              onChange={e => setDurationInput(e.target.value)}
              placeholder="24"
              className="w-full bg-black/40 border border-white/15 rounded-xl px-3 py-2.5 text-base sm:text-lg font-black text-white focus:outline-none focus:border-emerald-500"
            />
          </div>

          <div>
            <label className="text-[11px] font-bold text-amber-400 uppercase flex items-center gap-1 mb-1">
              <Compass className="w-3.5 h-3.5" /> VOLTA VAZIA (KM)
            </label>
            <input
              type="number"
              step="0.5"
              value={deadheadKmInput}
              onChange={e => setDeadheadKmInput(e.target.value)}
              placeholder="0"
              className="w-full bg-black/40 border border-amber-500/30 rounded-xl px-3 py-2.5 text-base sm:text-lg font-black text-amber-300 focus:outline-none focus:border-amber-400"
            />
          </div>
        </div>

        {/* ATALHOS DE RETORNO VAZIO */}
        <div className="flex flex-wrap items-center gap-1.5 pt-1 text-xs">
          <span className="text-[10px] text-slate-400 font-bold uppercase mr-1">Retorno estimado:</span>
          <button
            type="button"
            onClick={() => setDeadheadKmInput('0')}
            className={`px-2 py-1 rounded-lg text-xs font-bold transition border ${
              parsedDeadhead === 0
                ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                : 'bg-white/5 text-slate-400 hover:text-white border-white/5'
            }`}
          >
            0 km (Zona Quente)
          </button>
          <button
            type="button"
            onClick={() => setDeadheadKmInput((parsedDistance * 0.3).toFixed(1))}
            className={`px-2 py-1 rounded-lg text-xs font-bold transition border ${
              Math.abs(parsedDeadhead - parsedDistance * 0.3) < 0.2
                ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                : 'bg-white/5 text-slate-400 hover:text-white border-white/5'
            }`}
          >
            +30% (Bairro Vizinho)
          </button>
          <button
            type="button"
            onClick={() => setDeadheadKmInput((parsedDistance * 0.7).toFixed(1))}
            className={`px-2 py-1 rounded-lg text-xs font-bold transition border ${
              Math.abs(parsedDeadhead - parsedDistance * 0.7) < 0.2
                ? 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                : 'bg-white/5 text-slate-400 hover:text-white border-white/5'
            }`}
          >
            +70% (Periferia)
          </button>
          <button
            type="button"
            onClick={() => setDeadheadKmInput(parsedDistance.toFixed(1))}
            className={`px-2 py-1 rounded-lg text-xs font-bold transition border ${
              Math.abs(parsedDeadhead - parsedDistance) < 0.2
                ? 'bg-rose-500/30 text-rose-300 border-rose-500/50'
                : 'bg-white/5 text-slate-400 hover:text-white border-white/5'
            }`}
          >
            100% (Volta Vazia Total)
          </button>
        </div>

        {/* ATALHOS RÁPIDOS DE CORRIDA EXEMPLO */}
        <div className="flex items-center gap-2 pt-2 border-t border-white/5 overflow-x-auto pb-1 text-xs">
          <span className="text-[10px] text-slate-400 font-bold uppercase shrink-0">Cenários rápidos:</span>
          <button
            onClick={() => { setGrossInput('19.50'); setDistanceInput('5.2'); setDurationInput('12'); setDeadheadKmInput('1.0'); }}
            className="bg-white/5 hover:bg-white/10 px-2.5 py-1 rounded-lg text-slate-300 font-medium shrink-0 border border-white/5 text-xs"
          >
            Curta: R$19,50 (5km)
          </button>
          <button
            onClick={() => { setGrossInput('46.00'); setDistanceInput('18.0'); setDurationInput('28'); setDeadheadKmInput('4.0'); }}
            className="bg-white/5 hover:bg-white/10 px-2.5 py-1 rounded-lg text-slate-300 font-medium shrink-0 border border-white/5 text-xs"
          >
            Média: R$46,00 (18km)
          </button>
          <button
            onClick={() => { setGrossInput('89.00'); setDistanceInput('42.0'); setDurationInput('50'); setDeadheadKmInput('15.0'); }}
            className="bg-white/5 hover:bg-white/10 px-2.5 py-1 rounded-lg text-slate-300 font-medium shrink-0 border border-white/5 text-xs"
          >
            Aeroporto: R$89,00 (42km)
          </button>
        </div>
      </div>

      {/* RESULTADO DO DIAGNÓSTICO (SCORE + VEREDITO) */}
      <div className={`p-5 sm:p-6 rounded-3xl border transition-all ${
        analysis.status === 'EXCELLENT'
          ? 'bg-emerald-500/10 border-emerald-500/40 shadow-xl shadow-emerald-500/10'
          : analysis.status === 'FAIR'
          ? 'bg-amber-500/10 border-amber-500/40 shadow-xl shadow-amber-500/10'
          : 'bg-rose-500/10 border-rose-500/40 shadow-xl shadow-rose-500/10'
      }`}>
        {/* CABEÇALHO DO SCORE */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            {/* SCORE GAUGE VISUAL */}
            <div className={`w-14 h-14 rounded-2xl flex flex-col items-center justify-center font-black border ${
              (analysis.score ?? 0) >= 80
                ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/50'
                : (analysis.score ?? 0) >= 60
                ? 'bg-amber-500/20 text-amber-400 border-amber-500/50'
                : 'bg-rose-500/20 text-rose-400 border-rose-500/50'
            }`}>
              <span className="text-xl leading-none">{analysis.score ?? 0}</span>
              <span className="text-[8px] uppercase tracking-wider opacity-70">SCORE</span>
            </div>

            <div>
              <div className="text-[10px] font-black uppercase tracking-wider opacity-80 text-slate-300 flex items-center gap-1.5">
                <Gauge className="w-3.5 h-3.5" />
                VEREDITO DA INTELIGÊNCIA OPERACIONAL
              </div>
              <h3 className={`text-lg sm:text-xl font-black ${
                analysis.status === 'EXCELLENT' ? 'text-emerald-400' : analysis.status === 'FAIR' ? 'text-amber-400' : 'text-rose-400'
              }`}>
                {analysis.status === 'EXCELLENT' ? '🟢 EXCELENTE — ACEITAR IMEDIATAMENTE' : analysis.status === 'FAIR' ? '🟡 ACEITÁVEL — VERIFICAR DESTINO' : '🔴 DESFAVORÁVEL — REJEITAR'}
              </h3>
            </div>
          </div>

          <div className="bg-black/30 px-4 py-2.5 rounded-2xl border border-white/10 text-right sm:text-right">
            <span className="text-[10px] text-slate-400 uppercase font-bold block">Lucro Líquido Real</span>
            <div className="text-xl sm:text-2xl font-black text-white">{formatCurrency(analysis.estimatedNetProfit)}</div>
            <span className="text-[9px] text-emerald-400 font-bold">Margem {analysis.marginPercent.toFixed(0)}%</span>
          </div>
        </div>

        <p className="text-xs text-slate-300 mt-3 pt-3 border-t border-white/10 font-medium">
          {analysis.recommendation}
        </p>

        {/* MÉTRICAS UNITÁRIAS DETALHADAS */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 mt-4 text-center">
          <div className="bg-black/40 p-3 rounded-2xl border border-white/10">
            <span className="text-[10px] font-bold text-slate-400 uppercase">R$ / KM REAL</span>
            <div className="text-base font-black text-white mt-0.5">
              {formatCurrency(analysis.effectiveRatePerKm ?? analysis.ratePerKm)}/km
            </div>
            <span className="text-[9px] text-slate-400">
              {parsedDeadhead > 0 ? `Total ${(analysis.totalDistanceWithDeadhead ?? parsedDistance).toFixed(1)} km` : `Meta ≥ ${formatCurrency(parsedMinKm)}`}
            </span>
          </div>

          <div className="bg-black/40 p-3 rounded-2xl border border-white/10">
            <span className="text-[10px] font-bold text-slate-400 uppercase">R$ / HORA REAL</span>
            <div className="text-base font-black text-white mt-0.5">
              {formatCurrency(analysis.effectiveRatePerHour ?? analysis.ratePerHour)}/h
            </div>
            <span className="text-[9px] text-slate-400">Meta ≥ {formatCurrency(parsedMinHour)}</span>
          </div>

          <div className="bg-black/40 p-3 rounded-2xl border border-white/10">
            <span className="text-[10px] font-bold text-slate-400 uppercase">COMBUSTÍVEL</span>
            <div className="text-base font-black text-rose-300 mt-0.5">
              {formatCurrency(analysis.estimatedFuelCost)}
            </div>
            <span className="text-[9px] text-slate-400">({vehicle.avgConsumption} km/L)</span>
          </div>

          <div className="bg-black/40 p-3 rounded-2xl border border-white/10">
            <span className="text-[10px] font-bold text-slate-400 uppercase">DESGASTE SANDERO</span>
            <div className="text-base font-black text-amber-300 mt-0.5">
              {formatCurrency(analysis.estimatedDepreciationCost)}
            </div>
            <span className="text-[9px] text-slate-400">Depreciação + Pneus</span>
          </div>
        </div>

        {/* AÇÃO: LANÇAR GANHO NO TURNO ATIVO */}
        <div className="mt-4 pt-3 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <span className="text-[10px] text-slate-400 uppercase font-bold shrink-0">Plataforma:</span>
            <select
              value={selectedPlatform}
              onChange={e => setSelectedPlatform(e.target.value as PlatformType)}
              className="bg-black/50 border border-white/15 text-white text-xs font-bold rounded-xl px-2.5 py-1.5 focus:outline-none"
            >
              <option value="Uber">Uber</option>
              <option value="99">99</option>
              <option value="inDrive">inDrive</option>
              <option value="Particular">Particular</option>
            </select>
          </div>

          <button
            type="button"
            onClick={handleQuickAddEarn}
            className="w-full sm:w-auto bg-emerald-500 hover:bg-emerald-400 text-slate-950 px-4 py-2 rounded-xl text-xs font-black flex items-center justify-center gap-1.5 transition shadow-lg shadow-emerald-500/20 active:scale-95"
          >
            <PlusCircle className="w-4 h-4" />
            Lançar Corrida no Turno Ativo (+{formatCurrency(parsedGross)})
          </button>
        </div>

        {addedSuccessMsg && (
          <div className="mt-2.5 p-2 bg-emerald-500/20 border border-emerald-500/40 rounded-xl text-xs text-emerald-300 font-bold flex items-center gap-2 animate-fadeIn">
            <ShieldCheck className="w-4 h-4 shrink-0 text-emerald-400" />
            <span>{addedSuccessMsg}</span>
          </div>
        )}
      </div>

      {/* SIMULADOR MULTI-PLATAFORMAS (FASE F) */}
      <div className="bg-white/5 backdrop-blur-lg border border-white/10 p-5 rounded-2xl space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-xs font-black text-white uppercase tracking-wider flex items-center gap-2">
              <Layers className="w-4 h-4 text-emerald-400" />
              SIMULADOR DE REPASSE POR PLATAFORMA
            </h3>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Comparativo de quanto sobra limpo na sua mão em cada aplicativo para essa mesma corrida
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* UBER */}
          <div className="bg-black/40 border border-white/10 p-3.5 rounded-2xl relative overflow-hidden">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs font-black text-white uppercase">UBER</span>
              <span className="text-[10px] font-bold text-slate-400">Taxa ~24,5%</span>
            </div>
            <div className="text-lg font-black text-white">
              {formatCurrency(analysis.platformEstimates?.Uber?.netProfit ?? analysis.estimatedNetProfit)}
            </div>
            <span className="text-[10px] text-slate-400 block mt-0.5">
              {formatCurrency(analysis.platformEstimates?.Uber?.hourlyNet ?? 0)}/hora líquida
            </span>
            <div className="mt-2 text-[10px] text-emerald-400/90 font-medium">
              Maior volume de chamadas imediatas
            </div>
          </div>

          {/* 99 */}
          <div className="bg-black/40 border border-amber-500/30 p-3.5 rounded-2xl relative overflow-hidden">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs font-black text-amber-400 uppercase">99 POP / PLUS</span>
              <span className="text-[10px] font-bold text-amber-300">Taxa ~19,9%</span>
            </div>
            <div className="text-lg font-black text-amber-300">
              {formatCurrency(analysis.platformEstimates?.['99']?.netProfit ?? (parsedGross * 0.8 - analysis.totalEstimatedCost))}
            </div>
            <span className="text-[10px] text-slate-400 block mt-0.5">
              {formatCurrency(analysis.platformEstimates?.['99']?.hourlyNet ?? 0)}/hora líquida
            </span>
            <div className="mt-2 text-[10px] text-amber-300/90 font-medium">
              Permite passe semanal de taxa zero
            </div>
          </div>

          {/* INDRIVE */}
          <div className="bg-black/40 border border-teal-500/30 p-3.5 rounded-2xl relative overflow-hidden">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs font-black text-teal-400 uppercase">INDRIVE</span>
              <span className="text-[10px] font-bold text-teal-300">Taxa ~10,5%</span>
            </div>
            <div className="text-lg font-black text-teal-300">
              {formatCurrency(analysis.platformEstimates?.inDrive?.netProfit ?? (parsedGross * 0.895 - analysis.totalEstimatedCost))}
            </div>
            <span className="text-[10px] text-slate-400 block mt-0.5">
              {formatCurrency(analysis.platformEstimates?.inDrive?.hourlyNet ?? 0)}/hora líquida
            </span>
            <div className="mt-2 text-[10px] text-teal-300/90 font-medium">
              Taxa baixa com negociação de preço
            </div>
          </div>

          {/* PARTICULAR */}
          <div className="bg-emerald-500/10 border border-emerald-500/40 p-3.5 rounded-2xl relative overflow-hidden">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs font-black text-emerald-400 uppercase">PARTICULAR</span>
              <span className="text-[10px] font-bold text-emerald-300">Taxa 0%</span>
            </div>
            <div className="text-lg font-black text-emerald-400">
              {formatCurrency(analysis.platformEstimates?.Particular?.netProfit ?? (parsedGross - analysis.totalEstimatedCost))}
            </div>
            <span className="text-[10px] text-slate-400 block mt-0.5">
              {formatCurrency(analysis.platformEstimates?.Particular?.hourlyNet ?? 0)}/hora líquida
            </span>
            <div className="mt-2 text-[10px] text-emerald-300 font-bold">
              100% repasse líquido direto
            </div>
          </div>
        </div>
      </div>

      {/* NOTA METODOLÓGICA */}
      <div className="bg-white/5 p-4 rounded-2xl border border-white/5 flex items-start gap-2.5 text-xs text-slate-400">
        <Info className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
        <p>
          O motor de inteligência Fase F avalia simultaneamente o consumo real do seu {vehicle.make} {vehicle.model} ({vehicle.avgConsumption} km/L), a quilometragem total incluindo deslocamento de retorno, a depreciação e a margem de contribuição líquida.
        </p>
      </div>
    </div>
  );
};

