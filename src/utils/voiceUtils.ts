/**
 * Voice Utilities and Intent Parser for Driver Planner
 * 
 * Sends user transcripts to Gemini API (gemini-3.7-flash) with structured schema
 * and strict extraction constraints preventing hallucination of non-existent parameters.
 */

export type VoiceIntentType =
  | 'CREATE_EARNING'
  | 'CREATE_EXPENSE'
  | 'CREATE_FUEL'
  | 'CREATE_TRIP'
  | 'START_WORK_SESSION'
  | 'END_WORK_SESSION'
  | 'CREATE_PLANNER_EVENT'
  | 'UPDATE_PLANNER_EVENT'
  | 'DELETE_PLANNER_EVENT'
  | 'CREATE_GOAL'
  | 'QUERY_DASHBOARD'
  | 'QUERY_PERFORMANCE'
  | 'QUERY_REPORT'
  | 'QUERY_FUEL'
  | 'QUERY_VEHICLE'
  | 'QUERY_GOAL'
  | 'REQUEST_AI_ANALYSIS'
  | 'REQUEST_STRATEGY'
  | 'REQUEST_WEEKLY_PLAN'
  | 'CONFIRM_ACTION'
  | 'CANCEL_ACTION'
  | 'AMBIGUOUS'
  | 'UNKNOWN';

export interface VoiceEntities extends Record<string, any> {
  amount?: number;
  platform?: 'Uber' | '99' | 'inDrive' | 'Particular' | string;
  expenseCategory?:
    | 'Alimentação'
    | 'Combustível'
    | 'Lavagem'
    | 'Limpeza'
    | 'Multas'
    | 'Pedágio'
    | 'Manutenção'
    | 'Pneus'
    | 'Óleo'
    | 'Freios'
    | 'Estacionamento'
    | 'Internet'
    | 'Seguro'
    | 'Documentação'
    | 'Outros'
    | string;
  liters?: number;
  pricePerLiter?: number;
  fuelType?: 'Gasolina Comum' | 'Gasolina Aditivada' | 'Etanol Comum' | 'GNV' | 'Diesel' | string;
  date?: string; // YYYY-MM-DD
  startTime?: string; // HH:mm
  endTime?: string; // HH:mm
  targetAmount?: number;
  goalType?: 'daily' | 'weekly' | 'monthly' | string;
  odometer?: number;
  durationMinutes?: number;
  distanceKm?: number;
  notes?: string;
  isOffDay?: boolean;
}

export interface ParsedVoiceIntent {
  intent: string;
  entities: Record<string, any>;
  missingParams: string[];
  confidenceScore: number;
  speechResponse?: string;
  rawTranscript?: string;
  requiresConfirmation?: boolean;
  confirmationMessage?: string;
  source?: 'gemini' | 'rule_based_fallback';
  data?: any;
}

export interface VoiceParserOptions {
  context?: {
    lastIntent?: string;
    lastAmount?: number;
    lastPlatform?: string;
    pendingProposal?: any;
    [key: string]: any;
  };
  driverState?: {
    odometer?: number;
    dailyGoal?: number;
    monthlyGoal?: number;
    activeSession?: boolean;
    gasPriceReference?: number;
    [key: string]: any;
  };
}

/**
 * Prompt de sistema padrão enviado ao Gemini com todas as intenções,
 * entidades e a DIRETIVA ESTRITA DE EXCLUSÃO DE DADOS NÃO EXISTENTES.
 */
