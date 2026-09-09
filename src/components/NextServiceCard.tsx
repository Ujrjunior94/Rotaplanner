import React, { useMemo } from 'react';
import { useDriver } from '../context/DriverContext';
import { formatKm, formatCurrency } from '../utils/calc';
import { Wrench, AlertTriangle, CheckCircle2, ChevronRight, Clock, ShieldCheck, Car } from 'lucide-react';

interface NextServiceCardProps {
  onNavigateTab?: (tab: string) => void;
}

export const NextServiceCard: React.FC<NextServiceCardProps> = ({ onNavigateTab }) => {
  const { vehicle, maintenances } = useDriver();

  // Calcular itens de manutenção preventiva e próximas revisões
  const serviceStats = useMemo(() => {
    const currentKm = vehicle.currentOdometer || 0;

    // Categorias padrão de manutenção preventiva
    const standardServices = [
      {
        category: 'Troca de Óleo',
        interval: 10000,
        icon: '🛢️',
        desc: 'Óleo de motor & filtro de lubrificante',
      },
      {
        category: 'Pastilhas de Freio',
        interval: 25000,
        icon: '🛑',
        desc: 'Pastilhas dianteiras e fluido de freio',
      },
      {
        category: 'Alinhamento e Pneus',
        interval: 10000,
        icon: '🔄',
        desc: 'Alinhamento, balanceamento e rodízio',
      },
      {
        category: 'Revisão Periódica',
        interval: 40000,
        icon: '⚙️',
        desc: 'Correia dentada, velas e arrefecimento',
      },
    ];

    // Para cada serviço, achar o último registro completo ou calcular com base no KM atual
    const items = standardServices.map(srv => {
      const match = maintenances
        .filter(m => m.category === srv.category || m.description.toLowerCase().includes(srv.category.toLowerCase()))
        .sort((a, b) => b.odometer - a.odometer)[0];

      let nextKm = 0;
      if (match?.nextOdometer) {
        nextKm = match.nextOdometer;
      } else if (match?.odometer) {
        nextKm = match.odometer + srv.interval;
      } else {
        // Estimar próximo múltiplo do intervalo
        const quotient = Math.floor(currentKm / srv.interval);
        nextKm = (quotient + 1) * srv.interval;
      }

      const kmRemaining = nextKm - currentKm;
      let status: 'ok' | 'warning' | 'critical' = 'ok';
      if (kmRemaining <= 0) {
        status = 'critical';
      } else if (kmRemaining <= 1500) {
        status = 'warning';
      }

      return {
        ...srv,
        lastCompleted: match,
        nextKm,
        kmRemaining,
        status,
      };
    });

    // Ordenar pelo serviço mais urgente (menor kmRemaining)
    items.sort((a, b) => a.kmRemaining - b.kmRemaining);

    const urgentService = items[0];

    return {
      currentKm,
      items,
      urgentService,
      hasCritical: items.some(i => i.status === 'critical'),
      hasWarning: items.some(i => i.status === 'warning'),
    };
  }, [vehicle.currentOdometer, maintenances]);

  const urgent = serviceStats.urgentService;

  return (
    <div className="bg-white/5 backdrop-blur-lg border border-white/10 p-5 sm:p-6 rounded-2xl relative overflow-hidden group hover:border-amber-500/30 transition">
      {/* CABEÇALHO */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
        <div className="flex items-center gap-2.5">
          <div className={`w-8 h-8 rounded-xl flex items-center justify-center border ${
            serviceStats.hasCritical
              ? 'bg-rose-500/15 text-rose-400 border-rose-500/30'
              : serviceStats.hasWarning
              ? 'bg-amber-500/15 text-amber-400 border-amber-500/30'
              : 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
          }`}>
            <Wrench className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-black text-white uppercase tracking-wider">
                PRÓXIMA REVISÃO & MANUTENÇÃO (NEXT SERVICE)
              </span>
              <span className="text-[10px] font-bold text-slate-400 bg-white/5 px-2 py-0.5 rounded border border-white/10 flex items-center gap-1 font-mono">
                <Car className="w-2.5 h-2.5" />
                Odômetro: {formatKm(serviceStats.currentKm)}
              </span>
            </div>
            <p className="text-[11px] text-slate-400">
              Controle preventivo para evitar quebras mecânicas e despesas inesperadas
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {urgent && (
            <span className={`text-[11px] font-black px-2.5 py-1 rounded-full flex items-center gap-1 ${
              urgent.status === 'critical'
                ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                : urgent.status === 'warning'
                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
            }`}>
              {urgent.status === 'critical' ? (
                <>
                  <AlertTriangle className="w-3.5 h-3.5" /> Revisão Vencida
                </>
              ) : urgent.status === 'warning' ? (
                <>
                  <Clock className="w-3.5 h-3.5" /> Revisão Próxima
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5" /> Manutenção em Dia
                </>
              )}
            </span>
          )}
          {onNavigateTab && (
            <button
              onClick={() => onNavigateTab('vehicle')}
              className="text-slate-400 hover:text-white p-1 transition"
              title="Ir para garagem e revisões"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* DESTAQUE DO PRÓXIMO SERVIÇO MAIS URGENTE */}
      {urgent && (
        <div className={`p-3.5 rounded-xl border mb-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
          urgent.status === 'critical'
            ? 'bg-rose-950/30 border-rose-500/30'
            : urgent.status === 'warning'
            ? 'bg-amber-950/30 border-amber-500/30'
            : 'bg-emerald-950/30 border-emerald-500/30'
        }`}>
          <div className="flex items-center gap-3">
            <span className="text-2xl">{urgent.icon}</span>
            <div>
              <div className="text-xs font-black text-white flex items-center gap-2">
                <span>Próximo: {urgent.category}</span>
                <span className="text-[10px] text-slate-400 font-normal">({urgent.desc})</span>
              </div>
              <div className="text-[11px] text-slate-300 mt-0.5">
                {urgent.status === 'critical' ? (
                  <span className="text-rose-400 font-bold">
                    Ultrapassou em {formatKm(Math.abs(urgent.kmRemaining))} do recomendado ({formatKm(urgent.nextKm)}).
                  </span>
                ) : urgent.status === 'warning' ? (
                  <span className="text-amber-400 font-bold">
                    Faltam apenas {formatKm(urgent.kmRemaining)} para o limite ({formatKm(urgent.nextKm)}).
                  </span>
                ) : (
                  <span>
                    Programado para <strong>{formatKm(urgent.nextKm)}</strong> (restam {formatKm(urgent.kmRemaining)}).
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {onNavigateTab && (
              <button
                onClick={() => onNavigateTab('vehicle')}
                className="bg-white/10 hover:bg-white/20 text-white font-bold px-3 py-1.5 rounded-xl text-xs border border-white/15 transition"
              >
                Registrar Serviço
              </button>
            )}
          </div>
        </div>
      )}

      {/* GRADE DE SERVIÇOS PREVENTIVOS */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
        {serviceStats.items.map((item, idx) => (
          <div
            key={idx}
            className="bg-white/5 p-3 rounded-xl border border-white/5 flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between text-xs mb-1">
                <span className="font-bold text-slate-200 truncate">{item.category}</span>
                <span>{item.icon}</span>
              </div>
              <div className="text-[10px] text-slate-400">
                Meta: {formatKm(item.nextKm)}
              </div>
            </div>

            <div className="mt-2 pt-1.5 border-t border-white/5 flex items-center justify-between">
              <span className="text-[10px] text-slate-500">Restante:</span>
              <span className={`text-[11px] font-black ${
                item.status === 'critical'
                  ? 'text-rose-400'
                  : item.status === 'warning'
                  ? 'text-amber-400'
                  : 'text-emerald-400'
              }`}>
                {item.kmRemaining <= 0 ? 'Vencida' : formatKm(item.kmRemaining)}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* FOOTER ACTION */}
      <div className="mt-3 pt-2.5 border-t border-white/5 flex items-center justify-between text-xs text-slate-400">
        <div className="flex items-center gap-1.5">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
          <span>Trocas e revisões em dia economizam até 18% em consumo de combustível.</span>
        </div>
        {onNavigateTab && (
          <button
            onClick={() => onNavigateTab('vehicle')}
            className="text-[11px] font-bold text-emerald-400 hover:text-emerald-300 shrink-0 ml-2"
          >
            Ver Garagem Completa →
          </button>
        )}
      </div>
    </div>
  );
};
