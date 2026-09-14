import React, { useState, useEffect, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { PromptItem } from '../types';
import { renderPrompt } from '../utils/promptUtils';
import {
  X,
  Copy,
  Check,
  Image as ImageIcon,
  Video,
  Pencil,
  FileText,
  Trash2,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';

interface PromptModalProps {
  prompt: PromptItem | null;
  onClose: () => void;
  onEdit?: (prompt: PromptItem) => void;
  onDelete?: (id: string) => void;
  onPrev?: () => void;
  onNext?: () => void;
  hasPrev?: boolean;
  hasNext?: boolean;
  currentIndex?: number;
  totalCount?: number;
}

export const PromptModal: React.FC<PromptModalProps> = ({
  prompt,
  onClose,
  onEdit,
  onDelete,
  onPrev,
  onNext,
  hasPrev = false,
  hasNext = false,
  currentIndex,
  totalCount,
}) => {
  const [values, setValues] = useState<Record<string, string>>({});
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState<'variables' | 'preview'>('variables');
  const [confirmDelete, setConfirmDelete] = useState(false);

  // Stripe flashlight border for the modal
  const modalContainerRef = useRef<HTMLDivElement>(null);
  const [flashlight, setFlashlight] = useState({ x: 0, y: 0, isHovering: false });
  const [hoverSide, setHoverSide] = useState<'left' | 'right' | null>(null);

  // Reset values when prompt changes
  useEffect(() => {
    if (prompt) {
      const initial: Record<string, string> = {};
      prompt.variables.forEach((v) => {
        initial[v.key] = v.defaultValue || '';
      });
      setValues(initial);
      setCopied(false);
      setConfirmDelete(false);
      setHoverSide(null);
    }
  }, [prompt]);

  // Handle ESC key and Arrow Left / Arrow Right keys
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      } else if (e.key === 'ArrowLeft') {
        const tag = document.activeElement?.tagName.toLowerCase();
        if (tag !== 'input' && tag !== 'textarea') {
          if (hasPrev && onPrev) onPrev();
        }
      } else if (e.key === 'ArrowRight') {
        const tag = document.activeElement?.tagName.toLowerCase();
        if (tag !== 'input' && tag !== 'textarea') {
          if (hasNext && onNext) onNext();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose, onPrev, onNext, hasPrev, hasNext]);

  const handleMouseMoveModal = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!modalContainerRef.current) return;
    const rect = modalContainerRef.current.getBoundingClientRect();
    setFlashlight({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
      isHovering: true,
    });

    const clickX = e.clientX - rect.left;
    const isRightHalf = clickX >= rect.width / 2;

    if (isRightHalf) {
      if (hasNext) {
        setHoverSide('right');
      } else {
        setHoverSide(null);
      }
    } else {
      if (hasPrev) {
        setHoverSide('left');
      } else {
        setHoverSide(null);
      }
    }
  };

  const handleMouseLeaveModal = () => {
    setFlashlight((prev) => ({ ...prev, isHovering: false }));
    setHoverSide(null);
  };

  // Click on left/right area of the card navigates between sequence cards
  const handleCardClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const target = e.target as HTMLElement;
    // Do not trigger card navigation if clicking interactive controls
    if (
      target.closest(
        'button, input, textarea, a, select, [role="button"], label, .prevent-nav'
      )
    ) {
      return;
    }
    if (!modalContainerRef.current) return;
    const rect = modalContainerRef.current.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const isRightHalf = clickX >= rect.width / 2;

    if (isRightHalf) {
      if (hasNext && onNext) onNext();
    } else {
      if (hasPrev && onPrev) onPrev();
    }
  };

  // Compute final compiled prompt
  const finalPrompt = useMemo(() => {
    if (!prompt) return '';
    return renderPrompt(prompt.template, values);
  }, [prompt, values]);

  const handleInputChange = (key: string, val: string) => {
    setValues((prev) => ({ ...prev, [key]: val }));
    if (copied) setCopied(false);
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(finalPrompt);
      setCopied(true);
      setTimeout(() => setCopied(false), 2400);
    } catch {
      const el = document.createElement('textarea');
      el.value = finalPrompt;
      document.body.appendChild(el);
      el.select();
      document.execCommand('copy');
      document.body.removeChild(el);
      setCopied(true);
      setTimeout(() => setCopied(false), 2400);
    }
  };

  return (
    <AnimatePresence>
      {prompt && (
        <div
          id="prompt-modal-overlay"
          className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 lg:p-12 bg-black/80 backdrop-blur-md"
          onClick={(e) => {
            if (e.target === e.currentTarget) onClose();
          }}
        >
          {/* Wrapper relativo para que as setas sem contorno fiquem posicionadas fora da caixa do prompt */}
          <div className="relative w-full max-w-4xl flex items-center justify-center">
            {/* Seta esquerda FORA da caixa do prompt - apenas o símbolo, sem contorno, bem discreta e pequena */}
            {hasPrev && (
              <button
                type="button"
                id="btn-nav-prev-outside"
                onClick={(e) => {
                  e.stopPropagation();
                  if (onPrev) onPrev();
                }}
                onMouseEnter={() => setHoverSide('left')}
                onMouseLeave={() => setHoverSide(null)}
                className={`absolute -left-6 sm:-left-8 lg:-left-9 top-1/2 -translate-y-1/2 z-50 p-1 text-zinc-500 hover:text-white transition-all duration-200 cursor-pointer bg-transparent border-none outline-none focus:outline-none flex items-center justify-center ${
                  hoverSide === 'left'
                    ? 'opacity-100 scale-100 pointer-events-auto'
                    : 'opacity-0 scale-90 pointer-events-none'
                }`}
                title="Prompt anterior (área esquerda ou seta ←)"
              >
                <ChevronLeft className="w-4 h-4 sm:w-5 sm:h-5 stroke-[2.2]" />
              </button>
            )}

            {/* Seta direita FORA da caixa do prompt - apenas o símbolo, sem contorno, bem discreta e pequena */}
            {hasNext && (
              <button
                type="button"
                id="btn-nav-next-outside"
                onClick={(e) => {
                  e.stopPropagation();
                  if (onNext) onNext();
                }}
                onMouseEnter={() => setHoverSide('right')}
                onMouseLeave={() => setHoverSide(null)}
                className={`absolute -right-6 sm:-right-8 lg:-right-9 top-1/2 -translate-y-1/2 z-50 p-1 text-zinc-500 hover:text-white transition-all duration-200 cursor-pointer bg-transparent border-none outline-none focus:outline-none flex items-center justify-center ${
                  hoverSide === 'right'
                    ? 'opacity-100 scale-100 pointer-events-auto'
                    : 'opacity-0 scale-90 pointer-events-none'
                }`}
                title="Próximo prompt (área direita ou seta →)"
              >
                <ChevronRight className="w-4 h-4 sm:w-5 sm:h-5 stroke-[2.2]" />
              </button>
            )}

            <motion.div
              ref={modalContainerRef}
              id="prompt-modal-container"
              onClick={handleCardClick}
              onMouseMove={handleMouseMoveModal}
              onMouseLeave={handleMouseLeaveModal}
              initial={{ opacity: 0, scale: 0.96, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 10 }}
              transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
              className="relative w-full max-h-[90vh] flex flex-col bg-[#121214] border border-[#222226] rounded-2xl shadow-[0_25px_60px_-15px_rgba(0,0,0,0.9)] overflow-hidden text-zinc-100"
            >
              {/* Flashlight Border Effect on Modal */}
              <div
                className="flashlight-layer absolute inset-0 rounded-2xl p-[1px] pointer-events-none z-40"
                style={{
                  opacity: flashlight.isHovering ? 1 : 0,
                  background: flashlight.isHovering
                    ? `radial-gradient(380px circle at ${flashlight.x}px ${flashlight.y}px, rgba(255, 255, 255, 0.85), rgba(255, 255, 255, 0.25) 35%, rgba(255, 255, 255, 0.05) 55%, transparent 75%)`
                    : 'none',
                  WebkitMask:
                    'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)',
                  WebkitMaskComposite: 'xor',
                  maskComposite: 'exclude',
                }}
              />

              {/* Ambient Flashlight Glow inside */}
              <div
                className="flashlight-layer absolute inset-0 pointer-events-none rounded-2xl z-0"
                style={{
                  opacity: flashlight.isHovering ? 1 : 0,
                  background: flashlight.isHovering
                    ? `radial-gradient(420px circle at ${flashlight.x}px ${flashlight.y}px, rgba(255, 255, 255, 0.04), transparent 70%)`
                    : 'none',
                }}
              />

              {/* Modal Header */}
              <div className="flex items-center justify-between px-5 py-3.5 border-b border-[#1e1e22] bg-[#151518] relative z-10">
                <div className="flex items-center gap-3">
                  <span
                    id="modal-media-badge"
                    className={`px-2.5 py-1 text-[11px] font-medium rounded-md flex items-center gap-1.5 shadow-sm transition-colors ${
                      prompt.mediaType === 'video'
                        ? 'bg-[#0f172a]/70 text-blue-400 border border-blue-500/50'
                        : 'bg-[#1d1d22] text-white border border-[#2c2c33]'
                    }`}
                  >
                    {prompt.mediaType === 'video' ? (
                      <Video className="w-3 h-3 text-blue-400" />
                    ) : (
                      <ImageIcon className="w-3 h-3 text-white" />
                    )}
                    {prompt.mediaLabel}
                  </span>

                {totalCount !== undefined && currentIndex !== undefined && totalCount > 1 && (
                  <span
                    id="modal-prompt-index"
                    className="text-[11px] text-zinc-400 font-mono px-2 py-0.5 rounded bg-[#18181c] border border-[#26262c]"
                    title="Posição na sequência (use as laterais ou setas do teclado para navegar)"
                  >
                    {currentIndex + 1} de {totalCount}
                  </span>
                )}
              </div>

              <div className="flex items-center gap-1.5">
                {onDelete && (
                  <>
                    {!confirmDelete ? (
                      <button
                        id="btn-delete-from-modal"
                        onClick={() => setConfirmDelete(true)}
                        className="p-1.5 px-2 rounded-lg text-zinc-400 hover:text-red-400 hover:bg-red-500/10 transition-colors flex items-center gap-1.5 text-xs font-medium cursor-pointer"
                        title="Excluir prompt"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span className="hidden sm:inline">Excluir</span>
                      </button>
                    ) : (
                      <div className="flex items-center gap-1.5 bg-[#18181c] px-2 py-1 rounded-lg border border-red-500/30">
                        <span className="text-[11px] text-red-400 font-medium">Excluir?</span>
                        <button
                          id="btn-confirm-delete-from-modal"
                          onClick={() => {
                            onDelete(prompt.id);
                            onClose();
                          }}
                          className="px-2 py-0.5 text-[11px] bg-red-600 hover:bg-red-500 text-white font-medium rounded transition-colors cursor-pointer"
                        >
                          Sim
                        </button>
                        <button
                          onClick={() => setConfirmDelete(false)}
                          className="px-1.5 py-0.5 text-[11px] text-zinc-400 hover:text-white transition-colors cursor-pointer"
                        >
                          Não
                        </button>
                      </div>
                    )}
                  </>
                )}

                {onEdit && (
                  <button
                    id="btn-edit-from-modal"
                    onClick={() => {
                      onClose();
                      onEdit(prompt);
                    }}
                    className="p-1.5 px-2.5 rounded-lg text-zinc-400 hover:text-white hover:bg-[#202024] transition-colors flex items-center gap-1.5 text-xs font-medium cursor-pointer"
                    title="Editar prompt"
                  >
                    <Pencil className="w-3.5 h-3.5 text-white" />
                    <span className="hidden sm:inline">Editar</span>
                  </button>
                )}

                <button
                  id="btn-close-modal"
                  onClick={onClose}
                  className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-[#202024] transition-colors cursor-pointer"
                  title="Fechar (Esc)"
                >
                  <X className="w-4 h-4 text-white" />
                </button>
              </div>
            </div>

            {/* Mobile Tab switcher (Variables & Obs vs Preview) */}
            <div className="lg:hidden flex border-b border-[#1e1e22] bg-[#0e0e10] relative z-10">
              <button
                id="tab-btn-variables"
                onClick={() => setActiveTab('variables')}
                className={`flex-1 py-2.5 text-xs font-medium border-b-2 transition-colors cursor-pointer ${
                  activeTab === 'variables'
                    ? 'border-white text-white bg-[#141417]'
                    : 'border-transparent text-zinc-400 hover:text-zinc-200'
                }`}
              >
                {prompt.variables.length > 0
                  ? `Variáveis (${prompt.variables.length}) & Obs`
                  : 'Observações'}
              </button>
              <button
                id="tab-btn-preview"
                onClick={() => setActiveTab('preview')}
                className={`flex-1 py-2.5 text-xs font-medium border-b-2 transition-colors cursor-pointer ${
                  activeTab === 'preview'
                    ? 'border-white text-white bg-[#141417]'
                    : 'border-transparent text-zinc-400 hover:text-zinc-200'
                }`}
              >
                Prompt Final
              </button>
            </div>

            {/* Modal Body */}
            <div className="flex-1 overflow-y-auto grid grid-cols-1 lg:grid-cols-12 divide-y lg:divide-y-0 lg:divide-x divide-[#1e1e22] relative z-10">
              {/* Column 1: Variables & Caixa de Observações (Lado esquerdo) */}
              <div
                className={`lg:col-span-6 p-5 sm:p-6 flex flex-col justify-between gap-6 overflow-y-auto ${
                  activeTab === 'preview' ? 'hidden lg:flex' : 'flex'
                }`}
              >
                {/* Parte superior: Imagem (se houver) + Lista de Variáveis */}
                <div className="flex flex-col gap-4">
                  {/* Imagem do Prompt no lado esquerdo acima do campo de variáveis */}
                  {prompt.imageUrl && (
                    <div className="relative overflow-hidden rounded-xl border border-[#23232a] bg-[#08080a] shadow-md shrink-0">
                      <img
                        src={prompt.imageUrl}
                        alt={prompt.title}
                        referrerPolicy="no-referrer"
                        className="w-full max-h-56 object-cover rounded-lg"
                        onError={(e) => {
                          (e.target as HTMLElement).style.display = 'none';
                        }}
                      />
                    </div>
                  )}

                  {prompt.variables.length > 0 ? (
                    <>
                      <div className="flex items-center justify-between pb-1 border-b border-[#1a1a1e]">
                        <span className="text-xs font-semibold text-zinc-300">Variáveis</span>
                        <span className="text-[11px] font-mono text-zinc-500">
                          {prompt.variables.length} {prompt.variables.length === 1 ? 'campo' : 'campos'}
                        </span>
                      </div>

                      {prompt.variables.map((variable) => {
                        return (
                          <div
                            key={variable.key}
                            id={`field-container-${variable.key}`}
                            className="flex flex-col gap-1.5"
                          >
                            <div className="flex items-center justify-between">
                              <label
                                htmlFor={`input-${variable.key}`}
                                className="text-xs font-medium text-zinc-300"
                              >
                                {variable.label}
                              </label>
                              <span className="text-[11px] font-mono text-zinc-500">
                                [{variable.key}]
                              </span>
                            </div>

                            {variable.multiline ? (
                              <textarea
                                id={`input-${variable.key}`}
                                rows={3}
                                value={values[variable.key] || ''}
                                onChange={(e) => handleInputChange(variable.key, e.target.value)}
                                placeholder=""
                                className="w-full px-3 py-2 text-xs sm:text-sm bg-[#09090b] text-white border border-[#232328] rounded-xl focus:outline-none focus:border-zinc-400 font-sans transition-all resize-y"
                              />
                            ) : (
                              <input
                                type="text"
                                id={`input-${variable.key}`}
                                value={values[variable.key] || ''}
                                onChange={(e) => handleInputChange(variable.key, e.target.value)}
                                placeholder=""
                                className="w-full px-3 py-2 text-xs sm:text-sm bg-[#09090b] text-white border border-[#232328] rounded-xl focus:outline-none focus:border-zinc-400 font-sans transition-all"
                              />
                            )}
                          </div>
                        );
                      })}
                    </>
                  ) : (
                    <div className="flex flex-col gap-1.5 py-1">
                      <span className="text-xs font-semibold text-zinc-400">Variáveis</span>
                      <p className="text-xs text-zinc-500">Este prompt não possui variáveis dinâmicas.</p>
                    </div>
                  )}
                </div>

                {/* Parte de baixo da esquerda: Caixa de Obs */}
                <div
                  id="prompt-obs-box"
                  className="mt-auto pt-4 flex flex-col gap-2 border-t border-[#1e1e24]"
                >
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-zinc-300">
                    <FileText className="w-3.5 h-3.5 text-zinc-400" />
                    <span>Observações</span>
                  </div>

                  {prompt.notes && prompt.notes.trim().length > 0 ? (
                    <div
                      id="modal-obs-content"
                      className="p-3.5 rounded-xl bg-[#0a0a0c] border border-[#222227] text-xs sm:text-sm text-zinc-200 leading-relaxed whitespace-pre-wrap select-text max-h-44 overflow-y-auto font-sans"
                    >
                      {prompt.notes}
                    </div>
                  ) : (
                    <div
                      id="modal-obs-empty"
                      className="p-3 rounded-xl bg-[#0a0a0c]/60 border border-[#1e1e23] text-xs text-zinc-500 italic"
                    >
                      Nenhuma observação definida.
                    </div>
                  )}
                </div>
              </div>

              {/* Column 2: Prompt Preview & Copy Button (Lado direito com botão Copiar sempre visível) */}
              <div
                className={`lg:col-span-6 p-5 sm:p-6 flex flex-col justify-between bg-[#0e0e10] h-full ${
                  activeTab === 'variables' ? 'hidden lg:flex' : 'flex'
                }`}
              >
                <div className="flex flex-col gap-3 min-h-0 flex-1">
                  {/* Nome do prompt acima do prompt do lado direito */}
                  <div className="flex items-center justify-between pb-1 border-b border-[#1a1a1e] shrink-0">
                    <h2
                      id="modal-prompt-title"
                      className="text-sm sm:text-base font-semibold text-white tracking-tight"
                    >
                      {prompt.title}
                    </h2>
                  </div>

                  {/* Texto do Prompt com rolagem própria para nunca empurrar o botão de copiar */}
                  <div
                    id="compiled-prompt-preview"
                    className="relative p-4 rounded-xl bg-[#08080a] border border-[#1d1d21] font-mono text-xs sm:text-sm text-zinc-200 leading-relaxed whitespace-pre-wrap select-text overflow-y-auto flex-1 max-h-[360px] sm:max-h-[440px]"
                  >
                    {finalPrompt}
                  </div>
                </div>

                {/* Bottom Actions: Metallic Copy Button (Sempre visível no lado direito) */}
                <div className="pt-4 mt-auto shrink-0">
                  <button
                    id="btn-copy-prompt"
                    onClick={handleCopy}
                    className={`relative overflow-hidden w-full flex items-center justify-center py-3.5 px-5 rounded-xl text-xs sm:text-sm font-semibold transition-all duration-300 active:scale-[0.98] cursor-pointer group ${
                      copied
                        ? 'bg-gradient-to-b from-[#34d399] via-[#10b981] to-[#059669] border border-[#6ee7b7]/80 shadow-[0_0_30px_rgba(16,185,129,0.5),inset_0_1px_1px_rgba(255,255,255,0.7)]'
                        : 'bg-gradient-to-b from-[#ffffff] via-[#e2e5e9] to-[#b8bdc5] border border-white/90 shadow-[0_4px_18px_rgba(0,0,0,0.6),inset_0_1px_1px_rgba(255,255,255,0.95)] hover:shadow-[0_6px_22px_rgba(255,255,255,0.18)]'
                    }`}
                  >
                    <span className="metallic-shine-layer" />
                    <span className="absolute inset-x-0 top-0 h-[1px] bg-gradient-to-r from-transparent via-white to-transparent opacity-80" />

                    {copied ? (
                      <div className="flex items-center justify-center py-0.5">
                        <Check className="w-6 h-6 text-white stroke-[3.5] animate-check-pop drop-shadow-[0_1px_3px_rgba(0,0,0,0.5)]" />
                      </div>
                    ) : (
                      <div className="flex items-center justify-center gap-2 text-[#101013] font-bold tracking-tight">
                        <Copy className="w-4 h-4 text-[#101013] stroke-[2.2]" />
                        <span>Copiar Prompt</span>
                      </div>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    )}
  </AnimatePresence>
  );
};
