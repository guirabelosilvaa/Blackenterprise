import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { PromptItem, PromptVariable } from '../types';
import { extractVariablesFromTemplate, formatVariableLabel } from '../utils/promptUtils';
import { X, Plus, Check, Image as ImageIcon, Trash2, FileText, Layers } from 'lucide-react';

interface NewPromptModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (prompt: PromptItem) => void;
  onDelete?: (id: string) => void;
  editingPrompt?: PromptItem | null;
  savedWorkflows?: string[];
  onAddWorkflow?: (name: string) => void;
  onDeleteWorkflow?: (name: string) => void;
}

interface DefinedVariable {
  key: string;
  label: string;
}

export const NewPromptModal: React.FC<NewPromptModalProps> = ({
  isOpen,
  onClose,
  onSave,
  onDelete,
  editingPrompt,
  savedWorkflows = [],
  onAddWorkflow,
  onDeleteWorkflow,
}) => {
  const [title, setTitle] = useState('');
  const [mediaType, setMediaType] = useState<'imagem' | 'video'>('imagem');
  const [selectedWorkflows, setSelectedWorkflows] = useState<string[]>([]);
  const [workflowSteps, setWorkflowSteps] = useState<Record<string, number | ''>>({});
  const [defaultWorkflowStep, setDefaultWorkflowStep] = useState<number | ''>(1);
  const [newWorkflowInput, setNewWorkflowInput] = useState('');
  const [varList, setVarList] = useState<DefinedVariable[]>([]);
  const [varLabelInput, setVarLabelInput] = useState('');
  const [varKeyInput, setVarKeyInput] = useState('');
  const [promptTemplate, setPromptTemplate] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [notes, setNotes] = useState('');
  const [cursorPos, setCursorPos] = useState<number | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);

  // Animated checkmark states
  const [varAddedCheck, setVarAddedCheck] = useState(false);
  const [saveCheck, setSaveCheck] = useState(false);

  // Flashlight border on modal
  const modalContainerRef = useRef<HTMLDivElement>(null);
  const [flashlight, setFlashlight] = useState({ x: 0, y: 0, isHovering: false });

  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (!isOpen) return;

    if (editingPrompt) {
      setTitle(editingPrompt.title);
      setMediaType(editingPrompt.mediaType || 'imagem');
      const wfs =
        editingPrompt.workflows && editingPrompt.workflows.length > 0
          ? editingPrompt.workflows
          : editingPrompt.workflow
          ? [editingPrompt.workflow]
          : [];
      setSelectedWorkflows(wfs);
      const steps: Record<string, number | ''> = { ...(editingPrompt.workflowSteps || {}) };
      if (
        editingPrompt.workflow &&
        editingPrompt.workflowOrder !== undefined &&
        steps[editingPrompt.workflow] === undefined
      ) {
        steps[editingPrompt.workflow] = editingPrompt.workflowOrder;
      }
      setWorkflowSteps(steps);
      setDefaultWorkflowStep(editingPrompt.workflowOrder !== undefined ? editingPrompt.workflowOrder : 1);
      setPromptTemplate(editingPrompt.template);
      setImageUrl(editingPrompt.imageUrl || '');
      setNotes(editingPrompt.notes || '');
      setVarList(
        editingPrompt.variables.map((v) => ({
          key: v.key,
          label: v.label || formatVariableLabel(v.key),
        }))
      );
      setVarLabelInput('');
      setVarKeyInput('');
      setCursorPos(editingPrompt.template.length);
    } else {
      setTitle('');
      setMediaType('imagem');
      setSelectedWorkflows([]);
      setWorkflowSteps({});
      setDefaultWorkflowStep(1);
      setPromptTemplate('');
      setImageUrl('');
      setNotes('');
      setVarList([]);
      setVarLabelInput('');
      setVarKeyInput('');
      setCursorPos(null);
    }
    setNewWorkflowInput('');
    setConfirmDelete(false);
    setVarAddedCheck(false);
    setSaveCheck(false);
  }, [isOpen, editingPrompt]);

  const handleAddWorkflowDirect = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const trimmed = newWorkflowInput.trim();
    if (!trimmed) return;

    if (onAddWorkflow && !savedWorkflows.includes(trimmed)) {
      onAddWorkflow(trimmed);
    }
    if (!selectedWorkflows.includes(trimmed)) {
      setSelectedWorkflows((prev) => [...prev, trimmed]);
      setWorkflowSteps((prev) => ({
        ...prev,
        [trimmed]: defaultWorkflowStep !== '' ? defaultWorkflowStep : 1,
      }));
    }
    setNewWorkflowInput('');
  };

  const handleMouseMoveModal = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!modalContainerRef.current) return;
    const rect = modalContainerRef.current.getBoundingClientRect();
    setFlashlight({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
      isHovering: true,
    });
  };

  const updateCursorPosition = () => {
    if (textareaRef.current) {
      setCursorPos(textareaRef.current.selectionStart);
    }
  };

  const insertTextAtCursor = (textToInsert: string) => {
    const textarea = textareaRef.current;
    let pos = cursorPos;

    if (textarea && textarea.selectionStart !== undefined && textarea.selectionStart !== null) {
      pos = textarea.selectionStart;
    }

    if (pos === null || pos === undefined || pos < 0 || pos > promptTemplate.length) {
      pos = promptTemplate.length;
    }

    const before = promptTemplate.slice(0, pos);
    const after = promptTemplate.slice(pos);
    const updated = before + textToInsert + after;
    setPromptTemplate(updated);

    const nextPos = pos + textToInsert.length;
    setCursorPos(nextPos);

    setTimeout(() => {
      if (textareaRef.current) {
        textareaRef.current.focus();
        textareaRef.current.setSelectionRange(nextPos, nextPos);
      }
    }, 10);
  };

  const handleLabelChange = (newLabel: string) => {
    setVarLabelInput(newLabel);
    const sanitized = newLabel
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, '')
      .replace(/\s+/g, '_');
    setVarKeyInput(sanitized);
  };

  const handleAddVariable = () => {
    const rawKey = varKeyInput.trim().replace(/^\[+|\]+$/g, '');
    const rawLabel = varLabelInput.trim();

    if (!rawKey && !rawLabel) return;

    const sanitizedKey = (rawKey || rawLabel)
      .toLowerCase()
      .replace(/[^\w-]/g, '_')
      .replace(/_+/g, '_');

    const finalLabel = rawLabel || formatVariableLabel(sanitizedKey);

    if (!varList.some((v) => v.key === sanitizedKey)) {
      setVarList((prev) => [...prev, { key: sanitizedKey, label: finalLabel }]);
    }

    insertTextAtCursor(`[${sanitizedKey}]`);
    setVarLabelInput('');
    setVarKeyInput('');

    setVarAddedCheck(true);
    setTimeout(() => {
      setVarAddedCheck(false);
    }, 1400);
  };

  const handleRemoveVariable = (keyToRemove: string) => {
    setVarList((prev) => prev.filter((v) => v.key !== keyToRemove));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !promptTemplate.trim()) return;

    setSaveCheck(true);

    setTimeout(() => {
      const templateVarKeys = extractVariablesFromTemplate(promptTemplate).map((v) => v.key);

      const varMap = new Map<string, string>();
      varList.forEach((item) => {
        varMap.set(item.key, item.label);
      });

      templateVarKeys.forEach((key) => {
        if (!varMap.has(key)) {
          varMap.set(key, formatVariableLabel(key));
        }
      });

      const variables: PromptVariable[] = Array.from(varMap.entries()).map(([key, label]) => ({
        key,
        label,
        placeholder: '',
        defaultValue: '',
        multiline: key.includes('texto') || key.includes('descricao') || key.includes('contexto'),
      }));

      const isVideo = mediaType === 'video';

      const cleanSteps: Record<string, number> = {};
      selectedWorkflows.forEach((wf) => {
        const val = workflowSteps[wf];
        if (val !== undefined && val !== '') {
          cleanSteps[wf] = Number(val);
        } else {
          cleanSteps[wf] = defaultWorkflowStep !== '' ? Number(defaultWorkflowStep) : 1;
        }
      });

      const firstWorkflow = selectedWorkflows[0] || undefined;
      const firstOrder = firstWorkflow ? cleanSteps[firstWorkflow] : undefined;

      const promptData: PromptItem = {
        id: editingPrompt ? editingPrompt.id : `custom-${Date.now()}`,
        title: title.trim(),
        description: promptTemplate.slice(0, 80).trim() + '...',
        mediaType,
        mediaLabel: isVideo ? 'Vídeo' : 'Imagem',
        category: 'criativo',
        categoryLabel: 'Personalizado',
        styleTag: 'Personalizado',
        imageUrl: imageUrl.trim() || undefined,
        template: promptTemplate.trim(),
        variables,
        isCustom: true,
        tags: ['Personalizado', isVideo ? 'Vídeo' : 'Imagem'],
        notes: notes.trim() || undefined,
        workflow: firstWorkflow,
        workflowOrder: firstOrder,
        workflows: selectedWorkflows.length > 0 ? selectedWorkflows : undefined,
        workflowSteps: Object.keys(cleanSteps).length > 0 ? cleanSteps : undefined,
      };

      onSave(promptData);
      onClose();
    }, 650);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div
          id="new-prompt-modal-overlay"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/90 backdrop-blur-md overflow-y-auto"
          onClick={(e) => {
            if (e.target === e.currentTarget) onClose();
          }}
        >
          <motion.div
            ref={modalContainerRef}
            id="new-prompt-modal-container"
            onMouseMove={handleMouseMoveModal}
            onMouseLeave={() => setFlashlight((prev) => ({ ...prev, isHovering: false }))}
            initial={{ opacity: 0, scale: 0.97, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.97, y: 10 }}
            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
            className="relative w-full max-w-lg bg-[#111113] border border-[#222227] rounded-2xl shadow-[0_32px_80px_rgba(0,0,0,0.95)] overflow-hidden flex flex-col text-zinc-100 my-auto"
          >
            {/* Flashlight Border Effect */}
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

            {/* Header: Minimalist, clean and refined - No icon, just pure typography */}
            <div className="flex items-center justify-between px-6 pt-5 pb-3 relative z-10 border-b border-[#1a1a1f]">
              <div>
                <h2 id="new-prompt-title" className="text-base font-semibold text-white tracking-tight">
                  {editingPrompt ? 'Editar Prompt' : 'Novo Prompt'}
                </h2>
              </div>

              {/* Close Button: Subtle and minimal */}
              <button
                id="btn-close-new-prompt"
                onClick={onClose}
                className="p-1 text-zinc-400 hover:text-white transition-colors cursor-pointer"
                title="Fechar"
              >
                <X className="w-4 h-4 text-white" />
              </button>
            </div>

            {/* Form Body: Modern studio-like minimal layout */}
            <form onSubmit={handleSubmit} className="p-6 flex flex-col gap-5 relative z-10 overflow-y-auto max-h-[78vh]">
              {/* Row 1: Title input with single Media Type toggle button */}
              <div className="flex items-center gap-3">
                <div className="flex-1 flex flex-col gap-1.5">
                  <label htmlFor="new-prompt-input-title" className="text-[11px] font-medium text-zinc-400">
                    Título
                  </label>
                  <input
                    id="new-prompt-input-title"
                    type="text"
                    required
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder=""
                    className="w-full h-9 px-3 text-xs sm:text-sm bg-[#0a0a0c] text-white border border-[#232328] rounded-lg focus:outline-none focus:border-zinc-300 transition-colors"
                  />
                </div>

                {/* Media Type Toggle: Sliding indicator with contour */}
                <div className="flex flex-col gap-1.5 shrink-0">
                  <span className="text-[11px] font-medium text-zinc-400">
                    Formato
                  </span>
                  <div className="flex items-center gap-1 p-1 h-9 bg-[#0a0a0c] border border-[#232328] rounded-lg">
                    <button
                      type="button"
                      id="btn-format-image"
                      onClick={() => setMediaType('imagem')}
                      className={`relative isolate px-3.5 h-full flex items-center justify-center text-xs font-medium transition-colors cursor-pointer select-none ${
                        mediaType === 'imagem' ? 'text-white' : 'text-zinc-400 hover:text-zinc-200'
                      }`}
                    >
                      {mediaType === 'imagem' && (
                        <motion.div
                          layoutId="new-prompt-media-active"
                          transition={{ type: 'spring', stiffness: 450, damping: 35 }}
                          className="absolute inset-0 bg-[#1c1c22] border border-[#383844] rounded-[6px] shadow-sm z-0 pointer-events-none"
                        />
                      )}
                      <span className="relative z-10">Imagem</span>
                    </button>

                    <button
                      type="button"
                      id="btn-format-video"
                      onClick={() => setMediaType('video')}
                      className={`relative isolate px-3.5 h-full flex items-center justify-center text-xs font-medium transition-colors cursor-pointer select-none ${
                        mediaType === 'video' ? 'text-white' : 'text-zinc-400 hover:text-zinc-200'
                      }`}
                    >
                      {mediaType === 'video' && (
                        <motion.div
                          layoutId="new-prompt-media-active"
                          transition={{ type: 'spring', stiffness: 450, damping: 35 }}
                          className="absolute inset-0 bg-[#1c1c22] border border-[#383844] rounded-[6px] shadow-sm z-0 pointer-events-none"
                        />
                      )}
                      <span className="relative z-10">Vídeo</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Row 1.5: Workflow (Opcional) - Suporte a múltiplos workflows com passos independentes */}
              <div className="flex flex-col gap-2 p-3 rounded-xl bg-[#0d0d10] border border-[#202025]">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-medium text-zinc-300 flex items-center gap-1.5">
                    <Layers className="w-3.5 h-3.5 text-zinc-400" />
                    <span>Workflows (Opcional — selecione um ou mais)</span>
                    {selectedWorkflows.length > 0 && (
                      <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-zinc-800 text-zinc-300 border border-zinc-700">
                        {selectedWorkflows.length}
                      </span>
                    )}
                  </span>
                  {selectedWorkflows.length > 0 && (
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedWorkflows([]);
                        setWorkflowSteps({});
                      }}
                      className="text-[10px] text-zinc-500 hover:text-zinc-300 transition-colors cursor-pointer"
                    >
                      Limpar seleção
                    </button>
                  )}
                </div>

                {/* Input direto para novo workflow e campo de ordem padrão */}
                <div className="flex items-center gap-2">
                  <div className="relative flex-1 flex items-center">
                    <input
                      type="text"
                      id="new-workflow-input-direct"
                      value={newWorkflowInput}
                      onChange={(e) => setNewWorkflowInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleAddWorkflowDirect();
                        }
                      }}
                      placeholder="Criar novo workflow (pressione Enter)..."
                      className="w-full h-8 pl-3 pr-8 text-xs bg-[#08080a] text-white border border-[#222227] rounded-lg focus:outline-none focus:border-zinc-400 placeholder:text-zinc-600 transition-colors"
                    />
                    {newWorkflowInput.trim() && (
                      <button
                        type="button"
                        onClick={() => handleAddWorkflowDirect()}
                        className="absolute right-1 w-6 h-6 rounded flex items-center justify-center text-zinc-400 hover:text-white hover:bg-[#1a1a20] transition-colors cursor-pointer"
                        title="Adicionar workflow"
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>

                  {/* Ordem padrão / Passo inicial */}
                  <div className="w-28 shrink-0 flex items-center gap-1">
                    <input
                      type="number"
                      min={1}
                      id="workflow-step-order"
                      value={defaultWorkflowStep}
                      onChange={(e) =>
                        setDefaultWorkflowStep(
                          e.target.value === '' ? '' : Math.max(1, parseInt(e.target.value) || 1)
                        )
                      }
                      placeholder="Passo nº 1"
                      className="w-full h-8 px-2.5 text-xs text-center bg-[#08080a] text-white border border-[#222227] rounded-lg focus:outline-none focus:border-zinc-400 placeholder:text-zinc-600 transition-colors"
                      title="Passo padrão para novos workflows associados"
                    />
                  </div>
                </div>

                {/* Lista de Workflows Salvos */}
                {savedWorkflows && savedWorkflows.length > 0 && (
                  <div className="flex flex-wrap items-center gap-1.5 pt-1">
                    {savedWorkflows.map((wf) => {
                      const isSelected = selectedWorkflows.includes(wf);
                      const currentStep = workflowSteps[wf] ?? defaultWorkflowStep ?? 1;

                      return (
                        <div
                          key={wf}
                          className={`inline-flex items-center gap-1 h-7 pl-2.5 pr-1 rounded-md text-[11px] font-medium transition-colors border select-none ${
                            isSelected
                              ? 'bg-zinc-800/90 text-white border-zinc-600 shadow-sm'
                              : 'bg-[#08080a] text-zinc-400 border-[#202025] hover:border-[#2f2f36] hover:text-zinc-300'
                          }`}
                        >
                          <button
                            type="button"
                            onClick={() => {
                              if (isSelected) {
                                setSelectedWorkflows((prev) => prev.filter((item) => item !== wf));
                                setWorkflowSteps((prev) => {
                                  const next = { ...prev };
                                  delete next[wf];
                                  return next;
                                });
                              } else {
                                setSelectedWorkflows((prev) => [...prev, wf]);
                                setWorkflowSteps((prev) => ({
                                  ...prev,
                                  [wf]: defaultWorkflowStep !== '' ? defaultWorkflowStep : 1,
                                }));
                              }
                            }}
                            className="flex items-center gap-1.5 cursor-pointer"
                          >
                            {isSelected && <Check className="w-3 h-3 text-emerald-400 shrink-0" />}
                            <span className="truncate max-w-[120px]">{wf}</span>
                          </button>

                          {/* Se selecionado, permite editar o passo específico */}
                          {isSelected && (
                            <input
                              type="number"
                              min={1}
                              value={currentStep}
                              onClick={(e) => e.stopPropagation()}
                              onChange={(e) => {
                                const val =
                                  e.target.value === ''
                                    ? ''
                                    : Math.max(1, parseInt(e.target.value) || 1);
                                setWorkflowSteps((prev) => ({ ...prev, [wf]: val }));
                              }}
                              className="w-10 h-5 px-1 text-[10px] text-center bg-[#141418] text-white border border-[#303038] rounded focus:outline-none focus:border-zinc-400"
                              title={`Passo do workflow ${wf}`}
                            />
                          )}

                          {onDeleteWorkflow && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                onDeleteWorkflow(wf);
                                setSelectedWorkflows((prev) => prev.filter((item) => item !== wf));
                                setWorkflowSteps((prev) => {
                                  const next = { ...prev };
                                  delete next[wf];
                                  return next;
                                });
                              }}
                              className="ml-0.5 p-0.5 rounded text-zinc-500 hover:text-red-400 hover:bg-red-500/10 transition-colors cursor-pointer"
                              title={`Excluir workflow "${wf}"`}
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Row 2: Prompt Workspace (Main writing area) directly below */}
              <div className="flex flex-col gap-1.5">
                <div className="flex items-center justify-between">
                  <label htmlFor="new-prompt-input-template" className="text-[11px] font-medium text-zinc-400">
                    Template do Prompt
                  </label>
                  <span className="text-[11px] font-mono text-zinc-500">
                    Use [variavel] para campos dinâmicos
                  </span>
                </div>
                <textarea
                  ref={textareaRef}
                  id="new-prompt-input-template"
                  required
                  rows={5}
                  value={promptTemplate}
                  onChange={(e) => {
                    setPromptTemplate(e.target.value);
                    updateCursorPosition();
                  }}
                  onClick={updateCursorPosition}
                  onKeyUp={updateCursorPosition}
                  onSelect={updateCursorPosition}
                  placeholder=""
                  className="w-full p-3.5 text-xs sm:text-sm bg-[#0a0a0c] text-white border border-[#232328] rounded-xl focus:outline-none focus:border-zinc-300 transition-colors font-mono leading-relaxed resize-y"
                />
              </div>

              {/* Row 3: Variables Toolbar - Minimalist, streamlined and unboxed */}
              <div className="flex flex-col gap-3 pt-1">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-medium text-zinc-400">
                    Adicionar Variável no Cursor
                  </span>
                  {varList.length > 0 && (
                    <span className="text-[11px] font-mono text-zinc-400">
                      {varList.length} ativa{varList.length > 1 ? 's' : ''}
                    </span>
                  )}
                </div>

                {/* Inline Variable Input Controls */}
                <div className="flex items-end gap-2">
                  <div className="flex-1 flex flex-col gap-1">
                    <label htmlFor="input-variable-label" className="text-[11px] font-medium text-zinc-400">
                      Nome
                    </label>
                    <input
                      id="input-variable-label"
                      type="text"
                      value={varLabelInput}
                      onChange={(e) => handleLabelChange(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleAddVariable();
                        }
                      }}
                      placeholder="Nome"
                      title="Nome de exibição da variável"
                      className="w-full h-9 px-3 bg-[#0a0a0c] text-white placeholder-zinc-500 border border-[#232328] rounded-lg focus:outline-none focus:border-zinc-300 text-xs transition-colors"
                    />
                  </div>

                  <div className="w-32 sm:w-36 flex flex-col gap-1">
                    <label htmlFor="input-variable-key" className="text-[11px] font-medium text-zinc-400">
                      Variável
                    </label>
                    <input
                      id="input-variable-key"
                      type="text"
                      value={varKeyInput}
                      onChange={(e) => setVarKeyInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleAddVariable();
                        }
                      }}
                      placeholder="Variável"
                      title="Chave no texto do prompt"
                      className="w-full h-9 px-3 bg-[#0a0a0c] text-white placeholder-zinc-500 border border-[#232328] rounded-lg focus:outline-none focus:border-zinc-300 font-mono text-xs transition-colors"
                    />
                  </div>

                  {/* Metallic Plus button with only '+' icon */}
                  <button
                    type="button"
                    id="btn-add-variable-plus"
                    onClick={handleAddVariable}
                    className={`relative overflow-hidden group/plus h-9 w-9 rounded-lg transition-all flex items-center justify-center cursor-pointer active:scale-95 duration-300 shrink-0 ${
                      varAddedCheck
                        ? 'bg-gradient-to-b from-[#34d399] via-[#10b981] to-[#059669] border border-[#6ee7b7]/90 shadow-[0_0_16px_rgba(16,185,129,0.5)]'
                        : 'bg-gradient-to-b from-[#ffffff] via-[#e2e5e9] to-[#b8bdc5] text-[#111113] border border-white/90 shadow-[0_2px_10px_rgba(0,0,0,0.5),inset_0_1px_1px_rgba(255,255,255,0.95)] hover:shadow-[0_4px_14px_rgba(255,255,255,0.2)]'
                    }`}
                    title="Adicionar variável"
                  >
                    <span className="metallic-shine-layer" />
                    {varAddedCheck ? (
                      <Check className="w-4 h-4 stroke-[3.5] text-white animate-check-pop" />
                    ) : (
                      <Plus className="w-4 h-4 stroke-[3] text-[#111113]" />
                    )}
                  </button>
                </div>

                {/* Variable Pills List */}
                {varList.length > 0 && (
                  <div id="added-variables-tags" className="flex flex-wrap gap-1.5 pt-1">
                    {varList.map((v) => (
                      <span
                        key={v.key}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs bg-[#151518] text-zinc-300 border border-[#232328] rounded-md transition-colors"
                      >
                        <button
                          type="button"
                          onClick={() => insertTextAtCursor(`[${v.key}]`)}
                          title="Clique para inserir no cursor do prompt"
                          className="hover:text-white flex items-center gap-1 cursor-pointer text-left font-mono"
                        >
                          <span className="text-zinc-400 font-sans">{v.label}</span>
                          <span className="text-white font-medium">[{v.key}]</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleRemoveVariable(v.key)}
                          className="p-0.5 text-zinc-400 hover:text-white rounded cursor-pointer"
                          title="Remover variável"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Card Image Link (Optional, revealed on hover) */}
              <div className="flex flex-col gap-1.5 pt-1">
                <label
                  htmlFor="input-card-image-url"
                  className="text-[11px] font-medium text-zinc-400 flex items-center gap-1.5"
                >
                  <ImageIcon className="w-3.5 h-3.5 text-zinc-400" />
                  <span>Link da Imagem (opcional — aparece ao passar o mouse no card)</span>
                </label>
                <input
                  id="input-card-image-url"
                  type="url"
                  value={imageUrl}
                  onChange={(e) => setImageUrl(e.target.value)}
                  placeholder="https://exemplo.com/imagem.jpg"
                  className="w-full h-9 px-3 bg-[#0a0a0c] text-white placeholder-zinc-600 border border-[#232328] rounded-lg focus:outline-none focus:border-zinc-300 text-xs transition-colors"
                />
              </div>

              {/* Observações / Notas sobre o Prompt */}
              <div className="flex flex-col gap-1.5 pt-1">
                <div className="flex items-center justify-between">
                  <label
                    htmlFor="input-prompt-notes"
                    className="text-[11px] font-medium text-zinc-400 flex items-center gap-1.5"
                  >
                    <FileText className="w-3.5 h-3.5 text-zinc-400" />
                    <span>Observações (opcional)</span>
                  </label>
                  <span className="text-[11px] text-zinc-500">
                    Aparece para leitura na caixa do prompt
                  </span>
                </div>
                <textarea
                  id="input-prompt-notes"
                  rows={3}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Escreva observações, orientações ou dicas sobre este prompt..."
                  className="w-full p-3 text-xs sm:text-sm bg-[#0a0a0c] text-white placeholder-zinc-600 border border-[#232328] rounded-xl focus:outline-none focus:border-zinc-300 transition-colors font-sans leading-relaxed resize-y"
                />
              </div>

              {/* Action Bar: Left-aligned Delete (when editing), Right-aligned Cancel + Save */}
              <div className="flex items-center justify-between pt-3 border-t border-[#1a1a1f]">
                <div>
                  {editingPrompt && onDelete && (
                    <>
                      {!confirmDelete ? (
                        <button
                          type="button"
                          id="btn-modal-delete-prompt"
                          onClick={() => setConfirmDelete(true)}
                          className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-lg transition-colors cursor-pointer"
                          title="Excluir este prompt"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>Excluir prompt</span>
                        </button>
                      ) : (
                        <div className="flex items-center gap-2 bg-[#18181c] px-2.5 py-1.5 rounded-lg border border-red-500/30">
                          <span className="text-[11px] text-red-400 font-medium">Excluir prompt?</span>
                          <button
                            type="button"
                            id="btn-confirm-delete-prompt"
                            onClick={() => {
                              onDelete(editingPrompt.id);
                              onClose();
                            }}
                            className="flex items-center gap-1 px-2 py-1 text-[11px] font-medium bg-red-600 hover:bg-red-500 text-white rounded transition-colors cursor-pointer"
                          >
                            <Trash2 className="w-3 h-3" />
                            <span>Confirmar</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => setConfirmDelete(false)}
                            className="px-1.5 py-1 text-[11px] text-zinc-400 hover:text-white transition-colors cursor-pointer"
                          >
                            Cancelar
                          </button>
                        </div>
                      )}
                    </>
                  )}
                </div>

                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={onClose}
                    className="px-4 py-2 text-xs font-medium text-zinc-400 hover:text-white transition-colors cursor-pointer"
                  >
                    Cancelar
                  </button>

                  <button
                    type="submit"
                    disabled={!title.trim() || !promptTemplate.trim()}
                    className={`relative overflow-hidden group/save px-5 py-2 text-xs font-bold rounded-lg transition-all shadow-sm flex items-center justify-center min-w-[120px] duration-300 ${
                      saveCheck
                        ? 'bg-gradient-to-b from-[#34d399] via-[#10b981] to-[#059669] border border-[#6ee7b7]/90 shadow-[0_0_18px_rgba(16,185,129,0.5)] text-white cursor-default'
                        : title.trim() && promptTemplate.trim()
                        ? 'bg-gradient-to-b from-[#ffffff] via-[#e2e5e9] to-[#b8bdc5] text-[#111113] border border-white/90 shadow-[0_2px_12px_rgba(0,0,0,0.5),inset_0_1px_1px_rgba(255,255,255,0.95)] hover:shadow-[0_4px_16px_rgba(255,255,255,0.25)] active:scale-95 cursor-pointer'
                        : 'bg-[#18181b] text-zinc-600 border border-[#242428] cursor-not-allowed'
                    }`}
                  >
                    {title.trim() && promptTemplate.trim() && !saveCheck && (
                      <>
                        <span className="metallic-shine-layer" />
                        <span className="absolute inset-x-0 top-0 h-[1px] bg-gradient-to-r from-transparent via-white to-transparent opacity-80" />
                      </>
                    )}

                    {saveCheck ? (
                      <div className="flex items-center gap-1.5 text-white">
                        <Check className="w-4 h-4 stroke-[3.5] animate-check-pop" />
                        <span>Salvo!</span>
                      </div>
                    ) : (
                      <span>{editingPrompt ? 'Salvar' : 'Criar Prompt'}</span>
                    )}
                  </button>
                </div>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
