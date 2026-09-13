import React, { useState, useMemo } from 'react';
import { useDriver } from '../context/DriverContext';
import {
  calcPlatformBreakdown,
  calcMonthlyComparison,
  formatCurrency,
  formatKm,
  formatHours,
  safeDivide,
} from '../utils/calc';
import {
  getWeekRange,
  getMonthRange,
  aggregateWeeklyData,
  aggregateMonthlyData,
  generateWeeklyPDF,
  generateMonthlyPDF,
} from '../utils/pdfGenerator';
import { PDFReportModal } from './PDFReportModal';
import {
  BarChart3,
  Download,
  FileSpreadsheet,
  FileCode,
  Printer,
  TrendingUp,
  TrendingDown,
  Layers,
  Fuel,
  PieChart,
  Car,
  FileText,
  Calendar,
  Sparkles,
  ChevronRight,
  Eye,
  Share2,
  CheckCircle2,
  Calculator,
  ShieldCheck,
  Lock,
  Unlock,
  FileCheck2,
  AlertTriangle,
  ArrowRight,
  BookOpen,
} from 'lucide-react';
import { PlatformType } from '../types';
import { RecalculateRecordsModal } from './RecalculateRecordsModal';

export const ReportsView: React.FC = () => {
  const {
    sessions,
    earnings,
    expenses,
    fuelRecords,
    maintenances,
    profile,
    vehicle,
    exportDataCSV,
    exportDataJSON,
    accountingClosings,
    closePeriodAccounting,
    reopenPeriodAccounting,
    exportAccountingStatementCSV,
    reconcilePlannerData,
    fuelCalculationMethod,
  } = useDriver();

  // Tab interna de visualização
  const [activeReportTab, setActiveReportTab] = useState<'overview' | 'weekly' | 'monthly' | 'accounting_closing'>('overview');

  // Estado do Modal de PDF
  const [showPDFModal, setShowPDFModal] = useState(false);
  const [pdfModalInitialType, setPdfModalInitialType] = useState<'weekly' | 'monthly'>('monthly');
  const [showRecalculateModal, setShowRecalculateModal] = useState(false);
  const [closingTypeSelected, setClosingTypeSelected] = useState<'weekly' | 'monthly'>('monthly');
  const [closureSuccessMessage, setClosureSuccessMessage] = useState<string | null>(null);

  // Controle de offset semanal e mensal para visualização interativa
  const [weekOffset, setWeekOffset] = useState<number>(0);
  const now = new Date();
  const [selectedYear, setSelectedYear] = useState<number>(now.getFullYear());
  const [selectedMonthIndex, setSelectedMonthIndex] = useState<number>(now.getMonth());

  // Breakdown por plataforma
  const platformStats = useMemo(() => calcPlatformBreakdown(earnings), [earnings]);

  // Comparativo mensal padrão (FASE E: utilizando a Fonte Única da Verdade)
  const monthlyComp = useMemo(() => {
    return calcMonthlyComparison(
      sessions,
      expenses,
      fuelRecords,
      earnings,
      profile.fuelCalculationMethod || 'hibrido',
      profile.timezone
    );
  }, [sessions, expenses, fuelRecords, earnings, profile.fuelCalculationMethod, profile.timezone]);

  // Dados calculados para a semana selecionada
  const currentWeekRange = useMemo(() => {
    const baseDate = new Date();
    baseDate.setDate(baseDate.getDate() + weekOffset * 7);
    return getWeekRange(baseDate);
  }, [weekOffset]);

  const weeklyData = useMemo(() => {
    return aggregateWeeklyData(
      currentWeekRange,
      sessions,
      earnings,
      expenses,
      fuelRecords,
      profile,
      vehicle
    );
  }, [currentWeekRange, sessions, earnings, expenses, fuelRecords, profile, vehicle]);

  // Dados calculados para o mês selecionado
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

  // Despesas agrupadas por categoria
  const expensesByCategory = useMemo(() => {
    const map: Record<string, number> = {};
    expenses.forEach(e => {
      map[e.category] = (map[e.category] || 0) + e.amount;
    });
    const totalExp = Object.values(map).reduce((a, b) => a + b, 0);

    return Object.entries(map)
      .map(([category, amount]) => ({
        category,
        amount,
        share: totalExp > 0 ? (amount / totalExp) * 100 : 0,
      }))
      .sort((a, b) => b.amount - a.amount);
  }, [expenses]);

  const totalGrossAll = sessions.reduce((acc, s) => acc + s.grossEarnings + s.tips, 0);
  const totalExpAll = expenses.reduce((acc, e) => acc + e.amount, 0);
  const totalNetAll = totalGrossAll - totalExpAll;

  // Abertura rápida do modal de PDF
  const handleOpenPDF = (type: 'weekly' | 'monthly') => {
    setPdfModalInitialType(type);
    setShowPDFModal(true);
  };

  // Download direto sem abrir modal
  const handleQuickDownloadWeeklyPDF = () => {
    const doc = generateWeeklyPDF(weeklyData, profile, vehicle);
    const startStr = weeklyData.range.startDate.toLocaleDateString('pt-BR').replace(/\//g, '-');
    const endStr = weeklyData.range.endDate.toLocaleDateString('pt-BR').replace(/\//g, '-');
    doc.save(`DriverPlanner_Relatorio_Semanal_${startStr}_a_${endStr}.pdf`);
  };

  const handleQuickDownloadMonthlyPDF = () => {
    const doc = generateMonthlyPDF(monthlyData, profile, vehicle);
    const monthNames = ['janeiro', 'fevereiro', 'marco', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
    doc.save(`DriverPlanner_Relatorio_Mensal_${monthNames[selectedMonthIndex]}_${selectedYear}.pdf`);
  };

  const handlePrint = () => {
    window.print();
  };

  const monthNames = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
  ];

  return (
    <div className="space-y-6">
      
      {/* HEADER E AÇÕES DE EXPORTAÇÃO */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-white/5 backdrop-blur-lg border border-white/10 p-5 rounded-3xl">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[10px] bg-emerald-500/20 text-emerald-300 font-bold px-2 py-0.5 rounded-full border border-emerald-500/30">
              Módulo Contábil & Exportação
            </span>
          </div>
          <h2 className="text-base sm:text-xl font-black text-white tracking-tight flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-emerald-400" />
            RELATÓRIOS FINANCEIROS & EMISSÃO EM PDF
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Demonstrativos semanais e mensais formatados em PDF padrão A4 para controle pessoal, MEI e imposto de renda.
          </p>
        </div>

        {/* BOTÕES DE AÇÃO DE EXPORTAÇÃO */}
        <div className="flex flex-wrap items-center gap-2 self-start lg:self-auto">
          {/* BOTÃO RECALCULAR COM DADOS DO VEÍCULO */}
          <button
            onClick={() => setShowRecalculateModal(true)}
            className="bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 font-bold px-3 py-2.5 rounded-xl text-xs border border-emerald-500/30 flex items-center gap-1.5 active:scale-95 transition"
            title="Recalcular combustível e custos dos turnos passados com dados do veículo"
          >
            <Calculator className="w-4 h-4 text-emerald-400" />
            <span>Recalcular Lançamentos</span>
          </button>

          {/* BOTÃO EMITIR PDF SEMANAL */}
          <button
            onClick={() => handleOpenPDF('weekly')}
            className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black px-3.5 py-2.5 rounded-xl text-xs flex items-center gap-1.5 shadow-lg shadow-emerald-500/20 active:scale-95 transition"
            title="Emitir Relatório Semanal em PDF"
          >
            <Calendar className="w-4 h-4" />
            <span>PDF Semanal</span>
          </button>

          {/* BOTÃO EMITIR PDF MENSAL */}
          <button
            onClick={() => handleOpenPDF('monthly')}
            className="bg-gradient-to-r from-teal-500 to-emerald-400 hover:from-teal-400 hover:to-emerald-300 text-slate-950 font-black px-3.5 py-2.5 rounded-xl text-xs flex items-center gap-1.5 shadow-lg shadow-teal-500/20 active:scale-95 transition"
            title="Emitir Relatório Mensal em PDF"
          >
            <FileText className="w-4 h-4" />
            <span>PDF Mensal</span>
          </button>

          {/* BOTÃO CSV / EXCEL */}
          <button
            onClick={exportDataCSV}
            className="bg-white/10 hover:bg-white/15 text-slate-200 font-bold px-3 py-2.5 rounded-xl text-xs border border-white/10 flex items-center gap-1.5 active:scale-95 transition"
            title="Exportar para Planilha Excel (CSV)"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>CSV</span>
          </button>

          {/* BOTÃO JSON */}
          <button
            onClick={exportDataJSON}
            className="bg-white/10 hover:bg-white/15 text-slate-200 font-bold px-3 py-2.5 rounded-xl text-xs border border-white/10 flex items-center gap-1.5 active:scale-95 transition"
            title="Backup completo em JSON"
          >
            <FileCode className="w-4 h-4" />
            <span>JSON</span>
          </button>

          {/* BOTÃO IMPRIMIR */}
          <button
            onClick={handlePrint}
            className="bg-white/10 hover:bg-white/15 text-slate-200 font-bold px-3 py-2.5 rounded-xl text-xs border border-white/10 flex items-center gap-1 active:scale-95 transition"
            title="Imprimir Relatório"
          >
            <Printer className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* BANNER DE DESTAQUE: CENTRAL DE PDF 1-CLIQUE */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* CARD DESTAQUE SEMANAL */}
        <div className="bg-gradient-to-br from-slate-900 via-slate-900/90 to-emerald-950/40 border border-emerald-500/20 p-5 rounded-3xl relative overflow-hidden space-y-4">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center">
                <Calendar className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-black text-white">RELATÓRIO SEMANAL (PDF)</h3>
                <span className="text-[11px] text-emerald-300 font-medium">{weeklyData.range.label}</span>
              </div>
            </div>
            <span className="text-[10px] bg-emerald-500/20 text-emerald-300 font-bold px-2 py-0.5 rounded-full border border-emerald-500/30">
              Semana {weekOffset === 0 ? 'Atual' : weekOffset === -1 ? 'Passada' : `${Math.abs(weekOffset)} sem atrás`}
            </span>
          </div>

          <div className="grid grid-cols-3 gap-2 text-center bg-slate-950/40 p-3 rounded-2xl border border-white/5">
            <div>
              <span className="text-[10px] text-slate-400 block uppercase font-bold">Faturamento</span>
              <span className="text-sm font-black text-emerald-400">
                {formatCurrency(weeklyData.grossTotal + weeklyData.tipsTotal)}
              </span>
            </div>
            <div>
              <span className="text-[10px] text-slate-400 block uppercase font-bold">Despesas</span>
              <span className="text-sm font-black text-rose-400">
                {formatCurrency(weeklyData.totalExpenses)}
              </span>
            </div>
            <div>
              <span className="text-[10px] text-slate-400 block uppercase font-bold">Lucro Líquido</span>
              <span className="text-sm font-black text-white">
                {formatCurrency(weeklyData.netProfit)}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 pt-1">
            <button
              onClick={handleQuickDownloadWeeklyPDF}
              className="flex-1 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black py-2.5 px-3 rounded-xl text-xs flex items-center justify-center gap-1.5 shadow-md shadow-emerald-500/20 active:scale-95 transition"
            >
              <Download className="w-4 h-4 stroke-[2.5]" />
              <span>Baixar PDF Semanal</span>
            </button>
            <button
              onClick={() => handleOpenPDF('weekly')}
              className="bg-white/10 hover:bg-white/15 text-white font-bold py-2.5 px-3 rounded-xl text-xs border border-white/10 flex items-center justify-center gap-1 transition"
              title="Personalizar e visualizar PDF"
            >
              <Eye className="w-4 h-4" />
              <span>Opções</span>
            </button>
          </div>
        </div>

        {/* CARD DESTAQUE MENSAL */}
        <div className="bg-gradient-to-br from-slate-900 via-slate-900/90 to-teal-950/40 border border-teal-500/20 p-5 rounded-3xl relative overflow-hidden space-y-4">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-teal-500/20 text-teal-400 border border-teal-500/30 flex items-center justify-center">
                <FileText className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-black text-white">RELATÓRIO MENSAL (PDF)</h3>
                <span className="text-[11px] text-teal-300 font-medium">{monthlyData.monthName}</span>
              </div>
            </div>
            <span className="text-[10px] bg-teal-500/20 text-teal-300 font-bold px-2 py-0.5 rounded-full border border-teal-500/30">
              DRE Consolidado
            </span>
          </div>

          <div className="grid grid-cols-3 gap-2 text-center bg-slate-950/40 p-3 rounded-2xl border border-white/5">
            <div>
              <span className="text-[10px] text-slate-400 block uppercase font-bold">Total Mês</span>
              <span className="text-sm font-black text-emerald-400">
                {formatCurrency(monthlyData.grossTotal + monthlyData.tipsTotal)}
              </span>
            </div>
            <div>
              <span className="text-[10px] text-slate-400 block uppercase font-bold">Total Despesas</span>
              <span className="text-sm font-black text-rose-400">
                {formatCurrency(monthlyData.totalExpensesWithFixed)}
              </span>
            </div>
            <div>
              <span className="text-[10px] text-slate-400 block uppercase font-bold">Lucro Real</span>
              <span className="text-sm font-black text-white">
                {formatCurrency(monthlyData.realNetProfit)}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 pt-1">
            <button
              onClick={handleQuickDownloadMonthlyPDF}
              className="flex-1 bg-gradient-to-r from-teal-500 to-emerald-400 hover:from-teal-400 hover:to-emerald-300 text-slate-950 font-black py-2.5 px-3 rounded-xl text-xs flex items-center justify-center gap-1.5 shadow-md shadow-teal-500/20 active:scale-95 transition"
            >
              <Download className="w-4 h-4 stroke-[2.5]" />
              <span>Baixar PDF Mensal</span>
            </button>
            <button
              onClick={() => handleOpenPDF('monthly')}
              className="bg-white/10 hover:bg-white/15 text-white font-bold py-2.5 px-3 rounded-xl text-xs border border-white/10 flex items-center justify-center gap-1 transition"
              title="Personalizar e visualizar PDF"
            >
              <Eye className="w-4 h-4" />
              <span>Opções</span>
            </button>
          </div>
        </div>
      </div>

      {/* TABS DE VISUALIZAÇÃO INTERNA */}
      <div className="flex items-center gap-2 border-b border-white/10 pb-2 overflow-x-auto">
        <button
          onClick={() => setActiveReportTab('overview')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition whitespace-nowrap ${
            activeReportTab === 'overview'
              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
              : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
          }`}
        >
          Visão Geral & Gráficos
        </button>
        <button
          onClick={() => setActiveReportTab('weekly')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition whitespace-nowrap flex items-center gap-1.5 ${
            activeReportTab === 'weekly'
              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
              : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
          }`}
        >
          <Calendar className="w-3.5 h-3.5" />
          <span>Detalhamento Semanal</span>
        </button>
        <button
          onClick={() => setActiveReportTab('monthly')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition whitespace-nowrap flex items-center gap-1.5 ${
            activeReportTab === 'monthly'
              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
              : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
          }`}
        >
          <FileText className="w-3.5 h-3.5" />
          <span>Detalhamento Mensal & DRE</span>
        </button>
        <button
          onClick={() => setActiveReportTab('accounting_closing')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition whitespace-nowrap flex items-center gap-1.5 ${
            activeReportTab === 'accounting_closing'
              ? 'bg-teal-500/20 text-teal-300 border border-teal-500/30 shadow-sm shadow-teal-500/20'
              : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
          }`}
        >
          <ShieldCheck className="w-3.5 h-3.5 text-teal-400" />
          <span>Fechamento & Auditoria (Fase E)</span>
        </button>
      </div>

      {/* ABA: DETALHAMENTO SEMANAL INTERATIVO */}
      {activeReportTab === 'weekly' && (
        <div className="space-y-4">
          {/* SELETOR DE SEMANA */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white/5 p-4 rounded-2xl border border-white/10">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setWeekOffset(prev => prev - 1)}
                className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/15 text-xs font-bold text-slate-200 border border-white/10"
              >
                ← Semana Anterior
              </button>
              <button
                onClick={() => setWeekOffset(0)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition ${
                  weekOffset === 0
                    ? 'bg-emerald-500 text-slate-950 border-emerald-400'
                    : 'bg-white/10 text-slate-200 border-white/10 hover:bg-white/15'
                }`}
              >
                Semana Atual
              </button>
              {weekOffset < 0 && (
                <button
                  onClick={() => setWeekOffset(prev => prev + 1)}
                  className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/15 text-xs font-bold text-slate-200 border border-white/10"
                >
                  Próxima Semana →
                </button>
              )}
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-emerald-400">{weeklyData.range.label}</span>
              <button
                onClick={handleQuickDownloadWeeklyPDF}
                className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black px-3 py-1.5 rounded-xl text-xs flex items-center gap-1 shadow"
              >
                <Download className="w-3.5 h-3.5 stroke-[2.5]" />
                <span>Emitir PDF</span>
              </button>
            </div>
          </div>

          {/* TABELA DE DESEMPENHO DIÁRIO NA SEMANA */}
          <div className="bg-white/5 backdrop-blur-lg border border-white/10 p-5 rounded-2xl space-y-3 overflow-x-auto">
            <h3 className="text-sm font-black text-white flex items-center gap-2">
              <Calendar className="w-4 h-4 text-emerald-400" />
              DESEMPENHO DIÁRIO (SEGUNDA A DOMINGO)
            </h3>

            <table className="w-full text-left text-xs border-collapse min-w-[650px]">
              <thead>
                <tr className="border-b border-white/10 text-slate-400 text-[11px]">
                  <th className="py-2.5 px-3">Dia / Data</th>
                  <th className="py-2.5 px-3 text-right">Faturamento</th>
                  <th className="py-2.5 px-3 text-right">Combustível</th>
                  <th className="py-2.5 px-3 text-right">Despesas</th>
                  <th className="py-2.5 px-3 text-right">Lucro Líquido</th>
                  <th className="py-2.5 px-3 text-center">KM</th>
                  <th className="py-2.5 px-3 text-center">Horas</th>
                  <th className="py-2.5 px-3 text-center">Corridas</th>
                  <th className="py-2.5 px-3 text-right">R$/KM</th>
                  <th className="py-2.5 px-3 text-right">R$/Hora</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 text-slate-200">
                {weeklyData.dailyRows.map((row, idx) => (
                  <tr key={idx} className="hover:bg-white/5 transition">
                    <td className="py-2.5 px-3 font-bold text-white">
                      {row.dayName} <span className="text-[10px] text-slate-400 font-normal">({row.dateStr})</span>
                    </td>
                    <td className="py-2.5 px-3 text-right font-black text-emerald-400">
                      {formatCurrency(row.gross + row.tips)}
                    </td>
                    <td className="py-2.5 px-3 text-right text-rose-400">
                      {formatCurrency(row.fuelExp)}
                    </td>
                    <td className="py-2.5 px-3 text-right text-rose-400">
                      {formatCurrency(row.otherExp)}
                    </td>
                    <td className="py-2.5 px-3 text-right font-bold text-white">
                      {formatCurrency(row.net)}
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      {formatKm(row.km)}
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      {formatHours(row.hours)}
                    </td>
                    <td className="py-2.5 px-3 text-center font-bold">
                      {row.trips}
                    </td>
                    <td className="py-2.5 px-3 text-right">
                      {formatCurrency(row.rateKm)}/km
                    </td>
                    <td className="py-2.5 px-3 text-right">
                      {formatCurrency(row.rateHour)}/h
                    </td>
                  </tr>
                ))}
                {/* LINHA TOTALIZADORA */}
                <tr className="bg-white/10 font-black text-white border-t border-white/20">
                  <td className="py-3 px-3">TOTAL DA SEMANA</td>
                  <td className="py-3 px-3 text-right text-emerald-400">
                    {formatCurrency(weeklyData.grossTotal + weeklyData.tipsTotal)}
                  </td>
                  <td className="py-3 px-3 text-right text-rose-400">
                    {formatCurrency(weeklyData.fuelExpenses)}
                  </td>
                  <td className="py-3 px-3 text-right text-rose-400">
                    {formatCurrency(weeklyData.otherExpenses)}
                  </td>
                  <td className="py-3 px-3 text-right text-white">
                    {formatCurrency(weeklyData.netProfit)}
                  </td>
                  <td className="py-3 px-3 text-center">
                    {formatKm(weeklyData.totalKm)}
                  </td>
                  <td className="py-3 px-3 text-center">
                    {formatHours(weeklyData.totalHours)}
                  </td>
                  <td className="py-3 px-3 text-center">
                    {weeklyData.totalTrips}
                  </td>
                  <td className="py-3 px-3 text-right text-emerald-400">
                    {formatCurrency(weeklyData.grossPerKm)}/km
                  </td>
                  <td className="py-3 px-3 text-right text-emerald-400">
                    {formatCurrency(weeklyData.grossPerHour)}/h
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ABA: DETALHAMENTO MENSAL & DRE INTERATIVO */}
      {activeReportTab === 'monthly' && (
        <div className="space-y-4">
          {/* SELETOR DE MÊS E ANO */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white/5 p-4 rounded-2xl border border-white/10">
            <div className="flex items-center gap-2">
              <select
                value={selectedMonthIndex}
                onChange={e => setSelectedMonthIndex(Number(e.target.value))}
                className="bg-slate-900 border border-white/15 rounded-xl px-3 py-1.5 text-xs font-bold text-white focus:outline-none focus:border-emerald-500"
              >
                {monthNames.map((m, idx) => (
                  <option key={m} value={idx}>
                    {m}
                  </option>
                ))}
              </select>
              <select
                value={selectedYear}
                onChange={e => setSelectedYear(Number(e.target.value))}
                className="bg-slate-900 border border-white/15 rounded-xl px-3 py-1.5 text-xs font-bold text-white focus:outline-none focus:border-emerald-500"
              >
                {[selectedYear - 1, selectedYear, selectedYear + 1].map(y => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-teal-400">{monthlyData.monthName}</span>
              <button
                onClick={handleQuickDownloadMonthlyPDF}
                className="bg-gradient-to-r from-teal-500 to-emerald-400 text-slate-950 font-black px-3 py-1.5 rounded-xl text-xs flex items-center gap-1 shadow"
              >
                <Download className="w-3.5 h-3.5 stroke-[2.5]" />
                <span>Emitir PDF Mensal</span>
              </button>
            </div>
          </div>

          {/* DRE OPERACIONAL RESUMIDO DO MÊS */}
          <div className="bg-white/5 backdrop-blur-lg border border-white/10 p-5 rounded-2xl space-y-3">
            <h3 className="text-sm font-black text-white flex items-center gap-2">
              <FileText className="w-4 h-4 text-teal-400" />
              DEMONSTRATIVO DE RESULTADO (DRE MENSAL)
            </h3>

            <div className="space-y-2 text-xs divide-y divide-white/5">
              <div className="flex justify-between items-center py-2">
                <span className="font-bold text-white">(+) Faturamento Bruto Total (Corridas + Gorjetas)</span>
                <span className="font-black text-emerald-400 text-sm">
                  {formatCurrency(monthlyData.grossTotal + monthlyData.tipsTotal)}
                </span>
              </div>
              <div className="flex justify-between items-center py-2 text-rose-400">
                <span>(-) Despesas Operacionais Diretas (Combustível, Alimentação, Lavagem)</span>
                <span className="font-bold">{formatCurrency(monthlyData.directExpenses)}</span>
              </div>
              <div className="flex justify-between items-center py-2 font-bold text-teal-300">
                <span>(=) Lucro Operacional Bruto</span>
                <span className="font-black">{formatCurrency(monthlyData.grossOperatingProfit)}</span>
              </div>
              <div className="flex justify-between items-center py-2 text-amber-400">
                <span>(-) Custos Fixos do Veículo (Seguro {formatCurrency(monthlyData.fixedCostDetails.insurance)} + IPVA/Licenc. + Financ. {formatCurrency(monthlyData.fixedCostDetails.financing)})</span>
                <span className="font-bold">{formatCurrency(monthlyData.fixedCostsProportional)}</span>
              </div>
              <div className="flex justify-between items-center py-2.5 font-black text-white text-sm bg-white/5 px-3 rounded-xl">
                <span>(=) LUCRO LÍQUIDO REAL NO BOLSO</span>
                <span className="text-emerald-400">{formatCurrency(monthlyData.realNetProfit)}</span>
              </div>
              <div className="flex justify-between items-center py-2 text-slate-400 text-[11px]">
                <span>(-) Provisão Contábil de Desgaste e Depreciação ({formatKm(monthlyData.totalKm)} rodados)</span>
                <span>{formatCurrency(monthlyData.estimatedDepreciation)}</span>
              </div>
              <div className="flex justify-between items-center py-2 font-bold text-slate-300 text-xs">
                <span>(=) Resultado Contábil Final Após Depreciação</span>
                <span>{formatCurrency(monthlyData.finalProfitAfterDepreciation)}</span>
              </div>
            </div>
          </div>

          {/* TABELA DE CONSOLIDAÇÃO POR SEMANAS DO MÊS */}
          <div className="bg-white/5 backdrop-blur-lg border border-white/10 p-5 rounded-2xl space-y-3 overflow-x-auto">
            <h3 className="text-sm font-black text-white flex items-center gap-2">
              <Calendar className="w-4 h-4 text-emerald-400" />
              CONSOLIDAÇÃO POR SEMANAS DO MÊS
            </h3>

            <table className="w-full text-left text-xs border-collapse min-w-[600px]">
              <thead>
                <tr className="border-b border-white/10 text-slate-400 text-[11px]">
                  <th className="py-2.5 px-3">Semana</th>
                  <th className="py-2.5 px-3 text-right">Faturamento</th>
                  <th className="py-2.5 px-3 text-right">Despesas Diretas</th>
                  <th className="py-2.5 px-3 text-right">Lucro Operacional</th>
                  <th className="py-2.5 px-3 text-center">KM</th>
                  <th className="py-2.5 px-3 text-center">Horas</th>
                  <th className="py-2.5 px-3 text-center">Corridas</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 text-slate-200">
                {monthlyData.weeklyBreakdown.map((w, idx) => (
                  <tr key={idx} className="hover:bg-white/5 transition">
                    <td className="py-2.5 px-3 font-bold text-white">{w.weekLabel}</td>
                    <td className="py-2.5 px-3 text-right font-bold text-emerald-400">
                      {formatCurrency(w.gross)}
                    </td>
                    <td className="py-2.5 px-3 text-right text-rose-400">
                      {formatCurrency(w.expenses)}
                    </td>
                    <td className="py-2.5 px-3 text-right font-bold text-white">
                      {formatCurrency(w.net)}
                    </td>
                    <td className="py-2.5 px-3 text-center">{formatKm(w.km)}</td>
                    <td className="py-2.5 px-3 text-center">{formatHours(w.hours)}</td>
                    <td className="py-2.5 px-3 text-center font-bold">{w.trips}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ABA: VISÃO GERAL (GRÁFICOS & CARDS) */}
      {activeReportTab === 'overview' && (
        <div className="space-y-6">
          {/* COMPARATIVO MÊS ATUAL VS MÊS ANTERIOR (SECTION 19) */}
          <div className="bg-white/5 backdrop-blur-lg border border-white/10 p-5 sm:p-6 rounded-3xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-black text-white uppercase tracking-wider flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-emerald-400" />
                COMPARATIVO MENSAL (ESTE MÊS VS MÊS ANTERIOR)
              </h3>
              <span className="text-xs text-slate-400">Dados consolidados</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-center">
              {/* GANHOS BRUTOS */}
              <div className="bg-white/5 p-4 rounded-2xl border border-white/5">
                <span className="text-[10px] font-bold text-slate-400 uppercase">FATURAMENTO BRUTO</span>
                <div className="text-xl font-black text-emerald-400 mt-1">
                  {formatCurrency(monthlyComp.currentGross)}
                </div>
                <div className="flex items-center justify-center gap-1 text-[11px] font-bold mt-1">
                  {monthlyComp.grossChange >= 0 ? (
                    <span className="text-emerald-400 flex items-center">
                      <TrendingUp className="w-3 h-3 mr-0.5" /> +{monthlyComp.grossChange.toFixed(1)}%
                    </span>
                  ) : (
                    <span className="text-rose-400 flex items-center">
                      <TrendingDown className="w-3 h-3 mr-0.5" /> {monthlyComp.grossChange.toFixed(1)}%
                    </span>
                  )}
                  <span className="text-slate-500 font-normal">vs mês anterior</span>
                </div>
              </div>

              {/* DESPESAS */}
              <div className="bg-white/5 p-4 rounded-2xl border border-white/5">
                <span className="text-[10px] font-bold text-slate-400 uppercase">DESPESAS DIRETAS</span>
                <div className="text-xl font-black text-rose-400 mt-1">
                  {formatCurrency(monthlyComp.currentExpenses)}
                </div>
                <div className="flex items-center justify-center gap-1 text-[11px] font-bold mt-1">
                  {monthlyComp.expensesChange <= 0 ? (
                    <span className="text-emerald-400 flex items-center">
                      <TrendingDown className="w-3 h-3 mr-0.5" /> {monthlyComp.expensesChange.toFixed(1)}%
                    </span>
                  ) : (
                    <span className="text-rose-400 flex items-center">
                      <TrendingUp className="w-3 h-3 mr-0.5" /> +{monthlyComp.expensesChange.toFixed(1)}%
                    </span>
                  )}
                  <span className="text-slate-500 font-normal">vs mês anterior</span>
                </div>
              </div>

              {/* LUCRO LÍQUIDO */}
              <div className="bg-white/5 p-4 rounded-2xl border border-white/5">
                <span className="text-[10px] font-bold text-slate-400 uppercase">LUCRO LÍQUIDO REAL</span>
                <div className="text-xl font-black text-white mt-1">
                  {formatCurrency(monthlyComp.currentNet)}
                </div>
                <div className="flex items-center justify-center gap-1 text-[11px] font-bold mt-1">
                  {monthlyComp.netChange >= 0 ? (
                    <span className="text-emerald-400 flex items-center">
                      <TrendingUp className="w-3 h-3 mr-0.5" /> +{monthlyComp.netChange.toFixed(1)}%
                    </span>
                  ) : (
                    <span className="text-rose-400 flex items-center">
                      <TrendingDown className="w-3 h-3 mr-0.5" /> {monthlyComp.netChange.toFixed(1)}%
                    </span>
                  )}
                  <span className="text-slate-500 font-normal">vs mês anterior</span>
                </div>
              </div>
            </div>
          </div>

          {/* COMPARATIVO POR PLATAFORMA (UBER VS 99 VS INDRIVE) (SECTION 9) */}
          <div className="bg-white/5 backdrop-blur-lg border border-white/10 p-5 sm:p-6 rounded-3xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-black text-white uppercase tracking-wider flex items-center gap-2">
                <Layers className="w-4 h-4 text-emerald-400" />
                COMPARATIVO POR APLICATIVO
              </h3>
              <span className="text-xs text-slate-400">Share e Rentabilidade</span>
            </div>

            {platformStats.length === 0 ? (
              <div className="text-center py-6 text-slate-400 text-xs bg-white/5 rounded-2xl">
                Nenhum ganho por plataforma registrado ainda.
              </div>
            ) : (
              <div className="space-y-3">
                {platformStats.map(p => (
                  <div key={p.platform} className="bg-white/5 p-4 rounded-2xl border border-white/5 space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-black text-white">{p.platform}</span>
                        <span className="text-[10px] bg-emerald-500/20 text-emerald-300 font-bold px-2 py-0.5 rounded-full border border-emerald-500/30">
                          {p.sharePercent.toFixed(1)}% do total
                        </span>
                      </div>
                      <div className="text-sm font-black text-emerald-400">{formatCurrency(p.total)}</div>
                    </div>

                    {/* BARRA DE PARTICIPAÇÃO */}
                    <div className="w-full bg-slate-900 rounded-full h-2 overflow-hidden">
                      <div
                        className="bg-emerald-400 h-full rounded-full transition-all duration-500"
                        style={{ width: `${p.sharePercent}%` }}
                      />
                    </div>

                    <div className="flex justify-between items-center text-[11px] text-slate-400 pt-1">
                      <span>{p.trips} corridas registradas</span>
                      <span>Média: <strong className="text-slate-200">{formatCurrency(p.avgPerTrip)}/corrida</strong></span>
                      {p.tips > 0 && <span>Gorjetas: <strong className="text-teal-300">+{formatCurrency(p.tips)}</strong></span>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* DETALHAMENTO DE DESPESAS POR CATEGORIA (SECTION 10) */}
          <div className="bg-white/5 backdrop-blur-lg border border-white/10 p-5 sm:p-6 rounded-3xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-black text-white uppercase tracking-wider flex items-center gap-2">
                <PieChart className="w-4 h-4 text-rose-400" />
                DESPESAS POR CATEGORIA
              </h3>
              <span className="text-xs text-slate-400">Total: {formatCurrency(totalExpAll)}</span>
            </div>

            {expensesByCategory.length === 0 ? (
              <div className="text-center py-6 text-slate-400 text-xs bg-white/5 rounded-2xl">
                Nenhuma despesa registrada ainda.
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {expensesByCategory.map(item => (
                  <div key={item.category} className="bg-white/5 p-3.5 rounded-xl border border-white/5 space-y-1.5">
                    <div className="flex justify-between items-center text-xs">
                      <span className="font-bold text-slate-200">{item.category}</span>
                      <span className="font-black text-rose-400">{formatCurrency(item.amount)}</span>
                    </div>
                    <div className="w-full bg-slate-900 rounded-full h-1.5 overflow-hidden">
                      <div className="bg-rose-400 h-full rounded-full" style={{ width: `${item.share}%` }} />
                    </div>
                    <div className="text-[10px] text-slate-400 text-right font-medium">
                      {item.share.toFixed(1)}% dos gastos
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ABA: FECHAMENTO CONTÁBIL & AUDITORIA DE EXERCÍCIO (FASE E) */}
      {activeReportTab === 'accounting_closing' && (
        <div className="space-y-6">
          {/* BANNER STATUS DE AUDITORIA E FONTE ÚNICA DA VERDADE */}
          <div className="bg-gradient-to-r from-teal-950/60 via-slate-900 to-slate-900 border border-teal-500/30 p-5 rounded-3xl space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-teal-500/20 text-teal-400 border border-teal-500/30 flex items-center justify-center">
                  <ShieldCheck className="w-5 h-5 stroke-[2.5]" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-black text-white">MOTOR DE AUDITORIA CONTÁBIL (FASE E)</h3>
                    <span className="text-[10px] bg-emerald-500/20 text-emerald-300 font-bold px-2 py-0.5 rounded-full border border-emerald-500/30">
                      Fonte Única Ativa
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Relatórios, DRE, Metas e PDFs sincronizados pelo mesmo núcleo. Eliminação total de duplicidade de combustível.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    const res = reconcilePlannerData();
                    setClosureSuccessMessage(
                      res.divergencesFound > 0
                        ? `Auditoria concluída: ${res.divergencesFound} divergência(s) reconciliada(s) com sucesso!`
                        : 'Auditoria concluída: Nenhuma divergência encontrada. Base 100% íntegra!'
                    );
                    setTimeout(() => setClosureSuccessMessage(null), 5000);
                  }}
                  className="bg-white/10 hover:bg-white/15 text-slate-200 font-bold px-3 py-2 rounded-xl text-xs border border-white/10 flex items-center gap-1.5 transition active:scale-95"
                >
                  <ShieldCheck className="w-4 h-4 text-teal-400" />
                  <span>Auditar Integridade</span>
                </button>
              </div>
            </div>

            {/* AVISO / MENSAGEM TEMPORÁRIA DE SUCESSO */}
            {closureSuccessMessage && (
              <div className="bg-teal-500/10 border border-teal-500/30 p-3 rounded-xl flex items-center gap-2 text-xs text-teal-300">
                <CheckCircle2 className="w-4 h-4 text-teal-400 shrink-0" />
                <span>{closureSuccessMessage}</span>
              </div>
            )}

            {/* BADGES DO REGIME CONTÁBIL */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 text-xs">
              <div className="bg-slate-950/40 p-2.5 rounded-xl border border-white/5">
                <span className="text-[10px] text-slate-400 block">Regime Combustível:</span>
                <span className="font-bold text-teal-300 uppercase text-[11px]">
                  {fuelCalculationMethod === 'real_abastecimento' ? 'Abastecimentos Reais' : fuelCalculationMethod === 'estimado_km' ? 'Estimado por KM' : 'Híbrido Inteligente'}
                </span>
              </div>
              <div className="bg-slate-950/40 p-2.5 rounded-xl border border-white/5">
                <span className="text-[10px] text-slate-400 block">Fuso Operacional:</span>
                <span className="font-bold text-slate-200 text-[11px]">{profile.timezone || 'America/Sao_Paulo'}</span>
              </div>
              <div className="bg-slate-950/40 p-2.5 rounded-xl border border-white/5">
                <span className="text-[10px] text-slate-400 block">Períodos Encerrados:</span>
                <span className="font-bold text-white text-[11px]">{accountingClosings.length} exercício(s)</span>
              </div>
              <div className="bg-slate-950/40 p-2.5 rounded-xl border border-white/5">
                <span className="text-[10px] text-slate-400 block">Status da Base:</span>
                <span className="font-bold text-emerald-400 text-[11px]">Auditada & Confiável</span>
              </div>
            </div>
          </div>

          {/* PAINEL DE FECHAMENTO DE PERÍODO CONTÁBIL */}
          <div className="bg-white/5 backdrop-blur-lg border border-white/10 p-5 rounded-3xl space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-white/10">
              <div>
                <h3 className="text-sm font-black text-white flex items-center gap-2">
                  <Lock className="w-4 h-4 text-amber-400" />
                  ENCERRAR E CONGELAR EXERCÍCIO CONTÁBIL
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Gera um hash único e congela os números auditados para declarações de MEI, IRPF ou balancete pessoal.
                </p>
              </div>

              {/* TIPO DE PERÍODO PARA FECHAR */}
              <div className="flex items-center gap-1.5 bg-slate-950/60 p-1 rounded-xl border border-white/10 self-start sm:self-auto">
                <button
                  onClick={() => setClosingTypeSelected('weekly')}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition ${
                    closingTypeSelected === 'weekly'
                      ? 'bg-amber-500 text-slate-950 shadow'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Semanal ({weeklyData.range.label})
                </button>
                <button
                  onClick={() => setClosingTypeSelected('monthly')}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition ${
                    closingTypeSelected === 'monthly'
                      ? 'bg-amber-500 text-slate-950 shadow'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Mensal ({monthNames[selectedMonthIndex]} / {selectedYear})
                </button>
              </div>
            </div>

            {/* PREVIEW DA DRE DO PERÍODO SELECIONADO */}
            {(() => {
              const isWeekly = closingTypeSelected === 'weekly';
              const targetGross = isWeekly ? (weeklyData.grossTotal + weeklyData.tipsTotal) : (monthlyData.grossTotal + monthlyData.tipsTotal);
              const targetFuel = isWeekly ? weeklyData.fuelTotal : monthlyData.fuelTotal;
              const targetOtherExp = isWeekly ? weeklyData.otherExpensesTotal : monthlyData.variableExpensesTotal;
              const targetFixedExp = isWeekly ? 0 : monthlyData.fixedExpensesTotal;
              const targetTotalExp = isWeekly ? weeklyData.totalExpenses : monthlyData.totalExpenses;
              const targetMargin = isWeekly ? weeklyData.contributionMargin : monthlyData.contributionMargin;
              const targetNet = isWeekly ? weeklyData.netProfit : monthlyData.netProfit;
              const targetReserves = isWeekly ? weeklyData.reserves.total : monthlyData.reserves.total;
              const targetCash = isWeekly ? (weeklyData.netProfit - weeklyData.reserves.total) : monthlyData.availableCashInPocket;
              const targetKm = isWeekly ? weeklyData.totalKm : monthlyData.totalKm;
              const targetHours = isWeekly ? weeklyData.totalHours : monthlyData.totalHours;
              const targetTrips = isWeekly ? weeklyData.totalTrips : monthlyData.totalTrips;
              const targetRateKm = isWeekly ? weeklyData.ratePerKmGross : monthlyData.ratePerKmGross;
              const targetRateHour = isWeekly ? weeklyData.hourlyRateGross : monthlyData.hourlyRateGross;
              const startDateStr = isWeekly
                ? weeklyData.range.startDate.toISOString().split('T')[0]
                : `${selectedYear}-${String(selectedMonthIndex + 1).padStart(2, '0')}-01`;
              const endDateStr = isWeekly
                ? weeklyData.range.endDate.toISOString().split('T')[0]
                : `${selectedYear}-${String(selectedMonthIndex + 1).padStart(2, '0')}-${String(monthlyData.daysInMonth).padStart(2, '0')}`;

              const alreadyClosed = accountingClosings.find(
                c => c.type === closingTypeSelected && c.startDate === startDateStr && c.endDate === endDateStr
              );

              return (
                <div className="space-y-4">
                  {alreadyClosed && (
                    <div className="bg-amber-500/10 border border-amber-500/30 p-3 rounded-2xl flex items-center justify-between gap-3 text-xs">
                      <div className="flex items-center gap-2 text-amber-300">
                        <Lock className="w-4 h-4 text-amber-400 shrink-0" />
                        <span>
                          <strong>Este período já está encerrado!</strong> Assinado em {new Date(alreadyClosed.closedAt).toLocaleDateString('pt-BR')} com hash <code className="font-mono bg-slate-900 px-1 py-0.5 rounded text-amber-200">{alreadyClosed.closingHash}</code>.
                        </span>
                      </div>
                      <button
                        onClick={() => {
                          reopenPeriodAccounting(alreadyClosed.id);
                          setClosureSuccessMessage(`Exercício reaberto com sucesso. Você pode recalcular e fechar novamente.`);
                          setTimeout(() => setClosureSuccessMessage(null), 4000);
                        }}
                        className="bg-amber-500/20 hover:bg-amber-500/30 text-amber-200 border border-amber-500/40 px-3 py-1.5 rounded-xl font-bold whitespace-nowrap active:scale-95 transition"
                      >
                        Reabrir Exercício
                      </button>
                    </div>
                  )}

                  {/* TABELA DE DEMONSTRAÇÃO PRÉ-ENCERRAMENTO */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div className="bg-slate-950/40 p-3 rounded-2xl border border-white/5">
                      <span className="text-[10px] text-slate-400 block font-bold uppercase">Faturamento Bruto</span>
                      <span className="text-base font-black text-emerald-400">{formatCurrency(targetGross)}</span>
                      <span className="text-[10px] text-slate-400 block mt-0.5">{targetTrips} viagens realizadas</span>
                    </div>

                    <div className="bg-slate-950/40 p-3 rounded-2xl border border-white/5">
                      <span className="text-[10px] text-slate-400 block font-bold uppercase">Custos & Combustível</span>
                      <span className="text-base font-black text-rose-400">{formatCurrency(targetTotalExp)}</span>
                      <span className="text-[10px] text-slate-400 block mt-0.5">Combustível: {formatCurrency(targetFuel)}</span>
                    </div>

                    <div className="bg-slate-950/40 p-3 rounded-2xl border border-white/5">
                      <span className="text-[10px] text-slate-400 block font-bold uppercase">Lucro Real Líquido</span>
                      <span className="text-base font-black text-white">{formatCurrency(targetNet)}</span>
                      <span className="text-[10px] text-slate-400 block mt-0.5">Margem: {safeDivide(targetNet, targetGross) * 100 > 0 ? (safeDivide(targetNet, targetGross) * 100).toFixed(1) : 0}%</span>
                    </div>

                    <div className="bg-slate-950/40 p-3 rounded-2xl border border-white/5">
                      <span className="text-[10px] text-slate-400 block font-bold uppercase">Caixa Livre no Bolso</span>
                      <span className="text-base font-black text-teal-300">{formatCurrency(targetCash)}</span>
                      <span className="text-[10px] text-slate-400 block mt-0.5">Reservas: {formatCurrency(targetReserves)}</span>
                    </div>
                  </div>

                  {/* LINHA DE MÉTRICAS OPERACIONAIS */}
                  <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-950/30 px-4 py-2.5 rounded-xl border border-white/5 text-xs text-slate-300">
                    <div>KM Rodados: <strong className="text-white">{formatKm(targetKm)}</strong></div>
                    <div>Horas Trabalhadas: <strong className="text-white">{formatHours(targetHours)}</strong></div>
                    <div>Rendimento por KM: <strong className="text-emerald-400">{formatCurrency(targetRateKm)}/km</strong></div>
                    <div>Rendimento por Hora: <strong className="text-emerald-400">{formatCurrency(targetRateHour)}/h</strong></div>
                  </div>

                  {/* BOTÃO DE CONFIRMAÇÃO DE FECHAMENTO */}
                  <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
                    <p className="text-[11px] text-slate-400">
                      Ao encerrar, o balanço é autenticado pela Fonte Única da Verdade e armazenado com carimbo de data e hora.
                    </p>

                    <button
                      onClick={() => {
                        const closing = closePeriodAccounting({
                          type: closingTypeSelected,
                          startDate: startDateStr,
                          endDate: endDateStr,
                          label: isWeekly ? `Semana ${weeklyData.range.label}` : `${monthNames[selectedMonthIndex]} de ${selectedYear}`,
                          grossEarnings: targetGross,
                          fuelExpenses: targetFuel,
                          otherExpenses: targetOtherExp,
                          fixedExpenses: targetFixedExp,
                          totalExpenses: targetTotalExp,
                          contributionMargin: targetMargin,
                          realNetProfit: targetNet,
                          reservesAllocated: targetReserves,
                          availableCashInPocket: targetCash,
                          kmDriven: targetKm,
                          hoursWorked: targetHours,
                          tripsCount: targetTrips,
                          ratePerKm: targetRateKm,
                          ratePerHour: targetRateHour,
                          fuelMethodUsed: profile.fuelCalculationMethod || 'hibrido',
                        });
                        setClosureSuccessMessage(`Exercício encerrado com sucesso! Hash: ${closing.closingHash}`);
                        setTimeout(() => setClosureSuccessMessage(null), 6000);
                      }}
                      className="w-full sm:w-auto bg-amber-500 hover:bg-amber-400 text-slate-950 font-black px-5 py-2.5 rounded-xl text-xs flex items-center justify-center gap-2 shadow-lg shadow-amber-500/20 active:scale-95 transition"
                    >
                      <Lock className="w-4 h-4 stroke-[2.5]" />
                      <span>{alreadyClosed ? 'Atualizar e Re-assinar Fechamento' : 'Encerrar e Assinar Exercício Contábil'}</span>
                    </button>
                  </div>
                </div>
              );
            })()}
          </div>

          {/* LISTA DE EXERCÍCIOS ENCERRADOS */}
          <div className="bg-white/5 backdrop-blur-lg border border-white/10 p-5 rounded-3xl space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-black text-white flex items-center gap-2">
                  <FileCheck2 className="w-4 h-4 text-emerald-400" />
                  HISTÓRICO DE EXERCÍCIOS ENCERRADOS & AUDITADOS
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Registros imutáveis com hashes de integridade para arquivo fiscal.
                </p>
              </div>

              <span className="text-xs font-bold text-slate-400">
                {accountingClosings.length} fechamento(s)
              </span>
            </div>

            {accountingClosings.length === 0 ? (
              <div className="text-center py-8 bg-slate-950/40 rounded-2xl border border-white/5 text-xs text-slate-400 space-y-1">
                <Lock className="w-6 h-6 text-slate-600 mx-auto mb-1" />
                <p className="font-bold text-slate-300">Nenhum exercício encerrado ainda.</p>
                <p>Selecione um período acima e clique em "Encerrar e Assinar Exercício Contábil".</p>
              </div>
            ) : (
              <div className="space-y-3">
                {accountingClosings.map(item => (
                  <div
                    key={item.id}
                    className="bg-slate-950/50 border border-white/10 p-4 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-4"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] bg-emerald-500/20 text-emerald-300 font-bold px-2 py-0.5 rounded-full border border-emerald-500/30">
                          {item.status === 'AUDITED_AND_CLOSED' ? 'AUDITADO & FECHADO' : 'ABERTO'}
                        </span>
                        <h4 className="text-sm font-black text-white">{item.label}</h4>
                      </div>

                      <div className="text-[11px] text-slate-400 flex flex-wrap items-center gap-x-3 gap-y-1">
                        <span>Período: <strong className="text-slate-200">{item.startDate} a {item.endDate}</strong></span>
                        <span>•</span>
                        <span>Encerrado em: <strong className="text-slate-200">{new Date(item.closedAt).toLocaleString('pt-BR')}</strong></span>
                        <span>•</span>
                        <span>Hash: <code className="font-mono text-teal-300 bg-teal-950/60 px-1.5 py-0.5 rounded border border-teal-500/30">{item.closingHash}</code></span>
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 text-xs">
                        <div>
                          <span className="text-[10px] text-slate-400 block">Bruto</span>
                          <strong className="text-emerald-400">{formatCurrency(item.grossEarnings)}</strong>
                        </div>
                        <div>
                          <span className="text-[10px] text-slate-400 block">Despesas</span>
                          <strong className="text-rose-400">{formatCurrency(item.totalExpenses)}</strong>
                        </div>
                        <div>
                          <span className="text-[10px] text-slate-400 block">Lucro Real</span>
                          <strong className="text-white">{formatCurrency(item.realNetProfit)}</strong>
                        </div>
                        <div>
                          <span className="text-[10px] text-slate-400 block">Caixa no Bolso</span>
                          <strong className="text-teal-300">{formatCurrency(item.availableCashInPocket)}</strong>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 self-end md:self-center">
                      <button
                        onClick={() => reopenPeriodAccounting(item.id)}
                        className="bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white px-3 py-2 rounded-xl text-xs font-bold border border-white/10 flex items-center gap-1 active:scale-95 transition"
                        title="Reabrir este período para edições"
                      >
                        <Unlock className="w-3.5 h-3.5 text-amber-400" />
                        <span>Reabrir</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* CENTRAL DE EXPORTAÇÃO FISCAL & CONTÁBIL (CSV EXCLUSIVO FASE E) */}
          <div className="bg-white/5 backdrop-blur-lg border border-white/10 p-5 rounded-3xl space-y-4">
            <div>
              <h3 className="text-sm font-black text-white flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-teal-400" />
                CENTRAL DE EXPORTAÇÃO FISCAL & LIVRO CAIXA
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Exporte demonstrativos contábeis completos em planilhas compatíveis com Excel, LibreOffice e contabilidade do MEI.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* EXTRATO DIÁRIO CONSOLIDADO */}
              <div className="bg-slate-950/40 p-4 rounded-2xl border border-white/5 space-y-3 flex flex-col justify-between">
                <div>
                  <div className="flex items-center gap-2 text-white font-bold text-xs mb-1">
                    <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
                    <span>Extrato Diário Consolidado (Fonte da Verdade)</span>
                  </div>
                  <p className="text-[11px] text-slate-400">
                    Contém todos os dias operacionais com faturamento, combustível auditado, despesas, lucro líquido, reservas, km, horas e rendimento por km e hora.
                  </p>
                </div>

                <button
                  onClick={() => exportAccountingStatementCSV('consolidated_daily')}
                  className="w-full bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black py-2.5 px-3 rounded-xl text-xs flex items-center justify-center gap-1.5 shadow active:scale-95 transition"
                >
                  <Download className="w-4 h-4 stroke-[2.5]" />
                  <span>Baixar Extrato Diário (CSV)</span>
                </button>
              </div>

              {/* LIVRO CAIXA POR CENTROS DE CUSTO */}
              <div className="bg-slate-950/40 p-4 rounded-2xl border border-white/5 space-y-3 flex flex-col justify-between">
                <div>
                  <div className="flex items-center gap-2 text-white font-bold text-xs mb-1">
                    <FileSpreadsheet className="w-4 h-4 text-teal-400" />
                    <span>Livro Caixa por Centros de Custo</span>
                  </div>
                  <p className="text-[11px] text-slate-400">
                    Discrimina entradas e saídas separadas por centro de custo: Custos Operacionais Diretos, Custos Fixos do Veículo e Movimentação no Posto.
                  </p>
                </div>

                <button
                  onClick={() => exportAccountingStatementCSV('general_ledger')}
                  className="w-full bg-gradient-to-r from-teal-500 to-emerald-400 hover:from-teal-400 hover:to-emerald-300 text-slate-950 font-black py-2.5 px-3 rounded-xl text-xs flex items-center justify-center gap-1.5 shadow active:scale-95 transition"
                >
                  <Download className="w-4 h-4 stroke-[2.5]" />
                  <span>Baixar Livro Caixa (CSV)</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL COMPLETO DE EMISSÃO DE PDF */}
      <PDFReportModal
        isOpen={showPDFModal}
        onClose={() => setShowPDFModal(false)}
        initialType={pdfModalInitialType}
      />

      {/* MODAL DE RECÁLCULO DE LANÇAMENTOS DO VEÍCULO */}
      <RecalculateRecordsModal
        isOpen={showRecalculateModal}
        onClose={() => setShowRecalculateModal(false)}
      />
    </div>
  );
};
