import React, { useState, useMemo } from 'react';
import { useDriver } from '../context/DriverContext';
import { Fuel, AlertTriangle, ArrowRight, Sliders, Zap, RefreshCw, Calculator, Check, X, Info } from 'lucide-react';
import { formatKm, safeDivide, calcSanderoLitersFromBarsAndAutonomy } from '../utils/calc';

interface SanderoFuelGaugeCardProps {
  onNavigateTab?: (tab: string) => void;
  onOpenQuickFuel?: () => void;
}

export const SanderoFuelGaugeCard: React.FC<SanderoFuelGaugeCardProps> = ({
  onNavigateTab,
  onOpenQuickFuel,
}) => {
  const { vehicle, fuelRecords } = useDriver();

  const tankCapacity = vehicle.tankCapacity || 50; // Sandero 50L
  const avgConsumption = vehicle.avgConsumption || 12.5;
  const totalBars = 8;

  // Estado da calculadora rápida integrada
  const [showCalculator, setShowCalculator] = useState(false);
  const [inputBars, setInputBars] = useState<number>(4);
  const [inputAutonomy, setInputAutonomy] = useState<string>('');
  const [syncToast, setSyncToast] = useState<string | null>(null);

  // Ler configuração salva do tanque
  const tankConfig = useMemo(() => {
    try {
      const saved = localStorage.getItem('@driver_sandero_tank_v2');
      if (saved) return JSON.parse(saved);
    } catch (e) {
      // fallback
    }
    return {
      mode: 'auto',
      manualLiters: 37.5,
      theme: 'amber',
      baseOdometer: Math.max(0, vehicle.currentOdometer - 140),
      baseLiters: 50,
      baseDate: new Date().toISOString().split('T')[0],
    };
  }, [vehicle.currentOdometer]);

  // Último abastecimento
  const lastFuel = useMemo(() => {
    if (fuelRecords.length === 0) return null;
    return [...fuelRecords].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0];
  }, [fuelRecords]);

  // Cálculos do nível
  const telemetry = useMemo(() => {
    if (tankConfig.mode === 'manual') {
      const liters = Math.max(0, Math.min(tankCapacity, tankConfig.manualLiters || 37.5));
      let bars = Math.round((liters / tankCapacity) * totalBars);
      if (liters > 0 && bars === 0) bars = 1;
      const autonomy = Math.round(liters * avgConsumption);
      const isReserve = liters <= 6.5;

      return {
        liters,
        bars: Math.min(totalBars, Math.max(0, bars)),
        autonomy,
        isReserve,
        isManual: true,
        kmDriven: Math.max(0, vehicle.currentOdometer - (tankConfig.baseOdometer || 0)),
      };
    } else {
      const baseOdo = lastFuel ? lastFuel.odometer : (tankConfig.baseOdometer || vehicle.currentOdometer - 120);
      const kmDriven = Math.max(0, vehicle.currentOdometer - baseOdo);
      const baseLiters = lastFuel ? (lastFuel.liters >= tankCapacity * 0.85 ? tankCapacity : Math.min(tankCapacity, lastFuel.liters + 10)) : (tankConfig.baseLiters || 50);
      const consumed = safeDivide(kmDriven, avgConsumption);
      const remainingLiters = Math.max(0, Math.min(tankCapacity, baseLiters - consumed));
      const autonomy = Math.round(remainingLiters * avgConsumption);

      let bars = Math.round((remainingLiters / tankCapacity) * totalBars);
      if (remainingLiters > 0 && bars === 0) bars = 1;

      return {
        liters: remainingLiters,
        bars: Math.min(totalBars, Math.max(0, bars)),
        autonomy,
        isReserve: remainingLiters <= 6.5,
        isManual: false,
        kmDriven,
      };
    }
  }, [tankConfig, lastFuel, vehicle.currentOdometer, tankCapacity, avgConsumption, totalBars]);

  // Cálculo da ferramenta "Barras & Autonomia -> Litros"
  const quickCalcResult = useMemo(() => {
    const autonomyNum = parseFloat(inputAutonomy) || 0;
    return calcSanderoLitersFromBarsAndAutonomy({
      bars: inputBars,
      autonomyKm: autonomyNum,
      tankCapacity,
      avgConsumption,
      totalBars,
    });
  }, [inputBars, inputAutonomy, tankCapacity, avgConsumption, totalBars]);

  // Aplicar cálculo direto ao tanque
  const handleApplyToTank = () => {
    const newLiters = quickCalcResult.recommendedLiters;
    const newConfig = {
      ...tankConfig,
      mode: 'manual',
      manualLiters: newLiters,
      baseOdometer: vehicle.currentOdometer,
      baseDate: new Date().toISOString().split('T')[0],
    };
    try {
      localStorage.setItem('@driver_sandero_tank_v2', JSON.stringify(newConfig));
      // disparar evento de storage para atualizar outros componentes
      window.dispatchEvent(new Event('storage'));
      setSyncToast(`Tanque calibrado para ${newLiters.toFixed(1)} L (${quickCalcResult.barsPercentage}%)!`);
      setTimeout(() => {
        setSyncToast(null);
        setShowCalculator(false);
      }, 2500);
    } catch (e) {
      console.error(e);
    }
  };

  const percentage = Math.min(100, Math.max(0, (telemetry.liters / tankCapacity) * 100));
  const bars = Array.from({ length: totalBars }, (_, i) => i + 1);

  return (
    <div className="bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 border border-amber-500/20 p-5 sm:p-6 rounded-3xl space-y-4 shadow-xl relative overflow-hidden">
      
      {/* HEADER DO CARD */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-2xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400 font-bold text-sm shadow-inner">
            ⛽
          </div>
          <div>
            <h3 className="text-sm font-black text-white font-mono tracking-wider flex items-center gap-2">
              PAINEL DO TANQUE • SANDERO
            </h3>
            <p className="text-[11px] text-slate-400 font-mono">
              {telemetry.isManual ? 'Modo Manual Ativo' : 'Telemetria Automática'}
            </p>
          </div>
        </div>

        {/* BADGE DE MODO & BOTÃO CALCULADORA */}
        <div className="flex items-center gap-2">
          {telemetry.isReserve && (
            <span className="text-[10px] font-black font-mono px-2 py-0.5 rounded-full bg-orange-600/30 text-orange-400 border border-orange-500/40 animate-pulse">
              RESERVA
            </span>
          )}
          
          <button
            type="button"
            onClick={() => {
              setInputBars(telemetry.bars);
              setInputAutonomy(telemetry.autonomy > 0 ? telemetry.autonomy.toString() : '');
              setShowCalculator(!showCalculator);
            }}
            className={`flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-xl border transition ${
              showCalculator
                ? 'bg-amber-500 text-slate-950 border-amber-400 font-black'
                : 'bg-slate-800/80 hover:bg-slate-700 text-amber-300 border-amber-500/30'
            }`}
            title="Calcular litros no tanque com base nas barras e autonomia do painel"
          >
            <Calculator className="w-3.5 h-3.5" />
            <span>Calcular Litros</span>
          </button>
        </div>
      </div>

      {/* FERRAMENTA INTERATIVA: CALCULAR QUANTOS LITROS HÁ NO TANQUE A PARTIR DE BARRAS & AUTONOMIA */}
      {showCalculator && (
        <div className="bg-slate-900/95 border border-amber-500/40 rounded-2xl p-4 space-y-3.5 animate-fadeIn">
          <div className="flex items-center justify-between pb-2 border-b border-white/10">
            <div className="flex items-center gap-2">
              <Calculator className="w-4 h-4 text-amber-400" />
              <span className="text-xs font-black text-white uppercase tracking-wider">
                Calcular Litros no Tanque (Barras + Autonomia)
              </span>
            </div>
            <button
              type="button"
              onClick={() => setShowCalculator(false)}
              className="text-slate-400 hover:text-white p-1"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* 1. SELEÇÃO DE BARRAS DO PAINEL */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-slate-300 flex items-center justify-between">
                <span>Barras no Painel do Sandero:</span>
                <span className="text-amber-400 font-mono font-black">{inputBars}/8 barras</span>
              </label>
              
              <div className="grid grid-cols-9 gap-1">
                {[0, 1, 2, 3, 4, 5, 6, 7, 8].map(barNum => (
                  <button
                    key={barNum}
                    type="button"
                    onClick={() => setInputBars(barNum)}
                    className={`h-7 rounded text-[10px] font-mono font-black transition border ${
                      inputBars === barNum
                        ? 'bg-amber-500 text-slate-950 border-amber-300 scale-105 shadow-md shadow-amber-500/30'
                        : 'bg-slate-800/80 text-slate-400 border-slate-700 hover:text-white hover:bg-slate-700'
                    }`}
                  >
                    {barNum === 0 ? 'R' : barNum}
                  </button>
                ))}
              </div>
            </div>

            {/* 2. AUTONOMIA EXIBIDA NO COMPUTADOR DE BORDO */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-slate-300 flex items-center justify-between">
                <span>Autonomia no Painel (km):</span>
                <span className="text-[10px] text-slate-400">Opcional</span>
              </label>
              <div className="relative">
                <input
                  type="number"
                  placeholder="Ex: 280 (KM no cluster)"
                  value={inputAutonomy}
                  onChange={e => setInputAutonomy(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-white font-mono placeholder:text-slate-600 focus:outline-none focus:border-amber-400"
                />
                <span className="absolute right-3 top-2 text-[10px] font-mono text-slate-400 font-bold">KM</span>
              </div>
            </div>
          </div>

          {/* RESULTADO DO CÁLCULO DE LITROS NO TANQUE */}
          <div className="bg-amber-950/20 border border-amber-500/30 rounded-xl p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
            <div>
              <span className="text-[10px] font-mono font-bold text-amber-400/90 uppercase tracking-wider block">
                RESULTADO: LITROS NO TANQUE
              </span>
              <div className="flex items-baseline gap-2 mt-0.5">
                <span className="text-2xl font-black font-mono text-white">
                  {quickCalcResult.recommendedLiters.toFixed(1)} L
                </span>
                <span className="text-xs font-mono text-amber-300">
                  (~{quickCalcResult.barsPercentage}% do tanque de {tankCapacity}L)
                </span>
              </div>
              <p className="text-[10px] text-slate-300 font-mono mt-0.5">
                {quickCalcResult.explanation}
              </p>
            </div>

            <button
              type="button"
              onClick={handleApplyToTank}
              className="shrink-0 flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs transition shadow-md shadow-amber-500/20 active:scale-95"
            >
              <Check className="w-4 h-4 stroke-[3]" />
              <span>Sincronizar Tanque</span>
            </button>
          </div>

          {syncToast && (
            <div className="text-[11px] font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 px-3 py-1.5 rounded-lg flex items-center gap-1.5 animate-fadeIn">
              <Zap className="w-3.5 h-3.5" />
              <span>{syncToast}</span>
            </div>
          )}
        </div>
      )}

      {/* ÁREA CENTRAL: O PAINEL DE BARRAS LCD DO SANDERO HORIZONTAL/COMPACTO */}
      <div className="bg-black/80 p-4 rounded-2xl border border-white/10 shadow-inner space-y-3">
        
        {/* LEITURA DIGITAL PRINCIPAL */}
        <div className="flex items-baseline justify-between">
          <div>
            <span className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-wider block">
              AUTONOMIA RESTANTE
            </span>
            <div className="flex items-baseline gap-1.5 mt-0.5">
              <span className="text-3xl font-black font-mono text-amber-400 tracking-tight">
                {telemetry.autonomy}
              </span>
              <span className="text-lg font-black font-mono text-white">KM</span>
            </div>
          </div>

          <div className="text-right font-mono">
            <span className="text-xs font-black text-white">
              {telemetry.liters.toFixed(1)} L <span className="text-slate-400">/ {tankCapacity}L</span>
            </span>
            <span className="text-[11px] text-amber-400/90 font-bold block">
              {telemetry.bars}/8 barras ({percentage.toFixed(0)}%)
            </span>
          </div>
        </div>

        {/* AS 8 BARRAS SEGMENTADAS ESTILO CLUSTER SANDERO */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-[10px] font-mono font-bold text-slate-400 px-1">
            <span className="text-orange-400 flex items-center gap-1">
              <span>◄ ⛽</span> 0/R (Reserva)
            </span>
            <span className="text-slate-400">1/2</span>
            <span className="text-amber-400">1/1 (Cheio)</span>
          </div>

          <div className="grid grid-cols-8 gap-1.5 h-6">
            {bars.map(barNum => {
              const isActive = barNum <= telemetry.bars;
              const isReserveBar = barNum === 1;

              return (
                <button
                  type="button"
                  key={barNum}
                  onClick={() => {
                    setInputBars(barNum);
                    setShowCalculator(true);
                  }}
                  className={`h-full rounded transition-all duration-300 border cursor-pointer hover:scale-105 ${
                    isActive
                      ? isReserveBar && telemetry.isReserve
                        ? 'bg-orange-600 border-orange-400 shadow-[0_0_10px_rgba(234,88,12,0.8)] animate-pulse'
                        : 'bg-gradient-to-t from-amber-500 to-orange-500 border-amber-400 shadow-[0_0_8px_rgba(245,158,11,0.5)]'
                      : 'bg-amber-950/20 border-amber-900/30'
                  }`}
                  title={`Barra ${barNum} de 8 (~${((barNum / totalBars) * tankCapacity).toFixed(1)}L). Clique para calibrar.`}
                />
              );
            })}
          </div>
        </div>

        {/* INFORMAÇÕES DE CONFERÊNCIA RÁPIDA */}
        <div className="flex items-center justify-between pt-2 border-t border-white/10 text-[11px] font-mono text-slate-400">
          <span>Km no tanque: <strong className="text-white">{formatKm(telemetry.kmDriven)}</strong></span>
          <span>Média: <strong className="text-emerald-400">{avgConsumption.toFixed(1)} km/L</strong></span>
          <span>Reserva: <strong className="text-orange-400">~6.5L</strong></span>
        </div>
      </div>

      {/* RODAPÉ DO CARD COM AÇÕES */}
      <div className="flex items-center justify-between pt-1">
        {onOpenQuickFuel && (
          <button
            type="button"
            onClick={onOpenQuickFuel}
            className="text-xs text-amber-400 hover:text-amber-300 font-black flex items-center gap-1.5 transition"
          >
            <Fuel className="w-3.5 h-3.5" />
            <span>Abastecer Agora</span>
          </button>
        )}

        {onNavigateTab && (
          <button
            type="button"
            onClick={() => onNavigateTab('fuel')}
            className="text-xs text-slate-300 hover:text-white font-bold flex items-center gap-1 ml-auto group"
          >
            <span>Conferência Completa</span>
            <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform text-amber-400" />
          </button>
        )}
      </div>
    </div>
  );
};

