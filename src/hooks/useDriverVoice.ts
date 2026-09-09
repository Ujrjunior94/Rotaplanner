import { useState, useEffect, useRef, useCallback } from 'react';
import { useDriver } from '../context/DriverContext';
import {
  VoiceParseResult,
  ConversationContext,
  VoiceIntentType,
} from '../services/voiceParser';
import {
  parseIntentWithGemini,
  StandardizedIntentResult,
  ExtractedEntities,
  MissingParameterFlags,
} from '../services/intentParser';
import { PlatformType, ExpenseCategory } from '../types';

// Declaração de tipos para SpeechRecognition do navegador
interface IWindowSpeechRecognition extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  maxAlternatives: number;
  start: () => void;
  stop: () => void;
  abort: () => void;
  onstart: ((this: IWindowSpeechRecognition, ev: Event) => any) | null;
  onresult: ((this: IWindowSpeechRecognition, ev: any) => any) | null;
  onerror: ((this: IWindowSpeechRecognition, ev: any) => any) | null;
  onend: ((this: IWindowSpeechRecognition, ev: Event) => any) | null;
}

export interface VoiceChatMessage {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  timestamp: string;
  intent?: VoiceIntentType;
  requiresConfirmation?: boolean;
  proposal?: StandardizedIntentResult | VoiceParseResult;
  isActionExecuted?: boolean;
  source?: 'gemini' | 'rule_based_fallback';
  missingParameters?: string[];
  isAnalyzing?: boolean;
}

