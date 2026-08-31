import React from 'react';
import { useDriver } from '../context/DriverContext';
import { Bell, Check, Trash2, X, Wrench, Calendar, AlertTriangle, Info } from 'lucide-react';

interface AlertsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AlertsModal: React.FC<AlertsModalProps> = ({ isOpen, onClose }) => {
  const { alerts, markAlertRead, clearAlerts } = useDriver();

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
      <div className="bg-slate-900 border border-white/15 rounded-3xl w-full max-w-md p-6 shadow-2xl space-y-4 max-h-[85vh] overflow-y-auto">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
              <Bell className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-black text-white">Central de Alertas</h3>
              <p className="text-[11px] text-slate-400">Lembretes de manutenção, escala e metas</p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white p-1">
            <X className="w-4 h-4" />
          </button>
        </div>

        {alerts.length === 0 ? (
          <div className="text-center py-8 text-slate-400 text-xs bg-white/5 rounded-2xl border border-white/5">
            Nenhum alerta ativo no momento. Tudo em dia com seu veículo e rotina!
          </div>
        ) : (
          <div className="space-y-2.5">
            {alerts.map(a => (
              <div
                key={a.id}
                className={`p-3.5 rounded-2xl border transition ${
                  a.read
                    ? 'bg-white/5 border-white/5 opacity-70'
                    : 'bg-emerald-500/10 border-emerald-500/30'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-start gap-2.5">
                    {a.type === 'maintenance' && <Wrench className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />}
                    {a.type === 'shift' && <Calendar className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />}
                    {a.type === 'warning' && <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />}
                    {a.type === 'info' && <Info className="w-4 h-4 text-sky-400 shrink-0 mt-0.5" />}
                    
                    <div>
                      <h4 className="text-xs font-black text-white">{a.title}</h4>
                      <p className="text-[11px] text-slate-300 mt-0.5 leading-relaxed">{a.message}</p>
                    </div>
                  </div>

                  {!a.read && (
                    <button
                      onClick={() => markAlertRead(a.id)}
                      className="text-[10px] bg-white/10 hover:bg-white/20 text-slate-200 px-2 py-1 rounded-lg shrink-0"
                      title="Marcar como lido"
                    >
                      Lido
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {alerts.length > 0 && (
          <div className="flex justify-between items-center pt-2 border-t border-white/10">
            <button
              onClick={clearAlerts}
              className="text-xs text-rose-400 hover:text-rose-300 font-bold flex items-center gap-1"
            >
              <Trash2 className="w-3.5 h-3.5" /> Limpar todos
            </button>
            <button
              onClick={onClose}
              className="bg-white/10 hover:bg-white/15 text-slate-200 font-bold px-4 py-1.5 rounded-xl text-xs"
            >
              Fechar
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
