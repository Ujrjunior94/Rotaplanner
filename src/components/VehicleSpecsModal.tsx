import React, { useState, useMemo } from 'react';
import {
  POPULAR_VEHICLES_DATABASE,
  VehicleSpec,
  getAvailableMakes,
  getModelsByMake,
  calcVehicleAutonomies,
} from '../data/vehicleDatabase';
import { useDriver } from '../context/DriverContext';
import { formatCurrency } from '../utils/calc';
import {
  Car,
  Fuel,
  Zap,
  Gauge,
  Check,
  Search,
  CheckCircle2,
  X,
  ChevronRight,
  ShieldCheck,
  Sparkles,
  Info,
  Layers,
  Award,
} from 'lucide-react';

interface VehicleSpecsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onApplySpec?: (spec: VehicleSpec, selectedYear: number) => void;
}

export const VehicleSpecsModal: React.FC<VehicleSpecsModalProps> = ({
  isOpen,
  onClose,
  onApplySpec,
}) => {
  const { vehicle, updateVehicle } = useDriver();

  const [selectedMake, setSelectedMake] = useState<string>(vehicle.make || 'Chevrolet');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedSpecId, setSelectedSpecId] = useState<string>('');
  const [selectedYear, setSelectedYear] = useState<number>(vehicle.year || 2023);
  const [appliedSuccess, setAppliedSuccess] = useState(false);

  const availableMakes = useMemo(() => getAvailableMakes(), []);

  // Filtrar veículos pela busca ou montadora selecionada
  const filteredVehicles = useMemo(() => {
    if (searchQuery.trim().length > 1) {
      const q = searchQuery.toLowerCase();
      return POPULAR_VEHICLES_DATABASE.filter(
        v =>
          v.make.toLowerCase().includes(q) ||
          v.model.toLowerCase().includes(q) ||
          v.engine.toLowerCase().includes(q)
      );
    }
    return getModelsByMake(selectedMake);
  }, [searchQuery, selectedMake]);

  // Veículo selecionado para visualização detalhada
  const currentSpec = useMemo(() => {
    if (selectedSpecId) {
      return POPULAR_VEHICLES_DATABASE.find(v => v.id === selectedSpecId) || filteredVehicles[0];
    }
    // Tenta casar com o veículo atual do motorista
    const matchCurrent = POPULAR_VEHICLES_DATABASE.find(
      v =>
        v.make.toLowerCase() === vehicle.make.toLowerCase() &&
        (v.model.toLowerCase().includes(vehicle.model.toLowerCase()) ||
          vehicle.model.toLowerCase().includes(v.model.toLowerCase()))
    );
    return matchCurrent || filteredVehicles[0] || POPULAR_VEHICLES_DATABASE[0];
  }, [selectedSpecId, filteredVehicles, vehicle]);

  // Autonomias calculadas do veículo selecionado
  const autonomies = useMemo(() => {
    if (!currentSpec) return null;
    return calcVehicleAutonomies(currentSpec);
  }, [currentSpec]);

  if (!isOpen) return null;

  const handleApplyToVehicle = () => {
    if (!currentSpec) return;

    if (onApplySpec) {
      onApplySpec(currentSpec, selectedYear);
    } else {
      updateVehicle({
        make: currentSpec.make,
        model: currentSpec.model,
        year: selectedYear,
        fuelType: currentSpec.fuelType === 'Elétrico' ? 'Elétrico' : 'Flex',
        tankCapacity: currentSpec.tankCapacity,
        avgConsumption: currentSpec.avgConsumption,
      });
    }

    setAppliedSuccess(true);
    setTimeout(() => {
      setAppliedSuccess(false);
      onClose();
    }, 1200);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md overflow-y-auto animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-white/15 rounded-3xl w-full max-w-3xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden my-auto">
        
        {/* HEADER DO MODAL */}
        <div className="p-5 sm:p-6 border-b border-white/10 flex items-center justify-between bg-slate-950/60 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-emerald-500 to-teal-400 text-slate-950 flex items-center justify-center font-black shadow-lg shadow-emerald-500/20">
              <Car className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-black text-white tracking-tight">
                  CATÁLOGO TÉCNICO DE VEÍCULOS
                </h3>
                <span className="text-[10px] bg-emerald-500/20 text-emerald-300 font-bold px-2 py-0.5 rounded-full border border-emerald-500/30">
                  Autonomia & Fábrica
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Consulte e preencha automaticamente a capacidade do tanque, consumo e autonomia padrão por modelo e ano.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white flex items-center justify-center transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* CONTEÚDO SCROLLÁVEL */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-5 flex-1 custom-scrollbar">
          
          {/* BUSCA RÁPIDA E SELETOR DE MONTADORA */}
          <div className="space-y-3">
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Buscar por modelo (ex: Onix Plus, HB20, Kwid, Argo, Virtus, Dolphin...)"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full bg-black/40 border border-white/15 rounded-2xl pl-10 pr-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-white"
                >
                  Limpar
                </button>
              )}
            </div>

            {/* SELETOR DE MONTADORAS EM CHIPS */}
            {!searchQuery && (
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1.5 custom-scrollbar">
                {availableMakes.map(make => (
                  <button
                    key={make}
                    type="button"
                    onClick={() => {
                      setSelectedMake(make);
                      const firstModel = getModelsByMake(make)[0];
                      if (firstModel) setSelectedSpecId(firstModel.id);
                    }}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition whitespace-nowrap ${
                      selectedMake === make
                        ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20'
                        : 'bg-white/5 text-slate-400 hover:text-slate-200 hover:bg-white/10 border border-white/5'
                    }`}
                  >
                    {make}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* LISTA DE MODELOS DA MONTADORA */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5 max-h-48 overflow-y-auto p-1 bg-black/20 rounded-2xl border border-white/5 custom-scrollbar">
            {filteredVehicles.map(spec => (
              <button
                key={spec.id}
                type="button"
                onClick={() => {
                  setSelectedSpecId(spec.id);
                  if (!spec.years.includes(selectedYear)) {
                    setSelectedYear(spec.years[spec.years.length - 1]);
                  }
                }}
                className={`p-3 rounded-xl border text-left transition-all flex flex-col justify-between ${
                  currentSpec?.id === spec.id
                    ? 'bg-emerald-500/15 border-emerald-400 ring-1 ring-emerald-500/30'
                    : 'bg-white/5 border-white/10 hover:border-white/20 hover:bg-white/10'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold text-emerald-400">{spec.make}</span>
                    <span className="text-[9px] bg-white/10 px-1.5 py-0.5 rounded text-slate-300 font-mono">
                      {spec.fuelType}
                    </span>
                  </div>
                  <h4 className="text-xs font-black text-white mt-0.5 leading-tight">{spec.model}</h4>
                  <p className="text-[10px] text-slate-400 mt-0.5">{spec.engine}</p>
                </div>
                <div className="flex items-center justify-between mt-2 pt-1.5 border-t border-white/5 text-[10px]">
                  <span className="text-slate-400">Tanque: <strong className="text-white">{spec.tankCapacity}L</strong></span>
                  <span className="text-emerald-400 font-black">{spec.avgConsumption} km/L</span>
                </div>
              </button>
            ))}
          </div>

          {/* DETALHES COMPLETOS DA FICHA TÉCNICA DO VEÍCULO SELECIONADO */}
          {currentSpec && (
            <div className="bg-gradient-to-br from-slate-900 via-slate-900 to-emerald-950/30 border border-emerald-500/30 p-5 rounded-2xl space-y-4">
              
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/10 pb-3">
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="text-sm sm:text-base font-black text-white">
                      {currentSpec.make} {currentSpec.model}
                    </h4>
                    <span className="text-[10px] font-black bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded-full border border-emerald-500/30">
                      Ficha Padrão
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Motorização: <strong className="text-slate-200">{currentSpec.engine}</strong>
                  </p>
                </div>

                {/* SELETOR DE ANO DO VEÍCULO */}
                <div className="flex items-center gap-2 bg-black/40 px-3 py-1.5 rounded-xl border border-white/10">
                  <span className="text-xs text-slate-400 font-bold">Ano Modelo:</span>
                  <select
                    value={selectedYear}
                    onChange={e => setSelectedYear(parseInt(e.target.value))}
                    className="bg-transparent text-xs font-black text-emerald-400 focus:outline-none cursor-pointer"
                  >
                    {currentSpec.years.map(y => (
                      <option key={y} value={y} className="bg-slate-900 text-white">
                        {y}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* GRID DE CONSUMO E CAPACIDADE */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="bg-black/30 p-3 rounded-xl border border-white/5 space-y-1">
                  <span className="text-[10px] font-bold text-slate-400 block uppercase">Capacidade Tanque</span>
                  <div className="flex items-baseline gap-1">
                    <span className="text-base font-black text-white">{currentSpec.tankCapacity}</span>
                    <span className="text-xs text-slate-400">{currentSpec.fuelType === 'Elétrico' ? 'kWh' : 'Litros'}</span>
                  </div>
                  <span className="text-[10px] text-slate-500">Porta-malas: {currentSpec.trunkCapacity}L</span>
                </div>

                <div className="bg-black/30 p-3 rounded-xl border border-white/5 space-y-1">
                  <span className="text-[10px] font-bold text-sky-400 block uppercase">Consumo Gasolina</span>
                  <div className="flex items-baseline gap-1">
                    <span className="text-base font-black text-sky-300">{currentSpec.cityConsumptionGas}</span>
                    <span className="text-xs text-slate-400">km/L (cidade)</span>
                  </div>
                  <span className="text-[10px] text-slate-400">Estrada: {currentSpec.highwayConsumptionGas} km/L</span>
                </div>

                <div className="bg-black/30 p-3 rounded-xl border border-white/5 space-y-1">
                  <span className="text-[10px] font-bold text-emerald-400 block uppercase">Consumo Etanol</span>
                  <div className="flex items-baseline gap-1">
                    <span className="text-base font-black text-emerald-300">{currentSpec.cityConsumptionEth}</span>
                    <span className="text-xs text-slate-400">km/L (cidade)</span>
                  </div>
                  <span className="text-[10px] text-slate-400">Estrada: {currentSpec.highwayConsumptionEth} km/L</span>
                </div>

                <div className="bg-black/30 p-3 rounded-xl border border-white/5 space-y-1">
                  <span className="text-[10px] font-bold text-amber-400 block uppercase">Média Mista Padrão</span>
                  <div className="flex items-baseline gap-1">
                    <span className="text-base font-black text-amber-300">{currentSpec.avgConsumption}</span>
                    <span className="text-xs text-slate-400">km/L</span>
                  </div>
                  <span className="text-[10px] text-slate-500">Manutenção: ~R$ {currentSpec.estimatedMaintenancePerKm}/km</span>
                </div>
              </div>

              {/* CARD DE AUTONOMIA ESTIMADA COM TANQUE CHEIO */}
              {autonomies && (
                <div className="bg-slate-950/60 p-4 rounded-xl border border-white/10 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black text-white uppercase flex items-center gap-1.5">
                      <Gauge className="w-4 h-4 text-emerald-400" />
                      Autonomia Padrão com Tanque Cheio
                    </span>
                    <span className="text-[10px] text-emerald-400 font-bold bg-emerald-500/15 px-2 py-0.5 rounded-md">
                      Estimativa Inmetro
                    </span>
                  </div>

                  {autonomies.isElectric ? (
                    <div className="bg-emerald-500/10 p-3 rounded-lg border border-emerald-500/20 flex items-center justify-between">
                      <div>
                        <span className="text-xs text-slate-300 font-bold block">Autonomia 100% Elétrica:</span>
                        <span className="text-lg font-black text-emerald-300">{autonomies.electricRangeKm} km</span>
                      </div>
                      <span className="text-xs text-emerald-400 font-bold">Bateria: {autonomies.batteryKwh} kWh</span>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 gap-3 text-xs">
                      <div className="p-2.5 rounded-lg bg-sky-950/30 border border-sky-500/20">
                        <span className="text-[10px] font-bold text-sky-400 block uppercase">Com Gasolina</span>
                        <div className="flex items-baseline justify-between mt-1">
                          <span className="text-slate-300">Cidade:</span>
                          <span className="text-sm font-black text-white">{autonomies.cityAutonomyGas} km</span>
                        </div>
                        <div className="flex items-baseline justify-between mt-0.5">
                          <span className="text-slate-400 text-[11px]">Estrada:</span>
                          <span className="text-xs font-bold text-sky-300">{autonomies.highwayAutonomyGas} km</span>
                        </div>
                      </div>

                      <div className="p-2.5 rounded-lg bg-emerald-950/30 border border-emerald-500/20">
                        <span className="text-[10px] font-bold text-emerald-400 block uppercase">Com Etanol</span>
                        <div className="flex items-baseline justify-between mt-1">
                          <span className="text-slate-300">Cidade:</span>
                          <span className="text-sm font-black text-white">{autonomies.cityAutonomyEth} km</span>
                        </div>
                        <div className="flex items-baseline justify-between mt-0.5">
                          <span className="text-slate-400 text-[11px]">Estrada:</span>
                          <span className="text-xs font-bold text-emerald-300">{autonomies.highwayAutonomyEth} km</span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* CATEGORIAS ACEITAS EM APPS */}
                  <div className="flex flex-wrap items-center gap-1.5 pt-2 border-t border-white/5">
                    <span className="text-[10px] font-bold text-slate-400 mr-1">Categorias aceitas:</span>
                    {currentSpec.appCategories.map(cat => (
                      <span
                        key={cat}
                        className="text-[10px] bg-white/10 text-slate-200 px-2 py-0.5 rounded-md font-bold"
                      >
                        {cat}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {currentSpec.description && (
                <p className="text-xs text-slate-400 italic">
                  💡 {currentSpec.description}
                </p>
              )}
            </div>
          )}

        </div>

        {/* FOOTER COM BOTÃO DE APLICAR */}
        <div className="p-4 sm:p-5 border-t border-white/10 bg-slate-950/80 flex items-center justify-between shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl border border-white/10 hover:bg-white/5 text-xs text-slate-300 font-bold transition"
          >
            Fechar
          </button>

          <button
            type="button"
            onClick={handleApplyToVehicle}
            disabled={appliedSuccess || !currentSpec}
            className={`px-5 py-2.5 rounded-xl text-xs font-black transition-all flex items-center gap-2 ${
              appliedSuccess
                ? 'bg-emerald-500 text-slate-950 shadow-lg shadow-emerald-500/20'
                : 'bg-gradient-to-r from-emerald-500 to-teal-400 hover:from-emerald-400 hover:to-teal-300 text-slate-950 shadow-lg shadow-emerald-500/20'
            }`}
          >
            {appliedSuccess ? (
              <>
                <CheckCircle2 className="w-4 h-4" />
                Dados do Veículo Atualizados!
              </>
            ) : (
              <>
                <Zap className="w-4 h-4" />
                Aplicar Ficha Técnica ao Meu Carro ({selectedYear})
              </>
            )}
          </button>
        </div>

      </div>
    </div>
  );
};
