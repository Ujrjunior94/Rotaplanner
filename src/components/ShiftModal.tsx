import React, { useState, useEffect } from 'react';
import { useDriver } from '../context/DriverContext';
import { PlatformType } from '../types';
import { formatCurrency, formatHours, formatKm, formatTimer, safeDivide } from '../utils/calc';
import { Play, Square, X, Navigation, DollarSign, Clock, CheckCircle2, Fuel, Award } from 'lucide-react';

interface ShiftModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ShiftModal: React.FC<ShiftModalProps> = ({ isOpen, onClose }) => {
  const {
    vehicle,
    activeSession,
    startShift,
    endShift,
    cancelShift,
    profile,
  } = useDriver();

  // Início de expediente
  const [startKm, setStartKm] = useState(vehicle.currentOdometer.toString());
  const [selectedPlatforms, setSelectedPlatforms] = useState<PlatformType[]>(profile.platforms || ['Uber', '99']);

  // Encerramento de expediente
  const [endKm, setEndKm] = useState((vehicle.currentOdometer + 120).toString());
  const [grossUber, setGrossUber] = useState('');
  const [gross99, setGross99] = useState('');
  const [grossInDrive, setGrossInDrive] = useState('');
  const [grossOther, setGrossOther] = useState('');
  const [tips, setTips] = useState('');
  const [tripsCount, setTripsCount] = useState('12');
  const [fuelExpense, setFuelExpense] = useState('');
  const [otherExpense, setOtherExpense] = useState('');
  const [notes, setNotes] = useState('');

