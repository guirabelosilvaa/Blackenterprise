import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { TaskItem, SubtaskItem } from '../types';
import { X, Check, Trash2, Plus, Folder, FileText, Flame, ListTodo } from 'lucide-react';

interface NewTaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (task: TaskItem) => void;
  onDelete?: (id: string) => void;
  editingTask?: TaskItem | null;
  savedProjects: string[];
  onAddProject: (name: string) => void;
  onDeleteProject?: (name: string) => void;
}

export const NewTaskModal: React.FC<NewTaskModalProps> = ({
  isOpen,
  onClose,
  onSave,
  onDelete,
  editingTask,
  savedProjects,
  onAddProject,
  onDeleteProject,
}) => {
  const [title, setTitle] = useState('');
  const [notes, setNotes] = useState('');
  const [selectedProject, setSelectedProject] = useState('');
  const [newProjectInput, setNewProjectInput] = useState('');
  const [urgent, setUrgent] = useState(false);
  const [subtasks, setSubtasks] = useState<SubtaskItem[]>([]);
  const [newSubtaskInput, setNewSubtaskInput] = useState('');
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [saveCheck, setSaveCheck] = useState(false);

  // Flashlight border on modal
  const modalContainerRef = useRef<HTMLDivElement>(null);
  const [flashlight, setFlashlight] = useState({ x: 0, y: 0, isHovering: false });

  useEffect(() => {
    if (!isOpen) return;

    if (editingTask) {
      setTitle(editingTask.title);
      setSelectedProject(editingTask.project || (savedProjects[0] || ''));
      setNotes(editingTask.notes || '');
      setUrgent(editingTask.urgent ?? false);
      setSubtasks(editingTask.subtasks ? [...editingTask.subtasks] : []);
    } else {
      setTitle('');
      setSelectedProject(savedProjects[0] || '');
      setNotes('');
      setUrgent(false);
      setSubtasks([]);
    }
    setNewProjectInput('');
    setNewSubtaskInput('');
    setConfirmDelete(false);
    setSaveCheck(false);
  }, [isOpen, editingTask, savedProjects]);

  const handleMouseMoveModal = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!modalContainerRef.current) return;
    const rect = modalContainerRef.current.getBoundingClientRect();
    setFlashlight({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
      isHovering: true,
    });
  };

  const handleAddProjectDirect = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const trimmed = newProjectInput.trim();
    if (!trimmed) return;

    if (!savedProjects.includes(trimmed)) {
      onAddProject(trimmed);
    }
    setSelectedProject(trimmed);
    setNewProjectInput('');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    setSaveCheck(true);

    setTimeout(() => {
      const taskData: TaskItem = {
        id: editingTask ? editingTask.id : `task-${Date.now()}`,
        title: title.trim(),
        project: selectedProject.trim() || undefined,
        notes: notes.trim() || undefined,
        completed: editingTask?.completed ?? false,
        urgent: urgent,
        subtasks: subtasks && subtasks.length > 0 ? subtasks : undefined,
        createdAt: editingTask?.createdAt || Date.now(),
      };

      onSave(taskData);
      onClose();
    }, 350);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div
          id="new-task-modal-overlay"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/90 backdrop-blur-md overflow-y-auto"
          onClick={(e) => {
            if (e.target === e.currentTarget) onClose();
          }}
        >
          <motion.div
            ref={modalContainerRef}
            id="new-task-modal-container"
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
                WebkitMask: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)',
                WebkitMaskComposite: 'xor',
                maskComposite: 'exclude',
              }}
            />

            {/* Header */}
            <div className="flex items-center justify-between p-6 pb-4 border-b border-[#1f1f24] relative z-10">
              <h2 className="text-base sm:text-lg font-semibold text-white tracking-tight">
                {editingTask ? 'Editar Tarefa' : 'Nova Tarefa'}
              </h2>
              <button
                type="button"
                onClick={onClose}
                className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-[#1a1a20] transition-colors cursor-pointer"
                title="Fechar"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Form Body */}
            <form onSubmit={handleSubmit} className="p-6 flex flex-col gap-5 relative z-10">
              {/* Row 1: Tarefa (Nome) + Urgente Toggle */}
              <div className="flex flex-col gap-1.5">
                <div className="flex items-center justify-between">
                  <label htmlFor="new-task-input-title" className="text-[11px] font-medium text-zinc-400">
                    Tarefa
                  </label>
                  <button
                    type="button"
                    onClick={() => setUrgent((prev) => !prev)}
                    className={`flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[11px] font-medium transition-all cursor-pointer ${
                      urgent
                        ? 'bg-red-950/60 text-red-400 border border-red-800/60 shadow-[0_0_10px_rgba(239,68,68,0.2)]'
                        : 'text-zinc-500 hover:text-zinc-300 border border-transparent hover:bg-[#1a1a20]'
                    }`}
                    title={urgent ? 'Tarefa urgente marcada' : 'Marcar como urgente'}
                  >
                    <Flame className={`w-3 h-3 ${urgent ? 'text-red-500 fill-red-500/25' : ''}`} />
                    <span>{urgent ? 'Urgente' : 'Normal'}</span>
                  </button>
                </div>
                <input
                  id="new-task-input-title"
                  type="text"
                  required
                  autoFocus
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Ex: Gravar novo anúncio criativo"
                  className="w-full h-10 px-3.5 text-xs sm:text-sm bg-[#0a0a0c] text-white border border-[#232328] rounded-lg focus:outline-none focus:border-zinc-300 transition-colors placeholder:text-zinc-600"
                />
              </div>

              {/* Row 2: Observações / Notas */}
              <div className="flex flex-col gap-1.5">
                <label htmlFor="new-task-input-notes" className="text-[11px] font-medium text-zinc-400 flex items-center gap-1.5">
                  <FileText className="w-3 h-3 text-zinc-400" />
                  <span>Observação / Notas (opcional)</span>
                </label>
                <input
                  id="new-task-input-notes"
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Ex: ligar antes ou alinhar detalhes"
                  className="w-full h-9 px-3 text-xs bg-[#0a0a0c] text-white border border-[#232328] rounded-lg focus:outline-none focus:border-zinc-300 transition-colors placeholder:text-zinc-600"
                />
              </div>

              {/* Row 3: Projetos */}
              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-medium text-zinc-400 flex items-center gap-1.5">
                    <Folder className="w-3 h-3 text-zinc-400" />
                    <span>Projeto</span>
                  </span>
                  {selectedProject && (
                    <button
                      type="button"
                      onClick={() => setSelectedProject('')}
                      className="text-[10px] text-zinc-400 hover:text-zinc-200 transition-colors cursor-pointer"
                    >
                      Desvincular projeto
                    </button>
                  )}
                </div>

                {/* Input de criação rápida e direta */}
                <div className="flex items-center gap-1.5">
                  <div className="relative flex-1">
                    <input
                      type="text"
                      id="new-project-quick-input"
                      value={newProjectInput}
                      onChange={(e) => setNewProjectInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleAddProjectDirect();
                        }
                      }}
                      placeholder="Criar novo projeto (pressione Enter)..."
                      className="w-full h-8.5 pl-3 pr-8 text-xs bg-[#0a0a0c] text-white border border-[#232328] rounded-lg focus:outline-none focus:border-zinc-300 transition-colors placeholder:text-zinc-600"
                    />
                    {newProjectInput.trim() && (
                      <button
                        type="button"
                        onClick={() => handleAddProjectDirect()}
                        className="absolute right-1 top-1/2 -translate-y-1/2 p-1 text-zinc-300 hover:text-white bg-[#1c1c22] hover:bg-[#282830] rounded-md transition-colors cursor-pointer"
                        title="Adicionar projeto"
                      >
                        <Plus className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Lista de Projetos Salvos com seleção e exclusão */}
                {savedProjects.length > 0 ? (
                  <div className="flex flex-wrap items-center gap-1.5 pt-0.5 max-h-36 overflow-y-auto pr-1">
                    {savedProjects.map((p) => {
                      const isSelected = selectedProject === p;
                      return (
                        <div
                          key={p}
                          className={`group/proj inline-flex items-center rounded-lg text-xs font-medium transition-all duration-150 select-none border ${
                            isSelected
                              ? 'bg-[#1e1e24] text-white border-zinc-400/60 shadow-sm'
                              : 'bg-[#0e0e11] text-zinc-400 hover:text-zinc-200 border-[#202025] hover:border-[#303038]'
                          }`}
                        >
                          <button
                            type="button"
                            onClick={() => setSelectedProject(isSelected ? '' : p)}
                            className="flex items-center gap-1.5 pl-2.5 pr-2 py-1.5 cursor-pointer text-left"
                            title={isSelected ? `Projeto ativo: ${p} (clique para desvincular)` : `Vincular projeto: ${p}`}
                          >
                            <span className="truncate max-w-[150px]">{p}</span>
                            {isSelected && (
                              <Check className="w-3 h-3 text-white stroke-[2.5] shrink-0" />
                            )}
                          </button>

                          {onDeleteProject && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                if (selectedProject === p) setSelectedProject('');
                                onDeleteProject(p);
                              }}
                              className="p-1.5 text-zinc-500 hover:text-red-400 hover:bg-red-950/30 rounded-r-lg transition-colors cursor-pointer shrink-0 border-l border-white/5"
                              title={`Excluir projeto "${p}" do sistema`}
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-[11px] text-zinc-500 italic">
                    Nenhum projeto cadastrado. Digite o nome acima e pressione Enter para criar.
                  </p>
                )}
              </div>

              {/* Row 4: Subtarefas */}
              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-medium text-zinc-400 flex items-center gap-1.5">
                    <ListTodo className="w-3 h-3 text-zinc-400" />
                    <span>Subtarefas ({subtasks.length})</span>
                  </span>
                </div>

                {/* Lista de subtarefas no modal */}
                {subtasks.length > 0 && (
                  <div className="flex flex-col gap-1.5 max-h-36 overflow-y-auto pr-1">
                    {subtasks.map((st) => (
                      <div
                        key={st.id}
                        className="flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-lg bg-[#0a0a0c] border border-[#202025]"
                      >
                        <div className="flex items-center gap-2 flex-1 min-w-0">
                          <button
                            type="button"
                            onClick={() =>
                              setSubtasks((prev) =>
                                prev.map((s) => (s.id === st.id ? { ...s, completed: !s.completed } : s))
                              )
                            }
                            className="cursor-pointer"
                          >
                            <div
                              className={`w-3.5 h-3.5 rounded flex items-center justify-center transition-colors ${
                                st.completed ? 'bg-emerald-500 text-black' : 'border border-zinc-600 hover:border-zinc-400'
                              }`}
                            >
                              {st.completed && <Check className="w-2.5 h-2.5 stroke-[3] text-black" />}
                            </div>
                          </button>
                          <span
                            className={`text-xs truncate ${
                              st.completed ? 'line-through text-zinc-500' : 'text-zinc-200'
                            }`}
                          >
                            {st.title}
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => setSubtasks((prev) => prev.filter((s) => s.id !== st.id))}
                          className="text-zinc-500 hover:text-red-400 p-0.5 cursor-pointer transition-colors"
                          title="Excluir subtarefa"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {/* Input para adicionar nova subtarefa */}
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={newSubtaskInput}
                    onChange={(e) => setNewSubtaskInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        if (newSubtaskInput.trim()) {
                          setSubtasks((prev) => [
                            ...prev,
                            { id: `st-${Date.now()}`, title: newSubtaskInput.trim(), completed: false },
                          ]);
                          setNewSubtaskInput('');
                        }
                      }
                    }}
                    placeholder="Nova subtarefa... (Enter para adicionar)"
                    className="w-full h-8 px-3 text-xs bg-[#0a0a0c] text-white border border-[#232328] rounded-lg focus:outline-none focus:border-zinc-300 transition-colors placeholder:text-zinc-600"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      if (newSubtaskInput.trim()) {
                        setSubtasks((prev) => [
                          ...prev,
                          { id: `st-${Date.now()}`, title: newSubtaskInput.trim(), completed: false },
                        ]);
                        setNewSubtaskInput('');
                      }
                    }}
                    className="h-8 px-2.5 bg-[#18181d] hover:bg-[#25252c] text-zinc-300 hover:text-white border border-[#2a2a33] rounded-lg text-xs font-medium transition-colors cursor-pointer shrink-0"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Footer Actions */}
              <div className="flex items-center justify-between pt-3 border-t border-[#1f1f23]">
                {/* Delete button (only when editing) */}
                <div>
                  {editingTask && onDelete && (
                    confirmDelete ? (
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => {
                            onDelete(editingTask.id);
                            onClose();
                          }}
                          className="px-2.5 py-1 text-xs text-red-400 hover:text-white bg-red-950/40 hover:bg-red-900/60 border border-red-800/60 rounded-md transition-colors cursor-pointer"
                        >
                          Confirmar Exclusão
                        </button>
                        <button
                          type="button"
                          onClick={() => setConfirmDelete(false)}
                          className="px-2 py-1 text-xs text-zinc-400 hover:text-zinc-200 cursor-pointer"
                        >
                          Cancelar
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setConfirmDelete(true)}
                        className="p-1.5 text-zinc-500 hover:text-red-400 hover:bg-[#1a1415] rounded-md transition-colors cursor-pointer"
                        title="Excluir Tarefa"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={onClose}
                    className="px-3.5 py-2 rounded-lg text-xs font-medium text-zinc-400 hover:text-white transition-colors cursor-pointer"
                  >
                    Cancelar
                  </button>

                  <button
                    type="submit"
                    id="btn-save-task"
                    className={`relative overflow-hidden group flex items-center justify-center min-w-[110px] h-9 px-4 rounded-lg transition-all duration-300 text-xs font-semibold cursor-pointer active:scale-95 ${
                      saveCheck
                        ? 'bg-gradient-to-b from-[#34d399] via-[#10b981] to-[#059669] text-white border border-[#6ee7b7]/80 shadow-[0_0_16px_rgba(16,185,129,0.5)]'
                        : 'bg-gradient-to-b from-[#ffffff] via-[#e2e5e9] to-[#b8bdc5] text-[#111113] border border-white/80 shadow-[0_2px_10px_rgba(0,0,0,0.5),inset_0_1px_1px_rgba(255,255,255,0.9)] hover:shadow-[0_4px_14px_rgba(255,255,255,0.2)]'
                    }`}
                  >
                    <span className="metallic-shine-layer" />
                    <span className="absolute inset-x-0 top-0 h-[1px] bg-gradient-to-r from-transparent via-white to-transparent opacity-80" />

                    {saveCheck ? (
                      <div className="flex items-center gap-1.5 text-white">
                        <Check className="w-4 h-4 stroke-[3.5] animate-check-pop" />
                        <span>Salvo!</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1.5 text-[#111113]">
                        <span>{editingTask ? 'Atualizar Tarefa' : 'Criar Tarefa'}</span>
                      </div>
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
