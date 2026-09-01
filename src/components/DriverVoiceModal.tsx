import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useDriver } from '../context/DriverContext';
import {
  parseVoiceIntent,
  ParsedVoiceIntent,
  VoiceEntities,
} from '../utils/voiceUtils';
import { ConversationContext } from '../services/voiceParser';
import { formatCurrency, formatKm, calcShiftCostsFromKm } from '../utils/calc';
import { PlatformType, ExpenseCategory } from '../types';
import {
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  Send,
  Trash2,
  X,
  Sparkles,
  Check,
  AlertCircle,
  Car,
  Fuel,
  TrendingUp,
  DollarSign,
  Calendar,
  Layers,
  ArrowRight,
  Shield,
  HelpCircle,
  Tag,
  Clock,
  MapPin,
  RefreshCw,
  Zap,
} from 'lucide-react';

interface DriverVoiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenDriverMode?: () => void;
}

export interface ModalChatMessage {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  timestamp: string;
  intent?: string;
  confidenceScore?: number;
  requiresConfirmation?: boolean;
  isAmbiguous?: boolean;
  proposal?: ParsedVoiceIntent;
  isActionExecuted?: boolean;
  source?: 'gemini' | 'rule_based_fallback';
  missingParameters?: string[];
}

export const DriverVoiceModal: React.FC<DriverVoiceModalProps> = ({
  isOpen,
  onClose,
  onOpenDriverMode,
}) => {
  const {
    profile,
    vehicle,
    activeSession,
    sessions,
    earnings,
    expenses,
    fuelRecords,
    plannerEvents,
    addEarning,
    addExpense,
    addFuelRecord,
    addPlannerEvent,
    startShift,
    endShift,
    updateProfile,
    activeStrategy,
  } = useDriver();

  const [isListening, setIsListening] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [interimTranscript, setInterimTranscript] = useState('');
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [speechError, setSpeechError] = useState<string | null>(null);
  const [voiceFeedbackEnabled, setVoiceFeedbackEnabled] = useState<boolean>(() => {
    const saved = localStorage.getItem('@driver_voice_tts_enabled');
    return saved !== null ? saved === 'true' : true;
  });

  const [dialogHistory, setDialogHistory] = useState<ModalChatMessage[]>([
    {
      id: 'msg-welcome',
      sender: 'assistant',
      text: 'Olá! Sou o Driver Voice com motor Gemini 3.7 Flash. Você pode falar seus ganhos, despesas, combustível, escala de trabalho ou pedir relatórios e análises.',
      timestamp: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
    },
  ]);

  const [currentProposal, setCurrentProposal] = useState<ParsedVoiceIntent | null>(null);
  const [typedInput, setTypedInput] = useState('');

  const contextRef = useRef<ConversationContext>({});
  const recognitionRef = useRef<any>(null);
  const chatBottomRef = useRef<HTMLDivElement>(null);

  // Verificar se o navegador suporta Web Speech API
  const isSpeechSupported =
    typeof window !== 'undefined' &&
    ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window);

  useEffect(() => {
    localStorage.setItem('@driver_voice_tts_enabled', String(voiceFeedbackEnabled));
  }, [voiceFeedbackEnabled]);

  useEffect(() => {
    if (isOpen) {
      chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [isOpen, dialogHistory, interimTranscript, isAnalyzing]);

  // Síntese de Voz (TTS)
  const speakText = useCallback(
    (text: string) => {
      if (!voiceFeedbackEnabled || typeof window === 'undefined' || !('speechSynthesis' in window)) {
        return;
      }

      try {
        window.speechSynthesis.cancel();
        const cleanText = text.replace(/R\$\s*/g, 'reais ').replace(/\*/g, '');
        const utterance = new SpeechSynthesisUtterance(cleanText);
        utterance.lang = 'pt-BR';
        utterance.rate = 1.05;
        utterance.pitch = 1.0;

        utterance.onstart = () => setIsSpeaking(true);
        utterance.onend = () => setIsSpeaking(false);
        utterance.onerror = () => setIsSpeaking(false);

        const voices = window.speechSynthesis.getVoices();
        const ptVoice = voices.find(
          v => v.lang.includes('pt-BR') || v.lang.includes('pt_BR') || v.lang.includes('pt')
        );
        if (ptVoice) {
          utterance.voice = ptVoice;
        }

        window.speechSynthesis.speak(utterance);
      } catch (err) {
        console.error('SpeechSynthesis error:', err);
        setIsSpeaking(false);
      }
    },
    [voiceFeedbackEnabled]
  );

  const cancelSpeaking = useCallback(() => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
    }
  }, []);

  // Executa uma ação confirmada no DriverContext a partir do resultado estruturado
  const executeAction = useCallback(
    (parsed: ParsedVoiceIntent) => {
      const { intent, entities } = parsed;
      const todayStr = new Date().toISOString().split('T')[0];

      if (intent === 'CREATE_EARNING' && (entities.amount !== undefined || entities.platform)) {
        const amount = entities.amount || contextRef.current.lastAmount || 0;
        const platform = (entities.platform as PlatformType) || (contextRef.current.lastPlatform as PlatformType) || 'Uber';
        addEarning({
          platform,
          amount,
          tip: entities.tip || 0,
          tripsCount: entities.tripsCount || 1,
          date: entities.date || todayStr,
          notes: entities.notes || 'Registrado via Driver Voice',
        });
        contextRef.current.lastIntent = 'CREATE_EARNING';
        contextRef.current.lastAmount = amount;
        contextRef.current.lastPlatform = platform;
      } else if (intent === 'CREATE_EXPENSE' && entities.amount !== undefined) {
        const category = (entities.expenseCategory as ExpenseCategory) || 'Outros';
        addExpense({
          category,
          amount: entities.amount,
          date: entities.date || todayStr,
          notes: entities.notes || 'Registrado via Driver Voice',
        });
        contextRef.current.lastIntent = 'CREATE_EXPENSE';
        contextRef.current.lastAmount = entities.amount;
      } else if (intent === 'CREATE_FUEL') {
        const pricePerLiter = entities.pricePerLiter || (entities.amount && entities.liters ? Number((entities.amount / entities.liters).toFixed(2)) : 5.89);
        const liters = entities.liters || (entities.amount ? Number((entities.amount / pricePerLiter).toFixed(2)) : 0);
        const totalAmount = entities.amount || Number((liters * pricePerLiter).toFixed(2));
        
        addFuelRecord({
          liters,
          pricePerLiter,
          totalAmount,
          fuelType: (entities.fuelType as any) || 'Gasolina Comum',
          date: entities.date || todayStr,
          odometer: entities.odometer || vehicle.currentOdometer,
        });
        contextRef.current.lastIntent = 'CREATE_FUEL';
      } else if (intent === 'CREATE_PLANNER_EVENT') {
        addPlannerEvent({
          date: entities.date || todayStr,
          type: entities.isOffDay ? 'off' : 'work',
          startTime: entities.startTime || '07:00',
          endTime: entities.endTime || '17:00',
          targetEarnings: entities.targetAmount || 250,
          notes: entities.notes || 'Criado via Driver Voice',
        });
        contextRef.current.lastIntent = 'CREATE_PLANNER_EVENT';
      } else if (intent === 'REQUEST_WEEKLY_PLAN') {
        // Planejamento semanal padrão
        const days = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'];
        const curr = new Date();
        for (let i = 0; i < 7; i++) {
          const nextDay = new Date(curr);
          nextDay.setDate(curr.getDate() + ((i + 1 - curr.getDay() + 7) % 7));
          const dateStr = nextDay.toISOString().split('T')[0];
          const isOff = i === 6; // Domingo folga por padrão
          addPlannerEvent({
            date: dateStr,
            type: isOff ? 'off' : 'work',
            startTime: isOff ? '00:00' : '07:00',
            endTime: isOff ? '00:00' : '17:00',
            targetEarnings: isOff ? 0 : 250,
            notes: `Escala semanal gerada via Driver Voice (${days[i]})`,
          });
        }
        contextRef.current.lastIntent = 'REQUEST_WEEKLY_PLAN';
      } else if (intent === 'CREATE_GOAL') {
        const targetAmount = entities.targetAmount || entities.amount || 300;
        const goalType = entities.goalType || 'daily';
        if (goalType === 'daily') {
          updateProfile({ dailyGoal: targetAmount });
        } else if (goalType === 'monthly') {
          updateProfile({ monthlyGoal: targetAmount });
        }
        contextRef.current.lastIntent = 'CREATE_GOAL';
      } else if (intent === 'START_WORK_SESSION') {
        const startKm = entities.odometer || vehicle.currentOdometer;
        startShift(startKm);
        contextRef.current.lastIntent = 'START_WORK_SESSION';
      } else if (intent === 'END_WORK_SESSION') {
        const startKm = activeSession?.startOdometer || vehicle.currentOdometer;
        const endKm = entities.odometer || (entities.distanceKm ? startKm + entities.distanceKm : vehicle.currentOdometer + 100);
        const kmDriven = Math.max(0, endKm - startKm);
        const gasPrice = profile.gasPriceReference || vehicle.gasolinePrice || 5.89;
        const maintenanceRate = activeStrategy?.fuelAndMaintenancePlan.reserveMaintenancePerKm || 0.15;
        const costs = calcShiftCostsFromKm(kmDriven, vehicle, gasPrice, maintenanceRate);
        const autoFuel = costs.fuelCost;
        const totalGross = entities.amount || 0;
        endShift(endKm, totalGross, 0, 0, 0, autoFuel, `Encerrado via Driver Voice (${kmDriven} km rodados - Combustível R$ ${autoFuel.toFixed(2)})`);
        contextRef.current.lastIntent = 'END_WORK_SESSION';
      }

      setCurrentProposal(null);
      contextRef.current.pendingProposal = undefined;
    },
    [addEarning, addExpense, addFuelRecord, addPlannerEvent, startShift, endShift, updateProfile, vehicle, activeSession, profile, activeStrategy]
  );

  // Processa a fala ou texto chamando a utilidade parseVoiceIntent
  const handleProcessIntent = useCallback(
    async (userText: string) => {
      const trimmed = userText.trim();
      if (!trimmed) return;

      // Adiciona mensagem do motorista ao histórico
      const userMsgId = 'msg-usr-' + Date.now();
      setDialogHistory(prev => [
        ...prev,
        {
          id: userMsgId,
          sender: 'user',
          text: trimmed,
          timestamp: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
        },
      ]);

      setIsAnalyzing(true);

      const driverState = {
        odometer: vehicle.currentOdometer,
        dailyGoal: profile.dailyGoal,
        monthlyGoal: profile.monthlyGoal,
        activeSession: Boolean(activeSession),
        gasPriceReference: vehicle.gasolinePrice || 5.89,
      };

      try {
        // Chamada à função parseVoiceIntent
        const parsed: ParsedVoiceIntent = await parseVoiceIntent(
          trimmed,
          {
            context: contextRef.current,
            driverState,
          }
        );

        // Caso 1: Tratamento de Confirmação Falada Direta ("Sim", "Confirmar", "Pode salvar")
        if (parsed.intent === 'CONFIRM_ACTION' && currentProposal) {
          executeAction(currentProposal);
          const replyText = 'Ação confirmada e gravada no sistema com sucesso!';
          setDialogHistory(prev => [
            ...prev,
            {
              id: 'msg-asst-' + Date.now(),
              sender: 'assistant',
              text: replyText,
              timestamp: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
              isActionExecuted: true,
              confidenceScore: 1.0,
              source: parsed.source,
            },
          ]);
          speakText(replyText);
          return;
        }

        // Caso 2: Tratamento de Cancelamento Falado Direto ("Não", "Cancelar", "Deixa")
        if (parsed.intent === 'CANCEL_ACTION') {
          setCurrentProposal(null);
          contextRef.current.pendingProposal = undefined;
          const replyText = 'Operação cancelada.';
          setDialogHistory(prev => [
            ...prev,
            {
              id: 'msg-asst-' + Date.now(),
              sender: 'assistant',
              text: replyText,
              timestamp: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
              source: parsed.source,
            },
          ]);
          speakText(replyText);
          return;
        }

        // Caso 3: Faltam parâmetros específicos para completar a ação
        const hasMissingParameters =
          Array.isArray(parsed.missingParams) &&
          parsed.missingParams.length > 0 &&
          parsed.intent !== 'UNKNOWN' &&
          parsed.intent !== 'QUERY_DASHBOARD' &&
          parsed.intent !== 'QUERY_FUEL' &&
          parsed.intent !== 'QUERY_PERFORMANCE' &&
          parsed.intent !== 'QUERY_REPORT' &&
          parsed.intent !== 'QUERY_VEHICLE' &&
          parsed.intent !== 'QUERY_GOAL';

        if (hasMissingParameters) {
          setCurrentProposal(null);
          contextRef.current.pendingProposal = undefined;

          // Armazenar entidades parciais no contexto para complementar no próximo turno
          if (parsed.entities.amount) contextRef.current.lastAmount = parsed.entities.amount;
          if (parsed.entities.platform) contextRef.current.lastPlatform = parsed.entities.platform;
          contextRef.current.lastIntent = parsed.intent;

          const promptSpeech =
            parsed.speechResponse ||
            `Identifiquei seu comando de ${parsed.intent}, mas faltam as informações: ${parsed.missingParams.join(', ')}. Pode informar?`;

          setDialogHistory(prev => [
            ...prev,
            {
              id: 'msg-asst-' + Date.now(),
              sender: 'assistant',
              text: promptSpeech,
              timestamp: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
              intent: parsed.intent,
              proposal: parsed,
              confidenceScore: parsed.confidenceScore,
              source: parsed.source,
              missingParameters: parsed.missingParams,
            },
          ]);

          speakText(promptSpeech);
          return;
        }

        // Caso 4: Intenção Ambígua ou Baixa Confiança ou Exige Confirmação Prévia
        const isAmbiguous =
          parsed.intent === 'AMBIGUOUS' ||
          (parsed.confidenceScore < 0.75 && parsed.intent !== 'UNKNOWN') ||
          Boolean(parsed.requiresConfirmation) ||
          parsed.intent === 'END_WORK_SESSION' ||
          parsed.intent === 'DELETE_PLANNER_EVENT';

        if (isAmbiguous) {
          setCurrentProposal(parsed);
          contextRef.current.pendingProposal = parsed;

          const confirmSpeech =
            parsed.speechResponse ||
            `Identifiquei uma intenção de ${parsed.intent}. Deseja confirmar e gravar no sistema?`;

          setDialogHistory(prev => [
            ...prev,
            {
              id: 'msg-asst-' + Date.now(),
              sender: 'assistant',
              text: confirmSpeech,
              timestamp: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
              intent: parsed.intent,
              requiresConfirmation: true,
              isAmbiguous: parsed.intent === 'AMBIGUOUS' || parsed.confidenceScore < 0.75,
              confidenceScore: parsed.confidenceScore,
              proposal: parsed,
              source: parsed.source,
            },
          ]);

          speakText(confirmSpeech);
          return;
        }

        // Caso 5: Execução Automática de Ações Confirmadas e Completas
        const isActionIntent = [
          'CREATE_EARNING',
          'CREATE_EXPENSE',
          'CREATE_FUEL',
          'CREATE_TRIP',
          'START_WORK_SESSION',
          'CREATE_PLANNER_EVENT',
          'CREATE_GOAL',
        ].includes(parsed.intent);

        if (isActionIntent) {
          // Execução automática com sucesso
          executeAction(parsed);
        }

        setCurrentProposal(null);
        contextRef.current.pendingProposal = undefined;

        const responseText = parsed.speechResponse || 'Comando processado com sucesso!';

        setDialogHistory(prev => [
          ...prev,
          {
            id: 'msg-asst-' + Date.now(),
            sender: 'assistant',
            text: responseText,
            timestamp: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
            intent: parsed.intent,
            confidenceScore: parsed.confidenceScore,
            proposal: parsed,
            source: parsed.source,
            isActionExecuted: isActionIntent,
          },
        ]);

        speakText(responseText);
      } catch (err) {
        console.error('Error in parseVoiceIntent processing:', err);
        const errorReply = 'Desculpe, ocorreu uma falha ao interpretar seu comando. Tente novamente ou use a digitação.';
        setDialogHistory(prev => [
          ...prev,
          {
            id: 'msg-asst-err-' + Date.now(),
            sender: 'assistant',
            text: errorReply,
            timestamp: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
          },
        ]);
        speakText(errorReply);
      } finally {
        setIsAnalyzing(false);
      }
    },
    [
      profile,
      vehicle,
      activeSession,
      currentProposal,
      executeAction,
      speakText,
    ]
  );

  // Iniciar gravação de voz (Speech Recognition)
  const startListening = useCallback(() => {
    setSpeechError(null);
    setTranscript('');
    setInterimTranscript('');
    cancelSpeaking();

    if (!isSpeechSupported) {
      setSpeechError('Comando de voz indisponível neste navegador. Você pode digitar os comandos abaixo.');
      return;
    }

    try {
      const SpeechRecognitionClass =
        (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

      if (!SpeechRecognitionClass) {
        setSpeechError('Reconhecimento de fala não suportado.');
        return;
      }

      const recognition = new SpeechRecognitionClass();
      recognition.lang = 'pt-BR';
      recognition.continuous = false;
      recognition.interimResults = true;
      recognition.maxAlternatives = 1;

      recognition.onstart = () => {
        setIsListening(true);
      };

      recognition.onresult = (event: any) => {
        let interim = '';
        let final = '';

        for (let i = event.resultIndex; i < event.results.length; i++) {
          const res = event.results[i];
          if (res.isFinal) {
            final += res[0].transcript;
          } else {
            interim += res[0].transcript;
          }
        }

        if (interim) setInterimTranscript(interim);
        if (final) {
          setTranscript(final);
          setInterimTranscript('');
          // Invoca o processamento com o novo parseVoiceIntent
          handleProcessIntent(final);
        }
      };

      recognition.onerror = (event: any) => {
        console.warn('SpeechRecognition error:', event.error);
        setIsListening(false);
        if (event.error === 'not-allowed') {
          setSpeechError('Permissão de microfone negada. Permita o acesso ao microfone no navegador.');
        } else if (event.error !== 'no-speech') {
          setSpeechError(`Erro no reconhecimento: ${event.error}. Você pode digitar seu comando.`);
        }
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch (err) {
      console.error('Error starting recognition:', err);
      setIsListening(false);
      setSpeechError('Não foi possível iniciar o microfone. Use a digitação abaixo.');
    }
  }, [isSpeechSupported, cancelSpeaking, handleProcessIntent]);

  // Parar gravação de voz
  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
    setIsListening(false);
  }, []);

  const handleConfirmProposal = () => {
    if (!currentProposal) return;
    executeAction(currentProposal);
    const replyText = 'Registro confirmado e gravado no sistema com sucesso!';
    setDialogHistory(prev => [
      ...prev,
      {
        id: 'msg-asst-' + Date.now(),
        sender: 'assistant',
        text: replyText,
        timestamp: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
        isActionExecuted: true,
      },
    ]);
    speakText(replyText);
  };

  const handleCancelProposal = () => {
    setCurrentProposal(null);
    contextRef.current.pendingProposal = undefined;
    const replyText = 'Operação cancelada.';
    setDialogHistory(prev => [
      ...prev,
      {
        id: 'msg-asst-' + Date.now(),
        sender: 'assistant',
        text: replyText,
        timestamp: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
      },
    ]);
    speakText(replyText);
  };

  const clearHistory = () => {
    setDialogHistory([
      {
        id: 'msg-welcome-new',
        sender: 'assistant',
        text: 'Histórico limpo. Como posso ajudar você agora?',
        timestamp: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
      },
    ]);
    setCurrentProposal(null);
    contextRef.current = {};
  };

  const handleSendText = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!typedInput.trim()) return;
    handleProcessIntent(typedInput);
    setTypedInput('');
  };

  const handleQuickPrompt = (prompt: string) => {
    handleProcessIntent(prompt);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-950/85 backdrop-blur-md overflow-hidden">
      <div className="bg-slate-900 border border-white/15 rounded-3xl w-full max-w-2xl h-[92vh] sm:h-[86vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        {/* HEADER */}
        <div className="px-4 sm:px-6 py-3.5 bg-slate-950/60 border-b border-white/10 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="relative flex items-center justify-center">
              {isListening && (
                <motion.div
                  initial={{ scale: 1, opacity: 0.8 }}
                  animate={{ scale: [1, 1.4, 1.7], opacity: [0.8, 0.3, 0] }}
                  transition={{
                    duration: 1.6,
                    repeat: Infinity,
                    ease: 'easeOut',
                  }}
                  className="absolute inset-0 rounded-2xl bg-rose-500/40 pointer-events-none"
                />
              )}
              <div
                className={`w-10 h-10 rounded-2xl flex items-center justify-center font-black transition-all ${
                  isListening
                    ? 'bg-rose-500 text-white shadow-lg shadow-rose-500/40 ring-2 ring-rose-400'
                    : 'bg-gradient-to-tr from-emerald-500 to-teal-400 text-slate-950 shadow-md shadow-emerald-500/20'
                }`}
              >
                <Mic className="w-5 h-5" />
              </div>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-black text-white tracking-wide flex items-center gap-1.5">
                  DRIVER VOICE
                </h2>
                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                    isListening
                      ? 'bg-rose-500/20 text-rose-300 border-rose-500/40 animate-pulse'
                      : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                  }`}
                >
                  {isListening ? '🎙️ Ouvindo você...' : 'Comando Natural'}
                </span>
              </div>
              <p className="text-[11px] text-slate-400 hidden sm:block">
                Fale naturalmente ou digite para registrar, consultar e planejar.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1 sm:gap-2">
            {/* TOGGLE MODO MOTORISTA */}
            {onOpenDriverMode && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenDriverMode();
                }}
                className="px-2.5 py-1.5 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 text-xs font-bold flex items-center gap-1.5 transition"
                title="Abrir cockpit simplificado para o trânsito"
              >
                <Car className="w-3.5 h-3.5 text-amber-400" />
                <span className="hidden sm:inline">Modo Motorista</span>
              </button>
            )}

            {/* TOGGLE RESPOSTA POR VOZ (TTS) */}
            <button
              type="button"
              onClick={() => setVoiceFeedbackEnabled(!voiceFeedbackEnabled)}
              className={`p-2 rounded-xl border transition ${
                voiceFeedbackEnabled
                  ? 'bg-white/10 text-emerald-400 border-emerald-500/30'
                  : 'bg-white/5 text-slate-500 border-white/5'
              }`}
              title={voiceFeedbackEnabled ? 'Resposta por voz ativada' : 'Resposta por voz desativada'}
            >
              {voiceFeedbackEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
            </button>

            {/* LIMPAR HISTÓRICO */}
            <button
              type="button"
              onClick={clearHistory}
              className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white border border-white/5 transition"
              title="Limpar histórico da conversa"
            >
              <Trash2 className="w-4 h-4" />
            </button>

            {/* FECHAR MODAL */}
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl bg-white/5 hover:bg-white/15 text-slate-400 hover:text-white border border-white/5 transition"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* FEEDBACK DE ERRO SE MICROFONE INDISPONÍVEL */}
        {speechError && (
          <div className="bg-amber-500/15 border-b border-amber-500/30 px-4 py-2 text-xs text-amber-200 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
            <span>{speechError}</span>
          </div>
        )}

        {/* CORPO DE MENSAGENS / CONVERSA */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
          
          {dialogHistory.map(msg => (
            <div
              key={msg.id}
              className={`flex flex-col ${msg.sender === 'user' ? 'items-end' : 'items-start'} space-y-1.5`}
            >
              <div className="flex items-center gap-1.5 text-[10px] text-slate-400 font-mono px-1">
                <span>{msg.sender === 'user' ? 'Você' : 'Driver Voice'}</span>
                {msg.source && (
                  <>
                    <span>•</span>
                    <span className={`px-1.5 py-0.2 rounded text-[9px] font-sans font-bold flex items-center gap-1 ${
                      msg.source === 'gemini' 
                        ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30' 
                        : 'bg-slate-800 text-slate-400 border border-slate-700'
                    }`}>
                      <Sparkles className="w-2.5 h-2.5" />
                      {msg.source === 'gemini' ? 'Gemini 3.7 Flash' : 'Regras Locais'}
                    </span>
                  </>
                )}
                {typeof msg.confidenceScore === 'number' && (
                  <>
                    <span>•</span>
                    <span className={`text-[9px] font-sans px-1 rounded ${
                      msg.confidenceScore >= 0.8
                        ? 'text-emerald-400'
                        : msg.confidenceScore >= 0.6
                        ? 'text-amber-400'
                        : 'text-rose-400'
                    }`}>
                      {Math.round(msg.confidenceScore * 100)}% confiança
                    </span>
                  </>
                )}
                <span>•</span>
                <span>{msg.timestamp}</span>
              </div>

              <div
                className={`p-3.5 sm:p-4 rounded-2xl max-w-[90%] sm:max-w-[85%] text-xs sm:text-sm leading-relaxed ${
                  msg.sender === 'user'
                    ? 'bg-emerald-600 text-white rounded-tr-none font-medium shadow-md shadow-emerald-950/40'
                    : 'bg-white/10 border border-white/10 text-slate-200 rounded-tl-none'
                }`}
              >
                <p className="whitespace-pre-line">{msg.text}</p>

                {/* BADGE DE AÇÃO EXECUTADA AUTOMATICAMENTE */}
                {msg.isActionExecuted && (
                  <div className="mt-2.5 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 text-xs font-bold">
                    <Check className="w-3.5 h-3.5" />
                    <span>Ação gravada automaticamente no sistema</span>
                  </div>
                )}

                {/* PROMPT INTERATIVO SE FALTAM PARÂMETROS ESPECÍFICOS */}
                {msg.missingParameters && msg.missingParameters.length > 0 && (
                  <div className="mt-3 bg-amber-500/15 border border-amber-500/30 p-3 rounded-xl text-amber-200 text-xs space-y-2">
                    <div className="flex items-start gap-2">
                      <AlertCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                      <div>
                        <span className="font-bold text-xs block text-amber-300">
                          Parâmetros obrigatórios ausentes:
                        </span>
                        <span className="text-[11px] text-amber-200/90 font-mono">
                          {msg.missingParameters.join(', ')}
                        </span>
                      </div>
                    </div>

                    {/* SUGESTÕES RÁPIDAS PARA COMPLETAR O PARÂMETRO FALTANTE */}
                    <div className="pt-1.5 border-t border-amber-500/20 flex flex-wrap gap-1.5">
                      <span className="text-[10px] text-amber-400/90 font-bold flex items-center gap-1 w-full">
                        <Tag className="w-3 h-3" /> Toque para complementar:
                      </span>
                      
                      {/* Sugestões de Plataforma se faltar */}
                      {msg.missingParameters.includes('platform') && (
                        <>
                          {['Uber', '99', 'inDrive', 'Particular'].map(plat => (
                            <button
                              key={plat}
                              type="button"
                              onClick={() => handleProcessIntent(`Foi na ${plat}`)}
                              className="bg-amber-400/20 hover:bg-amber-400/30 text-amber-100 border border-amber-400/40 px-2.5 py-1 rounded-lg text-xs font-bold transition"
                            >
                              Plataforma: {plat}
                            </button>
                          ))}
                        </>
                      )}

                      {/* Sugestões de Categoria se faltar */}
                      {msg.missingParameters.includes('expenseCategory') && (
                        <>
                          {['Alimentação', 'Lavagem', 'Pedágio', 'Manutenção', 'Estacionamento'].map(cat => (
                            <button
                              key={cat}
                              type="button"
                              onClick={() => handleProcessIntent(`Categoria ${cat}`)}
                              className="bg-amber-400/20 hover:bg-amber-400/30 text-amber-100 border border-amber-400/40 px-2.5 py-1 rounded-lg text-xs font-bold transition"
                            >
                              {cat}
                            </button>
                          ))}
                        </>
                      )}

                      {/* Sugestões de Volume/Valor de Combustível se faltar */}
                      {(msg.missingParameters.includes('liters') || msg.missingParameters.includes('amount') || msg.missingParameters.includes('totalAmount')) && (
                        <>
                          {['20 litros', '30 litros', '50 reais', '100 reais'].map(opt => (
                            <button
                              key={opt}
                              type="button"
                              onClick={() => handleProcessIntent(`Foram ${opt}`)}
                              className="bg-amber-400/20 hover:bg-amber-400/30 text-amber-100 border border-amber-400/40 px-2.5 py-1 rounded-lg text-xs font-bold transition"
                            >
                              {opt}
                            </button>
                          ))}
                        </>
                      )}

                      {/* Sugestões de Data se faltar */}
                      {msg.missingParameters.includes('date') && (
                        <>
                          {['Hoje', 'Amanhã', 'Segunda-feira'].map(d => (
                            <button
                              key={d}
                              type="button"
                              onClick={() => handleProcessIntent(`Para ${d.toLowerCase()}`)}
                              className="bg-amber-400/20 hover:bg-amber-400/30 text-amber-100 border border-amber-400/40 px-2.5 py-1 rounded-lg text-xs font-bold transition"
                            >
                              {d}
                            </button>
                          ))}
                        </>
                      )}
                    </div>
                  </div>
                )}

                {/* DIALOG DE CONFIRMAÇÃO PARA INTENÇÕES AMBÍGUAS OU QUE EXIGEM APROVAÇÃO */}
                {msg.requiresConfirmation && msg.proposal && currentProposal && (
                  <div className="mt-3 bg-slate-950/80 border border-amber-500/40 p-3.5 rounded-2xl space-y-3 shadow-lg">
                    <div className="flex items-center justify-between text-[11px] font-bold">
                      <span className="flex items-center gap-1.5 text-amber-400">
                        <HelpCircle className="w-4 h-4 text-amber-400" />
                        {msg.isAmbiguous ? 'Confirmação de Intenção Ambígua' : 'Confirmar Registro'}
                      </span>
                      <span className="text-[10px] text-slate-400">
                        Intenção: <strong className="text-white font-mono">{msg.proposal.intent}</strong>
                      </span>
                    </div>

                    {/* Resumo visual das entidades extraídas */}
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 bg-black/40 p-2.5 rounded-xl border border-white/5 text-xs">
                      {msg.proposal.entities.amount !== undefined && (
                        <div>
                          <span className="text-[10px] text-slate-400 block">Valor</span>
                          <strong className="text-emerald-400 font-black">
                            {formatCurrency(msg.proposal.entities.amount)}
                          </strong>
                        </div>
                      )}
                      {msg.proposal.entities.platform && (
                        <div>
                          <span className="text-[10px] text-slate-400 block">Plataforma</span>
                          <strong className="text-white font-bold">{msg.proposal.entities.platform}</strong>
                        </div>
                      )}
                      {msg.proposal.entities.expenseCategory && (
                        <div>
                          <span className="text-[10px] text-slate-400 block">Categoria</span>
                          <strong className="text-white font-bold">{msg.proposal.entities.expenseCategory}</strong>
                        </div>
                      )}
                      {msg.proposal.entities.liters !== undefined && (
                        <div>
                          <span className="text-[10px] text-slate-400 block">Volume</span>
                          <strong className="text-white font-bold">{msg.proposal.entities.liters} L</strong>
                        </div>
                      )}
                      {msg.proposal.entities.pricePerLiter !== undefined && (
                        <div>
                          <span className="text-[10px] text-slate-400 block">Preço/L</span>
                          <strong className="text-white font-bold">{formatCurrency(msg.proposal.entities.pricePerLiter)}</strong>
                        </div>
                      )}
                      {msg.proposal.entities.date && (
                        <div>
                          <span className="text-[10px] text-slate-400 block">Data</span>
                          <strong className="text-white font-bold">{msg.proposal.entities.date}</strong>
                        </div>
                      )}
                    </div>

                    {/* Botões de Ação do Dialog de Confirmação */}
                    <div className="pt-2 border-t border-white/10 flex items-center justify-end gap-2 flex-wrap">
                      <button
                        type="button"
                        onClick={handleCancelProposal}
                        className="bg-white/10 hover:bg-white/15 text-slate-300 text-xs font-bold px-3.5 py-2 rounded-xl transition"
                      >
                        Cancelar
                      </button>
                      <button
                        type="button"
                        onClick={handleConfirmProposal}
                        className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-black px-4 py-2 rounded-xl transition flex items-center gap-1.5 shadow-md shadow-emerald-500/30"
                      >
                        <Check className="w-4 h-4" />
                        Confirmar e Gravar
                      </button>
                    </div>
                  </div>
                )}

              </div>
            </div>
          ))}

          {/* INDICADOR DE FALA EM TEMPO REAL */}
          {interimTranscript && (
            <div className="flex flex-col items-end space-y-1 animate-pulse">
              <span className="text-[10px] text-rose-400 font-mono">Transcrevendo áudio...</span>
              <div className="p-3.5 rounded-2xl bg-rose-500/20 border border-rose-500/30 text-rose-200 text-xs sm:text-sm rounded-tr-none">
                "{interimTranscript}..."
              </div>
            </div>
          )}

          {/* INDICADOR DE ANÁLISE DO INTENT PARSER COM GEMINI */}
          {isAnalyzing && (
            <div className="flex flex-col items-start space-y-1 animate-pulse">
              <div className="flex items-center gap-1.5 text-[10px] text-purple-400 font-mono px-1">
                <Sparkles className="w-3 h-3 animate-spin text-purple-400" />
                <span>Gemini 3.7 Flash analisando intenção e entidades...</span>
              </div>
              <div className="p-3.5 rounded-2xl bg-purple-500/10 border border-purple-500/20 text-purple-200 text-xs sm:text-sm rounded-tl-none flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-purple-400 animate-ping" />
                <span>Processando comando em linguagem natural...</span>
              </div>
            </div>
          )}

          <div ref={chatBottomRef} />
        </div>

        {/* SUGESTÕES DE COMANDOS RÁPIDOS */}
        <div className="px-4 py-2 bg-slate-950/40 border-t border-white/5 overflow-x-auto scrollbar-none flex items-center gap-1.5 shrink-0">
          <span className="text-[10px] text-slate-500 uppercase font-black tracking-wider shrink-0 flex items-center gap-1">
            <Sparkles className="w-3 h-3 text-emerald-400" />
            Exemplos:
          </span>
          {[
            'Fiz 250 reais hoje na Uber',
            'Abasteci 30 litros a 6 e 20',
            'Gastei 35 de almoço',
            'Quanto ganhei hoje?',
            'Quanto custa cada km?',
            'Recalcular lançamentos do veículo',
            'Começar expediente',
            'Cria minha escala da próxima semana',
          ].map((prompt, i) => (
            <button
              key={i}
              type="button"
              onClick={() => handleQuickPrompt(prompt)}
              className="text-[11px] font-bold text-slate-300 hover:text-white bg-white/5 hover:bg-white/10 px-2.5 py-1 rounded-xl border border-white/5 whitespace-nowrap transition"
            >
              "{prompt}"
            </button>
          ))}
        </div>

        {/* ÁREA INFERIOR: BOTÃO DE MICROFONE & DIGITAÇÃO */}
        <div className="p-3.5 sm:p-4 bg-slate-950/80 border-t border-white/10 shrink-0 space-y-3">
          
          {/* BARRA DE DIGITAÇÃO DE TEXTO */}
          <form onSubmit={handleSendText} className="flex items-center gap-2">
            <input
              type="text"
              value={typedInput}
              onChange={e => setTypedInput(e.target.value)}
              placeholder="Fale no microfone ou digite seu comando aqui..."
              className="flex-1 bg-slate-900 border border-white/10 focus:border-emerald-500 text-white placeholder-slate-500 text-xs sm:text-sm px-4 py-2.5 rounded-2xl focus:outline-none transition shadow-inner"
            />
            <button
              type="submit"
              disabled={!typedInput.trim()}
              className="w-10 h-10 rounded-2xl bg-white/10 hover:bg-emerald-500 hover:text-slate-950 text-slate-300 disabled:opacity-30 disabled:hover:bg-white/10 disabled:hover:text-slate-300 flex items-center justify-center transition shrink-0"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>

          {/* BOTÃO PRINCIPAL DE MICROFONE COM ONDA PULSANTE (PULSING WAVE ANIMATION) */}
          <div className="flex items-center justify-between gap-3 pt-1">
            <div className="text-[11px] text-slate-400 flex items-center gap-1.5 min-w-0">
              <Shield className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              <span className="truncate">
                {isListening
                  ? 'Captando áudio em tempo real...'
                  : isAnalyzing
                  ? 'Processando com IA...'
                  : 'Privacidade ativa: áudio processado localmente.'}
              </span>
            </div>

            <div className="relative inline-flex items-center justify-center shrink-0">
              {/* ONDAS EXPANSIVAS CONCÊNTRICAS QUANDO O MICROFONE ESTÁ ATIVO */}
              <AnimatePresence>
                {isListening && (
                  <>
                    {/* Onda 1 */}
                    <motion.div
                      initial={{ scale: 1, opacity: 0.75 }}
                      animate={{ scale: [1, 1.45, 1.85], opacity: [0.75, 0.35, 0] }}
                      transition={{
                        duration: 1.8,
                        repeat: Infinity,
                        ease: 'easeOut',
                      }}
                      className="absolute inset-0 rounded-2xl bg-rose-500/40 pointer-events-none -z-10"
                    />
                    {/* Onda 2 */}
                    <motion.div
                      initial={{ scale: 1, opacity: 0.65 }}
                      animate={{ scale: [1, 1.45, 1.85], opacity: [0.65, 0.3, 0] }}
                      transition={{
                        duration: 1.8,
                        repeat: Infinity,
                        ease: 'easeOut',
                        delay: 0.6,
                      }}
                      className="absolute inset-0 rounded-2xl bg-rose-500/30 pointer-events-none -z-10"
                    />
                    {/* Onda 3 */}
                    <motion.div
                      initial={{ scale: 1, opacity: 0.55 }}
                      animate={{ scale: [1, 1.45, 1.85], opacity: [0.55, 0.2, 0] }}
                      transition={{
                        duration: 1.8,
                        repeat: Infinity,
                        ease: 'easeOut',
                        delay: 1.2,
                      }}
                      className="absolute inset-0 rounded-2xl bg-rose-600/25 pointer-events-none -z-10"
                    />
                  </>
                )}

                {/* ONDA DE PROCESSAMENTO IA */}
                {isAnalyzing && !isListening && (
                  <motion.div
                    initial={{ scale: 1, opacity: 0.7 }}
                    animate={{ scale: [1, 1.35, 1.6], opacity: [0.7, 0.25, 0] }}
                    transition={{
                      duration: 1.4,
                      repeat: Infinity,
                      ease: 'easeInOut',
                    }}
                    className="absolute inset-0 rounded-2xl bg-purple-500/35 pointer-events-none -z-10"
                  />
                )}
              </AnimatePresence>

              {/* BOTÃO PRINCIPAL DE GRAVAÇÃO */}
              <motion.button
                type="button"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.96 }}
                onClick={() => {
                  if (isListening) {
                    stopListening();
                  } else {
                    startListening();
                  }
                }}
                className={`relative px-4 sm:px-5 py-2.5 rounded-2xl font-black text-xs sm:text-sm flex items-center gap-2.5 transition-colors shadow-lg select-none ${
                  isListening
                    ? 'bg-rose-500 hover:bg-rose-600 text-white shadow-rose-500/50 ring-2 ring-rose-400/80 ring-offset-2 ring-offset-slate-900'
                    : isAnalyzing
                    ? 'bg-purple-600 text-white shadow-purple-500/40 ring-2 ring-purple-400/50'
                    : 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-emerald-500/30 ring-1 ring-emerald-400/50'
                }`}
              >
                {/* ÍCONE DE MICROFONE COM PULSO OU ANIMAÇÃO */}
                <div className="relative flex items-center justify-center">
                  <Mic className={`w-4 h-4 ${isListening ? 'animate-bounce' : ''}`} />
                  {isListening && (
                    <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-white rounded-full animate-ping" />
                  )}
                </div>

                {/* TEXTO DO BOTÃO */}
                <span>{isListening ? 'Gravando Áudio...' : isAnalyzing ? 'Analisando...' : 'Falar Comando (🎙️)'}</span>

                {/* BARRAS DE ONDA SONORA / SOUNDWAVE FREQUENCY BARS */}
                {isListening && (
                  <div className="flex items-center gap-0.5 h-4 ml-1">
                    {[0.3, 0.7, 1.0, 0.5, 0.8].map((mult, idx) => (
                      <motion.span
                        key={idx}
                        animate={{
                          height: ['4px', `${14 * mult + 4}px`, '4px'],
                        }}
                        transition={{
                          duration: 0.5 + mult * 0.3,
                          repeat: Infinity,
                          repeatType: 'reverse',
                          ease: 'easeInOut',
                          delay: idx * 0.1,
                        }}
                        className="w-1 bg-white rounded-full"
                      />
                    ))}
                  </div>
                )}
              </motion.button>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};

