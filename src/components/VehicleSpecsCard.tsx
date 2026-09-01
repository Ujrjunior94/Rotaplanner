import React, { useState, useMemo } from 'react';
import { useDriver } from '../context/DriverContext';
import {
  findVehicleSpecs,
  calcVehicleAutonomies,
  VehicleSpec,
} from '../data/vehicleDatabase';
import { VehicleSpecsModal } from './VehicleSpecsModal';
import { formatCurrency, formatKm, safeDivide } from '../utils/calc';
import {
  Car,
  Fuel,
  Gauge,
  Sparkles,
  Zap,
  Layers,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  Edit2,
  Check,
} from 'lucide-react';

export const VehicleSpecsCard: React.FC = () => {
  const { vehicle, updateVehicle, profile } = useDriver();
  const [showModal, setShowModal] = useState(false);

  // Tentar encontrar as especificações de fábrica com base no modelo e ano do veículo cadastrado
  const matchedSpec = useMemo(() => {
    return findVehicleSpecs(vehicle.make, vehicle.model, vehicle.year);
  }, [vehicle.make, vehicle.model, vehicle.year]);

  // Autonomias calculadas
  const autonomies = useMemo(() => {
    if (!matchedSpec) return null;
    return calcVehicleAutonomies(matchedSpec);
  }, [matchedSpec]);

  // Comparação do consumo cadastrado vs consumo de fábrica
  const consumptionDiff = useMemo(() => {
    if (!matchedSpec) return 0;
    return vehicle.avgConsumption - matchedSpec.avgConsumption;
  }, [vehicle.avgConsumption, matchedSpec]);

  return (
    <>
      <div className="bg-gradient-to-br from-slate-900 via-slate-900/95 to-sky-950/20 border border-white/15 p-5 sm:p-6 rounded-3xl space-y-5 shadow-xl relative overflow-hidden">
        {/* GLOW DECORATIVO */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-sky-500/10 rounded-full blur-3xl pointer-events-none" />

        {/* HEADER DO CARD DE VEÍCULO */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/10 pb-4 relative z-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-sky-500 to-emerald-400 text-slate-950 flex items-center justify-center font-black shadow-lg shadow-sky-500/20 shrink-0">
              <Car className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm sm:text-base font-black text-white tracking-tight uppercase">
                  FICHA TÉCNICA & AUTONOMIA DO VEÍCULO ({vehicle.year})
                </h3>
                <span className="text-[10px] bg-sky-500/20 text-sky-300 font-bold px-2 py-0.5 rounded-full border border-sky-500/30">
                  Dados de Fábrica
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                {vehicle.make} {vehicle.model} • Placa: <strong className="text-slate-200">{vehicle.plate || 'Não informada'}</strong>
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setShowModal(true)}
            className="px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/15 border border-white/10 text-xs font-bold text-sky-300 hover:text-white flex items-center gap-1.5 transition self-start sm:self-auto shadow-sm"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            Alterar Modelo / Puxar Ficha de Fábrica
          </button>
        </div>

        {/* GRID PRINCIPAL DE DADOS TÉCNICOS */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 relative z-10">
          <div className="bg-black/40 p-3.5 rounded-2xl border border-white/10 space-y-1">
            <span className="text-[10px] font-bold text-slate-400 block uppercase">
              Capacidade do Tanque
            </span>
            <div className="flex items-baseline gap-1">
              <span className="text-xl font-black text-white">{vehicle.tankCapacity || 44}</span>
              <span className="text-xs text-slate-400">{vehicle.fuelType === 'Elétrico' ? 'kWh' : 'Litros'}</span>
            </div>
            <span className="text-[10px] text-slate-500 block">
              Porta-malas: <strong className="text-slate-300">{matchedSpec?.trunkCapacity || 469}L</strong>
            </span>
          </div>

          <div className="bg-black/40 p-3.5 rounded-2xl border border-white/10 space-y-1">
            <span className="text-[10px] font-bold text-sky-400 block uppercase">
              Autonomia Cidade (Gasolina)
            </span>
            <div className="flex items-baseline gap-1">
              <span className="text-xl font-black text-sky-300">
                {autonomies?.cityAutonomyGas || Math.round((vehicle.tankCapacity || 44) * (matchedSpec?.cityConsumptionGas || 13.5))}
              </span>
              <span className="text-xs text-slate-400">km</span>
            </div>
            <span className="text-[10px] text-slate-400 block">
              Consumo: {matchedSpec?.cityConsumptionGas || 13.5} km/L
            </span>
          </div>

          <div className="bg-black/40 p-3.5 rounded-2xl border border-white/10 space-y-1">
            <span className="text-[10px] font-bold text-emerald-400 block uppercase">
              Autonomia Cidade (Etanol)
            </span>
            <div className="flex items-baseline gap-1">
              <span className="text-xl font-black text-emerald-300">
                {autonomies?.cityAutonomyEth || Math.round((vehicle.tankCapacity || 44) * (matchedSpec?.cityConsumptionEth || 9.6))}
              </span>
              <span className="text-xs text-slate-400">km</span>
            </div>
            <span className="text-[10px] text-slate-400 block">
              Consumo: {matchedSpec?.cityConsumptionEth || 9.6} km/L
            </span>
          </div>

          <div className="bg-black/40 p-3.5 rounded-2xl border border-white/10 space-y-1">
            <span className="text-[10px] font-bold text-amber-400 block uppercase">
              Consumo Configurado
            </span>
            <div className="flex items-baseline gap-1">
              <span className="text-xl font-black text-amber-300">{vehicle.avgConsumption || 12.5}</span>
              <span className="text-xs text-slate-400">km/L</span>
            </div>
            <span className="text-[10px] text-slate-400 block">
              Padrão Inmetro: {matchedSpec?.avgConsumption || 14.2} km/L
            </span>
          </div>
        </div>

        {/* COMPARATIVO DETALHADO DE AUTONOMIA CIDADE VS ESTRADA */}
        {autonomies && (
          <div className="bg-black/30 p-4 rounded-2xl border border-white/10 relative z-10 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black text-white uppercase flex items-center gap-1.5">
                <Gauge className="w-4 h-4 text-sky-400" />
                Alcance Estimado com Tanque Cheio (Padrão Inmetro)
              </span>
              <span className="text-[10px] text-slate-400">
                Motor: <strong className="text-slate-200">{matchedSpec?.engine || '1.0 Flex'}</strong>
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="p-3 rounded-xl bg-sky-950/30 border border-sky-500/20 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-sky-300">⛽ Abastecido com Gasolina</span>
                  <span className="text-[10px] text-slate-400">{vehicle.tankCapacity} Litros</span>
                </div>
                <div className="flex items-center justify-between text-slate-300">
                  <span>Autonomia Urbana (Cidade):</span>
                  <strong className="text-white font-mono">{autonomies.cityAutonomyGas} km</strong>
                </div>
                <div className="flex items-center justify-between text-slate-300">
                  <span>Autonomia Rodoviária (Estrada):</span>
                  <strong className="text-sky-300 font-mono">{autonomies.highwayAutonomyGas} km</strong>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-emerald-950/30 border border-emerald-500/20 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-emerald-300">⚡ Abastecido com Etanol</span>
                  <span className="text-[10px] text-slate-400">{vehicle.tankCapacity} Litros</span>
                </div>
                <div className="flex items-center justify-between text-slate-300">
                  <span>Autonomia Urbana (Cidade):</span>
                  <strong className="text-white font-mono">{autonomies.cityAutonomyEth} km</strong>
                </div>
                <div className="flex items-center justify-between text-slate-300">
                  <span>Autonomia Rodoviária (Estrada):</span>
                  <strong className="text-emerald-300 font-mono">{autonomies.highwayAutonomyEth} km</strong>
                </div>
              </div>
            </div>

            {/* CATEGORIAS ACEITAS EM APLICATIVOS */}
            {matchedSpec?.appCategories && (
              <div className="flex flex-wrap items-center gap-1.5 pt-2 border-t border-white/5">
                <span className="text-[10px] font-bold text-slate-400 mr-1">Categorias Aceitas no Veículo:</span>
                {matchedSpec.appCategories.map(cat => (
                  <span
                    key={cat}
                    className="text-[10px] bg-white/10 text-slate-200 px-2 py-0.5 rounded-md font-bold"
                  >
                    {cat}
                  </span>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* MODAL DE SELEÇÃO E BUSCA DE VEÍCULOS */}
      <VehicleSpecsModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
      />
    </>
  );
};