export function useDriverVoice() {
  const {
    profile,
    vehicle,
    activeSession,
    sessions,
    earnings,
    expenses,
    fuelRecords,
    goals,
    plannerEvents,
    activeStrategy,
    startShift,
    endShift,
    addEarning,
    addExpense,
    addFuelRecord,
    addPlannerEvent,
    updateProfile,
  } = useDriver();

  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [interimTranscript, setInterimTranscript] = useState('');
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [speechError, setSpeechError] = useState<string | null>(null);
  const [voiceFeedbackEnabled, setVoiceFeedbackEnabled] = useState<boolean>(() => {
    const saved = localStorage.getItem('@driver_voice_tts_enabled');
    return saved !== null ? saved === 'true' : true;
  });

  const [dialogHistory, setDialogHistory] = useState<VoiceChatMessage[]>([
    {
      id: 'msg-welcome',
      sender: 'assistant',
      text: 'Olá! Sou o Driver Voice. Você pode registrar ganhos, abastecimentos, despesas, checar metas, iniciar turno ou pedir análises por voz.',
      timestamp: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
    },
  ]);

  const [currentProposal, setCurrentProposal] = useState<StandardizedIntentResult | VoiceParseResult | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const contextRef = useRef<ConversationContext>({});
  const recognitionRef = useRef<IWindowSpeechRecognition | null>(null);
  const synthRef = useRef<SpeechSynthesis | null>(null);

  // Verificar se o navegador suporta Web Speech API
  const isSpeechSupported =
    typeof window !== 'undefined' &&
    ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window);

  useEffect(() => {
    localStorage.setItem('@driver_voice_tts_enabled', String(voiceFeedbackEnabled));
  }, [voiceFeedbackEnabled]);

  // Síntese de Voz (TTS)
  const speakText = useCallback(
    (text: string) => {
      if (!voiceFeedbackEnabled || typeof window === 'undefined' || !('speechSynthesis' in window)) {
        return;
      }

      try {
        window.speechSynthesis.cancel(); // Para qualquer fala anterior
        const cleanText = text.replace(/R\$\s*/g, 'reais ').replace(/\*/g, '');
        const utterance = new SpeechSynthesisUtterance(cleanText);
        utterance.lang = 'pt-BR';
        utterance.rate = 1.05;
        utterance.pitch = 1.0;

        utterance.onstart = () => setIsSpeaking(true);
        utterance.onend = () => setIsSpeaking(false);
        utterance.onerror = () => setIsSpeaking(false);

        // Tentar obter voz em Português se disponível
        const voices = window.speechSynthesis.getVoices();
        const ptVoice = voices.find(v => v.lang.includes('pt-BR') || v.lang.includes('pt_BR') || v.lang.includes('pt'));
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

  // Executa uma ação validada e confirmada no DriverContext
  const executeAction = useCallback(
    (proposal: StandardizedIntentResult | VoiceParseResult) => {
      const { intent, data } = proposal;
      const todayStr = new Date().toISOString().split('T')[0];

      if (intent === 'CREATE_EARNING' && data?.earning) {
        addEarning({
          platform: data.earning.platform,
          amount: data.earning.amount,
          tip: 0,
          tripsCount: 1,
          date: data.earning.date || todayStr,
          notes: data.earning.notes,
        });
        contextRef.current.lastIntent = 'CREATE_EARNING';
        contextRef.current.lastAmount = data.earning.amount;
        contextRef.current.lastPlatform = data.earning.platform;
      } else if (intent === 'CREATE_EXPENSE' && data?.expense) {
        addExpense({
          category: data.expense.category,
          amount: data.expense.amount,
          description: data.expense.notes || `Despesa de ${data.expense.category} via Voz`,
          date: data.expense.date || todayStr,
        });
      } else if (intent === 'CREATE_FUEL' && data?.fuel) {
        addFuelRecord({
          stationName: 'Posto',
          fuelType: data.fuel.fuelType,
          liters: data.fuel.liters,
          pricePerLiter: data.fuel.pricePerLiter,
          totalAmount: data.fuel.totalAmount,
          odometer: data.fuel.odometer || vehicle.currentOdometer,
          date: data.fuel.date || todayStr,
        });
      } else if (intent === 'START_WORK_SESSION' && data?.startSession) {
        startShift(data.startSession.startKm || vehicle.currentOdometer);
      } else if (intent === 'END_WORK_SESSION' && data?.endSession && activeSession) {
        const finalKm = data.endSession.endKm || vehicle.currentOdometer + 60;
        const kmDriven = Math.max(0, finalKm - activeSession.startOdometer);
        const autoFuel = (kmDriven / (vehicle.avgConsumption || 11.5)) * (profile.gasPriceReference || 5.89);
        const maintenanceRate = activeStrategy?.fuelAndMaintenancePlan.reserveMaintenancePerKm || 0.15;
        const maintCost = kmDriven * maintenanceRate;
        endShift(
          finalKm,
          data.endSession.totalGross || 0,
          0,
          1,
          0, // Combustível gasto vai para a reserva para abastecimento futuro, e não para a despesa direta
          0,
          `Encerrado via Driver Voice (${kmDriven} km rodados • Reserva abastecimento futuro: R$ ${autoFuel.toFixed(2)})`,
          undefined,
          { fuelReserve: Math.round(autoFuel * 100) / 100, maintenanceReserve: Math.round(maintCost * 100) / 100 }
        );
      } else if (intent === 'CREATE_PLANNER_EVENT' && data?.plannerEvent) {
        addPlannerEvent({
          date: data.plannerEvent.date,
          type: data.plannerEvent.type,
          startTime: data.plannerEvent.startTime || '06:00',
          endTime: data.plannerEvent.endTime || '14:00',
          targetEarnings: data.plannerEvent.targetEarnings || profile.dailyGoal,
          notes: data.plannerEvent.notes,
        });
      } else if (intent === 'REQUEST_WEEKLY_PLAN' && data?.weeklyPlan) {
        data.weeklyPlan.items.forEach(item => {
          addPlannerEvent({
            date: item.date,
            type: item.type,
            startTime: item.startTime || (item.type === 'work' ? '06:00' : ''),
            endTime: item.endTime || (item.type === 'work' ? '14:00' : ''),
            targetEarnings: item.targetEarnings || (item.type === 'work' ? profile.dailyGoal : 0),
            notes: 'Escala semanal gerada por voz',
          });
        });
      } else if (intent === 'CREATE_GOAL' && data?.goal) {
        if (data.goal.type === 'daily') {
          updateProfile({ dailyGoal: data.goal.targetAmount });
        } else if (data.goal.type === 'weekly') {
          updateProfile({ weeklyGoal: data.goal.targetAmount });
        } else if (data.goal.type === 'monthly') {
          updateProfile({ monthlyGoal: data.goal.targetAmount });
        }
      }

      setCurrentProposal(null);
      contextRef.current.pendingProposal = undefined;
    },
    [
      addEarning,
      addExpense,
      addFuelRecord,
      startShift,
      endShift,
      addPlannerEvent,
      updateProfile,
      vehicle.currentOdometer,
      profile.dailyGoal,
      activeSession,
    ]
  );

  // Processa o texto (seja vindo da fala ou digitado pelo usuário)
  const processInputText = useCallback(
    async (inputText: string) => {
      const userText = inputText.trim();
      if (!userText) return;

      // Adicionar mensagem do usuário no histórico
      const userMsgId = 'msg-user-' + Date.now();
      const timeStr = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

      setDialogHistory(prev => [
        ...prev,
        {
          id: userMsgId,
          sender: 'user',
          text: userText,
          timestamp: timeStr,
        },
      ]);

      setIsAnalyzing(true);

      // Formatar dados de estado do motorista para o IntentParser
      const driverData = {
        profile,
        vehicle,
        activeSession,
        workSessions: sessions,
        dailyEarnings: earnings.map(e => ({ date: e.date, amount: e.amount, platform: e.platform })),
        expenses,
        fuelRecords,
        goals,
        plannerEvents,
      };

      try {
        const parseResult = await parseIntentWithGemini(userText, contextRef.current, driverData);

        // Tratamento de confirmação direta por voz ("Sim" / "Confirmar")
        if (parseResult.intent === 'CONFIRM_ACTION' && contextRef.current.pendingProposal) {
          const confirmedProposal = contextRef.current.pendingProposal;
          executeAction(confirmedProposal);

          const replyText = 'Ação confirmada e registrada com sucesso no sistema.';
          setDialogHistory(prev => [
            ...prev,
            {
              id: 'msg-asst-' + Date.now(),
              sender: 'assistant',
              text: replyText,
              timestamp: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
              isActionExecuted: true,
              source: parseResult.source,
            },
          ]);
          speakText(replyText);
          return;
        }

        // Tratamento de cancelamento direto por voz ("Não" / "Cancelar")
        if (parseResult.intent === 'CANCEL_ACTION') {
          setCurrentProposal(null);
          contextRef.current.pendingProposal = undefined;

          const replyText = 'Operação cancelada conforme solicitado.';
          setDialogHistory(prev => [
            ...prev,
            {
              id: 'msg-asst-' + Date.now(),
              sender: 'assistant',
              text: replyText,
              timestamp: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
              source: parseResult.source,
            },
          ]);
          speakText(replyText);
          return;
        }

        // Se a intenção exige confirmação do usuário antes de salvar
        if (parseResult.requiresConfirmation) {
          setCurrentProposal(parseResult);
          contextRef.current.pendingProposal = parseResult as any;

          setDialogHistory(prev => [
            ...prev,
            {
              id: 'msg-asst-' + Date.now(),
              sender: 'assistant',
              text: parseResult.speechResponse,
              timestamp: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
              intent: parseResult.intent,
              requiresConfirmation: true,
              proposal: parseResult,
              source: parseResult.source,
              missingParameters: parseResult.missingParameterFlags?.missingParameters,
            },
          ]);

          speakText(parseResult.speechResponse);
        } else {
          // Resposta direta a consulta ou ação imediata
          setCurrentProposal(null);
          contextRef.current.pendingProposal = undefined;

          setDialogHistory(prev => [
            ...prev,
            {
              id: 'msg-asst-' + Date.now(),
              sender: 'assistant',
              text: parseResult.speechResponse,
              timestamp: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
              intent: parseResult.intent,
              proposal: parseResult,
              source: parseResult.source,
              missingParameters: parseResult.missingParameterFlags?.missingParameters,
            },
          ]);

          speakText(parseResult.speechResponse);
        }
      } catch (err) {
        console.error('Error parsing voice command:', err);
        const errorReply = 'Desculpe, ocorreu um erro ao interpretar o comando. Você pode tentar novamente.';
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
      sessions,
      earnings,
      expenses,
      fuelRecords,
      goals,
      plannerEvents,
      executeAction,
      speakText,
    ]
  );

  // Confirmação manual via botão na interface
  const handleConfirmCurrentProposal = useCallback(() => {
    if (!currentProposal) return;
    executeAction(currentProposal);

    const replyText = 'Registro confirmado e salvo com sucesso!';
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
  }, [currentProposal, executeAction, speakText]);

  // Cancelamento manual via botão na interface
  const handleCancelCurrentProposal = useCallback(() => {
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
  }, [speakText]);

  // Iniciar gravação de voz
  const startListening = useCallback(() => {
    setSpeechError(null);
    setTranscript('');
    setInterimTranscript('');
    cancelSpeaking();

    if (!isSpeechSupported) {
      setSpeechError('Comando de voz indisponível neste navegador/dispositivo. Você pode digitar os comandos abaixo.');
      return;
    }

    try {
      const SpeechRecognitionClass =
        (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

      if (!SpeechRecognitionClass) {
        setSpeechError('Reconhecimento de fala não suportado.');
        return;
      }

      const recognition: IWindowSpeechRecognition = new SpeechRecognitionClass();
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
          processInputText(final);
        }
      };

      recognition.onerror = (event: any) => {
        console.warn('SpeechRecognition error:', event.error);
        setIsListening(false);
        if (event.error === 'not-allowed') {
          setSpeechError('Permissão de microfone negada. Permita o acesso ao microfone no navegador.');
        } else if (event.error === 'no-speech') {
          // Apenas silêncio
        } else {
          setSpeechError(`Erro no reconhecimento: ${event.error}. Tente falar novamente ou digite.`);
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
  }, [isSpeechSupported, cancelSpeaking, processInputText]);

  // Parar gravação
  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
    setIsListening(false);
  }, []);

  const clearHistory = useCallback(() => {
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
  }, []);

  return {
    isSpeechSupported,
    isListening,
    isAnalyzing,
    transcript,
    interimTranscript,
    isSpeaking,
    speechError,
    voiceFeedbackEnabled,
    setVoiceFeedbackEnabled,
    dialogHistory,
    currentProposal,
    startListening,
    stopListening,
    cancelSpeaking,
    processInputText,
    confirmCurrentProposal: handleConfirmCurrentProposal,
    cancelCurrentProposal: handleCancelCurrentProposal,
    clearHistory,
  };
}
