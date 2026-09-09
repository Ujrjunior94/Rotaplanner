import React, { useState } from 'react';
import { useDriver } from '../context/DriverContext';
import { DashboardCardConfig, DashboardCardId } from '../types';
import {
  GripVertical,
  Eye,
  EyeOff,
  ArrowUp,
  ArrowDown,
  RotateCcw,
  CheckCircle2,
  Sliders,
  Sparkles,
  LayoutGrid,
} from 'lucide-react';

interface DashboardCardsCustomizerProps {
  compact?: boolean;
}

export const DashboardCardsCustomizer: React.FC<DashboardCardsCustomizerProps> = ({
  compact = false,
}) => {
  const {
    dashboardCards,
    updateDashboardCards,
    toggleDashboardCard,
    reorderDashboardCards,
    resetDashboardCards,
  } = useDriver();

  const [draggedIdx, setDraggedIdx] = useState<number | null>(null);
  const [dragOverIdx, setDragOverIdx] = useState<number | null>(null);
  const [feedbackMsg, setFeedbackMsg] = useState<string | null>(null);

  const showFeedback = (msg: string) => {
    setFeedbackMsg(msg);
    setTimeout(() => setFeedbackMsg(null), 2500);
  };

  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDraggedIdx(index);
    e.dataTransfer.effectAllowed = 'move';
    // Adiciona dado para drag
    e.dataTransfer.setData('text/plain', String(index));
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (dragOverIdx !== index) {
      setDragOverIdx(index);
    }
  };

  const handleDrop = (e: React.DragEvent, dropIndex: number) => {
    e.preventDefault();
    if (draggedIdx === null || draggedIdx === dropIndex) {
      setDraggedIdx(null);
      setDragOverIdx(null);
      return;
    }

    reorderDashboardCards(draggedIdx, dropIndex);
    setDraggedIdx(null);
    setDragOverIdx(null);
    showFeedback('Ordem dos cards atualizada com sucesso!');
  };

  const handleDragEnd = () => {
    setDraggedIdx(null);
    setDragOverIdx(null);
  };

  const handleMoveUp = (index: number) => {
    if (index > 0) {
      reorderDashboardCards(index, index - 1);
      showFeedback('Card movido para cima');
    }
  };

  const handleMoveDown = (index: number) => {
    if (index < dashboardCards.length - 1) {
      reorderDashboardCards(index, index + 1);
      showFeedback('Card movido para baixo');
    }
  };

  const handleToggle = (id: DashboardCardId) => {
    toggleDashboardCard(id);
    const card = dashboardCards.find(c => c.id === id);
    if (card) {
      showFeedback(card.visible ? `"${card.title}" ocultado do painel` : `"${card.title}" visível no painel`);
    }
  };

  const handleShowAll = () => {
    updateDashboardCards(dashboardCards.map(c => ({ ...c, visible: true })));
    showFeedback('Todos os cards foram ativados');
  };

  const handleReset = () => {
    if (confirm('Deseja restaurar a ordem e visibilidade padrão de todos os cards?')) {
      resetDashboardCards();
      showFeedback('Cards restaurados para a ordem padrão!');
    }
  };

  const visibleCount = dashboardCards.filter(c => c.visible).length;

  const getCategoryBadge = (cat?: string) => {
    switch (cat) {
      case 'financial':
        return <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">Financeiro</span>;
      case 'goals':
        return <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-teal-500/20 text-teal-300 border border-teal-500/30">Metas</span>;
      case 'vehicle':
        return <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">Veículo</span>;
      case 'insights':
        return <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-sky-500/20 text-sky-300 border border-sky-500/30">Inteligência</span>;
      case 'history':
        return <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-300 border border-purple-500/30">Histórico</span>;
      default:
        return null;
    }
  };

  return (
    <div className="space-y-4">
      {/* CABEÇALHO & CONTROLES DE TOPO */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-white/10">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-xs sm:text-sm font-black text-white uppercase tracking-wider flex items-center gap-2">
              <Sliders className="w-4 h-4 text-emerald-400" />
              PERSONALIZAÇÃO DE CARDS DO DASHBOARD
            </h3>
            <span className="text-[10px] font-bold bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded-full border border-emerald-500/30">
              {visibleCount} de {dashboardCards.length} visíveis
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Arraste e solte para reordenar a posição ou use o botão para ocultar/exibir qualquer card no seu painel.
          </p>
        </div>

        {/* BOTOES DE AÇÃO EM MASSA */}
        <div className="flex items-center gap-2 self-start sm:self-auto shrink-0">
          <button
            type="button"
            onClick={handleShowAll}
            className="bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white px-2.5 py-1.5 rounded-lg text-xs font-bold border border-white/10 transition"
          >
            Exibir Todos
          </button>
          <button
            type="button"
            onClick={handleReset}
            className="bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white px-2.5 py-1.5 rounded-lg text-xs font-bold border border-white/10 transition flex items-center gap-1.5"
            title="Restaurar posições originais"
          >
            <RotateCcw className="w-3.5 h-3.5" /> Restaurar Padrão
          </button>
        </div>
      </div>

      {/* FEEDBACK TOAST */}
      {feedbackMsg && (
        <div className="p-2.5 bg-emerald-500/20 border border-emerald-500/40 rounded-xl text-xs font-bold text-emerald-300 flex items-center gap-2 animate-in fade-in duration-200">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{feedbackMsg}</span>
        </div>
      )}

      {/* DICA DE USO */}
      <div className="bg-black/30 p-3 rounded-xl border border-white/5 flex items-center justify-between text-xs text-slate-400">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-amber-400 shrink-0" />
          <span>
            <strong>Dica:</strong> Em computadores, arraste segurando pelo ícone <GripVertical className="w-3.5 h-3.5 inline text-slate-400" />. No celular, use as setas <strong>▲</strong> e <strong>▼</strong> para mover.
          </span>
        </div>
      </div>

      {/* LISTA DE CARDS ORDENÁVEIS E COM TOGGLE */}
      <div className="space-y-2">
        {dashboardCards.map((card, index) => {
          const isDragging = draggedIdx === index;
          const isOver = dragOverIdx === index;

          return (
            <div
              key={card.id}
              draggable
              onDragStart={e => handleDragStart(e, index)}
              onDragOver={e => handleDragOver(e, index)}
              onDrop={e => handleDrop(e, index)}
              onDragEnd={handleDragEnd}
              className={`flex items-center justify-between p-3 sm:p-3.5 rounded-xl border transition-all duration-200 ${
                isDragging
                  ? 'opacity-40 border-dashed border-emerald-400 bg-emerald-500/10 scale-[0.98]'
                  : isOver
                  ? 'border-emerald-400 bg-emerald-500/15 shadow-lg shadow-emerald-500/20 scale-[1.01]'
                  : card.visible
                  ? 'bg-white/5 border-white/10 hover:border-white/20'
                  : 'bg-black/40 border-white/5 opacity-60'
              }`}
            >
              {/* LADO ESQUERDO: HANDLE + NÚMERO + TÍTULO */}
              <div className="flex items-center gap-2.5 sm:gap-3 flex-1 min-w-0 pr-2">
                {/* DRAG HANDLE */}
                <div
                  className="cursor-grab active:cursor-grabbing text-slate-500 hover:text-slate-200 p-1 -ml-1 rounded transition hover:bg-white/10"
                  title="Segure e arraste para reordenar"
                >
                  <GripVertical className="w-4 h-4" />
                </div>

                {/* POSIÇÃO NUMÉRICA */}
                <div className="w-6 h-6 rounded-lg bg-black/40 border border-white/10 flex items-center justify-center text-[10px] font-black text-slate-400 shrink-0 font-mono">
                  {index + 1}
                </div>

                {/* TEXTO DO CARD */}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`text-xs sm:text-sm font-bold truncate ${card.visible ? 'text-white' : 'text-slate-400 line-through'}`}>
                      {card.title}
                    </span>
                    {getCategoryBadge(card.category)}
                  </div>
                  <p className="text-[11px] text-slate-400 truncate mt-0.5">
                    {card.description}
                  </p>
                </div>
              </div>

              {/* LADO DIREITO: BOTÕES DE MOVIMENTO + TOGGLE SWITCH */}
              <div className="flex items-center gap-2 shrink-0">
                {/* BOTÕES DE MOVER UP / DOWN (EXCELENTE PARA MOBILE) */}
                <div className="flex items-center bg-black/40 rounded-lg p-0.5 border border-white/10">
                  <button
                    type="button"
                    disabled={index === 0}
                    onClick={() => handleMoveUp(index)}
                    className="p-1.5 text-slate-400 hover:text-white disabled:opacity-20 disabled:hover:text-slate-400 rounded transition"
                    title="Mover para cima"
                  >
                    <ArrowUp className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    disabled={index === dashboardCards.length - 1}
                    onClick={() => handleMoveDown(index)}
                    className="p-1.5 text-slate-400 hover:text-white disabled:opacity-20 disabled:hover:text-slate-400 rounded transition"
                    title="Mover para baixo"
                  >
                    <ArrowDown className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* TOGGLE SWITCH (VISÍVEL / OCULTO) */}
                <button
                  type="button"
                  onClick={() => handleToggle(card.id)}
                  className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-bold transition border ${
                    card.visible
                      ? 'bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border-emerald-500/40'
                      : 'bg-white/5 hover:bg-white/10 text-slate-400 border-white/10'
                  }`}
                  title={card.visible ? 'Clique para ocultar este card' : 'Clique para exibir este card'}
                >
                  {card.visible ? (
                    <>
                      <Eye className="w-3.5 h-3.5 text-emerald-400" />
                      <span className="hidden sm:inline">Visível</span>
                    </>
                  ) : (
                    <>
                      <EyeOff className="w-3.5 h-3.5 text-slate-500" />
                      <span className="hidden sm:inline">Oculto</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* SUMÁRIO RODAPÉ */}
      <div className="pt-2 text-right">
        <span className="text-[11px] text-slate-400">
          Alterações são salvas instantaneamente e sincronizadas com a aba Dashboard.
        </span>
      </div>
    </div>
  );
};
