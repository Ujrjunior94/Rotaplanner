import React, { useState } from 'react';
import { useDriver } from '../context/DriverContext';
import {
  calcDailyFuelAdvisor,
  calcFuelParity,
  formatCurrency,
  formatKm,
  safeDivide,
} from '../utils/calc';
import {
  Fuel,
  Gauge,
  Sparkles,
  Zap,
  TrendingDown,
  Clock,
  CheckCircle2,
  AlertTriangle,
  AlertOctagon,
  X,
  Plus,
  Car,
  DollarSign,
  Layers,
  ArrowRight,
  Info,
  Calendar,
} from 'lucide-react';

interface FuelAdvisorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenQuickFuelWithData?: (liters: number, price: number, total: number, type: string) => void;
}

export const FuelAdvisorModal: React.FC<FuelAdvisorModalProps> = ({
  isOpen,
  onClose,
  onOpenQuickFuelWithData,
}) => {
  const { vehicle, fuelRecords, plannerEvents, profile, updateProfile } = useDriver();

  // Data de hoje
  const todayStr = new Date().toISOString().split('T')[0];
  const todayEvent = plannerEvents.find(e => e.date === todayStr);
  const isOffDayInitially = todayEvent?.type === 'off';

  // Configurações interativas da simulação
  const [manualTankPct, setManualTankPct] = useState<number>(55);
  const [customPlannedKm, setCustomPlannedKm] = useState<string>(
    isOffDayInitially ? '0' : Math.round(profile.dailyGoal / (profile.minAcceptableRateKm || 2.0)).toString()
  );
  const [isSimulatedOffDay, setIsSimulatedOffDay] = useState<boolean>(isOffDayInitially);
  
  // Preços nos postos de hoje para comparação Flex
  const [currentGasPrice, setCurrentGasPrice] = useState<string>(profile.gasPriceReference ? profile.gasPriceReference.toString() : '5.89');
  const [currentEthPrice, setCurrentEthPrice] = useState<string>(
    profile.gasPriceReference ? (profile.gasPriceReference * 0.68).toFixed(2) : '3.99'
  );

  if (!isOpen) return null;

  const parsedGasPrice = parseFloat(currentGasPrice) || 5.89;
  const parsedEthPrice = parseFloat(currentEthPrice) || 3.99;
  const parsedPlannedKm = parseFloat(customPlannedKm) || 0;

  const advisor = calcDailyFuelAdvisor(
    vehicle,
    fuelRecords,
    isSimulatedOffDay ? 0 : parsedPlannedKm,
    isSimulatedOffDay,
    manualTankPct,
    parsedGasPrice,
    parsedEthPrice
  );

  const parity = calcFuelParity(
    parsedEthPrice,
    parsedGasPrice,
    vehicle.avgConsumption || 12.5,
    vehicle.fuelType === 'Flex'
  );

  const handleApplyQuickRefuel = (liters: number, cost: number, fuelName: string) => {
    const price = safeDivide(cost, liters);
    if (onOpenQuickFuelWithData) {
      onOpenQuickFuelWithData(liters, price, cost, fuelName);
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-950/85 backdrop-blur-md overflow-y-auto">
      <div className="bg-slate-900/95 border border-white/15 rounded-3xl w-full max-w-2xl p-5 sm:p-6 shadow-2xl space-y-5 my-auto max-h-[92vh] overflow-y-auto">
        
        {/* HEADER DO MODAL */}
        <div className="flex items-center justify-between border-b border-white/10 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-emerald-500 to-teal-400 flex items-center justify-center text-slate-950 font-black shrink-0 shadow-lg shadow-emerald-500/20">
              <Fuel className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black text-white flex items-center gap-2">
                DEVO ABASTECER HOJE?
                <span className="text-[10px] bg-emerald-500/20 text-emerald-300 font-bold px-2 py-0.5 rounded-full border border-emerald-500/30">
                  Consultor Inteligente
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Análise diária de autonomia, demanda da escala e custo por km.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/15 text-slate-400 hover:text-white flex items-center justify-center transition shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 1. VEREDITO EM DESTAQUE */}
        <div
          className={`p-4 sm:p-5 rounded-2xl border transition-all ${
            advisor.badgeColor === 'emerald'
              ? 'bg-emerald-950/30 border-emerald-500/30 text-emerald-200'
              : advisor.badgeColor === 'amber'
              ? 'bg-amber-950/30 border-amber-500/30 text-amber-200'
              : advisor.badgeColor === 'rose'
              ? 'bg-rose-950/30 border-rose-500/30 text-rose-200'
              : 'bg-sky-950/30 border-sky-500/30 text-sky-200'
          }`}
        >
          <div className="flex items-center justify-between gap-2 flex-wrap mb-2">
            <span className="text-xs font-black px-2.5 py-1 rounded-xl bg-black/40 border border-white/10 uppercase tracking-wide">
              {advisor.badgeLabel}
            </span>
            <span className="text-xs font-bold text-slate-300">
              Margem de segurança: <strong className="text-white font-black">{advisor.marginKm >= 0 ? `+${formatKm(advisor.marginKm)}` : `Falta ${formatKm(Math.abs(advisor.marginKm))}`}</strong>
            </span>
          </div>

          <h3 className="text-base font-black text-white mt-1">
            {advisor.title}
          </h3>
          <p className="text-xs sm:text-sm text-slate-300 mt-1 leading-relaxed">
            {advisor.explanation}
          </p>
        </div>

        {/* 2. CALIBRADOR RÁPIDO DO MARCADOR DO VEÍCULO */}
        <div className="bg-white/5 border border-white/10 p-4 rounded-2xl space-y-3">
          <div className="flex items-center justify-between text-xs font-bold text-slate-300">
            <span className="flex items-center gap-1.5">
              <Gauge className="w-4 h-4 text-emerald-400" />
              Nível Atual do Marcador no Painel:
            </span>
            <span className="text-sm font-black text-emerald-400">
              {manualTankPct}% (~{advisor.currentLiters} Litros • {formatKm(advisor.currentRangeKm)})
            </span>
          </div>

          {/* BOTÕES PRESETS DE 1 TOQUE (RESERVA, 1/4, 1/2, 3/4, CHEIO) */}
          <div className="grid grid-cols-5 gap-1.5">
            {[
              { label: 'Reserva', pct: 12, color: 'hover:border-rose-500/40 text-rose-300' },
              { label: '1/4', pct: 25, color: 'hover:border-amber-500/40 text-amber-300' },
              { label: '1/2', pct: 50, color: 'hover:border-emerald-500/40 text-emerald-300' },
              { label: '3/4', pct: 75, color: 'hover:border-emerald-500/40 text-emerald-300' },
              { label: 'Cheio', pct: 100, color: 'hover:border-emerald-500/40 text-emerald-300' },
            ].map(preset => (
              <button
                key={preset.pct}
                type="button"
                onClick={() => setManualTankPct(preset.pct)}
                className={`py-1.5 px-1 rounded-xl text-xs font-bold transition border ${
                  manualTankPct === preset.pct
                    ? 'bg-emerald-500 text-slate-950 border-emerald-400 font-black shadow-md'
                    : `bg-white/5 border-white/10 ${preset.color}`
                }`}
              >
                {preset.label}
              </button>
            ))}
          </div>

          {/* SLIDER SUAVE */}
          <input
            type="range"
            min="0"
            max="100"
            step="5"
            value={manualTankPct}
            onChange={e => setManualTankPct(Number(e.target.value))}
            className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-emerald-500"
          />

          <div className="flex justify-between text-[10px] text-slate-500 font-mono">
            <span>0% (Vazio)</span>
            <span>25%</span>
            <span>50%</span>
            <span>75%</span>
            <span>100% ({vehicle.tankCapacity}L Tanque Cheio)</span>
          </div>
        </div>

        {/* 3. SIMULAÇÃO DE DEMANDA DO DIA & COMPARADOR DE PREÇOS FLEX */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          
          {/* DEMANDA DO DIA */}
          <div className="bg-white/5 border border-white/10 p-4 rounded-2xl space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                <Car className="w-4 h-4 text-sky-400" />
                Previsão de KM para Hoje:
              </span>
              <button
                type="button"
                onClick={() => setIsSimulatedOffDay(!isSimulatedOffDay)}
                className={`text-[10px] font-bold px-2 py-0.5 rounded-lg border transition ${
                  isSimulatedOffDay
                    ? 'bg-sky-500/20 text-sky-300 border-sky-500/30'
                    : 'bg-white/5 text-slate-400 border-white/10'
                }`}
              >
                {isSimulatedOffDay ? '🔵 Dia de Folga' : 'Dia de Trabalho'}
              </button>
            </div>

            {!isSimulatedOffDay ? (
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  value={customPlannedKm}
                  onChange={e => setCustomPlannedKm(e.target.value)}
                  placeholder="Ex: 140"
                  className="w-full bg-slate-950/80 border border-white/10 rounded-xl px-3 py-2 text-sm font-bold text-white focus:outline-none focus:border-emerald-500"
                />
                <span className="text-xs font-bold text-slate-400 shrink-0">km</span>
              </div>
            ) : (
              <div className="text-xs text-sky-300 py-1 font-semibold">
                Nenhum expediente de trabalho planejado para hoje.
              </div>
            )}

            <div className="text-[11px] text-slate-400 flex items-center justify-between">
              <span>Consumo médio do veículo:</span>
              <strong className="text-slate-200">{vehicle.avgConsumption} km/L</strong>
            </div>
          </div>

          {/* COMPARADOR ETANOL vs GASOLINA NO POSTO DE HOJE */}
          <div className="bg-white/5 border border-white/10 p-4 rounded-2xl space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                <Zap className="w-4 h-4 text-amber-400" />
                Preços no Posto Hoje:
              </span>
              {vehicle.fuelType === 'Flex' && (
                <span className="text-[10px] font-black text-amber-300">
                  Paridade: {parity.ethanolRatioPercent.toFixed(1)}%
                </span>
              )}
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[10px] text-slate-400 block mb-1">Gasolina (R$/L)</label>
                <input
                  type="number"
                  step="0.01"
                  value={currentGasPrice}
                  onChange={e => setCurrentGasPrice(e.target.value)}
                  className="w-full bg-slate-950/80 border border-white/10 rounded-xl px-2.5 py-1.5 text-xs font-bold text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="text-[10px] text-slate-400 block mb-1">Etanol (R$/L)</label>
                <input
                  type="number"
                  step="0.01"
                  value={currentEthPrice}
                  onChange={e => setCurrentEthPrice(e.target.value)}
                  className="w-full bg-slate-950/80 border border-white/10 rounded-xl px-2.5 py-1.5 text-xs font-bold text-white focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>

            {vehicle.fuelType === 'Flex' && (
              <div className="text-[11px] text-slate-300 bg-black/30 p-2 rounded-xl border border-white/5">
                Vencedor: <strong className="text-emerald-300 font-bold">{parity.betterOption}</strong> ({parity.betterOption === 'Etanol' ? `${formatCurrency(parity.costPerKmEthanol)}/km` : `${formatCurrency(parity.costPerKmGasoline)}/km`})
              </div>
            )}
          </div>
        </div>

        {/* 4. OPÇÕES DE ABASTECIMENTO SUGERIDAS (SE DECIDIR ABASTECER) */}
        <div className="space-y-2.5">
          <div className="text-xs font-black text-white uppercase tracking-wider flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
            SUGESTÕES DE ABASTECIMENTO PARA HOJE
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            
            {/* OPÇÃO 1: APENAS O TURNO DE HOJE COM MARGEM */}
            <div className="bg-white/5 hover:bg-white/10 border border-white/10 p-3.5 rounded-2xl flex flex-col justify-between transition group">
              <div>
                <div className="text-[10px] font-black text-emerald-400 uppercase">
                  1. TURNO DE HOJE (+35%)
                </div>
                <div className="text-base font-black text-white mt-1">
                  ~{advisor.suggestedRefuelLiters} Litros
                </div>
                <div className="text-xs font-bold text-emerald-300">
                  {formatCurrency(advisor.suggestedRefuelCost)}
                </div>
                <p className="text-[10px] text-slate-400 mt-1.5">
                  Garante o expediente de hoje com sobra de segurança sem carregar peso extra.
                </p>
              </div>

              <button
                type="button"
                onClick={() => handleApplyQuickRefuel(advisor.suggestedRefuelLiters, advisor.suggestedRefuelCost, parity.betterOption)}
                className="mt-3 w-full bg-white/10 hover:bg-emerald-500 hover:text-slate-950 text-slate-200 text-xs font-bold py-1.5 rounded-xl transition flex items-center justify-center gap-1"
              >
                <span>Abastecer este valor</span>
                <ArrowRight className="w-3 h-3" />
              </button>
            </div>

            {/* OPÇÃO 2: MEIO TANQUE */}
            <div className="bg-white/5 hover:bg-white/10 border border-white/10 p-3.5 rounded-2xl flex flex-col justify-between transition group">
              <div>
                <div className="text-[10px] font-black text-teal-400 uppercase">
                  2. MEIO TANQUE (50%)
                </div>
                <div className="text-base font-black text-white mt-1">
                  ~{Math.round(vehicle.tankCapacity * 0.5)} Litros
                </div>
                <div className="text-xs font-bold text-teal-300">
                  {formatCurrency((vehicle.tankCapacity * 0.5) * (parity.betterOption === 'Etanol' ? parsedEthPrice : parsedGasPrice))}
                </div>
                <p className="text-[10px] text-slate-400 mt-1.5">
                  Excelente equilíbrio de autonomia (~{Math.round((vehicle.tankCapacity * 0.5) * vehicle.avgConsumption)} km) e fluxo de caixa.
                </p>
              </div>

              <button
                type="button"
                onClick={() => {
                  const liters = Math.round(vehicle.tankCapacity * 0.5);
                  const price = parity.betterOption === 'Etanol' ? parsedEthPrice : parsedGasPrice;
                  handleApplyQuickRefuel(liters, liters * price, parity.betterOption);
                }}
                className="mt-3 w-full bg-white/10 hover:bg-teal-500 hover:text-slate-950 text-slate-200 text-xs font-bold py-1.5 rounded-xl transition flex items-center justify-center gap-1"
              >
                <span>Abastecer Meio Tanque</span>
                <ArrowRight className="w-3 h-3" />
              </button>
            </div>

            {/* OPÇÃO 3: COMPLETAR O TANQUE (100%) */}
            <div className="bg-white/5 hover:bg-white/10 border border-white/10 p-3.5 rounded-2xl flex flex-col justify-between transition group">
              <div>
                <div className="text-[10px] font-black text-amber-400 uppercase">
                  3. COMPLETAR (100%)
                </div>
                <div className="text-base font-black text-white mt-1">
                  ~{Math.round(Math.max(0, vehicle.tankCapacity - advisor.currentLiters))} Litros
                </div>
                <div className="text-xs font-bold text-amber-300">
                  {formatCurrency(advisor.fullTankCost)}
                </div>
                <p className="text-[10px] text-slate-400 mt-1.5">
                  Máxima autonomia ({formatKm(advisor.fullTankRange)}). Menos paradas para você focar apenas em faturar.
                </p>
              </div>

              <button
                type="button"
                onClick={() => {
                  const liters = Math.round(Math.max(0, vehicle.tankCapacity - advisor.currentLiters));
                  const price = parity.betterOption === 'Etanol' ? parsedEthPrice : parsedGasPrice;
                  handleApplyQuickRefuel(liters, liters * price, parity.betterOption);
                }}
                className="mt-3 w-full bg-white/10 hover:bg-amber-500 hover:text-slate-950 text-slate-200 text-xs font-bold py-1.5 rounded-xl transition flex items-center justify-center gap-1"
              >
                <span>Completar Tanque</span>
                <ArrowRight className="w-3 h-3" />
              </button>
            </div>
          </div>
        </div>

        {/* 5. DICAS DE HORÁRIO E ECONOMIA PARA MOTORISTA */}
        <div className="bg-black/30 p-3.5 rounded-2xl border border-white/5 text-xs text-slate-300 space-y-2">
          <div className="font-bold text-slate-200 flex items-center gap-1.5 text-xs">
            <Clock className="w-3.5 h-3.5 text-amber-400" />
            Estratégia de Posto para Maximizar Seus Ganhos:
          </div>
          <ul className="list-disc list-inside space-y-1 text-[11px] text-slate-400 leading-relaxed">
            <li>
              <strong>Melhor horário para abastecer:</strong> Antes das 06h da manhã ou entre 14h e 16h (evita filas e não consome seu tempo em tarifas dinâmicas).
            </li>
            <li>
              <strong>Calibragem dos pneus:</strong> Calibre semanalmente a frio. Pneus com 3 PSI abaixo do recomendado aumentam o consumo em até 3.5%.
            </li>
            <li>
              <strong>Nunca rode abaixo de 10% (reserva):</strong> Aumenta a temperatura da bomba elétrica de combustível e pode queimar a peça prematuramente.
            </li>
          </ul>
        </div>

        {/* FOOTER */}
        <div className="flex justify-end gap-2 pt-2 border-t border-white/10">
          <button
            type="button"
            onClick={onClose}
            className="bg-white/10 hover:bg-white/15 text-slate-300 font-bold px-4 py-2 rounded-xl text-xs transition"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
};
