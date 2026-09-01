import React, { useState, useEffect, useMemo } from 'react';
import { useDriver } from '../context/DriverContext';
import { PlatformType } from '../types';
import {
  formatCurrency,
  formatHours,
  formatKm,
  formatTimer,
  safeDivide,
  calcShiftCostsFromKm,
  calcDepreciationPerKm,
} from '../utils/calc';
import {
  Play,
  Square,
  X,
  Navigation,
  DollarSign,
  Clock,
  CheckCircle2,
  Fuel,
  Award,
  Sparkles,
  Zap,
  TrendingUp,
  AlertCircle,
  Wrench,
  RotateCcw,
  Check,
  Calendar,
} from 'lucide-react';

interface ShiftModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ShiftModal: React.FC<ShiftModalProps> = ({ isOpen, onClose }) => {
  const {
    vehicle,
    profile,
    activeSession,
    activeStrategy,
    startShift,
    endShift,
    addCompletedShift,
    cancelShift,
  } = useDriver();

  // Modo quando NÃO há sessão ativa ('start_live' | 'record_past')
  const [noSessionMode, setNoSessionMode] = useState<'start_live' | 'record_past'>('start_live');

  // Início de expediente
  const [startKm, setStartKm] = useState(vehicle.currentOdometer.toString());
  const [selectedPlatforms, setSelectedPlatforms] = useState<PlatformType[]>(profile.platforms || ['Uber', '99']);

  // Encerramento de expediente / Rota concluída
  const [endKm, setEndKm] = useState((vehicle.currentOdometer + 120).toString());
  const [distanceMode, setDistanceMode] = useState<'odometer' | 'direct_km'>('odometer');
  const [directKmInput, setDirectKmInput] = useState('120');
  const [grossUber, setGrossUber] = useState('');
  const [gross99, setGross99] = useState('');
  const [grossInDrive, setGrossInDrive] = useState('');
  const [grossOther, setGrossOther] = useState('');
  const [tips, setTips] = useState('');
  const [tripsCount, setTripsCount] = useState('10');
  const [fuelExpense, setFuelExpense] = useState('');
  const [otherExpense, setOtherExpense] = useState('');
  const [notes, setNotes] = useState('');

  // Controle de Cálculo Automático
  const [autoCalculateFuel, setAutoCalculateFuel] = useState(true);
  const [includeMaintenanceReserve, setIncludeMaintenanceReserve] = useState(true);
  const [wasFuelManuallyEdited, setWasFuelManuallyEdited] = useState(false);
  const [showFormulaDetails, setShowFormulaDetails] = useState(false);

  // Cronômetro dinâmico
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  // Duração estimada para rotas manuais (em horas)
  const [manualDurationHours, setManualDurationHours] = useState('6.0');

  const gasPrice = profile.gasPriceReference || 5.89;
  const maintenanceRate = activeStrategy?.fuelAndMaintenancePlan.reserveMaintenancePerKm || 0.15;

