import React, { useState, useMemo, useEffect } from 'react';
import { useDriver } from '../context/DriverContext';
import { SanderoClusterFuelGauge } from './SanderoClusterFuelGauge';
import {
  formatCurrency,
  formatKm,
  safeDivide,
  calcFuelParity,
  calcSanderoLitersFromBarsAndAutonomy,
} from '../utils/calc';
import { FuelRecord } from '../types';

import {
  Fuel,
  Sliders,
  Zap,
  Plus,
  RefreshCw,
  AlertTriangle,
  CheckCircle2,
  Calendar,
  Gauge,
  Calculator,
  Car,
  Trash2,
  ArrowRight,
  TrendingDown,
  TrendingUp,
  Info,
  Check,
  Edit2,
  X,
  Palette,
} from 'lucide-react';

export interface FuelTankManagementViewProps {
  onOpenQuickFuel?: () => void;
  onOpenFuelAdvisor?: () => void;
}

interface SanderoTankStorageState {
  mode: 'auto' | 'manual';
  manualLiters: number;
  theme: 'amber' | 'cyan' | 'white';
  baseOdometer: number;
  baseLiters: number;
  baseDate: string;
}

export const FuelTankManagementView: React.FC<FuelTankManagementViewProps> = ({
  onOpenQuickFuel,
  onOpenFuelAdvisor,
}) => {
  const {
    vehicle,
    updateVehicle,
    fuelRecords,
    addFuelRecord,
    deleteFuelRecord,
    profile,
    sessions,
  } = useDriver();

  const tankCapacity = vehicle.tankCapacity || 50; // Sandero padrão é 50L
  const avgConsumption = vehicle.avgConsumption || 12.5; // Sandero 1.0 ou 1.6
  const totalBars = 8; // 8 barras do painel Sandero

  // Estado persistido do tanque do Sandero
  const [tankConfig, setTankConfig] = useState<SanderoTankStorageState>(() => {
    const saved = localStorage.getItem('@driver_sandero_tank_v2');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        return {
          mode: parsed.mode || 'auto',
          manualLiters: parsed.manualLiters !== undefined ? parsed.manualLiters : 37.5,
          theme: parsed.theme || 'amber',
          baseOdometer: parsed.baseOdometer || vehicle.currentOdometer - 120,
          baseLiters: parsed.baseLiters !== undefined ? parsed.baseLiters : tankCapacity,
          baseDate: parsed.baseDate || new Date().toISOString().split('T')[0],
        };
      } catch (e) {
        console.error('Erro ao ler dados do tanque Sandero:', e);
      }
    }
    return {
      mode: 'auto',
      manualLiters: 37.5, // 6/8 barras inicial
      theme: 'amber',
      baseOdometer: Math.max(0, vehicle.currentOdometer - 140),
      baseLiters: 50,
      baseDate: new Date().toISOString().split('T')[0],
    };
  });

  // Salvar no localStorage sempre que mudar
  useEffect(() => {
    localStorage.setItem('@driver_sandero_tank_v2', JSON.stringify(tankConfig));
  }, [tankConfig]);

  // Modal para atualizar Odômetro do Veículo
  const [showOdoModal, setShowOdoModal] = useState(false);
  const [tempOdometer, setTempOdometer] = useState(vehicle.currentOdometer.toString());

  // Mensagem temporária de notificação
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3000);
  };

  // Calculadora Rápida Etanol vs Gasolina
  const [gasPriceInput, setGasPriceInput] = useState<string>(
    profile.gasPriceReference ? profile.gasPriceReference.toString() : '5.89'
  );
  const [ethPriceInput, setEthPriceInput] = useState<string>(
    profile.gasPriceReference ? (profile.gasPriceReference * 0.68).toFixed(2) : '3.99'
  );

  // Calculadora Inteligente Sandero (Barras + Autonomia -> Litros)
  const [sanderoCalcBars, setSanderoCalcBars] = useState<number>(5);
  const [sanderoCalcAutonomy, setSanderoCalcAutonomy] = useState<string>('280');
  
  const sanderoCalcResult = useMemo(() => {
    const autoKm = parseFloat(sanderoCalcAutonomy) || 0;
    return calcSanderoLitersFromBarsAndAutonomy({
      bars: sanderoCalcBars,
      autonomyKm: autoKm,
      tankCapacity,
      avgConsumption,
      totalBars,
    });
  }, [sanderoCalcBars, sanderoCalcAutonomy, tankCapacity, avgConsumption, totalBars]);

  // Sincronizar o resultado do cálculo com o tanque
  const handleApplySanderoCalcToTank = (asBaseZero = false) => {
    const litersToApply = sanderoCalcResult.recommendedLiters;
    setTankConfig(prev => ({
      ...prev,
      manualLiters: litersToApply,
      mode: asBaseZero ? 'auto' : 'manual',
      baseLiters: asBaseZero ? litersToApply : prev.baseLiters,
      baseOdometer: asBaseZero ? vehicle.currentOdometer : prev.baseOdometer,
      baseDate: new Date().toISOString().split('T')[0],
    }));

    if (asBaseZero) {
      showToast(`Tanque calibrado para ${litersToApply.toFixed(1)} L e salvo como novo Marco Zero (Auto)!`);
    } else {
      showToast(`Tanque calibrado para ${litersToApply.toFixed(1)} L (${sanderoCalcBars}/8 barras)!`);
    }
  };


  // Ordenar abastecimentos do mais recente para o mais antigo
  const sortedFuelRecords = useMemo(() => {
    return [...fuelRecords].sort((a, b) => {
      const dateDiff = new Date(b.date).getTime() - new Date(a.date).getTime();
      if (dateDiff !== 0) return dateDiff;
      return (b.odometer || 0) - (a.odometer || 0);
    });
  }, [fuelRecords]);

  // Último abastecimento registrado
  const lastFuelRecord = sortedFuelRecords[0] || null;

  // --- CÁLCULO DE TELEMETRIA AUTOMÁTICA ---
  const autoTelemetry = useMemo(() => {
    // Odômetro base: do último abastecimento ou calibração salva
    const baseOdo = lastFuelRecord ? lastFuelRecord.odometer : tankConfig.baseOdometer;
    const currentOdo = vehicle.currentOdometer;
    const kmDriven = Math.max(0, currentOdo - baseOdo);

    // Litros base: se foi abastecimento cheio ou registros
    let baseLiters = tankConfig.baseLiters;
    if (lastFuelRecord) {
      baseLiters = lastFuelRecord.liters >= tankCapacity * 0.85
        ? tankCapacity
        : Math.min(tankCapacity, lastFuelRecord.liters + 10);
    }

    const litersConsumed = safeDivide(kmDriven, avgConsumption);
    const remainingLiters = Math.max(0, Math.min(tankCapacity, baseLiters - litersConsumed));
    const autonomy = Math.round(remainingLiters * avgConsumption);

    // Número de barras ativas (0 a 8)
    let activeBars = Math.round((remainingLiters / tankCapacity) * totalBars);
    if (remainingLiters > 0 && activeBars === 0) activeBars = 1; // Pelo menos 1 barra de reserva enquanto houver combustível
    if (remainingLiters <= 0) activeBars = 0;

    return {
      baseOdometer: baseOdo,
      currentOdometer: currentOdo,
      kmDriven,
      litersConsumed,
      remainingLiters,
      autonomy,
      activeBars: Math.min(totalBars, Math.max(0, activeBars)),
      isReserve: remainingLiters <= 6.5,
    };
  }, [lastFuelRecord, tankConfig.baseOdometer, tankConfig.baseLiters, vehicle.currentOdometer, tankCapacity, avgConsumption]);

  // --- NÍVEL ATUAL DEPENDENDO DO MODO ---
  const currentLevel = useMemo(() => {
    if (tankConfig.mode === 'manual') {
      const manualLiters = Math.max(0, Math.min(tankCapacity, tankConfig.manualLiters));
      let bars = Math.round((manualLiters / tankCapacity) * totalBars);
      if (manualLiters > 0 && bars === 0) bars = 1;
      if (manualLiters <= 0) bars = 0;

      const autonomy = Math.round(manualLiters * avgConsumption);
      const isReserve = manualLiters <= 6.5;

      return {
        liters: manualLiters,
        activeBars: Math.min(totalBars, Math.max(0, bars)),
        autonomy,
        isReserve,
        kmDriven: autoTelemetry.kmDriven,
        litersConsumed: Math.max(0, tankCapacity - manualLiters),
      };
    } else {
      return {
        liters: autoTelemetry.remainingLiters,
        activeBars: autoTelemetry.activeBars,
        autonomy: autoTelemetry.autonomy,
        isReserve: autoTelemetry.isReserve,
        kmDriven: autoTelemetry.kmDriven,
        litersConsumed: autoTelemetry.litersConsumed,
      };
    }
  }, [tankConfig.mode, tankConfig.manualLiters, tankCapacity, totalBars, avgConsumption, autoTelemetry]);

  // Função para definir litros no modo manual
  const handleSetManualLiters = (liters: number) => {
    const clamped = Math.max(0, Math.min(tankCapacity, Number(liters.toFixed(1))));
    setTankConfig(prev => ({
      ...prev,
      mode: 'manual',
      manualLiters: clamped,
    }));
  };

  // Função para definir barras no modo manual
  const handleSelectBar = (barIndex: number) => {
    const litersForBar = (barIndex / totalBars) * tankCapacity;
    handleSetManualLiters(litersForBar);
    showToast(`Painel ajustado para ${barIndex}/8 barras (${litersForBar.toFixed(1)} L)`);
  };

  // Sincronizar calibração com Tanque Cheio (50L)
  const handleCalibrateFullTank = () => {
    setTankConfig(prev => ({
      ...prev,
      baseOdometer: vehicle.currentOdometer,
      baseLiters: tankCapacity,
      baseDate: new Date().toISOString().split('T')[0],
      manualLiters: tankCapacity,
    }));
    showToast(`Tanque Cheio calibrado! Odômetro base: ${formatKm(vehicle.currentOdometer)}`);
  };

  // Sincronizar o nível manual como novo marco zero do odômetro
  const handleSyncManualAsBase = () => {
    setTankConfig(prev => ({
      ...prev,
      baseOdometer: vehicle.currentOdometer,
      baseLiters: prev.manualLiters,
      baseDate: new Date().toISOString().split('T')[0],
      mode: 'auto',
    }));
    showToast(`Nível manual de ${tankConfig.manualLiters.toFixed(1)}L salvo como marco zero para o modo automático!`);
  };

  // Salvar novo odômetro no veículo
  const handleSaveOdometer = (e: React.FormEvent) => {
    e.preventDefault();
    const newOdo = parseInt(tempOdometer, 10);
    if (!isNaN(newOdo) && newOdo >= 0) {
      updateVehicle({ currentOdometer: newOdo });
      setShowOdoModal(false);
      showToast(`Odômetro atualizado para ${formatKm(newOdo)}`);
    }
  };

  // Estatísticas de abastecimento
  const fuelStats = useMemo(() => {
    const totalSpent = fuelRecords.reduce((acc, r) => acc + (r.totalAmount || 0), 0);
    const totalLiters = fuelRecords.reduce((acc, r) => acc + (r.liters || 0), 0);
    const avgPrice = safeDivide(totalSpent, totalLiters);

    // Calcular consumo médio real entre abastecimentos consecutivos
    let realKmPerLiterSum = 0;
    let validPairsCount = 0;

    for (let i = 0; i < sortedFuelRecords.length - 1; i++) {
      const current = sortedFuelRecords[i];
      const prev = sortedFuelRecords[i + 1];
      if (current.odometer && prev.odometer && current.odometer > prev.odometer && current.liters > 0) {
        const deltaKm = current.odometer - prev.odometer;
        const kmPerL = deltaKm / current.liters;
        if (kmPerL >= 5 && kmPerL <= 25) {
          realKmPerLiterSum += kmPerL;
          validPairsCount++;
        }
      }
    }

    const calculatedAvgKmPerL = validPairsCount > 0 ? realKmPerLiterSum / validPairsCount : avgConsumption;

    return {
      totalSpent,
      totalLiters,
      avgPrice,
      calculatedAvgKmPerL,
      recordsCount: fuelRecords.length,
    };
  }, [fuelRecords, sortedFuelRecords, avgConsumption]);

  // Paridade Etanol x Gasolina
  const parityAnalysis = useMemo(() => {
    const gas = parseFloat(gasPriceInput) || 5.89;
    const eth = parseFloat(ethPriceInput) || 3.99;
    return calcFuelParity(eth, gas, avgConsumption, true);
  }, [gasPriceInput, ethPriceInput, avgConsumption]);

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-12">
      
      {/* TOAST FLUTUANTE */}
      {toastMsg && (
        <div className="fixed top-20 right-4 z-50 bg-emerald-500 text-slate-950 px-4 py-2.5 rounded-2xl font-black text-xs shadow-2xl flex items-center gap-2 animate-bounce">
          <CheckCircle2 className="w-4 h-4 stroke-[3]" />
          <span>{toastMsg}</span>
        </div>
      )}

      {/* HEADER DA ABA */}
      <div className="bg-white/5 backdrop-blur-lg border border-white/10 p-5 sm:p-6 rounded-3xl space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-amber-500 to-orange-500 text-slate-950 flex items-center justify-center font-black shadow-lg shadow-amber-500/20 shrink-0">
              <Fuel className="w-6 h-6 stroke-[2.5]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg sm:text-xl font-black text-white tracking-tight">
                  CONFERÊNCIA DE NÍVEL DE TANQUE
                </h2>
                <span className="text-[10px] bg-amber-500/20 text-amber-300 font-bold px-2 py-0.5 rounded-full border border-amber-500/30">
                  RENAULT SANDERO
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Painel digital por barras LCD com cálculo de autonomia em tempo real e gestão de abastecimentos.
              </p>
            </div>
          </div>

          {/* BOTÕES DE AÇÃO RÁPIDA */}
          <div className="flex items-center gap-2 flex-wrap">
            {onOpenQuickFuel && (
              <button
                type="button"
                onClick={onOpenQuickFuel}
                className="px-3.5 py-2 rounded-2xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 font-black text-xs flex items-center gap-1.5 shadow-md shadow-amber-500/20 transition active:scale-95"
              >
                <Plus className="w-4 h-4 stroke-[3]" />
                <span>LANÇAR ABASTECIMENTO</span>
              </button>
            )}

            <button
              type="button"
              onClick={handleCalibrateFullTank}
              className="px-3 py-2 rounded-2xl bg-white/10 hover:bg-white/15 text-white font-bold text-xs flex items-center gap-1.5 border border-white/10 transition"
              title="Marcar que acabou de encher o tanque até a boca (50L)"
            >
              <RefreshCw className="w-3.5 h-3.5 text-amber-400" />
              <span className="hidden sm:inline">Marcar</span> Tanque Cheio
            </button>
          </div>
        </div>

        {/* CONTROLE DE MODO (AUTOMÁTICO vs MANUAL) & TEMA */}
        <div className="pt-3 border-t border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          
          {/* SELETOR DE MODO */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              Modo de Controle:
            </span>
            <div className="bg-black/50 p-1 rounded-2xl border border-white/10 flex items-center gap-1">
              <button
                type="button"
                onClick={() => {
                  setTankConfig(prev => ({ ...prev, mode: 'auto' }));
                  showToast('Modo Automático ativado! Telemetria por km e lançamentos.');
                }}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
                  tankConfig.mode === 'auto'
                    ? 'bg-emerald-500 text-slate-950 font-black shadow-md shadow-emerald-500/20'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Zap className="w-3.5 h-3.5" />
                <span>Automático (Lançamentos)</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setTankConfig(prev => ({ ...prev, mode: 'manual' }));
                  showToast('Modo Manual ativado! Clique nas barras para calibrar.');
                }}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
                  tankConfig.mode === 'manual'
                    ? 'bg-purple-500 text-white font-black shadow-md shadow-purple-500/20'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Sliders className="w-3.5 h-3.5" />
                <span>Manual (Ajuste Direto)</span>
              </button>
            </div>
          </div>

          {/* TEMAS DO CLUSTER RENAULT */}
          <div className="flex items-center gap-1.5 text-xs text-slate-400">
            <Palette className="w-3.5 h-3.5" />
            <span className="text-[11px] font-bold">LCD:</span>
            {(['amber', 'cyan', 'white'] as const).map(t => (
              <button
                key={t}
                type="button"
                onClick={() => setTankConfig(prev => ({ ...prev, theme: t }))}
                className={`px-2 py-0.5 rounded-md font-mono text-[10px] font-black uppercase transition border ${
                  tankConfig.theme === t
                    ? t === 'amber'
                      ? 'bg-amber-500 text-slate-950 border-amber-400'
                      : t === 'cyan'
                      ? 'bg-cyan-400 text-slate-950 border-cyan-300'
                      : 'bg-white text-slate-950 border-white'
                    : 'border-white/10 text-slate-400 hover:text-white'
                }`}
              >
                {t === 'amber' ? 'Âmbar (Sandero)' : t === 'cyan' ? 'Cyan' : 'Branco'}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* PAINEL HERO: INSTRUMENT CLUSTER RENAULT SANDERO */}
      <SanderoClusterFuelGauge
        currentLiters={currentLevel.liters}
        tankCapacity={tankCapacity}
        avgConsumption={avgConsumption}
        activeBars={currentLevel.activeBars}
        totalBars={totalBars}
        autonomyKm={currentLevel.autonomy}
        kmDrivenSinceFueling={currentLevel.kmDriven}
        litersConsumed={currentLevel.litersConsumed}
        isReserve={currentLevel.isReserve}
        isManualMode={tankConfig.mode === 'manual'}
        theme={tankConfig.theme}
        onSelectBar={handleSelectBar}
        onSetLiters={handleSetManualLiters}
      />

      {/* CALCULADORA DE LITROS DO SANDERO (BARRAS + AUTONOMIA DO PAINEL) */}
      <div className="bg-gradient-to-br from-amber-950/30 via-slate-900 to-slate-950 border-2 border-amber-500/40 p-5 sm:p-6 rounded-3xl space-y-5 shadow-2xl relative overflow-hidden">
        
        {/* CABEÇALHO DA FERRAMENTA */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-amber-500/20 pb-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/20 border border-amber-400/40 flex items-center justify-center text-amber-400 font-bold shadow-inner">
              <Calculator className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-black text-white font-mono uppercase tracking-wider flex items-center gap-2">
                CÁLCULO DE LITROS DO SANDERO (BARRAS + AUTONOMIA)
              </h3>
              <p className="text-xs text-slate-300">
                Informe as barras e a autonomia do cluster para calcular com precisão os litros no tanque
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[11px] font-mono font-bold text-amber-400 bg-amber-500/15 border border-amber-500/30 px-2.5 py-1 rounded-full">
              Tanque: {tankCapacity}L • Média: {avgConsumption.toFixed(1)} km/L
            </span>
          </div>
        </div>

        {/* INPUTS: BARRAS & AUTONOMIA */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          
          {/* 1. SELETOR DE BARRAS LCD DO SANDERO */}
          <div className="bg-black/60 p-4 rounded-2xl border border-white/10 space-y-2.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-black text-white uppercase font-mono flex items-center gap-1.5">
                <span>1. Quantas Barras Estão Acesas?</span>
              </label>
              <span className="text-xs font-black font-mono text-amber-400">
                {sanderoCalcBars === 0 ? '0 / Reserva (0L)' : `${sanderoCalcBars} de 8 barras (~${sanderoCalcResult.litersFromBars.toFixed(1)} L)`}
              </span>
            </div>

            {/* SELETOR INTERATIVO DE 0 A 8 */}
            <div className="grid grid-cols-9 gap-1.5">
              {[0, 1, 2, 3, 4, 5, 6, 7, 8].map(barNum => {
                const isSelected = sanderoCalcBars === barNum;
                const isReserve = barNum === 0 || barNum === 1;

                return (
                  <button
                    key={barNum}
                    type="button"
                    onClick={() => setSanderoCalcBars(barNum)}
                    className={`h-11 rounded-xl font-mono text-xs font-black flex flex-col items-center justify-center transition border active:scale-95 ${
                      isSelected
                        ? isReserve && barNum === 0
                          ? 'bg-orange-600 text-white border-orange-400 shadow-lg shadow-orange-600/40 ring-2 ring-orange-400'
                          : 'bg-gradient-to-t from-amber-500 to-amber-400 text-slate-950 border-amber-300 shadow-lg shadow-amber-500/40 ring-2 ring-amber-300'
                        : 'bg-slate-800/80 text-slate-300 border-slate-700 hover:bg-slate-700 hover:text-white'
                    }`}
                  >
                    <span>{barNum === 0 ? 'R' : barNum}</span>
                    <span className="text-[9px] opacity-75 font-normal">
                      {barNum === 0 ? '0L' : `${Math.round((barNum / 8) * 100)}%`}
                    </span>
                  </button>
                );
              })}
            </div>

            <p className="text-[11px] text-slate-400 font-mono">
              * Cada barra do Sandero (50L) corresponde a exatamente <strong>6,25 Litros</strong>.
            </p>
          </div>

          {/* 2. AUTONOMIA EXIBIDA NO COMPUTADOR DE BORDO */}
          <div className="bg-black/60 p-4 rounded-2xl border border-white/10 space-y-2.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-black text-white uppercase font-mono flex items-center gap-1.5">
                <span>2. Autonomia Marcada no Painel</span>
              </label>
              <span className="text-[11px] text-slate-400 font-mono">
                (Computador de Bordo)
              </span>
            </div>

            <div className="relative">
              <input
                type="number"
                placeholder="Ex: 280 (KM no cluster do Sandero)"
                value={sanderoCalcAutonomy}
                onChange={e => setSanderoCalcAutonomy(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-2xl px-4 py-3 text-sm text-white font-mono placeholder:text-slate-600 focus:outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400"
              />
              <span className="absolute right-4 top-3.5 text-xs font-mono text-amber-400 font-black">
                KM
              </span>
            </div>

            {/* ATALHOS RÁPIDOS DE AUTONOMIA */}
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-[10px] text-slate-400 font-bold uppercase">Atalhos:</span>
              {[80, 150, 250, 350, 450, 550].map(kmVal => (
                <button
                  key={kmVal}
                  type="button"
                  onClick={() => setSanderoCalcAutonomy(kmVal.toString())}
                  className="px-2 py-0.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-[10px] font-mono text-slate-300 transition"
                >
                  {kmVal} km
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* CARTÃO DE RESULTADO E DADOS CALCULADOS */}
        <div className="bg-black/80 border border-amber-500/30 rounded-2xl p-4 sm:p-5 space-y-4 shadow-inner">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            
            {/* LITROS NO TANQUE (PRINCIPAL) */}
            <div className="bg-amber-950/30 border border-amber-500/30 p-3.5 rounded-xl">
              <span className="text-[10px] font-mono font-bold text-amber-400 uppercase tracking-wider block">
                LITROS NO TANQUE
              </span>
              <div className="flex items-baseline gap-1.5 mt-1">
                <span className="text-3xl sm:text-4xl font-black font-mono text-white">
                  {sanderoCalcResult.recommendedLiters.toFixed(1)}
                </span>
                <span className="text-lg font-black font-mono text-amber-400">L</span>
                <span className="text-xs font-mono text-slate-400 ml-1">/ {tankCapacity}L</span>
              </div>
              <span className="text-[11px] font-mono text-amber-300 block mt-0.5">
                {sanderoCalcResult.barsPercentage}% do volume total
              </span>
            </div>

            {/* AUTONOMIA CORRESPONDENTE */}
            <div className="bg-slate-900/80 border border-white/10 p-3.5 rounded-xl">
              <span className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-wider block">
                AUTONOMIA CALCULADA
              </span>
              <div className="flex items-baseline gap-1.5 mt-1">
                <span className="text-3xl sm:text-4xl font-black font-mono text-emerald-400">
                  {parseFloat(sanderoCalcAutonomy) > 0 ? parseFloat(sanderoCalcAutonomy) : sanderoCalcResult.autonomyEstimatedFromBars}
                </span>
                <span className="text-lg font-black font-mono text-white">KM</span>
              </div>
              <span className="text-[11px] font-mono text-slate-400 block mt-0.5">
                Com média de {avgConsumption.toFixed(1)} km/L
              </span>
            </div>

            {/* MÉDIA INFERIDA PELO CARRO */}
            <div className="bg-slate-900/80 border border-white/10 p-3.5 rounded-xl">
              <span className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-wider block">
                MÉDIA INFERIDA PELO PAINEL
              </span>
              <div className="flex items-baseline gap-1.5 mt-1">
                <span className="text-3xl sm:text-4xl font-black font-mono text-sky-400">
                  {sanderoCalcResult.impliedConsumption.toFixed(1)}
                </span>
                <span className="text-base font-black font-mono text-white">km/L</span>
              </div>
              <span className="text-[11px] font-mono text-slate-400 block mt-0.5">
                Autonomia informada ÷ Litros
              </span>
            </div>
          </div>

          {/* EXPLICAÇÃO DO CÁLCULO */}
          <div className="p-3 rounded-xl bg-white/5 border border-white/10 flex items-start gap-2.5">
            <Info className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
            <p className="text-xs text-slate-300 font-mono leading-relaxed">
              {sanderoCalcResult.explanation}
            </p>
          </div>

          {/* BOTÕES DE AÇÃO IMEDIATA */}
          <div className="flex flex-col sm:flex-row items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={() => handleApplySanderoCalcToTank(false)}
              className="w-full sm:w-auto px-5 py-3 rounded-2xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs flex items-center justify-center gap-2 shadow-lg shadow-amber-500/25 transition active:scale-95"
            >
              <Check className="w-4 h-4 stroke-[3]" />
              <span>Sincronizar com o Tanque ({sanderoCalcResult.recommendedLiters.toFixed(1)} L)</span>
            </button>

            <button
              type="button"
              onClick={() => handleApplySanderoCalcToTank(true)}
              className="w-full sm:w-auto px-4 py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center justify-center gap-2 transition active:scale-95"
              title="Salva os litros calculados e o odômetro atual como ponto de partida para o rastreamento automático"
            >
              <Zap className="w-4 h-4" />
              <span>Salvar Marco Zero (Modo Auto)</span>
            </button>
          </div>
        </div>
      </div>

      {/* CONTROLES E CALIBRAÇÃO CONFORME O MODO SELECIONADO */}
      {tankConfig.mode === 'manual' ? (

        /* PAINEL DE CONTROLE MANUAL */
        <div className="bg-purple-950/20 border border-purple-500/30 p-5 rounded-3xl space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-black text-purple-300 uppercase tracking-wider flex items-center gap-2">
                <Sliders className="w-4 h-4 text-purple-400" />
                AJUSTE DIRETO DO NÍVEL DO TANQUE
              </h3>
              <p className="text-xs text-slate-300 mt-0.5">
                Escolha o nível que está marcando no ponteiro real do seu Sandero agora para sincronizar a autonomia.
              </p>
            </div>

            {/* BOTÃO PARA SALVAR COMO NOVO MARCO ZERO */}
            <button
              type="button"
              onClick={handleSyncManualAsBase}
              className="px-3.5 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-black text-xs flex items-center gap-1.5 shadow-md transition self-start sm:self-auto"
            >
              <Check className="w-4 h-4 stroke-[3]" />
              <span>Salvar Marco Zero & Voltar p/ Auto</span>
            </button>
          </div>

          {/* BOTÕES RÁPIDOS DE 1 TOQUE (RESERVA, 1/4, 1/2, 3/4, CHEIO) */}
          <div>
            <span className="text-[11px] font-bold text-slate-400 block mb-2 uppercase">
              Atalhos Rápidos de Nível:
            </span>
            <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-8 gap-2 font-mono">
              {[
                { label: '0 / Vazio', liters: 0, bars: 0, desc: '0L' },
                { label: 'Reserva', liters: 6.25, bars: 1, desc: '6.2L' },
                { label: '1/4 Tanque', liters: 12.5, bars: 2, desc: '12.5L' },
                { label: '3/8 Tanque', liters: 18.75, bars: 3, desc: '18.7L' },
                { label: '1/2 Meio', liters: 25.0, bars: 4, desc: '25.0L' },
                { label: '5/8 Tanque', liters: 31.25, bars: 5, desc: '31.2L' },
                { label: '3/4 Tanque', liters: 37.5, bars: 6, desc: '37.5L' },
                { label: '1/1 Cheio', liters: 50.0, bars: 8, desc: '50.0L' },
              ].map(preset => {
                const isSelected = Math.abs(currentLevel.liters - preset.liters) < 2;
                return (
                  <button
                    key={preset.label}
                    type="button"
                    onClick={() => handleSetManualLiters(preset.liters)}
                    className={`p-2.5 rounded-xl border text-center transition ${
                      isSelected
                        ? 'bg-purple-500 text-white border-purple-400 font-black shadow-md'
                        : 'bg-white/5 border-white/10 text-slate-300 hover:bg-white/10'
                    }`}
                  >
                    <span className="text-[10px] block font-bold truncate">{preset.label}</span>
                    <span className="text-xs font-black block mt-0.5">{preset.desc}</span>
                    <span className="text-[9px] text-slate-400 block">{preset.bars}/8</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* SLIDER DE LITRAGEM FINA */}
          <div className="bg-black/40 p-4 rounded-2xl border border-white/10 space-y-2">
            <div className="flex items-center justify-between text-xs font-mono">
              <span className="text-slate-400">Ajuste Fino por Litros:</span>
              <span className="font-black text-purple-300 text-sm">
                {currentLevel.liters.toFixed(1)} Litros ({((currentLevel.liters / tankCapacity) * 100).toFixed(0)}%)
              </span>
            </div>
            <input
              type="range"
              min="0"
              max={tankCapacity}
              step="0.5"
              value={currentLevel.liters}
              onChange={e => handleSetManualLiters(parseFloat(e.target.value))}
              className="w-full accent-purple-500 cursor-pointer"
            />
            <div className="flex justify-between text-[10px] font-mono text-slate-500">
              <span>0 L (Seco)</span>
              <span>12.5 L (1/4)</span>
              <span>25 L (1/2)</span>
              <span>37.5 L (3/4)</span>
              <span>50 L (Cheio)</span>
            </div>
          </div>
        </div>
      ) : (
        /* PAINEL DE TELEMETRIA AUTOMÁTICA DETALHADA */
        <div className="bg-emerald-950/20 border border-emerald-500/30 p-5 rounded-3xl space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-black text-emerald-300 uppercase tracking-wider flex items-center gap-2">
                <Zap className="w-4 h-4 text-emerald-400" />
                CONFERÊNCIA DE TELEMETRIA AUTOMÁTICA
              </h3>
              <p className="text-xs text-slate-300 mt-0.5">
                Cálculo em tempo real baseado nos seus abastecimentos e odômetro rodado no carro.
              </p>
            </div>

            {/* BOTÃO ATUALIZAR ODÔMETRO */}
            <button
              type="button"
              onClick={() => {
                setTempOdometer(vehicle.currentOdometer.toString());
                setShowOdoModal(true);
              }}
              className="px-3 py-1.5 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/30 font-bold text-xs flex items-center gap-1.5 transition self-start sm:self-auto"
            >
              <Gauge className="w-3.5 h-3.5 text-emerald-400" />
              <span>Odômetro: {formatKm(vehicle.currentOdometer)} (Editar)</span>
            </button>
          </div>

          {/* EQUAÇÃO TRANSPARENTE DE CÁLCULO */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            
            {/* ETAPA 1: BASE */}
            <div className="bg-black/50 p-3.5 rounded-2xl border border-white/10 space-y-1">
              <span className="text-[10px] font-mono uppercase text-slate-400 block">1. Ponto de Partida</span>
              <span className="text-sm font-black text-white font-mono block">
                {lastFuelRecord ? lastFuelRecord.date : tankConfig.baseDate}
              </span>
              <p className="text-[11px] text-slate-400 font-mono">
                Odômetro base: {formatKm(autoTelemetry.baseOdometer)}
              </p>
            </div>

            {/* ETAPA 2: KM RODADOS */}
            <div className="bg-black/50 p-3.5 rounded-2xl border border-white/10 space-y-1">
              <span className="text-[10px] font-mono uppercase text-slate-400 block">2. Rodado no Tanque</span>
              <span className="text-sm font-black text-amber-400 font-mono block">
                {formatKm(autoTelemetry.kmDriven)}
              </span>
              <p className="text-[11px] text-slate-400 font-mono">
                {vehicle.currentOdometer} - {autoTelemetry.baseOdometer} km
              </p>
            </div>

            {/* ETAPA 3: CONSUMO CALCULADO */}
            <div className="bg-black/50 p-3.5 rounded-2xl border border-white/10 space-y-1">
              <span className="text-[10px] font-mono uppercase text-slate-400 block">3. Litros Consumidos</span>
              <span className="text-sm font-black text-orange-400 font-mono block">
                {autoTelemetry.litersConsumed.toFixed(1)} L
              </span>
              <p className="text-[11px] text-slate-400 font-mono">
                {autoTelemetry.kmDriven}km ÷ {avgConsumption}km/L
              </p>
            </div>

            {/* ETAPA 4: AUTONOMIA ATUAL */}
            <div className="bg-black/50 p-3.5 rounded-2xl border border-white/10 space-y-1">
              <span className="text-[10px] font-mono uppercase text-slate-400 block">4. Autonomia Sandero</span>
              <span className="text-sm font-black text-emerald-400 font-mono block">
                {autoTelemetry.autonomy} KM
              </span>
              <p className="text-[11px] text-slate-400 font-mono">
                {autoTelemetry.remainingLiters.toFixed(1)}L × {avgConsumption}km/L
              </p>
            </div>
          </div>
        </div>
      )}

      {/* SESSÃO 2: FERRAMENTAS PRÁTICAS (COMPARADOR FLEX & CONSULTOR) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        
        {/* FERRAMENTA 1: CALCULADORA ETANOL vs GASOLINA (QUAL COMPENSA NO SANDERO?) */}
        <div className="bg-white/5 backdrop-blur-lg border border-white/10 p-5 rounded-3xl space-y-3.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center font-bold">
                <Calculator className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-black text-white">ETANOL vs GASOLINA NO SANDERO</h3>
                <p className="text-[11px] text-slate-400">Paridade real com consumo do motor {vehicle.make} {vehicle.model}</p>
              </div>
            </div>
            <span className="text-[10px] font-mono bg-white/10 px-2 py-0.5 rounded text-slate-300">
              {parityAnalysis.ratioPercent.toFixed(1)}%
            </span>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">
                Gasolina Comum (R$/L)
              </label>
              <input
                type="number"
                step="0.01"
                value={gasPriceInput}
                onChange={e => setGasPriceInput(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-black/40 border border-white/10 font-mono text-sm text-white focus:outline-none focus:border-amber-400"
              />
            </div>
            <div>
              <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">
                Etanol Hidratado (R$/L)
              </label>
              <input
                type="number"
                step="0.01"
                value={ethPriceInput}
                onChange={e => setEthPriceInput(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-black/40 border border-white/10 font-mono text-sm text-white focus:outline-none focus:border-amber-400"
              />
            </div>
          </div>

          {/* VEREDITO */}
          <div
            className={`p-3 rounded-2xl border flex items-center gap-3 ${
              parityAnalysis.verdict === 'GASOLINA'
                ? 'bg-amber-500/15 border-amber-500/30 text-amber-300'
                : 'bg-emerald-500/15 border-emerald-500/30 text-emerald-300'
            }`}
          >
            <div className="text-2xl font-black">⛽</div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-black uppercase">
                  COMPENSA ABASTECER COM: {parityAnalysis.verdict}
                </span>
              </div>
              <p className="text-[11px] opacity-90 mt-0.5">
                Custo por km: {formatCurrency(parityAnalysis.costPerKmEth)}/km (Etanol) vs {formatCurrency(parityAnalysis.costPerKmGas)}/km (Gasolina).
              </p>
            </div>
          </div>
        </div>

        {/* FERRAMENTA 2: CONSULTOR DE AUTONOMIA PARA O DIA */}
        <div className="bg-white/5 backdrop-blur-lg border border-white/10 p-5 rounded-3xl space-y-3.5 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold">
                <Car className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-black text-white">DEVO ABASTECER HOJE?</h3>
                <p className="text-[11px] text-slate-400">Planejamento de escala e autonomia para a jornada</p>
              </div>
            </div>

            <div className="bg-black/40 p-3 rounded-2xl border border-white/10 space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Autonomia no tanque:</span>
                <span className="font-mono font-bold text-white">{currentLevel.autonomy} km</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Meta diária estimada:</span>
                <span className="font-mono font-bold text-slate-300">~120 km / dia</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Capacidade de trabalho:</span>
                <span className="font-mono font-bold text-emerald-400">
                  {Math.floor(currentLevel.autonomy / 120)} turno(s) completo(s)
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between pt-2 border-t border-white/10">
            {currentLevel.isReserve ? (
              <span className="text-xs font-black text-orange-400 flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4" /> Abasteça antes de ligar os apps!
              </span>
            ) : (
              <span className="text-xs font-black text-emerald-400 flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4" /> Tanque suficiente para trabalhar hoje.
              </span>
            )}

            {onOpenFuelAdvisor && (
              <button
                type="button"
                onClick={onOpenFuelAdvisor}
                className="text-xs text-amber-400 hover:text-amber-300 font-bold flex items-center gap-1"
              >
                <span>Ver Consultor Completo</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* SESSÃO 3: HISTÓRICO & SESSÃO COMPLETA DE ABASTECIMENTOS */}
      <div className="bg-white/5 backdrop-blur-lg border border-white/10 p-5 sm:p-6 rounded-3xl space-y-5">
        
        {/* HEADER DA SESSÃO */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-base font-black text-white flex items-center gap-2">
              <Fuel className="w-5 h-5 text-amber-400" />
              SESSÃO DE ABASTECIMENTOS (HISTÓRICO)
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Registros detalhados de postos, litros, preços por litro e média real apurada entre tanques.
            </p>
          </div>

          {onOpenQuickFuel && (
            <button
              type="button"
              onClick={onOpenQuickFuel}
              className="px-3 py-1.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/30 font-black text-xs flex items-center gap-1.5 transition self-start sm:self-auto"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Novo Abastecimento</span>
            </button>
          )}
        </div>

        {/* CARDS DE RESUMO DE GASTOS COM COMBUSTÍVEL */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          
          <div className="bg-black/40 p-3.5 rounded-2xl border border-white/10">
            <span className="text-[10px] font-mono text-slate-400 uppercase block">Total Gasto</span>
            <span className="text-lg font-black text-white font-mono block mt-0.5">
              {formatCurrency(fuelStats.totalSpent)}
            </span>
            <span className="text-[10px] text-slate-400">{fuelStats.recordsCount} abastecimentos</span>
          </div>

          <div className="bg-black/40 p-3.5 rounded-2xl border border-white/10">
            <span className="text-[10px] font-mono text-slate-400 uppercase block">Total Litros</span>
            <span className="text-lg font-black text-amber-400 font-mono block mt-0.5">
              {fuelStats.totalLiters.toFixed(1)} L
            </span>
            <span className="text-[10px] text-slate-400">Em postos cadastrados</span>
          </div>

          <div className="bg-black/40 p-3.5 rounded-2xl border border-white/10">
            <span className="text-[10px] font-mono text-slate-400 uppercase block">Preço Médio</span>
            <span className="text-lg font-black text-teal-300 font-mono block mt-0.5">
              {formatCurrency(fuelStats.avgPrice)}/L
            </span>
            <span className="text-[10px] text-slate-400">Média ponderada</span>
          </div>

          <div className="bg-black/40 p-3.5 rounded-2xl border border-white/10">
            <span className="text-[10px] font-mono text-slate-400 uppercase block">Consumo Médio Real</span>
            <span className="text-lg font-black text-emerald-400 font-mono block mt-0.5">
              {fuelStats.calculatedAvgKmPerL.toFixed(1)} km/L
            </span>
            <span className="text-[10px] text-slate-400">Apurado na bomba</span>
          </div>
        </div>

        {/* LISTA / TABELA DE ABASTECIMENTOS */}
        {sortedFuelRecords.length === 0 ? (
          <div className="text-center py-12 px-4 bg-black/30 rounded-2xl border border-dashed border-white/15">
            <Fuel className="w-10 h-10 text-slate-600 mx-auto mb-2" />
            <h4 className="text-sm font-bold text-white">Nenhum abastecimento registrado ainda</h4>
            <p className="text-xs text-slate-400 max-w-sm mx-auto mt-1 mb-4">
              Registre suas paradas no posto para calibrar o painel do Sandero e calcular o consumo médio real do seu carro.
            </p>
            {onOpenQuickFuel && (
              <button
                type="button"
                onClick={onOpenQuickFuel}
                className="px-4 py-2 rounded-xl bg-amber-500 text-slate-950 font-black text-xs inline-flex items-center gap-1.5 shadow-lg shadow-amber-500/20"
              >
                <Plus className="w-4 h-4 stroke-[3]" />
                <span>Cadastrar Primeiro Abastecimento</span>
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {sortedFuelRecords.map((record, index) => {
              // Comparar com o abastecimento anterior para apurar km rodados e km/l
              const prevRecord = sortedFuelRecords[index + 1];
              let deltaKm: number | null = null;
              let calculatedKmPerLiter: number | null = null;

              if (prevRecord && record.odometer && prevRecord.odometer && record.odometer > prevRecord.odometer) {
                deltaKm = record.odometer - prevRecord.odometer;
                if (record.liters > 0) {
                  calculatedKmPerLiter = deltaKm / record.liters;
                }
              }

              return (
                <div
                  key={record.id}
                  className="bg-black/40 hover:bg-black/60 p-4 rounded-2xl border border-white/10 transition flex flex-col md:flex-row md:items-center justify-between gap-3 font-mono"
                >
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center font-black shrink-0">
                      ⛽
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-black text-white">
                          {record.stationName || 'Posto de Combustível'}
                        </span>
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/10 text-slate-300 font-bold">
                          {record.fuelType}
                        </span>
                        <span className="text-[11px] text-slate-400">
                          {record.date}
                        </span>
                      </div>

                      <div className="flex items-center gap-3 text-xs text-slate-300 mt-1 flex-wrap">
                        <span>
                          <strong className="text-white">{record.liters.toFixed(1)} L</strong> @ {formatCurrency(record.pricePerLiter)}/L
                        </span>
                        <span>•</span>
                        <span>
                          Odômetro: <strong className="text-white">{formatKm(record.odometer)}</strong>
                        </span>
                        {deltaKm !== null && (
                          <>
                            <span>•</span>
                            <span className="text-amber-400 font-bold">
                              {deltaKm} km no tanque
                            </span>
                          </>
                        )}
                        {calculatedKmPerLiter !== null && (
                          <>
                            <span>•</span>
                            <span className="text-emerald-400 font-bold">
                              Média: {calculatedKmPerLiter.toFixed(1)} km/L
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* VALOR TOTAL E AÇÃO DE EXCLUIR */}
                  <div className="flex items-center justify-between md:justify-end gap-4 border-t md:border-t-0 border-white/5 pt-2 md:pt-0">
                    <div className="text-right">
                      <span className="text-base font-black text-emerald-400">
                        {formatCurrency(record.totalAmount)}
                      </span>
                      <span className="text-[10px] text-slate-400 block">Total pago</span>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        if (window.confirm('Tem certeza que deseja remover este abastecimento?')) {
                          deleteFuelRecord(record.id);
                          showToast('Abastecimento removido.');
                        }
                      }}
                      className="p-2 rounded-xl text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition"
                      title="Excluir abastecimento"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* MODAL DE EDIÇÃO DE ODÔMETRO */}
      {showOdoModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
          <div className="bg-slate-900 border border-white/15 rounded-3xl p-6 max-w-sm w-full space-y-4 shadow-2xl">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-black text-white flex items-center gap-2">
                <Gauge className="w-5 h-5 text-emerald-400" />
                ATUALIZAR ODÔMETRO
              </h3>
              <button
                type="button"
                onClick={() => setShowOdoModal(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-300">
              Digite a quilometragem atual marcada no painel do seu carro:
            </p>

            <form onSubmit={handleSaveOdometer} className="space-y-4">
              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">
                  Quilometragem Atual (KM)
                </label>
                <input
                  type="number"
                  value={tempOdometer}
                  onChange={e => setTempOdometer(e.target.value)}
                  className="w-full px-4 py-3 rounded-2xl bg-black/60 border border-white/20 text-white font-mono text-lg font-black focus:outline-none focus:border-emerald-400"
                  autoFocus
                />
              </div>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setShowOdoModal(false)}
                  className="flex-1 py-2.5 rounded-xl border border-white/10 text-slate-300 hover:bg-white/5 text-xs font-bold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-black"
                >
                  Salvar Odômetro
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
