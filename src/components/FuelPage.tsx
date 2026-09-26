import React, { useState, useMemo, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Calendar as CalendarIcon,
  X,
  Clock,
  Share2,
  RotateCcw,
  Trash2,
  Check,
  Plus,
  Dumbbell,
  Activity,
  HeartPulse,
  UtensilsCrossed,
} from 'lucide-react';
import { MealItem, DayFuelData } from '../types';

interface FuelPageProps {
  meals: MealItem[];
  onAddMeal: (meal: Omit<MealItem, 'id'>) => void;
  onUpdateMeal: (meal: MealItem) => void;
  onDeleteMeal: (id: string) => void;
  onClearDayMeals?: (date: string) => void;
  baseCalorieGoal: number;
  onUpdateBaseGoal: (goal: number) => void;
  fuelData: Record<string, DayFuelData>;
  onUpdateDayFuel: (date: string, data: Partial<DayFuelData>) => void;
  showNotification: (msg: string) => void;
  selectedDate?: string;
  onSelectDate?: (date: string) => void;
  isMobile?: boolean;
}

const getTodayIso = () => {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const getDayOfWeekShort = (dateStr: string) => {
  const [year, month, day] = dateStr.split('-').map(Number);
  const d = new Date(year, month - 1, day);
  const days = [
    'Dom',
    'Seg',
    'Ter',
    'Qua',
    'Qui',
    'Sex',
    'Sáb',
  ];
  return days[d.getDay()] || '';
};

const getDayOfWeekName = (dateStr: string) => {
  const [year, month, day] = dateStr.split('-').map(Number);
  const d = new Date(year, month - 1, day);
  const days = [
    'Domingo',
    'Segunda',
    'Terça',
    'Quarta',
    'Quinta',
    'Sexta',
    'Sábado',
  ];
  return days[d.getDay()] || '';
};

const formatDateShort = (dateStr: string) => {
  const parts = dateStr.split('-');
  if (parts.length === 3) {
    return `${parts[2]}/${parts[1]}`;
  }
  return dateStr;
};

const formatDateWithDay = (dateStr: string) => {
  const shortDate = formatDateShort(dateStr);
  const dayName = getDayOfWeekShort(dateStr);
  return `${shortDate} ${dayName}`;
};

// Formatação inteligente de calorias:
// < 1000: 450
// >= 1000: 1k, 1,2k, 1,8k, etc.
const formatKcal = (cal: number): string => {
  if (cal < 1000) return String(cal);
  const val = cal / 1000;
  const formatted = val.toFixed(1).replace('.', ',');
  return formatted.endsWith(',0') ? `${Math.round(val)}k` : `${formatted}k`;
};

// Reusable Hook for 3D Tilt, Flashlight border, and Surface glow (matching PromptCard effects)
function useCardTiltEffect(tiltAmount = 2.5) {
  const ref = useRef<HTMLDivElement>(null);
  const [mouseCoords, setMouseCoords] = useState({
    x: 0,
    y: 0,
    rotateX: 0,
    rotateY: 0,
    isInteracting: false,
  });

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const rotateY = ((x - rect.width / 2) / (rect.width / 2)) * tiltAmount;
    const rotateX = ((y - rect.height / 2) / (rect.height / 2)) * -tiltAmount;

    setMouseCoords({
      x,
      y,
      rotateX,
      rotateY,
      isInteracting: true,
    });
  };

  const handleMouseEnter = () => {
    setMouseCoords((prev) => ({ ...prev, isInteracting: true }));
  };

  const handleMouseLeave = () => {
    setMouseCoords({
      x: 0,
      y: 0,
      rotateX: 0,
      rotateY: 0,
      isInteracting: false,
    });
  };

  return {
    ref,
    mouseCoords,
    handleMouseMove,
    handleMouseEnter,
    handleMouseLeave,
  };
}

