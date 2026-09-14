import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { TaskItem, TaskCategoryType } from '../types';
import { X, Check, Trash2, Calendar, CheckSquare, Plus, Folder, User, Briefcase, Clock, FileText } from 'lucide-react';

interface NewTaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (task: TaskItem) => void;
  onDelete?: (id: string) => void;
  editingTask?: TaskItem | null;
  defaultDate?: string;
  defaultTaskType?: TaskCategoryType;
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
  defaultDate,
  defaultTaskType = 'daily',
  savedProjects,
  onAddProject,
  onDeleteProject,
}) => {
  const [title, setTitle] = useState('');
  const [date, setDate] = useState('');
  const [taskType, setTaskType] = useState<TaskCategoryType>('daily');
  const [time, setTime] = useState('');
  const [notes, setNotes] = useState('');
  const [selectedProject, setSelectedProject] = useState('');
  const [newProjectInput, setNewProjectInput] = useState('');
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [saveCheck, setSaveCheck] = useState(false);

  // Flashlight border on modal
  const modalContainerRef = useRef<HTMLDivElement>(null);
  const [flashlight, setFlashlight] = useState({ x: 0, y: 0, isHovering: false });

  // Get today's ISO string
  const getTodayIso = () => {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  useEffect(() => {
    if (!isOpen) return;

    if (editingTask) {
      setTitle(editingTask.title);
      setDate(editingTask.date || getTodayIso());
      setTaskType(editingTask.taskType || 'daily');
      setSelectedProject(editingTask.taskType === 'daily' ? '' : (editingTask.project || (savedProjects[0] || '')));
      setTime(editingTask.time || '');
      setNotes(editingTask.notes || '');
    } else {
      setTitle('');
      setDate(defaultDate && defaultDate !== 'all' ? defaultDate : getTodayIso());
      setTaskType(defaultTaskType);
      setSelectedProject(defaultTaskType === 'daily' ? '' : (savedProjects[0] || ''));
      setTime('');
      setNotes('');
    }
    setNewProjectInput('');
    setConfirmDelete(false);
    setSaveCheck(false);
  }, [isOpen, editingTask, defaultDate, defaultTaskType, savedProjects]);

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
        date: taskType === 'daily' ? '' : (date || getTodayIso()),
        project: taskType === 'daily' ? undefined : (selectedProject.trim() || undefined),
        notes: notes.trim() || undefined,
        time: taskType === 'daily' ? (time.trim() || undefined) : undefined,
        completed: editingTask?.completed ?? false,
        taskType: taskType,
      };

      onSave(taskData);
      onClose();
    }, 400);
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
                  ? `radial-gradient(420px circle at ${flashlight.x}px ${flashlight.y}px, rgba(255, 255, 255, 0.04), transparent 75%)`
                  : 'none',
              }}
            />

            {/* Modal Header */}
            <div className="relative z-10 flex items-center justify-between px-6 py-4 border-b border-[#1f1f23] bg-[#141417]/80">
              <div className="flex items-center gap-2.5">
                <div className="p-1.5 rounded-lg bg-[#1c1c22] border border-[#2d2d36] text-white">
                  <CheckSquare className="w-4 h-4 text-white" />
                </div>
                <h2 className="text-sm font-semibold text-white tracking-tight">
                  {editingTask ? 'Editar Tarefa' : 'Nova Tarefa'}
                </h2>
              </div>

              {/* Close Button */}
              <button
                id="btn-close-new-task"
                onClick={onClose}
                className="p-1 text-zinc-400 hover:text-white transition-colors cursor-pointer"
                title="Fechar"
              >
                <X className="w-4 h-4 text-white" />
              </button>
            </div>

            {/* Form Body */}
            <form onSubmit={handleSubmit} className="p-6 flex flex-col gap-5 relative z-10">
              {/* Row 0: Tipo de Tarefa (Diária vs Negócios) */}
              <div className="flex flex-col gap-1.5">
                <span className="text-[11px] font-medium text-zinc-400">
                  Tipo de Tarefa
                </span>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    id="new-task-type-daily"
                    onClick={() => {
                      setTaskType('daily');
                      setSelectedProject('');
                    }}
                    className={`flex items-center justify-center gap-2 h-9 px-3 rounded-lg border text-xs font-medium transition-all cursor-pointer select-none ${
                      taskType === 'daily'
                        ? 'bg-[#1a1a20] border-zinc-400 text-white shadow-sm'
                        : 'bg-[#0c0c0e] border-[#202025] text-zinc-400 hover:text-zinc-200'
                    }`}
                  >
                    <User className="w-3.5 h-3.5" />
                    <span>Diária</span>
                  </button>
                  <button
                    type="button"
                    id="new-task-type-business"
                    onClick={() => {
                      setTaskType('business');
                      if (!selectedProject && savedProjects.length > 0) {
                        setSelectedProject(savedProjects[0]);
                      }
                    }}
                    className={`flex items-center justify-center gap-2 h-9 px-3 rounded-lg border text-xs font-medium transition-all cursor-pointer select-none ${
                      taskType === 'business'
                        ? 'bg-[#1a1a20] border-zinc-400 text-white shadow-sm'
                        : 'bg-[#0c0c0e] border-[#202025] text-zinc-400 hover:text-zinc-200'
                    }`}
                  >
                    <Briefcase className="w-3.5 h-3.5" />
                    <span>Black</span>
                  </button>
                </div>
              </div>

              {/* Row 1: Tarefa (Nome) */}
              <div className="flex flex-col gap-1.5">
                <label htmlFor="new-task-input-title" className="text-[11px] font-medium text-zinc-400">
                  Tarefa
                </label>
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

              {/* Row 2: Data (apenas para negócios; tarefas diárias não possuem data) */}
              {taskType !== 'daily' && (
                <div className="flex flex-col gap-1.5">
                  <div className="flex items-center justify-between">
                    <label htmlFor="new-task-input-date" className="text-[11px] font-medium text-zinc-400 flex items-center gap-1.5">
                      <Calendar className="w-3 h-3 text-zinc-400" />
                      <span>Data</span>
                    </label>
                    <button
                      type="button"
                      onClick={() => setDate(getTodayIso())}
                      className="text-[10px] text-zinc-400 hover:text-white underline cursor-pointer"
                    >
                      Hoje
                    </button>
                  </div>
                  <input
                    id="new-task-input-date"
                    type="date"
                    required
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="w-full h-9 px-3 text-xs bg-[#0a0a0c] text-white border border-[#232328] rounded-lg focus:outline-none focus:border-zinc-300 transition-colors [color-scheme:dark]"
                  />
                </div>
              )}

              {/* Row 2: Horário ou Observação (para tarefas diárias) */}
              {taskType === 'daily' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="flex flex-col gap-1.5">
                    <label htmlFor="new-task-input-time" className="text-[11px] font-medium text-zinc-400 flex items-center gap-1.5">
                      <Clock className="w-3 h-3 text-zinc-400" />
                      <span>Horário (opcional)</span>
                    </label>
                    <input
                      id="new-task-input-time"
                      type="text"
                      value={time}
                      onChange={(e) => setTime(e.target.value)}
                      placeholder="Ex: 09:30 ou 14:00"
                      className="w-full h-9 px-3 text-xs bg-[#0a0a0c] text-white border border-[#232328] rounded-lg focus:outline-none focus:border-zinc-300 transition-colors placeholder:text-zinc-600"
                    />
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label htmlFor="new-task-input-notes" className="text-[11px] font-medium text-zinc-400 flex items-center gap-1.5">
                      <FileText className="w-3 h-3 text-zinc-400" />
                      <span>Observação / Obs: (opcional)</span>
                    </label>
                    <input
                      id="new-task-input-notes"
                      type="text"
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="Ex: obs: ligar antes ou após almoço"
                      className="w-full h-9 px-3 text-xs bg-[#0a0a0c] text-white border border-[#232328] rounded-lg focus:outline-none focus:border-zinc-300 transition-colors placeholder:text-zinc-600"
                    />
                  </div>
                </div>
              )}

              {/* Row 3: Projetos - apenas para tarefas de negócios; tarefas diárias não têm projetos */}
              {taskType !== 'daily' && (
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

                  {/* Lista de Projetos Salvos com seleção e exclusão clara */}
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
                            {/* Botão de Selecionar Projeto */}
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

                            {/* Botão Dedicado de Exclusão com Lixeira */}
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
              )}

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

                  {/* Save Button with Metallic style */}
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
