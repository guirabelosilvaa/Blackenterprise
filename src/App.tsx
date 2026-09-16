import React, { useState, useMemo, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { PromptItem, TaskItem, TaskCategoryType, MealItem, DayFuelData } from './types';
import { PromptCard } from './components/PromptCard';
import { PromptModal } from './components/PromptModal';
import { NewPromptModal } from './components/NewPromptModal';
import { TaskCard } from './components/TaskCard';
import { NewTaskModal } from './components/NewTaskModal';
import { WeekTaskbar } from './components/WeekTaskbar';
import { BackupModal } from './components/BackupModal';
import { FuelPage } from './components/FuelPage';
import { filterTasksWithinWindow } from './utils/taskRules';
import { persistentStorage } from './utils/cookieStorage';
import {
  Image as ImageIcon,
  Video,
  Search,
  Plus,
  Cloud,
  CheckCircle2,
  FileText,
  CheckSquare,
  Briefcase,
  User,
  RotateCcw,
  Layers,
  Trash2,
  ArrowUp,
  Calendar,
  Folder,
  MessageSquare,
  Check,
  Flame,
  Share2,
} from 'lucide-react';

const PROMPTS_STORAGE_KEY = 'promptvault_user_prompts_v3';
const TASKS_STORAGE_KEY = 'promptvault_user_tasks_v3';
const PROJECTS_STORAGE_KEY = 'promptvault_user_projects_v1';
const WORKFLOWS_STORAGE_KEY = 'promptvault_user_workflows_v1';
const TASK_TYPE_STORAGE_KEY = 'promptvault_user_task_type_v1';
const MEALS_STORAGE_KEY = 'promptvault_user_meals_v1';
const CALORIE_GOAL_STORAGE_KEY = 'promptvault_user_calorie_goal_v1';
const FUEL_DATA_STORAGE_KEY = 'promptvault_user_fuel_data_v1';

const getTodayIso = () => {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const getUpcomingIso = (daysAhead: number) => {
  const d = new Date();
  d.setDate(d.getDate() + daysAhead);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const INITIAL_PROJECTS = ['Marketing', 'Conteúdo', 'Design'];
const INITIAL_WORKFLOWS: string[] = [];

const INITIAL_TASKS: TaskItem[] = [
  {
    id: 'task-init-1',
    title: 'Criar novo conceito visual para campanha',
    date: getTodayIso(),
    project: 'Marketing',
    completed: false,
    taskType: 'business',
  },
  {
    id: 'task-init-2',
    title: 'Gravar roteiro do anúncio e editar cortes dinâmicos',
    date: getTodayIso(),
    project: 'Conteúdo',
    completed: false,
    taskType: 'business',
  },
  {
    id: 'task-init-3',
    title: 'Gerar variações de criativos para teste de engajamento',
    date: getUpcomingIso(1),
    project: 'Marketing',
    completed: false,
    taskType: 'business',
  },
  {
    id: 'task-init-4',
    title: 'Revisar entrega final e programar publicação',
    date: getUpcomingIso(2),
    project: 'Design',
    completed: false,
    taskType: 'business',
  },
  {
    id: 'task-daily-1',
    title: 'Responder mensagens e emails prioritários',
    date: '',
    completed: false,
    taskType: 'daily',
  },
  {
    id: 'task-daily-2',
    title: 'Alinhar entregas da esteira de produção',
    date: '',
    completed: false,
    taskType: 'daily',
  },
];

type PageKey = 'workspace' | 'prompts' | 'tasks' | 'fuel';

const PAGE_INDEX_MAP: Record<PageKey, number> = {
  workspace: 0,
  prompts: 1,
  tasks: 2,
  fuel: 3,
};

const INITIAL_MEALS: MealItem[] = [
  {
    id: 'meal-init-1',
    name: 'Café da manhã: Ovos mexidos e torrada',
    calories: 420,
    date: getTodayIso(),
    time: '08:30',
  },
  {
    id: 'meal-init-2',
    name: 'Almoço: Frango grelhado e arroz integral',
    calories: 580,
    date: getTodayIso(),
    time: '12:45',
  },
  {
    id: 'meal-init-3',
    name: 'Lanche: Iogurte natural com castanhas',
    calories: 200,
    date: getTodayIso(),
    time: '16:15',
  },
];

// Projeto acima do chat com visual limpo do card de prompt
interface AgentProjectPillProps {
  name: string;
  isSelected: boolean;
  isDimmed: boolean;
  onSelect: () => void;
}

const AgentProjectPill: React.FC<AgentProjectPillProps> = ({
  name,
  isSelected,
  isDimmed,
  onSelect,
}) => {
  return (
    <button
      type="button"
      id={`agent-project-pill-${name.toLowerCase().replace(/\s+/g, '-')}`}
      onClick={onSelect}
      className={`group relative overflow-hidden rounded-xl cursor-pointer select-none transition-all duration-200 text-xs font-medium px-3.5 py-1.5 ${
        isSelected
          ? 'z-20 opacity-100 scale-[1.02] bg-[#1a1a20] border border-zinc-400 text-white font-semibold shadow-[0_4px_20px_rgba(0,0,0,0.8),0_0_16px_rgba(255,255,255,0.08)]'
          : isDimmed
          ? 'opacity-35 bg-[#141416] border border-[#222226] text-zinc-500 hover:opacity-75 hover:text-zinc-300'
          : 'opacity-100 bg-[#141416] border border-[#222226] hover:border-[#383844] text-zinc-300 hover:text-white shadow-[0_4px_16px_rgba(0,0,0,0.45)]'
      }`}
      title={
        isSelected
          ? `Projeto "${name}" ativo (clique para desselecionar)`
          : `Atribuir tarefa ao projeto "${name}"`
      }
    >
      <span className="relative z-10 flex items-center gap-1.5">
        <Folder
          className={`w-3.5 h-3.5 transition-colors ${
            isSelected ? 'text-zinc-200' : 'text-zinc-400 group-hover:text-zinc-200'
          }`}
        />
        {name}
      </span>
    </button>
  );
};

export default function App() {
  // Default to workspace page on load
  const [currentPage, setCurrentPage] = useState<PageKey>('workspace');
  const [pageDirection, setPageDirection] = useState<number>(0);

  // Indicator box on dock disappears after ~2 seconds
  const [showDockIndicator, setShowDockIndicator] = useState(true);

  // Wipe All Data modal
  const [isWipeModalOpen, setIsWipeModalOpen] = useState(false);

  useEffect(() => {
    setShowDockIndicator(true);
    const timer = setTimeout(() => {
      setShowDockIndicator(false);
    }, 2000);
    return () => clearTimeout(timer);
  }, [currentPage]);

  // Projects State
  const [savedProjects, setSavedProjects] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem(PROJECTS_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {
      // Fallback
    }
    return INITIAL_PROJECTS;
  });

  const handleAddProject = (newProjectName: string) => {
    const trimmed = newProjectName.trim();
    if (!trimmed || savedProjects.includes(trimmed)) return;
    const updated = [...savedProjects, trimmed];
    setSavedProjects(updated);
    localStorage.setItem(PROJECTS_STORAGE_KEY, JSON.stringify(updated));
    showNotification(`Projeto "${trimmed}" criado!`);
  };

  const handleImportProjects = (importedProjects: string[], mode?: 'replace' | 'merge') => {
    setSavedProjects((prev) => {
      const merged =
        mode === 'replace'
          ? Array.from(new Set(importedProjects))
          : Array.from(new Set([...prev, ...importedProjects]));
      localStorage.setItem(PROJECTS_STORAGE_KEY, JSON.stringify(merged));
      return merged;
    });
  };

  const handleDeleteProject = (projectName: string) => {
    const updated = savedProjects.filter((p) => p !== projectName);
    setSavedProjects(updated);
    localStorage.setItem(PROJECTS_STORAGE_KEY, JSON.stringify(updated));
    if (activeProjectFilter === projectName) {
      setActiveProjectFilter(null);
    }
    if (agentSelectedProject === projectName) {
      setAgentSelectedProject(null);
    }
    // Also remove reference from tasks that had this project
    setTasks((prevTasks) => {
      const updatedTasks = prevTasks.map((t) =>
        t.project === projectName ? { ...t, project: undefined } : t
      );
      localStorage.setItem(TASKS_STORAGE_KEY, JSON.stringify(updatedTasks));
      return updatedTasks;
    });
    showNotification(`Projeto "${projectName}" removido.`);
  };

  // Workflows State - eliminate any legacy default dummy workflows
  const [savedWorkflows, setSavedWorkflows] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem(WORKFLOWS_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          // Clean out previous dummy defaults if present
          const cleaned = parsed.filter(
            (w: string) => w !== 'Vídeo Estilo Viral' && w !== 'Anúncio E-commerce'
          );
          return cleaned;
        }
      }
    } catch {
      // Fallback
    }
    return [];
  });

  const handleAddWorkflow = (newWorkflowName: string) => {
    const trimmed = newWorkflowName.trim();
    if (!trimmed || savedWorkflows.includes(trimmed)) return;
    const updated = [...savedWorkflows, trimmed];
    setSavedWorkflows(updated);
    localStorage.setItem(WORKFLOWS_STORAGE_KEY, JSON.stringify(updated));
    showNotification(`Workflow "${trimmed}" criado!`);
  };

  const handleImportWorkflows = (importedWorkflows: string[], mode?: 'replace' | 'merge') => {
    if (mode === 'replace') {
      const unique = Array.from(new Set(importedWorkflows));
      setSavedWorkflows(unique);
      localStorage.setItem(WORKFLOWS_STORAGE_KEY, JSON.stringify(unique));
    } else {
      setSavedWorkflows((prev) => {
        const merged = Array.from(new Set([...prev, ...importedWorkflows]));
        localStorage.setItem(WORKFLOWS_STORAGE_KEY, JSON.stringify(merged));
        return merged;
      });
    }
  };

  const handleDeleteWorkflow = (workflowName: string) => {
    const updated = savedWorkflows.filter((w) => w !== workflowName);
    setSavedWorkflows(updated);
    localStorage.setItem(WORKFLOWS_STORAGE_KEY, JSON.stringify(updated));
    if (activeWorkflowFilter === workflowName) {
      setActiveWorkflowFilter(null);
    }
    setPrompts((prevPrompts) => {
      const updatedPrompts = prevPrompts.map((p) =>
        p.workflow === workflowName ? { ...p, workflow: undefined, workflowOrder: undefined } : p
      );
      localStorage.setItem(PROMPTS_STORAGE_KEY, JSON.stringify(updatedPrompts));
      return updatedPrompts;
    });
    showNotification(`Workflow "${workflowName}" removido.`);
  };

  // Active Workflow Filter (null = show normal media filter, string = show only that workflow sorted by step)
  const [activeWorkflowFilter, setActiveWorkflowFilter] = useState<string | null>(null);
  const [isWorkflowDropdownOpen, setIsWorkflowDropdownOpen] = useState(false);
  const workflowDropdownRef = useRef<HTMLDivElement>(null);

  // Close workflow dropdown on outside click
  useEffect(() => {
    if (!isWorkflowDropdownOpen) return;
    const handleGlobalClick = (e: MouseEvent) => {
      if (workflowDropdownRef.current && !workflowDropdownRef.current.contains(e.target as Node)) {
        setIsWorkflowDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleGlobalClick);
    return () => document.removeEventListener('mousedown', handleGlobalClick);
  }, [isWorkflowDropdownOpen]);

  // Active Project Filter on Tasks Page (Black / Business view)
  const [activeProjectFilter, setActiveProjectFilter] = useState<string | null>(null);
  const [isProjectDropdownOpen, setIsProjectDropdownOpen] = useState(false);
  const projectDropdownRef = useRef<HTMLDivElement>(null);

  // Close project dropdown on outside click
  useEffect(() => {
    if (!isProjectDropdownOpen) return;
    const handleGlobalClick = (e: MouseEvent) => {
      if (projectDropdownRef.current && !projectDropdownRef.current.contains(e.target as Node)) {
        setIsProjectDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleGlobalClick);
    return () => document.removeEventListener('mousedown', handleGlobalClick);
  }, [isProjectDropdownOpen]);

  // Task Category: 'business' (Briefcase) as default, vs 'daily' (User)
  const [taskCategory, setTaskCategory] = useState<TaskCategoryType>(() => {
    try {
      const saved = localStorage.getItem(TASK_TYPE_STORAGE_KEY);
      if (saved === 'business' || saved === 'daily') return saved;
    } catch {
      // Fallback
    }
    return 'business';
  });

  const handleToggleTaskCategory = () => {
    const nextCategory: TaskCategoryType = taskCategory === 'business' ? 'daily' : 'business';
    setTaskCategory(nextCategory);
    setLastResetCheckedTaskIds(null);
    try {
      localStorage.setItem(TASK_TYPE_STORAGE_KEY, nextCategory);
    } catch {
      // Fallback
    }
  };

  // Stores task IDs that had their check removed, allowing one-click restore if clicked again
  const [lastResetCheckedTaskIds, setLastResetCheckedTaskIds] = useState<string[] | null>(null);

  // Reset checks for tasks of current category (with undo toggle)
  const handleResetCurrentCategoryChecks = () => {
    // If user already clicked and un-checked tasks, clicking again restores those checks!
    if (lastResetCheckedTaskIds && lastResetCheckedTaskIds.length > 0) {
      const restoreSet = new Set(lastResetCheckedTaskIds);
      setTasks((prevTasks) => {
        const updated = prevTasks.map((t) => {
          if (restoreSet.has(t.id)) {
            return { ...t, completed: true };
          }
          return t;
        });
        localStorage.setItem(TASKS_STORAGE_KEY, JSON.stringify(updated));
        return updated;
      });
      setLastResetCheckedTaskIds(null);
      showNotification('Checks restaurados!');
      return;
    }

    // Find currently completed tasks in this category
    const completedIds = tasks
      .filter((t) => (t.taskType || 'business') === taskCategory && t.completed)
      .map((t) => t.id);

    if (completedIds.length === 0) {
      showNotification('Nenhuma tarefa marcada para desmarcar.');
      return;
    }

    setTasks((prevTasks) => {
      const updated = prevTasks.map((t) => {
        const type = t.taskType || 'business';
        if (type === taskCategory && t.completed) {
          return { ...t, completed: false };
        }
        return t;
      });
      localStorage.setItem(TASKS_STORAGE_KEY, JSON.stringify(updated));
      return updated;
    });

    setLastResetCheckedTaskIds(completedIds);
    showNotification('Checks desmarcados! Clique novamente para restaurar.');
  };

  // Move a task immediately to today
  const handleMoveTaskToToday = (taskId: string) => {
    const today = getTodayIso();
    setTasks((prevTasks) => {
      const updated = prevTasks.map((t) => (t.id === taskId ? { ...t, date: today } : t));
      localStorage.setItem(TASKS_STORAGE_KEY, JSON.stringify(updated));
      return updated;
    });
    showNotification('Tarefa colocada no dia de hoje!');
  };

  // Prompts State
  const [prompts, setPrompts] = useState<PromptItem[]>(() => {
    try {
      const saved = localStorage.getItem(PROMPTS_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch {
      // Fallback
    }
    return [];
  });

  // Tasks State - automatically filtered to [-2 days, +7 days]
  const [tasks, setTasks] = useState<TaskItem[]>(() => {
    try {
      const saved = localStorage.getItem(TASKS_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          const normalized: TaskItem[] = parsed.map((t: TaskItem) => {
            const isDaily = t.taskType === 'daily' || (!t.date && !t.project);
            return {
              ...t,
              taskType: isDaily ? 'daily' : (t.taskType || 'business'),
              project: isDaily ? undefined : t.project,
              date: isDaily ? '' : (t.date || ''),
            };
          });

          // Se não houver nenhuma tarefa diária cadastrada, adiciona as diárias padrão
          const hasDaily = normalized.some((t: TaskItem) => t.taskType === 'daily');
          if (!hasDaily) {
            normalized.push(
              {
                id: 'task-daily-1',
                title: 'Responder mensagens e emails prioritários',
                date: '',
                completed: false,
                taskType: 'daily',
              },
              {
                id: 'task-daily-2',
                title: 'Alinhar entregas da esteira de produção',
                date: '',
                completed: false,
                taskType: 'daily',
              }
            );
          }

          return filterTasksWithinWindow(normalized);
        }
      }
    } catch {
      // Fallback
    }
    return filterTasksWithinWindow(INITIAL_TASKS);
  });

  // Automatically prune tasks outside the [-2 days, +7 days] window on startup
  useEffect(() => {
    setTasks((prev) => {
      const pruned = filterTasksWithinWindow(prev);
      if (pruned.length !== prev.length) {
        localStorage.setItem(TASKS_STORAGE_KEY, JSON.stringify(pruned));
      }
      return pruned;
    });
  }, []);

  const isTasks = currentPage === 'tasks';
  const isPrompts = currentPage === 'prompts';
  const isWorkspace = currentPage === 'workspace';
  const isFuel = currentPage === 'fuel';

  // --- Meals & Fuel State with Cookies + LocalStorage synchronization ---
  const [meals, setMeals] = useState<MealItem[]>(() => {
    try {
      const stored = persistentStorage.getItem(MEALS_STORAGE_KEY);
      if (stored) return JSON.parse(stored);
    } catch (e) {
      console.error(e);
    }
    return INITIAL_MEALS;
  });

  const [baseCalorieGoal, setBaseCalorieGoal] = useState<number>(() => {
    try {
      const stored = persistentStorage.getItem(CALORIE_GOAL_STORAGE_KEY);
      if (stored) return Number(stored) || 1800;
    } catch (e) {
      console.error(e);
    }
    return 1800;
  });

  const [selectedFuelDate, setSelectedFuelDate] = useState<string>(getTodayIso());

  // Detect mobile view (< 640px)
  const [isMobile, setIsMobile] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      return window.innerWidth < 640;
    }
    return false;
  });

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 640);
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const [fuelData, setFuelData] = useState<Record<string, DayFuelData>>(() => {
    try {
      const stored = persistentStorage.getItem(FUEL_DATA_STORAGE_KEY);
      if (stored) return JSON.parse(stored);
    } catch (e) {
      console.error(e);
    }
    return {};
  });

  const saveMeals = (updated: MealItem[]) => {
    setMeals(updated);
    persistentStorage.setItem(MEALS_STORAGE_KEY, JSON.stringify(updated));
  };

  const handleAddMeal = (newMealData: Omit<MealItem, 'id'>) => {
    const newMeal: MealItem = {
      ...newMealData,
      id: `meal-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    };
    saveMeals([newMeal, ...meals]);
  };

  const handleUpdateMeal = (updatedMeal: MealItem) => {
    const updated = meals.map((m) => (m.id === updatedMeal.id ? updatedMeal : m));
    saveMeals(updated);
  };

  const handleDeleteMeal = (id: string) => {
    const updated = meals.filter((m) => m.id !== id);
    saveMeals(updated);
    showNotification('Refeição excluída');
  };

  const handleClearDayMeals = (date: string) => {
    const updated = meals.filter((m) => m.date !== date);
    saveMeals(updated);
  };

  const handleUpdateBaseGoal = (newGoal: number) => {
    setBaseCalorieGoal(newGoal);
    persistentStorage.setItem(CALORIE_GOAL_STORAGE_KEY, String(newGoal));
  };

  const handleUpdateDayFuel = (date: string, data: Partial<DayFuelData>) => {
    setFuelData((prev) => {
      const existing = prev[date] || {
        date,
        calorieGoal: baseCalorieGoal,
        waterMl: 1200,
        waterGoalMl: 2000,
        steps: 1750,
        stepsGoal: 8000,
      };
      const updated = {
        ...prev,
        [date]: {
          ...existing,
          ...data,
        },
      };
      persistentStorage.setItem(FUEL_DATA_STORAGE_KEY, JSON.stringify(updated));
      return updated;
    });
  };

  const handleImportFuel = (
    importedMeals: MealItem[],
    importedFuelData: Record<string, DayFuelData>,
    importedBaseGoal: number,
    mode: 'replace' | 'merge'
  ) => {
    if (mode === 'replace') {
      saveMeals(importedMeals);
      setFuelData(importedFuelData);
      persistentStorage.setItem(FUEL_DATA_STORAGE_KEY, JSON.stringify(importedFuelData));
      if (importedBaseGoal > 0) {
        handleUpdateBaseGoal(importedBaseGoal);
      }
    } else {
      const mergedMealsMap = new Map<string, MealItem>();
      importedMeals.forEach((m) => mergedMealsMap.set(m.id, m));
      meals.forEach((m) => mergedMealsMap.set(m.id, m));
      saveMeals(Array.from(mergedMealsMap.values()));

      const mergedFuel = { ...fuelData, ...importedFuelData };
      setFuelData(mergedFuel);
      persistentStorage.setItem(FUEL_DATA_STORAGE_KEY, JSON.stringify(mergedFuel));
      if (importedBaseGoal > 0 && (!baseCalorieGoal || baseCalorieGoal === 1800)) {
        handleUpdateBaseGoal(importedBaseGoal);
      }
    }
  };

  // WhatsApp Share Handler
  const handleShareWhatsApp = () => {
    const dateStr = selectedFuelDate;
    const [year, month, day] = dateStr.split('-').map(Number);
    const d = new Date(year, month - 1, day);
    const days = [
      'Domingo',
      'Segunda-feira',
      'Terça-feira',
      'Quarta-feira',
      'Quinta-feira',
      'Sexta-feira',
      'Sábado',
    ];
    const dayName = days[d.getDay()] || 'Dia';
    const shortDate = `${String(day).padStart(2, '0')}/${String(month).padStart(2, '0')}`;

    const dayMeals = meals.filter((m) => m.date === dateStr);
    const consumed = dayMeals.reduce((acc, m) => acc + (Number(m.calories) || 0), 0);
    const dayFuel = fuelData[dateStr] || {};
    const isWorkout = Boolean(dayFuel.workoutDone);
    const isCardio = Boolean(dayFuel.cardioDone);
    const burned = (isWorkout ? 210 : 0) + (isCardio ? 200 : 0);
    const net = Math.max(0, consumed - burned);
    const deficit = (baseCalorieGoal || 1800) - net;

    const lines = [
      `Dia da semana: ${dayName} (${shortDate})`,
      `Kcal consumidas: ${consumed} kcal`,
      `Defict: ${deficit} kcal`,
    ];

    if (isWorkout) {
      lines.push('Treino: Realizado (-210 kcal)');
    }
    if (isCardio) {
      lines.push('Cardio: Realizado (-200 kcal)');
    }

    const message = lines.join('\n');
    try {
      if (navigator.clipboard) {
        navigator.clipboard.writeText(message);
      }
    } catch {}

    window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(message)}`, '_blank');
    showNotification('Compartilhando no WhatsApp...');
  };

  // 7-day bar state for tasks: default is today!
  const [selectedTaskDate, setSelectedTaskDate] = useState<string>(getTodayIso());

  // Prompts filters & Search State
  const [activeMediaFilter, setActiveMediaFilter] = useState<'imagem' | 'video'>('imagem');
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const searchContainerRef = useRef<HTMLDivElement>(null);

  // Click outside to collapse search bar back to normal icon
  useEffect(() => {
    if (!isSearchOpen) return;
    const handleGlobalClick = (e: MouseEvent) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(e.target as Node)) {
        setIsSearchOpen(false);
      }
    };
    document.addEventListener('mousedown', handleGlobalClick);
    return () => document.removeEventListener('mousedown', handleGlobalClick);
  }, [isSearchOpen]);

  // Modals state
  const [activePrompt, setActivePrompt] = useState<PromptItem | null>(null);
  const [isNewPromptOpen, setIsNewPromptOpen] = useState(false);
  const [editingPrompt, setEditingPrompt] = useState<PromptItem | null>(null);

  const [isNewTaskOpen, setIsNewTaskOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<TaskItem | null>(null);

  const [isBackupOpen, setIsBackupOpen] = useState(false);
  const [notification, setNotification] = useState<string | null>(null);
  const [hoveredCardId, setHoveredCardId] = useState<string | null>(null);
  const [cloudActive, setCloudActive] = useState(false);

  // AI Agent on Welcome Page
  const [agentPrompt, setAgentPrompt] = useState('');
  const [isAgentLoading, setIsAgentLoading] = useState(false);
  const [agentSelectedProject, setAgentSelectedProject] = useState<string | null>(null);
  const [agentSelectedDate, setAgentSelectedDate] = useState<string>(getTodayIso());
  const agentDateInputRef = useRef<HTMLInputElement>(null);

  // Flashlight hover effect for the AI Agent input box (matching PromptCard)
  const agentBoxRef = useRef<HTMLDivElement>(null);
  const [agentBoxMouse, setAgentBoxMouse] = useState({
    x: 0,
    y: 0,
    isInteracting: false,
  });

  const handleAgentBoxMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!agentBoxRef.current) return;
    const rect = agentBoxRef.current.getBoundingClientRect();
    setAgentBoxMouse({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
      isInteracting: true,
    });
  };

  const handleAgentBoxMouseLeave = () => {
    setAgentBoxMouse((prev) => ({ ...prev, isInteracting: false }));
  };

  // Sucesso na adição de tarefa (anima a seta para check)
  const [isAgentSuccess, setIsAgentSuccess] = useState(false);

  // Drag and drop state for reordering (prompts)
  const [draggingPromptId, setDraggingPromptId] = useState<string | null>(null);
  const [dragOverPromptId, setDragOverPromptId] = useState<string | null>(null);

  // Drag and drop state for reordering (tasks)
  const [draggingTaskId, setDraggingTaskId] = useState<string | null>(null);
  const [dragOverTaskId, setDragOverTaskId] = useState<string | null>(null);

  // Navigation with directional slide animation
  const handleNavigate = (targetPage: PageKey) => {
    if (targetPage === currentPage) return;
    const direction = PAGE_INDEX_MAP[targetPage] > PAGE_INDEX_MAP[currentPage] ? 1 : -1;
    setPageDirection(direction);
    setCurrentPage(targetPage);
    setSearchQuery('');
  };

  // Sync prompts to storage
  const savePrompts = (updated: PromptItem[]) => {
    setPrompts(updated);
    localStorage.setItem(PROMPTS_STORAGE_KEY, JSON.stringify(updated));
  };

  // Sync tasks to storage (strictly within -2 days and +7 days)
  const saveTasks = (updated: TaskItem[]) => {
    const pruned = filterTasksWithinWindow(updated);
    setTasks(pruned);
    localStorage.setItem(TASKS_STORAGE_KEY, JSON.stringify(pruned));
  };

  const showNotification = (msg: string) => {
    setNotification(msg);
    setTimeout(() => {
      setNotification(null);
    }, 2000); // 2 segundos conforme solicitado
  };

  // --- Direct Task Submit Handler (Caminho Reto - Criação Direta Instantânea) ---
  const handleAgentSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const query = agentPrompt.trim();
    if (!query) {
      document.getElementById('ai-agent-input')?.focus();
      return;
    }

    let title = query;
    let notes: string | undefined = undefined;

    // Se tiver quebra de linha, primeira linha é título, demais são observações
    const lines = query.split('\n').filter((l) => l.trim().length > 0);
    if (lines.length > 1) {
      title = lines[0].trim();
      notes = lines.slice(1).join('\n').trim();
    } else {
      const obsMatch = query.match(/(.+?)(?:\s+[-–—]\s*|\s+)obs:\s*(.+)/i);
      if (obsMatch) {
        title = obsMatch[1].trim();
        notes = obsMatch[2].trim();
      }
    }

    const taskProject = agentSelectedProject || undefined;
    const taskDate = agentSelectedDate || getTodayIso();

    const newTaskItem: TaskItem = {
      id: `task-${Date.now()}`,
      title,
      taskType: 'business',
      project: taskProject,
      date: taskDate,
      notes,
      completed: false,
    };

    // Se o projeto foi digitado/especificado e ainda não existe nos salvos, adiciona
    if (taskProject && !savedProjects.includes(taskProject)) {
      const updatedProjects = [...savedProjects, taskProject];
      setSavedProjects(updatedProjects);
      localStorage.setItem(PROJECTS_STORAGE_KEY, JSON.stringify(updatedProjects));
    }

    const updatedTasks = [newTaskItem, ...tasks];
    saveTasks(updatedTasks);

    // Sucesso instantâneo: animação elástica do check verde por 2s
    setIsAgentSuccess(true);
    setTimeout(() => {
      setIsAgentSuccess(false);
    }, 2000);

    setAgentPrompt('');
    setAgentSelectedProject(null);
  };

  // --- Prompts Handlers ---
  const handleOpenNewPrompt = () => {
    setEditingPrompt(null);
    setIsNewPromptOpen(true);
  };

  const handleOpenEditPrompt = (promptToEdit: PromptItem) => {
    setEditingPrompt(promptToEdit);
    setIsNewPromptOpen(true);
  };

  const handleSavePrompt = (savedPrompt: PromptItem) => {
    const exists = prompts.some((p) => p.id === savedPrompt.id);
    let updated: PromptItem[];
    if (exists) {
      updated = prompts.map((p) => (p.id === savedPrompt.id ? savedPrompt : p));
      showNotification(`Prompt "${savedPrompt.title}" atualizado!`);
    } else {
      updated = [savedPrompt, ...prompts];
      showNotification(`Prompt "${savedPrompt.title}" criado!`);
    }
    savePrompts(updated);

    if (activePrompt && activePrompt.id === savedPrompt.id) {
      setActivePrompt(savedPrompt);
    }
  };

  const handleDeletePrompt = (id: string) => {
    const updated = prompts.filter((p) => p.id !== id);
    savePrompts(updated);
    showNotification('Prompt removido.');
    if (activePrompt && activePrompt.id === id) {
      setActivePrompt(null);
    }
  };

  // --- Tasks Handlers ---
  const handleOpenNewTask = () => {
    setEditingTask(null);
    setIsNewTaskOpen(true);
  };

  const handleOpenEditTask = (taskToEdit: TaskItem) => {
    setEditingTask(taskToEdit);
    setIsNewTaskOpen(true);
  };

  const handleToggleCompleteTask = (id: string) => {
    const updated = tasks.map((t) =>
      t.id === id ? { ...t, completed: !t.completed } : t
    );
    saveTasks(updated);
  };

  const handleSaveTask = (savedTask: TaskItem) => {
    const exists = tasks.some((t) => t.id === savedTask.id);
    let updated: TaskItem[];
    if (exists) {
      updated = tasks.map((t) => (t.id === savedTask.id ? savedTask : t));
      showNotification(`Tarefa "${savedTask.title}" atualizada!`);
    } else {
      updated = [savedTask, ...tasks];
      showNotification(`Tarefa "${savedTask.title}" criada!`);
    }
    saveTasks(updated);
  };

  const handleDeleteTask = (id: string) => {
    const updated = tasks.filter((t) => t.id !== id);
    saveTasks(updated);
    showNotification('Tarefa removida.');
    if (editingTask && editingTask.id === id) {
      setEditingTask(null);
    }
  };

  // Generalized + button handler based on active page
  const handleHeaderPlusClick = () => {
    if (isTasks) {
      handleOpenNewTask();
    } else {
      handleOpenNewPrompt();
    }
  };

  // Cloud backup
  const handleOpenBackup = () => {
    setCloudActive(true);
    setTimeout(() => {
      setIsBackupOpen(true);
      setCloudActive(false);
    }, 350);
  };

  const handleImportPrompts = (imported: PromptItem[], mode: 'replace' | 'merge') => {
    let updated: PromptItem[];
    if (mode === 'replace') {
      updated = imported;
    } else {
      const existingIds = new Set(prompts.map((p) => p.id));
      const newItems = imported.filter((item) => !existingIds.has(item.id));
      updated = [...newItems, ...prompts];
    }
    savePrompts(updated);
    showNotification(`${imported.length} prompts sincronizados!`);
  };

  const handleImportTasks = (imported: TaskItem[], mode: 'replace' | 'merge') => {
    let updated: TaskItem[];
    if (mode === 'replace') {
      const hasDailyInImport = imported.some((t) => t.taskType === 'daily');
      if (!hasDailyInImport) {
        const existingDaily = tasks.filter((t) => t.taskType === 'daily');
        updated = [...existingDaily, ...imported];
      } else {
        updated = imported;
      }
    } else {
      const existingIds = new Set(tasks.map((t) => t.id));
      const newItems = imported.filter((item) => !existingIds.has(item.id));
      updated = [...newItems, ...tasks];
    }
    saveTasks(updated);
    showNotification(`${imported.length} tarefas sincronizadas!`);
  };

  const handleImportAll = (
    importedPrompts: PromptItem[],
    importedTasks: TaskItem[],
    mode: 'replace' | 'merge'
  ) => {
    let updatedPrompts: PromptItem[];
    if (mode === 'replace') {
      updatedPrompts = importedPrompts;
    } else {
      const existingIds = new Set(prompts.map((p) => p.id));
      const newItems = importedPrompts.filter((item) => !existingIds.has(item.id));
      updatedPrompts = [...newItems, ...prompts];
    }
    savePrompts(updatedPrompts);

    let updatedTasks: TaskItem[];
    if (mode === 'replace') {
      const hasDailyInImport = importedTasks.some((t) => t.taskType === 'daily');
      if (!hasDailyInImport) {
        const existingDaily = tasks.filter((t) => t.taskType === 'daily');
        updatedTasks = [...existingDaily, ...importedTasks];
      } else {
        updatedTasks = importedTasks;
      }
    } else {
      const existingIds = new Set(tasks.map((t) => t.id));
      const newItems = importedTasks.filter((item) => !existingIds.has(item.id));
      updatedTasks = [...newItems, ...tasks];
    }
    saveTasks(updatedTasks);

    showNotification(`${importedPrompts.length} prompts e ${importedTasks.length} tarefas sincronizados!`);
  };

  // --- Prompts Drag & Drop ---
  const handlePromptDragStart = (e: React.DragEvent, id: string) => {
    setDraggingPromptId(id);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', id);
  };

  const handlePromptDragOver = (e: React.DragEvent, id: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (dragOverPromptId !== id) {
      setDragOverPromptId(id);
    }
  };

  const handlePromptDrop = (e: React.DragEvent, targetId: string) => {
    e.preventDefault();
    if (!draggingPromptId || draggingPromptId === targetId) {
      setDraggingPromptId(null);
      setDragOverPromptId(null);
      return;
    }

    const fromIndex = prompts.findIndex((p) => p.id === draggingPromptId);
    const toIndex = prompts.findIndex((p) => p.id === targetId);

    if (fromIndex !== -1 && toIndex !== -1) {
      const updated = [...prompts];
      const [movedItem] = updated.splice(fromIndex, 1);
      updated.splice(toIndex, 0, movedItem);
      savePrompts(updated);
      showNotification('Ordem dos prompts atualizada!');
    }

    setDraggingPromptId(null);
    setDragOverPromptId(null);
  };

  // --- Tasks Drag & Drop ---
  const handleTaskDragStart = (e: React.DragEvent, id: string) => {
    setDraggingTaskId(id);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', id);
  };

  const handleTaskDragOver = (e: React.DragEvent, id: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (dragOverTaskId !== id) {
      setDragOverTaskId(id);
    }
  };

  const handleTaskDrop = (e: React.DragEvent, targetId: string) => {
    e.preventDefault();
    if (!draggingTaskId || draggingTaskId === targetId) {
      setDraggingTaskId(null);
      setDragOverTaskId(null);
      return;
    }

    const fromIndex = tasks.findIndex((t) => t.id === draggingTaskId);
    const toIndex = tasks.findIndex((t) => t.id === targetId);

    if (fromIndex !== -1 && toIndex !== -1) {
      const updated = [...tasks];
      const [movedItem] = updated.splice(fromIndex, 1);
      updated.splice(toIndex, 0, movedItem);
      saveTasks(updated);
      showNotification('Ordem das tarefas atualizada!');
    }

    setDraggingTaskId(null);
    setDragOverTaskId(null);
  };

  // Filtered prompts
  const filteredPrompts = useMemo(() => {
    let list = prompts.filter((item) => {
      if (activeWorkflowFilter) {
        const itemWfs =
          item.workflows && item.workflows.length > 0
            ? item.workflows
            : item.workflow
            ? [item.workflow]
            : [];
        if (!itemWfs.includes(activeWorkflowFilter)) return false;
      } else {
        const matchesMedia = item.mediaType === activeMediaFilter;
        if (!matchesMedia) return false;
      }

      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        item.title.toLowerCase().includes(q) ||
        item.description.toLowerCase().includes(q) ||
        item.template.toLowerCase().includes(q) ||
        (item.tags && item.tags.some((t) => t.toLowerCase().includes(q))) ||
        (item.workflow && item.workflow.toLowerCase().includes(q)) ||
        (item.workflows && item.workflows.some((w) => w.toLowerCase().includes(q)));

      return matchesSearch;
    });

    if (activeWorkflowFilter) {
      list = [...list].sort((a, b) => {
        const orderA =
          a.workflowSteps?.[activeWorkflowFilter] ??
          (a.workflow === activeWorkflowFilter ? a.workflowOrder : undefined) ??
          9999;
        const orderB =
          b.workflowSteps?.[activeWorkflowFilter] ??
          (b.workflow === activeWorkflowFilter ? b.workflowOrder : undefined) ??
          9999;
        return orderA - orderB;
      });
    }

    return list;
  }, [prompts, activeMediaFilter, activeWorkflowFilter, searchQuery]);

  // Sequence navigation for PromptModal
  const activePromptIndex = useMemo(() => {
    if (!activePrompt) return -1;
    return filteredPrompts.findIndex((p) => p.id === activePrompt.id);
  }, [activePrompt, filteredPrompts]);

  const hasPrevPrompt = activePromptIndex > 0;
  const hasNextPrompt =
    activePromptIndex !== -1 && activePromptIndex < filteredPrompts.length - 1;

  const handlePrevPrompt = () => {
    if (hasPrevPrompt) {
      setActivePrompt(filteredPrompts[activePromptIndex - 1]);
    }
  };

  const handleNextPrompt = () => {
    if (hasNextPrompt) {
      setActivePrompt(filteredPrompts[activePromptIndex + 1]);
    }
  };

  // Filtered tasks (filtered by taskCategory and date; completed tasks descend to bottom automatically)
  const filteredTasks = useMemo(() => {
    const list = tasks.filter((item) => {
      const matchesCategory = (item.taskType || 'business') === taskCategory;
      // Tarefas diárias não têm data e nunca devem filtrar por data — aparecem todas!
      const matchesDate =
        taskCategory === 'daily'
          ? true
          : selectedTaskDate === 'all' || item.date === selectedTaskDate;
      const matchesProject =
        taskCategory === 'daily' || !activeProjectFilter
          ? true
          : item.project === activeProjectFilter;
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        item.title.toLowerCase().includes(q) ||
        (item.project && item.project.toLowerCase().includes(q)) ||
        (item.taskType === 'daily' && 'daily'.includes(q));

      return matchesCategory && matchesDate && matchesProject && matchesSearch;
    });

    // Sort: incomplete tasks first, completed tasks move to the bottom
    return [...list].sort((a, b) => {
      if (!!a.completed === !!b.completed) return 0;
      return a.completed ? 1 : -1;
    });
  }, [tasks, selectedTaskDate, taskCategory, searchQuery, activeProjectFilter]);

  return (
    <div className="min-h-screen bg-[#0e0e0e] text-[#ececec] flex flex-col selection:bg-[#333338] selection:text-white font-sans antialiased overflow-x-hidden">
      {/* Toast notification */}
      {notification && (
        <div
          id="toast-notification"
          className="fixed top-5 right-5 z-50 flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-[#141416] border border-[#26262b] shadow-[0_10px_30px_rgba(0,0,0,0.8)] text-xs font-medium text-white animate-in fade-in slide-in-from-top-2 duration-200"
        >
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
          <span>{notification}</span>
        </div>
      )}

      {/* Main Minimalist Header (Compact on mobile / Fuel view) */}
      <header className={`w-full ${isMobile ? 'pt-4 pb-2 px-4' : 'pt-16 sm:pt-20 pb-4 px-6 sm:px-10'} max-w-7xl mx-auto flex flex-col`}>
        <div className="flex items-center justify-between border-b border-[#1c1c1f] pb-3 pt-1">
          {/* Left: Media Filters on Prompts; blank/clean on Tasks & Workspace */}
          <div className="relative flex items-center gap-1.5 min-h-[36px]">
            {isPrompts ? (
              <>
                <button
                  type="button"
                  id="filter-btn-image"
                  onClick={() => {
                    setActiveWorkflowFilter(null);
                    setActiveMediaFilter('imagem');
                  }}
                  className={`relative isolate flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer select-none ${
                    !activeWorkflowFilter && activeMediaFilter === 'imagem'
                      ? 'text-white'
                      : 'text-zinc-400 hover:text-zinc-200'
                  }`}
                  title="Ver prompts de Imagem"
                >
                  {!activeWorkflowFilter && activeMediaFilter === 'imagem' && (
                    <motion.div
                      layoutId="main-media-filter-active"
                      transition={{ type: 'spring', stiffness: 450, damping: 35 }}
                      className="absolute inset-0 bg-[#202026] border border-[#484856] rounded-lg shadow-sm z-0 pointer-events-none"
                    />
                  )}
                  <ImageIcon className={`relative z-10 w-3.5 h-3.5 ${!activeWorkflowFilter && activeMediaFilter === 'imagem' ? 'text-white' : 'text-zinc-400'}`} />
                  <span className="relative z-10">Imagem</span>
                </button>

                <button
                  type="button"
                  id="filter-btn-video"
                  onClick={() => {
                    setActiveWorkflowFilter(null);
                    setActiveMediaFilter('video');
                  }}
                  className={`relative isolate flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer select-none ${
                    !activeWorkflowFilter && activeMediaFilter === 'video'
                      ? 'text-blue-400 font-semibold'
                      : 'text-zinc-400 hover:text-zinc-200'
                  }`}
                  title="Ver prompts de Vídeo"
                >
                  {!activeWorkflowFilter && activeMediaFilter === 'video' && (
                    <motion.div
                      layoutId="main-media-filter-active"
                      transition={{ type: 'spring', stiffness: 450, damping: 35 }}
                      className="absolute inset-0 bg-blue-500/15 border border-blue-500/40 rounded-lg shadow-[0_0_14px_rgba(59,130,246,0.2)] z-0 pointer-events-none"
                    />
                  )}
                  <Video className={`relative z-10 w-3.5 h-3.5 ${!activeWorkflowFilter && activeMediaFilter === 'video' ? 'text-blue-400' : 'text-zinc-400'}`} />
                  <span className="relative z-10">Vídeo</span>
                </button>

                {/* Seletor de Workflow no Header: Dropdown elegante acionado por hover/click, sem ícone de camadas */}
                {savedWorkflows.length > 0 && (
                  <>
                    <div className="w-[1px] h-4 bg-[#232328] mx-0.5 shrink-0" />
                    <div
                      ref={workflowDropdownRef}
                      className="relative"
                      onMouseEnter={() => setIsWorkflowDropdownOpen(true)}
                    >
                      <button
                        type="button"
                        id="workflow-dropdown-trigger"
                        onClick={() => setIsWorkflowDropdownOpen((prev) => !prev)}
                        className={`relative isolate flex items-center px-3 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer select-none shrink-0 ${
                          activeWorkflowFilter
                            ? 'text-white font-semibold'
                            : 'text-zinc-400 hover:text-zinc-200'
                        }`}
                        title="Filtrar por workflow"
                      >
                        {activeWorkflowFilter && (
                          <motion.div
                            layoutId="main-media-filter-active"
                            transition={{ type: 'spring', stiffness: 450, damping: 35 }}
                            className="absolute inset-0 bg-[#202026] border border-[#484856] rounded-lg shadow-sm z-0 pointer-events-none"
                          />
                        )}
                        <span className="relative z-10 truncate max-w-[140px]">
                          {activeWorkflowFilter || 'Todos'}
                        </span>
                      </button>

                      {/* Dropdown Menu com lista vertical */}
                      <AnimatePresence>
                        {isWorkflowDropdownOpen && (
                          <motion.div
                            initial={{ opacity: 0, y: 6, scale: 0.96 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: 4, scale: 0.96 }}
                            transition={{ duration: 0.16, ease: 'easeOut' }}
                            className="absolute top-full left-0 mt-1.5 z-50 min-w-[200px] p-1.5 rounded-xl bg-[#0e0e11] border border-[#24242c] shadow-[0_16px_36px_rgba(0,0,0,0.95)] backdrop-blur-md"
                          >
                            {/* Opção Todos no topo, separada */}
                            <button
                              type="button"
                              id="wf-option-all"
                              onClick={() => {
                                setActiveWorkflowFilter(null);
                                setIsWorkflowDropdownOpen(false);
                              }}
                              className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition-colors cursor-pointer text-left ${
                                activeWorkflowFilter === null
                                  ? 'bg-zinc-800/90 text-white font-semibold'
                                  : 'text-zinc-400 hover:text-zinc-200 hover:bg-[#18181f]'
                              }`}
                            >
                              <span>Todos</span>
                              {activeWorkflowFilter === null && (
                                <CheckCircle2 className="w-3.5 h-3.5 text-zinc-300" />
                              )}
                            </button>

                            {/* Linha separadora */}
                            <div className="w-full h-[1px] bg-[#22222a] my-1" />

                            {/* Lista dos workflows cadastrados: um embaixo do outro */}
                            <div className="flex flex-col gap-0.5 max-h-60 overflow-y-auto pr-0.5">
                              {savedWorkflows.map((wf) => {
                                const isSelected = activeWorkflowFilter === wf;
                                return (
                                  <button
                                    key={wf}
                                    type="button"
                                    id={`wf-option-${wf.toLowerCase().replace(/\s+/g, '-')}`}
                                    onClick={() => {
                                      setActiveWorkflowFilter(wf);
                                      setIsWorkflowDropdownOpen(false);
                                    }}
                                    className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition-colors cursor-pointer text-left ${
                                      isSelected
                                        ? 'bg-zinc-800/90 text-white font-semibold'
                                        : 'text-zinc-400 hover:text-zinc-200 hover:bg-[#18181f]'
                                    }`}
                                  >
                                    <span className="truncate pr-2">{wf}</span>
                                    {isSelected && (
                                      <CheckCircle2 className="w-3.5 h-3.5 text-zinc-300 shrink-0" />
                                    )}
                                  </button>
                                );
                              })}
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  </>
                )}
              </>
            ) : isTasks && taskCategory === 'business' ? (
              /* Seletor de Projetos no Header da página de Tarefas (apenas na view Black / Negócios, oculto nas Diárias) */
              <div
                ref={projectDropdownRef}
                className="relative"
                onMouseEnter={() => setIsProjectDropdownOpen(true)}
              >
                <button
                  type="button"
                  id="tasks-project-dropdown-trigger"
                  onClick={() => setIsProjectDropdownOpen((prev) => !prev)}
                  className={`relative isolate flex items-center px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-200 cursor-pointer select-none shrink-0 border ${
                    activeProjectFilter
                      ? 'bg-[#202026] border-[#484856] text-white font-semibold shadow-sm'
                      : 'bg-[#141418] border-[#272730] hover:border-[#383844] text-zinc-300 hover:text-white shadow-sm'
                  }`}
                  title="Filtrar por projeto"
                >
                  <span className="relative z-10 truncate max-w-[140px]">
                    {activeProjectFilter || 'Projetos'}
                  </span>
                </button>

                {/* Dropdown Menu com lista vertical de projetos */}
                <AnimatePresence>
                  {isProjectDropdownOpen && (
                    <motion.div
                      initial={{ opacity: 0, y: 6, scale: 0.96 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 4, scale: 0.96 }}
                      transition={{ duration: 0.16, ease: 'easeOut' }}
                      className="absolute top-full left-0 mt-1.5 z-50 min-w-[200px] p-1.5 rounded-xl bg-[#0e0e11] border border-[#24242c] shadow-[0_16px_36px_rgba(0,0,0,0.95)] backdrop-blur-md"
                    >
                      {/* Opção Todos os projetos no topo */}
                      <button
                        type="button"
                        id="tasks-project-option-all"
                        onClick={() => {
                          setActiveProjectFilter(null);
                          setIsProjectDropdownOpen(false);
                        }}
                        className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition-colors cursor-pointer text-left ${
                          activeProjectFilter === null
                            ? 'bg-zinc-800/90 text-white font-semibold'
                            : 'text-zinc-400 hover:text-zinc-200 hover:bg-[#18181f]'
                        }`}
                      >
                        <span>Todos os projetos</span>
                        {activeProjectFilter === null && (
                          <CheckCircle2 className="w-3.5 h-3.5 text-zinc-300" />
                        )}
                      </button>

                      {/* Linha separadora */}
                      {savedProjects.length > 0 && (
                        <div className="w-full h-[1px] bg-[#22222a] my-1" />
                      )}

                      {/* Lista dos projetos cadastrados */}
                      <div className="flex flex-col gap-0.5 max-h-60 overflow-y-auto pr-0.5">
                        {savedProjects.map((proj) => {
                          const isSelected = activeProjectFilter === proj;
                          return (
                            <button
                              key={proj}
                              type="button"
                              id={`tasks-proj-option-${proj.toLowerCase().replace(/\s+/g, '-')}`}
                              onClick={() => {
                                setActiveProjectFilter(proj);
                                setIsProjectDropdownOpen(false);
                              }}
                              className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition-colors cursor-pointer text-left ${
                                isSelected
                                  ? 'bg-zinc-800/90 text-white font-semibold'
                                  : 'text-zinc-400 hover:text-zinc-200 hover:bg-[#18181f]'
                              }`}
                            >
                              <span className="truncate pr-2">{proj}</span>
                              {isSelected && (
                                <CheckCircle2 className="w-3.5 h-3.5 text-zinc-300 shrink-0" />
                              )}
                            </button>
                          );
                        })}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ) : (
              /* Tasks Daily & Workspace header left: completely empty / clean */
              <div className="h-6" />
            )}
          </div>

          {/* Right Actions: Nuvem (apenas em calories), WhatsApp Share, Wipe Data */}
          <div className="flex items-center gap-2.5">
            {/* Create Button (+): on Prompts and Tasks, on desktop only */}
            {!isWorkspace && !isFuel && !isMobile && (
              <button
                type="button"
                id="btn-header-add-item"
                onClick={handleHeaderPlusClick}
                className="relative overflow-hidden group flex items-center justify-center p-2.5 sm:p-2 rounded-xl sm:rounded-lg text-white hover:text-white bg-[#151518] hover:bg-[#1f1f24] border border-[#242429] transition-all duration-300 shadow-sm cursor-pointer shrink-0"
                title={isTasks ? 'Criar Tarefa' : 'Criar Prompt'}
              >
                <Plus className="w-4 h-4 text-white stroke-[2.4]" />
              </button>
            )}

            {/* Símbolo de Nuvem: Presente em Welcome, Prompt e Tarefas (não em Calories) */}
            {!isFuel && !isMobile && (
              <button
                id="btn-cloud-backup"
                type="button"
                onClick={() => setIsBackupOpen(true)}
                className="relative overflow-hidden group flex items-center justify-center p-2.5 sm:p-2 rounded-xl sm:rounded-lg text-white hover:text-white bg-[#151518] hover:bg-[#1f1f24] border border-[#242429] transition-all duration-300 shadow-sm cursor-pointer shrink-0"
                title="Backup (Importar e Exportar dados)"
              >
                <Cloud className="w-4 h-4 text-white" />
              </button>
            )}

            {/* Símbolo de Compartilhar: Presente apenas na página de Calories */}
            {(isFuel || isMobile) && (
              <button
                id="btn-whatsapp-share-header"
                type="button"
                onClick={handleShareWhatsApp}
                className="relative overflow-hidden group flex items-center justify-center p-2.5 sm:p-2 rounded-xl sm:rounded-lg text-white hover:text-white bg-[#151518] hover:bg-[#1f1f24] border border-[#242429] transition-all duration-300 shadow-sm cursor-pointer shrink-0"
                title="Compartilhar resumo no WhatsApp"
              >
                <Share2 className="w-4 h-4 text-white" />
              </button>
            )}

            {/* Trash Button on Workspace page: clears prompts, tasks, projects */}
            {isWorkspace && !isMobile && (
              <button
                id="btn-wipe-all-data"
                type="button"
                onClick={() => setIsWipeModalOpen(true)}
                className="flex items-center justify-center w-9 h-9 sm:w-8 sm:h-8 rounded-xl sm:rounded-lg text-zinc-400 hover:text-red-400 bg-[#151518] hover:bg-red-950/30 border border-[#242429] hover:border-red-900/50 transition-all cursor-pointer shrink-0"
                title="Excluir todos os dados do site (prompts, tarefas e projetos)"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Main Area with Smooth Slide Transition between Pages */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-10 pt-4 sm:pt-6 pb-12 sm:pb-28">
        {isMobile ? (
          <div className="w-full">
            <FuelPage
              meals={meals}
              onAddMeal={handleAddMeal}
              onUpdateMeal={handleUpdateMeal}
              onDeleteMeal={handleDeleteMeal}
              onClearDayMeals={handleClearDayMeals}
              baseCalorieGoal={baseCalorieGoal}
              onUpdateBaseGoal={handleUpdateBaseGoal}
              fuelData={fuelData}
              onUpdateDayFuel={handleUpdateDayFuel}
              showNotification={showNotification}
              selectedDate={selectedFuelDate}
              onSelectDate={setSelectedFuelDate}
            />
          </div>
        ) : (
          <AnimatePresence mode="wait" custom={pageDirection}>
            {isWorkspace ? (
            /* ======================================================== */
            /* WORKSPACE PAGE (Center text & AI Agent input box)        */
            /* ======================================================== */
            <motion.div
              key="page-workspace"
              custom={pageDirection}
              variants={{
                enter: (dir: number) => ({
                  x: dir > 0 ? 60 : -60,
                  opacity: 0,
                }),
                center: {
                  x: 0,
                  opacity: 1,
                },
                exit: (dir: number) => ({
                  x: dir < 0 ? 60 : -60,
                  opacity: 0,
                }),
              }}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{
                x: { type: 'spring', stiffness: 220, damping: 28, mass: 0.8 },
                opacity: { duration: 0.28, ease: [0.16, 1, 0.3, 1] },
              }}
              className="w-full flex flex-col items-center justify-center min-h-[58vh] max-w-2xl mx-auto px-2 sm:px-4"
            >
              <h1
                id="workspace-welcome-text"
                className="text-2xl sm:text-3xl md:text-[35px] tracking-tight text-white/90 select-none text-center mb-12 sm:mb-14 md:mb-16"
              >
                <span className="font-light text-zinc-300">Welcome back, </span>
                <span className="font-normal text-white">Guilherme.</span>
              </h1>

              {/* Lista de Projetos acima do chat (com visual limpo do card de prompt) */}
              {savedProjects.length > 0 && (
                <div className="w-full flex items-center justify-start gap-1.5 flex-wrap mb-2.5 px-0.5">
                  {savedProjects.map((proj) => {
                    const isSelected = agentSelectedProject === proj;
                    const isDimmed = agentSelectedProject !== null && !isSelected;
                    return (
                      <AgentProjectPill
                        key={proj}
                        name={proj}
                        isSelected={isSelected}
                        isDimmed={isDimmed}
                        onSelect={() => {
                          setAgentSelectedProject((curr) => (curr === proj ? null : proj));
                        }}
                      />
                    );
                  })}
                </div>
              )}

              {/* AI Agent Writing Box com Efeito Flashlight do PromptCard */}
              <div className="w-full relative">
                <form
                  onSubmit={handleAgentSubmit}
                  ref={agentBoxRef}
                  onMouseMove={handleAgentBoxMouseMove}
                  onMouseEnter={() => setAgentBoxMouse((p) => ({ ...p, isInteracting: true }))}
                  onMouseLeave={handleAgentBoxMouseLeave}
                  className="relative w-full rounded-2xl bg-[#141416] border border-[#222226] hover:border-[#33333b] shadow-[0_8px_32px_rgba(0,0,0,0.6)] transition-all duration-300 overflow-hidden"
                >
                  {/* Contorno gradualmente ativo ao redor da caixa de texto */}
                  <div
                    className="absolute inset-0 rounded-2xl p-[1px] pointer-events-none z-10 overflow-hidden"
                    style={{
                      WebkitMask:
                        'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)',
                      WebkitMaskComposite: 'xor',
                      maskComposite: 'exclude',
                    }}
                  >
                    <div
                      className="absolute -inset-[150%] w-[400%] h-[400%] m-auto animate-border-beam"
                      style={{
                        background:
                          'conic-gradient(from 0deg, transparent 0deg, transparent 70deg, rgba(255, 255, 255, 0.65) 90deg, rgba(255, 255, 255, 0.12) 115deg, transparent 145deg, transparent 360deg)',
                      }}
                    />
                  </div>

                  {/* Flashlight interativo do cursor */}
                  <div
                    className="flashlight-layer absolute inset-0 rounded-2xl p-[1px] pointer-events-none z-10"
                    style={{
                      opacity: agentBoxMouse.isInteracting ? 1 : 0,
                      background: `radial-gradient(320px circle at ${agentBoxMouse.x}px ${agentBoxMouse.y}px, rgba(255, 255, 255, 0.45), rgba(255, 255, 255, 0.08) 40%, transparent 75%)`,
                      WebkitMask:
                        'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)',
                      WebkitMaskComposite: 'xor',
                      maskComposite: 'exclude',
                      transition: 'opacity 0.25s ease-out',
                    }}
                  />

                  {/* Flashlight Ambient Surface Glow */}
                  <div
                    className="flashlight-layer absolute inset-0 pointer-events-none rounded-2xl z-0"
                    style={{
                      opacity: agentBoxMouse.isInteracting ? 1 : 0,
                      background: `radial-gradient(360px circle at ${agentBoxMouse.x}px ${agentBoxMouse.y}px, rgba(255, 255, 255, 0.03), transparent 75%)`,
                      transition: 'opacity 0.25s ease-out',
                    }}
                  />

                  {/* Clean textarea - estilo limpo sem bordas brancas de alta opacidade */}
                  <textarea
                    id="ai-agent-input"
                    value={agentPrompt}
                    onChange={(e) => setAgentPrompt(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleAgentSubmit();
                      }
                    }}
                    placeholder="Add a task..."
                    rows={2}
                    className="relative z-10 w-full bg-transparent text-sm sm:text-base text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:ring-0 resize-none p-4 sm:p-5 pr-28 leading-relaxed font-sans"
                  />

                  {/* Canto direito: efeito degradê + blur com botão de calendário e seta para cima */}
                  <div className="absolute right-3 bottom-3 z-20 flex items-center gap-2 pl-3 pr-1 py-1 rounded-full bg-gradient-to-l from-[#141416] via-[#141416]/90 to-transparent backdrop-blur-md">
                    {/* Botão de Calendário: opacidade 89% sem brilho quando selecionado, exibindo apenas o dia */}
                    <div className="relative flex items-center">
                      <button
                        type="button"
                        id="btn-agent-calendar"
                        onClick={() => {
                          if (agentDateInputRef.current) {
                            try {
                              agentDateInputRef.current.showPicker();
                            } catch {
                              agentDateInputRef.current.click();
                            }
                          }
                        }}
                        className={`relative overflow-hidden w-8 h-8 rounded-full border transition-all duration-200 cursor-pointer flex items-center justify-center shrink-0 ${
                          agentSelectedDate !== getTodayIso()
                            ? 'opacity-[0.89] bg-[#1e1e24] border-zinc-400 text-white'
                            : 'opacity-50 hover:opacity-85 bg-[#0e0e0e] border-[#202025] hover:border-[#383844] text-zinc-400 hover:text-zinc-200'
                        }`}
                        title={
                          agentSelectedDate !== getTodayIso()
                            ? `Data agendada: ${agentSelectedDate} (clique para alterar)`
                            : 'Agendar data para a tarefa (abre calendário)'
                        }
                      >
                        {agentSelectedDate !== getTodayIso() ? (
                          <span className="text-[12px] font-semibold text-white select-none leading-none tracking-tight">
                            {parseInt(agentSelectedDate.split('-')[2], 10) || agentSelectedDate.split('-')[2]}
                          </span>
                        ) : (
                          <Calendar className="w-3.5 h-3.5" />
                        )}
                        {/* Input date nativo invisível que cobre o botão para abertura direta e imediata */}
                        <input
                          ref={agentDateInputRef}
                          type="date"
                          value={agentSelectedDate}
                          onChange={(e) => {
                            if (e.target.value) {
                              setAgentSelectedDate(e.target.value);
                            }
                          }}
                          className="absolute inset-0 w-full h-full opacity-0 pointer-events-auto cursor-pointer [color-scheme:dark]"
                          tabIndex={-1}
                          aria-label="Escolher data no calendário"
                        />
                      </button>
                    </div>

                    {/* Seta para cima: vira check com animação quando tarefa for adicionada */}
                    <button
                      type="submit"
                      id="btn-ai-agent-submit"
                      className="relative overflow-hidden w-8 h-8 rounded-full bg-white text-black transition-all duration-200 shadow-[0_0_16px_rgba(255,255,255,0.45)] cursor-pointer flex items-center justify-center shrink-0 active:scale-95 group/arrow"
                      title={isAgentSuccess ? 'Tarefa adicionada!' : 'Enviar tarefa para o AI Agent'}
                    >
                      {/* Flashlight sheen layer sempre ativa */}
                      <div
                        className="flashlight-layer absolute inset-0 rounded-full pointer-events-none"
                        style={{
                          background:
                            'radial-gradient(34px circle at 38% 32%, rgba(255, 255, 255, 1) 0%, rgba(220, 220, 230, 0.55) 55%, transparent 88%)',
                        }}
                      />

                      <span className="relative z-10 flex items-center justify-center">
                        <AnimatePresence mode="wait" initial={false}>
                          {isAgentLoading ? (
                            <motion.span
                              key="loading"
                              initial={{ opacity: 0, scale: 0.7 }}
                              animate={{ opacity: 1, scale: 1 }}
                              exit={{ opacity: 0, scale: 0.7 }}
                              transition={{ duration: 0.15 }}
                            >
                              <RotateCcw className="w-3.5 h-3.5 text-black animate-spin" />
                            </motion.span>
                          ) : isAgentSuccess ? (
                            <motion.span
                              key="success"
                              initial={{ opacity: 0, scale: 0.3, rotate: -25 }}
                              animate={{ opacity: 1, scale: 1, rotate: 0 }}
                              exit={{ opacity: 0, scale: 0.3, rotate: 25 }}
                              transition={{ type: 'spring', stiffness: 500, damping: 20 }}
                            >
                              <Check className="w-4 h-4 text-emerald-600 stroke-[3]" />
                            </motion.span>
                          ) : (
                            <motion.span
                              key="arrow"
                              initial={{ opacity: 0, scale: 0.7 }}
                              animate={{ opacity: 1, scale: 1 }}
                              exit={{ opacity: 0, scale: 0.7 }}
                              transition={{ duration: 0.15 }}
                            >
                              <ArrowUp className="w-4 h-4 text-black stroke-[2.5] transition-transform duration-200 group-hover/arrow:-translate-y-0.5" />
                            </motion.span>
                          )}
                        </AnimatePresence>
                      </span>
                    </button>
                  </div>
                </form>

                {/* Voltar para hoje quando uma data diferente estiver selecionada */}
                {agentSelectedDate !== getTodayIso() && (
                  <div className="flex items-center gap-1.5 mt-2 px-1">
                    <button
                      type="button"
                      onClick={() => setAgentSelectedDate(getTodayIso())}
                      className="text-xs text-zinc-400 hover:text-white transition-colors cursor-pointer flex items-center gap-1.5 group/reset"
                    >
                      <RotateCcw className="w-3 h-3 text-zinc-500 group-hover/reset:text-zinc-300 group-hover/reset:-rotate-45 transition-transform" />
                      <span>Voltar para hoje</span>
                    </button>
                  </div>
                )}
              </div>
            </motion.div>
          ) : isPrompts ? (
            /* ======================================================== */
            /* PROMPTS PAGE                                             */
            /* ======================================================== */
            <motion.div
              key="page-prompts"
              custom={pageDirection}
              variants={{
                enter: (dir: number) => ({
                  x: dir > 0 ? 60 : -60,
                  opacity: 0,
                }),
                center: {
                  x: 0,
                  opacity: 1,
                },
                exit: (dir: number) => ({
                  x: dir < 0 ? 60 : -60,
                  opacity: 0,
                }),
              }}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{
                x: { type: 'spring', stiffness: 220, damping: 28, mass: 0.8 },
                opacity: { duration: 0.28, ease: [0.16, 1, 0.3, 1] },
              }}
              className="w-full"
            >
              {filteredPrompts.length > 0 ? (
                <div
                  id="prompts-grid"
                  className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4"
                >
                  {filteredPrompts.map((prompt, idx) => (
                    <PromptCard
                      key={prompt.id}
                      prompt={prompt}
                      index={idx}
                      activeWorkflowFilter={activeWorkflowFilter}
                      onSelect={(p) => setActivePrompt(p)}
                      onEdit={handleOpenEditPrompt}
                      isHovered={hoveredCardId === prompt.id}
                      isAnyHovered={hoveredCardId !== null}
                      onMouseEnter={() => setHoveredCardId(prompt.id)}
                      onMouseLeave={() => setHoveredCardId(null)}
                      isDragging={draggingPromptId === prompt.id}
                      isDragOver={dragOverPromptId === prompt.id}
                      onDragStart={handlePromptDragStart}
                      onDragOver={handlePromptDragOver}
                      onDragLeave={() => setDragOverPromptId(null)}
                      onDrop={handlePromptDrop}
                      onDragEnd={() => {
                        setDraggingPromptId(null);
                        setDragOverPromptId(null);
                      }}
                    />
                  ))}
                </div>
              ) : activeWorkflowFilter ? (
                /* Em workflow, se não houver prompts cadastrados, fica apenas vazio sem mensagens */
                <div className="min-h-[40vh]" />
              ) : prompts.length === 0 ? (
                /* Clean Empty State */
                <div className="flex flex-col items-center justify-center min-h-[50vh] text-center max-w-md mx-auto px-4">
                  <h2 className="text-base font-semibold text-white mb-2">
                    Sua biblioteca está vazia
                  </h2>
                  <p className="text-xs text-zinc-400 leading-relaxed mb-6">
                    Crie prompts customizados com variáveis dinâmicas ou importe um arquivo de backup com a nuvem.
                  </p>

                  <div className="flex flex-wrap items-center justify-center gap-2.5">
                    <button
                      id="btn-empty-add-prompt"
                      onClick={handleOpenNewPrompt}
                      className="relative overflow-hidden group flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-[#111113] bg-gradient-to-b from-[#ffffff] via-[#e2e5e9] to-[#b8bdc5] border border-white/90 shadow-md hover:shadow-lg transition-all cursor-pointer"
                    >
                      <span className="metallic-shine-layer" />
                      <Plus className="w-3.5 h-3.5 stroke-[2.8] text-[#111113]" />
                      <span>Criar Primeiro Prompt</span>
                    </button>

                    <button
                      id="btn-empty-import"
                      onClick={() => setIsBackupOpen(true)}
                      className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-medium bg-[#151518] hover:bg-[#1e1e23] text-zinc-200 border border-[#25252a] transition-colors cursor-pointer"
                    >
                      <Cloud className="w-3.5 h-3.5 text-white" />
                      <span>Importar da Nuvem</span>
                    </button>
                  </div>
                </div>
              ) : null}
            </motion.div>
          ) : isTasks ? (
            /* ======================================================== */
            /* TASKS PAGE                                               */
            /* ======================================================== */
            <motion.div
              key="page-tasks"
              custom={pageDirection}
              variants={{
                enter: (dir: number) => ({
                  x: dir > 0 ? 60 : -60,
                  opacity: 0,
                }),
                center: {
                  x: 0,
                  opacity: 1,
                },
                exit: (dir: number) => ({
                  x: dir < 0 ? 60 : -60,
                  opacity: 0,
                }),
              }}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{
                x: { type: 'spring', stiffness: 220, damping: 28, mass: 0.8 },
                opacity: { duration: 0.28, ease: [0.16, 1, 0.3, 1] },
              }}
              className="w-full flex flex-col items-center"
            >
              {/* Barra de Tarefas: Ícone de Usuário/Empresa na esquerda, Calendário no meio, Voltar Check na direita */}
              <div className="w-full max-w-2xl mx-auto flex items-center justify-between mb-5 px-1">
                {/* Lado Esquerdo: Alternador Usuário vs Empresa (Empresa é o padrão, mesma cor zinc-300 para ambos) */}
                <button
                  type="button"
                  id="btn-toggle-task-category"
                  onClick={handleToggleTaskCategory}
                  className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-[#0e0e0e] border border-[#202025] hover:border-[#383844] hover:bg-[#18181d] text-zinc-300 hover:text-white transition-all cursor-pointer flex items-center justify-center shadow-[0_4px_16px_rgba(0,0,0,0.6)] shrink-0"
                  title={
                    taskCategory === 'business'
                      ? 'Tarefas Black (ativo) — clique para alternar para Tarefas Diárias'
                      : 'Tarefas Diárias (ativo) — clique para alternar para Tarefas Black'
                  }
                >
                  {taskCategory === 'business' ? (
                    <Briefcase className="w-3.5 h-3.5 text-zinc-300" />
                  ) : (
                    <User className="w-3.5 h-3.5 text-zinc-300" />
                  )}
                </button>

                {/* Meio: Calendário centralizado apenas na view Black (Negócios); nas tarefas diárias NÃO há datas */}
                <div className="flex-1 flex justify-center px-2 min-h-[44px] items-center">
                  <AnimatePresence mode="wait">
                    {taskCategory === 'business' && (
                      <WeekTaskbar
                        key="business-week-taskbar"
                        selectedDate={selectedTaskDate}
                        onSelectDate={(d) => setSelectedTaskDate(d)}
                        tasks={tasks}
                      />
                    )}
                  </AnimatePresence>
                </div>

                {/* Lado Direito: Símbolo de voltar check (apenas visível nas tarefas Diárias; oculto na view de Negócios) */}
                {taskCategory !== 'business' ? (
                  <button
                    type="button"
                    id="btn-reset-checks"
                    onClick={handleResetCurrentCategoryChecks}
                    className={`w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-[#0e0e0e] border transition-all cursor-pointer flex items-center justify-center shadow-[0_4px_16px_rgba(0,0,0,0.6)] shrink-0 ${
                      lastResetCheckedTaskIds && lastResetCheckedTaskIds.length > 0
                        ? 'border-zinc-300 bg-[#1e1e24] text-white'
                        : 'border-[#202025] hover:border-[#383844] hover:bg-[#18181d] text-zinc-300 hover:text-white'
                    }`}
                    title={
                      lastResetCheckedTaskIds && lastResetCheckedTaskIds.length > 0
                        ? 'Restaurar checks das tarefas (clique para remarcar)'
                        : 'Desmarcar checks das tarefas diárias (clique de novo para restaurar)'
                    }
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                  </button>
                ) : (
                  <div className="w-8 sm:w-9 shrink-0" />
                )}
              </div>

              {/* Lista das Tarefas: Animação de cima para baixo ao trocar de categoria e de data */}
              <div className="w-full max-w-2xl mx-auto min-h-[60px]">
                <AnimatePresence mode="wait">
                  {filteredTasks.length > 0 && (
                    <motion.div
                      key={`tasks-${taskCategory}-${selectedTaskDate}`}
                      initial={{ opacity: 0, y: -24 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 16 }}
                      transition={{ duration: 0.24, ease: [0.16, 1, 0.3, 1] }}
                      id="tasks-vertical-list"
                      className="w-full flex flex-col gap-3"
                    >
                      {filteredTasks.map((task, idx) => (
                        <TaskCard
                          key={task.id}
                          task={task}
                          index={idx}
                          savedProjects={savedProjects}
                          onEdit={handleOpenEditTask}
                          onToggleComplete={handleToggleCompleteTask}
                          onMoveToToday={handleMoveTaskToToday}
                          isHovered={hoveredCardId === task.id}
                          isAnyHovered={hoveredCardId !== null}
                          onMouseEnter={() => setHoveredCardId(task.id)}
                          onMouseLeave={() => setHoveredCardId(null)}
                          isDragging={draggingTaskId === task.id}
                          isDragOver={dragOverTaskId === task.id}
                          onDragStart={handleTaskDragStart}
                          onDragOver={handleTaskDragOver}
                          onDragLeave={() => setDragOverTaskId(null)}
                          onDrop={handleTaskDrop}
                          onDragEnd={() => {
                            setDraggingTaskId(null);
                            setDragOverTaskId(null);
                          }}
                        />
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </motion.div>
          ) : (
            /* ======================================================== */
            /* FUEL / CALORIE COUNTER PAGE                              */
            /* ======================================================== */
            <motion.div
              key="page-fuel"
              custom={pageDirection}
              variants={{
                enter: (dir: number) => ({
                  x: dir > 0 ? 60 : -60,
                  opacity: 0,
                }),
                center: {
                  x: 0,
                  opacity: 1,
                },
                exit: (dir: number) => ({
                  x: dir < 0 ? 60 : -60,
                  opacity: 0,
                }),
              }}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{
                x: { type: 'spring', stiffness: 220, damping: 28, mass: 0.8 },
                opacity: { duration: 0.28, ease: [0.16, 1, 0.3, 1] },
              }}
              className="w-full"
            >
              <FuelPage
                meals={meals}
                onAddMeal={handleAddMeal}
                onUpdateMeal={handleUpdateMeal}
                onDeleteMeal={handleDeleteMeal}
                onClearDayMeals={handleClearDayMeals}
                baseCalorieGoal={baseCalorieGoal}
                onUpdateBaseGoal={handleUpdateBaseGoal}
                fuelData={fuelData}
                onUpdateDayFuel={handleUpdateDayFuel}
                showNotification={showNotification}
                selectedDate={selectedFuelDate}
                onSelectDate={setSelectedFuelDate}
              />
            </motion.div>
          )}
        </AnimatePresence>
        )}
      </main>

      {/* Floating Navigation Dock: Welcome (Workspace) -> Prompts -> Checklist (Tasks) -> Fuel (Flame) */}
      <nav
        id="floating-dock-nav"
        aria-label="Navegação de Páginas"
        className="fixed bottom-5 sm:bottom-6 left-1/2 -translate-x-1/2 z-40 hidden sm:flex items-center gap-2 sm:gap-1.5 p-2 sm:p-1.5 rounded-2xl sm:rounded-xl bg-[#0e0e0e] border border-[#202025] shadow-[0_12px_40px_rgba(0,0,0,0.9)] backdrop-blur-md"
      >
        {/* Tab 1: Welcome / Workspace */}
        <button
          type="button"
          id="dock-tab-workspace"
          onClick={() => handleNavigate('workspace')}
          className="relative p-2.5 sm:p-2 rounded-xl sm:rounded-lg cursor-pointer flex items-center justify-center select-none"
          title="AI Agent / Chat"
        >
          {currentPage === 'workspace' && (
            <motion.div
              layoutId="dock-active-indicator"
              animate={{ opacity: showDockIndicator ? 1 : 0 }}
              transition={{
                layout: { type: 'spring', stiffness: 350, damping: 30 },
                opacity: { duration: 0.6 },
              }}
              className="absolute inset-0 bg-[#151518] border border-[#242429] rounded-xl sm:rounded-lg shadow-sm pointer-events-none"
            />
          )}
          <MessageSquare
            className={`relative z-10 w-5 h-5 sm:w-4 sm:h-4 transition-all duration-300 ${
              currentPage === 'workspace'
                ? 'text-white opacity-100'
                : 'text-zinc-500 opacity-60 hover:text-zinc-300 hover:opacity-90'
            }`}
          />
        </button>

        {/* Tab 2: Prompts */}
        <button
          type="button"
          id="dock-tab-prompts"
          onClick={() => handleNavigate('prompts')}
          className="relative p-2.5 sm:p-2 rounded-xl sm:rounded-lg cursor-pointer flex items-center justify-center select-none"
          title="Prompts"
        >
          {currentPage === 'prompts' && (
            <motion.div
              layoutId="dock-active-indicator"
              animate={{ opacity: showDockIndicator ? 1 : 0 }}
              transition={{
                layout: { type: 'spring', stiffness: 350, damping: 30 },
                opacity: { duration: 0.6 },
              }}
              className="absolute inset-0 bg-[#151518] border border-[#242429] rounded-xl sm:rounded-lg shadow-sm pointer-events-none"
            />
          )}
          <FileText
            className={`relative z-10 w-5 h-5 sm:w-4 sm:h-4 transition-all duration-300 ${
              currentPage === 'prompts'
                ? 'text-white opacity-100'
                : 'text-zinc-500 opacity-60 hover:text-zinc-300 hover:opacity-90'
            }`}
          />
        </button>

        {/* Tab 3: Checklist / Tasks */}
        <button
          type="button"
          id="dock-tab-tasks"
          onClick={() => handleNavigate('tasks')}
          className="relative p-2.5 sm:p-2 rounded-xl sm:rounded-lg cursor-pointer flex items-center justify-center select-none"
          title="Checklist / Tarefas"
        >
          {currentPage === 'tasks' && (
            <motion.div
              layoutId="dock-active-indicator"
              animate={{ opacity: showDockIndicator ? 1 : 0 }}
              transition={{
                layout: { type: 'spring', stiffness: 350, damping: 30 },
                opacity: { duration: 0.6 },
              }}
              className="absolute inset-0 bg-[#151518] border border-[#242429] rounded-xl sm:rounded-lg shadow-sm pointer-events-none"
            />
          )}
          <CheckSquare
            className={`relative z-10 w-5 h-5 sm:w-4 sm:h-4 transition-all duration-300 ${
              currentPage === 'tasks'
                ? 'text-white opacity-100'
                : 'text-zinc-500 opacity-60 hover:text-zinc-300 hover:opacity-90'
            }`}
          />
        </button>

        {/* Tab 4: Fuel / Calorie Counter (Fire icon) */}
        <button
          type="button"
          id="dock-tab-fuel"
          onClick={() => handleNavigate('fuel')}
          className="relative p-2.5 sm:p-2 rounded-xl sm:rounded-lg cursor-pointer flex items-center justify-center select-none"
          title="Consumo Diário"
        >
          {currentPage === 'fuel' && (
            <motion.div
              layoutId="dock-active-indicator"
              animate={{ opacity: showDockIndicator ? 1 : 0 }}
              transition={{
                layout: { type: 'spring', stiffness: 350, damping: 30 },
                opacity: { duration: 0.6 },
              }}
              className="absolute inset-0 bg-[#151518] border border-[#242429] rounded-xl sm:rounded-lg shadow-sm pointer-events-none"
            />
          )}
          <Flame
            className={`relative z-10 w-5 h-5 sm:w-4 sm:h-4 transition-all duration-300 ${
              currentPage === 'fuel'
                ? 'text-white opacity-100'
                : 'text-zinc-500 opacity-60 hover:text-zinc-300 hover:opacity-90'
            }`}
          />
        </button>
      </nav>

      {/* Interactive Variable Prompt Modal */}
      <PromptModal
        prompt={activePrompt}
        onClose={() => setActivePrompt(null)}
        onEdit={handleOpenEditPrompt}
        onDelete={handleDeletePrompt}
        onPrev={handlePrevPrompt}
        onNext={handleNextPrompt}
        hasPrev={hasPrevPrompt}
        hasNext={hasNextPrompt}
        currentIndex={activePromptIndex !== -1 ? activePromptIndex : undefined}
        totalCount={filteredPrompts.length}
      />

      {/* Create / Edit Prompt Modal */}
      <NewPromptModal
        isOpen={isNewPromptOpen}
        editingPrompt={editingPrompt}
        savedWorkflows={savedWorkflows}
        onAddWorkflow={handleAddWorkflow}
        onDeleteWorkflow={handleDeleteWorkflow}
        onClose={() => {
          setIsNewPromptOpen(false);
          setEditingPrompt(null);
        }}
        onSave={handleSavePrompt}
        onDelete={handleDeletePrompt}
      />

      {/* Create / Edit Task Modal */}
      <NewTaskModal
        isOpen={isNewTaskOpen}
        editingTask={editingTask}
        defaultDate={selectedTaskDate}
        defaultTaskType={taskCategory}
        savedProjects={savedProjects}
        onAddProject={handleAddProject}
        onDeleteProject={handleDeleteProject}
        onClose={() => {
          setIsNewTaskOpen(false);
          setEditingTask(null);
        }}
        onSave={handleSaveTask}
        onDelete={handleDeleteTask}
      />

      {/* Cloud Backup / Restore Modal (Supports prompts, tasks, projects, workflows and calories) */}
      <BackupModal
        isOpen={isBackupOpen}
        onClose={() => setIsBackupOpen(false)}
        pageContext={currentPage}
        prompts={prompts}
        tasks={tasks}
        savedProjects={savedProjects}
        savedWorkflows={savedWorkflows}
        meals={meals}
        fuelData={fuelData}
        baseCalorieGoal={baseCalorieGoal}
        onImportPrompts={handleImportPrompts}
        onImportTasks={handleImportTasks}
        onImportAll={handleImportAll}
        onImportProjects={handleImportProjects}
        onImportWorkflows={handleImportWorkflows}
        onImportFuel={handleImportFuel}
      />

      {/* Modal de Confirmação: Excluir Todos os Dados do Site */}
      <AnimatePresence>
        {isWipeModalOpen && (
          <div
            id="wipe-modal-overlay"
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md"
            onClick={(e) => {
              if (e.target === e.currentTarget) setIsWipeModalOpen(false);
            }}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              transition={{ duration: 0.2 }}
              className="w-full max-w-sm p-6 rounded-2xl bg-[#111113] border border-[#26262c] shadow-[0_24px_60px_rgba(0,0,0,0.95)] flex flex-col text-white"
            >
              <div className="w-10 h-10 rounded-xl bg-red-500/15 border border-red-500/30 text-red-400 flex items-center justify-center mb-4">
                <Trash2 className="w-5 h-5" />
              </div>
              <h3 className="text-base font-semibold text-white mb-1.5">
                Excluir todos os dados?
              </h3>
              <p className="text-xs text-zinc-400 mb-6 leading-relaxed">
                Esta ação é irreversível e apagará permanentemente todos os seus prompts, tarefas e projetos salvos do site.
              </p>
              <div className="flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsWipeModalOpen(false)}
                  className="px-3.5 py-2 text-xs font-medium text-zinc-300 hover:text-white bg-[#1a1a1f] hover:bg-[#24242b] border border-[#2e2e38] rounded-lg transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setPrompts([]);
                    setTasks([]);
                    setSavedProjects([]);
                    localStorage.removeItem(PROMPTS_STORAGE_KEY);
                    localStorage.removeItem(TASKS_STORAGE_KEY);
                    localStorage.removeItem(PROJECTS_STORAGE_KEY);
                    setIsWipeModalOpen(false);
                    showNotification('Todos os dados foram excluídos permanentemente.');
                  }}
                  className="px-4 py-2 text-xs font-semibold text-white bg-[#650e0e] hover:bg-[#781212] rounded-lg transition-colors cursor-pointer shadow-md active:scale-95"
                >
                  Excluir Tudo
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
