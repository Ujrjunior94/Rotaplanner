import React, { useState } from 'react';
import { useDriver } from '../context/DriverContext';
import {
  calcRealCarCost,
  calcDepreciationPerKm,
  formatCurrency,
  formatKm,
  safeDivide,
} from '../utils/calc';
import {
  Car,
  Fuel,
  Wrench,
  Shield,
  FileText,
  DollarSign,
  AlertTriangle,
  CheckCircle2,
  Plus,
  Edit2,
  Info,
  Calendar,
  Sparkles,
  Calculator,
  RefreshCw,
} from 'lucide-react';
import { MaintenanceCategory } from '../types';
import { VehicleSpecsModal } from './VehicleSpecsModal';
import { RecalculateRecordsModal } from './RecalculateRecordsModal';
import { VehicleSpec } from '../data/vehicleDatabase';

export interface VehicleCostViewProps {
  onOpenFuelAdvisor?: () => void;
}

export const VehicleCostView: React.FC<VehicleCostViewProps> = ({ onOpenFuelAdvisor }) => {
  const {
    vehicle,
    updateVehicle,
    expenses,
    sessions,
    maintenances,
    addMaintenance,
    deleteMaintenance,
    profile,
  } = useDriver();

  const [isEditingVehicle, setIsEditingVehicle] = useState(false);
  const [showAddMaintModal, setShowAddMaintModal] = useState(false);
  const [showSpecsModal, setShowSpecsModal] = useState(false);
  const [showRecalculateModal, setShowRecalculateModal] = useState(false);

  // Form de edição do veículo
  const [make, setMake] = useState(vehicle.make);
  const [model, setModel] = useState(vehicle.model);
  const [year, setYear] = useState(vehicle.year.toString());
  const [plate, setPlate] = useState(vehicle.plate);
  const [avgConsumption, setAvgConsumption] = useState(vehicle.avgConsumption.toString());
  const [currentOdo, setCurrentOdo] = useState(vehicle.currentOdometer.toString());
  const [purchasePrice, setPurchasePrice] = useState(vehicle.purchasePrice.toString());
  const [currentVal, setCurrentVal] = useState(vehicle.estimatedCurrentValue.toString());
  const [lifespanKm, setLifespanKm] = useState(vehicle.estimatedLifespanKm.toString());
  const [financed, setFinanced] = useState(vehicle.financed);
  const [installment, setInstallment] = useState(vehicle.financingInstallment.toString());
  const [installmentsLeft, setInstallmentsLeft] = useState(vehicle.financingInstallmentsLeft.toString());
  const [insuranceMonthly, setInsuranceMonthly] = useState(vehicle.insuranceMonthly.toString());
  const [ipvaAnnual, setIpvaAnnual] = useState(vehicle.ipvaAnnual.toString());

  const handleApplySpecFromCatalog = (spec: VehicleSpec, selectedYr: number) => {
    setMake(spec.make);
    setModel(spec.model);
    setYear(selectedYr.toString());
    setAvgConsumption(spec.avgConsumption.toString());

    updateVehicle({
      make: spec.make,
      model: spec.model,
      year: selectedYr,
      avgConsumption: spec.avgConsumption,
      tankCapacity: spec.tankCapacity,
      fuelType: spec.fuelType === 'Elétrico' ? 'Elétrico' : 'Flex',
    });
  };

  // Form de Manutenção
  const [mCategory, setMCategory] = useState<MaintenanceCategory>('Troca de Óleo');
  const [mDesc, setMDesc] = useState('');
  const [mAmount, setMAmount] = useState('280.00');
  const [mOdo, setMOdo] = useState(vehicle.currentOdometer.toString());
  const [mNextOdo, setMNextOdo] = useState((vehicle.currentOdometer + 10000).toString());

  const totalKmTracked = sessions.reduce((acc, s) => {
    if (s.endOdometer && s.startOdometer) return acc + (s.endOdometer - s.startOdometer);
    return acc;
  }, 0);

  const carCost = calcRealCarCost(
    vehicle,
    profile.gasPriceReference,
    expenses,
    totalKmTracked
  );

  const handleSaveVehicle = (e: React.FormEvent) => {
    e.preventDefault();
    updateVehicle({
      make,
      model,
      year: parseInt(year) || 2023,
      plate,
      avgConsumption: parseFloat(avgConsumption) || 12.0,
      currentOdometer: parseInt(currentOdo) || vehicle.currentOdometer,
      purchasePrice: parseFloat(purchasePrice) || 75000,
      estimatedCurrentValue: parseFloat(currentVal) || 65000,
      estimatedLifespanKm: parseInt(lifespanKm) || 300000,
      financed,
      financingInstallment: parseFloat(installment) || 0,
      financingInstallmentsLeft: parseInt(installmentsLeft) || 0,
      insuranceMonthly: parseFloat(insuranceMonthly) || 0,
      ipvaAnnual: parseFloat(ipvaAnnual) || 0,
    });
    setIsEditingVehicle(false);
  };

  const handleAddMaint = (e: React.FormEvent) => {
    e.preventDefault();
    addMaintenance({
      category: mCategory,
      description: mDesc || mCategory,
      amount: parseFloat(mAmount) || 0,
      odometer: parseInt(mOdo) || vehicle.currentOdometer,
      nextOdometer: parseInt(mNextOdo) || vehicle.currentOdometer + 10000,
      date: new Date().toISOString().split('T')[0],
      completed: true,
    });
    setShowAddMaintModal(false);
  };

  return (
    <div className="space-y-6">
      {/* HEADER DO VEÍCULO */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white/5 backdrop-blur-lg border border-white/10 p-5 rounded-2xl">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-emerald-500 to-teal-400 flex items-center justify-center text-slate-950 font-black">
            <Car className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-base sm:text-lg font-black text-white">
              {vehicle.make} {vehicle.model} ({vehicle.year})
            </h2>
            <div className="flex items-center gap-3 text-xs text-slate-400 mt-0.5">
              <span>Placa: <strong className="text-slate-200">{vehicle.plate}</strong></span>
              <span>•</span>
              <span>KM Atual: <strong className="text-slate-200">{formatKm(vehicle.currentOdometer)}</strong></span>
              <span>•</span>
              <span>Consumo: <strong className="text-emerald-400">{vehicle.avgConsumption} km/L</strong></span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto flex-wrap">
          <button
            onClick={() => setShowRecalculateModal(true)}
            className="bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 font-bold px-3.5 py-2 rounded-xl text-xs border border-emerald-500/30 flex items-center gap-1.5 transition shadow-sm"
            title="Recalcular combustível e custos de turnos passados com as especificações atuais do veículo"
          >
            <Calculator className="w-3.5 h-3.5 text-emerald-400" />
            <span>Recalcular Lançamentos</span>
          </button>

          {onOpenFuelAdvisor && (
            <button
              onClick={onOpenFuelAdvisor}
              className="bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 font-bold px-3.5 py-2 rounded-xl text-xs border border-amber-500/30 flex items-center gap-1.5 transition"
            >
              <Fuel className="w-3.5 h-3.5 text-amber-400" />
              <span>Devo Abastecer Hoje?</span>
            </button>
          )}

          <button
            onClick={() => setIsEditingVehicle(!isEditingVehicle)}
            className="bg-white/10 hover:bg-white/15 text-slate-200 font-bold px-3.5 py-2 rounded-xl text-xs border border-white/10 flex items-center gap-1.5 transition"
          >
            <Edit2 className="w-3.5 h-3.5" />
            {isEditingVehicle ? 'Fechar Edição' : 'Editar Ficha do Veículo'}
          </button>
        </div>
      </div>

      {/* FORMULÁRIO DE EDIÇÃO DO VEÍCULO */}
      {isEditingVehicle && (
        <form onSubmit={handleSaveVehicle} className="bg-white/5 backdrop-blur-lg border border-emerald-500/30 p-5 rounded-2xl space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-white/10 pb-3">
            <h3 className="text-xs font-black text-emerald-400 uppercase tracking-wider">
              FICHA TÉCNICA E CUSTOS FIXOS DO CARRO
            </h3>
            <button
              type="button"
              onClick={() => setShowSpecsModal(true)}
              className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-400 text-slate-950 font-black text-xs flex items-center gap-1.5 shadow-md shadow-emerald-500/20 self-start sm:self-auto"
            >
              <Sparkles className="w-3.5 h-3.5" />
              Puxar Ficha de Fábrica por Modelo/Ano
            </button>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div>
              <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Marca</label>
              <input type="text" value={make} onChange={e => setMake(e.target.value)} className="w-full bg-black/40 border border-white/15 rounded-xl px-3 py-2 text-xs text-white" />
            </div>
            <div>
              <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Modelo</label>
              <input type="text" value={model} onChange={e => setModel(e.target.value)} className="w-full bg-black/40 border border-white/15 rounded-xl px-3 py-2 text-xs text-white" />
            </div>
            <div>
              <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Ano</label>
              <input type="number" value={year} onChange={e => setYear(e.target.value)} className="w-full bg-black/40 border border-white/15 rounded-xl px-3 py-2 text-xs text-white" />
            </div>
            <div>
              <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Placa</label>
              <input type="text" value={plate} onChange={e => setPlate(e.target.value)} className="w-full bg-black/40 border border-white/15 rounded-xl px-3 py-2 text-xs text-white" />
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div>
              <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Consumo Médio (km/L)</label>
              <input type="number" step="0.1" value={avgConsumption} onChange={e => setAvgConsumption(e.target.value)} className="w-full bg-black/40 border border-white/15 rounded-xl px-3 py-2 text-xs text-emerald-400 font-bold" />
            </div>
            <div>
              <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">KM Atual</label>
              <input type="number" value={currentOdo} onChange={e => setCurrentOdo(e.target.value)} className="w-full bg-black/40 border border-white/15 rounded-xl px-3 py-2 text-xs text-white" />
            </div>
            <div>
              <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Valor de Compra (R$)</label>
              <input type="number" value={purchasePrice} onChange={e => setPurchasePrice(e.target.value)} className="w-full bg-black/40 border border-white/15 rounded-xl px-3 py-2 text-xs text-white" />
            </div>
            <div>
              <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Valor Atual FIPE (R$)</label>
              <input type="number" value={currentVal} onChange={e => setCurrentVal(e.target.value)} className="w-full bg-black/40 border border-white/15 rounded-xl px-3 py-2 text-xs text-white" />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Seguro Mensal (R$)</label>
              <input type="number" value={insuranceMonthly} onChange={e => setInsuranceMonthly(e.target.value)} className="w-full bg-black/40 border border-white/15 rounded-xl px-3 py-2 text-xs text-white" />
            </div>
            <div>
              <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">IPVA Anual (R$)</label>
              <input type="number" value={ipvaAnnual} onChange={e => setIpvaAnnual(e.target.value)} className="w-full bg-black/40 border border-white/15 rounded-xl px-3 py-2 text-xs text-white" />
            </div>
            <div>
              <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Vida Útil Estimada (KM)</label>
              <input type="number" value={lifespanKm} onChange={e => setLifespanKm(e.target.value)} className="w-full bg-black/40 border border-white/15 rounded-xl px-3 py-2 text-xs text-white" />
            </div>
          </div>

          <div className="bg-black/30 p-3.5 rounded-xl border border-white/10 space-y-3">
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="financedCheck"
                checked={financed}
                onChange={e => setFinanced(e.target.checked)}
                className="w-4 h-4 rounded text-emerald-500 focus:ring-emerald-500"
              />
              <label htmlFor="financedCheck" className="text-xs font-bold text-slate-200">
                O veículo é financiado
              </label>
            </div>

            {financed && (
              <div className="grid grid-cols-2 gap-3 pt-1">
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Valor da Parcela (R$)</label>
                  <input type="number" value={installment} onChange={e => setInstallment(e.target.value)} className="w-full bg-black/40 border border-white/15 rounded-xl px-3 py-2 text-xs text-amber-300 font-bold" />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Parcelas Restantes</label>
                  <input type="number" value={installmentsLeft} onChange={e => setInstallmentsLeft(e.target.value)} className="w-full bg-black/40 border border-white/15 rounded-xl px-3 py-2 text-xs text-white" />
                </div>
              </div>
            )}
          </div>

          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => setIsEditingVehicle(false)} className="px-3 py-1.5 rounded-xl text-xs font-bold text-slate-400">
              Cancelar
            </button>
            <button type="submit" className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 px-4 py-1.5 rounded-xl text-xs font-black">
              Salvar Alterações
            </button>
          </div>
        </form>
      )}

      {/* PAINEL CUSTO REAL DO CARRO (SECTION 12) */}
      <div className="bg-white/5 backdrop-blur-lg border border-white/10 p-5 sm:p-6 rounded-2xl space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-black text-white uppercase tracking-wider flex items-center gap-2">
              <DollarSign className="w-4 h-4 text-emerald-400" />
              CUSTO REAL DO CARRO POR KM & MÊS
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Quanto você realmente gasta para manter o veículo rodando nas ruas.
            </p>
          </div>
        </div>

        {/* 4 CARDS DESTAQUE DE CUSTO */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="bg-white/5 p-4 rounded-2xl border border-white/10 text-center">
            <span className="text-[10px] font-bold text-slate-400 uppercase">CUSTO TOTAL / KM</span>
            <div className="text-2xl font-black text-rose-400 mt-1">
              {formatCurrency(carCost.totalCostPerKm)}
            </div>
            <span className="text-[10px] text-slate-500">Tudo incluso por km</span>
          </div>

          <div className="bg-white/5 p-4 rounded-2xl border border-white/10 text-center">
            <span className="text-[10px] font-bold text-slate-400 uppercase">CUSTO FIXO MENSAL</span>
            <div className="text-2xl font-black text-amber-300 mt-1">
              {formatCurrency(carCost.fixedCostMonthly)}
            </div>
            <span className="text-[10px] text-slate-500">Seguro, IPVA, Parcela</span>
          </div>

          <div className="bg-white/5 p-4 rounded-2xl border border-white/10 text-center">
            <span className="text-[10px] font-bold text-slate-400 uppercase">CUSTO MÉDIO DIÁRIO</span>
            <div className="text-2xl font-black text-white mt-1">
              {formatCurrency(carCost.dailyAvgCost)}
            </div>
            <span className="text-[10px] text-slate-500">Estimativa base 100km/dia</span>
          </div>

          <div className="bg-white/5 p-4 rounded-2xl border border-white/10 text-center">
            <span className="text-[10px] font-bold text-slate-400 uppercase">CUSTO ANUAL ESTIMADO</span>
            <div className="text-2xl font-black text-slate-300 mt-1">
              {formatCurrency(carCost.estimatedAnnualCost)}
            </div>
            <span className="text-[10px] text-slate-500">Projeção 36.000 km/ano</span>
          </div>
        </div>

        {/* DETALHAMENTO DAS FRAÇÕES DO CUSTO / KM */}
        <div className="bg-black/30 p-4 rounded-2xl border border-white/10 space-y-3">
          <div className="text-xs font-bold text-slate-300 uppercase">Composição do Custo por KM</div>
          
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
            <div className="flex justify-between items-center p-2 rounded-xl bg-white/5">
              <span className="text-slate-400">Combustível:</span>
              <strong className="text-rose-400 font-bold">{formatCurrency(carCost.fuelCostKm)}/km</strong>
            </div>
            <div className="flex justify-between items-center p-2 rounded-xl bg-white/5">
              <span className="text-slate-400">Depreciação:</span>
              <strong className="text-amber-400 font-bold">{formatCurrency(carCost.depreciationKm)}/km</strong>
            </div>
            <div className="flex justify-between items-center p-2 rounded-xl bg-white/5">
              <span className="text-slate-400">Manutenção/Pneus:</span>
              <strong className="text-teal-400 font-bold">{formatCurrency(carCost.maintenanceKm)}/km</strong>
            </div>
            <div className="flex justify-between items-center p-2 rounded-xl bg-white/5">
              <span className="text-slate-400">Custos Fixos:</span>
              <strong className="text-purple-400 font-bold">{formatCurrency(carCost.fixedCostKm)}/km</strong>
            </div>
          </div>
        </div>
      </div>

      {/* CARD RECALCULADOR DE LANÇAMENTOS DO VEÍCULO */}
      <div className="bg-gradient-to-br from-emerald-950/40 via-slate-900 to-slate-900 border border-emerald-500/30 p-5 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-xl">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold shrink-0 border border-emerald-500/30 mt-0.5">
            <Calculator className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-sm font-black text-white flex items-center gap-2">
              Recalcular Lançamentos com Dados Atuais do Carro
              <span className="bg-emerald-500/20 text-emerald-300 text-[10px] font-bold px-2 py-0.5 rounded-full border border-emerald-500/30">
                {vehicle.avgConsumption} km/L • R$ {profile.gasPriceReference ? profile.gasPriceReference.toFixed(2) : '5.89'}/L
              </span>
            </h4>
            <p className="text-xs text-slate-300 mt-1 max-w-xl">
              Alterou o consumo do carro ou trocou de combustível? Atualize em massa os gastos de combustível e lucros líquidos de todos os seus turnos anteriores com base no odômetro real percorrido.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setShowRecalculateModal(true)}
          className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black px-4 py-2.5 rounded-xl text-xs flex items-center gap-2 shadow-lg shadow-emerald-500/20 active:scale-95 transition whitespace-nowrap self-stretch sm:self-auto justify-center"
        >
          <RefreshCw className="w-4 h-4" />
          <span>Abrir Recalculador</span>
        </button>
      </div>

      {/* MANUTENÇÕES & ALERTAS PREVENTIVOS (SECTION 15) */}
      <div className="bg-white/5 backdrop-blur-lg border border-white/10 p-5 rounded-2xl space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-black text-white uppercase tracking-wider flex items-center gap-2">
              <Wrench className="w-4 h-4 text-emerald-400" />
              PLANO DE MANUTENÇÃO & REVISÕES
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Histórico preventivo com alertas automáticos por quilometragem.
            </p>
          </div>

          <button
            onClick={() => setShowAddMaintModal(true)}
            className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black px-3.5 py-1.5 rounded-xl text-xs flex items-center gap-1 shadow-lg shadow-emerald-500/20"
          >
            <Plus className="w-3.5 h-3.5" /> Registrar Serviço
          </button>
        </div>

        {maintenances.length === 0 ? (
          <div className="text-center py-6 text-slate-400 text-xs bg-white/5 rounded-2xl border border-white/5">
            Nenhuma manutenção registrada ainda. Clique em "Registrar Serviço" para acompanhar revisões e trocas de óleo.
          </div>
        ) : (
          <div className="space-y-2.5">
            {maintenances.map(m => {
              const remainingKm = m.nextOdometer ? m.nextOdometer - vehicle.currentOdometer : null;
              const isClose = remainingKm !== null && remainingKm <= 1000 && remainingKm > 0;
              const isOverdue = remainingKm !== null && remainingKm <= 0;

              return (
                <div
                  key={m.id}
                  className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3.5 rounded-xl bg-white/5 border border-white/5 hover:border-white/15 transition"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center shrink-0">
                      <Wrench className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-slate-200 flex items-center gap-2">
                        {m.category}
                        <span className="text-[10px] text-slate-400 font-normal">({m.date})</span>
                      </div>
                      <div className="text-[11px] text-slate-400">
                        {m.description} • Realizada com <strong>{formatKm(m.odometer)}</strong>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 self-end sm:self-auto">
                    {m.nextOdometer && (
                      <div className="text-right">
                        <span className="text-[10px] text-slate-400 block">Próxima em: {formatKm(m.nextOdometer)}</span>
                        {isOverdue && (
                          <span className="text-[9px] font-black text-rose-400 bg-rose-500/20 px-1.5 py-0.5 rounded border border-rose-500/30">
                            VENCIDA ({Math.abs(remainingKm!)} km atrás)
                          </span>
                        )}
                        {isClose && (
                          <span className="text-[9px] font-black text-amber-400 bg-amber-500/20 px-1.5 py-0.5 rounded border border-amber-500/30">
                            ALERTA: faltam {remainingKm} km
                          </span>
                        )}
                        {!isOverdue && !isClose && remainingKm !== null && (
                          <span className="text-[9px] font-bold text-emerald-400">
                            OK (faltam {remainingKm} km)
                          </span>
                        )}
                      </div>
                    )}

                    <div className="text-right min-w-[70px]">
                      <div className="text-xs font-black text-slate-200">{formatCurrency(m.amount)}</div>
                    </div>

                    <button
                      onClick={() => deleteMaintenance(m.id)}
                      className="text-slate-500 hover:text-rose-400 p-1 text-xs"
                      title="Excluir Registro"
                    >
                      ✕
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* MODAL PARA REGISTRAR MANUTENÇÃO */}
      {showAddMaintModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
          <div className="bg-slate-900 border border-white/15 rounded-3xl w-full max-w-md p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-black text-white">Registrar Serviço / Revisão</h3>
              <button onClick={() => setShowAddMaintModal(false)} className="text-slate-400 hover:text-white p-1">
                ✕
              </button>
            </div>

            <form onSubmit={handleAddMaint} className="space-y-3.5">
              <div>
                <label className="text-[11px] font-bold text-slate-400 uppercase block mb-1">Categoria</label>
                <select
                  value={mCategory}
                  onChange={e => setMCategory(e.target.value as MaintenanceCategory)}
                  className="w-full bg-black/40 border border-white/15 rounded-xl px-3 py-2 text-xs text-white"
                >
                  <option value="Troca de Óleo">Troca de Óleo & Filtros</option>
                  <option value="Freios">Pastilhas & Discos de Freio</option>
                  <option value="Pneus">Troca ou Rodízio de Pneus</option>
                  <option value="Bateria">Bateria</option>
                  <option value="Suspensão">Suspensão & Amortecedores</option>
                  <option value="Alinhamento">Alinhamento & Balanceamento</option>
                  <option value="Revisão Periódica">Revisão Periódica</option>
                  <option value="Outros">Outros</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-bold text-slate-400 uppercase block mb-1">Valor Gasto (R$)</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={mAmount}
                    onChange={e => setMAmount(e.target.value)}
                    className="w-full bg-black/40 border border-white/15 rounded-xl px-3 py-2 text-sm text-emerald-400 font-bold"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-slate-400 uppercase block mb-1">KM da Realização</label>
                  <input
                    type="number"
                    value={mOdo}
                    onChange={e => {
                      setMOdo(e.target.value);
                      const c = parseInt(e.target.value) || 0;
                      setMNextOdo((c + 10000).toString());
                    }}
                    className="w-full bg-black/40 border border-white/15 rounded-xl px-3 py-2 text-sm text-white"
                  />
                </div>
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-400 uppercase block mb-1">Próxima Revisão em (KM)</label>
                <input
                  type="number"
                  value={mNextOdo}
                  onChange={e => setMNextOdo(e.target.value)}
                  className="w-full bg-black/40 border border-white/15 rounded-xl px-3 py-2 text-sm text-amber-300 font-bold"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-400 uppercase block mb-1">Descrição</label>
                <input
                  type="text"
                  value={mDesc}
                  onChange={e => setMDesc(e.target.value)}
                  placeholder="Ex: Óleo 5W30 + Filtros trocados na oficina"
                  className="w-full bg-black/40 border border-white/15 rounded-xl px-3 py-2 text-xs text-white"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddMaintModal(false)}
                  className="px-3 py-2 rounded-xl text-xs font-bold text-slate-400 hover:text-white"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black px-4 py-2 rounded-xl text-xs shadow-lg shadow-emerald-500/20"
                >
                  Salvar Revisão
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL DE CATÁLOGO TÉCNICO DO VEÍCULO */}
      <VehicleSpecsModal
        isOpen={showSpecsModal}
        onClose={() => setShowSpecsModal(false)}
        onApplySpec={handleApplySpecFromCatalog}
      />

      {/* MODAL DE RECÁLCULO DE LANÇAMENTOS DO VEÍCULO */}
      <RecalculateRecordsModal
        isOpen={showRecalculateModal}
        onClose={() => setShowRecalculateModal(false)}
      />
    </div>
  );
};
