import React, { useState } from 'react';
import { useDriver } from '../context/DriverContext';
import { analyzeRide, formatCurrency, safeDivide } from '../utils/calc';
import { Calculator, CheckCircle2, AlertTriangle, XCircle, Sliders, ArrowRight, Zap, Info } from 'lucide-react';

export const RideAnalyzerView: React.FC = () => {
  const { profile, vehicle, updateProfile } = useDriver();

  const [grossInput, setGrossInput] = useState('32.80');
  const [distanceInput, setDistanceInput] = useState('14.2');
  const [durationInput, setDurationInput] = useState('24');

  // Parâmetros do motorista
  const [showConfig, setShowConfig] = useState(false);
  const [minRateKm, setMinRateKm] = useState(profile.minAcceptableRateKm.toString());
  const [minRateHour, setMinRateHour] = useState(profile.minAcceptableRateHour.toString());
  const [gasPriceRef, setGasPriceRef] = useState(profile.gasPriceReference.toString());

  const parsedGross = parseFloat(grossInput) || 0;
  const parsedDistance = parseFloat(distanceInput) || 0;
  const parsedDuration = parseFloat(durationInput) || 0;
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
    parsedGas
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

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      {/* HEADER */}
      <div className="flex items-center justify-between bg-white/5 backdrop-blur-lg border border-white/10 p-5 rounded-2xl">
        <div>
          <h2 className="text-base sm:text-lg font-black text-white tracking-tight flex items-center gap-2">
            <Calculator className="w-5 h-5 text-emerald-400" />
            ANALISADOR: "VALE A PENA?"
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Calcule em 3 segundos se a corrida cobre combustível, depreciação e sua meta de ganho.
          </p>
        </div>

        <button
          onClick={() => setShowConfig(!showConfig)}
          className="p-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 transition"
          title="Ajustar Parâmetros de Decisão"
        >
          <Sliders className="w-4 h-4" />
        </button>
      </div>

      {/* PAINEL DE CONFIGURAÇÃO DE PARÂMETROS */}
      {showConfig && (
        <form onSubmit={handleSaveParameters} className="bg-white/5 backdrop-blur-lg border border-emerald-500/30 p-5 rounded-2xl space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-black text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
              <Sliders className="w-3.5 h-3.5" /> SEUS CRITÉRIOS DE CORTE
            </h3>
            <span className="text-[10px] text-slate-400">Personalize para a sua realidade</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="text-[11px] font-bold text-slate-400 block mb-1">Mínimo R$ / KM</label>
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
              <label className="text-[11px] font-bold text-slate-400 block mb-1">Preço Gasolina (R$/L)</label>
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
              className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 px-4 py-1.5 rounded-xl text-xs font-black"
            >
              Salvar Parâmetros
            </button>
          </div>
        </form>
      )}

      {/* FORMULÁRIO DE ENTRADA RÁPIDA (3 CAMPOS) */}
      <div className="bg-white/5 backdrop-blur-lg border border-white/10 p-5 rounded-2xl space-y-4">
        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className="text-[11px] font-bold text-slate-400 uppercase block mb-1">VALOR (R$)</label>
            <input
              type="number"
              step="0.10"
              value={grossInput}
              onChange={e => setGrossInput(e.target.value)}
              placeholder="32.80"
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
        </div>

        {/* ATALHOS RÁPIDOS DE CORRIDA */}
        <div className="flex items-center gap-2 pt-1 overflow-x-auto pb-1 text-xs">
          <span className="text-[11px] text-slate-400 font-bold shrink-0">Exemplos rápidos:</span>
          <button
            onClick={() => { setGrossInput('18.50'); setDistanceInput('5.2'); setDurationInput('12'); }}
            className="bg-white/5 hover:bg-white/10 px-2.5 py-1 rounded-lg text-slate-300 font-medium shrink-0 border border-white/5"
          >
            Curta: R$18,50 (5km)
          </button>
          <button
            onClick={() => { setGrossInput('45.00'); setDistanceInput('22.0'); setDurationInput('35'); }}
            className="bg-white/5 hover:bg-white/10 px-2.5 py-1 rounded-lg text-slate-300 font-medium shrink-0 border border-white/5"
          >
            Média: R$45,00 (22km)
          </button>
          <button
            onClick={() => { setGrossInput('82.00'); setDistanceInput('48.0'); setDurationInput('55'); }}
            className="bg-white/5 hover:bg-white/10 px-2.5 py-1 rounded-lg text-slate-300 font-medium shrink-0 border border-white/5"
          >
            Aeroporto: R$82,00 (48km)
          </button>
        </div>
      </div>

      {/* RESULTADO DO DIAGNÓSTICO */}
      <div className={`p-5 sm:p-6 rounded-3xl border transition-all ${
        analysis.status === 'EXCELLENT'
          ? 'bg-emerald-500/10 border-emerald-500/40 shadow-xl shadow-emerald-500/10'
          : analysis.status === 'FAIR'
          ? 'bg-amber-500/10 border-amber-500/40 shadow-xl shadow-amber-500/10'
          : 'bg-rose-500/10 border-rose-500/40 shadow-xl shadow-rose-500/10'
      }`}>
        {/* BADGE PRINCIPAL */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            {analysis.status === 'EXCELLENT' && <CheckCircle2 className="w-7 h-7 text-emerald-400" />}
            {analysis.status === 'FAIR' && <AlertTriangle className="w-7 h-7 text-amber-400" />}
            {analysis.status === 'BAD' && <XCircle className="w-7 h-7 text-rose-400" />}
            <div>
              <div className="text-xs font-black uppercase tracking-wider opacity-80 text-slate-300">
                VEREDITO DA ANÁLISE
              </div>
              <h3 className={`text-xl font-black ${
                analysis.status === 'EXCELLENT' ? 'text-emerald-400' : analysis.status === 'FAIR' ? 'text-amber-400' : 'text-rose-400'
              }`}>
                {analysis.status === 'EXCELLENT' ? '🟢 BOA CORRIDA / ACEITAR' : analysis.status === 'FAIR' ? '🟡 CORRIDA REGULAR' : '🔴 BAIXA RENTABILIDADE'}
              </h3>
            </div>
          </div>

          <div className="text-right">
            <span className="text-[10px] text-slate-400 uppercase font-bold block">Lucro Líquido Real</span>
            <div className="text-2xl font-black text-white">{formatCurrency(analysis.estimatedNetProfit)}</div>
          </div>
        </div>

        <p className="text-xs text-slate-300 mt-3 pt-3 border-t border-white/10 font-medium">
          {analysis.recommendation}
        </p>

        {/* MÉTRICAS UNITÁRIAS DETALHADAS */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 mt-4 text-center">
          <div className="bg-black/40 p-3 rounded-2xl border border-white/10">
            <span className="text-[10px] font-bold text-slate-400 uppercase">GANHO / KM</span>
            <div className="text-base font-black text-white mt-0.5">
              {formatCurrency(analysis.ratePerKm)}/km
            </div>
            <span className="text-[9px] text-slate-400">Meta: ≥ {formatCurrency(parsedMinKm)}</span>
          </div>

          <div className="bg-black/40 p-3 rounded-2xl border border-white/10">
            <span className="text-[10px] font-bold text-slate-400 uppercase">GANHO / HORA</span>
            <div className="text-base font-black text-white mt-0.5">
              {formatCurrency(analysis.ratePerHour)}/h
            </div>
            <span className="text-[9px] text-slate-400">Meta: ≥ {formatCurrency(parsedMinHour)}</span>
          </div>

          <div className="bg-black/40 p-3 rounded-2xl border border-white/10">
            <span className="text-[10px] font-bold text-slate-400 uppercase">COMBUSTÍVEL</span>
            <div className="text-base font-black text-rose-300 mt-0.5">
              {formatCurrency(analysis.estimatedFuelCost)}
            </div>
            <span className="text-[9px] text-slate-400">({vehicle.avgConsumption} km/L)</span>
          </div>

          <div className="bg-black/40 p-3 rounded-2xl border border-white/10">
            <span className="text-[10px] font-bold text-slate-400 uppercase">DESGASTE ESTIMADO</span>
            <div className="text-base font-black text-amber-300 mt-0.5">
              {formatCurrency(analysis.estimatedDepreciationCost)}
            </div>
            <span className="text-[9px] text-slate-400">Depreciação + Pneus</span>
          </div>
        </div>
      </div>

      {/* NOTA METODOLÓGICA */}
      <div className="bg-white/5 p-4 rounded-2xl border border-white/5 flex items-start gap-2.5 text-xs text-slate-400">
        <Info className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
        <p>
          O cálculo considera o consumo médio do seu {vehicle.make} {vehicle.model} ({vehicle.avgConsumption} km/L), a depreciação por quilômetro rodado e seus parâmetros de corte configurados no perfil.
        </p>
      </div>
    </div>
  );
};
