import React, { useState } from 'react';
import { useDriver } from '../context/DriverContext';
import { DriverStrategy, StrategyCategory } from '../types';
import { formatCurrency } from '../utils/calc';
import { StrategyCreatorModal } from './StrategyCreatorModal';
import {
  Sparkles,
  Plus,
  Zap,
  Target,
  Clock,
  Car,
  ShieldCheck,
  Fuel,
  Calendar,
  Check,
  Edit2,
  Copy,
  Trash2,
  ChevronDown,
  ChevronUp,
  Layers,
  ArrowRight,
  TrendingUp,
  DollarSign,
  AlertTriangle,
  RotateCcw,
  CheckCircle2,
  Share2,
} from 'lucide-react';

interface StrategyBuilderCardProps {
  onNavigateToPlanner?: () => void;
}

export const StrategyBuilderCard: React.FC<StrategyBuilderCardProps> = ({ onNavigateToPlanner }) => {
  const {
    strategies,
    activeStrategy,
    activateStrategy,
    deleteStrategy,
    createStrategy,
    resetStrategiesToDefault,
    vehicle,
    profile,
  } = useDriver();

  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [expandedStrategyId, setExpandedStrategyId] = useState<string | null>(null);
  const [showCreatorModal, setShowCreatorModal] = useState(false);
  const [strategyToEdit, setStrategyToEdit] = useState<DriverStrategy | null>(null);
  const [appliedToast, setAppliedToast] = useState<string | null>(null);

  const categories: Array<{ id: string; label: string; count: number }> = [
    { id: 'all', label: 'Todas as Estratégias', count: strategies.length },
    { id: 'hybrid', label: 'Híbridas (99 + Uber)', count: strategies.filter(s => s.category === 'hybrid').length },
    { id: 'weekend', label: 'Fim de Semana', count: strategies.filter(s => s.category === 'weekend').length },
    { id: 'missions', label: 'Missões Uber', count: strategies.filter(s => s.category === 'missions').length },
    { id: 'peak_hours', label: 'Pico & Aeroporto', count: strategies.filter(s => s.category === 'peak_hours').length },
    { id: 'night_shift', label: 'Madrugada', count: strategies.filter(s => s.category === 'night_shift').length },
    { id: 'custom', label: 'Minhas Personalizadas', count: strategies.filter(s => !s.isPreset || s.category === 'custom').length },
  ];

  const filteredStrategies = strategies.filter(s => {
    if (selectedCategory === 'all') return true;
    if (selectedCategory === 'custom') return !s.isPreset || s.category === 'custom';
    return s.category === selectedCategory;
  });

  const handleActivate = (id: string, applySchedule: boolean = false) => {
    activateStrategy(id, applySchedule);
    setAppliedToast(applySchedule ? 'Estratégia ativada e escala semanal aplicada ao Planejador!' : 'Estratégia ativada com sucesso!');
    setTimeout(() => setAppliedToast(null), 3500);
  };

  const handleDuplicate = (strategy: DriverStrategy) => {
    const duplicated: Omit<DriverStrategy, 'id' | 'createdAt'> = {
      ...strategy,
      name: `${strategy.name} (Cópia)`,
      isPreset: false,
    };
    const created = createStrategy(duplicated);
    setStrategyToEdit(created);
    setShowCreatorModal(true);
  };

  const handleOpenEdit = (strat: DriverStrategy) => {
    setStrategyToEdit(strat);
    setShowCreatorModal(true);
  };

  const handleOpenCreate = () => {
    setStrategyToEdit(null);
    setShowCreatorModal(true);
  };

  // Projeções da estratégia ativa
  const currentActive = activeStrategy || strategies[0];
  const avgConsumption = vehicle.avgConsumption > 0 ? vehicle.avgConsumption : 11.5;
  const gasPrice = profile.gasPriceReference > 0 ? profile.gasPriceReference : 5.89;
  
  const calcStrategyFinancials = (strat: DriverStrategy) => {
    const estKm = Math.round(strat.targetWeeklyGross / Math.max(strat.acceptanceRules.minRateKm, 1));
    const fuelCost = Math.round((estKm / avgConsumption) * gasPrice);
    const maintCost = Math.round(estKm * (strat.fuelAndMaintenancePlan.reserveMaintenancePerKm || 0.15));
    const passCost = strat.passUsage.use99Pass ? strat.passUsage.passCost : 0;
    const totalCosts = fuelCost + maintCost + passCost;
    const netProfit = Math.max(strat.targetWeeklyGross - totalCosts, 0);
    const netPerHour = strat.targetWeeklyHours > 0 ? netProfit / strat.targetWeeklyHours : 0;
    const margin = strat.targetWeeklyGross > 0 ? (netProfit / strat.targetWeeklyGross) * 100 : 0;
    return { estKm, fuelCost, maintCost, passCost, totalCosts, netProfit, netPerHour, margin };
  };

  const activeFinancials = currentActive ? calcStrategyFinancials(currentActive) : null;

  return (
    <div className="space-y-6">
      
      {/* TOAST DE FEEDBACK */}
      {appliedToast && (
        <div className="p-4 bg-emerald-500 text-slate-950 rounded-2xl font-black text-xs flex items-center justify-between shadow-xl shadow-emerald-500/30 animate-in fade-in slide-in-from-top-4 duration-200">
          <div className="flex items-center gap-2.5">
            <CheckCircle2 className="w-5 h-5 shrink-0" />
            <span>{appliedToast}</span>
          </div>
          {onNavigateToPlanner && (
            <button
              type="button"
              onClick={onNavigateToPlanner}
              className="px-3 py-1 bg-slate-950 text-emerald-400 rounded-xl text-[11px] font-black hover:bg-slate-900 transition flex items-center gap-1 shrink-0 ml-2"
            >
              Ver no Planner
              <ArrowRight className="w-3 h-3" />
            </button>
          )}
        </div>
      )}

      {/* BANNER PRINCIPAL DO CONSTRUTOR DE ESTRATÉGIAS */}
      <div className="bg-gradient-to-br from-emerald-950/50 via-slate-900 to-teal-950/40 border border-emerald-500/25 p-5 sm:p-6 rounded-3xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-emerald-500 to-teal-400 text-slate-950 flex items-center justify-center font-black shadow-lg shadow-emerald-500/25 shrink-0">
              <Sparkles className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-lg font-black text-white tracking-tight">
                  CENTRO DE ESTRATÉGIAS & PLAYBOOK
                </h3>
                <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[10px] font-black uppercase tracking-wider border border-emerald-500/30">
                  {strategies.length} Estratégias
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-0.5">
                Crie, simule e ative estratégias personalizadas combinando passes da 99, missões Uber e filtros de corrida.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto">
            <button
              type="button"
              onClick={handleOpenCreate}
              className="px-4 py-2.5 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-400 hover:from-emerald-400 hover:to-teal-300 text-slate-950 font-black text-xs transition shadow-lg shadow-emerald-500/25 flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              Criar Nova Estratégia
            </button>
            <button
              type="button"
              onClick={resetStrategiesToDefault}
              title="Restaurar Modelos de Fábrica"
              className="p-2.5 rounded-2xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition border border-white/5"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* CARD DA ESTRATÉGIA ATIVA */}
        {currentActive && activeFinancials && (
          <div className="bg-slate-950/70 border border-emerald-500/40 p-4 sm:p-5 rounded-2xl space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-white/10">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded-lg bg-emerald-500 text-slate-950 text-[10px] font-black flex items-center gap-1 uppercase tracking-wider">
                    <Zap className="w-3 h-3 fill-current" />
                    Estratégia Ativa no Momento
                  </span>
                  <span className="text-xs text-slate-400 font-medium">
                    {currentActive.isPreset ? 'Modelo Oficial' : 'Personalizada'}
                  </span>
                </div>
                <h4 className="text-base font-black text-white">{currentActive.name}</h4>
                <p className="text-xs text-emerald-300/90">{currentActive.tagline}</p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleActivate(currentActive.id, true)}
                  className="px-3.5 py-2 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 font-bold text-xs transition border border-emerald-500/30 flex items-center gap-1.5"
                >
                  <Calendar className="w-3.5 h-3.5" />
                  Sincronizar com Planejador
                </button>
                <button
                  type="button"
                  onClick={() => handleOpenEdit(currentActive)}
                  className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white transition"
                  title="Editar Parâmetros"
                >
                  <Edit2 className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* MÉTRICAS CHAVE DA ESTRATÉGIA ATIVA */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              <div className="bg-white/5 p-3 rounded-xl border border-white/5">
                <span className="text-[10px] text-slate-400 block font-medium">Faturamento Alvo</span>
                <span className="text-base font-black text-white">{formatCurrency(currentActive.targetWeeklyGross)}</span>
                <span className="text-[10px] text-slate-500 block mt-0.5">{currentActive.targetWeeklyHours}h semanais</span>
              </div>

              <div className="bg-white/5 p-3 rounded-xl border border-white/5">
                <span className="text-[10px] text-emerald-400 block font-medium">Lucro Líquido Real</span>
                <span className="text-base font-black text-emerald-400">{formatCurrency(activeFinancials.netProfit)}</span>
                <span className="text-[10px] text-emerald-300/70 block mt-0.5">Margem {activeFinancials.margin.toFixed(0)}%</span>
              </div>

              <div className="bg-white/5 p-3 rounded-xl border border-white/5">
                <span className="text-[10px] text-teal-400 block font-medium">Líquido por Hora</span>
                <span className="text-base font-black text-teal-300">{formatCurrency(activeFinancials.netPerHour)}/h</span>
                <span className="text-[10px] text-slate-400 block mt-0.5">~{currentActive.targetWeeklyTrips} viagens</span>
              </div>

              <div className="bg-white/5 p-3 rounded-xl border border-white/5">
                <span className="text-[10px] text-yellow-400 block font-medium">Filtro de Aceitação</span>
                <span className="text-base font-black text-yellow-300">Min. {formatCurrency(currentActive.acceptanceRules.minRateKm)}/km</span>
                <span className="text-[10px] text-slate-400 block mt-0.5">Min. {formatCurrency(currentActive.acceptanceRules.minRateHour)}/h</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* FILTRO DE CATEGORIAS */}
      <div className="flex items-center gap-1.5 overflow-x-auto custom-scrollbar pb-1">
        {categories.map(cat => (
          <button
            key={cat.id}
            type="button"
            onClick={() => setSelectedCategory(cat.id)}
            className={`px-3.5 py-2 rounded-2xl text-xs font-bold transition flex items-center gap-2 whitespace-nowrap ${
              selectedCategory === cat.id
                ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20 font-black'
                : 'bg-white/5 text-slate-400 hover:text-white hover:bg-white/10'
            }`}
          >
            <span>{cat.label}</span>
            <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${
              selectedCategory === cat.id ? 'bg-slate-950/20 text-slate-950 font-black' : 'bg-white/10 text-slate-400'
            }`}>
              {cat.count}
            </span>
          </button>
        ))}
      </div>

      {/* LISTAGEM DE ESTRATÉGIAS */}
      <div className="grid grid-cols-1 gap-4">
        {filteredStrategies.map(strat => {
          const isCurrentActive = activeStrategy?.id === strat.id;
          const isExpanded = expandedStrategyId === strat.id;
          const fin = calcStrategyFinancials(strat);

          return (
            <div
              key={strat.id}
              className={`bg-white/5 backdrop-blur-lg border rounded-3xl transition overflow-hidden ${
                isCurrentActive ? 'border-emerald-500/60 shadow-lg shadow-emerald-500/10' : 'border-white/10 hover:border-white/20'
              }`}
            >
              {/* CARD HEADER */}
              <div className="p-5 sm:p-6 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="px-2.5 py-0.5 rounded-full bg-white/10 text-slate-300 text-[10px] font-bold uppercase tracking-wider">
                        {strat.category.replace('_', ' ')}
                      </span>
                      {strat.passUsage.use99Pass && (
                        <span className="px-2.5 py-0.5 rounded-full bg-yellow-500/20 text-yellow-300 border border-yellow-500/30 text-[10px] font-black">
                          99 Taxa Zero ({strat.passUsage.pass99Type === 'time_7d' ? '7 Dias' : strat.passUsage.pass99Type === 'time_3d' ? '72h' : 'Passe'})
                        </span>
                      )}
                      {strat.passUsage.useUberMissions && (
                        <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[10px] font-black">
                          Uber {strat.passUsage.targetUberProTier.toUpperCase()}
                        </span>
                      )}
                      {isCurrentActive && (
                        <span className="px-2.5 py-0.5 rounded-full bg-emerald-500 text-slate-950 text-[10px] font-black flex items-center gap-1">
                          <Check className="w-3 h-3" />
                          ATIVA
                        </span>
                      )}
                    </div>

                    <h4 className="text-base sm:text-lg font-black text-white">{strat.name}</h4>
                    <p className="text-xs text-slate-400 max-w-2xl">{strat.tagline}</p>
                  </div>

                  {/* BOTÃO ATIVAR & AÇÕES */}
                  <div className="flex items-center gap-2 shrink-0">
                    {!isCurrentActive ? (
                      <button
                        type="button"
                        onClick={() => handleActivate(strat.id)}
                        className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs transition shadow-md shadow-emerald-500/20 flex items-center gap-1.5"
                      >
                        <Zap className="w-3.5 h-3.5 fill-current" />
                        Ativar Plano
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleActivate(strat.id, true)}
                        className="px-3.5 py-2 rounded-xl bg-emerald-500/20 text-emerald-300 font-bold text-xs transition border border-emerald-500/30 flex items-center gap-1.5"
                      >
                        <Calendar className="w-3.5 h-3.5" />
                        Aplicar ao Planner
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() => handleDuplicate(strat)}
                      title="Duplicar e Personalizar"
                      className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition"
                    >
                      <Copy className="w-4 h-4" />
                    </button>

                    <button
                      type="button"
                      onClick={() => handleOpenEdit(strat)}
                      title="Editar Estratégia"
                      className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>

                    {!strat.isPreset && (
                      <button
                        type="button"
                        onClick={() => deleteStrategy(strat.id)}
                        title="Excluir Estratégia"
                        className="p-2 rounded-xl bg-white/5 hover:bg-red-500/20 text-slate-400 hover:text-red-400 transition"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>

                {/* VISÃO RESUMIDA DE RENDIMENTOS */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs pt-1">
                  <div className="bg-black/30 p-2.5 rounded-2xl border border-white/5">
                    <span className="text-[10px] text-slate-400 block">Faturamento Alvo</span>
                    <span className="font-black text-white text-sm">{formatCurrency(strat.targetWeeklyGross)}</span>
                    <span className="text-[10px] text-slate-500 block">{strat.targetWeeklyHours}h / sem</span>
                  </div>

                  <div className="bg-black/30 p-2.5 rounded-2xl border border-white/5">
                    <span className="text-[10px] text-emerald-400 block font-bold">Lucro Líquido Real</span>
                    <span className="font-black text-emerald-400 text-sm">{formatCurrency(fin.netProfit)}</span>
                    <span className="text-[10px] text-emerald-400/80 block">Margem {fin.margin.toFixed(0)}%</span>
                  </div>

                  <div className="bg-black/30 p-2.5 rounded-2xl border border-white/5">
                    <span className="text-[10px] text-teal-400 block font-bold">Líquido / Hora</span>
                    <span className="font-black text-teal-300 text-sm">{formatCurrency(fin.netPerHour)}/h</span>
                    <span className="text-[10px] text-slate-400 block">~{strat.targetWeeklyTrips} viagens</span>
                  </div>

                  <div className="bg-black/30 p-2.5 rounded-2xl border border-white/5">
                    <span className="text-[10px] text-yellow-400 block font-bold">Regra de Aceitação</span>
                    <span className="font-black text-yellow-300 text-sm">Min. {formatCurrency(strat.acceptanceRules.minRateKm)}/km</span>
                    <span className="text-[10px] text-slate-400 block">Raio max {strat.acceptanceRules.maxPickupDistanceKm} km</span>
                  </div>
                </div>

                {/* BOTÃO EXPANDIR DETALHES */}
                <button
                  type="button"
                  onClick={() => setExpandedStrategyId(isExpanded ? null : strat.id)}
                  className="w-full pt-2 flex items-center justify-center gap-1 text-xs font-bold text-slate-400 hover:text-white transition"
                >
                  <span>{isExpanded ? 'Ocultar Playbook e Escala Semanal' : 'Ver Playbook Tático, Escala e Regras Completas'}</span>
                  {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </button>
              </div>

              {/* DETALHAMENTO EXPANSÍVEL (PLAYBOOK + ESCALA) */}
              {isExpanded && (
                <div className="p-5 sm:p-6 bg-slate-950/70 border-t border-white/10 space-y-5 animate-in fade-in duration-200">
                  
                  {/* PAPEL DE CADA APLICATIVO */}
                  <div className="space-y-2">
                    <h5 className="text-xs font-black text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                      <Layers className="w-4 h-4 text-emerald-400" />
                      Função Estratégica dos Aplicativos
                    </h5>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs">
                      {strat.platformStrategy.ninetyNineRole && (
                        <div className="bg-yellow-500/10 border border-yellow-500/20 p-3 rounded-2xl space-y-1">
                          <span className="font-bold text-yellow-300">🟡 99:</span>
                          <p className="text-slate-300 text-[11px] leading-relaxed">{strat.platformStrategy.ninetyNineRole}</p>
                        </div>
                      )}
                      {strat.platformStrategy.uberRole && (
                        <div className="bg-slate-800/60 border border-white/10 p-3 rounded-2xl space-y-1">
                          <span className="font-bold text-white">⚫ Uber:</span>
                          <p className="text-slate-300 text-[11px] leading-relaxed">{strat.platformStrategy.uberRole}</p>
                        </div>
                      )}
                      {strat.platformStrategy.inDriveRole && (
                        <div className="bg-emerald-950/30 border border-emerald-500/20 p-3 rounded-2xl space-y-1 sm:col-span-2">
                          <span className="font-bold text-emerald-300">🟢 inDrive & Outros:</span>
                          <p className="text-slate-300 text-[11px] leading-relaxed">{strat.platformStrategy.inDriveRole}</p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* ESCALA SEMANAL SUGERIDA */}
                  {strat.workingWindows && strat.workingWindows.length > 0 && (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <h5 className="text-xs font-black text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                          <Calendar className="w-4 h-4 text-teal-400" />
                          Escala Semanal & Polos de Posicionamento
                        </h5>
                        <button
                          type="button"
                          onClick={() => handleActivate(strat.id, true)}
                          className="text-[11px] font-bold text-emerald-400 hover:text-emerald-300 flex items-center gap-1"
                        >
                          Aplicar ao Planner
                          <ArrowRight className="w-3 h-3" />
                        </button>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                        {strat.workingWindows.map((win, idx) => (
                          <div key={idx} className="bg-black/40 border border-white/5 p-3 rounded-2xl text-xs space-y-1">
                            <div className="flex items-center justify-between font-bold">
                              <span className="text-white">{win.dayLabel}</span>
                              <span className="text-emerald-400">{formatCurrency(win.targetDailyEarnings)}</span>
                            </div>
                            <div className="text-[11px] text-slate-400 flex items-center justify-between">
                              <span>⏰ {win.startTime} às {win.endTime}</span>
                              <span className="text-teal-300 font-bold">{win.recommendedApp}</span>
                            </div>
                            <div className="text-[10px] text-slate-400 truncate pt-0.5">
                              📍 {win.focusArea}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* PLAYBOOK TÁTICO: O QUE FAZER VS O QUE EVITAR */}
                  {strat.tacticalPlaybook && strat.tacticalPlaybook.length > 0 && (
                    <div className="space-y-2">
                      <h5 className="text-xs font-black text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                        <ShieldCheck className="w-4 h-4 text-emerald-400" />
                        Instruções Táticas de Campo
                      </h5>
                      <div className="space-y-2.5">
                        {strat.tacticalPlaybook.map((tac, idx) => (
                          <div key={idx} className="bg-black/40 border border-white/5 p-3.5 rounded-2xl space-y-2 text-xs">
                            <div className="font-bold text-white flex items-center gap-2">
                              <span className="w-5 h-5 rounded-lg bg-emerald-500/20 text-emerald-400 font-black text-[10px] flex items-center justify-center">
                                {idx + 1}
                              </span>
                              <span>{tac.title}</span>
                            </div>
                            <p className="text-slate-300 text-[11px] leading-relaxed pl-7">{tac.tip}</p>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pl-7 pt-1">
                              <div className="bg-emerald-950/40 border border-emerald-500/20 p-2 rounded-xl text-[11px] text-emerald-200">
                                <span className="font-bold text-emerald-400 block mb-0.5">✅ O que fazer:</span>
                                {tac.doText}
                              </div>
                              <div className="bg-red-950/40 border border-red-500/20 p-2 rounded-xl text-[11px] text-red-200">
                                <span className="font-bold text-red-400 block mb-0.5">❌ O que evitar:</span>
                                {tac.dontText}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* COMBUSTÍVEL & MANUTENÇÃO */}
                  <div className="bg-white/5 p-3.5 rounded-2xl text-xs space-y-1.5 border border-white/5">
                    <span className="font-bold text-slate-300 flex items-center gap-1.5">
                      <Fuel className="w-4 h-4 text-teal-400" />
                      Combustível & Manutenção Recomendados
                    </span>
                    <p className="text-[11px] text-slate-400">
                      Combustível: <span className="text-white font-bold">{strat.fuelAndMaintenancePlan.fuelChoice}</span> | Reserva Manutenção: <span className="text-emerald-400 font-bold">{formatCurrency(strat.fuelAndMaintenancePlan.reserveMaintenancePerKm)}/km</span>
                    </p>
                    <p className="text-[11px] text-teal-300">
                      💡 {strat.fuelAndMaintenancePlan.stationCashbackTip}
                    </p>
                  </div>

                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* MODAL DE CRIAÇÃO / EDIÇÃO */}
      <StrategyCreatorModal
        isOpen={showCreatorModal}
        onClose={() => {
          setShowCreatorModal(false);
          setStrategyToEdit(null);
        }}
        strategyToEdit={strategyToEdit}
        onSaveSuccess={(saved) => {
          setAppliedToast(`Estratégia "${saved.name}" salva com sucesso!`);
          setTimeout(() => setAppliedToast(null), 3500);
        }}
      />

    </div>
  );
};
