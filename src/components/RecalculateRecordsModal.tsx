import React, { useState, useMemo } from 'react';
import { useDriver } from '../context/DriverContext';
import {
  previewRecalculateSessions,
  formatCurrency,
  formatKm,
  RecalculationOptions,
} from '../utils/calc';
import {
  Calculator,
  Car,
  Fuel,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  TrendingUp,
  TrendingDown,
  Calendar,
  Layers,
  Sparkles,
  DollarSign,
  Wrench,
  Check,
  X,
  Info,
} from 'lucide-react';

export interface RecalculateRecordsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export const RecalculateRecordsModal: React.FC<RecalculateRecordsModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const {
    vehicle,
    profile,
    sessions,
    recalculateSessionsWithVehicleData,
  } = useDriver();

  // Estados dos parâmetros de cálculo
  const [avgConsumption, setAvgConsumption] = useState<string>(
    (vehicle.avgConsumption || 12.0).toString()
  );
  const [gasPrice, setGasPrice] = useState<string>(
    (profile.gasPriceReference || 5.89).toString()
  );
  const [maintenanceRate, setMaintenanceRate] = useState<string>('0.15');
  const [includeMaintenance, setIncludeMaintenance] = useState<boolean>(false);
  const [dateFilter, setDateFilter] = useState<'all' | '7days' | '30days' | 'current_month' | 'last_month'>('all');
  
  // Lista de sessões selecionadas manualmente
  const [selectedSessionIds, setSelectedSessionIds] = useState<string[]>([]);
  const [hasCustomSelection, setHasCustomSelection] = useState<boolean>(false);

  // Status de execução
  const [isApplying, setIsApplying] = useState(false);
  const [appliedResult, setAppliedResult] = useState<{
    count: number;
    deltaFuel: number;
    newFuelTotal: number;
  } | null>(null);

  // Simulação / Prévia em tempo real
  const options: RecalculationOptions = useMemo(() => ({
    avgConsumption: parseFloat(avgConsumption) || vehicle.avgConsumption || 11.5,
    gasPrice: parseFloat(gasPrice) || profile.gasPriceReference || 5.89,
    maintenanceRate: parseFloat(maintenanceRate) || 0.15,
    includeMaintenance,
    dateFilter,
    sessionIds: hasCustomSelection ? selectedSessionIds : undefined,
  }), [avgConsumption, gasPrice, maintenanceRate, includeMaintenance, dateFilter, hasCustomSelection, selectedSessionIds, vehicle.avgConsumption, profile.gasPriceReference]);

  const summary = useMemo(() => {
    return previewRecalculateSessions(sessions, vehicle, options);
  }, [sessions, vehicle, options]);

  // Se trocar de filtro de data, reseta seleção manual
  const handleDateFilterChange = (filter: 'all' | '7days' | '30days' | 'current_month' | 'last_month') => {
    setDateFilter(filter);
    setHasCustomSelection(false);
    setSelectedSessionIds([]);
  };

  const handleToggleSession = (id: string) => {
    if (!hasCustomSelection) {
      // Primeira personalização: seleciona todos exceto o clicado
      const allIds = summary.items.map(i => i.sessionId);
      setSelectedSessionIds(allIds.filter(sid => sid !== id));
      setHasCustomSelection(true);
    } else {
      if (selectedSessionIds.includes(id)) {
        setSelectedSessionIds(prev => prev.filter(sid => sid !== id));
      } else {
        setSelectedSessionIds(prev => [...prev, id]);
      }
    }
  };

  const handleSelectAll = () => {
    setHasCustomSelection(false);
    setSelectedSessionIds([]);
  };

  const handleResetToDefaults = () => {
    setAvgConsumption((vehicle.avgConsumption || 12.0).toString());
    setGasPrice((profile.gasPriceReference || 5.89).toString());
    setMaintenanceRate('0.15');
    setIncludeMaintenance(false);
    setDateFilter('all');
    setHasCustomSelection(false);
    setSelectedSessionIds([]);
  };

  const handleExecuteRecalculate = () => {
    setIsApplying(true);
    setTimeout(() => {
      const res = recalculateSessionsWithVehicleData(options);
      setIsApplying(false);
      setAppliedResult({
        count: res.totalSessions,
        deltaFuel: res.deltaTotalFuel,
        newFuelTotal: res.newTotalFuel,
      });
      if (onSuccess) onSuccess();
    }, 400);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-md overflow-y-auto">
      <div className="bg-slate-900 border border-white/15 rounded-3xl w-full max-w-3xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden my-auto animate-in fade-in zoom-in-95 duration-200">
        
        {/* HEADER */}
        <div className="p-5 sm:p-6 border-b border-white/10 flex items-start justify-between gap-4 bg-white/5">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-emerald-500 to-teal-400 text-slate-950 flex items-center justify-center font-black shrink-0 shadow-lg shadow-emerald-500/20">
              <Calculator className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black text-white flex items-center gap-2">
                RECALCULAR LANÇAMENTOS COM DADOS DO VEÍCULO
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Atualize o combustível e custos reais dos turnos anteriores utilizando as especificações do seu carro.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* CORPO MODAL COM ROLAGEM */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-6">

          {/* SUCESSO APÓS APLICAÇÃO */}
          {appliedResult ? (
            <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-2xl p-6 text-center space-y-4 animate-in fade-in duration-300">
              <div className="w-16 h-16 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto ring-8 ring-emerald-500/10">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <div>
                <h3 className="text-lg font-black text-white">Recálculo Concluído com Sucesso!</h3>
                <p className="text-xs text-slate-300 mt-1 max-w-md mx-auto">
                  <strong>{appliedResult.count}</strong> expedientes foram recalculados com base no consumo de <strong>{avgConsumption} km/L</strong> e combustível a <strong>{formatCurrency(parseFloat(gasPrice) || 5.89)}</strong>.
                </p>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 max-w-md mx-auto text-xs pt-2">
                <div className="bg-black/30 p-3 rounded-xl border border-white/10">
                  <span className="text-[10px] text-slate-400 block uppercase font-bold">Turnos Atualizados</span>
                  <strong className="text-base text-white font-black mt-0.5 block">{appliedResult.count}</strong>
                </div>
                <div className="bg-black/30 p-3 rounded-xl border border-white/10">
                  <span className="text-[10px] text-slate-400 block uppercase font-bold">Novo Gasto Combustível</span>
                  <strong className="text-base text-emerald-400 font-black mt-0.5 block">{formatCurrency(appliedResult.newFuelTotal)}</strong>
                </div>
                <div className="bg-black/30 p-3 rounded-xl border border-white/10 col-span-2 sm:col-span-1">
                  <span className="text-[10px] text-slate-400 block uppercase font-bold">Variação no Custo</span>
                  <strong className={`text-base font-black mt-0.5 block ${appliedResult.deltaFuel <= 0 ? 'text-emerald-400' : 'text-amber-400'}`}>
                    {appliedResult.deltaFuel <= 0 ? `- ${formatCurrency(Math.abs(appliedResult.deltaFuel))}` : `+ ${formatCurrency(appliedResult.deltaFuel)}`}
                  </strong>
                </div>
              </div>

              <div className="pt-4 flex justify-center gap-3">
                <button
                  onClick={() => setAppliedResult(null)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-300 hover:text-white bg-white/10 hover:bg-white/15 transition"
                >
                  Recalcular Novamente
                </button>
                <button
                  onClick={onClose}
                  className="px-6 py-2 rounded-xl text-xs font-black text-slate-950 bg-emerald-500 hover:bg-emerald-400 transition shadow-lg shadow-emerald-500/20"
                >
                  Fechar e Ver Relatórios
                </button>
              </div>
            </div>
          ) : (
            <>
              {/* CARD DE PARÂMETROS DO VEÍCULO */}
              <div className="bg-white/5 p-4 sm:p-5 rounded-2xl border border-white/10 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-white/10 pb-3">
                  <div className="flex items-center gap-2">
                    <Car className="w-4 h-4 text-emerald-400" />
                    <span className="text-xs font-black text-white uppercase tracking-wider">
                      Veículo: {vehicle.make} {vehicle.model} ({vehicle.year})
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={handleResetToDefaults}
                    className="text-[11px] text-slate-400 hover:text-emerald-400 flex items-center gap-1 font-bold"
                  >
                    <RefreshCw className="w-3 h-3" /> Restaurar Padrões da Ficha
                  </button>
                </div>

                {/* INPUTS DE PARÂMETROS */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1 flex items-center justify-between">
                      <span>Consumo Médio (km/L)</span>
                      <span className="text-emerald-400 font-normal">Ficha: {vehicle.avgConsumption} km/L</span>
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        step="0.1"
                        min="1"
                        value={avgConsumption}
                        onChange={e => setAvgConsumption(e.target.value)}
                        className="w-full bg-black/40 border border-white/15 rounded-xl px-3 py-2 text-sm text-emerald-400 font-bold focus:outline-none focus:border-emerald-500"
                      />
                      <span className="absolute right-3 top-2.5 text-xs text-slate-500">km/L</span>
                    </div>
                  </div>

                  <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1 flex items-center justify-between">
                      <span>Preço Combustível (R$/L)</span>
                      <span className="text-amber-300 font-normal">Ref: {formatCurrency(profile.gasPriceReference)}</span>
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        step="0.01"
                        min="0.1"
                        value={gasPrice}
                        onChange={e => setGasPrice(e.target.value)}
                        className="w-full bg-black/40 border border-white/15 rounded-xl px-3 py-2 text-sm text-amber-300 font-bold focus:outline-none focus:border-amber-500"
                      />
                      <span className="absolute right-3 top-2.5 text-xs text-slate-500">R$/L</span>
                    </div>
                  </div>

                  <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1 flex items-center justify-between">
                      <span>Reserva Manutenção / KM</span>
                      <span className="text-teal-400 font-normal">Óleo/Pneus/Pastilha</span>
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={maintenanceRate}
                        onChange={e => setMaintenanceRate(e.target.value)}
                        className="w-full bg-black/40 border border-white/15 rounded-xl px-3 py-2 text-sm text-teal-400 font-bold focus:outline-none focus:border-teal-500"
                      />
                      <span className="absolute right-3 top-2.5 text-xs text-slate-500">R$/km</span>
                    </div>
                  </div>
                </div>

                {/* OPÇÕES ADICIONAIS */}
                <div className="pt-2 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs border-t border-white/5">
                  <label className="flex items-center gap-2 cursor-pointer text-slate-300 hover:text-white">
                    <input
                      type="checkbox"
                      checked={includeMaintenance}
                      onChange={e => setIncludeMaintenance(e.target.checked)}
                      className="w-4 h-4 rounded text-emerald-500 focus:ring-emerald-500 bg-black/40 border-white/20"
                    />
                    <span>Incluir reserva de manutenção (R$ {maintenanceRate}/km) como custo direto no expediente</span>
                  </label>

                  <div className="text-[11px] text-slate-400">
                    Fórmula: <code className="bg-black/30 px-1.5 py-0.5 rounded text-emerald-300">(KM ÷ {avgConsumption}) × R$ {gasPrice}</code>
                  </div>
                </div>
              </div>

              {/* FILTRO DE PERÍODO */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <span className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-emerald-400" />
                  Período dos Lançamentos a Recalcular:
                </span>

                <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
                  <button
                    type="button"
                    onClick={() => handleDateFilterChange('all')}
                    className={`px-3 py-1 rounded-xl text-xs font-bold transition whitespace-nowrap ${
                      dateFilter === 'all'
                        ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20'
                        : 'bg-white/5 text-slate-400 hover:text-slate-200 border border-white/10'
                    }`}
                  >
                    Todo o Histórico
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDateFilterChange('current_month')}
                    className={`px-3 py-1 rounded-xl text-xs font-bold transition whitespace-nowrap ${
                      dateFilter === 'current_month'
                        ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20'
                        : 'bg-white/5 text-slate-400 hover:text-slate-200 border border-white/10'
                    }`}
                  >
                    Mês Atual
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDateFilterChange('last_month')}
                    className={`px-3 py-1 rounded-xl text-xs font-bold transition whitespace-nowrap ${
                      dateFilter === 'last_month'
                        ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20'
                        : 'bg-white/5 text-slate-400 hover:text-slate-200 border border-white/10'
                    }`}
                  >
                    Mês Anterior
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDateFilterChange('30days')}
                    className={`px-3 py-1 rounded-xl text-xs font-bold transition whitespace-nowrap ${
                      dateFilter === '30days'
                        ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20'
                        : 'bg-white/5 text-slate-400 hover:text-slate-200 border border-white/10'
                    }`}
                  >
                    Últimos 30 Dias
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDateFilterChange('7days')}
                    className={`px-3 py-1 rounded-xl text-xs font-bold transition whitespace-nowrap ${
                      dateFilter === '7days'
                        ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20'
                        : 'bg-white/5 text-slate-400 hover:text-slate-200 border border-white/10'
                    }`}
                  >
                    Últimos 7 Dias
                  </button>
                </div>
              </div>

              {/* CARDS DE SIMULAÇÃO ANTES VS DEPOIS */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="bg-white/5 p-4 rounded-2xl border border-white/10">
                  <span className="text-[10px] font-bold text-slate-400 uppercase block">Lançamentos</span>
                  <div className="text-xl font-black text-white mt-1 flex items-baseline gap-1">
                    {summary.totalSessions}
                    <span className="text-[11px] text-slate-400 font-normal">turnos</span>
                  </div>
                  <span className="text-[10px] text-slate-500 block mt-0.5">{formatKm(summary.totalKm)} rodados</span>
                </div>

                <div className="bg-white/5 p-4 rounded-2xl border border-white/10">
                  <span className="text-[10px] font-bold text-slate-400 uppercase block">Gasto Combustível</span>
                  <div className="text-xl font-black text-amber-300 mt-1">
                    {formatCurrency(summary.newTotalFuel)}
                  </div>
                  <div className="text-[10px] flex items-center gap-1 mt-0.5 text-slate-400">
                    <span>Antes: {formatCurrency(summary.oldTotalFuel)}</span>
                  </div>
                </div>

                <div className="bg-white/5 p-4 rounded-2xl border border-white/10">
                  <span className="text-[10px] font-bold text-slate-400 uppercase block">Lucro Líquido Real</span>
                  <div className="text-xl font-black text-emerald-400 mt-1">
                    {formatCurrency(summary.newTotalNet)}
                  </div>
                  <div className={`text-[10px] flex items-center gap-1 mt-0.5 font-bold ${summary.deltaTotalNet >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {summary.deltaTotalNet >= 0 ? (
                      <>
                        <TrendingUp className="w-3 h-3" />
                        <span>+ {formatCurrency(summary.deltaTotalNet)}</span>
                      </>
                    ) : (
                      <>
                        <TrendingDown className="w-3 h-3" />
                        <span>- {formatCurrency(Math.abs(summary.deltaTotalNet))}</span>
                      </>
                    )}
                  </div>
                </div>

                <div className="bg-white/5 p-4 rounded-2xl border border-white/10">
                  <span className="text-[10px] font-bold text-slate-400 uppercase block">Custo Direto / KM</span>
                  <div className="text-xl font-black text-teal-300 mt-1">
                    {formatCurrency(summary.newAvgCostPerKm)}/km
                  </div>
                  <span className="text-[10px] text-slate-500 block mt-0.5">
                    Antes: {formatCurrency(summary.oldAvgCostPerKm)}/km
                  </span>
                </div>
              </div>

              {/* LISTA / PRÉVIA DETALHADA DOS LANÇAMENTOS */}
              <div className="bg-black/30 rounded-2xl border border-white/10 overflow-hidden space-y-2 p-4">
                <div className="flex items-center justify-between text-xs pb-2 border-b border-white/10">
                  <span className="font-bold text-slate-300 uppercase flex items-center gap-1.5">
                    <Layers className="w-3.5 h-3.5 text-emerald-400" />
                    Prévia dos Expedientes Selecionados ({summary.items.length})
                  </span>

                  {hasCustomSelection && (
                    <button
                      type="button"
                      onClick={handleSelectAll}
                      className="text-emerald-400 hover:underline text-[11px] font-bold"
                    >
                      Selecionar Todos
                    </button>
                  )}
                </div>

                {summary.items.length === 0 ? (
                  <div className="text-center py-6 text-xs text-slate-400">
                    Nenhum turno finalizado encontrado no período selecionado.
                  </div>
                ) : (
                  <div className="max-h-56 overflow-y-auto space-y-1.5 pr-1 divide-y divide-white/5">
                    {summary.items.map(item => {
                      const isSelected = !hasCustomSelection || selectedSessionIds.includes(item.sessionId);

                      return (
                        <div
                          key={item.sessionId}
                          onClick={() => handleToggleSession(item.sessionId)}
                          className={`flex items-center justify-between p-2 rounded-xl text-xs transition cursor-pointer ${
                            isSelected
                              ? 'bg-white/5 hover:bg-white/10 text-white'
                              : 'opacity-40 hover:opacity-70 bg-transparent text-slate-400'
                          }`}
                        >
                          <div className="flex items-center gap-2.5">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => {}}
                              className="w-3.5 h-3.5 rounded text-emerald-500 pointer-events-none"
                            />
                            <div>
                              <div className="font-bold flex items-center gap-2">
                                <span>{item.date}</span>
                                <span className="text-[10px] text-slate-400 font-normal">
                                  ({formatKm(item.kmDriven)} • {item.tripsCount} corridas)
                                </span>
                              </div>
                              <div className="text-[10px] text-slate-400">
                                Bruto: {formatCurrency(item.grossEarnings + item.tips)}
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-4 text-right">
                            <div>
                              <span className="text-[10px] text-slate-400 block">Combustível</span>
                              <div className="font-mono font-bold flex items-center gap-1 justify-end">
                                <span className="text-slate-400 line-through text-[10px]">
                                  {formatCurrency(item.oldFuelExpenses)}
                                </span>
                                <ArrowRight className="w-2.5 h-2.5 text-slate-500" />
                                <span className="text-amber-300">
                                  {formatCurrency(item.newFuelExpenses)}
                                </span>
                              </div>
                            </div>

                            <div className="min-w-[80px]">
                              <span className="text-[10px] text-slate-400 block">Líquido</span>
                              <div className="font-mono font-bold text-emerald-400">
                                {formatCurrency(item.newNet)}
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </>
          )}

        </div>

        {/* FOOTER COM BOTÕES */}
        {!appliedResult && (
          <div className="p-4 sm:p-5 border-t border-white/10 bg-white/5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-xs text-slate-400">
              <Info className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>
                Esta ação atualizará <strong>{summary.totalSessions} expedientes</strong> e sincronizará o Planejador.
              </span>
            </div>

            <div className="flex items-center gap-2 justify-end">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-400 hover:text-white transition"
              >
                Cancelar
              </button>

              <button
                type="button"
                disabled={summary.totalSessions === 0 || isApplying}
                onClick={handleExecuteRecalculate}
                className="bg-gradient-to-r from-emerald-500 to-teal-400 hover:from-emerald-400 hover:to-teal-300 text-slate-950 font-black px-6 py-2.5 rounded-xl text-xs flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/25 active:scale-95 transition disabled:opacity-50 disabled:pointer-events-none"
              >
                {isApplying ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Recalculando...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    <span>Recalcular {summary.totalSessions} Lançamentos</span>
                  </>
                )}
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};