export const FuelPage: React.FC<FuelPageProps> = ({
  meals,
  onAddMeal,
  onUpdateMeal,
  onDeleteMeal,
  onClearDayMeals,
  baseCalorieGoal = 1800,
  fuelData,
  onUpdateDayFuel,
  showNotification,
  selectedDate: propSelectedDate,
  onSelectDate: propOnSelectDate,
  isMobile: propIsMobile,
}) => {
  const [internalDate, setInternalDate] = useState<string>(getTodayIso());
  const selectedDate = propSelectedDate || internalDate;
  const setSelectedDate = (d: string) => {
    if (propOnSelectDate) {
      propOnSelectDate(d);
    } else {
      setInternalDate(d);
    }
  };

  const [internalIsMobile, setInternalIsMobile] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      return window.innerWidth < 640;
    }
    return false;
  });

  useEffect(() => {
    const handleResize = () => {
      setInternalIsMobile(window.innerWidth < 640);
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const isMobileView = propIsMobile !== undefined ? propIsMobile : internalIsMobile;

  // Mobile draggable bottom sheet state for history
  const [isMobileDrawerOpen, setIsMobileDrawerOpen] = useState(false);

  // Two-step add meal flow:
  // Step 1 ('calories'): iOS-style numeric popup from user's screenshot
  // Step 2 ('name'): minimal popup identical to Step 1 asking for meal name
  const [addMealStep, setAddMealStep] = useState<'calories' | 'name' | null>(null);

  // Edit existing meal modal
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingMeal, setEditingMeal] = useState<MealItem | null>(null);

  // Clear confirmation modal
  const [isClearConfirmOpen, setIsClearConfirmOpen] = useState(false);

  // Form states
  const [mealCalories, setMealCalories] = useState('');
  const [mealName, setMealName] = useState('');
  const [mealTime, setMealTime] = useState('');
  const [mealNotes, setMealNotes] = useState('');

  // References for auto-focus
  const calorieInputRef = useRef<HTMLInputElement>(null);
  const nameInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (addMealStep === 'calories') {
      setTimeout(() => {
        calorieInputRef.current?.focus();
      }, 50);
    } else if (addMealStep === 'name') {
      setTimeout(() => {
        nameInputRef.current?.focus();
      }, 50);
    }
  }, [addMealStep]);

  // Filter meals for the selected date
  const dayMeals = useMemo(() => {
    return meals.filter((m) => m.date === selectedDate);
  }, [meals, selectedDate]);

  // Total consumed calories from meals for the day
  const consumedCalories = useMemo(() => {
    return dayMeals.reduce((acc, m) => acc + (Number(m.calories) || 0), 0);
  }, [dayMeals]);

  // Day specific goals / workout / cardio
  const currentDayData = fuelData[selectedDate] || {
    date: selectedDate,
    calorieGoal: baseCalorieGoal,
    workoutDone: false,
    cardioDone: false,
  };

  const isWorkoutDone = Boolean(currentDayData.workoutDone);
  const isCardioDone = Boolean(currentDayData.cardioDone);

  // Musculação gasto = 210 kcal, Cardio gasto = 200 kcal
  const workoutBurn = isWorkoutDone ? 210 : 0;
  const cardioBurn = isCardioDone ? 200 : 0;
  const totalBurned = workoutBurn + cardioBurn;

  // Net calories with activity discount
  const netCalories = Math.max(0, consumedCalories - totalBurned);
  const deficit = baseCalorieGoal - netCalories;
  const percentage = baseCalorieGoal > 0 ? Math.round((netCalories / baseCalorieGoal) * 100) : 0;

  // Calorias restantes para consumir a meta diária (ex: 1800), abatendo gastos de cardio e exercício
  const remainingCalories = baseCalorieGoal - consumedCalories + totalBurned;

  // Status visual ao lado de Calories com fonte fina:
  // Ok! Good! Excelent! Max! e se passar Stop!
  // Tons levemente escurecidos com efeito blur/glow sutil emanando deles
  const statusConfig = useMemo(() => {
    if (netCalories > baseCalorieGoal) {
      return {
        word: 'Stop!',
        color: '#dc2626', // slightly darker rich red
        glow: 'rgba(220, 38, 38, 0.5)',
      };
    }
    if (netCalories > 1750) {
      return {
        word: 'Max!',
        color: '#ea580c', // slightly darker rich orange
        glow: 'rgba(234, 88, 12, 0.48)',
      };
    }
    if (netCalories >= 1200) {
      return {
        word: 'Excelent!',
        color: '#0284c7', // slightly darker rich azure/blue
        glow: 'rgba(2, 132, 199, 0.45)',
      };
    }
    if (netCalories >= 600) {
      return {
        word: 'Good!',
        color: '#16a34a', // slightly darker rich emerald/green
        glow: 'rgba(22, 163, 74, 0.45)',
      };
    }
    return {
      word: 'Ok!',
      color: '#e4e4e7', // white / light zinc
      glow: 'rgba(228, 228, 231, 0.35)',
    };
  }, [netCalories, baseCalorieGoal]);

  // Card effects (3D Tilt + Flashlight Hover + Subtle Reflection) identical to PromptCard
  const mainCard = useCardTiltEffect(2.0);
  const workoutCard = useCardTiltEffect(2.5);
  const cardioCard = useCardTiltEffect(2.5);
  const foodCard = useCardTiltEffect(2.5);

  // Open Step 1 (Numeric Calorie popup as requested in screenshot)
  const handleOpenAddMeal = () => {
    setEditingMeal(null);
    setMealCalories('');
    setMealName('');
    setMealNotes('');
    const now = new Date();
    const curTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    setMealTime(curTime);
    setAddMealStep('calories');
  };

  // Step 1: User enters calories and clicks OK
  const handleCaloriesStepSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const calNum = Number(mealCalories);
    if (isNaN(calNum) || calNum <= 0) {
      showNotification('Digite uma quantidade de calorias válida');
      return;
    }
    // Auto fill current time
    const now = new Date();
    setMealTime(`${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`);
    // Advance to Step 2 (Minimal Name popup)
    setAddMealStep('name');
  };

  // Step 2: User completes meal name and saves directly (no clutter)
  const handleNameStepSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const calNum = Number(mealCalories);
    const finalName = mealName.trim() || 'Refeição';

    onAddMeal({
      name: finalName,
      calories: calNum,
      date: selectedDate,
      time: mealTime.trim() || undefined,
      notes: undefined,
    });

    showNotification(`${calNum} kcal adicionadas`);
    setAddMealStep(null);
  };

  // Open full edit modal for existing meal
  const handleOpenEditMeal = (meal: MealItem) => {
    setEditingMeal(meal);
    setMealName(meal.name);
    setMealCalories(String(meal.calories));
    setMealTime(meal.time || '');
    setMealNotes(meal.notes || '');
    setIsEditModalOpen(true);
  };

  // Save changes to existing meal
  const handleSaveEditedMeal = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingMeal) return;

    const calNum = Number(mealCalories);
    if (!mealName.trim()) {
      showNotification('Preencha o nome da refeição');
      return;
    }
    if (isNaN(calNum) || calNum < 0) {
      showNotification('Digite uma quantidade de calorias válida');
      return;
    }

    onUpdateMeal({
      ...editingMeal,
      name: mealName.trim(),
      calories: calNum,
      time: mealTime.trim() || undefined,
      notes: mealNotes.trim() || undefined,
    });

    showNotification('Refeição atualizada com sucesso!');
    setIsEditModalOpen(false);
  };

  // Toggle Workout (-210 kcal)
  const handleToggleWorkout = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const nextState = !isWorkoutDone;
    onUpdateDayFuel(selectedDate, { workoutDone: nextState });
    if (nextState) {
      showNotification('Treino validado: -210 kcal descontadas!');
    } else {
      showNotification('Treino desmarcado');
    }
  };

  // Toggle Cardio (-200 kcal)
  const handleToggleCardio = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const nextState = !isCardioDone;
    onUpdateDayFuel(selectedDate, { cardioDone: nextState });
    if (nextState) {
      showNotification('Cardio validado: -200 kcal descontadas!');
    } else {
      showNotification('Cardio desmarcado');
    }
  };

  // Clear day meals handler
  const handleConfirmClear = () => {
    if (onClearDayMeals) {
      onClearDayMeals(selectedDate);
    } else {
      dayMeals.forEach((m) => onDeleteMeal(m.id));
    }
    // Reset workout and cardio for this date
    onUpdateDayFuel(selectedDate, { workoutDone: false, cardioDone: false });
    setIsClearConfirmOpen(false);
    showNotification('Histórico do dia limpo com sucesso');
  };

  // WhatsApp Share Function
  const handleShareWhatsApp = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();

    const dayName = getDayOfWeekName(selectedDate);
    const shortDate = formatDateShort(selectedDate);

    const lines = [
      `Dia da semana: ${dayName} (${shortDate})`,
      `Kcal consumidas: ${consumedCalories} kcal`,
      `Defict: ${deficit} kcal`,
    ];

    if (isWorkoutDone) {
      lines.push('Treino: Realizado (-210 kcal)');
    }
    if (isCardioDone) {
      lines.push('Cardio: Realizado (-200 kcal)');
    }

    const message = lines.join('\n');
    const shareUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(message)}`;

    try {
      if (navigator.clipboard) {
        navigator.clipboard.writeText(message);
      }
    } catch {
      // Ignored
    }

    window.open(shareUrl, '_blank');
    showNotification('Compartilhando...');
  };

  // Circular gauge calculations: soma das calorias menos descontos de treino/cardio se marcados
  const radius = 92;
  const circumference = 2 * Math.PI * radius;
  const progressRatio = baseCalorieGoal > 0 ? Math.min(netCalories / baseCalorieGoal, 1) : 0;
  const strokeDashoffset = circumference - progressRatio * circumference;

  return (
    <div className="w-full max-w-xl mx-auto flex flex-col gap-5 sm:gap-6 animate-in fade-in duration-300">
      {/* Bloco Superior: Círculo de Metas + 3 Cards (Food, Exercise, Cardio) */}
      <div className="flex flex-col gap-5 sm:gap-6 min-h-0 sm:min-h-[calc(100vh-140px)] justify-start pb-24 sm:pb-6">
        {/* 1. TOP MAIN CARD: Clicável para Adicionar Refeição (Efeitos do PromptCard) */}
        <div
          ref={mainCard.ref}
            onClick={handleOpenAddMeal}
            onMouseMove={mainCard.handleMouseMove}
            onMouseEnter={mainCard.handleMouseEnter}
            onMouseLeave={mainCard.handleMouseLeave}
            style={{
              transform: mainCard.mouseCoords.isInteracting
                ? `perspective(1000px) rotateX(${mainCard.mouseCoords.rotateX.toFixed(2)}deg) rotateY(${mainCard.mouseCoords.rotateY.toFixed(2)}deg) scale3d(1.008, 1.008, 1.008)`
                : 'perspective(1000px) rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1)',
              transition: mainCard.mouseCoords.isInteracting
                ? 'transform 0.08s ease-out'
                : 'transform 0.45s cubic-bezier(0.23, 1, 0.32, 1), opacity 0.3s ease-out',
            }}
            className="group relative w-full rounded-[28px] sm:rounded-[32px] bg-[#141416] border border-[#222226] hover:border-[#383842] p-6 sm:p-8 shadow-[0_12px_40px_rgba(0,0,0,0.7)] hover:shadow-[0_16px_48px_rgba(0,0,0,0.85),0_0_25px_rgba(255,255,255,0.04)] transition-all duration-300 overflow-hidden cursor-pointer active:scale-[0.995] select-none preserve-3d"
            title="Toque para adicionar uma refeição"
          >
            {/* Flashlight Border Glow (Monochromatic) */}
            <div
              className="flashlight-layer absolute inset-0 rounded-[28px] sm:rounded-[32px] p-[1px] pointer-events-none z-10"
              style={{
                opacity: mainCard.mouseCoords.isInteracting ? 1 : 0,
                background: mainCard.mouseCoords.isInteracting
                  ? `radial-gradient(340px circle at ${mainCard.mouseCoords.x}px ${mainCard.mouseCoords.y}px, rgba(255, 255, 255, 0.38), rgba(255, 255, 255, 0.05) 45%, transparent 75%)`
                  : 'none',
                WebkitMask:
                  'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)',
                WebkitMaskComposite: 'xor',
                maskComposite: 'exclude',
              }}
            />

            {/* Ambient flashlight surface glow */}
            <div
              className="flashlight-layer absolute inset-0 pointer-events-none rounded-[28px] sm:rounded-[32px] z-0 transition-opacity duration-300"
              style={{
                opacity: mainCard.mouseCoords.isInteracting ? 1 : 0,
                background: mainCard.mouseCoords.isInteracting
                  ? `radial-gradient(400px circle at ${mainCard.mouseCoords.x}px ${mainCard.mouseCoords.y}px, rgba(255, 255, 255, 0.04), transparent 75%)`
                  : 'none',
              }}
            />

            {/* Subtle monochromatic reflection */}
            <div
              className="holographic-foil absolute inset-0 pointer-events-none rounded-[28px] sm:rounded-[32px] z-20 pointer-events-none"
              style={{
                opacity: mainCard.mouseCoords.isInteracting ? 0.18 : 0,
                background: `linear-gradient(${115 + mainCard.mouseCoords.rotateY * 2}deg, transparent 35%, rgba(255,255,255,0.08) 50%, transparent 65%)`,
                transition: 'opacity 0.25s ease-out',
              }}
            />

            <div className="relative z-10 flex flex-col">
              {/* Header Row: Meta diária + Seletor de Data */}
              <div className="flex items-center justify-between">
                <div className="flex items-baseline gap-1.5">
                  <span className="text-xs sm:text-sm text-zinc-400 font-medium">Meta diária:</span>
                  <span className="text-xs sm:text-sm font-semibold text-zinc-200">{baseCalorieGoal} kcal</span>
                </div>

                {/* Seletor de Data com formato: xx/xx Dia (ex: 18/09 Sex) */}
                <div
                  className="relative flex items-center"
                  onClick={(e) => e.stopPropagation()}
                >
                  <label
                    htmlFor="fuel-date-picker"
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#18181c] hover:bg-[#22222a] border border-[#272730] text-xs font-medium text-zinc-300 hover:text-white transition-colors cursor-pointer select-none shadow-sm"
                  >
                    <CalendarIcon className="w-3.5 h-3.5 text-zinc-400" />
                    <span className="font-medium tracking-tight">{formatDateWithDay(selectedDate)}</span>
                    <input
                      id="fuel-date-picker"
                      type="date"
                      value={selectedDate}
                      onChange={(e) => {
                        if (e.target.value) setSelectedDate(e.target.value);
                      }}
                      onClick={(e) => e.stopPropagation()}
                      className="absolute inset-0 opacity-0 pointer-events-auto cursor-pointer [color-scheme:dark]"
                    />
                  </label>
                </div>
              </div>

              {/* Circular Progress Ring */}
              <div className="relative flex flex-col items-center justify-center my-6 sm:my-8 py-2">
                <div className="relative w-56 h-56 sm:w-64 sm:h-64 flex items-center justify-center">
                  <svg className="w-full h-full" viewBox="0 0 240 240">
                    <defs>
                      {/* Degradê de vermelho para laranja para a barra de progresso */}
                      <linearGradient id="calorieProgressGradient" x1="0%" y1="100%" x2="100%" y2="0%">
                        <stop offset="0%" stopColor="#dc2626" />
                        <stop offset="45%" stopColor="#ea580c" />
                        <stop offset="100%" stopColor="#f97316" />
                      </linearGradient>

                      {/* Degradê de vermelho para laranja para o símbolo de fogo */}
                      <linearGradient id="fireIconGradient" x1="0%" y1="100%" x2="0%" y2="0%">
                        <stop offset="0%" stopColor="#dc2626" />
                        <stop offset="45%" stopColor="#ea580c" />
                        <stop offset="100%" stopColor="#f97316" />
                      </linearGradient>
                    </defs>

                    {/* Círculo de fundo */}
                    <circle
                      cx="120"
                      cy="120"
                      r={radius}
                      fill="none"
                      stroke="#1c1c22"
                      strokeWidth="18"
                      className="transition-colors"
                    />

                    {/* Círculo preenchido com degradê vermelho para laranja */}
                    <g transform="translate(240, 0) scale(-1, 1) rotate(-90 120 120)">
                      <circle
                        cx="120"
                        cy="120"
                        r={radius}
                        fill="none"
                        stroke="url(#calorieProgressGradient)"
                        strokeWidth="18"
                        strokeLinecap="round"
                        strokeDasharray={circumference}
                        strokeDashoffset={strokeDashoffset}
                        className="transition-all duration-700 ease-out"
                      />
                    </g>
                  </svg>

                  {/* Centro: Símbolo de fire com degradê de vermelho para laranja + número menor + Calories */}
                  <div className="absolute inset-0 flex flex-col items-center justify-center text-center select-none pointer-events-none px-4">
                    {/* Símbolo de Fogo com degradê de vermelho para laranja */}
                    <div className="flex items-center justify-center mb-1">
                      <svg
                        className="w-9 h-9 sm:w-10 sm:h-10 drop-shadow-[0_0_14px_rgba(234,88,12,0.45)]"
                        viewBox="0 0 24 24"
                        fill="url(#fireIconGradient)"
                        stroke="url(#fireIconGradient)"
                        strokeWidth="0.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z" />
                      </svg>
                    </div>

                    {/* Número de calorias: soma das calorias menos descontos de treino/cardio se marcados */}
                    <span className="font-sans font-bold text-3xl sm:text-4xl text-white tracking-tight leading-none tabular-nums">
                      {netCalories}
                    </span>
                    <span className="text-xs sm:text-sm font-medium text-zinc-400 mt-1.5 tracking-wide">
                      Calories
                    </span>
                  </div>
                </div>

                {/* De baixo do círculo: Faltam: X calories (abatendo treino/cardio se marcados) */}
                <div className="mt-3 sm:mt-4 flex items-center justify-center gap-1.5 px-3.5 py-1.5 rounded-full bg-[#18181c]/90 border border-[#272732] shadow-sm select-none">
                  <span className="text-xs sm:text-sm font-medium text-zinc-400">Faltam:</span>
                  <span className="text-xs sm:text-sm font-bold text-white tracking-tight tabular-nums">
                    {Math.max(0, remainingCalories)} calories
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* 2. CARDS: FOOD (PRIMEIRO), EXERCISE, CARDIO */}
          <div className="grid grid-cols-3 gap-2.5 sm:gap-4">
            {/* Card 1: Food (Em primeiro, sem o símbolo de +) */}
            <div
              id="btn-food-card"
              ref={foodCard.ref}
              onClick={handleOpenAddMeal}
              onMouseMove={foodCard.handleMouseMove}
              onMouseEnter={foodCard.handleMouseEnter}
              onMouseLeave={foodCard.handleMouseLeave}
              style={{
                transform: foodCard.mouseCoords.isInteracting
                  ? `perspective(1000px) rotateX(${foodCard.mouseCoords.rotateX.toFixed(2)}deg) rotateY(${foodCard.mouseCoords.rotateY.toFixed(2)}deg) scale3d(1.02, 1.02, 1.02)`
                  : 'perspective(1000px) rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1)',
                transition: foodCard.mouseCoords.isInteracting
                  ? 'transform 0.08s ease-out'
                  : 'transform 0.45s cubic-bezier(0.23, 1, 0.32, 1), opacity 0.3s ease-out',
              }}
              className="group relative flex flex-col items-center justify-center text-center p-3.5 sm:p-4 rounded-[20px] bg-[#121215] border border-[#1f1f24] hover:border-[#32323b] shadow-[0_4px_20px_rgba(0,0,0,0.4)] transition-all duration-300 cursor-pointer select-none active:scale-[0.98] preserve-3d overflow-hidden"
              title="Toque para adicionar refeição"
            >
              <div
                className="flashlight-layer absolute inset-0 rounded-[20px] p-[1px] pointer-events-none z-10"
                style={{
                  opacity: foodCard.mouseCoords.isInteracting ? 1 : 0,
                  background: foodCard.mouseCoords.isInteracting
                    ? `radial-gradient(220px circle at ${foodCard.mouseCoords.x}px ${foodCard.mouseCoords.y}px, rgba(255, 255, 255, 0.35), rgba(255, 255, 255, 0.04) 40%, transparent 75%)`
                    : 'none',
                  WebkitMask:
                    'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)',
                  WebkitMaskComposite: 'xor',
                  maskComposite: 'exclude',
                }}
              />
              <div
                className="flashlight-layer absolute inset-0 pointer-events-none rounded-[20px] z-0"
                style={{
                  opacity: foodCard.mouseCoords.isInteracting ? 1 : 0,
                  background: foodCard.mouseCoords.isInteracting
                    ? `radial-gradient(260px circle at ${foodCard.mouseCoords.x}px ${foodCard.mouseCoords.y}px, rgba(255, 255, 255, 0.03), transparent 75%)`
                    : 'none',
                }}
              />
              <div className="relative z-10 flex flex-col items-center justify-center text-center w-full py-0.5">
                {/* Ícone reduzido no centro */}
                <div className="w-6 h-6 sm:w-7 sm:h-7 flex items-center justify-center mb-1 text-zinc-400 group-hover:text-zinc-200 transition-colors">
                  <UtensilsCrossed className="w-4 h-4 sm:w-4.5 sm:h-4.5" />
                </div>
                {/* Título com tamanho mantido */}
                <span className="text-xs sm:text-sm font-medium text-zinc-300 tracking-tight leading-tight">
                  Food
                </span>
                {/* Calorias com o mesmo tamanho da fonte do título */}
                <span className="text-xs sm:text-sm font-semibold text-white tracking-tight mt-1 leading-tight">
                  {consumedCalories}
                </span>
              </div>
            </div>

            {/* Card 2: Exercise */}
            <div
              id="btn-toggle-workout"
              ref={workoutCard.ref}
              onClick={handleToggleWorkout}
              onMouseMove={workoutCard.handleMouseMove}
              onMouseEnter={workoutCard.handleMouseEnter}
              onMouseLeave={workoutCard.handleMouseLeave}
              style={{
                transform: workoutCard.mouseCoords.isInteracting
                  ? `perspective(1000px) rotateX(${workoutCard.mouseCoords.rotateX.toFixed(2)}deg) rotateY(${workoutCard.mouseCoords.rotateY.toFixed(2)}deg) scale3d(1.02, 1.02, 1.02)`
                  : 'perspective(1000px) rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1)',
                transition: workoutCard.mouseCoords.isInteracting
                  ? 'transform 0.08s ease-out'
                  : 'transform 0.45s cubic-bezier(0.23, 1, 0.32, 1), opacity 0.3s ease-out',
              }}
              className="group relative flex flex-col items-center justify-center text-center p-3.5 sm:p-4 rounded-[20px] bg-[#121215] border border-[#1f1f24] hover:border-[#32323b] shadow-[0_4px_20px_rgba(0,0,0,0.4)] transition-all duration-300 cursor-pointer select-none active:scale-[0.98] preserve-3d overflow-hidden"
              title="Toque para validar treino (-210 kcal)"
            >
              {/* Check estilo Task no canto superior direito */}
              <div className="absolute top-2.5 right-2.5 sm:top-3 sm:right-3 pointer-events-none z-20">
                {isWorkoutDone ? (
                  <motion.div
                    initial={{ scale: 0.6, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="w-4 h-4 sm:w-4.5 sm:h-4.5 rounded-full bg-emerald-500 border border-emerald-400 flex items-center justify-center shadow-[0_0_10px_rgba(16,185,129,0.45)]"
                  >
                    <Check className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-white stroke-[3.2]" />
                  </motion.div>
                ) : (
                  <div className="w-4 h-4 sm:w-4.5 sm:h-4.5 rounded-full border border-[#4a4a52] group-hover:border-zinc-400 transition-colors bg-transparent" />
                )}
              </div>

              <div
                className="flashlight-layer absolute inset-0 rounded-[20px] p-[1px] pointer-events-none z-10"
                style={{
                  opacity: workoutCard.mouseCoords.isInteracting ? 1 : 0,
                  background: workoutCard.mouseCoords.isInteracting
                    ? `radial-gradient(220px circle at ${workoutCard.mouseCoords.x}px ${workoutCard.mouseCoords.y}px, rgba(255, 255, 255, 0.35), rgba(255, 255, 255, 0.04) 40%, transparent 75%)`
                    : 'none',
                  WebkitMask:
                    'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)',
                  WebkitMaskComposite: 'xor',
                  maskComposite: 'exclude',
                }}
              />
              <div
                className="flashlight-layer absolute inset-0 pointer-events-none rounded-[20px] z-0"
                style={{
                  opacity: workoutCard.mouseCoords.isInteracting ? 1 : 0,
                  background: workoutCard.mouseCoords.isInteracting
                    ? `radial-gradient(260px circle at ${workoutCard.mouseCoords.x}px ${workoutCard.mouseCoords.y}px, rgba(255, 255, 255, 0.03), transparent 75%)`
                    : 'none',
                }}
              />
              <div className="relative z-10 flex flex-col items-center justify-center text-center w-full py-0.5">
                {/* Ícone reduzido no centro */}
                <div className="w-6 h-6 sm:w-7 sm:h-7 flex items-center justify-center mb-1 text-zinc-400 group-hover:text-zinc-200 transition-colors">
                  <Dumbbell className="w-4 h-4 sm:w-4.5 sm:h-4.5" />
                </div>
                {/* Título com tamanho mantido */}
                <span className="text-xs sm:text-sm font-medium text-zinc-300 tracking-tight leading-tight">
                  Exercise
                </span>
                {/* Calorias com o mesmo tamanho da fonte do título */}
                <span className="text-xs sm:text-sm font-semibold text-white tracking-tight mt-1 leading-tight">
                  {isWorkoutDone ? '210' : '0'}
                </span>
              </div>
            </div>

            {/* Card 3: Cardio (com outro emoji/ícone HeartPulse) */}
            <div
              id="btn-toggle-cardio"
              ref={cardioCard.ref}
              onClick={handleToggleCardio}
              onMouseMove={cardioCard.handleMouseMove}
              onMouseEnter={cardioCard.handleMouseEnter}
              onMouseLeave={cardioCard.handleMouseLeave}
              style={{
                transform: cardioCard.mouseCoords.isInteracting
                  ? `perspective(1000px) rotateX(${cardioCard.mouseCoords.rotateX.toFixed(2)}deg) rotateY(${cardioCard.mouseCoords.rotateY.toFixed(2)}deg) scale3d(1.02, 1.02, 1.02)`
                  : 'perspective(1000px) rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1)',
                transition: cardioCard.mouseCoords.isInteracting
                  ? 'transform 0.08s ease-out'
                  : 'transform 0.45s cubic-bezier(0.23, 1, 0.32, 1), opacity 0.3s ease-out',
              }}
              className="group relative flex flex-col items-center justify-center text-center p-3.5 sm:p-4 rounded-[20px] bg-[#121215] border border-[#1f1f24] hover:border-[#32323b] shadow-[0_4px_20px_rgba(0,0,0,0.4)] transition-all duration-300 cursor-pointer select-none active:scale-[0.98] preserve-3d overflow-hidden"
              title="Toque para validar cardio (-200 kcal)"
            >
              {/* Check estilo Task no canto superior direito */}
              <div className="absolute top-2.5 right-2.5 sm:top-3 sm:right-3 pointer-events-none z-20">
                {isCardioDone ? (
                  <motion.div
                    initial={{ scale: 0.6, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="w-4 h-4 sm:w-4.5 sm:h-4.5 rounded-full bg-emerald-500 border border-emerald-400 flex items-center justify-center shadow-[0_0_10px_rgba(16,185,129,0.45)]"
                  >
                    <Check className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-white stroke-[3.2]" />
                  </motion.div>
                ) : (
                  <div className="w-4 h-4 sm:w-4.5 sm:h-4.5 rounded-full border border-[#4a4a52] group-hover:border-zinc-400 transition-colors bg-transparent" />
                )}
              </div>

              <div
                className="flashlight-layer absolute inset-0 rounded-[20px] p-[1px] pointer-events-none z-10"
                style={{
                  opacity: cardioCard.mouseCoords.isInteracting ? 1 : 0,
                  background: cardioCard.mouseCoords.isInteracting
                    ? `radial-gradient(220px circle at ${cardioCard.mouseCoords.x}px ${cardioCard.mouseCoords.y}px, rgba(255, 255, 255, 0.35), rgba(255, 255, 255, 0.04) 40%, transparent 75%)`
                    : 'none',
                  WebkitMask:
                    'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)',
                  WebkitMaskComposite: 'xor',
                  maskComposite: 'exclude',
                }}
              />
              <div
                className="flashlight-layer absolute inset-0 pointer-events-none rounded-[20px] z-0"
                style={{
                  opacity: cardioCard.mouseCoords.isInteracting ? 1 : 0,
                  background: cardioCard.mouseCoords.isInteracting
                    ? `radial-gradient(260px circle at ${cardioCard.mouseCoords.x}px ${cardioCard.mouseCoords.y}px, rgba(255, 255, 255, 0.03), transparent 75%)`
                    : 'none',
                }}
              />
              <div className="relative z-10 flex flex-col items-center justify-center text-center w-full py-0.5">
                {/* Ícone reduzido no centro: HeartPulse */}
                <div className="w-6 h-6 sm:w-7 sm:h-7 flex items-center justify-center mb-1 text-zinc-400 group-hover:text-zinc-200 transition-colors">
                  <HeartPulse className="w-4 h-4 sm:w-4.5 sm:h-4.5" />
                </div>
                {/* Título com tamanho mantido */}
                <span className="text-xs sm:text-sm font-medium text-zinc-300 tracking-tight leading-tight">
                  Cardio
                </span>
                {/* Calorias com o mesmo tamanho da fonte do título */}
                <span className="text-xs sm:text-sm font-semibold text-white tracking-tight mt-1 leading-tight">
                  {isCardioDone ? '200' : '0'}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* 3. REFEIÇÕES NO DESKTOP (visível somente ao dar scroll) */}
        {!isMobileView && dayMeals.length > 0 && (
          <div className="flex flex-col gap-2 mt-8 sm:mt-12 pt-2">
            <div className="flex flex-col gap-2">
              {dayMeals.map((meal) => (
                <div
                  key={meal.id}
                  onClick={() => handleOpenEditMeal(meal)}
                  className="group relative flex items-center justify-between p-3.5 sm:p-4 rounded-2xl bg-[#141416] border border-[#222226] hover:border-zinc-500 transition-all duration-200 shadow-sm cursor-pointer"
                  title="Toque para editar ou excluir"
                >
                  <div className="flex items-center gap-2.5 min-w-0 pr-3">
                    {/* Símbolo de comida na frente de cada refeição sem cor e sem quadrado */}
                    <UtensilsCrossed className="w-4 h-4 text-zinc-400 group-hover:text-zinc-300 shrink-0 transition-colors" />
                    <div className="flex flex-col min-w-0">
                      <span className="text-sm font-medium text-white tracking-tight truncate">
                        {meal.name}
                      </span>
                      {meal.time && (
                        <div className="flex items-center gap-1.5 mt-0.5 text-xs text-zinc-400">
                          <Clock className="w-3 h-3 text-zinc-500" />
                          <span className="font-mono text-[11px] text-zinc-400">{meal.time}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  <span className="px-2.5 py-1 rounded-lg bg-[#1a1a20] border border-[#2c2c36] font-mono text-xs font-semibold text-white shrink-0">
                    {meal.calories} kcal
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 4. COMPARTILHAR E LIMPAR NO DESKTOP */}
        {!isMobileView && (
          <div className="flex items-center justify-center gap-3 pt-12 pb-16 mt-8 border-t border-[#1c1c22]">
            <button
              type="button"
              id="btn-fuel-share-whatsapp"
              onClick={handleShareWhatsApp}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#141416] hover:bg-[#1e1e24] border border-[#24242a] hover:border-[#383842] text-zinc-200 hover:text-white text-xs sm:text-sm font-medium transition-all duration-200 active:scale-95 shadow-sm cursor-pointer"
              title="Compartilhar resumo"
            >
              <Share2 className="w-4 h-4 text-white" />
              <span>Compartilhar</span>
            </button>

            <button
              type="button"
              id="btn-fuel-clear-day"
              onClick={() => setIsClearConfirmOpen(true)}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#141416] hover:bg-red-950/30 border border-[#24242a] hover:border-red-900/40 text-zinc-400 hover:text-red-400 text-xs sm:text-sm font-medium transition-all duration-200 active:scale-95 shadow-sm cursor-pointer"
              title="Limpar dia"
            >
              <RotateCcw className="w-4 h-4 text-zinc-400" />
              <span>Limpar</span>
            </button>
          </div>
        )}

        {/* ========================================================================= */}
        {/* BARRA ARRASTÁVEL DE HISTÓRICO NO CELULAR (Substitui a barra de tarefas)    */}
        {/* ========================================================================= */}
        {isMobileView && (
          <>
            {/* Backdrop escuro quando a gaveta de histórico estiver aberta */}
            <AnimatePresence>
              {isMobileDrawerOpen && (
                <motion.div
                  key="drawer-backdrop"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  onClick={() => setIsMobileDrawerOpen(false)}
                  className="fixed inset-0 z-40 bg-black/75 backdrop-blur-xs"
                />
              )}
            </AnimatePresence>

            {/* Barra / Gaveta inferior arrastável fixa embaixo */}
            <motion.div
              key="mobile-drawer-sheet"
              drag="y"
              dragConstraints={{ top: 0, bottom: 0 }}
              dragElastic={{ top: 0.05, bottom: 0.15 }}
              onDragEnd={(_e, info) => {
                if (info.offset.y < -30 || info.velocity.y < -200) {
                  setIsMobileDrawerOpen(true);
                } else if (info.offset.y > 30 || info.velocity.y > 200) {
                  setIsMobileDrawerOpen(false);
                }
              }}
              animate={{
                y: isMobileDrawerOpen ? 0 : 'calc(100% - 22px)',
              }}
              transition={{
                type: 'spring',
                stiffness: 400,
                damping: 35,
              }}
              className="fixed bottom-0 left-0 right-0 z-50 h-[82vh] rounded-t-[20px] bg-[#121215] border-t border-[#26262e] shadow-[0_-12px_40px_rgba(0,0,0,0.95)] flex flex-col overflow-hidden"
            >
              {/* Alça superior: fechada NÃO aparece NADA, nenhuma informação, apenas a barrinha */}
              <div
                onClick={() => setIsMobileDrawerOpen((prev) => !prev)}
                className="w-full h-[22px] flex items-center justify-center cursor-pointer select-none shrink-0 bg-[#121215] active:bg-[#16161a] transition-colors"
              >
                {/* Barrinha indicadora estilizada conforme solicitado (width: 120px, height: 1.98958px, border-radius: 8.72827px) */}
                <div
                  className="bg-zinc-500 hover:bg-zinc-400 transition-colors shrink-0"
                  style={{
                    width: '120px',
                    height: '1.98958px',
                    borderRadius: '8.72827px',
                  }}
                />
              </div>

              {/* Conteúdo da gaveta: apenas as refeições (se não tiver refeição, fica vazia) */}
              <div className="flex-1 overflow-y-auto px-4 py-3 flex flex-col gap-3 overscroll-contain">
                {dayMeals.length > 0 ? (
                  <>
                    <div className="flex flex-col gap-2">
                      {dayMeals.map((meal) => (
                        <div
                          key={meal.id}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleOpenEditMeal(meal);
                          }}
                          className="group relative flex items-center justify-between p-3.5 rounded-2xl bg-[#16161a] border border-[#24242c] active:border-zinc-400 transition-all shadow-sm cursor-pointer"
                          title="Toque para editar ou excluir"
                        >
                          <div className="flex items-center gap-2.5 min-w-0 pr-3">
                            {/* Símbolo de comida na frente de cada refeição sem cor e sem quadrado */}
                            <UtensilsCrossed className="w-4 h-4 text-zinc-400 shrink-0" />
                            <div className="flex flex-col min-w-0">
                              <span className="text-sm font-medium text-white tracking-tight truncate">
                                {meal.name}
                              </span>
                              {meal.time && (
                                <div className="flex items-center gap-1.5 mt-0.5 text-xs text-zinc-400">
                                  <Clock className="w-3 h-3 text-zinc-500" />
                                  <span className="font-mono text-[11px] text-zinc-400">{meal.time}</span>
                                </div>
                              )}
                            </div>
                          </div>

                          <span className="px-2.5 py-1 rounded-lg bg-[#202028] border border-[#30303c] font-mono text-xs font-semibold text-white shrink-0">
                            {meal.calories} kcal
                          </span>
                        </div>
                      ))}
                    </div>

                    {/* Ações inferiores na gaveta: Compartilhar e Limpar */}
                    <div className="flex items-center justify-center gap-3 pt-4 pb-8 mt-2 border-t border-[#1c1c22]">
                      <button
                        type="button"
                        id="btn-fuel-share-whatsapp-mobile"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleShareWhatsApp();
                        }}
                        className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-[#18181d] active:bg-[#22222a] border border-[#282832] active:border-[#383842] text-zinc-200 active:text-white text-xs font-medium transition-all active:scale-98 shadow-sm cursor-pointer"
                        title="Compartilhar resumo"
                      >
                        <Share2 className="w-4 h-4 text-white" />
                        <span>Compartilhar</span>
                      </button>

                      <button
                        type="button"
                        id="btn-fuel-clear-day-mobile"
                        onClick={(e) => {
                          e.stopPropagation();
                          setIsClearConfirmOpen(true);
                        }}
                        className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-[#18181d] active:bg-red-950/30 border border-[#282832] active:border-red-900/40 text-zinc-400 active:text-red-400 text-xs font-medium transition-all active:scale-98 shadow-sm cursor-pointer"
                        title="Limpar dia"
                      >
                        <RotateCcw className="w-4 h-4 text-zinc-400" />
                        <span>Limpar</span>
                      </button>
                    </div>
                  </>
                ) : null}
              </div>
            </motion.div>
          </>
        )}

      {/* ========================================================================= */}
      {/* POPUP STEP 1: DIGITAR APENAS O VALOR DAS CALORIAS (Layout da imagem)      */}
      {/* Movido mais para cima na view celular (pt-20 items-start no mobile)        */}
      {/* ========================================================================= */}
      <AnimatePresence>
        {addMealStep === 'calories' && (
          <div className="fixed inset-0 z-50 flex items-start sm:items-center justify-center pt-20 sm:pt-0 p-4 bg-black/75 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.94, y: -10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.94, y: -10 }}
              transition={{ duration: 0.2, ease: 'easeOut' }}
              className="relative w-full max-w-sm rounded-[24px] bg-[#16161a] border border-[#2c2c34] p-5 shadow-[0_20px_60px_rgba(0,0,0,0.85)] flex flex-col gap-4"
            >
              {/* Título idêntico ao modelo da imagem */}
              <div className="flex flex-col">
                <span className="text-xs sm:text-sm font-medium text-zinc-300 tracking-tight">
                  Digite o valor (ex: 450):
                </span>
              </div>

              <form onSubmit={handleCaloriesStepSubmit} className="flex flex-col gap-4">
                {/* Campo de valor em destaque */}
                <div className="relative w-full">
                  <input
                    ref={calorieInputRef}
                    type="number"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    autoFocus
                    required
                    min="1"
                    placeholder="Qual o valor?"
                    value={mealCalories}
                    onChange={(e) => setMealCalories(e.target.value)}
                    className="w-full px-4 py-4 rounded-2xl bg-[#0f0f13] border border-[#292934] text-lg sm:text-xl font-medium text-white placeholder:text-zinc-500 focus:outline-none focus:border-white transition-colors [color-scheme:dark]"
                  />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-mono text-zinc-400 pointer-events-none">
                    kcal
                  </span>
                </div>

                {/* Botões Cancelar e OK (Estilo do site: botão metálico com acabamento refinado) */}
                <div className="grid grid-cols-2 gap-3 pt-1">
                  <button
                    type="button"
                    onClick={() => setAddMealStep(null)}
                    className="w-full py-3 rounded-xl bg-[#202026] hover:bg-[#282832] border border-[#2e2e38] active:scale-98 text-xs sm:text-sm font-medium text-zinc-300 hover:text-white transition-all cursor-pointer text-center"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="relative overflow-hidden w-full py-3 rounded-xl bg-gradient-to-b from-[#ffffff] via-[#e2e5e9] to-[#b8bdc5] text-[#111113] border border-white/90 shadow-[0_2px_12px_rgba(0,0,0,0.4),inset_0_1px_1px_rgba(255,255,255,0.95)] hover:shadow-[0_4px_16px_rgba(255,255,255,0.25)] active:scale-98 text-xs sm:text-sm font-bold transition-all cursor-pointer text-center"
                  >
                    OK
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ========================================================================= */}
      {/* POPUP STEP 2: IGUAL AO POPUP 1, APENAS PEDINDO O NOME                      */}
      {/* Movido mais para cima na view celular (pt-20 items-start no mobile)        */}
      {/* ========================================================================= */}
      <AnimatePresence>
        {addMealStep === 'name' && (
          <div className="fixed inset-0 z-50 flex items-start sm:items-center justify-center pt-20 sm:pt-0 p-4 bg-black/75 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.94, y: -10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.94, y: -10 }}
              transition={{ duration: 0.2, ease: 'easeOut' }}
              className="relative w-full max-w-sm rounded-[24px] bg-[#16161a] border border-[#2c2c34] p-5 shadow-[0_20px_60px_rgba(0,0,0,0.85)] flex flex-col gap-4"
            >
              {/* Título idêntico ao modelo da imagem */}
              <div className="flex flex-col">
                <span className="text-xs sm:text-sm font-medium text-zinc-300 tracking-tight">
                  Digite o nome (ex: Almoço):
                </span>
              </div>

              <form onSubmit={handleNameStepSubmit} className="flex flex-col gap-4">
                {/* Campo de nome em destaque */}
                <div className="relative w-full">
                  <input
                    ref={nameInputRef}
                    type="text"
                    autoFocus
                    placeholder="Qual a refeição?"
                    value={mealName}
                    onChange={(e) => setMealName(e.target.value)}
                    className="w-full px-4 py-4 rounded-2xl bg-[#0f0f13] border border-[#292934] text-base sm:text-lg font-medium text-white placeholder:text-zinc-500 focus:outline-none focus:border-white transition-colors"
                  />
                </div>

                {/* Botões Cancelar e OK (Estilo do site: botão metálico com acabamento refinado) */}
                <div className="grid grid-cols-2 gap-3 pt-1">
                  <button
                    type="button"
                    onClick={() => setAddMealStep(null)}
                    className="w-full py-3 rounded-xl bg-[#202026] hover:bg-[#282832] border border-[#2e2e38] active:scale-98 text-xs sm:text-sm font-medium text-zinc-300 hover:text-white transition-all cursor-pointer text-center"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="relative overflow-hidden w-full py-3 rounded-xl bg-gradient-to-b from-[#ffffff] via-[#e2e5e9] to-[#b8bdc5] text-[#111113] border border-white/90 shadow-[0_2px_12px_rgba(0,0,0,0.4),inset_0_1px_1px_rgba(255,255,255,0.95)] hover:shadow-[0_4px_16px_rgba(255,255,255,0.25)] active:scale-98 text-xs sm:text-sm font-bold transition-all cursor-pointer text-center"
                  >
                    OK
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ========================================================================= */}
      {/* MODAL DE EDIÇÃO: PARA QUANDO CLICAR NO HISTÓRICO                           */}
      {/* ========================================================================= */}
      <AnimatePresence>
        {isEditModalOpen && editingMeal && (
          <div className="fixed inset-0 z-50 flex items-start sm:items-center justify-center pt-16 sm:pt-0 p-4 bg-black/75 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="relative w-full max-w-md rounded-2xl bg-[#16161a] border border-[#282832] p-5 sm:p-6 shadow-2xl overflow-hidden"
            >
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <span className="text-xl">🔥</span>
                  <h3 className="text-base font-semibold text-white">
                    Editar Refeição
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-[#202026] transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleSaveEditedMeal} className="flex flex-col gap-4">
                {/* Nome */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-medium text-zinc-300">
                    Nome da Refeição
                  </label>
                  <input
                    type="text"
                    required
                    value={mealName}
                    onChange={(e) => setMealName(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#0b0b0e] border border-[#282832] text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-zinc-400 transition-colors"
                  />
                </div>

                {/* Calorias e Horário */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-medium text-zinc-300">
                      Calorias (kcal)
                    </label>
                    <input
                      type="number"
                      required
                      min="0"
                      inputMode="numeric"
                      value={mealCalories}
                      onChange={(e) => setMealCalories(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-[#0b0b0e] border border-[#282832] text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-zinc-400 transition-colors font-mono"
                    />
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-medium text-zinc-300">
                      Horário
                    </label>
                    <input
                      type="time"
                      value={mealTime}
                      onChange={(e) => setMealTime(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-[#0b0b0e] border border-[#282832] text-sm text-white focus:outline-none focus:border-zinc-400 transition-colors [color-scheme:dark]"
                    />
                  </div>
                </div>

                {/* Ações: Excluir e Salvar */}
                <div className="flex items-center justify-between gap-2.5 mt-2 pt-3 border-t border-[#222228]">
                  <button
                    type="button"
                    onClick={() => {
                      onDeleteMeal(editingMeal.id);
                      setIsEditModalOpen(false);
                      showNotification('Refeição excluída');
                    }}
                    className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium text-red-400 hover:text-red-300 hover:bg-red-950/30 border border-red-900/30 transition-colors cursor-pointer"
                    title="Excluir esta refeição"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Excluir</span>
                  </button>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setIsEditModalOpen(false)}
                      className="px-4 py-2.5 rounded-xl bg-[#202026] hover:bg-[#282832] border border-[#2e2e38] text-xs font-medium text-zinc-300 hover:text-white transition-all cursor-pointer"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      className="relative overflow-hidden px-5 py-2.5 rounded-xl bg-gradient-to-b from-[#ffffff] via-[#e2e5e9] to-[#b8bdc5] text-[#111113] border border-white/90 shadow-[0_2px_12px_rgba(0,0,0,0.4),inset_0_1px_1px_rgba(255,255,255,0.95)] hover:shadow-[0_4px_16px_rgba(255,255,255,0.25)] active:scale-98 text-xs font-bold transition-all cursor-pointer text-center"
                    >
                      Salvar
                    </button>
                  </div>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ========================================================================= */}
      {/* MODAL DE CONFIRMAÇÃO PARA LIMPAR O DIA                                    */}
      {/* ========================================================================= */}
      <AnimatePresence>
        {isClearConfirmOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="relative w-full max-w-sm rounded-2xl bg-[#141416] border border-[#282830] p-5 sm:p-6 shadow-2xl text-center"
            >
              <div className="w-12 h-12 rounded-full bg-red-950/40 border border-red-900/40 flex items-center justify-center mx-auto mb-3">
                <RotateCcw className="w-5 h-5 text-red-400" />
              </div>
              <h3 className="text-base font-semibold text-white mb-1.5">
                Limpar dia {formatDateShort(selectedDate)}?
              </h3>
              <p className="text-xs text-zinc-400 leading-relaxed mb-5">
                Isso removerá todas as refeições registradas e desmarcará o treino e cardio para esta data.
              </p>

              <div className="flex items-center justify-center gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsClearConfirmOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-medium text-zinc-300 hover:text-white bg-[#1b1b20] hover:bg-[#25252c] transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleConfirmClear}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-white bg-red-600 hover:bg-red-500 transition-colors shadow-md cursor-pointer"
                >
                  Limpar tudo
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