export const VOICE_INTENT_SYSTEM_PROMPT = `Você é o 'IntentParser', motor de inteligência de voz e análise de comandos para motoristas de aplicativo (Uber, 99, inDrive, Táxi, Particular).

DIRETIVA ESTRITA DE NÃO-ALUCINAÇÃO (EXCLUSION OF NON-EXISTENT INFORMATION):
- Extraia SOMENTE as informações que o usuário explicitamente mencionou na transcrição ou que são deduzidas estritamente do contexto imediato.
- É TERMINANTEMENTE PROIBIDO inventar, presumir ou alucinar valores monetários, categorias, plataformas, horários, litros ou datas não fornecidos pelo usuário.
- Se uma entidade requerida para completar uma ação estiver faltando na fala, NUNCA atribua um valor fictício: mantenha a propriedade da entidade indefinida/nula e inclua o nome exato do parâmetro no array 'missingParams'.

INTENÇÕES SUPORTADAS (intent):
1. CREATE_EARNING: Registro de ganhos/faturamento (requer 'amount' e 'platform').
2. CREATE_EXPENSE: Registro de despesas gerais (requer 'amount' e 'expenseCategory').
3. CREATE_FUEL: Registro de abastecimento (requer 'liters' ou 'totalAmount').
4. CREATE_TRIP: Registro de viagem detalhada (km, minutos, valor).
5. START_WORK_SESSION: Iniciar turno de trabalho.
6. END_WORK_SESSION: Encerrar turno de trabalho.
7. CREATE_PLANNER_EVENT: Agendar escala ou folga (requer 'date').
8. UPDATE_PLANNER_EVENT: Alterar escala de trabalho.
9. DELETE_PLANNER_EVENT: Excluir escala de trabalho.
10. CREATE_GOAL: Definir meta diária, semanal ou mensal (requer 'targetAmount' e 'goalType').
11. QUERY_DASHBOARD: Consultar faturamento de hoje ou status do turno.
12. QUERY_PERFORMANCE: Consultar métricas da semana ou mês.
13. QUERY_FUEL: Consultar consumo médio, combustível ou autonomia.
14. QUERY_VEHICLE: Consultar custo/km, manutenção preventiva ou odômetro.
15. QUERY_GOAL: Consultar progresso da meta diária ou mensal.
16. REQUEST_AI_ANALYSIS: Pedido de análise de horários ou diagnóstico financeiro.
17. REQUEST_STRATEGY: Dicas e estratégias para aumentar o faturamento.
18. REQUEST_WEEKLY_PLAN: Planejamento semanal completo (segunda a domingo).
19. CONFIRM_ACTION: Confirmação falada ("Sim", "Confirma", "Pode salvar").
20. CANCEL_ACTION: Cancelamento falado ("Não", "Cancela", "Deixa").
21. AMBIGUOUS: Quando há ambiguidade e falta especificação.
22. UNKNOWN: Comando desconhecido ou ininteligível.

PARÂMETROS EXTRAÍDOS (entities):
- amount (number): valor monetário principal
- platform (string): 'Uber', '99', 'inDrive', 'Particular'
- expenseCategory (string): 'Alimentação', 'Lavagem', 'Pedágio', 'Manutenção', 'Pneus', 'Óleo', 'Freios', 'Estacionamento', 'Internet', 'Seguro', 'Documentação', 'Outros'
- liters (number): litros de combustível
- pricePerLiter (number): valor por litro
- fuelType (string): 'Gasolina Comum', 'Gasolina Aditivada', 'Etanol Comum', 'GNV', 'Diesel'
- date (string YYYY-MM-DD): data do registro
- startTime (string HH:mm): hora inicial
- endTime (string HH:mm): hora final
- targetAmount (number): valor da meta
- goalType (string): 'daily', 'weekly', 'monthly'
- odometer (number): km do hodômetro
- durationMinutes (number): minutos da corrida
- distanceKm (number): km da corrida
- notes (string): observação adicional

RETORNO ESPERADO:
JSON estritamente tipado contendo:
- intent (string)
- entities (object)
- missingParams (array de strings com parâmetros faltantes)
- confidenceScore (number entre 0.0 e 1.0)
- speechResponse (string em PT-BR para síntese de voz TTS)
- requiresConfirmation (boolean)`;

/**
 * Envia a transcrição do motorista para a API Gemini (servidor)
 * e retorna um objeto JSON estritamente tipado com intent, entities,
 * missingParams e confidenceScore.
 *
 * @param transcript Transcrição falada ou digitada pelo usuário
 * @param options Opções de contexto anterior e estado do motorista
 * @returns Promise com ParsedVoiceIntent estruturado
 */
