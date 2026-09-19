import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { TaskItem } from '../types';
import {
  Pencil,
  GripVertical,
  Check,
  Folder,
  Calendar,
  User,
  Clock,
  Flame,
  ListTodo,
  Trash2,
} from 'lucide-react';

interface TaskCardProps {
  task: TaskItem;
  index?: number;
  onEdit?: (task: TaskItem) => void;
  onToggleComplete?: (id: string) => void;
  onMoveToToday?: (id: string) => void;
  onToggleUrgent?: (id: string) => void;
  onToggleSubtask?: (taskId: string, subtaskId: string) => void;
  onAddSubtask?: (taskId: string, title: string) => void;
  onDeleteSubtask?: (taskId: string, subtaskId: string) => void;
  onOpenSubtasks?: (task: TaskItem) => void;
  savedProjects?: string[];
  isHovered?: boolean;
  isAnyHovered?: boolean;
  onMouseEnter?: () => void;
  onMouseLeave?: () => void;
  // Drag & drop reordering
  isDragging?: boolean;
  isDragOver?: boolean;
  onDragStart?: (e: React.DragEvent, id: string) => void;
  onDragOver?: (e: React.DragEvent, id: string) => void;
  onDragLeave?: (e: React.DragEvent) => void;
  onDrop?: (e: React.DragEvent, id: string) => void;
  onDragEnd?: (e: React.DragEvent) => void;
}

