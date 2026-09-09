import React, { useState, useMemo } from 'react';
import { useDriver, DEFAULT_EXPENSE_CATEGORIES } from '../context/DriverContext';
import { ExpenseCategory, MaintenanceCategory, PlatformType } from '../types';
import { safeDivide, formatCurrency, calcFuelParity } from '../utils/calc';
import {
  DollarSign,
  Car,
  Fuel,
  TrendingDown,
  Wrench,
  X,
  Check,
  Sparkles,
  Zap,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  Tag,
  Plus,
  Trash2,
  Settings2,
} from 'lucide-react';

interface QuickAddModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialTab?: 'earning' | 'ride' | 'fuel' | 'expense' | 'maintenance';
  initialFuelData?: {
    liters?: number;
    pricePerLiter?: number;
    totalAmount?: number;
    fuelType?: string;
  };
}

export const QuickAddModal: React.FC<QuickAddModalProps> = ({
  isOpen,
  onClose,
  initialTab = 'earning',
  initialFuelData,
}) => {
  const {
    vehicle,
    profile,
    activeSession,
    addEarning,
    addExpense,
    addFuelRecord,
    addMaintenance,
    expenseCategories,
    customExpenseCategories,
    addCustomExpenseCategory,
    removeCustomExpenseCategory,
  } = useDriver();

  const [activeTab, setActiveTab] = useState<'earning' | 'ride' | 'fuel' | 'expense' | 'maintenance'>(initialTab);
  const [successMessage, setSuccessMessage] = useState('');

  // 1. GANHO
  const [earnPlatform, setEarnPlatform] = useState<PlatformType>('Uber');
  const [earnAmount, setEarnAmount] = useState('');
  const [earnTip, setEarnTip] = useState('');
  const [earnTrips, setEarnTrips] = useState('1');
  const [earnNotes, setEarnNotes] = useState('');

  // 2. CORRIDA INDIVIDUAL
  const [ridePlatform, setRidePlatform] = useState<PlatformType>('Uber');
  const [rideAmount, setRideAmount] = useState('');
  const [rideKm, setRideKm] = useState('');
  const [rideMinutes, setRideMinutes] = useState('');

  // 3. ABASTECIMENTO & CONSULTOR QUAL COMBUSTÍVEL USAR
  const [fuelStation, setFuelStation] = useState('Posto Ipiranga');
  const [fuelType, setFuelType] = useState('Gasolina Comum');
  const [fuelLiters, setFuelLiters] = useState('');
  const [fuelPricePerLiter, setFuelPricePerLiter] = useState('5.89');
  const [fuelTotal, setFuelTotal] = useState('');
  const [fuelOdo, setFuelOdo] = useState(vehicle.currentOdometer.toString());

  // Preços de bomba para cálculo de paridade em tempo real
  const [pumpGasPrice, setPumpGasPrice] = useState<string>(
    profile.gasPriceReference ? profile.gasPriceReference.toString() : '5.89'
  );
  const [pumpEthPrice, setPumpEthPrice] = useState<string>(
    profile.gasPriceReference ? (profile.gasPriceReference * 0.68).toFixed(2) : '3.99'
  );
  const [showPriceCompareInputs, setShowPriceCompareInputs] = useState<boolean>(false);

  // Paridade calculada em tempo real
  const parityAnalysis = useMemo(() => {
    const gas = parseFloat(pumpGasPrice) || 5.89;
    const eth = parseFloat(pumpEthPrice) || 3.99;
    const isFlexVehicle = vehicle.fuelType === 'Flex' || !vehicle.fuelType;
    return calcFuelParity(eth, gas, vehicle.avgConsumption || 12.5, isFlexVehicle);
  }, [pumpGasPrice, pumpEthPrice, vehicle]);

  // Função para aplicar recomendação com 1 clique
  const applyRecommendedFuel = (type: 'Etanol' | 'Gasolina Comum', price: number) => {
    setFuelType(type);
    setFuelPricePerLiter(price.toFixed(2));
    const litersNum = parseFloat(fuelLiters) || 0;
    const totalNum = parseFloat(fuelTotal) || 0;
    if (litersNum > 0) {
      setFuelTotal((litersNum * price).toFixed(2));
    } else if (totalNum > 0) {
      setFuelLiters((totalNum / price).toFixed(2));
    }
  };

  // Sincronizar quando abrir com props iniciais
  React.useEffect(() => {
    if (isOpen) {
      setActiveTab(initialTab);
      if (initialFuelData) {
        if (initialFuelData.liters) setFuelLiters(initialFuelData.liters.toString());
        if (initialFuelData.pricePerLiter) setFuelPricePerLiter(initialFuelData.pricePerLiter.toFixed(2));
        if (initialFuelData.totalAmount) setFuelTotal(initialFuelData.totalAmount.toFixed(2));
        if (initialFuelData.fuelType) {
          setFuelType(initialFuelData.fuelType === 'Etanol' ? 'Etanol Comum' : 'Gasolina Comum');
        }
      }
    }
  }, [isOpen, initialTab, initialFuelData]);

  // 4. DESPESA
  const [expCategory, setExpCategory] = useState<ExpenseCategory>('Alimentação');
  const [expAmount, setExpAmount] = useState('');
  const [expDesc, setExpDesc] = useState('');
  const [isCreatingCategory, setIsCreatingCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [isManagingCategories, setIsManagingCategories] = useState(false);

  // Manipulador para criar categoria personalizada
  const handleCreateCategory = (nameToCreate?: string) => {
    const target = (nameToCreate || newCategoryName).trim();
    if (!target) return;
    addCustomExpenseCategory(target);
    setExpCategory(target as ExpenseCategory);
    setNewCategoryName('');
    setIsCreatingCategory(false);
  };

  // Ícones contextuais para categorias
  const getCategoryIcon = (category: string) => {
    const c = category.toLowerCase().trim();
    if (c.includes('aliment') || c.includes('lanche') || c.includes('refei') || c.includes('comida') || c.includes('almoço')) return '🍽️';
    if (c.includes('multa') || c.includes('infracao') || c.includes('radar')) return '🚨';
    if (c.includes('limpeza') || c.includes('higien') || c.includes('aspirar')) return '✨';
    if (c.includes('lavag') || c.includes('ducha') || c.includes('estética')) return '🚿';
    if (c.includes('combust') || c.includes('gasolina') || c.includes('etanol') || c.includes('posto') || c.includes('abastec')) return '⛽';
    if (c.includes('estacion') || c.includes('valet') || c.includes('zona azul') || c.includes('parqu')) return '🅿️';
    if (c.includes('pedag') || c.includes('tag') || c.includes('sem parar') || c.includes('conectcar')) return '🛣️';
    if (c.includes('internet') || c.includes('celular') || c.includes('telefone') || c.includes('plano')) return '📱';
    if (c.includes('manuten') || c.includes('oficina') || c.includes('mecanic')) return '🔧';
    if (c.includes('oleo') || c.includes('óleo') || c.includes('filtro')) return '🛢️';
    if (c.includes('freio') || c.includes('pastilha')) return '🛑';
    if (c.includes('pneu') || c.includes('calibr')) return '🛞';
    if (c.includes('seguro')) return '🛡️';
    if (c.includes('ipva') || c.includes('licenc')) return '📄';
    if (c.includes('document') || c.includes('taxa')) return '📑';
    if (c.includes('acess') || c.includes('suporte') || c.includes('cabo')) return '🔌';
    if (c.includes('agua') || c.includes('água') || c.includes('bala') || c.includes('mimo')) return '🍬';
    return '🏷️';
  };

  // Chips para seleção rápida (personalizadas + principais categorias recomendadas)
  const displayCategoryChips = useMemo(() => {
    const priority = ['Alimentação', 'Multas', 'Limpeza', 'Lavagem', 'Combustível', 'Estacionamento', 'Pedágio', 'Internet', 'Manutenção'];
    const combined = [...customExpenseCategories, ...priority];
    const unique = Array.from(new Set(combined.map(c => c.trim()))).filter(Boolean);
    if (!unique.includes(expCategory)) {
      unique.unshift(expCategory);
    }
    return unique;
  }, [customExpenseCategories, expCategory]);

  // 5. MANUTENÇÃO
  const [maintCategory, setMaintCategory] = useState<MaintenanceCategory>('Troca de Óleo');
  const [maintAmount, setMaintAmount] = useState('');
  const [maintOdo, setMaintOdo] = useState(vehicle.currentOdometer.toString());
  const [maintNextOdo, setMaintNextOdo] = useState((vehicle.currentOdometer + 10000).toString());
  const [maintDesc, setMaintDesc] = useState('');

  if (!isOpen) return null;

  const showNotification = (msg: string) => {
    setSuccessMessage(msg);
    setTimeout(() => {
      setSuccessMessage('');
      onClose();
    }, 1200);
  };

  // Submits
  const handleEarnSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const amount = parseFloat(earnAmount) || 0;
    const tip = parseFloat(earnTip) || 0;
    const trips = parseInt(earnTrips) || 1;

    addEarning({
      platform: earnPlatform,
      amount,
      tip,
      tripsCount: trips,
      notes: earnNotes,
      sessionId: activeSession?.id,
    });
    showNotification(`Ganho de ${formatCurrency(amount + tip)} registrado!`);
  };

  const handleRideSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const amount = parseFloat(rideAmount) || 0;
    const distanceKm = parseFloat(rideKm) || 0;
    const durationMinutes = parseFloat(rideMinutes) || 0;

    addEarning({
      platform: ridePlatform,
      amount,
      tip: 0,
      tripsCount: 1,
      distanceKm,
      durationMinutes,
      notes: `Corrida individual: ${distanceKm}km em ${durationMinutes}min`,
      sessionId: activeSession?.id,
    });
    showNotification(`Corrida de ${formatCurrency(amount)} salva!`);
  };

  const handleFuelSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const liters = parseFloat(fuelLiters) || (parseFloat(fuelTotal) / parseFloat(fuelPricePerLiter)) || 0;
    const total = parseFloat(fuelTotal) || (liters * parseFloat(fuelPricePerLiter)) || 0;
    const pricePerLiter = parseFloat(fuelPricePerLiter) || safeDivide(total, liters);
    const odo = parseInt(fuelOdo) || vehicle.currentOdometer;

    addFuelRecord({
      stationName: fuelStation,
      fuelType,
      liters,
      pricePerLiter,
      totalAmount: total,
      odometer: odo,
      date: new Date().toISOString().split('T')[0],
    });
    showNotification(`Abastecimento de ${formatCurrency(total)} registrado!`);
  };

  const handleExpenseSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const amount = parseFloat(expAmount) || 0;
    addExpense({
      category: expCategory,
      amount,
      description: expDesc || expCategory,
      date: new Date().toISOString().split('T')[0],
      sessionId: activeSession?.id,
    });
    showNotification(`Despesa de ${formatCurrency(amount)} adicionada!`);
  };

  const handleMaintSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const amount = parseFloat(maintAmount) || 0;
    const odo = parseInt(maintOdo) || vehicle.currentOdometer;
    const nextOdo = parseInt(maintNextOdo) || odo + 10000;

    addMaintenance({
      category: maintCategory,
      description: maintDesc || maintCategory,
      amount,
      odometer: odo,
      nextOdometer: nextOdo,
      date: new Date().toISOString().split('T')[0],
      completed: true,
    });
    showNotification(`Manutenção salva com alerta para ${nextOdo} km!`);
  };

  // Cálculo de combustível em tempo real
  const handleLitersChange = (l: string) => {
    setFuelLiters(l);
    const price = parseFloat(fuelPricePerLiter) || 0;
    const liters = parseFloat(l) || 0;
    if (price > 0 && liters > 0) {
      setFuelTotal((liters * price).toFixed(2));
    }
  };

  const handleTotalFuelChange = (tot: string) => {
    setFuelTotal(tot);
    const price = parseFloat(fuelPricePerLiter) || 0;
    const total = parseFloat(tot) || 0;
    if (price > 0 && total > 0) {
      setFuelLiters((total / price).toFixed(2));
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-950/80 backdrop-blur-md">
      <div className="bg-slate-900 border border-white/15 rounded-t-3xl sm:rounded-3xl w-full max-w-lg p-5 sm:p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
        
        {/* HEADER */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold">
              ➕
            </div>
            <div>
              <h3 className="text-base font-black text-white">LANÇAMENTO RÁPIDO</h3>
              <p className="text-[11px] text-slate-400">1 toque para registrar qualquer movimentação</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-slate-400 hover:text-white"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* 5 BOTÕES GRANDES DE 1 TOQUE (SECTION 8) */}
        <div className="grid grid-cols-5 gap-1.5 p-1 bg-black/40 rounded-2xl border border-white/10">
          <button
            onClick={() => setActiveTab('earning')}
            className={`flex flex-col items-center justify-center py-2 px-1 rounded-xl transition ${
              activeTab === 'earning'
                ? 'bg-emerald-500 text-slate-950 font-black shadow-md shadow-emerald-500/25'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <DollarSign className="w-4 h-4 mb-1" />
            <span className="text-[10px]">Ganho</span>
          </button>

          <button
            onClick={() => setActiveTab('ride')}
            className={`flex flex-col items-center justify-center py-2 px-1 rounded-xl transition ${
              activeTab === 'ride'
                ? 'bg-teal-500 text-slate-950 font-black shadow-md shadow-teal-500/25'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Car className="w-4 h-4 mb-1" />
            <span className="text-[10px]">Corrida</span>
          </button>

          <button
            onClick={() => setActiveTab('fuel')}
            className={`flex flex-col items-center justify-center py-2 px-1 rounded-xl transition ${
              activeTab === 'fuel'
                ? 'bg-amber-500 text-slate-950 font-black shadow-md shadow-amber-500/25'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Fuel className="w-4 h-4 mb-1" />
            <span className="text-[10px]">Posto</span>
          </button>

          <button
            onClick={() => setActiveTab('expense')}
            className={`flex flex-col items-center justify-center py-2 px-1 rounded-xl transition ${
              activeTab === 'expense'
                ? 'bg-rose-500 text-slate-950 font-black shadow-md shadow-rose-500/25'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <TrendingDown className="w-4 h-4 mb-1" />
            <span className="text-[10px]">Despesa</span>
          </button>

          <button
            onClick={() => setActiveTab('maintenance')}
            className={`flex flex-col items-center justify-center py-2 px-1 rounded-xl transition ${
              activeTab === 'maintenance'
                ? 'bg-indigo-500 text-slate-950 font-black shadow-md shadow-indigo-500/25'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Wrench className="w-4 h-4 mb-1" />
            <span className="text-[10px]">Revisão</span>
          </button>
        </div>

        {/* MENSAGEM DE SUCESSO */}
        {successMessage && (
          <div className="bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 px-4 py-3 rounded-2xl text-xs font-black flex items-center justify-center gap-2 animate-bounce">
            <Check className="w-4 h-4" />
            {successMessage}
          </div>
        )}

        {/* 1. ABA GANHO */}
        {activeTab === 'earning' && (
          <form onSubmit={handleEarnSubmit} className="space-y-3.5">
            <div>
              <label className="text-[11px] font-bold text-slate-400 uppercase block mb-1">Plataforma</label>
              <div className="grid grid-cols-4 gap-2">
                {(['Uber', '99', 'inDrive', 'Particular'] as PlatformType[]).map(p => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setEarnPlatform(p)}
                    className={`py-2 text-xs font-bold rounded-xl border transition ${
                      earnPlatform === p
                        ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/50'
                        : 'bg-white/5 text-slate-400 border-white/10 hover:bg-white/10'
                    }`}
                  >
                    {p}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] font-bold text-slate-400 uppercase block mb-1">Valor Bruto (R$)</label>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={earnAmount}
                  onChange={e => setEarnAmount(e.target.value)}
                  placeholder="0.00"
                  className="w-full bg-white/5 border border-white/15 rounded-xl px-3 py-2.5 text-base font-black text-emerald-400 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-400 uppercase block mb-1">Gorjeta Extra (R$)</label>
                <input
                  type="number"
                  step="0.01"
                  value={earnTip}
                  onChange={e => setEarnTip(e.target.value)}
                  placeholder="0.00"
                  className="w-full bg-white/5 border border-white/15 rounded-xl px-3 py-2.5 text-base font-black text-teal-300 focus:outline-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] font-bold text-slate-400 uppercase block mb-1">Qtd de Corridas</label>
                <input
                  type="number"
                  value={earnTrips}
                  onChange={e => setEarnTrips(e.target.value)}
                  className="w-full bg-white/5 border border-white/15 rounded-xl px-3 py-2 text-sm text-white"
                />
              </div>
              <div>
                <label className="text-[11px] font-bold text-slate-400 uppercase block mb-1">Observações</label>
                <input
                  type="text"
                  value={earnNotes}
                  onChange={e => setEarnNotes(e.target.value)}
                  placeholder="Ex: Turno da manhã"
                  className="w-full bg-white/5 border border-white/15 rounded-xl px-3 py-2 text-sm text-white"
                />
              </div>
            </div>

            <button
              type="submit"
              className="w-full bg-gradient-to-r from-emerald-500 to-teal-400 hover:from-emerald-400 hover:to-teal-300 text-slate-950 font-black py-3 rounded-2xl text-sm shadow-lg shadow-emerald-500/25 active:scale-95 transition"
            >
              SALVAR GANHO
            </button>
          </form>
        )}

        {/* 2. ABA CORRIDA INDIVIDUAL */}
        {activeTab === 'ride' && (
          <form onSubmit={handleRideSubmit} className="space-y-3.5">
            <div>
              <label className="text-[11px] font-bold text-slate-400 uppercase block mb-1">Aplicativo</label>
              <div className="grid grid-cols-4 gap-2">
                {(['Uber', '99', 'inDrive', 'Particular'] as PlatformType[]).map(p => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setRidePlatform(p)}
                    className={`py-2 text-xs font-bold rounded-xl border transition ${
                      ridePlatform === p
                        ? 'bg-teal-500/20 text-teal-300 border-teal-500/50'
                        : 'bg-white/5 text-slate-400 border-white/10 hover:bg-white/10'
                    }`}
                  >
                    {p}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Valor (R$)</label>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={rideAmount}
                  onChange={e => setRideAmount(e.target.value)}
                  placeholder="28.50"
                  className="w-full bg-white/5 border border-white/15 rounded-xl px-2.5 py-2 text-sm font-black text-teal-400"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">KM Rodado</label>
                <input
                  type="number"
                  step="0.1"
                  value={rideKm}
                  onChange={e => setRideKm(e.target.value)}
                  placeholder="12.0"
                  className="w-full bg-white/5 border border-white/15 rounded-xl px-2.5 py-2 text-sm text-white"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Tempo (min)</label>
                <input
                  type="number"
                  value={rideMinutes}
                  onChange={e => setRideMinutes(e.target.value)}
                  placeholder="20"
                  className="w-full bg-white/5 border border-white/15 rounded-xl px-2.5 py-2 text-sm text-white"
                />
              </div>
            </div>

            {parseFloat(rideAmount) > 0 && parseFloat(rideKm) > 0 && (() => {
              const km = parseFloat(rideKm) || 0;
              const gross = parseFloat(rideAmount) || 0;
              const mins = parseFloat(rideMinutes) || 1;
              const fuelCost = (km / (vehicle.avgConsumption || 11.5)) * (profile.gasPriceReference || 5.89);
              const maintCost = km * 0.15;
              const totalCost = fuelCost + maintCost;
              const netProfit = gross - totalCost;
              const netPerKm = safeDivide(netProfit, km);
              const ratePerKm = safeDivide(gross, km);
              const ratePerHour = safeDivide(gross, safeDivide(mins, 60));

              return (
                <div className="bg-slate-950/80 p-3 rounded-2xl border border-teal-500/30 space-y-2 text-xs">
                  <div className="flex justify-between text-slate-300 font-bold">
                    <span>Bruto: <strong className="text-teal-400">{formatCurrency(ratePerKm)}/km</strong> ({formatCurrency(ratePerHour)}/h)</span>
                    <span className="text-amber-300">Custo Estimado: {formatCurrency(totalCost)}</span>
                  </div>
                  <div className="grid grid-cols-3 gap-1 text-[11px] text-center pt-1 border-t border-white/10">
                    <div className="bg-white/5 p-1.5 rounded-lg">
                      <span className="text-slate-400 block text-[9px]">Combustível</span>
                      <strong className="text-amber-300 font-mono">{formatCurrency(fuelCost)}</strong>
                    </div>
                    <div className="bg-white/5 p-1.5 rounded-lg">
                      <span className="text-slate-400 block text-[9px]">Manutenção</span>
                      <strong className="text-sky-300 font-mono">{formatCurrency(maintCost)}</strong>
                    </div>
                    <div className="bg-white/5 p-1.5 rounded-lg">
                      <span className="text-slate-400 block text-[9px]">Líquido Real</span>
                      <strong className={`font-mono ${netProfit >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                        {formatCurrency(netProfit)}
                      </strong>
                    </div>
                  </div>
                  <div className="text-[10px] text-emerald-400 font-bold text-center">
                    Resultado Líquido: {formatCurrency(netPerKm)}/km rodado
                  </div>
                </div>
              );
            })()}

            <button
              type="submit"
              className="w-full bg-teal-500 hover:bg-teal-400 text-slate-950 font-black py-3 rounded-2xl text-sm shadow-lg shadow-teal-500/25 active:scale-95 transition"
            >
              SALVAR CORRIDA
            </button>
          </form>
        )}

        {/* 3. ABA ABASTECIMENTO COM CONSULTOR QUAL COMBUSTÍVEL USAR */}
        {activeTab === 'fuel' && (
          <form onSubmit={handleFuelSubmit} className="space-y-3.5">
            
            {/* CONSULTOR DE QUAL COMBUSTÍVEL USAR (RECOMENDAÇÃO INTELIGENTE) */}
            <div className={`p-3.5 rounded-2xl border transition-all ${
              parityAnalysis.betterOption === 'Etanol'
                ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-200'
                : 'bg-sky-950/40 border-sky-500/40 text-sky-200'
            }`}>
              <div className="flex items-center justify-between gap-2 mb-2">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-amber-400 shrink-0" />
                  <span className="text-xs font-black uppercase tracking-tight text-white">
                    QUAL COMBUSTÍVEL USAR?
                  </span>
                </div>
                <span className={`text-[10px] font-black px-2 py-0.5 rounded-full uppercase border ${
                  parityAnalysis.betterOption === 'Etanol'
                    ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                    : 'bg-sky-500/20 text-sky-300 border-sky-500/40'
                }`}>
                  {parityAnalysis.betterOption === 'Etanol' ? '🟢 Recomendado: ETANOL' : '🔵 Recomendado: GASOLINA'}
                </span>
              </div>

              <p className="text-[11px] text-slate-300 leading-snug mb-3">
                {parityAnalysis.reason}
              </p>

              {/* BOTÕES DE 1 TOQUE PARA APLICAR O COMBUSTÍVEL */}
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => applyRecommendedFuel('Etanol', parseFloat(pumpEthPrice) || 3.99)}
                  className={`p-2.5 rounded-xl border text-left transition flex flex-col justify-between ${
                    fuelType.includes('Etanol')
                      ? 'bg-emerald-500/30 border-emerald-400 text-white shadow-md'
                      : 'bg-black/30 border-white/10 hover:border-white/20 text-slate-300'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black flex items-center gap-1">
                      ⚡ Etanol
                      {parityAnalysis.betterOption === 'Etanol' && (
                        <span className="text-[9px] bg-emerald-500 text-slate-950 px-1 rounded font-black">TOP</span>
                      )}
                    </span>
                    <span className="text-xs font-bold text-emerald-400">
                      R$ {parseFloat(pumpEthPrice).toFixed(2)}/L
                    </span>
                  </div>
                  <span className="text-[10px] text-slate-400 mt-1">
                    Custo: <strong className="text-slate-200">{formatCurrency(parityAnalysis.costPerKmEthanol)}/km</strong>
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => applyRecommendedFuel('Gasolina Comum', parseFloat(pumpGasPrice) || 5.89)}
                  className={`p-2.5 rounded-xl border text-left transition flex flex-col justify-between ${
                    fuelType.includes('Gasolina')
                      ? 'bg-sky-500/30 border-sky-400 text-white shadow-md'
                      : 'bg-black/30 border-white/10 hover:border-white/20 text-slate-300'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black flex items-center gap-1">
                      ⛽ Gasolina
                      {parityAnalysis.betterOption === 'Gasolina' && (
                        <span className="text-[9px] bg-sky-500 text-slate-950 px-1 rounded font-black">TOP</span>
                      )}
                    </span>
                    <span className="text-xs font-bold text-sky-400">
                      R$ {parseFloat(pumpGasPrice).toFixed(2)}/L
                    </span>
                  </div>
                  <span className="text-[10px] text-slate-400 mt-1">
                    Custo: <strong className="text-slate-200">{formatCurrency(parityAnalysis.costPerKmGasoline)}/km</strong>
                  </span>
                </button>
              </div>

              {/* TOGGLE PARA COMPARAR OUTROS PREÇOS NA BOMBA */}
              <div className="mt-2 pt-2 border-t border-white/10 flex items-center justify-between text-[11px]">
                <button
                  type="button"
                  onClick={() => setShowPriceCompareInputs(!showPriceCompareInputs)}
                  className="text-slate-400 hover:text-white flex items-center gap-1 font-bold underline"
                >
                  {showPriceCompareInputs ? '▲ Ocultar ajuste de bomba' : '▼ Preço do posto está diferente? Ajustar bomba'}
                </button>
                <span className="text-[10px] text-slate-400">
                  Paridade: <strong className="text-white font-mono">{parityAnalysis.ethanolRatioPercent.toFixed(1)}%</strong>
                </span>
              </div>

              {showPriceCompareInputs && (
                <div className="grid grid-cols-2 gap-2 mt-2 pt-2 border-t border-white/10">
                  <div>
                    <label className="text-[10px] font-bold text-slate-400 block mb-0.5">Preço Gasolina no Posto (R$)</label>
                    <input
                      type="number"
                      step="0.01"
                      value={pumpGasPrice}
                      onChange={e => setPumpGasPrice(e.target.value)}
                      className="w-full bg-black/40 border border-white/15 rounded-lg px-2 py-1 text-xs text-white"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-400 block mb-0.5">Preço Etanol no Posto (R$)</label>
                    <input
                      type="number"
                      step="0.01"
                      value={pumpEthPrice}
                      onChange={e => setPumpEthPrice(e.target.value)}
                      className="w-full bg-black/40 border border-white/15 rounded-lg px-2 py-1 text-xs text-white"
                    />
                  </div>
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] font-bold text-slate-400 uppercase block mb-1">Posto / Local</label>
                <input
                  type="text"
                  value={fuelStation}
                  onChange={e => setFuelStation(e.target.value)}
                  placeholder="Posto Ipiranga / Shell / Petrobras"
                  className="w-full bg-white/5 border border-white/15 rounded-xl px-3 py-2 text-xs text-white"
                />
              </div>
              <div>
                <label className="text-[11px] font-bold text-slate-400 uppercase block mb-1">Combustível Escolhido</label>
                <select
                  value={fuelType}
                  onChange={e => setFuelType(e.target.value)}
                  className="w-full bg-slate-900 border border-white/15 rounded-xl px-3 py-2 text-xs text-white"
                >
                  <option value="Gasolina Comum">Gasolina Comum</option>
                  <option value="Gasolina Aditivada">Gasolina Aditivada</option>
                  <option value="Etanol">Etanol</option>
                  <option value="GNV">GNV</option>
                  <option value="Diesel">Diesel</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Preço/Litro (R$)</label>
                <input
                  type="number"
                  step="0.01"
                  value={fuelPricePerLiter}
                  onChange={e => setFuelPricePerLiter(e.target.value)}
                  className="w-full bg-white/5 border border-white/15 rounded-xl px-2.5 py-2 text-sm text-white"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Litros</label>
                <input
                  type="number"
                  step="0.01"
                  value={fuelLiters}
                  onChange={e => handleLitersChange(e.target.value)}
                  placeholder="25.0"
                  className="w-full bg-white/5 border border-white/15 rounded-xl px-2.5 py-2 text-sm text-white"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Total Pago (R$)</label>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={fuelTotal}
                  onChange={e => handleTotalFuelChange(e.target.value)}
                  placeholder="150.00"
                  className="w-full bg-white/5 border border-white/15 rounded-xl px-2.5 py-2 text-sm font-black text-amber-400"
                />
              </div>
            </div>

            <div>
              <label className="text-[11px] font-bold text-slate-400 uppercase block mb-1">Hodômetro Atual (KM)</label>
              <input
                type="number"
                value={fuelOdo}
                onChange={e => setFuelOdo(e.target.value)}
                className="w-full bg-white/5 border border-white/15 rounded-xl px-3 py-2 text-sm text-white"
              />
            </div>

            <button
              type="submit"
              className="w-full bg-amber-500 hover:bg-amber-400 text-slate-950 font-black py-3 rounded-2xl text-sm shadow-lg shadow-amber-500/25 active:scale-95 transition"
            >
              SALVAR ABASTECIMENTO
            </button>
          </form>
        )}

        {/* 4. ABA DESPESA GERAL */}
        {activeTab === 'expense' && (
          <form onSubmit={handleExpenseSubmit} className="space-y-3.5">
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                  <Tag className="w-3.5 h-3.5 text-rose-400" />
                  Categoria da Despesa
                </label>
                <div className="flex items-center gap-1.5">
                  {customExpenseCategories.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setIsManagingCategories(!isManagingCategories)}
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-lg transition border flex items-center gap-1 ${
                        isManagingCategories
                          ? 'bg-rose-500/20 text-rose-300 border-rose-500/30'
                          : 'bg-white/5 text-slate-400 border-white/10 hover:text-white'
                      }`}
                      title="Gerenciar categorias personalizadas"
                    >
                      <Settings2 className="w-3 h-3" />
                      {isManagingCategories ? 'Fechar' : `Gerenciar (${customExpenseCategories.length})`}
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => {
                      setIsCreatingCategory(!isCreatingCategory);
                      setIsManagingCategories(false);
                    }}
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-lg transition border flex items-center gap-1 ${
                      isCreatingCategory
                        ? 'bg-rose-500/20 text-rose-300 border-rose-500/30'
                        : 'bg-rose-500/10 text-rose-400 border-rose-500/20 hover:bg-rose-500/20'
                    }`}
                  >
                    <Plus className="w-3 h-3" />
                    Nova Categoria
                  </button>
                </div>
              </div>

              {/* Criador Rápido de Nova Categoria */}
              {isCreatingCategory && (
                <div className="mb-2.5 p-2.5 bg-rose-950/30 border border-rose-500/30 rounded-xl space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-rose-300 flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-rose-400" />
                      Criar Categoria Personalizada
                    </span>
                    <button
                      type="button"
                      onClick={() => setIsCreatingCategory(false)}
                      className="text-slate-400 hover:text-white"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={newCategoryName}
                      onChange={e => setNewCategoryName(e.target.value)}
                      onKeyDown={e => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleCreateCategory();
                        }
                      }}
                      placeholder="Ex: Multas, Limpeza, Água e Balas..."
                      className="flex-1 bg-slate-900 border border-white/20 rounded-lg px-2.5 py-1.5 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-rose-500"
                      autoFocus
                    />
                    <button
                      type="button"
                      disabled={!newCategoryName.trim()}
                      onClick={() => handleCreateCategory()}
                      className="bg-rose-500 hover:bg-rose-400 disabled:opacity-50 text-slate-950 font-black px-3 py-1.5 rounded-lg text-xs flex items-center gap-1 active:scale-95 transition"
                    >
                      <Check className="w-3 h-3 stroke-[3]" />
                      Adicionar
                    </button>
                  </div>

                  {/* Sugestões rápidas de 1 toque */}
                  <div className="flex items-center gap-1.5 flex-wrap pt-0.5">
                    <span className="text-[10px] text-slate-400">Sugestões:</span>
                    {['Multas', 'Limpeza', 'Alimentação', 'Acessórios', 'Água & Balas', 'Pedágio Sem Parar']
                      .filter(sug => !expenseCategories.includes(sug))
                      .map(sug => (
                        <button
                          key={sug}
                          type="button"
                          onClick={() => handleCreateCategory(sug)}
                          className="text-[10px] bg-white/5 hover:bg-white/10 text-slate-300 px-2 py-0.5 rounded-md border border-white/10 transition flex items-center gap-1"
                        >
                          <Plus className="w-2.5 h-2.5" />
                          {sug}
                        </button>
                      ))}
                  </div>
                </div>
              )}

              {/* Gerenciamento de Categorias Personalizadas */}
              {isManagingCategories && customExpenseCategories.length > 0 && (
                <div className="mb-2.5 p-2.5 bg-slate-900 border border-white/15 rounded-xl space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-slate-300 flex items-center gap-1.5">
                      <Settings2 className="w-3.5 h-3.5 text-slate-400" />
                      Minhas Categorias Personalizadas ({customExpenseCategories.length})
                    </span>
                    <button
                      type="button"
                      onClick={() => setIsManagingCategories(false)}
                      className="text-slate-400 hover:text-white"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto pr-1">
                    {customExpenseCategories.map(cat => (
                      <div
                        key={cat}
                        className="inline-flex items-center gap-1 bg-white/5 border border-white/10 rounded-lg px-2 py-1 text-xs text-white"
                      >
                        <span>{getCategoryIcon(cat)} {cat}</span>
                        <button
                          type="button"
                          onClick={() => {
                            removeCustomExpenseCategory(cat);
                            if (expCategory === cat) {
                              setExpCategory('Alimentação');
                            }
                          }}
                          className="text-slate-400 hover:text-rose-400 ml-1 transition"
                          title={`Remover categoria ${cat}`}
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Chips rápidos de 1 toque (personalizadas + comuns) */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1.5 pt-0.5 no-scrollbar">
                {displayCategoryChips.map(cat => {
                  const isSelected = expCategory === cat;
                  const isCustom = customExpenseCategories.includes(cat);
                  return (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => setExpCategory(cat as ExpenseCategory)}
                      className={`px-2.5 py-1 rounded-xl text-xs font-semibold whitespace-nowrap transition flex items-center gap-1.5 border ${
                        isSelected
                          ? 'bg-rose-500 text-slate-950 border-rose-400 font-bold shadow-md shadow-rose-500/20'
                          : isCustom
                          ? 'bg-rose-950/40 text-rose-300 border-rose-500/30 hover:bg-rose-900/40'
                          : 'bg-white/5 text-slate-300 border-white/10 hover:bg-white/10'
                      }`}
                    >
                      <span>{getCategoryIcon(cat)}</span>
                      <span>{cat}</span>
                      {isCustom && !isSelected && (
                        <span className="w-1.5 h-1.5 rounded-full bg-rose-400 inline-block" title="Personalizada" />
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Dropdown com todas as categorias organizadas */}
              <div className="mt-1.5">
                <select
                  value={expCategory}
                  onChange={e => setExpCategory(e.target.value as ExpenseCategory)}
                  className="w-full bg-slate-900 border border-white/15 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-rose-500 font-medium"
                >
                  {customExpenseCategories.length > 0 && (
                    <optgroup label="✨ Minhas Categorias Personalizadas">
                      {customExpenseCategories.map(cat => (
                        <option key={`custom-${cat}`} value={cat}>
                          ⭐ {cat} (Personalizada)
                        </option>
                      ))}
                    </optgroup>
                  )}
                  <optgroup label="📁 Categorias Padrão">
                    {DEFAULT_EXPENSE_CATEGORIES.map(cat => (
                      <option key={`def-${cat}`} value={cat}>
                        {getCategoryIcon(cat)} {cat}
                      </option>
                    ))}
                  </optgroup>
                </select>
              </div>
            </div>

            <div>
              <label className="text-[11px] font-bold text-slate-400 uppercase block mb-1">Valor da Despesa (R$)</label>
              <input
                type="number"
                step="0.01"
                required
                value={expAmount}
                onChange={e => setExpAmount(e.target.value)}
                placeholder="0.00"
                className="w-full bg-white/5 border border-white/15 rounded-xl px-3 py-2.5 text-base font-black text-rose-400 focus:outline-none focus:border-rose-500"
              />
            </div>

            <div>
              <label className="text-[11px] font-bold text-slate-400 uppercase block mb-1">Descrição</label>
              <input
                type="text"
                value={expDesc}
                onChange={e => setExpDesc(e.target.value)}
                placeholder="Ex: Almoço no Centro, Ducha Rápida..."
                className="w-full bg-white/5 border border-white/15 rounded-xl px-3 py-2 text-sm text-white"
              />
            </div>

            <button
              type="submit"
              className="w-full bg-rose-500 hover:bg-rose-400 text-slate-950 font-black py-3 rounded-2xl text-sm shadow-lg shadow-rose-500/25 active:scale-95 transition"
            >
              SALVAR DESPESA
            </button>
          </form>
        )}

        {/* 5. ABA MANUTENÇÃO */}
        {activeTab === 'maintenance' && (
          <form onSubmit={handleMaintSubmit} className="space-y-3.5">
            <div>
              <label className="text-[11px] font-bold text-slate-400 uppercase block mb-1">Serviço de Manutenção</label>
              <select
                value={maintCategory}
                onChange={e => setMaintCategory(e.target.value as MaintenanceCategory)}
                className="w-full bg-slate-900 border border-white/15 rounded-xl px-3 py-2.5 text-xs text-white"
              >
                <option value="Troca de Óleo">Troca de Óleo & Filtros</option>
                <option value="Freios">Pastilhas & Discos de Freio</option>
                <option value="Pneus">Troca ou Rodízio de Pneus</option>
                <option value="Bateria">Bateria</option>
                <option value="Suspensão">Suspensão & Amortecedores</option>
                <option value="Alinhamento">Alinhamento & Balanceamento</option>
                <option value="Revisão Periódica">Revisão Periódica Completa</option>
                <option value="Outros">Outro Reparo</option>
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] font-bold text-slate-400 uppercase block mb-1">Valor Total (R$)</label>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={maintAmount}
                  onChange={e => setMaintAmount(e.target.value)}
                  placeholder="280.00"
                  className="w-full bg-white/5 border border-white/15 rounded-xl px-3 py-2 text-sm font-black text-indigo-400"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-400 uppercase block mb-1">KM Atual</label>
                <input
                  type="number"
                  value={maintOdo}
                  onChange={e => {
                    setMaintOdo(e.target.value);
                    const curr = parseInt(e.target.value) || 0;
                    setMaintNextOdo((curr + 10000).toString());
                  }}
                  className="w-full bg-white/5 border border-white/15 rounded-xl px-3 py-2 text-sm text-white"
                />
              </div>
            </div>

            <div>
              <label className="text-[11px] font-bold text-slate-400 uppercase block mb-1">
                Próxima Troca / Alerta em (KM)
              </label>
              <input
                type="number"
                value={maintNextOdo}
                onChange={e => setMaintNextOdo(e.target.value)}
                className="w-full bg-white/5 border border-white/15 rounded-xl px-3 py-2 text-sm text-amber-300 font-bold"
              />
              <span className="text-[10px] text-slate-400 mt-1 block">
                O aplicativo avisará quando seu carro se aproximar desta quilometragem.
              </span>
            </div>

            <div>
              <label className="text-[11px] font-bold text-slate-400 uppercase block mb-1">Descrição das Peças / Oficina</label>
              <input
                type="text"
                value={maintDesc}
                onChange={e => setMaintDesc(e.target.value)}
                placeholder="Ex: Óleo Sintético 5W30 + Filtro de Ar"
                className="w-full bg-white/5 border border-white/15 rounded-xl px-3 py-2 text-sm text-white"
              />
            </div>

            <button
              type="submit"
              className="w-full bg-indigo-500 hover:bg-indigo-400 text-slate-950 font-black py-3 rounded-2xl text-sm shadow-lg shadow-indigo-500/25 active:scale-95 transition"
            >
              SALVAR MANUTENÇÃO COM ALERTA
            </button>
          </form>
        )}
      </div>
    </div>
  );
};