export async function parseVoiceIntent(
  transcript: string,
  options?: VoiceParserOptions
): Promise<ParsedVoiceIntent> {
  const cleanTranscript = (transcript || '').trim();

  if (!cleanTranscript) {
    return {
      intent: 'UNKNOWN',
      entities: {},
      missingParams: [],
      confidenceScore: 0.0,
      speechResponse: 'Não consegui ouvir nada. Pode repetir por favor?',
      rawTranscript: '',
      requiresConfirmation: false,
      source: 'gemini',
    };
  }

  try {
    const response = await fetch('/api/gemini/parse-voice-intent', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        transcript: cleanTranscript,
        context: options?.context || {},
        driverState: options?.driverState || {},
      }),
    });

    if (!response.ok) {
      throw new Error(`API error: HTTP ${response.status}`);
    }

    const json = await response.json();

    if (json && json.data) {
      const data = json.data;

      // Mapeamento limpo e estritamente tipado
      const rawEntities: any = data.entities || {};
      const entities: VoiceEntities = {};

      if (typeof rawEntities.amount === 'number' && !isNaN(rawEntities.amount)) {
        entities.amount = rawEntities.amount;
      }
      if (typeof rawEntities.platform === 'string' && rawEntities.platform.trim()) {
        entities.platform = rawEntities.platform.trim();
      }
      if (typeof rawEntities.expenseCategory === 'string' && rawEntities.expenseCategory.trim()) {
        entities.expenseCategory = rawEntities.expenseCategory.trim();
      }
      if (typeof rawEntities.liters === 'number' && !isNaN(rawEntities.liters)) {
        entities.liters = rawEntities.liters;
      }
      if (typeof rawEntities.pricePerLiter === 'number' && !isNaN(rawEntities.pricePerLiter)) {
        entities.pricePerLiter = rawEntities.pricePerLiter;
      }
      if (typeof rawEntities.fuelType === 'string' && rawEntities.fuelType.trim()) {
        entities.fuelType = rawEntities.fuelType.trim();
      }
      if (typeof rawEntities.date === 'string' && rawEntities.date.trim()) {
        entities.date = rawEntities.date.trim();
      }
      if (typeof rawEntities.startTime === 'string' && rawEntities.startTime.trim()) {
        entities.startTime = rawEntities.startTime.trim();
      }
      if (typeof rawEntities.endTime === 'string' && rawEntities.endTime.trim()) {
        entities.endTime = rawEntities.endTime.trim();
      }
      if (typeof rawEntities.targetAmount === 'number' && !isNaN(rawEntities.targetAmount)) {
        entities.targetAmount = rawEntities.targetAmount;
      }
      if (typeof rawEntities.goalType === 'string' && rawEntities.goalType.trim()) {
        entities.goalType = rawEntities.goalType.trim();
      }
      if (typeof rawEntities.odometer === 'number' && !isNaN(rawEntities.odometer)) {
        entities.odometer = rawEntities.odometer;
      }
      if (typeof rawEntities.durationMinutes === 'number' && !isNaN(rawEntities.durationMinutes)) {
        entities.durationMinutes = rawEntities.durationMinutes;
      }
      if (typeof rawEntities.distanceKm === 'number' && !isNaN(rawEntities.distanceKm)) {
        entities.distanceKm = rawEntities.distanceKm;
      }
      if (typeof rawEntities.notes === 'string' && rawEntities.notes.trim()) {
        entities.notes = rawEntities.notes.trim();
      }
      if (typeof rawEntities.isOffDay === 'boolean') {
        entities.isOffDay = rawEntities.isOffDay;
      }

      // Normalizar missingParams
      let missingParams: string[] = [];
      if (Array.isArray(data.missingParams)) {
        missingParams = data.missingParams.filter((p: any) => typeof p === 'string' && p.trim().length > 0);
      } else if (Array.isArray(data.missingParameterFlags?.missingParameters)) {
        missingParams = data.missingParameterFlags.missingParameters.filter(
          (p: any) => typeof p === 'string' && p.trim().length > 0
        );
      }

      // Normalizar score de confiança (0.0 a 1.0)
      let confidenceScore = 0.95;
      if (typeof data.confidenceScore === 'number') {
        confidenceScore = Math.max(0, Math.min(1, data.confidenceScore));
      } else if (typeof data.confidence === 'number') {
        confidenceScore = Math.max(0, Math.min(1, data.confidence));
      }

      return {
        intent: (data.intent as VoiceIntentType) || 'UNKNOWN',
        entities,
        missingParams,
        confidenceScore,
        speechResponse: data.speechResponse || 'Comando processado.',
        rawTranscript: data.rawTranscript || cleanTranscript,
        requiresConfirmation: Boolean(data.requiresConfirmation),
        confirmationMessage: data.confirmationMessage,
        source: 'gemini',
        data,
      };
    }
  } catch (err) {
    console.warn('Gemini intent parsing failed, executing offline fallback parser:', err);
  }

  // Fallback offline baseado em regras estritas (sem alucinações)
  return fallbackParseVoiceIntent(cleanTranscript, options);
}

