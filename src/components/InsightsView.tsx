import React, { useMemo } from 'react';
import { useDriver } from '../context/DriverContext';
import { formatCurrency, formatKm, safeDivide } from '../utils/calc';
import { Lightbulb, Zap, TrendingUp, AlertCircle, Clock, Fuel, Award } from 'lucide-react';

export const InsightsView: React.FC = () => {
  const { sessions, earnings, expenses, vehicle, profile } = useDriver();

  const insights = useMemo(() => {
    if (sessions.length < 3) {
      return null;
    }

    const items: { id: string; title: string; desc: string; type: 'success' | 'warning' | 'info'; icon: React.ElementType }[] = [];

    // 1. ANÁLISE DE DIA MAIS LUCRATIVO
    const dayProfits: Record<number, { gross: number; exp: number; count: number }> = {};
    sessions.forEach(s => {
      const day = new Date(s.startTime).getDay();
      if (!dayProfits[day]) dayProfits[day] = { gross: 0, exp: 0, count: 0 };
      dayProfits[day].gross += s.grossEarnings + s.tips;
      dayProfits[day].exp += s.fuelExpenses + s.otherExpenses;
      dayProfits[day].count += 1;
    });

    const dayNames = ['Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado'];
    let bestDay = 5;
    let maxAvgNet = 0;

    Object.entries(dayProfits).forEach(([d, val]) => {
      const net = val.gross - val.exp;
      const avgNet = safeDivide(net, val.count);
      if (avgNet > maxAvgNet) {
        maxAvgNet = avgNet;
        bestDay = Number(d);
      }
    });

    if (maxAvgNet > 0) {
      items.push({
        id: 'ins-best-day',
        title: `Seu dia mais rentável é ${dayNames[bestDay]}`,
        desc: `Com média líquida de ${formatCurrency(maxAvgNet)} por turno. Vale a pena priorizar sua escala e estender a jornada neste dia.`,
        type: 'success',
        icon: TrendingUp,
      });
    }

    // 2. ANÁLISE DE PESO DO COMBUSTÍVEL
    const totalGross = sessions.reduce((acc, s) => acc + s.grossEarnings + s.tips, 0);
    const totalFuel = sessions.reduce((acc, s) => acc + s.fuelExpenses, 0);
    const fuelShare = safeDivide(totalFuel, totalGross) * 100;

    if (fuelShare > 30) {
      items.push({
        id: 'ins-fuel-heavy',
        title: `Atenção: O combustível consome ${fuelShare.toFixed(1)}% do seu faturamento`,
        desc: `Taxa acima do ideal (20-25%). Experimente calibrar pneus semanalmente e evitar corridas com deslocamento vazio longo.`,
        type: 'warning',
        icon: Fuel,
      });
    } else if (fuelShare > 0) {
      items.push({
        id: 'ins-fuel-good',
        title: `Excelente gestão de combustível (${fuelShare.toFixed(1)}% do faturamento)`,
        desc: `Seu gasto com combustível está saudável em relação ao faturamento bruto total gerado.`,
        type: 'success',
        icon: Fuel,
      });
    }

    // 3. ANÁLISE DE GANHO POR KM
    const totalKm = sessions.reduce((acc, s) => {
      if (s.endOdometer && s.startOdometer) return acc + (s.endOdometer - s.startOdometer);
      return acc;
    }, 0);
    const avgRatePerKm = safeDivide(totalGross, totalKm);

    if (avgRatePerKm < profile.minAcceptableRateKm && totalKm > 0) {
      items.push({
        id: 'ins-rate-km-low',
        title: `Média de ganho por KM (${formatCurrency(avgRatePerKm)}/km) abaixo da sua meta`,
        desc: `Sua meta mínima configurada é ${formatCurrency(profile.minAcceptableRateKm)}/km. Use o analisador "Vale a Pena?" para filtrar corridas com baixa remuneração.`,
        type: 'warning',
        icon: AlertCircle,
      });
    } else if (totalKm > 0) {
      items.push({
        id: 'ins-rate-km-ok',
        title: `Média de ${formatCurrency(avgRatePerKm)}/km acima da sua meta de corte`,
        desc: `Você está mantendo um excelente critério de seleção de viagens sem desgastar o veículo excessivamente.`,
        type: 'success',
        icon: Award,
      });
    }

    return items;
  }, [sessions, earnings, expenses, vehicle, profile]);

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      {/* HEADER */}
      <div className="bg-white/5 backdrop-blur-lg border border-white/10 p-5 rounded-2xl">
        <h2 className="text-base sm:text-lg font-black text-white tracking-tight flex items-center gap-2">
          <Lightbulb className="w-5 h-5 text-emerald-400" />
          DRIVER INSIGHTS (INTELIGÊNCIA REAL)
        </h2>
        <p className="text-xs text-slate-400 mt-0.5">
          Conclusões matemáticas baseadas estritamente nos seus dados reais de trabalho.
        </p>
      </div>

      {!insights || insights.length === 0 ? (
        <div className="text-center py-12 px-4 bg-white/5 backdrop-blur-lg border border-white/10 rounded-3xl">
          <Lightbulb className="w-12 h-12 text-slate-500 mx-auto mb-3 opacity-60" />
          <h4 className="text-base font-bold text-slate-200">
            Continue registrando seus expedientes para gerar análises
          </h4>
          <p className="text-xs text-slate-400 max-w-md mx-auto mt-1">
            O Driver Insights precisa de pelo menos 3 turnos concluídos para calcular médias precisas e padrões de faturamento.
          </p>
        </div>
      ) : (
        <div className="space-y-3.5">
          {insights.map(item => {
            const Icon = item.icon;
            return (
              <div
                key={item.id}
                className={`p-5 rounded-2xl border transition-all ${
                  item.type === 'success'
                    ? 'bg-emerald-500/10 border-emerald-500/30 shadow-lg shadow-emerald-500/5'
                    : item.type === 'warning'
                    ? 'bg-amber-500/10 border-amber-500/30 shadow-lg shadow-amber-500/5'
                    : 'bg-white/5 border-white/10'
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className={`p-2 rounded-xl shrink-0 ${
                    item.type === 'success' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-amber-500/20 text-amber-400'
                  }`}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-white">{item.title}</h3>
                    <p className="text-xs text-slate-300 mt-1 leading-relaxed">{item.desc}</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
