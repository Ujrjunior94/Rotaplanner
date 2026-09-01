import express from 'express';
import path from 'path';
import dotenv from 'dotenv';
import { GoogleGenAI, Type } from '@google/genai';
import { createServer as createViteServer } from 'vite';

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json());

// Lazy initialization for Gemini client on the server side
let aiClient: GoogleGenAI | null = null;
function getAIClient(): GoogleGenAI {
  if (!aiClient) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error('GEMINI_API_KEY is not configured on the server.');
    }
    aiClient = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });
  }
  return aiClient;
}

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', serverTime: new Date().toISOString() });
});

// Dedicated IntentParser Endpoint using Gemini (gemini-3.7-flash)
const handleParseIntentRequest = async (req: express.Request, res: express.Response) => {
  try {
    const { transcript, context, driverState } = req.body;

    if (!transcript || typeof transcript !== 'string' || !transcript.trim()) {
      return res.status(400).json({
        error: 'Transcript is required.',
      });
    }

    const todayDate = new Date().toISOString().split('T')[0];
    const systemPrompt = `Você é o 'IntentParser', o motor de compreensão de linguagem natural especializado para motoristas de aplicativo do Brasil (Uber, 99, inDrive, Táxi, Particular).
Hoje é ${todayDate}.

Seu objetivo é analisar a transcrição falada ou digitada pelo motorista, classificar a intenção (intent), extrair todas as entidades relevantes (entities), identificar os parâmetros ausentes (missingParams) e calcular o score de confiança (confidenceScore).

DIRETIVA ESTRITA DE NÃO-ALUCINAÇÃO (EXCLUSION OF NON-EXISTENT INFORMATION):
- Extraia ESTRITAMENTE as informações explicitamente mencionadas na transcrição do usuário.
- É TERMINANTEMENTE PROIBIDO inventar, presumir ou alucinar valores monetários, categorias, plataformas, horários, litros ou datas que o usuário NÃO informou.
- Se uma informação requerida não foi explicitamente fornecida, NUNCA invente um número ou valor substituto; deixe a entidade correspondente como indefinida/nula e liste o nome do parâmetro faltante no array 'missingParams'.

Intenções possíveis (intent):
- CREATE_EARNING: Registro de faturamento/corrida/gorjeta (requer 'amount' e 'platform').
- CREATE_EXPENSE: Registro de despesa operacional (requer 'amount' e 'expenseCategory': Alimentação, Pedágio, Lavagem, Estacionamento, Internet, Pneus, Óleo, Freios, Manutenção, Documentação, Seguro, Outros).
- CREATE_FUEL: Registro de abastecimento (requer 'liters' ou 'totalAmount' ou 'pricePerLiter').
- CREATE_TRIP: Registro de viagem detalhada (km, tempo, valor).
- START_WORK_SESSION: Início de expediente / turno de trabalho.
- END_WORK_SESSION: Encerramento de expediente / turno de trabalho.
- CREATE_PLANNER_EVENT: Agendamento de dia de trabalho ou folga no planejador/escala (requer 'date').
- UPDATE_PLANNER_EVENT: Alteração na escala.
- DELETE_PLANNER_EVENT: Remoção da escala.
- CREATE_GOAL: Definição ou atualização de meta diária, semanal ou mensal (requer 'targetAmount' e 'goalType').
- QUERY_DASHBOARD: Consulta de ganhos do dia ou estado atual do turno.
- QUERY_PERFORMANCE: Consulta de métricas da semana ou do mês.
- QUERY_FUEL: Consulta de consumo, tanque, autonomia ou se deve abastecer.
- QUERY_VEHICLE: Consulta de custo por km do veículo, manutenção ou pneus.
- QUERY_GOAL: Consulta de progresso da meta.
- REQUEST_AI_ANALYSIS: Pedido de diagnóstico ou análise de horários lucrativos.
- REQUEST_STRATEGY: Pedido de dicas ou sugestões estratégicas para faturar mais.
- REQUEST_WEEKLY_PLAN: Pedido para montar a escala completa da próxima semana (segunda a domingo).
- AMBIGUOUS: Quando há ambiguidade (ex: falou só um número "200" sem especificar se é ganho, gasto ou gasolina).
- CONFIRM_ACTION: Confirmação falada ("Sim", "Confirmar", "Pode salvar").
- CANCEL_ACTION: Cancelamento falado ("Não", "Cancela", "Deixa").
- UNKNOWN: Não compreendido com clareza.

Regras de Missing Params:
- Para CREATE_EARNING: se faltar valor -> adicionar 'amount' a missingParams; se faltar plataforma -> adicionar 'platform' a missingParams.
- Para CREATE_EXPENSE: se faltar valor -> adicionar 'amount'; se faltar categoria -> adicionar 'expenseCategory'.
- Para CREATE_FUEL: se faltar litros e totalAmount -> adicionar 'liters' ou 'totalAmount'.
- Para CREATE_PLANNER_EVENT: se faltar data -> adicionar 'date'.
- Para CREATE_GOAL: se faltar valor -> adicionar 'targetAmount'; se faltar tipo -> adicionar 'goalType'.

Retorne ESTRITAMENTE um objeto JSON válido correspondente à estrutura solicitada.`;

    const promptUser = `Contexto atual do motorista:
- Odômetro atual: ${driverState?.odometer || 85400} km
- Meta diária: R$ ${driverState?.dailyGoal || 250}
- Meta mensal: R$ ${driverState?.monthlyGoal || 5000}
- Expediente ativo no momento: ${driverState?.activeSession ? 'SIM' : 'NÃO'}
- Preço referência gasolina: R$ ${driverState?.gasPriceReference || 5.89}
- Última intenção do diálogo: ${context?.lastIntent || 'NENHUMA'}

Transcrição do motorista a analisar:
"${transcript}"`;

    const ai = getAIClient();
    const response = await ai.models.generateContent({
      model: 'gemini-3.7-flash',
      contents: promptUser,
      config: {
        systemInstruction: systemPrompt,
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            intent: {
              type: Type.STRING,
              description: 'Intenção padronizada identificada',
            },
            confidenceScore: {
              type: Type.NUMBER,
              description: 'Score de confiança entre 0.0 e 1.0',
            },
            confidence: {
              type: Type.NUMBER,
              description: 'Nível de confiança entre 0.0 e 1.0',
            },
            rawTranscript: {
              type: Type.STRING,
              description: 'A transcrição original analisada',
            },
            speechResponse: {
              type: Type.STRING,
              description: 'Resposta curta e objetiva em Português do Brasil para sintetizador de voz (TTS)',
            },
            missingParams: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: 'Array de parâmetros obrigatórios que não foram fornecidos',
            },
            requiresConfirmation: {
              type: Type.BOOLEAN,
              description: 'Se a ação exige confirmação antes de gravar no banco',
            },
            confirmationMessage: {
              type: Type.STRING,
              description: 'Texto descritivo do card de confirmação',
            },
            entities: {
              type: Type.OBJECT,
              properties: {
                amount: { type: Type.NUMBER, description: 'Valor monetário principal' },
                platform: { type: Type.STRING, description: 'Uber, 99, inDrive, Particular' },
                liters: { type: Type.NUMBER, description: 'Volume de combustível em litros' },
                pricePerLiter: { type: Type.NUMBER, description: 'Preço pago por litro de combustível' },
                fuelType: { type: Type.STRING, description: 'Gasolina Comum, Etanol Comum, GNV, Diesel' },
                expenseCategory: { type: Type.STRING, description: 'Categoria da despesa' },
                date: { type: Type.STRING, description: 'Data formato AAAA-MM-DD' },
                startTime: { type: Type.STRING, description: 'Horário de início (HH:mm)' },
                endTime: { type: Type.STRING, description: 'Horário de fim (HH:mm)' },
                targetAmount: { type: Type.NUMBER, description: 'Valor alvo da meta' },
                goalType: { type: Type.STRING, description: 'daily, weekly ou monthly' },
                odometer: { type: Type.NUMBER, description: 'Quilometragem do odômetro' },
                durationMinutes: { type: Type.NUMBER, description: 'Duração da viagem em minutos' },
                distanceKm: { type: Type.NUMBER, description: 'Distância percorrida em km' },
                notes: { type: Type.STRING, description: 'Observações adicionais extraídas' },
                isOffDay: { type: Type.BOOLEAN, description: 'Se o evento no planejador é folga' },
              },
            },
            missingParameterFlags: {
              type: Type.OBJECT,
              properties: {
                isMissingAmount: { type: Type.BOOLEAN },
                isMissingPlatform: { type: Type.BOOLEAN },
                isMissingCategory: { type: Type.BOOLEAN },
                isMissingLiters: { type: Type.BOOLEAN },
                isMissingPricePerLiter: { type: Type.BOOLEAN },
                isMissingDate: { type: Type.BOOLEAN },
                isMissingTimeRange: { type: Type.BOOLEAN },
                isMissingGoalType: { type: Type.BOOLEAN },
                missingParameters: {
                  type: Type.ARRAY,
                  items: { type: Type.STRING },
                  description: 'Lista de parâmetros que faltam para executar a ação',
                },
                canExecuteImmediately: {
                  type: Type.BOOLEAN,
                  description: 'True se todos os parâmetros obrigatórios foram fornecidos',
                },
              },
            },
            ambiguityQuestion: {
              type: Type.STRING,
              description: 'Pergunta para desambiguação se intent for AMBIGUOUS',
            },
            ambiguityOptions: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  label: { type: Type.STRING },
                  actionText: { type: Type.STRING },
                },
              },
            },
            strategyInsights: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: 'Lista de insights gerados se for análise ou estratégia',
            },
            queryDetails: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  label: { type: Type.STRING },
                  value: { type: Type.STRING },
                },
              },
            },
            weeklyPlanItems: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  dayName: { type: Type.STRING },
                  dayShort: { type: Type.STRING },
                  date: { type: Type.STRING },
                  type: { type: Type.STRING, description: 'work ou off' },
                  startTime: { type: Type.STRING },
                  endTime: { type: Type.STRING },
                  targetEarnings: { type: Type.NUMBER },
                },
              },
            },
          },
        },
      },
    });

    const rawJsonText = response.text?.trim() || '{}';
    const parsedData = JSON.parse(rawJsonText);

    // Normalize confidenceScore and missingParams if missing in root
    if (parsedData.confidenceScore === undefined && parsedData.confidence !== undefined) {
      parsedData.confidenceScore = parsedData.confidence;
    }
    if (!Array.isArray(parsedData.missingParams)) {
      parsedData.missingParams = parsedData.missingParameterFlags?.missingParameters || [];
    }

    return res.json({
      success: true,
      data: parsedData,
      source: 'gemini-3.7-flash',
    });
  } catch (error: any) {
    console.error('Error in /api/gemini/parse-intent:', error);
    return res.status(500).json({
      success: false,
      error: error?.message || 'Failed to parse intent with Gemini',
    });
  }
};

app.post('/api/gemini/parse-intent', handleParseIntentRequest);
app.post('/api/gemini/parse-voice-intent', handleParseIntentRequest);

// Vite middleware in dev or static server in production
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Driver Planner Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