export const TaskCard: React.FC<TaskCardProps> = ({
  task,
  index = 0,
  onEdit,
  onToggleComplete,
  onMoveToToday,
  onToggleUrgent,
  onToggleSubtask,
  onAddSubtask,
  onDeleteSubtask,
  onOpenSubtasks,
  savedProjects,
  isHovered = false,
  isAnyHovered = false,
  onMouseEnter,
  onMouseLeave,
  isDragging = false,
  isDragOver = false,
  onDragStart,
  onDragOver,
  onDragLeave,
  onDrop,
  onDragEnd,
}) => {
  const cardRef = useRef<HTMLDivElement>(null);
  const isCompleted = !!task.completed;

  // Mini Subtasks Hover Pop-up State
  const [isSubtasksHoverOpen, setIsSubtasksHoverOpen] = useState(false);
  const subtasksHoverTimer = useRef<NodeJS.Timeout | null>(null);

  const handleSubtasksMouseEnter = () => {
    if (subtasksHoverTimer.current) {
      clearTimeout(subtasksHoverTimer.current);
      subtasksHoverTimer.current = null;
    }
    if (onMouseEnter) onMouseEnter();
    setIsSubtasksHoverOpen(true);
  };

  const handleSubtasksMouseLeave = () => {
    if (subtasksHoverTimer.current) {
      clearTimeout(subtasksHoverTimer.current);
    }
    subtasksHoverTimer.current = setTimeout(() => {
      setIsSubtasksHoverOpen(false);
    }, 380);
  };

  useEffect(() => {
    return () => {
      if (subtasksHoverTimer.current) {
        clearTimeout(subtasksHoverTimer.current);
      }
    };
  }, []);

  // When subtasks popover closes and mouse is not over card, clear interaction state smoothly
  useEffect(() => {
    if (!isSubtasksHoverOpen && !isHovered) {
      setMouseCoords({
        x: 0,
        y: 0,
        px: 50,
        py: 50,
        rotateX: 0,
        rotateY: 0,
        isInteracting: false,
      });
      if (onMouseLeave) onMouseLeave();
    }
  }, [isSubtasksHoverOpen, isHovered, onMouseLeave]);

  // Subtle 3D Tilt & Mouse Coordinates
  const [mouseCoords, setMouseCoords] = useState({
    x: 0,
    y: 0,
    px: 50,
    py: 50,
    rotateX: 0,
    rotateY: 0,
    isInteracting: false,
  });

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const px = Math.max(0, Math.min(100, (x / rect.width) * 100));
    const py = Math.max(0, Math.min(100, (y / rect.height) * 100));

    // Gentle 3D tilt
    const rotateY = ((x - rect.width / 2) / (rect.width / 2)) * 1.8;
    const rotateX = ((y - rect.height / 2) / (rect.height / 2)) * -1.8;

    setMouseCoords({
      x,
      y,
      px,
      py,
      rotateX,
      rotateY,
      isInteracting: true,
    });
  };

  const handleCardMouseEnter = () => {
    if (onMouseEnter) onMouseEnter();
    setMouseCoords((prev) => ({ ...prev, isInteracting: true }));
  };

  const handleCardMouseLeave = () => {
    // If subtasks hover popup is currently open, keep card highlighted and active
    if (isSubtasksHoverOpen) {
      return;
    }
    if (onMouseLeave) onMouseLeave();
    setMouseCoords({
      x: 0,
      y: 0,
      px: 50,
      py: 50,
      rotateX: 0,
      rotateY: 0,
      isInteracting: false,
    });
  };

  const handleEdit = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onEdit) {
      onEdit(task);
    }
  };

  const formatDateShort = (dateStr: string) => {
    if (!dateStr) return '';
    try {
      const [y, m, d] = dateStr.split('-');
      if (!y || !m || !d) return dateStr;
      return `${d.padStart(2, '0')}/${m.padStart(2, '0')}`;
    } catch {
      return dateStr;
    }
  };

  const isDimmed = isAnyHovered && !isHovered && !isSubtasksHoverOpen;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.96 }}
      transition={{
        duration: 0.28,
        delay: Math.min(index * 0.02, 0.1),
        ease: [0.25, 0.46, 0.45, 0.94],
      }}
      className={`card-perspective-container w-full flex items-center gap-3 sm:gap-3.5 group/row relative transition-[z-index] ${
        isSubtasksHoverOpen ? 'z-50' : isHovered ? 'z-20' : 'z-0'
      }`}
      draggable
      onDragStart={(e) => onDragStart && onDragStart(e as unknown as React.DragEvent, task.id)}
      onDragOver={(e) => onDragOver && onDragOver(e as unknown as React.DragEvent, task.id)}
      onDragLeave={(e) => onDragLeave && onDragLeave(e as unknown as React.DragEvent)}
      onDrop={(e) => onDrop && onDrop(e as unknown as React.DragEvent, task.id)}
      onDragEnd={(e) => onDragEnd && onDragEnd(e as unknown as React.DragEvent)}
    >
      {/* External Check Circle Button on the left, vertically centered */}
      <button
        type="button"
        id={`btn-complete-task-${task.id}`}
        onClick={() => onToggleComplete && onToggleComplete(task.id)}
        aria-label={isCompleted ? 'Marcar como não concluída' : 'Marcar como concluída'}
        className="relative group/circle flex items-center justify-center w-7 h-7 sm:w-6.5 sm:h-6.5 shrink-0 rounded-full cursor-pointer select-none transition-all duration-200 outline-none"
      >
        {isCompleted ? (
          /* Completed: Green background with white check mark */
          <motion.div
            initial={{ scale: 0.6, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="w-full h-full rounded-full bg-emerald-500 border border-emerald-400 flex items-center justify-center shadow-[0_0_12px_rgba(16,185,129,0.4)]"
          >
            <Check className="w-4 h-4 sm:w-3.5 sm:h-3.5 text-white stroke-[3.2]" />
          </motion.div>
        ) : (
          /* Not completed: Circle with outline + circulating animated contour on hover */
          <div className="relative w-full h-full flex items-center justify-center">
            {/* SVG circle contour that animates / circulates on hover */}
            <svg
              className="w-full h-full rotate-[-90deg] overflow-visible"
              viewBox="0 0 24 24"
            >
              {/* Base idle contour */}
              <circle
                cx="12"
                cy="12"
                r="9"
                stroke="#4a4a52"
                strokeWidth="1.8"
                fill="transparent"
                className="transition-colors duration-200 group-hover/circle:stroke-zinc-300"
              />

              {/* Animated stroke running around the circle on hover */}
              <circle
                cx="12"
                cy="12"
                r="9"
                stroke="#ffffff"
                strokeWidth="2"
                fill="transparent"
                strokeDasharray="56.5"
                strokeDashoffset="56.5"
                strokeLinecap="round"
                className="transition-all duration-400 ease-out group-hover/circle:stroke-dashoffset-0 group-hover/circle:opacity-100 opacity-0"
              />
            </svg>

            {/* Subtle inner hover glow */}
            <div className="absolute inset-0 rounded-full bg-white/0 group-hover/circle:bg-white/5 transition-colors pointer-events-none" />
          </div>
        )}
      </button>

      {/* Main Task Card Box */}
      <div
        ref={cardRef}
        id={`task-card-${task.id}`}
        onMouseMove={handleMouseMove}
        onMouseEnter={handleCardMouseEnter}
        onMouseLeave={handleCardMouseLeave}
        style={{
          transform: mouseCoords.isInteracting
            ? `perspective(1000px) rotateX(${mouseCoords.rotateX.toFixed(2)}deg) rotateY(${mouseCoords.rotateY.toFixed(2)}deg) scale3d(1.004, 1.004, 1.004)`
            : 'perspective(1000px) rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1)',
          transition: mouseCoords.isInteracting
            ? 'transform 0.08s ease-out'
            : 'transform 0.45s cubic-bezier(0.23, 1, 0.32, 1), opacity 0.3s ease-out',
        }}
        className={`group relative flex-1 flex flex-col justify-between rounded-2xl bg-[#141416] cursor-grab active:cursor-grabbing p-4 sm:p-5 select-none preserve-3d overflow-visible transition-all duration-300 ${
          isSubtasksHoverOpen
            ? 'z-50 shadow-[0_12px_40px_rgba(0,0,0,0.95)] border-[#3a3a46]'
            : isCompleted
            ? 'opacity-40 hover:opacity-75 border border-[#1f1f23] shadow-none'
            : isDragging
            ? 'opacity-25 border border-dashed border-zinc-500 scale-95 shadow-none'
            : isDragOver
            ? 'border-2 border-white scale-[1.01] shadow-[0_0_20px_rgba(255,255,255,0.2)]'
            : isDimmed
            ? 'opacity-35 scale-[0.99] blur-[0.3px] border border-[#18181b] shadow-none'
            : isHovered
            ? 'opacity-100 z-30 shadow-[0_12px_40px_rgba(0,0,0,0.85),0_0_25px_rgba(255,255,255,0.04)] border-[#32323a]'
            : 'border border-[#222226] shadow-[0_4px_20px_rgba(0,0,0,0.45)] hover:border-[#35353d]'
        }`}
      >
        {/* 1. STRIPE FLASHLIGHT EFFECT: Pure Monochromatic Border */}
        <div
          className="flashlight-layer absolute inset-0 rounded-2xl p-[1px] pointer-events-none z-10"
          style={{
            opacity: mouseCoords.isInteracting && !isCompleted ? 1 : 0,
            background: mouseCoords.isInteracting
              ? `radial-gradient(280px circle at ${mouseCoords.x}px ${mouseCoords.y}px, rgba(255, 255, 255, 0.4), rgba(255, 255, 255, 0.05) 40%, transparent 75%)`
              : 'none',
            WebkitMask:
              'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)',
            WebkitMaskComposite: 'xor',
            maskComposite: 'exclude',
          }}
        />

        {/* Ambient Surface Glow */}
        <div
          className="flashlight-layer absolute inset-0 pointer-events-none rounded-2xl z-0"
          style={{
            opacity: mouseCoords.isInteracting && !isCompleted ? 1 : 0,
            background: mouseCoords.isInteracting
              ? `radial-gradient(320px circle at ${mouseCoords.x}px ${mouseCoords.y}px, rgba(255, 255, 255, 0.035), transparent 75%)`
              : 'none',
          }}
        />

        {/* 2. SUBTLE REFLECTION FOIL */}
        <div
          className="holographic-foil absolute inset-0 pointer-events-none rounded-2xl z-20"
          style={{
            opacity: mouseCoords.isInteracting && !isCompleted ? 0.22 : 0,
            background: `
              linear-gradient(${115 + mouseCoords.rotateY * 2}deg, 
                transparent 30%, 
                rgba(255, 255, 255, 0.03) 48%, 
                rgba(255, 255, 255, 0.07) 50%, 
                rgba(255, 255, 255, 0.03) 52%, 
                transparent 70%
              ),
              radial-gradient(circle at ${mouseCoords.px}% ${mouseCoords.py}%, 
                rgba(255, 255, 255, 0.06) 0%, 
                transparent 60%
              )
            `,
          }}
        />

        {/* 3. CARD HEADER (Mover + Projeto Tag + Lápis) */}
        <div
          className="relative z-30 flex items-center justify-between transition-transform duration-100 ease-out mb-2.5"
          style={{
            transform: mouseCoords.isInteracting
              ? 'translateZ(8px)'
              : 'translateZ(0px)',
          }}
        >
          {/* Left: Grip / Mover, Project Tag */}
          <div className="flex items-center gap-2 sm:gap-2.5 flex-wrap">
            <div
              className="text-zinc-600 group-hover:text-zinc-400 transition-colors cursor-grab active:cursor-grabbing p-0.5"
              title="Mover tarefa (arraste para reordenar)"
            >
              <GripVertical className="w-3.5 h-3.5" />
            </div>

            {/* Projeto Tag (only for non-daily tasks, if project exists and is not deleted) */}
            {task.taskType !== 'daily' && task.project && task.project.trim() !== '' && (!savedProjects || savedProjects.includes(task.project.trim())) && (
              <span
                id={`task-project-badge-${task.id}`}
                className="inline-flex items-center gap-1.5 px-2.5 py-0.5 text-[11px] font-medium rounded-md bg-[#1c1c20] text-zinc-300 border border-[#2b2b32] shadow-sm"
              >
                <Folder className="w-3 h-3 text-zinc-400" />
                <span>{task.project}</span>
              </span>
            )}

            {/* Número de subtarefas: x/x - hover mostra mini pop up para dar check sem lixeira, clique abre popup completo */}
            {task.taskType !== 'daily' && (
              (task.subtasks && task.subtasks.length > 0) ? (
                <div
                  className="relative inline-flex items-center"
                  onMouseEnter={handleSubtasksMouseEnter}
                  onMouseLeave={handleSubtasksMouseLeave}
                >
                  <button
                    type="button"
                    id={`task-subtask-btn-${task.id}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      setIsSubtasksHoverOpen(false);
                      if (onOpenSubtasks) onOpenSubtasks(task);
                    }}
                    className="inline-flex items-center px-2 py-0.5 text-[11px] font-mono font-medium rounded-md bg-[#18181c] text-zinc-300 hover:text-white hover:bg-[#222228] border border-[#272730] hover:border-[#3a3a46] transition-colors shadow-sm select-none cursor-pointer"
                    title="Clique para abrir e gerenciar subtarefas"
                  >
                    <span>
                      {task.subtasks.filter((s) => s.completed).length}/{task.subtasks.length}
                    </span>
                  </button>

                  {/* Mini pop up on hover para dar check diretamente sem lixeira */}
                  <AnimatePresence>
                    {isSubtasksHoverOpen && (
                      <motion.div
                        initial={{ opacity: 0, y: 4, scale: 0.96 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 3, scale: 0.96 }}
                        transition={{ duration: 0.15, ease: 'easeOut' }}
                        onMouseEnter={handleSubtasksMouseEnter}
                        onMouseLeave={handleSubtasksMouseLeave}
                        className="absolute top-full left-0 pt-1.5 z-50 pointer-events-auto before:content-[''] before:absolute before:-top-3 before:left-0 before:right-0 before:h-4 before:pointer-events-auto"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <div className="min-w-[220px] max-w-[280px] p-2.5 rounded-xl bg-[#09090b] border border-[#1f1f24] shadow-[0_16px_36px_rgba(0,0,0,0.95)] backdrop-blur-md">
                          <div className="flex flex-col gap-1 max-h-[190px] overflow-y-auto pr-0.5">
                            {task.subtasks.map((sub) => (
                              <div
                                key={sub.id}
                                className="group/mini-sub flex items-center gap-2.5 py-1.5 px-2 hover:bg-white/[0.04] rounded-lg transition-colors cursor-pointer select-none"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (onToggleSubtask) {
                                    onToggleSubtask(task.id, sub.id);
                                  }
                                }}
                              >
                                {/* Check Circle Button */}
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    if (onToggleSubtask) {
                                      onToggleSubtask(task.id, sub.id);
                                    }
                                  }}
                                  className="relative group/circle flex items-center justify-center w-4 h-4 shrink-0 rounded-full cursor-pointer select-none transition-all duration-200 outline-none"
                                >
                                  {sub.completed ? (
                                    <div className="w-full h-full rounded-full bg-emerald-500 border border-emerald-400 flex items-center justify-center shadow-[0_0_8px_rgba(16,185,129,0.35)]">
                                      <Check className="w-2.5 h-2.5 text-white stroke-[3.2]" />
                                    </div>
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

                                {/* Título da subtarefa */}
                                <span
                                  className={`text-xs leading-snug break-words flex-1 min-w-0 transition-all ${
                                    sub.completed
                                      ? 'line-through text-zinc-500'
                                      : 'text-zinc-200 group-hover/mini-sub:text-white'
                                  }`}
                                >
                                  {sub.title}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              ) : isHovered ? (
                <button
                  type="button"
                  id={`task-subtask-btn-${task.id}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    if (onOpenSubtasks) onOpenSubtasks(task);
                  }}
                  className="inline-flex items-center px-2 py-0.5 text-[11px] font-mono font-medium rounded-md bg-[#18181c] text-zinc-400 hover:text-white hover:bg-[#222228] border border-[#272730] hover:border-[#3a3a46] transition-colors shadow-sm select-none cursor-pointer"
                  title="Adicionar subtarefas"
                >
                  <span>0/0</span>
                </button>
              ) : null
            )}

            {/* Daily Tag (para tarefas diárias) */}
            {task.taskType === 'daily' && (
              <span
                id={`task-daily-badge-${task.id}`}
                className="inline-flex items-center gap-1.5 px-2.5 py-0.5 text-[11px] font-medium rounded-md bg-[#1c1c20] text-zinc-300 border border-[#2b2b32] shadow-sm"
              >
                <User className="w-3 h-3 text-zinc-400" />
                <span>Daily</span>
              </span>
            )}

            {/* Horário ou Obs on hover para tarefas diárias: sem prefixo obs:, exibindo a frase inteira */}
            {task.taskType === 'daily' && (task.time || (task.notes && task.notes.trim() !== '')) && (() => {
              const cleanNotes = task.notes
                ? task.notes.replace(/^(?:obs\s*:?|observa[çc][ãa]o\s*:?|nota\s*:?)\s*/i, '').trim()
                : '';
              return (
                <span
                  id={`task-daily-meta-${task.id}`}
                  className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 text-[11px] font-medium rounded-md bg-[#18181c] text-zinc-300 border border-[#272730] transition-all duration-200 ${
                    isHovered
                      ? 'opacity-100 translate-x-0'
                      : 'opacity-0 -translate-x-1 pointer-events-none group-hover:opacity-100 group-hover:translate-x-0'
                  }`}
                  title={cleanNotes || (task.time ? `Horário: ${task.time}` : '')}
                >
                  {task.time && <Clock className="w-2.5 h-2.5 text-zinc-400 shrink-0" />}
                  {task.time && <span className="font-mono text-[10px] text-zinc-400 shrink-0">{task.time}</span>}
                  {task.time && cleanNotes && <span className="text-zinc-600 shrink-0">•</span>}
                  {cleanNotes && <span className="text-zinc-300 font-normal leading-tight">{cleanNotes}</span>}
                </span>
              );
            })()}
          </div>

          {/* Right: Data + Símbolo de calendário (colocar no dia de hoje) + Lápis (Edit action) */}
          <div
            className="flex items-center gap-1 sm:gap-1.5"
            draggable={false}
            onMouseDown={(e) => e.stopPropagation()}
          >
            {/* Data on hover: aparece ao lado do calendário na ordem [data] [calendário] */}
            {task.taskType !== 'daily' && task.date && (
              <span
                id={`task-date-hover-${task.id}`}
                className={`inline-flex items-center gap-1 px-2 py-0.5 text-[11px] font-medium rounded-md bg-[#18181c] text-zinc-300 border border-[#272730] transition-all duration-200 select-none ${
                  isHovered
                    ? 'opacity-100 translate-x-0 pointer-events-auto'
                    : 'opacity-70 sm:opacity-0 -translate-x-1 sm:scale-95 pointer-events-auto sm:pointer-events-none group-hover:opacity-100 group-hover:translate-x-0 group-hover:scale-100 group-hover:pointer-events-auto'
                }`}
                title={`Data: ${task.date}`}
              >
                <span>{formatDateShort(task.date)}</span>
              </span>
            )}

            {/* Calendário: move a tarefa de negócio automaticamente para o dia de hoje (diárias não têm data nem este ícone) */}
            {task.taskType !== 'daily' && onMoveToToday && (
              <button
                type="button"
                id={`btn-move-today-${task.id}`}
                onClick={(e) => {
                  e.stopPropagation();
                  onMoveToToday(task.id);
                }}
                className={`p-2 sm:p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-[#222227] transition-all cursor-pointer ${
                  isHovered
                    ? 'opacity-100 scale-100 pointer-events-auto'
                    : 'opacity-70 sm:opacity-0 scale-95 sm:scale-90 pointer-events-auto sm:pointer-events-none group-hover:opacity-100 group-hover:scale-100 group-hover:pointer-events-auto'
                }`}
                title="Colocar no dia de hoje"
              >
                <Calendar className="w-3.5 h-3.5" />
              </button>
            )}

            {onEdit && (
              <button
                id={`btn-edit-task-${task.id}`}
                onClick={handleEdit}
                className="p-2 sm:p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-[#222227] transition-all cursor-pointer"
                title="Editar tarefa"
              >
                <Pencil className="w-3.5 h-3.5 text-white" />
              </button>
            )}
          </div>
        </div>

        {/* 4. CARD BODY: Title (Tarefa) */}
        <div className="relative z-30 flex flex-col flex-1">
          <h3
            id={`task-title-${task.id}`}
            className={`text-sm sm:text-base font-medium transition-all duration-200 tracking-tight leading-snug ${
              isCompleted
                ? 'line-through text-zinc-500'
                : 'text-white group-hover:text-zinc-100'
            }`}
            style={{
              transform: mouseCoords.isInteracting
                ? 'translateZ(6px)'
                : 'translateZ(0px)',
            }}
          >
            {task.title}
          </h3>
        </div>
      </div>

      {/* Símbolo de Tarefa Importante (Foguinho): se a tarefa estiver com o check, o fogo apaga */}
      <button
        type="button"
        id={`btn-urgent-task-${task.id}`}
        onClick={(e) => {
          e.stopPropagation();
          if (onToggleUrgent) onToggleUrgent(task.id);
        }}
        className={`shrink-0 p-1.5 rounded-lg transition-all duration-200 cursor-pointer flex items-center justify-center select-none ${
          isCompleted
            ? 'opacity-0 pointer-events-none'
            : task.urgent
            ? 'text-red-500 hover:text-red-400 opacity-100 scale-110 drop-shadow-[0_0_8px_rgba(239,68,68,0.5)]'
            : isHovered
            ? 'text-zinc-500 hover:text-red-400 opacity-80 hover:opacity-100 scale-105'
            : 'text-zinc-600 hover:text-zinc-400 opacity-30 hover:opacity-100 group-hover/row:opacity-75'
        }`}
        title={
          isCompleted
            ? ''
            : task.urgent
            ? 'Tarefa urgente (clique para remover urgência)'
            : 'Marcar como urgente'
        }
      >
        <Flame
          className={`w-4 h-4 transition-all duration-300 ${
            !isCompleted && task.urgent
              ? 'text-red-500 fill-red-500/30'
              : 'text-zinc-700'
          }`}
        />
      </button>
    </motion.div>
  );
};
