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
} from 'lucide-react';
import { PlatformType } from '../types';

export const ReportsView: React.FC = () => {
  const {
    sessions,
    earnings,
    expenses,
    fuelRecords,
    exportDataCSV,
    exportDataJSON,
  } = useDriver();

  const [periodFilter, setPeriodFilter] = useState<'month' | 'week' | 'all'>('month');

  // Breakdown por plataforma
  const platformStats = useMemo(() => calcPlatformBreakdown(earnings), [earnings]);

  // Comparativo mensal
  const monthlyComp = useMemo(() => calcMonthlyComparison(sessions, expenses), [sessions, expenses]);

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
  const totalKmAll = sessions.reduce((acc, s) => {
    if (s.endOdometer && s.startOdometer) return acc + (s.endOdometer - s.startOdometer);
    return acc;
  }, 0);

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      {/* HEADER E AÇÕES DE EXPORTAÇÃO */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white/5 backdrop-blur-lg border border-white/10 p-5 rounded-2xl">
        <div>
          <h2 className="text-base sm:text-lg font-black text-white tracking-tight flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-emerald-400" />
            RELATÓRIOS FINANCEIROS & COMPARATIVOS
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Análises aprofundadas por período, aplicativos e categorias de despesas.
          </p>
        </div>

        {/* BOTÕES DE EXPORTAÇÃO */}
        <div className="flex items-center gap-2 self-start sm:self-auto">
          <button
            onClick={exportDataCSV}
            className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black px-3.5 py-2 rounded-xl text-xs flex items-center gap-1.5 shadow-lg shadow-emerald-500/20 active:scale-95 transition"
            title="Exportar para Planilha Excel (CSV)"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>Excel / CSV</span>
          </button>

          <button
            onClick={exportDataJSON}
            className="bg-white/10 hover:bg-white/15 text-slate-200 font-bold px-3.5 py-2 rounded-xl text-xs border border-white/10 flex items-center gap-1.5 active:scale-95 transition"
            title="Backup completo em JSON"
          >
            <FileCode className="w-4 h-4" />
            <span>JSON</span>
          </button>

          <button
            onClick={handlePrint}
            className="bg-white/10 hover:bg-white/15 text-slate-200 font-bold px-3 py-2 rounded-xl text-xs border border-white/10 flex items-center gap-1 active:scale-95 transition"
            title="Imprimir Relatório"
          >
            <Printer className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* COMPARATIVO MÊS ATUAL VS MÊS ANTERIOR (SECTION 19) */}
      <div className="bg-white/5 backdrop-blur-lg border border-white/10 p-5 sm:p-6 rounded-2xl space-y-4">
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
      <div className="bg-white/5 backdrop-blur-lg border border-white/10 p-5 sm:p-6 rounded-2xl space-y-4">
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
      <div className="bg-white/5 backdrop-blur-lg border border-white/10 p-5 sm:p-6 rounded-2xl space-y-4">
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
  );
};
