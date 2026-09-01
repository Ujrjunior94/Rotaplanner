import React, { useState, useMemo } from 'react';
import { useDriver } from '../context/DriverContext';
import {
  getWeekRange,
  getMonthRange,
  aggregateWeeklyData,
  aggregateMonthlyData,
  generateWeeklyPDF,
  generateMonthlyPDF,
  DateRange,
  PDFExportOptions,
} from '../utils/pdfGenerator';
import {
  formatCurrency,
  formatKm,
  formatHours,
} from '../utils/calc';
import {
  FileText,
  Download,
  Printer,
  Eye,
  Calendar,
  Layers,
  Fuel,
  Car,
  TrendingUp,
  X,
  CheckCircle2,
  Share2,
  Check,
  ChevronRight,
  Filter,
  Sparkles,
} from 'lucide-react';

interface PDFReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialType?: 'weekly' | 'monthly';
}

export const PDFReportModal: React.FC<PDFReportModalProps> = ({
  isOpen,
  onClose,
  initialType = 'monthly',
}) => {
  const {
    sessions,
    earnings,
    expenses,
    fuelRecords,
    maintenances,
    profile,
    vehicle,
  } = useDriver();

  const [reportType, setReportType] = useState<'weekly' | 'monthly'>(initialType);

  // Seletores de Período Semanal
  const [weekOffset, setWeekOffset] = useState<number>(0); // 0 = esta semana, -1 = semana passada, -2 = 2 semanas atrás

  // Seletores de Período Mensal
  const now = new Date();
  const [selectedYear, setSelectedYear] = useState<number>(now.getFullYear());
  const [selectedMonthIndex, setSelectedMonthIndex] = useState<number>(now.getMonth());

  // Opções de exportação
  const [options, setOptions] = useState<PDFExportOptions>({
    includeVehicleDetails: true,
    includeDailyBreakdown: true,
    includePlatformBreakdown: true,
    includeExpensesBreakdown: true,
    includeFuelLogs: true,
    includeMaintenanceLogs: true,
    includeGoalsComparison: true,
    includeFixedCosts: true,
  });

  const [isGenerating, setIsGenerating] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Cálculo da faixa de data semanal
  const weeklyRange: DateRange = useMemo(() => {
    const baseDate = new Date();
    baseDate.setDate(baseDate.getDate() + weekOffset * 7);
    return getWeekRange(baseDate);
  }, [weekOffset]);

  // Dados agregados semanais
  const weeklyData = useMemo(() => {
    return aggregateWeeklyData(
      weeklyRange,
      sessions,
      earnings,
      expenses,
      fuelRecords,
      profile,
      vehicle
    );
  }, [weeklyRange, sessions, earnings, expenses, fuelRecords, profile, vehicle]);

  // Dados agregados mensais
  const monthlyData = useMemo(() => {
    return aggregateMonthlyData(
      selectedYear,
      selectedMonthIndex,
      sessions,
      earnings,
      expenses,
      fuelRecords,
      maintenances,
      profile,
      vehicle
    );
  }, [selectedYear, selectedMonthIndex, sessions, earnings, expenses, fuelRecords, maintenances, profile, vehicle]);

  if (!isOpen) return null;

  const monthNames = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
  ];

  // Ação: Baixar PDF
  const handleDownloadPDF = () => {
    setIsGenerating(true);
    try {
      if (reportType === 'weekly') {
        const doc = generateWeeklyPDF(weeklyData, profile, vehicle, options);
        const startStr = weeklyData.range.startDate.toLocaleDateString('pt-BR').replace(/\//g, '-');
        const endStr = weeklyData.range.endDate.toLocaleDateString('pt-BR').replace(/\//g, '-');
        doc.save(`DriverPlanner_Relatorio_Semanal_${startStr}_a_${endStr}.pdf`);
        showToast('✅ Relatório Semanal em PDF baixado com sucesso!');
      } else {
        const doc = generateMonthlyPDF(monthlyData, profile, vehicle, options);
        const monthNameSanitized = monthNames[selectedMonthIndex].toLowerCase();
        doc.save(`DriverPlanner_Relatorio_Mensal_${monthNameSanitized}_${selectedYear}.pdf`);
        showToast('✅ Relatório Mensal em PDF baixado com sucesso!');
      }
    } catch (err) {
      console.error(err);
      showToast('❌ Ocorreu um erro ao gerar o PDF.');
    } finally {
      setIsGenerating(false);
    }
  };

  // Ação: Visualizar PDF em nova aba
  const handlePreviewPDF = () => {
    setIsGenerating(true);
    try {
      const doc = reportType === 'weekly'
        ? generateWeeklyPDF(weeklyData, profile, vehicle, options)
        : generateMonthlyPDF(monthlyData, profile, vehicle, options);

      const pdfBlob = doc.output('blob');
      const blobUrl = URL.createObjectURL(pdfBlob);
      window.open(blobUrl, '_blank');
      showToast('📄 Visualização do PDF aberta em nova aba.');
    } catch (err) {
      console.error(err);
      showToast('❌ Erro ao abrir prévia do PDF.');
    } finally {
      setIsGenerating(false);
    }
  };

  // Ação: Imprimir PDF
  const handlePrintPDF = () => {
    setIsGenerating(true);
    try {
      const doc = reportType === 'weekly'
        ? generateWeeklyPDF(weeklyData, profile, vehicle, options)
        : generateMonthlyPDF(monthlyData, profile, vehicle, options);

      doc.autoPrint();
      const pdfBlob = doc.output('blob');
      const blobUrl = URL.createObjectURL(pdfBlob);
      window.open(blobUrl, '_blank');
      showToast('🖨️ Janela de impressão aberta.');
    } catch (err) {
      console.error(err);
      showToast('❌ Erro ao enviar para impressão.');
    } finally {
      setIsGenerating(false);
    }
  };

  // Ação: Compartilhar PDF (Mobile Web Share se suportado)
  const handleSharePDF = async () => {
    try {
      const doc = reportType === 'weekly'
        ? generateWeeklyPDF(weeklyData, profile, vehicle, options)
        : generateMonthlyPDF(monthlyData, profile, vehicle, options);

      const pdfBlob = doc.output('blob');
      const filename = reportType === 'weekly'
        ? `DriverPlanner_Relatorio_Semanal.pdf`
        : `DriverPlanner_Relatorio_Mensal_${monthNames[selectedMonthIndex]}_${selectedYear}.pdf`;

      const file = new File([pdfBlob], filename, { type: 'application/pdf' });

      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: reportType === 'weekly' ? 'Relatório Semanal - Driver Planner' : 'Relatório Mensal - Driver Planner',
          text: `Relatório Financeiro do Motorista (${profile.name}) - Período: ${reportType === 'weekly' ? weeklyRange.label : monthlyData.monthName}`,
        });
        showToast('✅ Compartilhado com sucesso!');
      } else {
        handleDownloadPDF();
      }
    } catch (err) {
      // User cancelled share or unsupported
      handleDownloadPDF();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-950/80 backdrop-blur-md overflow-y-auto">
      <div className="bg-slate-900 border border-white/15 rounded-3xl w-full max-w-3xl p-5 sm:p-7 shadow-2xl space-y-6 my-auto text-slate-100 relative">
        
        {/* TOAST FLUTUANTE */}
        {toastMessage && (
          <div className="absolute top-4 left-1/2 -translate-x-1/2 z-50 bg-emerald-500 text-slate-950 font-black text-xs px-4 py-2 rounded-full shadow-2xl flex items-center gap-1.5 animate-bounce">
            <Check className="w-4 h-4" />
            <span>{toastMessage}</span>
          </div>
        )}

        {/* HEADER DO MODAL */}
        <div className="flex items-center justify-between border-b border-white/10 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-emerald-500 to-teal-400 flex items-center justify-center text-slate-950 shadow-lg shadow-emerald-500/20">
              <FileText className="w-6 h-6 stroke-[2.5]" />
            </div>
            <div>
              <h2 className="text-lg font-black text-white tracking-tight flex items-center gap-2">
                EMITIR RELATÓRIO EM PDF
                <span className="text-[10px] bg-emerald-500/20 text-emerald-300 font-bold px-2 py-0.5 rounded-full border border-emerald-500/30">
                  A4 Pronto para Impressão
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Gere demonstrativos contábeis completos para controle pessoal, MEI ou declarações.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* SELEÇÃO DO TIPO DE RELATÓRIO: SEMANAL VS MENSAL */}
        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => setReportType('weekly')}
            className={`p-3.5 rounded-2xl border flex flex-col items-start gap-1 transition text-left ${
              reportType === 'weekly'
                ? 'bg-emerald-500/15 border-emerald-500/50 text-white shadow-lg shadow-emerald-500/10'
                : 'bg-white/5 border-white/10 text-slate-400 hover:text-slate-200 hover:bg-white/10'
            }`}
          >
            <div className="flex items-center justify-between w-full">
              <span className="text-xs font-black text-white flex items-center gap-1.5">
                <Calendar className="w-4 h-4 text-emerald-400" />
                RELATÓRIO SEMANAL
              </span>
              {reportType === 'weekly' && (
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              )}
            </div>
            <span className="text-[11px] text-slate-400">
              Detalhamento de Segunda a Domingo com faturamento diário e métricas por hora/km.
            </span>
          </button>

          <button
            type="button"
            onClick={() => setReportType('monthly')}
            className={`p-3.5 rounded-2xl border flex flex-col items-start gap-1 transition text-left ${
              reportType === 'monthly'
                ? 'bg-emerald-500/15 border-emerald-500/50 text-white shadow-lg shadow-emerald-500/10'
                : 'bg-white/5 border-white/10 text-slate-400 hover:text-slate-200 hover:bg-white/10'
            }`}
          >
            <div className="flex items-center justify-between w-full">
              <span className="text-xs font-black text-white flex items-center gap-1.5">
                <FileText className="w-4 h-4 text-emerald-400" />
                RELATÓRIO MENSAL
              </span>
              {reportType === 'monthly' && (
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              )}
            </div>
            <span className="text-[11px] text-slate-400">
              DRE consolidado, custos fixos do veículo (IPVA/Seguro), depreciação e comparativo vs mês anterior.
            </span>
          </button>
        </div>

        {/* SELETOR DE DATA / PERÍODO ESPECÍFICO */}
        <div className="bg-white/5 p-4 rounded-2xl border border-white/10 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-black text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
              <Filter className="w-3.5 h-3.5 text-emerald-400" />
              SELECIONAR PERÍODO DE REFERÊNCIA
            </span>
            <span className="text-xs font-bold text-emerald-400">
              {reportType === 'weekly' ? weeklyRange.label : monthlyData.monthName}
            </span>
          </div>

          {reportType === 'weekly' ? (
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setWeekOffset(0)}
                className={`py-2 px-3 rounded-xl text-xs font-bold border transition ${
                  weekOffset === 0
                    ? 'bg-emerald-500 text-slate-950 border-emerald-400 shadow-md'
                    : 'bg-white/5 text-slate-300 border-white/10 hover:bg-white/10'
                }`}
              >
                Esta Semana (Atual)
              </button>
              <button
                type="button"
                onClick={() => setWeekOffset(-1)}
                className={`py-2 px-3 rounded-xl text-xs font-bold border transition ${
                  weekOffset === -1
                    ? 'bg-emerald-500 text-slate-950 border-emerald-400 shadow-md'
                    : 'bg-white/5 text-slate-300 border-white/10 hover:bg-white/10'
                }`}
              >
                Semana Passada
              </button>
              <button
                type="button"
                onClick={() => setWeekOffset(-2)}
                className={`py-2 px-3 rounded-xl text-xs font-bold border transition ${
                  weekOffset === -2
                    ? 'bg-emerald-500 text-slate-950 border-emerald-400 shadow-md'
                    : 'bg-white/5 text-slate-300 border-white/10 hover:bg-white/10'
                }`}
              >
                2 Semanas Atrás
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] font-bold text-slate-400 mb-1 block">Mês:</label>
                <select
                  value={selectedMonthIndex}
                  onChange={e => setSelectedMonthIndex(Number(e.target.value))}
                  className="w-full bg-slate-950 border border-white/15 rounded-xl px-3 py-2 text-xs font-bold text-white focus:outline-none focus:border-emerald-500"
                >
                  {monthNames.map((m, idx) => (
                    <option key={m} value={idx}>
                      {m}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-400 mb-1 block">Ano:</label>
                <select
                  value={selectedYear}
                  onChange={e => setSelectedYear(Number(e.target.value))}
                  className="w-full bg-slate-950 border border-white/15 rounded-xl px-3 py-2 text-xs font-bold text-white focus:outline-none focus:border-emerald-500"
                >
                  {[selectedYear - 1, selectedYear, selectedYear + 1].map(y => (
                    <option key={y} value={y}>
                      {y}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}
        </div>

        {/* PRÉVIA DOS DADOS CONSOLIDADOS DO PDF */}
        <div className="bg-slate-950/60 p-4 rounded-2xl border border-white/10 space-y-3">
          <div className="flex items-center justify-between text-xs">
            <span className="font-black text-white flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
              PRÉVIA DO BALANÇO A SER EMITIDO
            </span>
            <span className="text-[11px] text-slate-400">
              {reportType === 'weekly'
                ? `${weeklyData.totalTrips} corridas • ${formatKm(weeklyData.totalKm)}`
                : `${monthlyData.daysWorkedCount} dias operados • ${formatKm(monthlyData.totalKm)}`}
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center">
            <div className="bg-white/5 p-3 rounded-xl border border-white/5">
              <span className="text-[10px] font-bold text-slate-400 uppercase">Faturamento Bruto</span>
              <div className="text-sm font-black text-emerald-400 mt-0.5">
                {reportType === 'weekly'
                  ? formatCurrency(weeklyData.grossTotal + weeklyData.tipsTotal)
                  : formatCurrency(monthlyData.grossTotal + monthlyData.tipsTotal)}
              </div>
            </div>

            <div className="bg-white/5 p-3 rounded-xl border border-white/5">
              <span className="text-[10px] font-bold text-slate-400 uppercase">Despesas</span>
              <div className="text-sm font-black text-rose-400 mt-0.5">
                {reportType === 'weekly'
                  ? formatCurrency(weeklyData.totalExpenses)
                  : formatCurrency(monthlyData.totalExpensesWithFixed)}
              </div>
            </div>

            <div className="bg-white/5 p-3 rounded-xl border border-white/5">
              <span className="text-[10px] font-bold text-slate-400 uppercase">Lucro Líquido</span>
              <div className="text-sm font-black text-white mt-0.5">
                {reportType === 'weekly'
                  ? formatCurrency(weeklyData.netProfit)
                  : formatCurrency(monthlyData.realNetProfit)}
              </div>
            </div>

            <div className="bg-white/5 p-3 rounded-xl border border-white/5">
              <span className="text-[10px] font-bold text-slate-400 uppercase">Margem Líquida</span>
              <div className="text-sm font-black text-teal-300 mt-0.5">
                {reportType === 'weekly'
                  ? `${weeklyData.netMarginPercent.toFixed(1)}%`
                  : `${monthlyData.netMarginPercent.toFixed(1)}%`}
              </div>
            </div>
          </div>

          {/* Destaque de Médias */}
          <div className="flex flex-wrap items-center justify-between text-[11px] text-slate-400 pt-1 border-t border-white/5">
            <span>
              Ganho por KM: <strong className="text-slate-200">
                {formatCurrency(reportType === 'weekly' ? weeklyData.grossPerKm : monthlyData.grossPerKm)}/km
              </strong>
            </span>
            <span>
              Ganho por Hora: <strong className="text-slate-200">
                {formatCurrency(reportType === 'weekly' ? weeklyData.grossPerHour : monthlyData.grossPerHour)}/h
              </strong>
            </span>
            <span>
              Horas Turno: <strong className="text-slate-200">
                {formatHours(reportType === 'weekly' ? weeklyData.totalHours : monthlyData.totalHours)}
              </strong>
            </span>
          </div>
        </div>

        {/* BOTÕES DE AÇÃO PRINCIPAIS */}
        <div className="space-y-3 pt-2 border-t border-white/10">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* BOTÃO PRINCIPAL: BAIXAR PDF */}
            <button
              type="button"
              disabled={isGenerating}
              onClick={handleDownloadPDF}
              className="w-full bg-gradient-to-r from-emerald-500 to-teal-400 hover:from-emerald-400 hover:to-teal-300 text-slate-950 font-black py-3.5 px-4 rounded-2xl text-xs flex items-center justify-center gap-2 shadow-xl shadow-emerald-500/25 active:scale-98 transition disabled:opacity-50"
            >
              <Download className="w-4 h-4 stroke-[2.5]" />
              <span>{isGenerating ? 'GERANDO PDF...' : 'BAIXAR PDF AGORA (.PDF)'}</span>
            </button>

            {/* BOTÃO VISUALIZAR EM NOVA ABA */}
            <button
              type="button"
              disabled={isGenerating}
              onClick={handlePreviewPDF}
              className="w-full bg-white/10 hover:bg-white/15 text-white font-bold py-3.5 px-4 rounded-2xl text-xs border border-white/10 flex items-center justify-center gap-2 active:scale-98 transition disabled:opacity-50"
            >
              <Eye className="w-4 h-4" />
              <span>VISUALIZAR / ABRIR PDF</span>
            </button>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {/* BOTÃO IMPRIMIR */}
            <button
              type="button"
              disabled={isGenerating}
              onClick={handlePrintPDF}
              className="bg-white/5 hover:bg-white/10 text-slate-300 font-bold py-2.5 px-3 rounded-xl text-xs border border-white/5 flex items-center justify-center gap-1.5 transition"
            >
              <Printer className="w-4 h-4" />
              <span>Imprimir A4</span>
            </button>

            {/* BOTÃO COMPARTILHAR */}
            <button
              type="button"
              disabled={isGenerating}
              onClick={handleSharePDF}
              className="bg-white/5 hover:bg-white/10 text-slate-300 font-bold py-2.5 px-3 rounded-xl text-xs border border-white/5 flex items-center justify-center gap-1.5 transition"
            >
              <Share2 className="w-4 h-4" />
              <span>Compartilhar</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