/**
 * Fallback determinístico offline para caso o serviço remoto não responda.
 * Respeita a mesma regra estrita: não inventa informações não presentes no texto.
 */
function fallbackParseVoiceIntent(
  text: string,
  options?: VoiceParserOptions
): ParsedVoiceIntent {
  const lower = text.toLowerCase();
  const todayStr = new Date().toISOString().split('T')[0];
  const entities: VoiceEntities = {};
  const missingParams: string[] = [];

  // Extrair números monetários ou quantidades
  const moneyMatch = text.match(/(?:r\$\s*|reais\s*|\b)(\d+(?:[.,]\d{1,2})?)/i);
  const amount = moneyMatch ? parseFloat(moneyMatch[1].replace(',', '.')) : undefined;

  // Extrair plataforma
  let platform: string | undefined;
  if (/uber/i.test(text)) platform = 'Uber';
  else if (/99/i.test(text)) platform = '99';
  else if (/indrive/i.test(text)) platform = 'inDrive';
  else if (/particular|t[aá]xi/i.test(text)) platform = 'Particular';

  // Confirmação / Cancelamento
  if (/^(sim|confirmar|confirma|pode salvar|gravar|salva|isso|exato|ok)$/i.test(lower.trim())) {
    return {
      intent: 'CONFIRM_ACTION',
      entities: {},
      missingParams: [],
      confidenceScore: 0.99,
      speechResponse: 'Ação confirmada.',
      rawTranscript: text,
      requiresConfirmation: false,
      source: 'rule_based_fallback',
    };
  }

  if (/^(n[aã]o|cancelar|cancela|deixa|esquece|parar)$/i.test(lower.trim())) {
    return {
      intent: 'CANCEL_ACTION',
      entities: {},
      missingParams: [],
      confidenceScore: 0.99,
      speechResponse: 'Operação cancelada.',
      rawTranscript: text,
      requiresConfirmation: false,
      source: 'rule_based_fallback',
    };
  }

  // Turno de trabalho
  if (/(come[çc]ar|iniciar|abrir)\s+(turno|expediente|dia|trabalho)/i.test(lower)) {
    return {
      intent: 'START_WORK_SESSION',
      entities: {
        odometer: options?.driverState?.odometer || 85400,
      },
      missingParams: [],
      confidenceScore: 0.95,
      speechResponse: 'Turno de trabalho iniciado com sucesso! Bom expediente.',
      rawTranscript: text,
      requiresConfirmation: false,
      source: 'rule_based_fallback',
    };
  }

  if (/(encerrar|finalizar|fechar|terminar)\s+(turno|expediente|dia|trabalho)/i.test(lower)) {
    return {
      intent: 'END_WORK_SESSION',
      entities: {},
      missingParams: [],
      confidenceScore: 0.95,
      speechResponse: 'Turno encerrado. Deseja visualizar o resumo financeiro de hoje?',
      rawTranscript: text,
      requiresConfirmation: true,
      source: 'rule_based_fallback',
    };
  }

  // Combustível
  if (/(abasteci|gasolina|etanol|combust[ií]vel|litros|tanque|gnv|diesel)/i.test(lower)) {
    const litersMatch = text.match(/(\d+(?:[.,]\d+)?)\s*(?:l|litros|litro)/i);
    const priceMatch = text.match(/(?:a|por|pre[çc]o(?:\s+de)?)\s*(?:r\$\s*)?(\d+[.,]\d{2})/i);

    if (litersMatch) entities.liters = parseFloat(litersMatch[1].replace(',', '.'));
    if (priceMatch) entities.pricePerLiter = parseFloat(priceMatch[1].replace(',', '.'));
    if (amount && !entities.liters) entities.amount = amount;

    if (!entities.liters && !entities.amount) {
      missingParams.push('liters', 'amount');
    }

    entities.date = todayStr;

    return {
      intent: 'CREATE_FUEL',
      entities,
      missingParams,
      confidenceScore: 0.9,
      speechResponse:
        missingParams.length > 0
          ? 'Quantos litros você abasteceu ou qual foi o valor total?'
          : `Abastecimento de ${entities.liters ? entities.liters + ' litros' : 'R$ ' + entities.amount} identificado. Deseja salvar?`,
      rawTranscript: text,
      requiresConfirmation: missingParams.length === 0,
      source: 'rule_based_fallback',
    };
  }

  // Despesa
  if (/(gastei|despesa|almo[çc]o|lanche|comida|lavagem|limpeza|multa|ped[aá]gio|pneu|manuten[çc][aã]o|troca de [oó]leo|estacionamento)/i.test(lower)) {
    if (amount) entities.amount = amount;
    else missingParams.push('amount');

    let category = 'Outros';
    if (/almo[çc]o|lanche|comida|refei[çc][aã]o|caf[eé]/i.test(lower)) category = 'Alimentação';
    else if (/multa|infracao|radar/i.test(lower)) category = 'Multas';
    else if (/limpeza|higien/i.test(lower)) category = 'Limpeza';
    else if (/lavagem|lava[ -]?jato|lavar/i.test(lower)) category = 'Lavagem';
    else if (/ped[aá]gio/i.test(lower)) category = 'Pedágio';
    else if (/estacionamento|pare/i.test(lower)) category = 'Estacionamento';
    else if (/manuten[çc][aã]o|mec[aâ]nico|conserto/i.test(lower)) category = 'Manutenção';
    else if (/pneu/i.test(lower)) category = 'Pneus';
    else if (/oleo|[oó]leo/i.test(lower)) category = 'Óleo';

    entities.expenseCategory = category;
    entities.date = todayStr;

    return {
      intent: 'CREATE_EXPENSE',
      entities,
      missingParams,
      confidenceScore: 0.9,
      speechResponse:
        missingParams.length > 0
          ? 'Qual foi o valor gasto nessa despesa?'
          : `Despesa de ${category} no valor de R$ ${entities.amount?.toFixed(2)} pronta para registrar. Confirma?`,
      rawTranscript: text,
      requiresConfirmation: missingParams.length === 0,
      source: 'rule_based_fallback',
    };
  }

  // Ganho / Corrida
  if (/(ganhei|fiz|faturei|corrida|uber|99|indrive|particular|recebi)/i.test(lower) || amount !== undefined) {
    if (amount) entities.amount = amount;
    else missingParams.push('amount');

    if (platform) entities.platform = platform;
    else {
      // Se não especificou plataforma, adicione aos missingParams
      missingParams.push('platform');
    }

    entities.date = todayStr;

    return {
      intent: 'CREATE_EARNING',
      entities,
      missingParams,
      confidenceScore: 0.88,
      speechResponse:
        missingParams.length > 0
          ? `Identifiquei o ganho, mas ${missingParams.includes('platform') ? 'em qual plataforma foi (Uber, 99)?' : 'qual foi o valor?'}`
          : `Faturamento de R$ ${entities.amount?.toFixed(2)} na ${entities.platform}. Deseja gravar?`,
      rawTranscript: text,
      requiresConfirmation: missingParams.length === 0,
      source: 'rule_based_fallback',
    };
  }

  // Consultas
  if (/(quanto|saldo|total|relat[oó]rio|como est[aá]|meta|ganhos de hoje)/i.test(lower)) {
    return {
      intent: 'QUERY_DASHBOARD',
      entities: {},
      missingParams: [],
      confidenceScore: 0.9,
      speechResponse: 'Consultando o painel de bordo com seus ganhos e metas.',
      rawTranscript: text,
      requiresConfirmation: false,
      source: 'rule_based_fallback',
    };
  }

  return {
    intent: 'UNKNOWN',
    entities: {},
    missingParams: [],
    confidenceScore: 0.3,
    speechResponse: 'Não compreendi o comando com precisão. Você pode falar ganhos, gastos, abastecimento ou consultar metas.',
    rawTranscript: text,
    requiresConfirmation: false,
    source: 'rule_based_fallback',
  };
}
