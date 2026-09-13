import React, { useState, useEffect } from 'react';
import { useDriver } from '../context/DriverContext';
import { usePWA } from '../hooks/usePWA';
import {
  Settings,
  User,
  Car,
  Download,
  Upload,
  RefreshCw,
  Trash2,
  Sparkles,
  ShieldCheck,
  Smartphone,
  Check,
  CheckCircle,
  Wifi,
  WifiOff,
  Share,
  PlusSquare,
  Calculator,
  FileJson,
  Database,
  FileCheck,
  AlertCircle,
} from 'lucide-react';
import { RecalculateRecordsModal } from './RecalculateRecordsModal';
import { DashboardCardsCustomizer } from './DashboardCardsCustomizer';

export const SettingsView: React.FC = () => {
  const {
    profile,
    updateProfile,
    vehicle,
    loadDemoData,
    clearAllData,
    exportDataJSON,
    exportDataCSV,
    importDataJSON,
    downloadFullBackup,
    getLocalSnapshotData,
    isDemoData,
  } = useDriver();

  const [showRecalculateModal, setShowRecalculateModal] = useState(false);
  const [backupStatus, setBackupStatus] = useState<'idle' | 'creating' | 'success' | 'error'>('idle');
  const [backupResult, setBackupResult] = useState<{
    filename: string;
    sizeBytes: number;
    totalRecords: number;
    timestamp: string;
  } | null>(null);
  const [localSnapshotInfo, setLocalSnapshotInfo] = useState<{
    createdAt: string;
    totalRecords: number;
    schemaVersion: number;
  } | null>(null);

  useEffect(() => {
    try {
      const snap = getLocalSnapshotData();
      if (snap) {
        setLocalSnapshotInfo({
          createdAt: snap.metadata.createdAt,
          totalRecords: snap.statistics.totalRecords,
          schemaVersion: snap.metadata.schemaVersion,
        });
      }
    } catch {
      // silencioso
    }
  }, [backupStatus]);

  const handleDownloadFullBackup = async () => {
    setBackupStatus('creating');
    try {
      const res = await downloadFullBackup();
      if (res.success) {
        setBackupResult({
          filename: res.filename,
          sizeBytes: res.sizeBytes,
          totalRecords: res.totalRecords,
          timestamp: new Date().toLocaleTimeString('pt-BR'),
        });
        setBackupStatus('success');
      } else {
        setBackupStatus('error');
      }
    } catch (err) {
      console.error('Erro ao gerar backup:', err);
      setBackupStatus('error');
    }
  };

  const {
    isInstallable,
    isInstalled,
    isOnline,
    isUpdateAvailable,
    isIOS,
    promptInstall,
    updateServiceWorker,
  } = usePWA();

  const [name, setName] = useState(profile.name);
  const [minKm, setMinKm] = useState(profile.minAcceptableRateKm.toString());
  const [minHour, setMinHour] = useState(profile.minAcceptableRateHour.toString());
  const [gasRef, setGasRef] = useState(profile.gasPriceReference.toString());
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [showIosTip, setShowIosTip] = useState(false);

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    updateProfile({
      name,
      minAcceptableRateKm: parseFloat(minKm) || 2.2,
      minAcceptableRateHour: parseFloat(minHour) || 38.0,
      gasPriceReference: parseFloat(gasRef) || 5.89,
    });
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 2000);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = event => {
      const content = event.target?.result as string;
      if (content) {
        const ok = importDataJSON(content);
        if (ok) {
          alert('Backup restaurado com sucesso!');
        } else {
          alert('Arquivo de backup inválido.');
        }
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      {/* HEADER */}
      <div className="bg-white/5 backdrop-blur-lg border border-white/10 p-5 rounded-2xl">
        <h2 className="text-base sm:text-lg font-black text-white tracking-tight flex items-center gap-2">
          <Settings className="w-5 h-5 text-emerald-400" />
          CONFIGURAÇÕES & GESTÃO DE DADOS
        </h2>
        <p className="text-xs text-slate-400 mt-0.5">
          Ajuste suas preferências, parâmetros financeiros e gerencie seus backups.
        </p>
      </div>

      {/* PERFIL DO MOTORISTA */}
      <form onSubmit={handleSaveProfile} className="bg-white/5 backdrop-blur-lg border border-white/10 p-5 sm:p-6 rounded-2xl space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-black text-white uppercase tracking-wider flex items-center gap-2">
            <User className="w-4 h-4 text-emerald-400" />
            PERFIL DO MOTORISTA & PARÂMETROS DE CORTE
          </h3>
          {saveSuccess && (
            <span className="text-xs font-bold text-emerald-400 flex items-center gap-1">
              <Check className="w-3.5 h-3.5" /> Salvo com sucesso!
            </span>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="text-[11px] font-bold text-slate-400 uppercase block mb-1">Seu Nome / Apelido</label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              className="w-full bg-black/40 border border-white/15 rounded-xl px-3 py-2.5 text-sm text-white"
            />
          </div>

          <div>
            <label className="text-[11px] font-bold text-slate-400 uppercase block mb-1">Preço Gasolina de Referência (R$/L)</label>
            <input
              type="number"
              step="0.01"
              value={gasRef}
              onChange={e => setGasRef(e.target.value)}
              className="w-full bg-black/40 border border-white/15 rounded-xl px-3 py-2.5 text-sm text-amber-300 font-bold"
            />
          </div>

          <div>
            <label className="text-[11px] font-bold text-slate-400 uppercase block mb-1">Corte Mínimo R$ / KM Aceitável</label>
            <input
              type="number"
              step="0.1"
              value={minKm}
              onChange={e => setMinKm(e.target.value)}
              className="w-full bg-black/40 border border-white/15 rounded-xl px-3 py-2.5 text-sm text-emerald-400 font-bold"
            />
          </div>

          <div>
            <label className="text-[11px] font-bold text-slate-400 uppercase block mb-1">Corte Mínimo R$ / Hora Aceitável</label>
            <input
              type="number"
              step="1"
              value={minHour}
              onChange={e => setMinHour(e.target.value)}
              className="w-full bg-black/40 border border-white/15 rounded-xl px-3 py-2.5 text-sm text-emerald-400 font-bold"
            />
          </div>
        </div>

        <div className="flex justify-end pt-2">
          <button
            type="submit"
            className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black px-5 py-2.5 rounded-xl text-xs shadow-lg shadow-emerald-500/20 active:scale-95 transition"
          >
            SALVAR PERFIL
          </button>
        </div>
      </form>

      {/* PERSONALIZAÇÃO DE CARDS DO DASHBOARD (DRAG AND DROP & TOGGLE) */}
      <div className="bg-white/5 backdrop-blur-lg border border-white/10 p-5 sm:p-6 rounded-2xl space-y-4">
        <DashboardCardsCustomizer />
      </div>

      {/* BACKUP E SEGURANÇA */}
      <div className="bg-white/5 backdrop-blur-lg border border-white/10 p-5 sm:p-6 rounded-2xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-white/10 pb-3">
          <div>
            <h3 className="text-xs font-black text-white uppercase tracking-wider flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              BACKUP E SEGURANÇA
            </h3>
            <p className="text-xs text-slate-400 mt-1">
              Faça uma cópia completa dos seus dados antes de alterações importantes no sistema.
            </p>
          </div>
          <span className="text-[10px] font-mono font-bold bg-emerald-500/10 text-emerald-300 border border-emerald-500/20 px-2.5 py-1 rounded-full w-fit">
            Schema v2 • Offline-First
          </span>
        </div>

        {/* STATUS VISUAL DO BACKUP */}
        {backupStatus === 'success' && backupResult && (
          <div className="bg-emerald-500/15 border border-emerald-500/30 p-4 rounded-xl flex items-start gap-3">
            <CheckCircle className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
            <div className="text-xs space-y-1">
              <div className="font-bold text-emerald-300">
                Backup criado com sucesso.
              </div>
              <div className="text-[11px] text-slate-300">
                Arquivo: <span className="font-mono font-bold text-white">{backupResult.filename}</span>
              </div>
              <div className="text-[11px] text-slate-400 flex flex-wrap gap-x-4 gap-y-1 pt-1">
                <span>Total de registros: <strong className="text-emerald-300">{backupResult.totalRecords}</strong></span>
                <span>Tamanho: <strong className="text-white">{(backupResult.sizeBytes / 1024).toFixed(1)} KB</strong></span>
                <span>Horário: <strong className="text-white">{backupResult.timestamp}</strong></span>
                <span>Versão do schema: <strong className="text-white">v2</strong></span>
              </div>
            </div>
          </div>
        )}

        {backupStatus === 'error' && (
          <div className="bg-rose-500/15 border border-rose-500/30 p-4 rounded-xl flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
            <div className="text-xs">
              <div className="font-bold text-rose-300">
                Não foi possível criar o backup. Nenhum dado foi alterado.
              </div>
              <div className="text-[11px] text-slate-400 mt-0.5">
                Verifique as permissões de download do navegador e tente novamente.
              </div>
            </div>
          </div>
        )}

        {/* BOTÃO PRINCIPAL DE BACKUP PREVENTIVO */}
        <div className="bg-gradient-to-r from-emerald-950/30 to-slate-900 border border-emerald-500/30 p-4 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-black shrink-0">
              <FileJson className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs font-bold text-white flex items-center gap-2">
                Snapshot Completo Pré-Migração
                <span className="text-[10px] bg-emerald-500/20 text-emerald-300 px-1.5 py-0.2 rounded font-mono font-bold">
                  JSON Estruturado
                </span>
              </div>
              <div className="text-[11px] text-slate-400 mt-0.5">
                Captura todas as sessões, despesas, hodômetros, veículos, metas e preferências sem modificar nenhum dado.
              </div>
            </div>
          </div>

          <button
            type="button"
            disabled={backupStatus === 'creating'}
            onClick={handleDownloadFullBackup}
            className="bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-slate-950 font-black px-5 py-2.5 rounded-xl text-xs flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20 active:scale-95 transition shrink-0"
          >
            {backupStatus === 'creating' ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>Criando backup...</span>
              </>
            ) : (
              <>
                <Download className="w-4 h-4" />
                <span>Baixar Backup Completo</span>
              </>
            )}
          </button>
        </div>

        {/* SNAPSHOT LOCAL PREVENTIVO REGISTRADO */}
        {localSnapshotInfo && (
          <div className="bg-black/30 border border-white/10 p-3.5 rounded-xl flex items-center justify-between text-xs">
            <div className="flex items-center gap-2.5 text-slate-300">
              <Database className="w-4 h-4 text-teal-400 shrink-0" />
              <div>
                <span className="text-[11px] text-slate-400 block">Cópia Local de Segurança Registrada no Navegador:</span>
                <span className="font-mono text-white text-[11px]">
                  {new Date(localSnapshotInfo.createdAt).toLocaleString('pt-BR')} • {localSnapshotInfo.totalRecords} registros • Schema v{localSnapshotInfo.schemaVersion}
                </span>
              </div>
            </div>
            <span className="text-[10px] bg-teal-500/20 text-teal-300 px-2 py-0.5 rounded-full font-bold border border-teal-500/30">
              Armazenado Local
            </span>
          </div>
        )}

        {/* OUTRAS OPÇÕES: CSV E RESTAURAÇÃO */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
          <button
            onClick={exportDataCSV}
            className="bg-white/5 hover:bg-white/10 p-4 rounded-xl border border-white/10 text-left transition flex items-center gap-3"
          >
            <div className="w-9 h-9 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-black shrink-0">
              CSV
            </div>
            <div>
              <div className="text-xs font-bold text-slate-200">Exportar Extrato (CSV/Excel)</div>
              <div className="text-[11px] text-slate-400">Planilha formatada com todos os lançamentos</div>
            </div>
          </button>

          <div className="bg-black/30 p-4 rounded-xl border border-white/10 flex items-center justify-between gap-3">
            <div>
              <div className="text-xs font-bold text-slate-200">Restaurar Backup Anterior</div>
              <div className="text-[11px] text-slate-400">Carregue um arquivo .json salvo</div>
            </div>
            <label className="bg-white/10 hover:bg-white/15 text-slate-200 font-bold px-3 py-2 rounded-xl text-xs border border-white/10 cursor-pointer text-center shrink-0">
              Selecionar JSON
              <input type="file" accept=".json" onChange={handleFileUpload} className="hidden" />
            </label>
          </div>
        </div>
      </div>

      {/* DADOS DEMONSTRATIVOS & RESET */}
      <div className="bg-white/5 backdrop-blur-lg border border-white/10 p-5 sm:p-6 rounded-2xl space-y-4">
        <h3 className="text-xs font-black text-white uppercase tracking-wider flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-amber-400" />
          CONTROLE DO BANCO LOCAL & FERRAMENTAS DE CÁLCULO
        </h3>

        {/* CARD DESTAQUE RECÁLCULO DO VEÍCULO */}
        <div className="bg-gradient-to-r from-emerald-950/40 to-slate-900 border border-emerald-500/30 p-4 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-black shrink-0">
              <Calculator className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs font-bold text-white flex items-center gap-2">
                Recalcular Lançamentos com Dados do Veículo
                <span className="text-[10px] bg-emerald-500/20 text-emerald-300 px-1.5 py-0.2 rounded font-mono">
                  {vehicle.avgConsumption} km/L
                </span>
              </div>
              <div className="text-[11px] text-slate-400">
                Ajusta os custos de combustível de todos os turnos passados com base no consumo e preço atual
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setShowRecalculateModal(true)}
            className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black px-4 py-2 rounded-xl text-xs flex items-center justify-center gap-1.5 shadow-lg shadow-emerald-500/20 transition shrink-0"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Recalcular</span>
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <button
            onClick={loadDemoData}
            className="bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 p-4 rounded-xl text-left transition flex items-center gap-3"
          >
            <RefreshCw className="w-5 h-5 text-amber-400 shrink-0" />
            <div>
              <div className="text-xs font-bold text-amber-300">Carregar Dados Demonstrativos</div>
              <div className="text-[11px] text-slate-400">Popula 14 dias de turnos, ganhos e despesas</div>
            </div>
          </button>

          <button
            onClick={() => {
              if (confirm('Tem certeza? Isso apagará todas as sessões, ganhos e despesas salvas no seu navegador.')) {
                clearAllData();
              }
            }}
            className="bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 p-4 rounded-xl text-left transition flex items-center gap-3"
          >
            <Trash2 className="w-5 h-5 text-rose-400 shrink-0" />
            <div>
              <div className="text-xs font-bold text-rose-300">Resetar Todos os Dados</div>
              <div className="text-[11px] text-slate-400">Limpa todo o armazenamento local</div>
            </div>
          </button>
        </div>
      </div>

      {/* PWA & APP NATIVO (CONFIGURAÇÃO PWA) */}
      <div className="bg-white/5 backdrop-blur-lg border border-white/10 p-5 sm:p-6 rounded-2xl space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-black text-white uppercase tracking-wider flex items-center gap-2">
            <Smartphone className="w-4 h-4 text-emerald-400" />
            CONFIGURAÇÃO PWA & APLICATIVO NATIVO
          </h3>
          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 ${
            isInstalled
              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
              : 'bg-sky-500/20 text-sky-300 border border-sky-500/30'
          }`}>
            {isInstalled ? <CheckCircle className="w-3 h-3" /> : <Smartphone className="w-3 h-3" />}
            {isInstalled ? 'App Instalado (Standalone)' : 'PWA Disponível'}
          </span>
        </div>

        {/* STATUS CARDS */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
          <div className="bg-black/30 p-3.5 rounded-xl border border-white/10">
            <span className="text-[10px] text-slate-400 block uppercase font-bold">Modo de Execução</span>
            <strong className="text-white text-xs mt-0.5 block">
              {isInstalled ? '📱 Janela Nativa Standalone' : '🌐 Navegador Web'}
            </strong>
          </div>

          <div className="bg-black/30 p-3.5 rounded-xl border border-white/10">
            <span className="text-[10px] text-slate-400 block uppercase font-bold">Conexão & Offline</span>
            <strong className={`text-xs mt-0.5 flex items-center gap-1.5 ${isOnline ? 'text-emerald-400' : 'text-amber-400'}`}>
              {isOnline ? <Wifi className="w-3.5 h-3.5" /> : <WifiOff className="w-3.5 h-3.5" />}
              {isOnline ? 'Conectado (Online)' : 'Modo Offline Ativo'}
            </strong>
          </div>

          <div className="bg-black/30 p-3.5 rounded-xl border border-white/10">
            <span className="text-[10px] text-slate-400 block uppercase font-bold">Service Worker</span>
            <strong className="text-emerald-400 text-xs mt-0.5 flex items-center gap-1">
              <Check className="w-3.5 h-3.5" /> Cache v2.1 Ativo
            </strong>
          </div>
        </div>

        {/* BOTAO DE INSTALACAO */}
        {!isInstalled && (
          <div className="bg-emerald-500/10 border border-emerald-500/30 p-4 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="text-xs font-black text-emerald-300 flex items-center gap-1.5">
                <Download className="w-4 h-4" /> Instale o Driver Planner no seu dispositivo
              </div>
              <div className="text-[11px] text-slate-300 mt-0.5">
                Funciona em tela cheia sem barras do navegador, com carregamento instantâneo e offline.
              </div>
            </div>

            {isIOS ? (
              <button
                type="button"
                onClick={() => setShowIosTip(!showIosTip)}
                className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black px-4 py-2 rounded-xl text-xs flex items-center justify-center gap-1.5 transition shrink-0 shadow-md shadow-emerald-500/20"
              >
                <Smartphone className="w-3.5 h-3.5" /> Instruções iOS / iPhone
              </button>
            ) : (
              <button
                type="button"
                onClick={promptInstall}
                className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black px-4 py-2 rounded-xl text-xs flex items-center justify-center gap-1.5 transition shrink-0 shadow-md shadow-emerald-500/20"
              >
                <Download className="w-3.5 h-3.5" /> Instalar Aplicativo (PWA)
              </button>
            )}
          </div>
        )}

        {/* INSTRUCOES IOS SAFARI */}
        {showIosTip && (
          <div className="bg-black/50 border border-sky-500/30 p-4 rounded-xl space-y-2 text-xs text-slate-200">
            <div className="font-bold text-sky-400 flex items-center gap-1.5">
              <Share className="w-3.5 h-3.5" /> Como instalar no iPhone (Safari):
            </div>
            <ol className="list-decimal list-inside space-y-1 text-[11px] text-slate-300">
              <li>Toque no ícone de <strong>Compartilhar</strong> (quadrado com seta para cima) na barra inferior do Safari.</li>
              <li>Role as opções para baixo e toque em <strong>"Adicionar à Tela de Início"</strong> (<PlusSquare className="w-3 h-3 inline text-emerald-400" />).</li>
              <li>Confirme tocando em <strong>"Adicionar"</strong> no canto superior direito.</li>
            </ol>
          </div>
        )}

        {/* ATUALIZACAO DE CACHE DO SERVICE WORKER */}
        <div className="flex items-center justify-between text-xs text-slate-400 pt-2 border-t border-white/5">
          <span className="text-[11px]">Precisa recarregar a versão mais recente dos arquivos?</span>
          <button
            type="button"
            onClick={updateServiceWorker}
            className="text-emerald-400 hover:text-emerald-300 font-bold flex items-center gap-1 hover:underline text-[11px]"
          >
            <RefreshCw className="w-3 h-3" /> Atualizar Cache PWA
          </button>
        </div>
      </div>

      {/* RODAPÉ */}
      <div className="bg-white/5 p-4 rounded-2xl border border-white/5 flex items-center justify-between text-xs text-slate-400">
        <div className="flex items-center gap-2">
          <Smartphone className="w-4 h-4 text-emerald-400" />
          <span>Driver Planner PWA v2.1 • Offline Ready</span>
        </div>
        <span className="font-mono text-[11px] text-slate-500">Frosted Glass Edition</span>
      </div>

      {/* MODAL RECÁLCULO DE LANÇAMENTOS */}
      <RecalculateRecordsModal
        isOpen={showRecalculateModal}
        onClose={() => setShowRecalculateModal(false)}
      />
    </div>
  );
};
