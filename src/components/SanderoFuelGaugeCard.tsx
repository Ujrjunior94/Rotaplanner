import React, { useMemo } from 'react';
import { useDriver } from '../context/DriverContext';
import { Fuel, AlertTriangle, ArrowRight, Sliders, Zap, RefreshCw } from 'lucide-react';
import { formatKm, safeDivide } from '../utils/calc';

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

        {/* BADGE DE MODO */}
        <div className="flex items-center gap-2">
          {telemetry.isReserve && (
            <span className="text-[10px] font-black font-mono px-2 py-0.5 rounded-full bg-orange-600/30 text-orange-400 border border-orange-500/40 animate-pulse">
              RESERVA
            </span>
          )}
          <span className={`text-[10px] font-black font-mono px-2 py-0.5 rounded-full border ${
            telemetry.isManual
              ? 'bg-purple-500/20 text-purple-300 border-purple-500/30'
              : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
          }`}>
            {telemetry.isManual ? 'MANUAL' : 'AUTO'}
          </span>
        </div>
      </div>

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
                <div
                  key={barNum}
                  className={`h-full rounded transition-all duration-300 border ${
                    isActive
                      ? isReserveBar && telemetry.isReserve
                        ? 'bg-orange-600 border-orange-400 shadow-[0_0_10px_rgba(234,88,12,0.8)] animate-pulse'
                        : 'bg-gradient-to-t from-amber-500 to-orange-500 border-amber-400 shadow-[0_0_8px_rgba(245,158,11,0.5)]'
                      : 'bg-amber-950/20 border-amber-900/30'
                  }`}
                  title={`Barra ${barNum} de 8`}
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
