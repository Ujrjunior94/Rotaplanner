import React, { useState, useMemo } from 'react';
import { useDriver } from '../context/DriverContext';
import {
  formatCurrency,
  formatKm,
  safeDivide,
} from '../utils/calc';
import { findVehicleSpecs, calcVehicleAutonomies } from '../data/vehicleDatabase';
import {
  Sparkles,
  Clock,
  Navigation,
  Compass,
  TrendingUp,
  MapPin,
  Flame,
  Zap,
  CheckCircle2,
  Calendar,
  Layers,
  ChevronRight,
  ShieldCheck,
  AlertCircle,
  Car,
  Plane,
  Building2,
  GraduationCap,
  ShoppingBag,
  Leaf,
  Fuel,
  Gauge,
  Wind,
  Sliders,
  DollarSign,
} from 'lucide-react';

interface SmartTipsCardProps {
  onNavigateTab?: (tab: string) => void;
}

export const SmartTipsCard: React.FC<SmartTipsCardProps> = ({ onNavigateTab }) => {
  const { sessions, earnings, profile, vehicle } = useDriver();

  const [activeTab, setActiveTab] = useState<'hours' | 'routes' | 'strategy' | 'eco'>('hours');
  const [customConsumptionDelta, setCustomConsumptionDelta] = useState<number>(1.5); // Melhora de +1.5 km/L no simulador

  // Hora atual do dia
  const currentHour = new Date().getHours();
  const currentDayOfWeek = new Date().getDay(); // 0 = Dom, 1 = Seg, ..., 6 = Sab

  // 1. ANÁLISE DE CONSUMO E ESPECIFICAÇÃO DE FÁBRICA
  const matchedSpec = useMemo(() => {
    return findVehicleSpecs(vehicle.make, vehicle.model, vehicle.year);
  }, [vehicle.make, vehicle.model, vehicle.year]);

  const autonomies = useMemo(() => {
    if (matchedSpec) {
      return calcVehicleAutonomies(matchedSpec);
    }
    return null;
  }, [matchedSpec]);

  // Consumo médio real do motorista e comparação com padrão de fábrica
  const ecoAnalysis = useMemo(() => {
    const userConsumption = vehicle.avgConsumption || 11.0;
    const factoryCityGas = matchedSpec ? matchedSpec.cityConsumptionGas : 12.5;
    const tank = vehicle.tankCapacity || 50;
    const gasPrice = profile.gasPriceReference || 5.89;

    // Diferença em relação à fábrica
    const diffFromFactory = userConsumption - factoryCityGas;
    const isBelowFactory = diffFromFactory < -0.5;

    // Autonomia atual com tanque cheio
    const currentRangeKm = Math.round(tank * userConsumption);

    // Nova autonomia com a melhoria do simulador (+delta km/L)
    const targetConsumption = userConsumption + customConsumptionDelta;
    const improvedRangeKm = Math.round(tank * targetConsumption);
    const extraRangeKm = improvedRangeKm - currentRangeKm;

    // Economia financeira estimada considerando ~2.500 km rodados por mês
    const monthlyEstimatedKm = 2500;
    const litersCurrentMonth = safeDivide(monthlyEstimatedKm, userConsumption);
    const litersImprovedMonth = safeDivide(monthlyEstimatedKm, targetConsumption);
    const savedLitersMonth = Math.max(0, litersCurrentMonth - litersImprovedMonth);
    const monthlyCashSavings = savedLitersMonth * gasPrice;

    return {
      userConsumption,
      factoryCityGas,
      diffFromFactory,
      isBelowFactory,
      currentRangeKm,
      targetConsumption,
      improvedRangeKm,
      extraRangeKm,
      savedLitersMonth: Math.round(savedLitersMonth * 10) / 10,
      monthlyCashSavings,
      gasPrice,
    };
  }, [vehicle.avgConsumption, vehicle.tankCapacity, profile.gasPriceReference, matchedSpec, customConsumptionDelta]);

  // 2. DICAS PRÁTICAS DE COMPORTAMENTO PARA ECO-DRIVING
  const ecoTips = useMemo(() => {
    return [
      {
        id: 'cutoff',
        title: 'Sistema Cut-Off (Desaceleração Engatada)',
        badge: 'Economia Imediata',
        badgeColor: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
        impact: 'Zera consumo (0.0 L/h) em declives e paradas',
        description: 'Nunca coloque em ponto morto ("banguela"). Quando você desce engatado sem pisar no acelerador, a injeção eletrônica corta 100% da injeção de combustível, além de preservar freios e pastilhas.',
        action: 'Tire o pé do acelerador e mantenha a marcha engatada até atingir 1.200 RPM.',
      },
      {
        id: 'rpm_acceleration',
        title: 'Aceleração Progressiva & Faixa de Rotação',
        badge: 'Até 15% de Economia',
        badgeColor: 'bg-teal-500/20 text-teal-300 border-teal-500/30',
        impact: 'Reduz picos de injeção rica na câmara',
        description: 'Arrancadas bruscas em semáforos são o maior vilão do motorista de app. Passe as marchas entre 1.800 e 2.200 RPM (ou mantenha o câmbio no modo ECO).',
        action: 'Imagine que há um copo com água no painel que não pode derramar na arrancada.',
      },
      {
        id: 'tire_pressure',
        title: 'Calibragem Semanal (+2 a +3 PSI para App)',
        badge: 'Ganho de +4% Autonomia',
        badgeColor: 'bg-sky-500/20 text-sky-300 border-sky-500/30',
        impact: 'Menor atrito de rolamento com passageiros',
        description: 'Como o carro de aplicativo roda com passageiros e bagagens frequentemente, calibrar com 2 a 3 PSI acima da pressão de carga leve reduz a resistência ao rolamento.',
        action: 'Calibre os 4 pneus a cada 7 dias, sempre pela manhã com os pneus ainda frios.',
      },
      {
        id: 'ac_management',
        title: 'Gerenciamento de Ar-Condicionado x Arrasto',
        badge: 'Regra dos 70 km/h',
        badgeColor: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
        impact: 'Equilíbrio térmico e aerodinâmico',
        description: 'Abaixo de 60-70 km/h no trânsito, o A/C gasta cerca de 8-12% mais combustível. Acima de 70 km/h em vias expressas, vidros abertos geram turbulência que consome mais que o compressor ligado.',
        action: 'Acione a recirculação interna do A/C para resfriar a cabine 3x mais rápido sem forçar o compressor.',
      },
      {
        id: 'green_wave',
        title: 'Previsão de Semáforos ("Onda Verde")',
        badge: 'Fluidez Urbana',
        badgeColor: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30',
        impact: 'Elimina paradas totais desnecessárias',
        description: 'Ao avistar o semáforo vermelho 150m à frente, não acelere até o fim para frear em cima. Deixe o carro rolar engrenado até o sinal abrir e retome em movimento sem gastar energia de arrancada.',
        action: 'Manter velocidade constante de 45-55 km/h sincroniza com a maioria das ondas verdes municipais.',
      },
      {
        id: 'idle_management',
        title: 'Gestão de Marcha Lenta em Esperas',
        badge: 'Corte de Desperdício',
        badgeColor: 'bg-rose-500/20 text-rose-300 border-rose-500/30',
        impact: 'Economiza 0.8L a 1.2L por hora parado',
        description: 'Carro parado com motor ligado consome sem gerar faturamento. Se a espera pelo passageiro passar de 60 segundos ou se você estiver aguardando chamada em área segura, desligue o motor.',
        action: 'Estacione na sombra em pontos com boa conectividade 5G para aguardar novas chamadas.',
      },
    ];
  }, []);

  // 1. ANÁLISE HISTÓRICA DE HORÁRIOS DE ALTA DEMANDA
  const hourlyAnalysis = useMemo(() => {
    // Definir 4 blocos operacionais estratégicos do mercado brasileiro
    const blocks = [
      {
        id: 'morning_peak',
        name: 'Pico Matutino',
        timeRange: '06:00 - 09:30',
        startHour: 6,
        endHour: 9.5,
        icon: SunIcon,
        context: 'Deslocamento casa-trabalho, aeroportos, rodoviárias e centros médicos.',
        targetStrategy: 'Aceitar viagens em direção a corredores de escritórios e terminais de transporte.',
        baseRateMultiplier: 1.25,
      },
      {
        id: 'lunch_commercial',
        name: 'Comercial & Almoço',
        timeRange: '11:30 - 14:00',
        startHour: 11.5,
        endHour: 14,
        icon: ShoppingBag,
        context: 'Centros gastronômicos, shoppings, fóruns e reuniões externas.',
        targetStrategy: 'Corridas curtas de rápida rotação no miolo urbano central.',
        baseRateMultiplier: 1.05,
      },
      {
        id: 'evening_peak',
        name: 'Pico Noturno (Saída)',
        timeRange: '17:00 - 20:30',
        startHour: 17,
        endHour: 20.5,
        icon: Flame,
        context: 'Saída de escritórios, retorno para bairros residenciais e universidades.',
        targetStrategy: 'Filtro de viagens em direção a bairros com retorno rápido ou polo gastronômico.',
        baseRateMultiplier: 1.35,
      },
      {
        id: 'night_weekend',
        name: 'Madrugada & Eventos',
        timeRange: '21:30 - 03:00',
        startHour: 21.5,
        endHour: 27, // até 3h da manhã do dia seguinte
        icon: MoonIcon,
        context: 'Bares, shows, baladas, aeroportos e saídas de restaurantes.',
        targetStrategy: 'Tarifa dinâmica agressiva com menor fluxo de trânsito e semáforos livres.',
        baseRateMultiplier: 1.4,
      },
    ];

    // Calcular estatísticas reais baseadas nas sessões salvas
    const totalHistoricalGross = sessions.reduce((acc, s) => acc + s.grossEarnings + s.tips, 0);
    const totalHistoricalHours = sessions.reduce((acc, s) => {
      if (!s.endTime) return acc;
      return acc + (new Date(s.endTime).getTime() - new Date(s.startTime).getTime()) / 3600000;
    }, 0);

    const baseHourlyRate = safeDivide(totalHistoricalGross, totalHistoricalHours) || profile.minAcceptableRateHour || 35.0;

    return blocks.map(block => {
      // Verificar se está ativo no momento
      const nowDecimal = currentHour + (new Date().getMinutes() / 60);
      let isActiveNow = false;
      if (block.id === 'night_weekend') {
        isActiveNow = nowDecimal >= 21.5 || nowDecimal < 3.5;
      } else {
        isActiveNow = nowDecimal >= block.startHour && nowDecimal < block.endHour;
      }

      // Estimar faturamento por hora do bloco com base no histórico
      const estimatedRatePerHour = Math.round(baseHourlyRate * block.baseRateMultiplier * 10) / 10;

      // Calcular demanda esperada
      let demandLevel: 'MUITO ALTA' | 'ALTA' | 'MÉDIA' = 'ALTA';
      if (block.id === 'evening_peak' || block.id === 'morning_peak') {
        demandLevel = 'MUITO ALTA';
      }

      return {
        ...block,
        estimatedRatePerHour,
        isActiveNow,
        demandLevel,
      };
    });
  }, [sessions, profile, currentHour]);

  // 2. ROTAS E CORREDORES ESTRATÉGICOS SUGERIDOS
  const strategicRoutes = useMemo(() => {
    return [
      {
        id: 'route_airport',
        title: 'Corredor Aeroportos & Terminais Rodoviários',
        bestHours: '05:30 às 08:30 e Domingo 18h às 23h',
        icon: Plane,
        badge: 'Maior R$/KM',
        badgeColor: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
        advantage: 'Corridas de longo percurso, velocidade média superior e trânsito livre nas primeiras horas.',
        actionTip: 'Posicione-se em bolsões estratégicos ou bairros nobres no primeiro horário da manhã para fisgar viagens corporativas.',
        expectedRateKm: 'R$ 2.40 - R$ 3.20/km',
      },
      {
        id: 'route_business',
        title: 'Eixo Corporativo & Centros Financeiros',
        bestHours: '07:30 às 09:30 e 17:00 às 19:30',
        icon: Building2,
        badge: 'Tarifa Dinâmica Máxima',
        badgeColor: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
        advantage: 'Picos intensos de multiplicador de tarifa dinâmica nas saídas dos edifícios comerciais.',
        actionTip: 'Evite aceitar viagens para bairros isolados sem demanda de volta. Priorize rotas com destino a polos residenciais densos.',
        expectedRateKm: 'R$ 2.60 - R$ 3.80/km',
      },
      {
        id: 'route_university',
        title: 'Corredor Universitário & Polos Gastronômicos',
        bestHours: '21:30 às 01:00 (Quinta a Sábado)',
        icon: GraduationCap,
        badge: 'Alta Frequência de Viagens',
        badgeColor: 'bg-teal-500/20 text-teal-300 border-teal-500/30',
        advantage: 'Giro rápido de corridas consecutivas com gorjetas adicionais e baixíssimo tempo de espera.',
        actionTip: 'Ligue o aplicativo 99 ou Uber simultaneamente para manter a taxa de ociosidade em menos de 5 minutos entre chamadas.',
        expectedRateKm: 'R$ 2.20 - R$ 2.90/km',
      },
      {
        id: 'route_medical',
        title: 'Complexos Hospitalares & Centros Médicos',
        bestHours: '10:00 às 15:30 (Entre picos)',
        icon: MapPin,
        badge: 'Fluxo Contínuo Meio-Dia',
        badgeColor: 'bg-sky-500/20 text-sky-300 border-sky-500/30',
        advantage: 'Demanda estável durante o vale de corridas do meio do dia, quando o trânsito comercial desacelera.',
        actionTip: 'Ótima área para rodar quando o pico matinal encerra, mantendo a média de R$/h sem queimar combustível à toa.',
        expectedRateKm: 'R$ 2.10 - R$ 2.60/km',
      },
    ];
  }, []);

  // 3. ESTRATÉGIA DO DIA DA SEMANA (PERSONALIZADA)
  const dayStrategies = useMemo(() => {
    const map = [
      {
        day: 'Domingo',
        headline: 'Domingo: Dia de Corridas de Lazer, Shoppings e Aeroporto',
        keyTips: [
          'Trânsito muito livre na cidade: seu consumo de combustível cai até 15%.',
          'A partir das 17h, forte demanda de retorno de shoppings, parques e desembarques no aeroporto.',
          'Excelente dia para bater metas com menor desgaste físico e mental.',
        ],
        goldenRule: 'Priorize viagens de longa distância após as 16h em direção aos terminais.',
      },
      {
        day: 'Segunda-feira',
        headline: 'Segunda-feira: Foco no Deslocamento Corporativo Matinal',
        keyTips: [
          'O pico começa muito cedo (a partir das 05h45) com viagens executivas.',
          'Evite ficar circulando vazio entre 14h e 16h; aproveite para almoçar ou calibrar o carro.',
          'Na volta do trabalho (17h30), há forte dinâmica saindo do centro da cidade.',
        ],
        goldenRule: 'Comece seu turno 30 minutos antes do habitual para capturar a primeira onda sem concorrência.',
      },
      {
        day: 'Terça-feira',
        headline: 'Terça-feira: Dia de Consistência e Otimização de Rota',
        keyTips: [
          'Dia de tráfego previsível sem grandes picos de dinâmico extremo.',
          'Use o critério de corte mínimo de R$/km para não desgastar o carro em trechos lentos.',
          'Plataforma 99 e Uber costumam equilibrar o volume de chamadas.',
        ],
        goldenRule: 'Mantenha-se em áreas de média densidade com boa taxa de viagens consecutivas.',
      },
      {
        day: 'Quarta-feira',
        headline: 'Quarta-feira: Noite de Futebol e Happy Hour em Bares',
        keyTips: [
          'O movimento da noite se estende até as 23h30 em dias de jogos e eventos esportivos.',
          'O pico da manhã (07h às 09h) mantém-se forte em direção a polos empresariais.',
          'Abasteça no meio do dia para não perder tempo com filas de postos no início da noite.',
        ],
        goldenRule: 'Posicione-se próximo a arenas esportivas e avenidas de bares após as 21h30.',
      },
      {
        day: 'Quinta-feira',
        headline: 'Quinta-feira: Prévia do Fim de Semana com Alta Demanda Noturna',
        keyTips: [
          'O happy hour corporativo começa cedo (a partir das 18h).',
          'Tarifas dinâmicas frequentes entre 18h e 22h nas regiões de escritórios e restaurantes nobres.',
          'Vale a pena estender o turno noturno em 1 hora a mais.',
        ],
        goldenRule: 'Filtre corridas que te mantenham em zonas de vida noturna aquecida.',
      },
      {
        day: 'Sexta-feira',
        headline: 'Sexta-feira: O Dia Mais Lucrativo da Semana no Mercado',
        keyTips: [
          'Dia com maior faturamento bruto por hora do mercado brasileiro.',
          'Pico da tarde inicia mais cedo (16h) e emenda direto com a vida noturna até as 02h.',
          'Tarifas dinâmicas agressivas: seja seletivo e não aceite corridas com R$/km baixo.',
        ],
        goldenRule: 'Descanse bem antes do turno e foque na faixa das 16h30 às 23h30.',
      },
      {
        day: 'Sábado',
        headline: 'Sábado: Movimento Intenso o Dia Todo (Shoppings + Eventos)',
        keyTips: [
          'Manhã movimentada com compras, clínicas e cursos (08h às 12h).',
          'Tarde aquecida em polos de compras, centros de estética e parques.',
          'Madrugada com tarifas dinâmicas elevadas na saída de shows, festas e baladas.',
        ],
        goldenRule: 'Divida o dia em dois blocos (manhã/tarde ou tarde/madrugada) para manter o foco e a segurança.',
      },
    ];

    return map[currentDayOfWeek] || map[1];
  }, [currentDayOfWeek]);

  // Status dinâmico do momento
  const activeBlock = hourlyAnalysis.find(b => b.isActiveNow);

  return (
    <div className="bg-gradient-to-br from-slate-900 via-slate-900/95 to-emerald-950/30 border border-emerald-500/25 p-5 sm:p-6 rounded-3xl relative overflow-hidden space-y-4 shadow-xl">
      
      {/* GLOW DECORATIVO DE FUNDO */}
      <div className="absolute -right-16 -bottom-16 w-56 h-56 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* HEADER DO COMPONENTE */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/10 pb-4 relative z-10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-emerald-500 to-teal-400 text-slate-950 flex items-center justify-center font-black shadow-lg shadow-emerald-500/20 shrink-0">
            <Sparkles className="w-5 h-5 stroke-[2.5]" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm sm:text-base font-black text-white uppercase tracking-tight flex items-center gap-1.5">
                DICAS INTELIGENTES & DEMANDA
              </h3>
              <span className="text-[10px] bg-emerald-500/20 text-emerald-300 font-bold px-2 py-0.5 rounded-full border border-emerald-500/30">
                Histórico & Rotas
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Sugestões de horários de pico, rotas estratégicas e posicionamento para maximizar seu R$/h.
            </p>
          </div>
        </div>

        {/* STATUS DO MOMENTO ATUAL */}
        <div className="flex items-center gap-2 bg-black/40 px-3 py-1.5 rounded-2xl border border-white/10 self-start sm:self-auto">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
          <div className="text-right">
            <span className="text-[10px] text-slate-400 block font-bold leading-tight">AGORA ({currentHour.toString().padStart(2, '0')}:00)</span>
            <span className="text-xs font-black text-emerald-300">
              {activeBlock ? `🔥 ${activeBlock.name}` : 'Horário de Transição'}
            </span>
          </div>
        </div>
      </div>

      {/* TABS INTERNAS DE NAVEGAÇÃO */}
      <div className="flex items-center gap-2 border-b border-white/10 pb-2 overflow-x-auto relative z-10">
        <button
          type="button"
          onClick={() => setActiveTab('hours')}
          className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 whitespace-nowrap ${
            activeTab === 'hours'
              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-sm'
              : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
          }`}
        >
          <Clock className="w-3.5 h-3.5" />
          <span>Horários de Alta Demanda</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('routes')}
          className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 whitespace-nowrap ${
            activeTab === 'routes'
              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-sm'
              : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
          }`}
        >
          <Compass className="w-3.5 h-3.5" />
          <span>Rotas & Regiões Estratégicas</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('strategy')}
          className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 whitespace-nowrap ${
            activeTab === 'strategy'
              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-sm'
              : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
          }`}
        >
          <Zap className="w-3.5 h-3.5 text-amber-400" />
          <span>Estratégia de {dayStrategies.day}</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('eco')}
          className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 whitespace-nowrap ${
            activeTab === 'eco'
              ? 'bg-teal-500/25 text-teal-200 border border-teal-400/50 shadow-sm'
              : 'text-teal-400/80 hover:text-teal-200 hover:bg-teal-500/10'
          }`}
        >
          <Leaf className="w-3.5 h-3.5 text-teal-400" />
          <span>🌱 Direção Econômica & Autonomia</span>
        </button>
      </div>

      {/* ABA 1: HORÁRIOS DE ALTA DEMANDA */}
      {activeTab === 'hours' && (
        <div className="space-y-3 relative z-10">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {hourlyAnalysis.map(block => {
              const Icon = block.icon;
              return (
                <div
                  key={block.id}
                  className={`p-3.5 rounded-2xl border transition-all duration-200 space-y-2 relative overflow-hidden ${
                    block.isActiveNow
                      ? 'bg-emerald-950/40 border-emerald-400/60 shadow-lg shadow-emerald-500/10 ring-1 ring-emerald-500/30'
                      : 'bg-white/5 border-white/10 hover:border-white/20'
                  }`}
                >
                  {block.isActiveNow && (
                    <div className="absolute top-2 right-2 flex items-center gap-1 bg-emerald-500 text-slate-950 text-[9px] font-black px-1.5 py-0.5 rounded-md">
                      <span>ATIVO AGORA</span>
                    </div>
                  )}

                  <div className="flex items-center gap-2">
                    <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${
                      block.isActiveNow ? 'bg-emerald-500/20 text-emerald-300' : 'bg-white/10 text-slate-400'
                    }`}>
                      <Icon className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="text-xs font-black text-white">{block.name}</h4>
                      <span className="text-[10px] text-slate-400 font-mono font-bold block">{block.timeRange}</span>
                    </div>
                  </div>

                  <div className="bg-black/30 p-2 rounded-xl border border-white/5 flex items-center justify-between">
                    <span className="text-[10px] text-slate-400 uppercase font-bold">Rendimento Médio:</span>
                    <span className="text-xs font-black text-emerald-400">
                      {formatCurrency(block.estimatedRatePerHour)}/h
                    </span>
                  </div>

                  <p className="text-[11px] text-slate-300 leading-snug">
                    {block.context}
                  </p>

                  <div className="text-[10px] text-teal-300 bg-teal-500/10 p-1.5 rounded-lg border border-teal-500/20 flex items-start gap-1">
                    <span className="font-bold">🎯 Foco:</span>
                    <span className="text-slate-300">{block.targetStrategy}</span>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="bg-white/5 p-3 rounded-2xl border border-white/10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-xs text-slate-300">
            <div className="flex items-center gap-2">
              <Zap className="w-4 h-4 text-amber-400 shrink-0" />
              <span>
                <strong className="text-white">Dica de Ouro de Horário:</strong> Evite ficar rodando em círculos entre 14h e 16h (vale de demanda). Desligue o app ou estacione na sombra em áreas com sombra e sinal 5G para economizar combustível.
              </span>
            </div>
          </div>
        </div>
      )}

      {/* ABA 2: ROTAS E CORREDORES ESTRATÉGICOS */}
      {activeTab === 'routes' && (
        <div className="space-y-3 relative z-10">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {strategicRoutes.map(route => {
              const Icon = route.icon;
              return (
                <div
                  key={route.id}
                  className="bg-white/5 hover:bg-white/10 border border-white/10 p-4 rounded-2xl space-y-2.5 transition"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2.5">
                      <div className="w-9 h-9 rounded-xl bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 flex items-center justify-center shrink-0">
                        <Icon className="w-5 h-5" />
                      </div>
                      <div>
                        <h4 className="text-xs font-black text-white leading-tight">{route.title}</h4>
                        <span className="text-[10px] text-emerald-400 font-bold flex items-center gap-1 mt-0.5">
                          <Clock className="w-3 h-3" /> {route.bestHours}
                        </span>
                      </div>
                    </div>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border whitespace-nowrap ${route.badgeColor}`}>
                      {route.badge}
                    </span>
                  </div>

                  <p className="text-xs text-slate-300">
                    {route.advantage}
                  </p>

                  <div className="bg-slate-950/60 p-2.5 rounded-xl border border-white/5 space-y-1">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-slate-400 font-bold">Faixa de Ganho Esperada:</span>
                      <span className="text-emerald-400 font-black">{route.expectedRateKm}</span>
                    </div>
                    <p className="text-[10px] text-slate-400 pt-0.5 border-t border-white/5">
                      💡 <strong className="text-slate-200">Como se posicionar:</strong> {route.actionTip}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ABA 3: ESTRATÉGIA DO DIA DA SEMANA */}
      {activeTab === 'strategy' && (
        <div className="bg-white/5 p-4 sm:p-5 rounded-2xl border border-white/10 space-y-3.5 relative z-10">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Calendar className="w-5 h-5 text-emerald-400" />
              <h4 className="text-sm font-black text-white">{dayStrategies.headline}</h4>
            </div>
            <span className="text-xs font-bold text-emerald-400 bg-emerald-500/15 px-2.5 py-0.5 rounded-full border border-emerald-500/30">
              {dayStrategies.day}
            </span>
          </div>

          <div className="space-y-2">
            {dayStrategies.keyTips.map((tip, idx) => (
              <div key={idx} className="flex items-start gap-2 text-xs text-slate-300">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <span>{tip}</span>
              </div>
            ))}
          </div>

          {/* REGRA DE OURO */}
          <div className="bg-gradient-to-r from-amber-500/20 to-orange-500/10 border border-amber-500/30 p-3.5 rounded-xl space-y-1">
            <div className="flex items-center gap-1.5 text-xs font-black text-amber-300">
              <Zap className="w-4 h-4 fill-amber-400 text-amber-400" />
              <span>REGRA DE OURO PARA HOJE:</span>
            </div>
            <p className="text-xs font-bold text-white">
              {dayStrategies.goldenRule}
            </p>
          </div>
        </div>
      )}

      {/* ABA 4: DICAS DE DIREÇÃO ECONÔMICA & OTIMIZAÇÃO DE AUTONOMIA */}
      {activeTab === 'eco' && (
        <div className="space-y-4 relative z-10">
          
          {/* DIAGNÓSTICO DO CONSUMO REAL vs FÁBRICA */}
          <div className="bg-gradient-to-r from-teal-950/60 via-slate-900 to-emerald-950/40 border border-teal-500/30 p-4 sm:p-5 rounded-2xl space-y-3 shadow-lg">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-white/10 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-teal-500/20 text-teal-300 flex items-center justify-center font-black">
                  <Gauge className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs sm:text-sm font-black text-white flex items-center gap-2">
                    {vehicle.make} {vehicle.model} ({vehicle.year})
                    {matchedSpec && (
                      <span className="text-[9px] bg-teal-500/20 text-teal-300 px-2 py-0.5 rounded-full border border-teal-500/30 font-mono">
                        Inmetro Padrão: {matchedSpec.cityConsumptionGas} km/L Urbano
                      </span>
                    )}
                  </h4>
                  <span className="text-[11px] text-slate-400">
                    Seu consumo configurado atual: <strong className="text-white">{ecoAnalysis.userConsumption} km/L</strong> (Tanque {vehicle.tankCapacity}L = ~{ecoAnalysis.currentRangeKm} km de alcance)
                  </span>
                </div>
              </div>

              <div className="text-left sm:text-right">
                <span className="text-[10px] text-slate-400 block font-bold">STATUS DE EFICIÊNCIA:</span>
                <span className={`text-xs font-black px-2 py-0.5 rounded-md inline-block mt-0.5 ${
                  ecoAnalysis.isBelowFactory
                    ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                    : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                }`}>
                  {ecoAnalysis.isBelowFactory
                    ? `⚠️ ${Math.abs(Math.round(ecoAnalysis.diffFromFactory * 10) / 10)} km/L abaixo da fábrica`
                    : `✅ Ótima eficiência (+${Math.round(ecoAnalysis.diffFromFactory * 10) / 10} km/L vs fábrica)`
                  }
                </span>
              </div>
            </div>

            {/* SIMULADOR INTERATIVO DE ECONOMIA DE COMBUSTÍVEL */}
            <div className="bg-black/40 p-3.5 rounded-xl border border-white/10 space-y-2.5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-xs">
                <span className="font-bold text-slate-300 flex items-center gap-1.5">
                  <Sliders className="w-3.5 h-3.5 text-teal-400" />
                  Simular Ganho com Mudança de Hábito:
                </span>
                <span className="text-teal-300 font-black">
                  Melhoria de +{customConsumptionDelta.toFixed(1)} km/L (Novo Consumo: {(ecoAnalysis.userConsumption + customConsumptionDelta).toFixed(1)} km/L)
                </span>
              </div>

              <input
                type="range"
                min={0.5}
                max={4.0}
                step={0.1}
                value={customConsumptionDelta}
                onChange={e => setCustomConsumptionDelta(Number(e.target.value))}
                className="w-full accent-teal-400 cursor-pointer"
              />

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-center pt-1">
                <div className="bg-white/5 p-2 rounded-lg border border-white/5">
                  <span className="text-[10px] text-slate-400 uppercase font-bold">Alcance Extra / Tanque</span>
                  <div className="text-sm font-black text-teal-300 mt-0.5">
                    +{ecoAnalysis.extraRangeKm} km
                  </div>
                </div>

                <div className="bg-white/5 p-2 rounded-lg border border-white/5">
                  <span className="text-[10px] text-slate-400 uppercase font-bold">Litros Poupados / Mês</span>
                  <div className="text-sm font-black text-emerald-300 mt-0.5">
                    {ecoAnalysis.savedLitersMonth} Litros
                  </div>
                </div>

                <div className="bg-white/5 p-2 rounded-lg border border-white/5 col-span-2 sm:col-span-1">
                  <span className="text-[10px] text-slate-400 uppercase font-bold">Economia no Bolso / Mês</span>
                  <div className="text-sm font-black text-emerald-400 mt-0.5">
                    +{formatCurrency(ecoAnalysis.monthlyCashSavings)}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* GRID COM AS 6 DICAS PRÁTICAS DE COMPORTAMENTO */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {ecoTips.map(tip => (
              <div
                key={tip.id}
                className="bg-white/5 hover:bg-white/10 border border-white/10 p-3.5 rounded-2xl space-y-2 transition flex flex-col justify-between"
              >
                <div className="space-y-1.5">
                  <div className="flex items-start justify-between gap-1">
                    <h5 className="text-xs font-black text-white leading-tight">{tip.title}</h5>
                    <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full border whitespace-nowrap ${tip.badgeColor}`}>
                      {tip.badge}
                    </span>
                  </div>

                  <div className="text-[10px] font-bold text-teal-300 flex items-center gap-1">
                    <Sparkles className="w-3 h-3 text-teal-400 shrink-0" />
                    <span>{tip.impact}</span>
                  </div>

                  <p className="text-[11px] text-slate-300 leading-snug">
                    {tip.description}
                  </p>
                </div>

                <div className="bg-slate-950/60 p-2 rounded-xl border border-white/5 text-[10px] text-slate-300 mt-2">
                  <span className="font-bold text-teal-400 block mb-0.5">🎯 Como aplicar no trânsito:</span>
                  <span>{tip.action}</span>
                </div>
              </div>
            ))}
          </div>

          {/* BANNER DE RESUMO */}
          <div className="bg-teal-500/10 border border-teal-500/20 p-3 rounded-2xl flex items-center gap-2 text-xs text-teal-200">
            <Leaf className="w-4 h-4 text-teal-400 shrink-0" />
            <span>
              <strong>Dica Rápida de Autonomia:</strong> A combinação de <strong>calibragem correta (+2 PSI)</strong>, <strong>desaceleração em Cut-Off</strong> e <strong>trocas a 2.000 RPM</strong> é comprovadamente responsável por até <strong>22% de economia real</strong> na rotina de motoristas de aplicativo!
            </span>
          </div>

        </div>
      )}

    </div>
  );
};

const SunIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
  </svg>
);

const MoonIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
  </svg>
);
