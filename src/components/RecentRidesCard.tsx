import React from 'react';
import { useDriver } from '../context/DriverContext';
import { formatCurrency, formatKm } from '../utils/calc';
import { Car, Clock, Navigation, ChevronRight, PlusCircle, ArrowUpRight } from 'lucide-react';

interface RecentRidesCardProps {
  onOpenShiftModal: () => void;
  onNavigateTab?: (tab: string) => void;
}

export const RecentRidesCard: React.FC<RecentRidesCardProps> = ({
  onOpenShiftModal,
  onNavigateTab,
}) => {
  const { sessions, activeSession, loadDemoData } = useDriver();

  return (
    <div className="bg-white/5 backdrop-blur-lg border border-white/10 p-5 sm:p-6 rounded-2xl relative overflow-hidden group hover:border-emerald-500/30 transition space-y-4">
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-emerald-500/15 text-emerald-400 flex items-center justify-center border border-emerald-500/30">
            <Car className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-xs font-black text-white uppercase tracking-wider flex items-center gap-2">
              CORRIDAS & EXPEDIENTES RECENTES (RECENT RIDES)
            </h3>
            <p className="text-[11px] text-slate-400">
              Histórico recente de turnos, quilometragem e rentabilidade real
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {sessions.length > 0 && (
            <span className="text-[11px] font-bold text-slate-400 bg-white/5 px-2.5 py-1 rounded-full border border-white/10">
              {sessions.length} turnos registrados
            </span>
          )}
          {onNavigateTab && (
            <button
              onClick={() => onNavigateTab('history')}
              className="text-slate-400 hover:text-white p-1 transition"
              title="Ver histórico completo"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* EXPEDIENTE ATIVO SE HOUVER */}
      {activeSession && (
        <div className="p-3.5 rounded-xl bg-emerald-950/40 border border-emerald-500/40 flex items-center justify-between gap-3 animate-pulse">
          <div className="flex items-center gap-3">
            <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping" />
            <div>
              <div className="text-xs font-bold text-emerald-300 flex items-center gap-2">
                EXPEDIENTE EM ANDAMENTO
                <span className="text-[9px] bg-emerald-500/30 text-emerald-200 px-2 py-0.5 rounded-full font-black uppercase">
                  Ao Vivo
                </span>
              </div>
              <div className="text-[11px] text-slate-300 mt-0.5">
                Iniciado às {new Date(activeSession.startTime).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })} • KM Inicial: {activeSession.startOdometer}
              </div>
            </div>
          </div>
          <div className="text-right">
            <div className="text-sm font-black text-emerald-400">
              {formatCurrency(activeSession.grossEarnings + activeSession.tips)}
            </div>
            <div className="text-[10px] text-slate-400">{activeSession.tripsCount} corridas</div>
          </div>
        </div>
      )}

      {/* LISTA OU ESTADO VAZIO */}
      {sessions.length === 0 && !activeSession ? (
        <div className="text-center py-8 px-4 bg-white/5 rounded-xl border border-white/5">
          <Car className="w-10 h-10 text-slate-500 mx-auto mb-2 opacity-60" />
          <h4 className="text-sm font-bold text-slate-200">Nenhum expediente registrado</h4>
          <p className="text-xs text-slate-400 max-w-sm mx-auto mt-1 mb-4">
            Inicie seu primeiro turno de trabalho para calcular ganhos, horas, km e lucro real por corrida.
          </p>
          <div className="flex flex-wrap justify-center gap-2.5">
            <button
              onClick={onOpenShiftModal}
              className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black px-4 py-2 rounded-xl text-xs shadow-md shadow-emerald-500/20 active:scale-95 transition flex items-center gap-1.5"
            >
              <PlusCircle className="w-3.5 h-3.5" /> INICIAR EXPEDIENTE
            </button>
            <button
              onClick={loadDemoData}
              className="bg-white/10 hover:bg-white/15 text-slate-200 font-bold px-3.5 py-2 rounded-xl text-xs border border-white/10 active:scale-95 transition"
            >
              Carregar Dados Demo
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-2">
          {sessions.slice(0, 5).map(s => {
            const dateFormatted = new Date(s.startTime).toLocaleDateString('pt-BR', {
              day: '2-digit',
              month: '2-digit',
              weekday: 'short',
            });
            const kmRodados = s.endOdometer && s.startOdometer ? s.endOdometer - s.startOdometer : 0;
            const gross = s.grossEarnings + s.tips;
            const despesas = s.fuelExpenses + s.otherExpenses;
            const liquido = gross - despesas;

            return (
              <div
                key={s.id}
                className="flex items-center justify-between p-3 rounded-xl bg-white/5 border border-white/5 hover:border-white/15 transition"
              >
                <div className="flex items-center gap-3">
                  <div className={`w-1.5 h-8 rounded-full ${s.status === 'active' ? 'bg-emerald-400' : 'bg-slate-600'}`} />
                  <div>
                    <div className="text-xs font-bold text-slate-200 capitalize flex items-center gap-2">
                      {dateFormatted}
                      {s.status === 'active' && (
                        <span className="text-[9px] bg-emerald-500/20 text-emerald-300 font-black px-1.5 py-0.5 rounded-full border border-emerald-500/30">
                          RODANDO
                        </span>
                      )}
                    </div>
                    <div className="text-[11px] text-slate-400 mt-0.5">
                      {s.tripsCount} corridas • {formatKm(kmRodados)} • {s.notes || 'Sem observações'}
                    </div>
                  </div>
                </div>

                <div className="text-right">
                  <div className="text-xs sm:text-sm font-black text-emerald-400">{formatCurrency(gross)}</div>
                  <div className="text-[10px] sm:text-[11px] text-slate-400 font-medium">Líq: {formatCurrency(liquido)}</div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* FOOTER */}
      {sessions.length > 0 && (
        <div className="pt-2 border-t border-white/5 flex items-center justify-between text-xs">
          <button
            onClick={onOpenShiftModal}
            className="text-xs font-bold text-emerald-400 hover:text-emerald-300 flex items-center gap-1.5 transition"
          >
            <PlusCircle className="w-3.5 h-3.5" /> Iniciar Novo Turno
          </button>

          {onNavigateTab && (
            <button
              onClick={() => onNavigateTab('history')}
              className="text-[11px] text-slate-400 hover:text-white flex items-center gap-1 transition"
            >
              Ver Todas as Corridas <ArrowUpRight className="w-3 h-3" />
            </button>
          )}
        </div>
      )}
    </div>
  );
};
