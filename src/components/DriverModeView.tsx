import React, { useState, useEffect } from 'react';
import { useDriver } from '../context/DriverContext';
import { useDriverVoice } from '../hooks/useDriverVoice';
import {
  formatCurrency,
  formatKm,
  formatTimer,
  calcDailyFuelAdvisor,
  calcRealCarCost,
} from '../utils/calc';
import {
  Car,
  Mic,
  MicOff,
  Play,
  Square,
  DollarSign,
  TrendingUp,
  Fuel,
  Clock,
  Check,
  X,
  Volume2,
  VolumeX,
  ShieldAlert,
  ArrowLeft,
  Sparkles,
  Zap,
  Calculator,
  Compass,
  Gauge,
  PlusCircle,
} from 'lucide-react';
import { analyzeRide } from '../utils/calc';

interface DriverModeViewProps {
  onExitDriverMode: () => void;
  onOpenVoiceModal: () => void;
  onOpenShiftModal?: () => void;
}

export const DriverModeView: React.FC<DriverModeViewProps> = ({
  onExitDriverMode,
  onOpenVoiceModal,
  onOpenShiftModal,
}) => {
  const {
    profile,
    vehicle,
    activeSession,
    earnings,
    expenses,
    fuelRecords,
    startShift,
    endShift,
    addEarning,
    addExpense,
    addFuelRecord,
    activeStrategy,
  } = useDriver();

  const {
    isListening,
    transcript,
    interimTranscript,
    isSpeaking,
    voiceFeedbackEnabled,
    setVoiceFeedbackEnabled,
    startListening,
    stopListening,
    processInputText,
    currentProposal,
    confirmCurrentProposal,
    cancelCurrentProposal,
    dialogHistory,
  } = useDriverVoice();

  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [showQuickRideModal, setShowQuickRideModal] = useState(false);
  const [hudGross, setHudGross] = useState('35.00');
  const [hudDistance, setHudDistance] = useState('12.0');
  const [hudDuration, setHudDuration] = useState('20');
  const [hudDeadhead, setHudDeadhead] = useState('2.0');

  // Timer do expediente ativo
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (activeSession) {
      const startMs = new Date(activeSession.startTime).getTime();
      const updateTimer = () => {
        const now = Date.now();
        setElapsedSeconds(Math.max(0, Math.floor((now - startMs) / 1000)));
      };
      updateTimer();
      timer = setInterval(updateTimer, 1000);
    } else {
      setElapsedSeconds(0);
    }
    return () => clearInterval(timer);
  }, [activeSession]);

  const todayStr = new Date().toISOString().split('T')[0];
  const todayEarnings = earnings.filter(e => e.date === todayStr);
  const todayGross = todayEarnings.reduce((acc, e) => acc + e.amount, 0);
  const todayExpenses = expenses.filter(e => e.date === todayStr).reduce((acc, e) => acc + e.amount, 0);
  const todayNet = todayGross - todayExpenses;
  const dailyGoal = profile.dailyGoal || 250;
  const goalProgress = Math.min(100, Math.round((todayGross / dailyGoal) * 100));

  const fuelAdvisor = calcDailyFuelAdvisor(
    vehicle,
    fuelRecords,
    120,
    false,
    null,
    profile.gasPriceReference || 5.89
  );

  const realCost = calcRealCarCost(
    vehicle,
    profile.gasPriceReference || 5.89,
    expenses,
    vehicle.currentOdometer
  );

  // Última mensagem do assistente para exibição grande no cockpit
  const lastAssistantMessage = [...dialogHistory].reverse().find(m => m.sender === 'assistant');

  return (
    <div className="fixed inset-0 z-50 bg-slate-950 text-white flex flex-col justify-between p-4 sm:p-6 select-none overflow-y-auto">
      
      {/* 1. TOPO: HEADER DO COCKPIT & SAÍDA */}
      <div className="flex items-center justify-between border-b border-white/10 pb-3 shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-amber-500 to-orange-400 flex items-center justify-center text-slate-950 font-black shrink-0 shadow-lg shadow-amber-500/20">
            <Car className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-black tracking-wide text-white flex items-center gap-1.5">
                MODO MOTORISTA
              </h1>
              <span className="text-[10px] bg-amber-500/20 text-amber-300 font-bold px-2 py-0.5 rounded-full border border-amber-500/30">
                COCKPIT SEGURO
              </span>
            </div>
            <p className="text-xs text-slate-400 font-medium">
              Tipografia ampliada & Comandos por voz para o trânsito
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setVoiceFeedbackEnabled(!voiceFeedbackEnabled)}
            className={`p-2.5 rounded-2xl border transition ${
              voiceFeedbackEnabled
                ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                : 'bg-white/5 text-slate-500 border-white/5'
            }`}
            title="Voz sintetizada ativada/desativada"
          >
            {voiceFeedbackEnabled ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
          </button>

          <button
            type="button"
            onClick={onExitDriverMode}
            className="px-4 py-2.5 rounded-2xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs flex items-center gap-1.5 border border-white/10 transition"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Voltar ao App</span>
          </button>
        </div>
      </div>

      {/* 2. CENTRO: MÉTRICAS GIGANTES DE ALTO CONTRASTE */}
      <div className="my-auto py-4 space-y-4 max-w-4xl mx-auto w-full">
        
        {/* CARD PRINCIPAL DE FATURAMENTO & META */}
        <div className="bg-slate-900/90 border border-white/15 rounded-3xl p-5 sm:p-7 shadow-2xl space-y-4">
          {/* ESTRATÉGIA ATIVA & REGRAS DE OURO */}
          {activeStrategy && (
            <div className="bg-emerald-950/40 border border-emerald-500/30 p-2.5 sm:p-3 rounded-2xl flex items-center justify-between gap-2 text-xs flex-wrap">
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded-lg bg-emerald-500 text-slate-950 font-black text-[10px] uppercase">
                  Estratégia
                </span>
                <span className="font-bold text-white text-xs truncate max-w-[180px] sm:max-w-none">
                  {activeStrategy.name}
                </span>
              </div>
              <div className="flex items-center gap-2 text-[11px] font-bold text-emerald-300">
                <span>🎯 Min. {formatCurrency(activeStrategy.acceptanceRules.minRateKm)}/km</span>
                <span className="text-slate-500">•</span>
                <span>⏱️ Min. {formatCurrency(activeStrategy.acceptanceRules.minRateHour)}/h</span>
              </div>
            </div>
          )}

          <div className="flex items-center justify-between flex-wrap gap-2">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
              <DollarSign className="w-4 h-4 text-emerald-400" />
              Faturamento Hoje
            </span>

            {/* STATUS DO EXPEDIENTE */}
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono font-bold text-slate-300 bg-white/10 px-2.5 py-1 rounded-xl">
                {activeSession ? `⏱️ ${formatTimer(elapsedSeconds)}` : 'Expediente Parado'}
              </span>
              <span
                className={`text-xs font-black px-2.5 py-1 rounded-xl border ${
                  activeSession
                    ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 animate-pulse'
                    : 'bg-white/5 text-slate-400 border-white/10'
                }`}
              >
                {activeSession ? 'RODANDO' : 'OFFLINE'}
              </span>
            </div>
          </div>

          <div className="flex items-baseline justify-between flex-wrap gap-2">
            <div className="text-4xl sm:text-6xl font-black text-emerald-400 tracking-tight font-mono">
              {formatCurrency(todayGross)}
            </div>

            <div className="text-right">
              <div className="text-xs font-bold text-slate-400">Meta: {formatCurrency(dailyGoal)}</div>
              <div className="text-lg sm:text-xl font-black text-white">{goalProgress}% atingido</div>
            </div>
          </div>

          {/* BARRA DE PROGRESSO DA META */}
          <div className="w-full bg-white/10 h-3 rounded-full overflow-hidden">
            <div
              className="bg-gradient-to-r from-emerald-500 to-teal-400 h-full rounded-full transition-all duration-500"
              style={{ width: `${Math.min(100, goalProgress)}%` }}
            />
          </div>

          {/* LINHA DE SUB-MÉTRICAS */}
          <div className="grid grid-cols-3 gap-2 pt-2 border-t border-white/10 text-center">
            <div className="bg-white/5 p-2.5 rounded-2xl">
              <span className="text-[10px] text-slate-400 block font-semibold">Lucro Líquido</span>
              <strong className="text-sm sm:text-base font-black text-white font-mono">
                {formatCurrency(todayNet)}
              </strong>
            </div>

            <div className="bg-white/5 p-2.5 rounded-2xl">
              <span className="text-[10px] text-slate-400 block font-semibold">Tanque / Autonomia</span>
              <strong className="text-sm sm:text-base font-black text-amber-300 font-mono">
                {fuelAdvisor.currentTankPct}% ({formatKm(fuelAdvisor.currentRangeKm)})
              </strong>
            </div>

            <div className="bg-white/5 p-2.5 rounded-2xl">
              <span className="text-[10px] text-slate-400 block font-semibold">Custo Real / KM</span>
              <strong className="text-sm sm:text-base font-black text-sky-300 font-mono">
                {formatCurrency(realCost.totalCostPerKm)}
              </strong>
            </div>
          </div>
        </div>

        {/* FEEDBACK DO ASSISTENTE / TRANSCRIÇÃO DE VOZ ATIVA */}
        {(isListening || interimTranscript || transcript || currentProposal || lastAssistantMessage) && (
          <div className="bg-emerald-950/40 border border-emerald-500/30 rounded-3xl p-4 sm:p-5 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black text-emerald-400 flex items-center gap-1.5 uppercase">
                <Sparkles className="w-3.5 h-3.5" />
                Driver Voice:
              </span>
              {isListening && (
                <span className="text-xs font-bold text-rose-400 animate-pulse flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping" />
                  Ouvindo agora...
                </span>
              )}
            </div>

            <p className="text-base sm:text-lg font-bold text-white leading-snug">
              {interimTranscript
                ? `"${interimTranscript}..."`
                : currentProposal
                ? currentProposal.speechResponse
                : lastAssistantMessage
                ? lastAssistantMessage.text
                : 'Fale um comando como "Fiz 200 reais na Uber" ou "Quanto ganhei hoje?"'}
            </p>

            {/* BOTÕES GRANDES DE CONFIRMAÇÃO SE HOUVER PROPOSTA */}
            {currentProposal && (
              <div className="flex items-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={cancelCurrentProposal}
                  className="flex-1 bg-white/10 hover:bg-white/20 text-slate-200 py-3 rounded-2xl font-bold text-sm transition"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={confirmCurrentProposal}
                  className="flex-1 bg-emerald-500 hover:bg-emerald-400 text-slate-950 py-3 rounded-2xl font-black text-sm transition flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/30"
                >
                  <Check className="w-4 h-4" />
                  <span>Confirmar & Salvar</span>
                </button>
              </div>
            )}
          </div>
        )}

        {/* 3. BOTÃO GIGANTE DE MICROFONE DO COCKPIT */}
        <div className="flex flex-col items-center justify-center gap-2 py-2">
          <button
            type="button"
            onClick={() => {
              if (isListening) {
                stopListening();
              } else {
                startListening();
              }
            }}
            className={`w-24 h-24 sm:w-28 sm:h-28 rounded-full flex flex-col items-center justify-center transition-all shadow-2xl active:scale-95 ${
              isListening
                ? 'bg-rose-500 text-white animate-pulse shadow-rose-500/50 ring-8 ring-rose-500/30'
                : 'bg-gradient-to-tr from-emerald-500 to-teal-400 text-slate-950 hover:brightness-110 shadow-emerald-500/40 ring-4 ring-emerald-500/20'
            }`}
          >
            <Mic className="w-10 h-10 sm:w-12 sm:h-12" />
            <span className="text-[10px] font-black tracking-wider uppercase mt-1">
              {isListening ? 'Parar' : 'Falar'}
            </span>
          </button>
          <span className="text-xs text-slate-400 font-bold">
            {isListening ? 'Ouvindo... Toque para finalizar' : 'Toque no microfone para falar'}
          </span>
        </div>

        {/* 4. ATALHOS RÁPIDOS DE 1 TOQUE PARA MOTORISTA */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
          
          {/* EXPEDIENTE INICIAR / FINALIZAR */}
          {!activeSession ? (
            <button
              type="button"
              onClick={() => {
                if (onOpenShiftModal) {
                  onOpenShiftModal();
                } else {
                  processInputText('Começar expediente');
                }
              }}
              className="bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/40 p-3 rounded-2xl text-left transition"
            >
              <div className="flex items-center gap-1.5 text-emerald-300 font-black text-xs">
                <Play className="w-3.5 h-3.5 fill-current" />
                Iniciar Turno
              </div>
              <p className="text-[10px] text-slate-400 mt-1">Abrir cronômetro e KM</p>
            </button>
          ) : (
            <button
              type="button"
              onClick={() => {
                if (onOpenShiftModal) {
                  onOpenShiftModal();
                } else {
                  processInputText('Finalizar expediente');
                }
              }}
              className="bg-rose-500/20 hover:bg-rose-500/30 border border-rose-500/40 p-3 rounded-2xl text-left transition"
            >
              <div className="flex items-center gap-1.5 text-rose-300 font-black text-xs">
                <Square className="w-3.5 h-3.5 fill-current" />
                Finalizar Turno
              </div>
              <p className="text-[10px] text-slate-400 mt-1">Cálculo de custos por KM</p>
            </button>
          )}

          {/* GANHO RÁPIDO +R$50 */}
          <button
            type="button"
            onClick={() => processInputText('Fiz 50 reais na Uber')}
            className="bg-white/5 hover:bg-white/10 border border-white/10 p-3 rounded-2xl text-left transition"
          >
            <div className="flex items-center gap-1.5 text-white font-black text-xs">
              <DollarSign className="w-3.5 h-3.5 text-emerald-400" />
              +R$ 50 Uber
            </div>
            <p className="text-[10px] text-slate-400 mt-1">Lançamento de ganho</p>
          </button>

          {/* CONSULTA "QUANTO GANHEI HOJE?" */}
          <button
            type="button"
            onClick={() => processInputText('Quanto ganhei hoje?')}
            className="bg-white/5 hover:bg-white/10 border border-white/10 p-3 rounded-2xl text-left transition"
          >
            <div className="flex items-center gap-1.5 text-white font-black text-xs">
              <TrendingUp className="w-3.5 h-3.5 text-sky-400" />
              Quanto Ganhei?
            </div>
            <p className="text-[10px] text-slate-400 mt-1">Relatório falado</p>
          </button>

          {/* ANALISAR CORRIDA EM 3s (FASE F) */}
          <button
            type="button"
            onClick={() => setShowQuickRideModal(true)}
            className="bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 p-3 rounded-2xl text-left transition"
          >
            <div className="flex items-center gap-1.5 text-emerald-300 font-black text-xs">
              <Calculator className="w-3.5 h-3.5" />
              Analisar Corrida
            </div>
            <p className="text-[10px] text-slate-400 mt-1">Score & Retorno Vazio</p>
          </button>

          {/* ABASTECER */}
          <button
            type="button"
            onClick={() => processInputText('Abasteci 30 litros de combustível')}
            className="bg-white/5 hover:bg-white/10 border border-white/10 p-3 rounded-2xl text-left transition"
          >
            <div className="flex items-center gap-1.5 text-white font-black text-xs">
              <Fuel className="w-3.5 h-3.5 text-amber-400" />
              Abastecer 30L
            </div>
            <p className="text-[10px] text-slate-400 mt-1">Registrar combustível</p>
          </button>
        </div>
      </div>

      {/* MODAL HUD: ANALISADOR EXPRESSO DE CORRIDA (FASE F) */}
      {showQuickRideModal && (() => {
        const parsedG = parseFloat(hudGross) || 0;
        const parsedD = parseFloat(hudDistance) || 0.1;
        const parsedT = parseFloat(hudDuration) || 1;
        const parsedDh = parseFloat(hudDeadhead) || 0;
        const quickAnalysis = analyzeRide(
          parsedG,
          parsedD,
          parsedT,
          vehicle,
          profile.minAcceptableRateKm,
          profile.minAcceptableRateHour,
          profile.gasPriceReference,
          parsedDh
        );

        return (
          <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
            <div className="bg-slate-900 border border-emerald-500/30 rounded-3xl p-6 max-w-md w-full space-y-4 shadow-2xl animate-fadeIn">
              <div className="flex items-center justify-between border-b border-white/10 pb-3">
                <div className="flex items-center gap-2">
                  <Calculator className="w-5 h-5 text-emerald-400" />
                  <h3 className="text-sm font-black text-white uppercase tracking-wider">
                    Análise Rápida de Corrida
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setShowQuickRideModal(false)}
                  className="p-1.5 rounded-xl bg-white/10 text-slate-400 hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* INPUTS GIGANTES */}
              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase">Valor (R$)</label>
                  <input
                    type="number"
                    step="0.5"
                    value={hudGross}
                    onChange={e => setHudGross(e.target.value)}
                    className="w-full bg-black/50 border border-white/20 rounded-xl px-3 py-2 text-lg font-black text-emerald-400"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase">Distância (KM)</label>
                  <input
                    type="number"
                    step="0.5"
                    value={hudDistance}
                    onChange={e => setHudDistance(e.target.value)}
                    className="w-full bg-black/50 border border-white/20 rounded-xl px-3 py-2 text-lg font-black text-white"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase">Tempo (min)</label>
                  <input
                    type="number"
                    value={hudDuration}
                    onChange={e => setHudDuration(e.target.value)}
                    className="w-full bg-black/50 border border-white/20 rounded-xl px-3 py-2 text-lg font-black text-white"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-amber-400 uppercase">Volta Vazia (KM)</label>
                  <input
                    type="number"
                    step="0.5"
                    value={hudDeadhead}
                    onChange={e => setHudDeadhead(e.target.value)}
                    className="w-full bg-black/50 border border-amber-500/30 rounded-xl px-3 py-2 text-lg font-black text-amber-300"
                  />
                </div>
              </div>

              {/* VEREDITO */}
              <div className={`p-4 rounded-2xl border ${
                quickAnalysis.status === 'EXCELLENT'
                  ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300'
                  : quickAnalysis.status === 'FAIR'
                  ? 'bg-amber-500/20 border-amber-500/40 text-amber-300'
                  : 'bg-rose-500/20 border-rose-500/40 text-rose-300'
              }`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-2xl font-black">{quickAnalysis.score ?? 0}</span>
                    <div>
                      <span className="text-[9px] uppercase font-bold tracking-wider block opacity-80">SCORE CORRIDA</span>
                      <strong className="text-xs uppercase">
                        {quickAnalysis.status === 'EXCELLENT' ? '🟢 ACEITAR' : quickAnalysis.status === 'FAIR' ? '🟡 AVALIAR' : '🔴 RECUSAR'}
                      </strong>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-[9px] uppercase font-bold text-slate-300 block">Líquido</span>
                    <span className="text-base font-black text-white">{formatCurrency(quickAnalysis.estimatedNetProfit)}</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 mt-2 pt-2 border-t border-white/10 text-center text-xs">
                  <div>
                    <span className="text-[9px] text-slate-400 block uppercase">R$/KM Real</span>
                    <strong className="text-white">{formatCurrency(quickAnalysis.effectiveRatePerKm ?? quickAnalysis.ratePerKm)}/km</strong>
                  </div>
                  <div>
                    <span className="text-[9px] text-slate-400 block uppercase">R$/Hora Real</span>
                    <strong className="text-white">{formatCurrency(quickAnalysis.effectiveRatePerHour ?? quickAnalysis.ratePerHour)}/h</strong>
                  </div>
                </div>
              </div>

              {/* BOTÕES DE AÇÃO */}
              <div className="flex items-center gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setShowQuickRideModal(false)}
                  className="flex-1 py-2.5 rounded-xl bg-white/10 hover:bg-white/15 text-slate-300 font-bold text-xs"
                >
                  Fechar
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (parsedG > 0) {
                      addEarning({
                        amount: parsedG,
                        platform: 'Uber',
                        trips: 1,
                        date: todayStr,
                        time: new Date().toTimeString().slice(0, 5),
                        notes: `Corrida rápida HUD: ${parsedD}km (Score ${quickAnalysis.score})`,
                      });
                      setShowQuickRideModal(false);
                    }
                  }}
                  className="flex-1 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs shadow-lg shadow-emerald-500/20"
                >
                  Lançar Ganho (+{formatCurrency(parsedG)})
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* 5. RODAPÉ: AVISO OBRIGATÓRIO DE SEGURANÇA NO TRÂNSITO (ITEM 49) */}
      <div className="border-t border-white/10 pt-3 flex items-center justify-between text-xs text-slate-400 shrink-0 gap-2">
        <div className="flex items-center gap-2">
          <ShieldAlert className="w-4 h-4 text-amber-400 shrink-0" />
          <span className="text-[11px] leading-tight">
            <strong>Segurança no trânsito:</strong> Comandos de voz não substituem a atenção do motorista à direção e devem ser utilizados somente quando for seguro fazê-lo.
          </span>
        </div>

        <button
          type="button"
          onClick={onOpenVoiceModal}
          className="text-emerald-400 hover:text-emerald-300 font-bold text-[11px] underline shrink-0 whitespace-nowrap"
        >
          Histórico Completo
        </button>
      </div>

    </div>
  );
};
