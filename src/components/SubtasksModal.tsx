import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { TaskItem } from '../types';
import { X, Check } from 'lucide-react';

interface SubtasksModalProps {
  isOpen: boolean;
  task: TaskItem | null;
  onClose: () => void;
  onToggleSubtask: (taskId: string, subtaskId: string) => void;
  onAddSubtask: (taskId: string, title: string) => void;
  onDeleteSubtask: (taskId: string, subtaskId: string) => void;
}

export const SubtasksModal: React.FC<SubtasksModalProps> = ({
  isOpen,
  task,
  onClose,
  onToggleSubtask,
  onAddSubtask,
  onDeleteSubtask,
}) => {
  const [newSubtaskTitle, setNewSubtaskTitle] = useState('');
  const modalContainerRef = useRef<HTMLDivElement>(null);
  const [flashlight, setFlashlight] = useState({ x: 0, y: 0, isHovering: false });

  if (!isOpen || !task) return null;

  const subtasks = task.subtasks || [];

  const handleMouseMoveModal = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!modalContainerRef.current) return;
    const rect = modalContainerRef.current.getBoundingClientRect();
    setFlashlight({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
      isHovering: true,
    });
  };

  const handleAdd = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const trimmed = newSubtaskTitle.trim();
    if (!trimmed) return;
    onAddSubtask(task.id, trimmed);
    setNewSubtaskTitle('');
  };

  return (
    <AnimatePresence>
      <div
        id="subtasks-modal-overlay"
        className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/85 backdrop-blur-md overflow-y-auto"
        onClick={(e) => {
          if (e.target === e.currentTarget) onClose();
        }}
      >
        <motion.div
          ref={modalContainerRef}
          id="subtasks-modal-container"
          onMouseMove={handleMouseMoveModal}
          onMouseLeave={() => setFlashlight((prev) => ({ ...prev, isHovering: false }))}
          initial={{ opacity: 0, scale: 0.96, y: 12 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: 12 }}
          transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
          className="relative w-full max-w-lg rounded-2xl bg-[#09090b] border border-[#1f1f24] shadow-[0_24px_60px_rgba(0,0,0,0.95)] overflow-hidden p-5 sm:p-6 select-none"
        >
          {/* Flashlight Border Effect */}
          <div
            className="flashlight-layer absolute inset-0 rounded-2xl p-[1px] pointer-events-none z-10"
            style={{
              opacity: flashlight.isHovering ? 1 : 0,
              background: flashlight.isHovering
                ? `radial-gradient(350px circle at ${flashlight.x}px ${flashlight.y}px, rgba(255, 255, 255, 0.3), rgba(255, 255, 255, 0.04) 45%, transparent 75%)`
                : 'none',
              WebkitMask:
                'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)',
              WebkitMaskComposite: 'xor',
              maskComposite: 'exclude',
            }}
          />

          {/* Modal Header: Apenas o nome da tarefa e o botão fechar */}
          <div className="relative z-20 flex items-center justify-between gap-4 pb-3 border-b border-[#1f1f24]">
            <h2
              id="subtasks-modal-task-title"
              className="text-base sm:text-lg font-medium text-white tracking-tight leading-snug break-words flex-1 min-w-0"
            >
              {task.title}
            </h2>

            <button
              type="button"
              id="btn-close-subtasks-modal"
              onClick={onClose}
              className="p-1 text-zinc-400 hover:text-white transition-colors cursor-pointer shrink-0"
              title="Fechar"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Input para escrever subtarefas em cima das subtarefas: sem quadrado, apenas espaço vazio e adiciona com Enter */}
          <form onSubmit={handleAdd} className="relative z-20 pt-3 pb-1">
            <input
              type="text"
              id="subtask-modal-input"
              value={newSubtaskTitle}
              onChange={(e) => setNewSubtaskTitle(e.target.value)}
              placeholder="Adicionar subtarefa..."
              className="w-full bg-transparent border-0 outline-none text-sm text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:ring-0 px-1 py-1.5 transition-colors"
              autoFocus
            />
          </form>

          {/* Lista de Subtarefas: sem quadrados em volta, check igual tarefas normais, apenas nomes (sem botão lixeira) */}
          <div className="relative z-20 flex flex-col gap-1 max-h-[320px] overflow-y-auto mt-2 pr-1">
            {subtasks.map((sub) => (
              <div
                key={sub.id}
                className="group/sub flex items-center gap-3 py-2 px-1 hover:bg-white/[0.02] rounded-lg transition-colors cursor-pointer select-none"
                onClick={() => onToggleSubtask(task.id, sub.id)}
              >
                {/* Check Button com layout idêntico ao das tarefas normais */}
                <button
                  type="button"
                  id={`btn-check-subtask-${sub.id}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    onToggleSubtask(task.id, sub.id);
                  }}
                  aria-label={sub.completed ? 'Marcar como não concluída' : 'Marcar como concluída'}
                  className="relative group/circle flex items-center justify-center w-5 h-5 shrink-0 rounded-full cursor-pointer select-none transition-all duration-200 outline-none"
                >
                  {sub.completed ? (
                    <motion.div
                      initial={{ scale: 0.6, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      className="w-full h-full rounded-full bg-emerald-500 border border-emerald-400 flex items-center justify-center shadow-[0_0_10px_rgba(16,185,129,0.35)]"
                    >
                      <Check className="w-3 h-3 text-white stroke-[3.2]" />
                    </motion.div>
                  ) : (
                    <div className="relative w-full h-full flex items-center justify-center">
                      <svg
                        className="w-full h-full rotate-[-90deg] overflow-visible"
                        viewBox="0 0 24 24"
                      >
                        <circle
                          cx="12"
                          cy="12"
                          r="9"
                          stroke="#4a4a52"
                          strokeWidth="2"
                          fill="transparent"
                          className="transition-colors duration-200 group-hover/circle:stroke-zinc-300"
                        />
                        <circle
                          cx="12"
                          cy="12"
                          r="9"
                          stroke="#ffffff"
                          strokeWidth="2.2"
                          fill="transparent"
                          strokeDasharray="56.5"
                          strokeDashoffset="56.5"
                          strokeLinecap="round"
                          className="transition-all duration-300 ease-out group-hover/circle:stroke-dashoffset-0 group-hover/circle:opacity-100 opacity-0"
                        />
                      </svg>
                      <div className="absolute inset-0 rounded-full bg-white/0 group-hover/circle:bg-white/5 transition-colors pointer-events-none" />
                    </div>
                  )}
                </button>

                {/* Subtask Title Text (apenas o nome da tarefa, sem lixeira) */}
                <span
                  className={`text-sm leading-snug break-words transition-all flex-1 min-w-0 select-none ${
                    sub.completed
                      ? 'line-through text-zinc-500'
                      : 'text-zinc-200 group-hover/sub:text-white'
                  }`}
                >
                  {sub.title}
                </span>
              </div>
            ))}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
