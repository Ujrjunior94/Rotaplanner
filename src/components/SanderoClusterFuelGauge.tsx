import React from 'react';
import { Fuel, AlertTriangle, CheckCircle2, Sliders, RefreshCw, Zap } from 'lucide-react';

export interface SanderoClusterFuelGaugeProps {
  currentLiters: number;
  tankCapacity: number;
  avgConsumption: number;
  activeBars: number;
  totalBars?: number; // padrão 8 barras (Renault Sandero)
  autonomyKm: number;
  kmDrivenSinceFueling?: number;
  litersConsumed?: number;
  isReserve: boolean;
  isManualMode: boolean;
  theme?: 'amber' | 'cyan' | 'white';
  onSelectBar?: (barIndex: number) => void;
  onSetLiters?: (liters: number) => void;
  orientation?: 'vertical' | 'horizontal';
  compact?: boolean;
}

export const SanderoClusterFuelGauge: React.FC<SanderoClusterFuelGaugeProps> = ({
  currentLiters,
  tankCapacity,
  avgConsumption,
  activeBars,
  totalBars = 8,
  autonomyKm,
  kmDrivenSinceFueling = 0,
  litersConsumed = 0,
  isReserve,
  isManualMode,
  theme = 'amber',
  onSelectBar,
  onSetLiters,
  orientation = 'vertical',
  compact = false,
}) => {
  const percentage = Math.min(100, Math.max(0, (currentLiters / tankCapacity) * 100));

  // Configurações de cores dos segmentos conforme tema do painel
  const themeColors = {
    amber: {
      activeBg: 'bg-gradient-to-r from-amber-500 to-orange-500',
      activeShadow: 'shadow-[0_0_12px_rgba(245,158,11,0.7)]',
      activeBorder: 'border-amber-400',
      textAccent: 'text-amber-400',
      textSecondary: 'text-amber-300/70',
      ghostBg: 'bg-amber-950/20 border-amber-900/30',
      lcdGlow: 'from-amber-950/30 to-black',
      lcdBorder: 'border-amber-500/30',
      reservePulse: 'bg-orange-600 shadow-[0_0_16px_rgba(234,88,12,0.9)] animate-pulse',
      bezelBorder: 'border-amber-500/20',
    },
    cyan: {
      activeBg: 'bg-gradient-to-r from-cyan-400 to-sky-500',
      activeShadow: 'shadow-[0_0_12px_rgba(56,189,248,0.7)]',
      activeBorder: 'border-cyan-300',
      textAccent: 'text-cyan-400',
      textSecondary: 'text-cyan-300/70',
      ghostBg: 'bg-cyan-950/20 border-cyan-900/30',
      lcdGlow: 'from-cyan-950/30 to-black',
      lcdBorder: 'border-cyan-500/30',
      reservePulse: 'bg-rose-500 shadow-[0_0_16px_rgba(244,63,94,0.9)] animate-pulse',
      bezelBorder: 'border-cyan-500/20',
    },
    white: {
      activeBg: 'bg-gradient-to-r from-slate-100 to-slate-300',
      activeShadow: 'shadow-[0_0_12px_rgba(255,255,255,0.7)]',
      activeBorder: 'border-white',
      textAccent: 'text-white',
      textSecondary: 'text-slate-400',
      ghostBg: 'bg-slate-900/40 border-slate-800',
      lcdGlow: 'from-slate-900/40 to-black',
      lcdBorder: 'border-slate-700/50',
      reservePulse: 'bg-amber-500 shadow-[0_0_16px_rgba(245,158,11,0.9)] animate-pulse',
      bezelBorder: 'border-slate-700/40',
    },
  }[theme];

  // Gera a lista de barras de 1 a totalBars (8)
  const bars = Array.from({ length: totalBars }, (_, i) => i + 1);

  return (
    <div
      className={`rounded-3xl border ${themeColors.bezelBorder} bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 p-4 sm:p-6 shadow-2xl relative overflow-hidden`}
    >
      {/* TEXTURA E BACKLIGHT DO CLUSTER LCD RENAULT */}
      <div
        className="absolute inset-0 opacity-15 pointer-events-none"
        style={{
          backgroundImage:
            'radial-gradient(circle at 50% 30%, rgba(245, 158, 11, 0.25) 0%, transparent 70%), linear-gradient(0deg, rgba(255,255,255,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px)',
          backgroundSize: '100% 100%, 4px 4px, 4px 4px',
        }}
      />

      {/* HEADER DO CLUSTER: INDICADOR RENAULT SANDERO */}
      <div className="flex items-center justify-between border-b border-white/10 pb-3 mb-4 relative z-10">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400 font-black text-xs shadow-inner">
            ⛽
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs sm:text-sm font-black text-white tracking-wider font-mono">
                PAINEL SANDERO • NÍVEL DE TANQUE
              </span>
              <span className="text-[10px] bg-white/10 text-slate-300 px-2 py-0.5 rounded-full font-mono font-bold">
                8 BARRAS
              </span>
            </div>
            <p className="text-[11px] text-slate-400">
              Conferência digital por autonomia (km) e consumo médio
            </p>
          </div>
        </div>

        {/* MODO BADGE */}
        <div className="flex items-center gap-1.5">
          {isManualMode ? (
            <span className="inline-flex items-center gap-1 text-[11px] font-black font-mono px-2.5 py-1 rounded-xl bg-purple-500/20 border border-purple-500/40 text-purple-300">
              <Sliders className="w-3 h-3" /> MODO MANUAL
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 text-[11px] font-black font-mono px-2.5 py-1 rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-300">
              <Zap className="w-3 h-3" /> TELEMETRIA AUTO
            </span>
          )}
        </div>
      </div>

      {/* ÁREA CENTRAL DO PAINEL INSTRUMENTOS ESTILO SANDERO */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-center relative z-10">
        
        {/* BLOCO DA ESQUERDA: AS BARRAS SEGMENTADAS LCD DO SANDERO */}
        <div className="lg:col-span-5 flex flex-col items-center justify-center bg-black/70 p-5 sm:p-6 rounded-2xl border border-white/10 shadow-inner">
          
          {/* TOPO: INDICADOR 1/1 (CHEIO) */}
          <div className="w-full flex items-center justify-between text-xs font-mono font-bold text-slate-400 px-2 mb-2">
            <span className="tracking-widest">1/1 (CHEIO)</span>
            <span className={themeColors.textAccent}>50L</span>
          </div>

          {/* AS 8 BARRAS VERTICAIS ESTILO SANDERO */}
          <div className="w-full flex flex-col-reverse gap-1.5 py-1">
            {bars.map(barNum => {
              const isActive = barNum <= activeBars;
              const isReserveBar = barNum === 1;
              const litersAtThisBar = ((barNum / totalBars) * tankCapacity).toFixed(1);

              return (
                <button
                  key={barNum}
                  type="button"
                  disabled={!isManualMode && !onSelectBar}
                  onClick={() => {
                    if (onSelectBar) onSelectBar(barNum);
                    if (onSetLiters) onSetLiters((barNum / totalBars) * tankCapacity);
                  }}
                  className={`group relative w-full h-7 sm:h-8 rounded-md transition-all duration-300 flex items-center justify-between px-3 border font-mono ${
                    isActive
                      ? isReserveBar && isReserve
                        ? `${themeColors.reservePulse} border-orange-300 text-white font-black`
                        : `${themeColors.activeBg} ${themeColors.activeShadow} ${themeColors.activeBorder} text-slate-950 font-black`
                      : `${themeColors.ghostBg} text-slate-600 hover:border-slate-600`
                  } ${
                    isManualMode
                      ? 'cursor-pointer hover:scale-[1.02] active:scale-[0.98]'
                      : 'cursor-default'
                  }`}
                  title={
                    isManualMode
                      ? `Clique para definir o nível em ${barNum}/${totalBars} barras (${litersAtThisBar} L)`
                      : `Barra ${barNum} (${litersAtThisBar} L)`
                  }
                >
                  {/* MARCAÇÃO DE SEGMENTO ESTILO LCD SANDERO */}
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] opacity-80">
                      {barNum === 8 ? '8' : barNum === 4 ? '4' : barNum === 1 ? '1' : barNum}
                    </span>
                    <span className="text-[10px] tracking-wider hidden sm:inline opacity-75">
                      {barNum === 8
                        ? '1/1'
                        : barNum === 6
                        ? '3/4'
                        : barNum === 4
                        ? '1/2'
                        : barNum === 2
                        ? '1/4'
                        : barNum === 1
                        ? 'RESERVA'
                        : ''}
                    </span>
                  </div>

                  {/* LITRAGEM CORRESPONDENTE */}
                  <div className="flex items-center gap-1">
                    <span className="text-[10px] font-bold">
                      {litersAtThisBar} L
                    </span>
                    {isManualMode && (
                      <span className="text-[9px] opacity-0 group-hover:opacity-100 transition-opacity bg-black/40 px-1 rounded text-white">
                        Definir
                      </span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>

          {/* BASE: INDICADOR 0 / R (RESERVA) COM ÍCONE DA BOMBA DO SANDERO */}
          <div className="w-full flex items-center justify-between text-xs font-mono font-bold text-slate-400 px-2 mt-2 pt-2 border-t border-white/10">
            <div className="flex items-center gap-1.5">
              <span className="text-amber-400">◄ ⛽</span>
              <span className="tracking-widest">0 / R (RESERVA)</span>
            </div>
            <span className="text-orange-400">~6.5L</span>
          </div>

          {/* ALERTA DE RESERVA DO SANDERO SE ATIVO */}
          {isReserve && (
            <div className="w-full mt-3 p-2 rounded-xl bg-orange-950/60 border border-orange-500/50 flex items-center justify-center gap-2 text-orange-400 animate-pulse font-mono text-xs font-black">
              <AlertTriangle className="w-4 h-4" />
              <span>AVISO: NÍVEL EM RESERVA! ABASTECER.</span>
            </div>
          )}
        </div>

        {/* BLOCO DA DIREITA: COMPUTADOR DE BORDO SANDERO (AUTONOMIA & MÉTRICAS) */}
        <div className="lg:col-span-7 flex flex-col justify-between space-y-4 bg-black/50 p-5 sm:p-6 rounded-2xl border border-white/10">
          
          {/* DISPLAY LCD PRINCIPAL: AUTONOMIA EM KM */}
          <div className="bg-slate-950 p-4 sm:p-5 rounded-2xl border border-white/15 shadow-inner">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[10px] sm:text-xs font-mono font-bold tracking-widest text-slate-400 uppercase">
                COMPUTADOR DE BORDO • AUTONOMIA RESTANTE
              </span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-white/10 text-slate-300">
                Sandero 1.0 / 1.6
              </span>
            </div>

            <div className="flex items-baseline gap-2">
              <span className={`text-4xl sm:text-5xl font-black font-mono tracking-tight ${themeColors.textAccent}`}>
                {autonomyKm}
              </span>
              <span className="text-xl sm:text-2xl font-black font-mono text-white">KM</span>
            </div>

            <p className="text-xs text-slate-400 mt-1 font-mono">
              Estimativa calculada: {currentLiters.toFixed(1)}L restantes a {avgConsumption.toFixed(1)} km/L
            </p>
          </div>

          {/* TELEMETRIA DE CONFERÊNCIA DETALHADA */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            
            {/* 1. LITROS RESTANTES */}
            <div className="bg-white/5 p-3 rounded-xl border border-white/10">
              <span className="text-[10px] font-mono text-slate-400 block uppercase">Nível Atual</span>
              <div className="flex items-baseline gap-1 mt-0.5">
                <span className="text-lg font-black font-mono text-white">{currentLiters.toFixed(1)}</span>
                <span className="text-xs text-slate-400 font-mono">/ {tankCapacity}L</span>
              </div>
              <span className="text-[10px] text-amber-400 font-mono font-bold">
                {activeBars}/8 barras ({percentage.toFixed(0)}%)
              </span>
            </div>

            {/* 2. KM RODADOS NO TANQUE ATUAL */}
            <div className="bg-white/5 p-3 rounded-xl border border-white/10">
              <span className="text-[10px] font-mono text-slate-400 block uppercase">Km no Tanque</span>
              <div className="flex items-baseline gap-1 mt-0.5">
                <span className="text-lg font-black font-mono text-white">{kmDrivenSinceFueling.toFixed(0)}</span>
                <span className="text-xs text-slate-400 font-mono">KM</span>
              </div>
              <span className="text-[10px] text-slate-400 font-mono">
                Odômetro parcial
              </span>
            </div>

            {/* 3. COMBUSTÍVEL CONSUMIDO */}
            <div className="bg-white/5 p-3 rounded-xl border border-white/10">
              <span className="text-[10px] font-mono text-slate-400 block uppercase">Consumido</span>
              <div className="flex items-baseline gap-1 mt-0.5">
                <span className="text-lg font-black font-mono text-white">{litersConsumed.toFixed(1)}</span>
                <span className="text-xs text-slate-400 font-mono">L</span>
              </div>
              <span className="text-[10px] text-slate-400 font-mono">
                Desde abastecimento
              </span>
            </div>

            {/* 4. MÉDIA DO VEÍCULO */}
            <div className="bg-white/5 p-3 rounded-xl border border-white/10">
              <span className="text-[10px] font-mono text-slate-400 block uppercase">Média Sandero</span>
              <div className="flex items-baseline gap-1 mt-0.5">
                <span className="text-lg font-black font-mono text-emerald-400">{avgConsumption.toFixed(1)}</span>
                <span className="text-xs text-slate-400 font-mono">km/L</span>
              </div>
              <span className="text-[10px] text-slate-400 font-mono">Consumo misto</span>
            </div>

            {/* 5. AUTONOMIA ATÉ A RESERVA */}
            <div className="bg-white/5 p-3 rounded-xl border border-white/10">
              <span className="text-[10px] font-mono text-slate-400 block uppercase">Até a Reserva</span>
              <div className="flex items-baseline gap-1 mt-0.5">
                <span className="text-lg font-black font-mono text-orange-400">
                  {Math.max(0, Math.round((currentLiters - 6.5) * avgConsumption))}
                </span>
                <span className="text-xs text-slate-400 font-mono">KM</span>
              </div>
              <span className="text-[10px] text-slate-400 font-mono">Até luz acender</span>
            </div>

            {/* 6. QUANTOS LITROS P/ ENCHER */}
            <div className="bg-white/5 p-3 rounded-xl border border-white/10">
              <span className="text-[10px] font-mono text-slate-400 block uppercase">Falta p/ Cheio</span>
              <div className="flex items-baseline gap-1 mt-0.5">
                <span className="text-lg font-black font-mono text-teal-300">
                  {Math.max(0, tankCapacity - currentLiters).toFixed(1)}
                </span>
                <span className="text-xs text-slate-400 font-mono">L</span>
              </div>
              <span className="text-[10px] text-slate-400 font-mono">Completar tanque</span>
            </div>
          </div>

          {/* DICA DE INTERAÇÃO MANUAL SE ESTIVER EM MODO MANUAL */}
          {isManualMode && (
            <div className="bg-purple-950/40 border border-purple-500/30 p-3 rounded-xl flex items-center gap-2 text-xs text-purple-300 font-mono">
              <Sliders className="w-4 h-4 shrink-0 text-purple-400" />
              <span>
                <strong>Modo Manual Ativo:</strong> Clique diretamente em qualquer barra ao lado para ajustar o ponteiro conforme o painel real do seu Sandero.
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
