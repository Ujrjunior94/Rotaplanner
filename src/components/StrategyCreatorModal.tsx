import React, { useState, useEffect } from 'react';
import { DriverStrategy, PlatformType, StrategyCategory, StrategyWorkingWindow } from '../types';
import { useDriver } from '../context/DriverContext';
import { formatCurrency } from '../utils/calc';
import {
  X,
  Sparkles,
  Target,
  Clock,
  Car,
  Fuel,
  ShieldCheck,
  Calendar,
  Layers,
  ChevronRight,
  Plus,
  Trash2,
  Check,
  AlertCircle,
  Zap,
  DollarSign,
  TrendingUp,
} from 'lucide-react';

interface StrategyCreatorModalProps {
  isOpen: boolean;
  onClose: () => void;
  strategyToEdit?: DriverStrategy | null;
  onSaveSuccess?: (savedStrategy: DriverStrategy) => void;
}

export const StrategyCreatorModal: React.FC<StrategyCreatorModalProps> = ({
  isOpen,
  onClose,
  strategyToEdit,
  onSaveSuccess,
}) => {
  const { createStrategy, updateStrategy, vehicle, profile } = useDriver();

  const [activeStep, setActiveStep] = useState<'basics' | 'apps' | 'rules' | 'schedule' | 'tactics'>('basics');

  // Form State
  const [name, setName] = useState('');
  const [tagline, setTagline] = useState('');
  const [category, setCategory] = useState<StrategyCategory>('hybrid');
  const [targetWeeklyGross, setTargetWeeklyGross] = useState<number>(2000);
  const [targetWeeklyHours, setTargetWeeklyHours] = useState<number>(40);
  const [targetWeeklyTrips, setTargetWeeklyTrips] = useState<number>(80);

  // Apps & Passes
  const [primaryPlatforms, setPrimaryPlatforms] = useState<PlatformType[]>(['Uber', '99']);
  const [uberRole, setUberRole] = useState('Corridas com dinâmica ou bônus de missões');
  const [ninetyNineRole, setNinetyNineRole] = useState('Base com Passe Taxa Zero para reter 100%');
  const [inDriveRole, setInDriveRole] = useState('Negociação em retornos e viagens médias');
  const [privateRole, setPrivateRole] = useState('Agendamentos VIP para aeroporto');

  const [use99Pass, setUse99Pass] = useState(true);
  const [pass99Type, setPass99Type] = useState<'time_7d' | 'time_3d' | 'time_1d' | 'earnings_300' | 'none'>('time_7d');
  const [passCost, setPassCost] = useState<number>(119.0);
  const [useUberMissions, setUseUberMissions] = useState(true);
  const [targetUberProTier, setTargetUberProTier] = useState<'diamond' | 'platinum' | 'gold' | 'blue'>('platinum');

  // Acceptance Rules
  const [minRateKm, setMinRateKm] = useState<number>(2.2);
  const [minRateHour, setMinRateHour] = useState<number>(40.0);
  const [maxPickupDistanceKm, setMaxPickupDistanceKm] = useState<number>(2.5);
  const [maxRideDurationMin, setMaxRideDurationMin] = useState<number>(45);
  const [minPassengerRating, setMinPassengerRating] = useState<number>(4.8);
  const [avoidRegionsNotes, setAvoidRegionsNotes] = useState('Evitar áreas periféricas desérticas à noite');

  // Fuel & Maintenance
  const [fuelChoice, setFuelChoice] = useState('Flex / Gasolina');
  const [stationCashbackTip, setStationCashbackTip] = useState('Abastece Aí / Shell Box com cashback');
  const [reserveMaintenancePerKm, setReserveMaintenancePerKm] = useState<number>(0.16);

  // Working Windows
  const [workingWindows, setWorkingWindows] = useState<StrategyWorkingWindow[]>([
    { dayOfWeek: 1, dayLabel: 'Segunda-feira', startTime: '06:00', endTime: '13:00', targetDailyEarnings: 300, focusArea: 'Centro e Aeroporto', recommendedApp: '99', passActive: 'Passe 7D' },
    { dayOfWeek: 2, dayLabel: 'Terça-feira', startTime: '06:00', endTime: '13:00', targetDailyEarnings: 280, focusArea: 'Eixo Comercial', recommendedApp: '99', passActive: 'Passe 7D' },
    { dayOfWeek: 3, dayLabel: 'Quarta-feira', startTime: '06:00', endTime: '13:00', targetDailyEarnings: 280, focusArea: 'Polos Empresariais', recommendedApp: '99', passActive: 'Passe 7D' },
    { dayOfWeek: 4, dayLabel: 'Quinta-feira', startTime: '14:00', endTime: '22:00', targetDailyEarnings: 320, focusArea: 'Shoppings e Universidades', recommendedApp: '99', passActive: 'Passe 7D' },
    { dayOfWeek: 5, dayLabel: 'Sexta-feira', startTime: '15:00', endTime: '23:30', targetDailyEarnings: 420, focusArea: 'Happy Hour e Gastronomia', recommendedApp: 'Uber', passActive: 'Dinâmica' },
    { dayOfWeek: 6, dayLabel: 'Sábado', startTime: '16:00', endTime: '00:30', targetDailyEarnings: 400, focusArea: 'Eventos e Vida Noturna', recommendedApp: 'Uber', passActive: 'Dinâmica' },
  ]);

  // Tactics
  const [tactics, setTactics] = useState<Array<{ title: string; tip: string; doText: string; dontText: string }>>([
    {
      title: 'Posicionamento Inteligente',
      tip: 'Fique sempre a menos de 1,5 km dos eixos de alta demanda para receber chamadas de R$/km elevado.',
      doText: 'Aguarde chamadas em locais seguros, iluminados e com rota de escape fácil.',
      dontText: 'Não fique rodando em círculos queimando combustível sem destino.',
    },
  ]);

  // Preencher quando for edição
  useEffect(() => {
    if (strategyToEdit) {
      setName(strategyToEdit.name);
      setTagline(strategyToEdit.tagline);
      setCategory(strategyToEdit.category);
      setTargetWeeklyGross(strategyToEdit.targetWeeklyGross);
      setTargetWeeklyHours(strategyToEdit.targetWeeklyHours);
      setTargetWeeklyTrips(strategyToEdit.targetWeeklyTrips);
      setPrimaryPlatforms(strategyToEdit.primaryPlatforms);
      setUberRole(strategyToEdit.platformStrategy.uberRole || '');
      setNinetyNineRole(strategyToEdit.platformStrategy.ninetyNineRole || '');
      setInDriveRole(strategyToEdit.platformStrategy.inDriveRole || '');
      setPrivateRole(strategyToEdit.platformStrategy.privateRole || '');
      setUse99Pass(strategyToEdit.passUsage.use99Pass);
      setPass99Type(strategyToEdit.passUsage.pass99Type);
      setPassCost(strategyToEdit.passUsage.passCost);
      setUseUberMissions(strategyToEdit.passUsage.useUberMissions);
      setTargetUberProTier(strategyToEdit.passUsage.targetUberProTier);
      setMinRateKm(strategyToEdit.acceptanceRules.minRateKm);
      setMinRateHour(strategyToEdit.acceptanceRules.minRateHour);
      setMaxPickupDistanceKm(strategyToEdit.acceptanceRules.maxPickupDistanceKm);
      setMaxRideDurationMin(strategyToEdit.acceptanceRules.maxRideDurationMin);
      setMinPassengerRating(strategyToEdit.acceptanceRules.minPassengerRating);
      setAvoidRegionsNotes(strategyToEdit.acceptanceRules.avoidRegionsNotes || '');
      setFuelChoice(strategyToEdit.fuelAndMaintenancePlan.fuelChoice);
      setStationCashbackTip(strategyToEdit.fuelAndMaintenancePlan.stationCashbackTip);
      setReserveMaintenancePerKm(strategyToEdit.fuelAndMaintenancePlan.reserveMaintenancePerKm);
      setWorkingWindows(strategyToEdit.workingWindows || []);
      setTactics(strategyToEdit.tacticalPlaybook || []);
    } else {
      // Valores padrão para nova estratégia
      setName('Minha Estratégia Personalizada');
      setTagline('Otimização de rotas, combustível e maximização de lucro líquido');
      setCategory('custom');
      setTargetWeeklyGross(2000);
      setTargetWeeklyHours(40);
      setTargetWeeklyTrips(80);
      setPrimaryPlatforms(['Uber', '99']);
    }
  }, [strategyToEdit, isOpen]);

  if (!isOpen) return null;

  // Cálculos de Projeção em Tempo Real
  const estimatedWeeklyKm = Math.round(targetWeeklyGross / Math.max(minRateKm, 1));
  const avgConsumption = vehicle.avgConsumption > 0 ? vehicle.avgConsumption : 11.5;
  const gasPrice = profile.gasPriceReference > 0 ? profile.gasPriceReference : 5.89;
  const estimatedFuelCost = Math.round((estimatedWeeklyKm / avgConsumption) * gasPrice);
  const estimatedMaintenanceCost = Math.round(estimatedWeeklyKm * reserveMaintenancePerKm);
  const totalPassAndServiceCost = use99Pass ? passCost : 0;
  const totalEstimatedCosts = estimatedFuelCost + estimatedMaintenanceCost + totalPassAndServiceCost;
  const estimatedNetProfit = Math.max(targetWeeklyGross - totalEstimatedCosts, 0);
  const estimatedNetPerHour = targetWeeklyHours > 0 ? (estimatedNetProfit / targetWeeklyHours) : 0;
  const profitMargin = targetWeeklyGross > 0 ? ((estimatedNetProfit / targetWeeklyGross) * 100) : 0;

  const togglePlatform = (p: PlatformType) => {
    if (primaryPlatforms.includes(p)) {
      if (primaryPlatforms.length > 1) {
        setPrimaryPlatforms(primaryPlatforms.filter(item => item !== p));
      }
    } else {
      setPrimaryPlatforms([...primaryPlatforms, p]);
    }
  };

  const handleUpdateWindow = (index: number, field: keyof StrategyWorkingWindow, value: any) => {
    setWorkingWindows(prev => {
      const copy = [...prev];
      copy[index] = { ...copy[index], [field]: value };
      return copy;
    });
  };

  const handleAddWindow = () => {
    const days = ['Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado', 'Domingo'];
    const newDayNum = (workingWindows.length + 1) % 7;
    const newWindow: StrategyWorkingWindow = {
      dayOfWeek: newDayNum,
      dayLabel: days[newDayNum === 0 ? 6 : newDayNum - 1] || 'Novo Turno',
      startTime: '07:00',
      endTime: '15:00',
      targetDailyEarnings: 300,
      focusArea: 'Centro e polos comerciais',
      recommendedApp: primaryPlatforms[0] || 'Uber',
      passActive: use99Pass ? 'Passe Ativo' : undefined,
    };
    setWorkingWindows([...workingWindows, newWindow]);
  };

  const handleRemoveWindow = (index: number) => {
    if (workingWindows.length > 1) {
      setWorkingWindows(workingWindows.filter((_, i) => i !== index));
    }
  };

  const handleAddTactic = () => {
    setTactics([
      ...tactics,
      {
        title: 'Nova Tática de Campo',
        tip: 'Dica estratégica para aumentar seus ganhos ou economizar tempo e combustível.',
        doText: 'O que fazer sempre nessa situação.',
        dontText: 'O que evitar absolutamente.',
      },
    ]);
  };

  const handleRemoveTactic = (index: number) => {
    setTactics(tactics.filter((_, i) => i !== index));
  };

  const handleSave = () => {
    if (!name.trim()) return;

    const strategyData: Omit<DriverStrategy, 'id' | 'createdAt'> = {
      name: name.trim(),
      tagline: tagline.trim() || 'Estratégia operacional personalizada',
      category,
      targetWeeklyGross: Number(targetWeeklyGross) || 1500,
      targetWeeklyHours: Number(targetWeeklyHours) || 35,
      targetWeeklyTrips: Number(targetWeeklyTrips) || 60,
      primaryPlatforms,
      platformStrategy: {
        uberRole,
        ninetyNineRole,
        inDriveRole,
        privateRole,
      },
      passUsage: {
        use99Pass,
        pass99Type,
        passCost: Number(passCost) || 0,
        useUberMissions,
        targetUberProTier,
      },
      acceptanceRules: {
        minRateKm: Number(minRateKm) || 2.0,
        minRateHour: Number(minRateHour) || 35.0,
        maxPickupDistanceKm: Number(maxPickupDistanceKm) || 3.0,
        maxRideDurationMin: Number(maxRideDurationMin) || 45,
        minPassengerRating: Number(minPassengerRating) || 4.75,
        avoidRegionsNotes,
      },
      fuelAndMaintenancePlan: {
        fuelChoice,
        stationCashbackTip,
        reserveMaintenancePerKm: Number(reserveMaintenancePerKm) || 0.15,
      },
      workingWindows,
      tacticalPlaybook: tactics,
      isPreset: false,
    };

    if (strategyToEdit && strategyToEdit.id) {
      updateStrategy(strategyToEdit.id, strategyData);
      if (onSaveSuccess) {
        onSaveSuccess({ ...strategyData, id: strategyToEdit.id, createdAt: strategyToEdit.createdAt });
      }
    } else {
      const created = createStrategy(strategyData);
      if (onSaveSuccess) {
        onSaveSuccess(created);
      }
    }

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md overflow-y-auto">
      <div className="bg-slate-900 border border-white/15 rounded-3xl w-full max-w-3xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        {/* HEADER DO MODAL */}
        <div className="p-5 sm:p-6 border-b border-white/10 flex items-center justify-between bg-slate-950/60 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-emerald-500 to-teal-400 text-slate-950 flex items-center justify-center font-black shadow-lg shadow-emerald-500/20">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-black text-white tracking-tight">
                {strategyToEdit ? 'Editar Estratégia' : 'Criar Nova Estratégia'}
              </h3>
              <p className="text-xs text-slate-400">
                Monte seu plano de guerra com regras de aceitação, passes e escala semanal.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* NAVEGAÇÃO ENTRE ETAPAS / ABAS */}
        <div className="flex items-center gap-1.5 p-3 px-5 bg-slate-950/40 border-b border-white/5 overflow-x-auto custom-scrollbar shrink-0">
          {[
            { id: 'basics', label: '1. Metas & Identidade', icon: Target },
            { id: 'apps', label: '2. Apps & Passes', icon: Layers },
            { id: 'rules', label: '3. Regras de Ouro', icon: ShieldCheck },
            { id: 'schedule', label: '4. Escala Semanal', icon: Calendar },
            { id: 'tactics', label: '5. Combustível & Táticas', icon: Fuel },
          ].map(step => {
            const Icon = step.icon;
            const isCurrent = activeStep === step.id;
            return (
              <button
                key={step.id}
                type="button"
                onClick={() => setActiveStep(step.id as any)}
                className={`px-3 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 whitespace-nowrap ${
                  isCurrent
                    ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20 font-black'
                    : 'text-slate-400 hover:text-white hover:bg-white/5'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                {step.label}
              </button>
            );
          })}
        </div>

        {/* CORPO DO FORMULÁRIO */}
        <div className="p-5 sm:p-6 overflow-y-auto flex-1 space-y-6 custom-scrollbar">

          {/* ETAPA 1: BÁSICO & METAS */}
          {activeStep === 'basics' && (
            <div className="space-y-5 animate-in fade-in duration-150">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5 sm:col-span-2">
                  <label className="text-xs font-bold text-slate-300">Nome da Estratégia *</label>
                  <input
                    type="text"
                    value={name}
                    onChange={e => setName(e.target.value)}
                    placeholder="Ex: Foco Noturno + Fim de Semana Turbo"
                    className="w-full bg-slate-950/60 border border-white/10 rounded-2xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div className="space-y-1.5 sm:col-span-2">
                  <label className="text-xs font-bold text-slate-300">Slogan / Descrição Rápida</label>
                  <input
                    type="text"
                    value={tagline}
                    onChange={e => setTagline(e.target.value)}
                    placeholder="Ex: Blindagem de taxa durante a semana e multiplicação no pico de sexta"
                    className="w-full bg-slate-950/60 border border-white/10 rounded-2xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-300">Categoria do Plano</label>
                  <select
                    value={category}
                    onChange={e => setCategory(e.target.value as StrategyCategory)}
                    className="w-full bg-slate-950/60 border border-white/10 rounded-2xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-emerald-500"
                  >
                    <option value="hybrid">Híbrida Multi-App (99 + Uber)</option>
                    <option value="weekend">Foco em Fim de Semana (Part-time)</option>
                    <option value="missions">Caçador de Missões & Corridas Curtas</option>
                    <option value="peak_hours">Pico Matinal & Corporativo</option>
                    <option value="long_trips">Viagens Longas & Rodoviárias</option>
                    <option value="night_shift">Madrugada & Zero Trânsito</option>
                    <option value="economy">Máxima Eficiência de Combustível</option>
                    <option value="custom">Personalizada</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-emerald-400">Meta de Faturamento Semanal (R$)</label>
                  <div className="relative">
                    <span className="absolute left-3.5 top-2.5 text-slate-500 text-sm font-bold">R$</span>
                    <input
                      type="number"
                      value={targetWeeklyGross}
                      onChange={e => setTargetWeeklyGross(Number(e.target.value))}
                      className="w-full bg-slate-950/60 border border-emerald-500/30 rounded-2xl pl-10 pr-4 py-2.5 text-sm text-white font-bold focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-300">Horas Semanais Alvo</label>
                  <div className="relative">
                    <input
                      type="number"
                      value={targetWeeklyHours}
                      onChange={e => setTargetWeeklyHours(Number(e.target.value))}
                      className="w-full bg-slate-950/60 border border-white/10 rounded-2xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-emerald-500"
                    />
                    <span className="absolute right-3.5 top-2.5 text-slate-500 text-xs">horas</span>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-300">Quantidade de Viagens Alvo</label>
                  <div className="relative">
                    <input
                      type="number"
                      value={targetWeeklyTrips}
                      onChange={e => setTargetWeeklyTrips(Number(e.target.value))}
                      className="w-full bg-slate-950/60 border border-white/10 rounded-2xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-emerald-500"
                    />
                    <span className="absolute right-3.5 top-2.5 text-slate-500 text-xs">viagens</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ETAPA 2: APPS & PASSES */}
          {activeStep === 'apps' && (
            <div className="space-y-5 animate-in fade-in duration-150">
              {/* SELEÇÃO DE PLATAFORMAS */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-300">Aplicativos Utilizados nesta Estratégia</label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  {(['Uber', '99', 'inDrive', 'Particular'] as PlatformType[]).map(plat => {
                    const isSelected = primaryPlatforms.includes(plat);
                    return (
                      <button
                        key={plat}
                        type="button"
                        onClick={() => togglePlatform(plat)}
                        className={`p-3 rounded-2xl border text-left transition flex items-center justify-between ${
                          isSelected
                            ? 'bg-emerald-500/10 border-emerald-500/50 text-white shadow-sm'
                            : 'bg-slate-950/40 border-white/5 text-slate-400 hover:text-white'
                        }`}
                      >
                        <span className="font-bold text-sm">{plat}</span>
                        {isSelected && <Check className="w-4 h-4 text-emerald-400" />}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* PACOTES 99 TAXA ZERO */}
              <div className="bg-yellow-500/5 border border-yellow-500/20 p-4 rounded-2xl space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-xl bg-yellow-500 text-slate-950 flex items-center justify-center font-black text-xs">
                      99
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-yellow-300">Uso de Pacote Taxa Zero 99</h4>
                      <p className="text-[11px] text-slate-400">Pague valor fixo e retenha 100% dos ganhos brutos</p>
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={use99Pass}
                    onChange={e => setUse99Pass(e.target.checked)}
                    className="w-5 h-5 rounded-lg accent-yellow-400 cursor-pointer"
                  />
                </div>

                {use99Pass && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-yellow-500/15">
                    <div className="space-y-1">
                      <label className="text-[11px] font-bold text-slate-300">Tipo de Pacote 99</label>
                      <select
                        value={pass99Type}
                        onChange={e => {
                          const val = e.target.value as any;
                          setPass99Type(val);
                          if (val === 'time_7d') setPassCost(119.0);
                          else if (val === 'time_3d') setPassCost(68.0);
                          else if (val === 'time_1d') setPassCost(24.9);
                          else if (val === 'earnings_300') setPassCost(44.9);
                        }}
                        className="w-full bg-slate-950/60 border border-yellow-500/30 rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
                      >
                        <option value="time_7d">Semanal (7 Dias / 168h) ~ R$ 119</option>
                        <option value="time_3d">Fim de Semana (3 Dias / 72h) ~ R$ 68</option>
                        <option value="time_1d">Diário (24h) ~ R$ 24,90</option>
                        <option value="earnings_300">Por Meta (R$ 300 faturamento) ~ R$ 44,90</option>
                      </select>
                    </div>
                    <div className="space-y-1">
                      <label className="text-[11px] font-bold text-slate-300">Custo do Passe (R$)</label>
                      <input
                        type="number"
                        step="0.10"
                        value={passCost}
                        onChange={e => setPassCost(Number(e.target.value))}
                        className="w-full bg-slate-950/60 border border-yellow-500/30 rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* BENEFÍCIOS E MISSÕES UBER */}
              <div className="bg-slate-800/40 border border-white/10 p-4 rounded-2xl space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-xl bg-white text-slate-950 flex items-center justify-center font-black text-xs">
                      U
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-white">Missões e Nível Uber Pro</h4>
                      <p className="text-[11px] text-slate-400">Bônus por metas de viagens e cashback de combustível</p>
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={useUberMissions}
                    onChange={e => setUseUberMissions(e.target.checked)}
                    className="w-5 h-5 rounded-lg accent-emerald-400 cursor-pointer"
                  />
                </div>

                {useUberMissions && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-white/10">
                    <div className="space-y-1">
                      <label className="text-[11px] font-bold text-slate-300">Nível Alvo Uber Pro</label>
                      <select
                        value={targetUberProTier}
                        onChange={e => setTargetUberProTier(e.target.value as any)}
                        className="w-full bg-slate-950/60 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
                      >
                        <option value="diamond">Diamante (6% cashback + 15% extra)</option>
                        <option value="platinum">Platina (4% cashback + 10% extra)</option>
                        <option value="gold">Ouro (3% cashback)</option>
                        <option value="blue">Azul (Padrão)</option>
                      </select>
                    </div>
                    <div className="space-y-1">
                      <label className="text-[11px] font-bold text-slate-300">Função da Uber na Estratégia</label>
                      <input
                        type="text"
                        value={uberRole}
                        onChange={e => setUberRole(e.target.value)}
                        placeholder="Ex: Corridas com dinâmica acima de 1.4x"
                        className="w-full bg-slate-950/60 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ETAPA 3: REGRAS DE OURO (FILTROS DE ACEITAÇÃO) */}
          {activeStep === 'rules' && (
            <div className="space-y-5 animate-in fade-in duration-150">
              <div className="p-3.5 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl text-xs text-emerald-300 flex items-start gap-2.5">
                <ShieldCheck className="w-5 h-5 shrink-0 text-emerald-400 mt-0.5" />
                <p>
                  Defina os critérios inegociáveis para aceitar corridas. Corridas abaixo desses parâmetros serão alertadas no Simulador e Modo Motorista.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-300">Valor Mínimo por KM (R$/km) *</label>
                  <div className="relative">
                    <span className="absolute left-3 top-2.5 text-slate-500 text-xs font-bold">R$</span>
                    <input
                      type="number"
                      step="0.05"
                      value={minRateKm}
                      onChange={e => setMinRateKm(Number(e.target.value))}
                      className="w-full bg-slate-950/60 border border-white/10 rounded-2xl pl-9 pr-4 py-2.5 text-sm text-white font-bold focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                  <span className="text-[11px] text-slate-400">Recomendado: R$ 2,10 a R$ 2,60</span>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-300">Valor Mínimo por Hora (R$/h) *</label>
                  <div className="relative">
                    <span className="absolute left-3 top-2.5 text-slate-500 text-xs font-bold">R$</span>
                    <input
                      type="number"
                      step="1.0"
                      value={minRateHour}
                      onChange={e => setMinRateHour(Number(e.target.value))}
                      className="w-full bg-slate-950/60 border border-white/10 rounded-2xl pl-9 pr-4 py-2.5 text-sm text-white font-bold focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                  <span className="text-[11px] text-slate-400">Recomendado: R$ 38,00 a R$ 50,00</span>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-300">Distância Máxima até o Passageiro</label>
                  <div className="relative">
                    <input
                      type="number"
                      step="0.1"
                      value={maxPickupDistanceKm}
                      onChange={e => setMaxPickupDistanceKm(Number(e.target.value))}
                      className="w-full bg-slate-950/60 border border-white/10 rounded-2xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-emerald-500"
                    />
                    <span className="absolute right-3.5 top-2.5 text-slate-500 text-xs">km</span>
                  </div>
                  <span className="text-[11px] text-slate-400">Evite buscar passageiros a mais de 3 km</span>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-300">Nota Mínima do Passageiro</label>
                  <input
                    type="number"
                    step="0.05"
                    value={minPassengerRating}
                    onChange={e => setMinPassengerRating(Number(e.target.value))}
                    className="w-full bg-slate-950/60 border border-white/10 rounded-2xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-emerald-500"
                  />
                  <span className="text-[11px] text-slate-400">Recomendado: 4.80+ para maior segurança</span>
                </div>

                <div className="space-y-1.5 sm:col-span-2">
                  <label className="text-xs font-bold text-slate-300">Regiões a Evitar ou Restrições de Horário</label>
                  <textarea
                    rows={2}
                    value={avoidRegionsNotes}
                    onChange={e => setAvoidRegionsNotes(e.target.value)}
                    placeholder="Ex: Não aceitar corridas para a zona leste após 21h; recusar locais sem iluminação..."
                    className="w-full bg-slate-950/60 border border-white/10 rounded-2xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-emerald-500 resize-none"
                  />
                </div>
              </div>
            </div>
          )}

          {/* ETAPA 4: ESCALA SEMANAL */}
          {activeStep === 'schedule' && (
            <div className="space-y-4 animate-in fade-in duration-150">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-bold text-white">Janelas de Horários e Turnos da Estratégia</h4>
                  <p className="text-[11px] text-slate-400">Configure os turnos diários que você irá rodar</p>
                </div>
                <button
                  type="button"
                  onClick={handleAddWindow}
                  className="px-3 py-1.5 bg-white/10 hover:bg-white/15 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Adicionar Turno
                </button>
              </div>

              <div className="space-y-3">
                {workingWindows.map((win, idx) => (
                  <div key={idx} className="bg-slate-950/50 border border-white/10 p-3.5 rounded-2xl space-y-3">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="w-6 h-6 rounded-lg bg-emerald-500/20 text-emerald-400 font-black text-xs flex items-center justify-center">
                          {idx + 1}
                        </span>
                        <input
                          type="text"
                          value={win.dayLabel}
                          onChange={e => handleUpdateWindow(idx, 'dayLabel', e.target.value)}
                          className="bg-transparent font-bold text-sm text-white focus:outline-none border-b border-transparent focus:border-emerald-500"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemoveWindow(idx)}
                        disabled={workingWindows.length <= 1}
                        className="text-slate-500 hover:text-red-400 p-1 transition disabled:opacity-30"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs">
                      <div>
                        <label className="text-[10px] text-slate-400 block mb-0.5">Início</label>
                        <input
                          type="time"
                          value={win.startTime}
                          onChange={e => handleUpdateWindow(idx, 'startTime', e.target.value)}
                          className="w-full bg-slate-900 border border-white/10 rounded-xl px-2.5 py-1.5 text-white font-bold"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] text-slate-400 block mb-0.5">Fim</label>
                        <input
                          type="time"
                          value={win.endTime}
                          onChange={e => handleUpdateWindow(idx, 'endTime', e.target.value)}
                          className="w-full bg-slate-900 border border-white/10 rounded-xl px-2.5 py-1.5 text-white font-bold"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] text-emerald-400 block mb-0.5">Meta Dia (R$)</label>
                        <input
                          type="number"
                          value={win.targetDailyEarnings}
                          onChange={e => handleUpdateWindow(idx, 'targetDailyEarnings', Number(e.target.value))}
                          className="w-full bg-slate-900 border border-emerald-500/30 rounded-xl px-2.5 py-1.5 text-emerald-300 font-bold"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] text-slate-400 block mb-0.5">App Principal</label>
                        <select
                          value={win.recommendedApp}
                          onChange={e => handleUpdateWindow(idx, 'recommendedApp', e.target.value)}
                          className="w-full bg-slate-900 border border-white/10 rounded-xl px-2 py-1.5 text-white font-bold"
                        >
                          <option value="Uber">Uber</option>
                          <option value="99">99</option>
                          <option value="inDrive">inDrive</option>
                          <option value="Particular">Particular</option>
                        </select>
                      </div>
                    </div>

                    <div>
                      <input
                        type="text"
                        value={win.focusArea}
                        onChange={e => handleUpdateWindow(idx, 'focusArea', e.target.value)}
                        placeholder="Região foco: Ex: Centro e Aeroporto..."
                        className="w-full bg-slate-900/80 border border-white/5 rounded-xl px-3 py-1.5 text-xs text-slate-300 focus:outline-none"
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ETAPA 5: COMBUSTÍVEL & TÁTICAS */}
          {activeStep === 'tactics' && (
            <div className="space-y-5 animate-in fade-in duration-150">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-300">Combustível Preferencial</label>
                  <input
                    type="text"
                    value={fuelChoice}
                    onChange={e => setFuelChoice(e.target.value)}
                    placeholder="Ex: Flex / Gasolina Aditivada / GNV"
                    className="w-full bg-slate-950/60 border border-white/10 rounded-2xl px-4 py-2.5 text-sm text-white focus:outline-none"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-300">Reserva de Manutenção por KM (R$/km)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={reserveMaintenancePerKm}
                    onChange={e => setReserveMaintenancePerKm(Number(e.target.value))}
                    className="w-full bg-slate-950/60 border border-white/10 rounded-2xl px-4 py-2.5 text-sm text-white focus:outline-none"
                  />
                  <span className="text-[11px] text-slate-400">Padrão: R$ 0,15 a R$ 0,20 por km</span>
                </div>

                <div className="space-y-1.5 sm:col-span-2">
                  <label className="text-xs font-bold text-slate-300">Dica de Posto & Cashback de Abastecimento</label>
                  <input
                    type="text"
                    value={stationCashbackTip}
                    onChange={e => setStationCashbackTip(e.target.value)}
                    placeholder="Ex: Abastecer com Abastece Aí / Ipiranga ou Shell Box"
                    className="w-full bg-slate-950/60 border border-white/10 rounded-2xl px-4 py-2.5 text-sm text-white focus:outline-none"
                  />
                </div>
              </div>

              {/* TÁTICAS DE CAMPO (PLAYBOOK) */}
              <div className="space-y-3 pt-2">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-white">Playbook Tático (O que Fazer vs O que Evitar)</h4>
                  <button
                    type="button"
                    onClick={handleAddTactic}
                    className="px-3 py-1.5 bg-white/10 hover:bg-white/15 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Nova Tática
                  </button>
                </div>

                {tactics.map((tac, idx) => (
                  <div key={idx} className="bg-slate-950/50 border border-white/10 p-3.5 rounded-2xl space-y-2.5">
                    <div className="flex items-center justify-between">
                      <input
                        type="text"
                        value={tac.title}
                        onChange={e => {
                          const copy = [...tactics];
                          copy[idx].title = e.target.value;
                          setTactics(copy);
                        }}
                        className="bg-transparent font-bold text-xs text-white focus:outline-none"
                        placeholder="Título da Tática"
                      />
                      <button
                        type="button"
                        onClick={() => handleRemoveTactic(idx)}
                        className="text-slate-500 hover:text-red-400 p-1"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <input
                      type="text"
                      value={tac.tip}
                      onChange={e => {
                        const copy = [...tactics];
                        copy[idx].tip = e.target.value;
                        setTactics(copy);
                      }}
                      placeholder="Dica geral explicativa..."
                      className="w-full bg-slate-900 border border-white/10 rounded-xl px-3 py-1.5 text-xs text-slate-300 focus:outline-none"
                    />

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                      <div>
                        <span className="text-[10px] text-emerald-400 font-bold block mb-0.5">✅ O que fazer:</span>
                        <input
                          type="text"
                          value={tac.doText}
                          onChange={e => {
                            const copy = [...tactics];
                            copy[idx].doText = e.target.value;
                            setTactics(copy);
                          }}
                          className="w-full bg-emerald-950/30 border border-emerald-500/20 rounded-xl px-2.5 py-1.5 text-xs text-emerald-200"
                        />
                      </div>
                      <div>
                        <span className="text-[10px] text-red-400 font-bold block mb-0.5">❌ O que evitar:</span>
                        <input
                          type="text"
                          value={tac.dontText}
                          onChange={e => {
                            const copy = [...tactics];
                            copy[idx].dontText = e.target.value;
                            setTactics(copy);
                          }}
                          className="w-full bg-red-950/30 border border-red-500/20 rounded-xl px-2.5 py-1.5 text-xs text-red-200"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* PAINEL DE PROJEÇÃO DE LUCRO EM TEMPO REAL */}
          <div className="bg-gradient-to-r from-emerald-950/40 via-slate-900 to-teal-950/40 border border-emerald-500/20 p-4 rounded-2xl space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-emerald-400 flex items-center gap-1.5">
                <TrendingUp className="w-4 h-4" />
                Projeção Financeira Real da Estratégia
              </span>
              <span className="text-xs font-black text-white bg-emerald-500/20 px-2.5 py-1 rounded-xl">
                Margem: {profitMargin.toFixed(0)}%
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-center">
              <div className="bg-black/30 p-2.5 rounded-xl border border-white/5">
                <span className="text-[10px] text-slate-400 block">Faturamento Bruto</span>
                <span className="text-sm font-black text-white">{formatCurrency(targetWeeklyGross)}</span>
              </div>
              <div className="bg-black/30 p-2.5 rounded-xl border border-white/5">
                <span className="text-[10px] text-slate-400 block">Custos Totais (Est.)</span>
                <span className="text-sm font-bold text-red-400">-{formatCurrency(totalEstimatedCosts)}</span>
              </div>
              <div className="bg-black/30 p-2.5 rounded-xl border border-white/5">
                <span className="text-[10px] text-emerald-400 block font-bold">Lucro Líquido Real</span>
                <span className="text-sm font-black text-emerald-400">{formatCurrency(estimatedNetProfit)}</span>
              </div>
              <div className="bg-black/30 p-2.5 rounded-xl border border-white/5">
                <span className="text-[10px] text-teal-400 block font-bold">Líquido por Hora</span>
                <span className="text-sm font-black text-teal-300">{formatCurrency(estimatedNetPerHour)}/h</span>
              </div>
            </div>
          </div>

        </div>

        {/* FOOTER COM BOTÕES DE AÇÃO */}
        <div className="p-4 sm:p-5 border-t border-white/10 bg-slate-950/60 flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2">
            {activeStep !== 'basics' && (
              <button
                type="button"
                onClick={() => {
                  const steps: Array<'basics' | 'apps' | 'rules' | 'schedule' | 'tactics'> = ['basics', 'apps', 'rules', 'schedule', 'tactics'];
                  const curIdx = steps.indexOf(activeStep);
                  if (curIdx > 0) setActiveStep(steps[curIdx - 1]);
                }}
                className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-xs font-bold text-slate-300 transition"
              >
                Voltar
              </button>
            )}
            {activeStep !== 'tactics' ? (
              <button
                type="button"
                onClick={() => {
                  const steps: Array<'basics' | 'apps' | 'rules' | 'schedule' | 'tactics'> = ['basics', 'apps', 'rules', 'schedule', 'tactics'];
                  const curIdx = steps.indexOf(activeStep);
                  if (curIdx < steps.length - 1) setActiveStep(steps[curIdx + 1]);
                }}
                className="px-4 py-2 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 text-xs font-bold text-emerald-300 transition flex items-center gap-1.5"
              >
                Próximo Passo
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            ) : null}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-xs font-bold text-slate-300 transition"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={!name.trim()}
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-400 hover:from-emerald-400 hover:to-teal-300 text-slate-950 font-black text-xs transition shadow-lg shadow-emerald-500/25 flex items-center gap-2 disabled:opacity-50"
            >
              <Check className="w-4 h-4" />
              {strategyToEdit ? 'Atualizar Estratégia' : 'Salvar Estratégia'}
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