  // Cronômetro dinâmico
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

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
    } else {
      setElapsedSeconds(0);
      setStartKm(vehicle.currentOdometer.toString());
    }
    return () => clearInterval(timer);
  }, [activeSession, vehicle.currentOdometer]);

  if (!isOpen) return null;

  const togglePlatform = (p: PlatformType) => {
    setSelectedPlatforms(prev =>
      prev.includes(p) ? prev.filter(i => i !== p) : [...prev, p]
    );
  };

  const handleStart = (e: React.FormEvent) => {
    e.preventDefault();
    const km = parseInt(startKm) || vehicle.currentOdometer;
    startShift(km, selectedPlatforms);
    onClose();
  };

  const handleEnd = (e: React.FormEvent) => {
    e.preventDefault();
    const parsedEndKm = parseInt(endKm) || (activeSession?.startOdometer || vehicle.currentOdometer);
    const parsedUber = parseFloat(grossUber) || 0;
    const parsed99 = parseFloat(gross99) || 0;
    const parsedInDrive = parseFloat(grossInDrive) || 0;
    const parsedOtherGross = parseFloat(grossOther) || 0;
    const totalGross = parsedUber + parsed99 + parsedInDrive + parsedOtherGross;
    const parsedTips = parseFloat(tips) || 0;
    const parsedTrips = parseInt(tripsCount) || 0;
    const parsedFuel = parseFloat(fuelExpense) || 0;
    const parsedOtherExp = parseFloat(otherExpense) || 0;

    const platformBreakdown: Partial<Record<PlatformType, { amount: number; trips: number }>> = {};
    if (parsedUber > 0) platformBreakdown.Uber = { amount: parsedUber, trips: Math.round(parsedTrips * 0.6) };
    if (parsed99 > 0) platformBreakdown['99'] = { amount: parsed99, trips: Math.round(parsedTrips * 0.4) };
    if (parsedInDrive > 0) platformBreakdown.inDrive = { amount: parsedInDrive, trips: 1 };
    if (parsedOtherGross > 0) platformBreakdown.Particular = { amount: parsedOtherGross, trips: 1 };

    endShift(
      parsedEndKm,
      totalGross,
      parsedTips,
      parsedTrips,
      parsedFuel,
      parsedOtherExp,
      notes,
      platformBreakdown
    );
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md">
      <div className="bg-slate-900 border border-white/15 rounded-3xl w-full max-w-lg p-5 sm:p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
        
        {/* HEADER */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className={`w-8 h-8 rounded-xl flex items-center justify-center font-bold ${activeSession ? 'bg-amber-500/20 text-amber-400' : 'bg-emerald-500/20 text-emerald-400'}`}>
              {activeSession ? '⏱️' : '🚗'}
            </div>
            <div>
              <h3 className="text-base font-black text-white">
                {activeSession ? 'EXPEDIENTE EM ANDAMENTO' : 'INICIAR NOVO EXPEDIENTE'}
              </h3>
              <p className="text-[11px] text-slate-400">
                {activeSession ? 'Acompanhe métricas em tempo real e finalize quando quiser' : 'Registre KM e plataformas para iniciar'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-slate-400 hover:text-white"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* 1. SE NÃO HÁ SESSÃO ATIVA -> FORMULÁRIO DE INÍCIO */}
        {!activeSession ? (
          <form onSubmit={handleStart} className="space-y-4">
            <div className="bg-white/5 p-4 rounded-2xl border border-white/10 space-y-3">
              <div>
                <label className="text-[11px] font-bold text-slate-400 uppercase block mb-1">
                  Hodômetro Inicial (KM)
                </label>
                <div className="relative">
                  <Navigation className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
                  <input
                    type="number"
                    required
                    value={startKm}
                    onChange={e => setStartKm(e.target.value)}
                    className="w-full bg-black/40 border border-white/15 rounded-xl pl-9 pr-3 py-2.5 text-base font-black text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <span className="text-[10px] text-slate-500 mt-1 block">
                  Último KM registrado do {vehicle.model}: {vehicle.currentOdometer.toLocaleString('pt-BR')} km
                </span>
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-400 uppercase block mb-1.5">
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
              LIGAR CRONÔMETRO & INICIAR
            </button>
          </form>
        ) : (
          /* 2. SE HÁ SESSÃO ATIVA -> CRONÔMETRO AO VIVO + ENCERRAMENTO */
          <div className="space-y-4">
            
            {/* LIVE DASHBOARD CARD */}
            <div className="bg-emerald-500/10 border border-emerald-500/30 p-5 rounded-2xl text-center space-y-2">
              <span className="text-[10px] font-black text-emerald-400 uppercase tracking-widest animate-pulse">
                • EXPEDIENTE AO VIVO
              </span>
              <div className="text-4xl font-black text-emerald-300 font-mono tracking-tight">
                {formatTimer(elapsedSeconds)}
              </div>
              <div className="flex justify-center items-center gap-4 text-xs text-slate-300 pt-1">
                <span>Início: <strong>{new Date(activeSession.startTime).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</strong></span>
                <span>KM Inicial: <strong>{activeSession.startOdometer} km</strong></span>
              </div>
            </div>

            {/* FORMULÁRIO DE ENCERRAMENTO */}
            <form onSubmit={handleEnd} className="space-y-3.5">
              <div className="text-xs font-black text-slate-300 uppercase tracking-wider">
                DADOS DE FECHAMENTO DO TURNO
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-400 uppercase block mb-1">
                  Hodômetro Final (KM)
                </label>
                <input
                  type="number"
                  required
                  value={endKm}
                  onChange={e => setEndKm(e.target.value)}
                  className="w-full bg-white/5 border border-white/15 rounded-xl px-3 py-2 text-sm text-white font-bold"
                />
              </div>

              {/* GANHOS POR PLATAFORMA */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                <div>
                  <label className="text-[10px] font-bold text-slate-400 block mb-0.5">Uber (R$)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={grossUber}
                    onChange={e => setGrossUber(e.target.value)}
                    placeholder="0.00"
                    className="w-full bg-white/5 border border-white/15 rounded-lg px-2 py-1.5 text-xs text-emerald-400 font-bold"
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
                    className="w-full bg-white/5 border border-white/15 rounded-lg px-2 py-1.5 text-xs text-yellow-400 font-bold"
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
                    className="w-full bg-white/5 border border-white/15 rounded-lg px-2 py-1.5 text-xs text-teal-400 font-bold"
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
                    className="w-full bg-white/5 border border-white/15 rounded-lg px-2 py-1.5 text-xs text-sky-400 font-bold"
                  />
                </div>
              </div>

              {/* GORJETA & CORRIDAS */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-bold text-slate-400 uppercase block mb-1">Gorjetas Totais (R$)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={tips}
                    onChange={e => setTips(e.target.value)}
                    placeholder="0.00"
                    className="w-full bg-white/5 border border-white/15 rounded-xl px-3 py-2 text-xs text-white"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-slate-400 uppercase block mb-1">Total de Corridas</label>
                  <input
                    type="number"
                    value={tripsCount}
                    onChange={e => setTripsCount(e.target.value)}
                    className="w-full bg-white/5 border border-white/15 rounded-xl px-3 py-2 text-xs text-white"
                  />
                </div>
              </div>

              {/* DESPESAS DO TURNO */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-bold text-slate-400 uppercase block mb-1">Combustível Gasto (R$)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={fuelExpense}
                    onChange={e => setFuelExpense(e.target.value)}
                    placeholder="0.00"
                    className="w-full bg-white/5 border border-white/15 rounded-xl px-3 py-2 text-xs text-rose-400 font-bold"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-slate-400 uppercase block mb-1">Outros Gastos (Lanche/Pedágio)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={otherExpense}
                    onChange={e => setOtherExpense(e.target.value)}
                    placeholder="0.00"
                    className="w-full bg-white/5 border border-white/15 rounded-xl px-3 py-2 text-xs text-rose-400"
                  />
                </div>
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-400 uppercase block mb-1">Notas do Turno</label>
                <input
                  type="text"
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  placeholder="Ex: Bom movimento na região norte, trânsito pesado às 18h"
                  className="w-full bg-white/5 border border-white/15 rounded-xl px-3 py-2 text-xs text-white"
                />
              </div>

              <div className="flex items-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    if (confirm('Deseja realmente cancelar este expediente sem salvar?')) {
                      cancelShift();
                      onClose();
                    }
                  }}
                  className="w-1/3 bg-rose-500/15 hover:bg-rose-500/25 text-rose-300 font-bold py-3 rounded-2xl text-xs border border-rose-500/30 transition"
                >
                  Descartar
                </button>

                <button
                  type="submit"
                  className="w-2/3 bg-gradient-to-r from-emerald-500 to-teal-400 hover:from-emerald-400 hover:to-teal-300 text-slate-950 font-black py-3 rounded-2xl text-xs shadow-lg shadow-emerald-500/25 active:scale-95 transition flex items-center justify-center gap-1.5"
                >
                  <Square className="w-3.5 h-3.5 fill-current" />
                  ENCERRAR & CALCULAR RESULTADOS
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  );
};