  // Atualização do cronômetro da sessão ativa
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (activeSession) {
      const updateTimer = () => {
        const start = new Date(activeSession.startTime).getTime();
        const now = Date.now();
        setElapsedSeconds(Math.max(0, Math.floor((now - start) / 1000)));
      };
      updateTimer();
      timer = setInterval(updateTimer, 1000);
      setStartKm(activeSession.startOdometer.toString());
      setEndKm((activeSession.startOdometer + 120).toString());
      setDirectKmInput('120');
    } else {
      setElapsedSeconds(0);
      setStartKm(vehicle.currentOdometer.toString());
      setEndKm((vehicle.currentOdometer + 120).toString());
      setDirectKmInput('120');
    }
    return () => clearInterval(timer);
  }, [activeSession, vehicle.currentOdometer]);

  // Cálculo de KM rodado e custos automáticos
  const parsedStartKm = parseInt(startKm) || (activeSession?.startOdometer || vehicle.currentOdometer);
  const parsedEndKm = parseInt(endKm) || parsedStartKm;
  const kmDriven = Math.max(0, parsedEndKm - parsedStartKm);

  const costBreakdown = useMemo(() => {
    return calcShiftCostsFromKm(kmDriven, vehicle, gasPrice, maintenanceRate);
  }, [kmDriven, vehicle, gasPrice, maintenanceRate]);

  // Sincroniza combustível automaticamente com o KM rodado quando o auto-calc estiver ligado
  useEffect(() => {
    if (autoCalculateFuel && !wasFuelManuallyEdited) {
      setFuelExpense(costBreakdown.fuelCost > 0 ? costBreakdown.fuelCost.toFixed(2) : '');
    }
  }, [costBreakdown.fuelCost, autoCalculateFuel, wasFuelManuallyEdited]);

  // Função para mudar Hodômetro Final e sincronizar KM direto
  const handleEndKmChange = (val: string) => {
    setEndKm(val);
    const num = parseInt(val) || parsedStartKm;
    const diff = Math.max(0, num - parsedStartKm);
    setDirectKmInput(diff.toString());
    if (autoCalculateFuel && !wasFuelManuallyEdited) {
      const costs = calcShiftCostsFromKm(diff, vehicle, gasPrice, maintenanceRate);
      setFuelExpense(costs.fuelCost > 0 ? costs.fuelCost.toFixed(2) : '');
    }
  };

  // Função para mudar KM direto e sincronizar Hodômetro Final
  const handleDirectKmChange = (val: string) => {
    setDirectKmInput(val);
    const diff = parseInt(val) || 0;
    const computedEnd = parsedStartKm + diff;
    setEndKm(computedEnd.toString());
    if (autoCalculateFuel && !wasFuelManuallyEdited) {
      const costs = calcShiftCostsFromKm(diff, vehicle, gasPrice, maintenanceRate);
      setFuelExpense(costs.fuelCost > 0 ? costs.fuelCost.toFixed(2) : '');
    }
  };

  // Botões de incremento rápido de KM (+10, +25, +50, +100 km)
  const handleAddKmIncrement = (increment: number) => {
    const currentDiff = parseInt(directKmInput) || kmDriven || 0;
    const newDiff = currentDiff + increment;
    handleDirectKmChange(newDiff.toString());
  };

  if (!isOpen) return null;

  const togglePlatform = (p: PlatformType) => {
    setSelectedPlatforms(prev =>
      prev.includes(p) ? prev.filter(i => i !== p) : [...prev, p]
    );
  };

  // Restaura o cálculo automático
  const handleRestoreAutoFuel = () => {
    setWasFuelManuallyEdited(false);
    setAutoCalculateFuel(true);
    setFuelExpense(costBreakdown.fuelCost.toFixed(2));
  };

  const handleFuelInputChange = (val: string) => {
    setFuelExpense(val);
    setWasFuelManuallyEdited(true);
  };

  // Totais financeiros calculados em tempo real
  const parsedUber = parseFloat(grossUber) || 0;
  const parsed99 = parseFloat(gross99) || 0;
  const parsedInDrive = parseFloat(grossInDrive) || 0;
  const parsedOtherGross = parseFloat(grossOther) || 0;
  const totalGrossEarnings = parsedUber + parsed99 + parsedInDrive + parsedOtherGross;
  const parsedTips = parseFloat(tips) || 0;
  const totalRevenue = totalGrossEarnings + parsedTips;
  const parsedTrips = parseInt(tripsCount) || 0;

  const effectiveFuelExpense = parseFloat(fuelExpense) || (autoCalculateFuel ? costBreakdown.fuelCost : 0);
  const parsedOtherExp = parseFloat(otherExpense) || 0;
  const effectiveMaintenanceExp = includeMaintenanceReserve ? costBreakdown.maintenanceCost : 0;
  const totalExpenses = effectiveFuelExpense + parsedOtherExp + effectiveMaintenanceExp;

  const projectedNetProfit = totalRevenue - totalExpenses;
  const projectedMargin = totalRevenue > 0 ? (projectedNetProfit / totalRevenue) * 100 : 0;
  const projectedNetPerKm = safeDivide(projectedNetProfit, kmDriven);

  // Duração em horas
  const shiftHours = activeSession
    ? Math.max(0.1, elapsedSeconds / 3600)
    : Math.max(0.1, parseFloat(manualDurationHours) || 6.0);
  const projectedNetPerHour = safeDivide(projectedNetProfit, shiftHours);

  // Iniciar turno ao vivo
  const handleStartLive = (e: React.FormEvent) => {
    e.preventDefault();
    const km = parseInt(startKm) || vehicle.currentOdometer;
    startShift(km, selectedPlatforms);
    onClose();
  };

  // Encerrar turno ao vivo
  const handleEndLive = (e: React.FormEvent) => {
    e.preventDefault();
    const platformBreakdown: Partial<Record<PlatformType, { amount: number; trips: number }>> = {};
    if (parsedUber > 0) platformBreakdown.Uber = { amount: parsedUber, trips: Math.round(parsedTrips * 0.6) || 1 };
    if (parsed99 > 0) platformBreakdown['99'] = { amount: parsed99, trips: Math.round(parsedTrips * 0.4) || 1 };
    if (parsedInDrive > 0) platformBreakdown.inDrive = { amount: parsedInDrive, trips: 1 };
    if (parsedOtherGross > 0) platformBreakdown.Particular = { amount: parsedOtherGross, trips: 1 };

    endShift(
      parsedEndKm,
      totalGrossEarnings,
      parsedTips,
      parsedTrips,
      effectiveFuelExpense,
      parsedOtherExp + effectiveMaintenanceExp,
      notes || `Turno com ${kmDriven} km rodados (Combustível autocalculado: ${formatCurrency(effectiveFuelExpense)})`,
      platformBreakdown
    );
    onClose();
  };

  // Registrar rota/turno concluído sem ter iniciado antes
  const handleRecordPastRoute = (e: React.FormEvent) => {
    e.preventDefault();
    const platformBreakdown: Partial<Record<PlatformType, { amount: number; trips: number }>> = {};
    if (parsedUber > 0) platformBreakdown.Uber = { amount: parsedUber, trips: Math.round(parsedTrips * 0.6) || 1 };
    if (parsed99 > 0) platformBreakdown['99'] = { amount: parsed99, trips: Math.round(parsedTrips * 0.4) || 1 };
    if (parsedInDrive > 0) platformBreakdown.inDrive = { amount: parsedInDrive, trips: 1 };
    if (parsedOtherGross > 0) platformBreakdown.Particular = { amount: parsedOtherGross, trips: 1 };

    const hours = parseFloat(manualDurationHours) || 6.0;
    const nowMs = Date.now();
    const startMs = nowMs - (hours * 3600000);

    addCompletedShift({
      startTime: new Date(startMs).toISOString(),
      endTime: new Date(nowMs).toISOString(),
      startOdometer: parsedStartKm,
      endOdometer: parsedEndKm,
      grossEarnings: totalGrossEarnings,
      tips: parsedTips,
      tripsCount: parsedTrips,
      fuelExpenses: effectiveFuelExpense,
      otherExpenses: parsedOtherExp + effectiveMaintenanceExp,
      notes: notes || `Rota concluída de ${kmDriven} km`,
      platformEarnings: platformBreakdown,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/85 backdrop-blur-md">
      <div className="bg-slate-900 border border-white/15 rounded-3xl w-full max-w-xl p-5 sm:p-6 shadow-2xl space-y-4 max-h-[92vh] overflow-y-auto">
        
        {/* HEADER */}
        <div className="flex items-center justify-between border-b border-white/10 pb-3">
          <div className="flex items-center gap-2.5">
            <div className={`w-9 h-9 rounded-2xl flex items-center justify-center font-bold shadow-md ${
              activeSession ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
            }`}>
              {activeSession ? <Square className="w-4 h-4 fill-current" /> : <Play className="w-4 h-4 fill-current" />}
            </div>
            <div>
              <h3 className="text-base font-black text-white flex items-center gap-2">
                {activeSession ? 'ENCERRAR ROTA / EXPEDIENTE' : 'CONTROLE DE ROTA & EXPEDIENTE'}
              </h3>
              <p className="text-[11px] text-slate-400">
                {activeSession ? 'Cálculo automático de custos e lucros a partir do KM rodado' : 'Inicie um turno ao vivo ou registre uma rota concluída'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-slate-400 hover:text-white transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* SE NÃO HÁ SESSÃO ATIVA: SELETOR DE MODO */}
        {!activeSession && (
          <div className="flex bg-white/5 p-1 rounded-2xl border border-white/10">
            <button
              type="button"
              onClick={() => setNoSessionMode('start_live')}
              className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 ${
                noSessionMode === 'start_live'
                  ? 'bg-emerald-500 text-slate-950 shadow-md font-black'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              Iniciar Turno Ao Vivo
            </button>
            <button
              type="button"
              onClick={() => setNoSessionMode('record_past')}
              className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 ${
                noSessionMode === 'record_past'
                  ? 'bg-emerald-500 text-slate-950 shadow-md font-black'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Zap className="w-3.5 h-3.5 text-current" />
              Registrar Rota Concluída
            </button>
          </div>
        )}

        {/* 1. MODO: INICIAR TURNO AO VIVO */}
        {!activeSession && noSessionMode === 'start_live' && (
          <form onSubmit={handleStartLive} className="space-y-4">
            <div className="bg-white/5 p-4 rounded-2xl border border-white/10 space-y-3">
              <div>
                <label className="text-[11px] font-bold text-slate-300 uppercase block mb-1">
                  Hodômetro Inicial (KM)
                </label>
                <div className="relative">
                  <Navigation className="w-4 h-4 text-emerald-400 absolute left-3 top-3.5" />
                  <input
                    type="number"
                    required
                    value={startKm}
                    onChange={e => setStartKm(e.target.value)}
                    className="w-full bg-black/50 border border-white/15 rounded-xl pl-9 pr-3 py-2.5 text-base font-black text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <span className="text-[10px] text-slate-400 mt-1 block">
                  Último KM registrado do {vehicle.model}: <strong>{vehicle.currentOdometer.toLocaleString('pt-BR')} km</strong>
                </span>
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-300 uppercase block mb-1.5">
                  Plataformas Ativas Hoje
                </label>
                <div className="flex flex-wrap gap-2">
                  {(['Uber', '99', 'inDrive', 'Particular'] as PlatformType[]).map(p => (
                    <button
                      key={p}
                      type="button"
                      onClick={() => togglePlatform(p)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition ${
                        selectedPlatforms.includes(p)
                          ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/50 shadow-sm'
                          : 'bg-white/5 text-slate-400 border-white/10'
                      }`}
                    >
                      {p}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <button
              type="submit"
              className="w-full bg-gradient-to-r from-emerald-500 to-teal-400 hover:from-emerald-400 hover:to-teal-300 text-slate-950 font-black py-3.5 rounded-2xl text-sm shadow-lg shadow-emerald-500/30 active:scale-95 transition flex items-center justify-center gap-2"
            >
              <Play className="w-4 h-4 fill-current" />
              LIGAR CRONÔMETRO & INICIAR EXPEDIENTE
            </button>
          </form>
        )}

        {/* 2. MODO: EXPEDIENTE AO VIVO (ENCERRAMENTO) OU REGISTRAR ROTA CONCLUÍDA */}
        {(activeSession || (!activeSession && noSessionMode === 'record_past')) && (
          <form
            onSubmit={activeSession ? handleEndLive : handleRecordPastRoute}
            className="space-y-4"
          >
            {/* CARD DE TEMPO AO VIVO SE FOR SESSÃO ATIVA */}
            {activeSession && (
              <div className="bg-emerald-500/10 border border-emerald-500/30 p-3.5 rounded-2xl flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-black text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                    Expediente Ao Vivo
                  </span>
                  <div className="text-xs text-slate-300 mt-0.5">
                    Início: <strong>{new Date(activeSession.startTime).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</strong>
                  </div>
                </div>
                <div className="text-2xl font-black text-emerald-300 font-mono">
                  {formatTimer(elapsedSeconds)}
                </div>
              </div>
            )}

            {/* SEÇÃO 1: KM E CÁLCULO AUTOMÁTICO DE ROTA */}
            <div className="bg-white/5 border border-white/10 rounded-2xl p-4 space-y-3.5">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <span className="text-xs font-black text-white uppercase tracking-wider flex items-center gap-1.5">
                  <Navigation className="w-3.5 h-3.5 text-emerald-400" />
                  Quilometragem & Hodômetro Final
                </span>
                
                <div className="flex items-center gap-1.5">
                  <div className="flex bg-black/40 p-0.5 rounded-lg border border-white/10 text-[10px]">
                    <button
                      type="button"
                      onClick={() => setDistanceMode('odometer')}
                      className={`px-2 py-0.5 rounded font-bold transition ${
                        distanceMode === 'odometer'
                          ? 'bg-emerald-500 text-slate-950 font-black'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      Hodômetro
                    </button>
                    <button
                      type="button"
                      onClick={() => setDistanceMode('direct_km')}
                      className={`px-2 py-0.5 rounded font-bold transition ${
                        distanceMode === 'direct_km'
                          ? 'bg-emerald-500 text-slate-950 font-black'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      KM Rodado
                    </button>
                  </div>

                  <span className="text-xs font-black text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-lg border border-emerald-500/20">
                    {kmDriven} km rodados
                  </span>
                </div>
              </div>

              {/* ENTRADA DE KM CONFORME O MODO SELECIONADO */}
              {distanceMode === 'odometer' ? (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[11px] font-bold text-slate-400 uppercase block mb-1">
                      Hodômetro Inicial (KM)
                    </label>
                    <input
                      type="number"
                      required
                      value={startKm}
                      onChange={e => {
                        setStartKm(e.target.value);
                        const s = parseInt(e.target.value) || 0;
                        const end = parseInt(endKm) || s;
                        setDirectKmInput(Math.max(0, end - s).toString());
                      }}
                      disabled={!!activeSession}
                      className="w-full bg-black/40 border border-white/15 rounded-xl px-3 py-2 text-sm text-white font-bold disabled:opacity-60"
                    />
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-[11px] font-bold text-slate-300 uppercase">
                        Hodômetro Final (KM)
                      </label>
                      <span className="text-[10px] text-emerald-400 font-bold">
                        +{kmDriven} km
                      </span>
                    </div>
                    <input
                      type="number"
                      required
                      value={endKm}
                      onChange={e => handleEndKmChange(e.target.value)}
                      placeholder="Ex: 85520"
                      className="w-full bg-black/40 border border-emerald-500/60 rounded-xl px-3 py-2 text-sm text-emerald-300 font-black focus:outline-none focus:ring-2 focus:ring-emerald-500/50 shadow-inner"
                    />
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[11px] font-bold text-slate-400 uppercase block mb-1">
                      Hodômetro Inicial (KM)
                    </label>
                    <input
                      type="number"
                      disabled
                      value={startKm}
                      className="w-full bg-black/40 border border-white/15 rounded-xl px-3 py-2 text-sm text-slate-300 font-bold opacity-70"
                    />
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-[11px] font-bold text-slate-300 uppercase">
                        KM Rodados na Rota
                      </label>
                      <span className="text-[10px] text-slate-400">
                        Final: {parsedEndKm} km
                      </span>
                    </div>
                    <input
                      type="number"
                      required
                      value={directKmInput}
                      onChange={e => handleDirectKmChange(e.target.value)}
                      placeholder="Ex: 120"
                      className="w-full bg-black/40 border border-emerald-500/60 rounded-xl px-3 py-2 text-sm text-emerald-300 font-black focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                    />
                  </div>
                </div>
              )}

              {/* BOTÕES RÁPIDOS DE INCREMENTO DE KM */}
              <div className="flex items-center gap-1.5 flex-wrap pt-0.5">
                <span className="text-[10px] font-bold text-slate-400">Ajuste rápido:</span>
                {[10, 25, 50, 80, 120].map(inc => (
                  <button
                    key={inc}
                    type="button"
                    onClick={() => handleAddKmIncrement(inc)}
                    className="px-2 py-0.5 rounded-lg bg-white/5 hover:bg-emerald-500/20 text-slate-300 hover:text-emerald-300 border border-white/10 hover:border-emerald-500/30 text-[10px] font-bold transition active:scale-95"
                  >
                    +{inc} km
                  </button>
                ))}
              </div>

              {/* DURAÇÃO MANUAL SE FOR REGISTRO PASSADO */}
              {!activeSession && (
                <div>
                  <label className="text-[11px] font-bold text-slate-400 uppercase block mb-1">
                    Tempo Total Trabalhado (Horas)
                  </label>
                  <input
                    type="number"
                    step="0.5"
                    value={manualDurationHours}
                    onChange={e => setManualDurationHours(e.target.value)}
                    className="w-full bg-black/40 border border-white/15 rounded-xl px-3 py-2 text-sm text-white font-bold"
                  />
                </div>
              )}

              {/* CARD DE CUSTO AUTOMÁTICO CALCULADO POR KM */}
              <div className="bg-gradient-to-br from-slate-950/90 to-slate-900/95 border border-emerald-500/30 rounded-2xl p-3.5 space-y-2.5 shadow-lg">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4 text-amber-400 animate-pulse" />
                    <span className="text-xs font-black text-white">
                      Custos Automáticos da Rota ({kmDriven} km)
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-[11px] font-mono font-black text-amber-300">
                      {formatCurrency(costBreakdown.directCostPerKm)}/km
                    </span>
                    <span className="text-[9px] text-slate-400 block">custo direto</span>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2 text-center text-xs">
                  <div className="bg-white/5 p-2 rounded-xl border border-white/5 hover:border-amber-500/30 transition">
                    <span className="text-[10px] text-slate-400 block font-medium">Combustível</span>
                    <strong className="text-amber-300 font-bold font-mono text-sm">
                      {formatCurrency(costBreakdown.fuelCost)}
                    </strong>
                    <span className="text-[9px] text-slate-400 block mt-0.5">
                      ~{costBreakdown.litersBurned}L @ {formatCurrency(costBreakdown.fuelPricePerLiter)}
                    </span>
                  </div>

                  <div className="bg-white/5 p-2 rounded-xl border border-white/5 hover:border-sky-500/30 transition">
                    <span className="text-[10px] text-slate-400 block font-medium">Manutenção</span>
                    <strong className="text-sky-300 font-bold font-mono text-sm">
                      {formatCurrency(costBreakdown.maintenanceCost)}
                    </strong>
                    <span className="text-[9px] text-slate-400 block mt-0.5">
                      {formatCurrency(costBreakdown.maintenanceReservePerKm)}/km
                    </span>
                  </div>

                  <div className="bg-white/5 p-2 rounded-xl border border-white/5 hover:border-indigo-500/30 transition">
                    <span className="text-[10px] text-slate-400 block font-medium">Depreciação</span>
                    <strong className="text-slate-300 font-bold font-mono text-sm">
                      {formatCurrency(costBreakdown.depreciationCost)}
                    </strong>
                    <span className="text-[9px] text-slate-400 block mt-0.5">
                      {formatCurrency(costBreakdown.depreciationPerKm)}/km
                    </span>
                  </div>
                </div>

                {/* BOTÃO TOGGLE DE MEMÓRIA DE CÁLCULO */}
                <div className="pt-1 flex items-center justify-between border-t border-white/10 text-[11px]">
                  <button
                    type="button"
                    onClick={() => setShowFormulaDetails(!showFormulaDetails)}
                    className="text-emerald-400 hover:text-emerald-300 font-bold flex items-center gap-1 transition"
                  >
                    <span>{showFormulaDetails ? '▲ Ocultar memória de cálculo' : '▼ Ver fórmula detalhada'}</span>
                  </button>

                  <span className="text-slate-400 text-[10px]">
                    Consumo: <strong>{costBreakdown.avgConsumption} km/L</strong> ({vehicle.fuelType || 'Gasolina'})
                  </span>
                </div>

                {/* MEMÓRIA DE CÁLCULO EXPANDIDA */}
                {showFormulaDetails && (
                  <div className="bg-black/60 p-2.5 rounded-xl border border-white/10 space-y-1.5 text-[11px] font-mono text-slate-300">
                    <div className="flex justify-between">
                      <span className="text-slate-400">1. Queima de combustível:</span>
                      <span>{kmDriven} km ÷ {costBreakdown.avgConsumption} km/L = <strong>{costBreakdown.litersBurned}L</strong></span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">2. Custo do combustível:</span>
                      <span>{costBreakdown.litersBurned}L × {formatCurrency(costBreakdown.fuelPricePerLiter)} = <strong className="text-amber-300">{formatCurrency(costBreakdown.fuelCost)}</strong></span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">3. Reserva manutenção (pneus/óleo/freio):</span>
                      <span>{kmDriven} km × {formatCurrency(costBreakdown.maintenanceReservePerKm)} = <strong className="text-sky-300">{formatCurrency(costBreakdown.maintenanceCost)}</strong></span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">4. Desgaste veicular (FIPE):</span>
                      <span>{kmDriven} km × {formatCurrency(costBreakdown.depreciationPerKm)} = <strong className="text-slate-300">{formatCurrency(costBreakdown.depreciationCost)}</strong></span>
                    </div>
                    <div className="flex justify-between pt-1 border-t border-white/10 font-bold">
                      <span className="text-emerald-400">Custo Direto Operacional:</span>
                      <span className="text-emerald-300">{formatCurrency(costBreakdown.totalDirectCost)} ({formatCurrency(costBreakdown.directCostPerKm)}/km)</span>
                    </div>
                  </div>
                )}

                {/* CONTROLE DE APLICAÇÃO DO CUSTO AUTOMÁTICO */}
                <div className="flex items-center justify-between pt-1.5 border-t border-white/10 text-xs flex-wrap gap-2">
                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={autoCalculateFuel}
                      onChange={e => {
                        setAutoCalculateFuel(e.target.checked);
                        if (e.target.checked) {
                          setWasFuelManuallyEdited(false);
                          setFuelExpense(costBreakdown.fuelCost.toFixed(2));
                        }
                      }}
                      className="w-4 h-4 rounded text-emerald-500 focus:ring-emerald-500"
                    />
                    <span className="text-slate-200 font-bold text-[11px]">
                      Preencher combustível automaticamente pelo KM ({formatCurrency(costBreakdown.fuelCost)})
                    </span>
                  </label>

                  {wasFuelManuallyEdited && (
                    <button
                      type="button"
                      onClick={handleRestoreAutoFuel}
                      className="text-[10px] text-amber-400 hover:text-amber-300 font-bold flex items-center gap-1 underline"
                    >
                      <RotateCcw className="w-3 h-3" />
                      Restaurar automático
                    </button>
                  )}
                </div>

                <div className="flex items-center justify-between text-xs">
                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={includeMaintenanceReserve}
                      onChange={e => setIncludeMaintenanceReserve(e.target.checked)}
                      className="w-4 h-4 rounded text-emerald-500 focus:ring-emerald-500"
                    />
                    <span className="text-slate-300 font-medium text-[11px]">
                      Incluir Reserva de Manutenção no cálculo de despesas (+{formatCurrency(costBreakdown.maintenanceCost)})
                    </span>
                  </label>
                </div>
              </div>
            </div>

            {/* SEÇÃO 2: GANHOS POR PLATAFORMA */}
            <div className="bg-white/5 border border-white/10 rounded-2xl p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black text-white uppercase tracking-wider flex items-center gap-1.5">
                  <DollarSign className="w-3.5 h-3.5 text-emerald-400" />
                  Ganhos Brutos por Aplicativo
                </span>
                <span className="text-xs font-black text-emerald-400 font-mono">
                  {formatCurrency(totalGrossEarnings)}
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                <div>
                  <label className="text-[10px] font-bold text-slate-400 block mb-0.5">Uber (R$)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={grossUber}
                    onChange={e => setGrossUber(e.target.value)}
                    placeholder="0.00"
                    className="w-full bg-black/40 border border-white/15 rounded-lg px-2.5 py-1.5 text-xs text-emerald-400 font-bold focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-400 block mb-0.5">99 (R$)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={gross99}
                    onChange={e => setGross99(e.target.value)}
                    placeholder="0.00"
                    className="w-full bg-black/40 border border-white/15 rounded-lg px-2.5 py-1.5 text-xs text-amber-400 font-bold focus:border-amber-500"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-400 block mb-0.5">inDrive (R$)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={grossInDrive}
                    onChange={e => setGrossInDrive(e.target.value)}
                    placeholder="0.00"
                    className="w-full bg-black/40 border border-white/15 rounded-lg px-2.5 py-1.5 text-xs text-teal-400 font-bold focus:border-teal-500"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-400 block mb-0.5">Particular (R$)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={grossOther}
                    onChange={e => setGrossOther(e.target.value)}
                    placeholder="0.00"
                    className="w-full bg-black/40 border border-white/15 rounded-lg px-2.5 py-1.5 text-xs text-sky-400 font-bold focus:border-sky-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-bold text-slate-400 uppercase block mb-1">
                    Gorjetas / Extras (R$)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={tips}
                    onChange={e => setTips(e.target.value)}
                    placeholder="0.00"
                    className="w-full bg-black/40 border border-white/15 rounded-xl px-3 py-2 text-xs text-white"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-slate-400 uppercase block mb-1">
                    Quantidade de Corridas
                  </label>
                  <input
                    type="number"
                    value={tripsCount}
                    onChange={e => setTripsCount(e.target.value)}
                    className="w-full bg-black/40 border border-white/15 rounded-xl px-3 py-2 text-xs text-white"
                  />
                </div>
              </div>
            </div>

            {/* SEÇÃO 3: DESPESAS DIRETAS */}
            <div className="bg-white/5 border border-white/10 rounded-2xl p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black text-white uppercase tracking-wider flex items-center gap-1.5">
                  <Fuel className="w-3.5 h-3.5 text-rose-400" />
                  Despesas Efetivas do Turno
                </span>
                <span className="text-xs font-black text-rose-400 font-mono">
                  {formatCurrency(totalExpenses)}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-[11px] font-bold text-slate-400 uppercase">
                      Combustível (R$)
                    </label>
                    {autoCalculateFuel && !wasFuelManuallyEdited && (
                      <span className="text-[9px] bg-emerald-500/20 text-emerald-300 font-bold px-1.5 py-0.5 rounded">
                        Auto (KM)
                      </span>
                    )}
                  </div>
                  <input
                    type="number"
                    step="0.01"
                    value={fuelExpense}
                    onChange={e => handleFuelInputChange(e.target.value)}
                    placeholder={costBreakdown.fuelCost.toFixed(2)}
                    className="w-full bg-black/40 border border-white/15 rounded-xl px-3 py-2 text-xs text-amber-300 font-black focus:border-amber-500"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-400 uppercase block mb-1">
                    Outros Gastos (Alimentação/Pedágio)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={otherExpense}
                    onChange={e => setOtherExpense(e.target.value)}
                    placeholder="0.00"
                    className="w-full bg-black/40 border border-white/15 rounded-xl px-3 py-2 text-xs text-white"
                  />
                </div>
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-400 uppercase block mb-1">
                  Notas / Observações da Rota
                </label>
                <input
                  type="text"
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  placeholder="Ex: Foco no aeroporto e região sul, trânsito moderado"
                  className="w-full bg-black/40 border border-white/15 rounded-xl px-3 py-2 text-xs text-white"
                />
              </div>
            </div>

            {/* SEÇÃO 4: RESUMO AO VIVO DE LUCRO LÍQUIDO & INDICADORES DE PERFORMANCE */}
            <div className="bg-slate-950 border border-white/15 rounded-2xl p-4 space-y-3 shadow-inner">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                  Lucro Líquido Real Calculado
                </span>
                <span className={`text-xs font-black px-2 py-0.5 rounded-lg ${
                  projectedNetProfit >= 0 ? 'bg-emerald-500/20 text-emerald-300' : 'bg-rose-500/20 text-rose-300'
                }`}>
                  Margem {projectedMargin.toFixed(1)}%
                </span>
              </div>

              <div className="flex items-baseline justify-between">
                <div className="text-3xl font-black text-emerald-400 font-mono tracking-tight">
                  {formatCurrency(projectedNetProfit)}
                </div>
                <div className="text-right text-xs text-slate-400">
                  Bruto: <strong className="text-white">{formatCurrency(totalRevenue)}</strong> • Custos: <strong className="text-rose-300">{formatCurrency(totalExpenses)}</strong>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2 pt-2 border-t border-white/10 text-center">
                <div className="bg-white/5 p-2 rounded-xl">
                  <span className="text-[10px] text-slate-400 block font-medium">Líquido / KM</span>
                  <strong className="text-xs sm:text-sm font-black text-emerald-300 font-mono">
                    {formatCurrency(projectedNetPerKm)}/km
                  </strong>
                </div>

                <div className="bg-white/5 p-2 rounded-xl">
                  <span className="text-[10px] text-slate-400 block font-medium">Líquido / Hora</span>
                  <strong className="text-xs sm:text-sm font-black text-sky-300 font-mono">
                    {formatCurrency(projectedNetPerHour)}/h
                  </strong>
                </div>

                <div className="bg-white/5 p-2 rounded-xl">
                  <span className="text-[10px] text-slate-400 block font-medium">Custo Real / KM</span>
                  <strong className="text-xs sm:text-sm font-black text-amber-300 font-mono">
                    {formatCurrency(costBreakdown.directCostPerKm)}/km
                  </strong>
                </div>
              </div>
            </div>

            {/* BOTÕES DE AÇÃO */}
            <div className="flex items-center gap-2 pt-2">
              {activeSession && (
                <button
                  type="button"
                  onClick={() => {
                    if (confirm('Deseja realmente descartar este expediente sem salvar?')) {
                      cancelShift();
                      onClose();
                    }
                  }}
                  className="w-1/3 bg-rose-500/15 hover:bg-rose-500/25 text-rose-300 font-bold py-3.5 rounded-2xl text-xs border border-rose-500/30 transition"
                >
                  Descartar
                </button>
              )}

              <button
                type="submit"
                className={`w-full bg-gradient-to-r from-emerald-500 to-teal-400 hover:from-emerald-400 hover:to-teal-300 text-slate-950 font-black py-3.5 rounded-2xl text-xs sm:text-sm shadow-lg shadow-emerald-500/25 active:scale-95 transition flex items-center justify-center gap-2 ${
                  activeSession ? 'w-2/3' : 'w-full'
                }`}
              >
                <Check className="w-4 h-4 stroke-[3]" />
                <span>SALVAR ROTA & ATUALIZAR RESULTADOS</span>
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
