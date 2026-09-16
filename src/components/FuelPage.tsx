import React, { useState, useMemo, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Calendar as CalendarIcon,
  X,
  Clock,
  Dumbbell,
  Activity,
  Share2,
  RotateCcw,
  ChevronRight,
  Trash2,
  Check,
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
}

const getTodayIso = () => {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const getDayOfWeekName = (dateStr: string) => {
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
  return days[d.getDay()] || 'Dia';
};

const formatDateShort = (dateStr: string) => {
  const parts = dateStr.split('-');
  if (parts.length === 3) {
    return `${parts[2]}/${parts[1]}`;
  }
  return dateStr;
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

  // Status visual ao lado de Calories com fonte fina:
  // Ok! Good! Excelent! Max! e se passar Stop!
  const statusConfig = useMemo(() => {
    if (netCalories > baseCalorieGoal) {
      return {
        word: 'Stop!',
        color: '#ef4444', // red
        glow: 'rgba(239, 68, 68, 0.55)',
      };
    }
    if (netCalories > 1750) {
      return {
        word: 'Max!',
        color: '#f97316', // orange
        glow: 'rgba(249, 115, 22, 0.5)',
      };
    }
    if (netCalories >= 1200) {
      return {
        word: 'Excelent!',
        color: '#38bdf8', // blue / sky
        glow: 'rgba(56, 189, 248, 0.45)',
      };
    }
    if (netCalories >= 600) {
      return {
        word: 'Good!',
        color: '#22c55e', // green
        glow: 'rgba(34, 197, 94, 0.45)',
      };
    }
    return {
      word: 'Ok!',
      color: '#ffffff', // white
      glow: 'rgba(255, 255, 255, 0.4)',
    };
  }, [netCalories, baseCalorieGoal]);

  // Subtle flashlight coordinates for top card
  const cardRef = useRef<HTMLDivElement>(null);
  const [mouseCoords, setMouseCoords] = useState({
    x: 0,
    y: 0,
    isInteracting: false,
  });

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    setMouseCoords({ x, y, isInteracting: true });
  };

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

  // Circular gauge calculations
  const radius = 92;
  const circumference = 2 * Math.PI * radius;
  const progressRatio = Math.min(netCalories / baseCalorieGoal, 1);
  const strokeDashoffset = circumference - progressRatio * circumference;

  return (
    <div className="w-full max-w-xl mx-auto flex flex-col gap-5 sm:gap-6 animate-in fade-in duration-300">
      {/* ========================================================================= */}
      {/* 1. TOP MAIN CARD: Clicável para Adicionar Refeição                         */}
      {/* ========================================================================= */}
      <div
        ref={cardRef}
        onClick={handleOpenAddMeal}
        onMouseMove={handleMouseMove}
        onMouseEnter={() => setMouseCoords((p) => ({ ...p, isInteracting: true }))}
        onMouseLeave={() => setMouseCoords({ x: 0, y: 0, isInteracting: false })}
        className="group relative w-full rounded-[28px] sm:rounded-[32px] bg-[#141416] border border-[#222226] hover:border-zinc-500 p-6 sm:p-8 shadow-[0_12px_40px_rgba(0,0,0,0.7)] transition-all duration-300 overflow-hidden cursor-pointer active:scale-[0.995] select-none"
        title="Toque para adicionar uma refeição"
      >
        {/* Ambient flashlight glow */}
        <div
          className="pointer-events-none absolute inset-0 z-0 transition-opacity duration-300"
          style={{
            opacity: mouseCoords.isInteracting ? 1 : 0,
            background: mouseCoords.isInteracting
              ? `radial-gradient(400px circle at ${mouseCoords.x}px ${mouseCoords.y}px, rgba(255, 255, 255, 0.05), transparent 75%)`
              : 'none',
          }}
        />

        <div className="relative z-10 flex flex-col">
          {/* Header Row: 🔥 Calories + status fina ao lado + Seletor de Data */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-base sm:text-lg">🔥</span>
              <span className="text-sm sm:text-base font-medium text-zinc-200 tracking-tight">
                Calories
              </span>
              {/* Palavras com fonte fina seguindo a cor atual: Ok! Good! Excelent! Max! Stop! */}
              <span
                className="text-xs sm:text-sm font-light tracking-wide transition-colors duration-300 ml-0.5"
                style={{ color: statusConfig.color }}
              >
                {statusConfig.word}
              </span>
            </div>

            <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
              {/* Date selector */}
              <div className="relative flex items-center">
                <label
                  htmlFor="fuel-date-picker"
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#1b1b1f] hover:bg-[#24242a] border border-[#2a2a32] text-xs font-medium text-zinc-300 hover:text-white transition-colors cursor-pointer select-none"
                >
                  <CalendarIcon className="w-3 h-3 text-zinc-400" />
                  <span>{formatDateShort(selectedDate)}</span>
                  <input
                    id="fuel-date-picker"
                    type="date"
                    value={selectedDate}
                    onChange={(e) => {
                      if (e.target.value) setSelectedDate(e.target.value);
                    }}
                    className="absolute inset-0 opacity-0 pointer-events-auto cursor-pointer [color-scheme:dark]"
                  />
                </label>
              </div>
            </div>
          </div>

          {/* ========================================================================= */}
          {/* Circular Progress Ring: Sentido anti-horário partindo de 12h               */}
          {/* Dentro do círculo: número moderno e limpo, sem ser Newsreader serif       */}
          {/* ========================================================================= */}
          <div className="relative flex items-center justify-center my-6 sm:my-8 py-2">
            <div className="relative w-56 h-56 sm:w-64 sm:h-64 flex items-center justify-center">
              <svg className="w-full h-full" viewBox="0 0 240 240">
                {/* Background Ring Track */}
                <circle
                  cx="120"
                  cy="120"
                  r={radius}
                  fill="none"
                  stroke="#1c1c20"
                  strokeWidth="18"
                  className="transition-colors"
                />

                {/* Animated Dynamic Color Arc (Sentido anti-horário) */}
                <g transform="translate(240, 0) scale(-1, 1) rotate(-90 120 120)">
                  <circle
                    cx="120"
                    cy="120"
                    r={radius}
                    fill="none"
                    stroke={statusConfig.color}
                    strokeWidth="18"
                    strokeLinecap="round"
                    strokeDasharray={circumference}
                    strokeDashoffset={strokeDashoffset}
                    className="transition-all duration-700 ease-out"
                    style={{
                      filter: `drop-shadow(0 0 10px ${statusConfig.glow})`,
                    }}
                  />
                </g>
              </svg>

              {/* Inside the Ring: número moderno (sans serif limpa) com formatação de milhar */}
              <div className="absolute inset-0 flex flex-col items-center justify-center text-center select-none pointer-events-none px-4">
                <div className="flex items-baseline justify-center gap-1">
                  <span className="font-sans font-semibold text-5xl sm:text-6xl text-white tracking-tight leading-none tabular-nums">
                    {formatKcal(netCalories)}
                  </span>
                  <span className="text-sm sm:text-base text-zinc-400 font-medium tracking-wide">
                    kcal
                  </span>
                </div>

                {/* Embaixo do kcal: x (número consumido) / total de kcal */}
                <div className="flex items-center gap-1 mt-2 text-xs sm:text-sm font-mono text-zinc-400">
                  <span className="text-zinc-200 font-semibold">
                    {formatKcal(consumedCalories)}
                  </span>
                  <span className="text-zinc-600">/</span>
                  <span className="text-zinc-400">
                    {formatKcal(baseCalorieGoal)} kcal
                  </span>
                </div>

                {totalBurned > 0 && (
                  <span className="text-[11px] font-mono text-zinc-500 mt-1">
                    -{totalBurned} kcal gastas
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 2. CARDS DE TREINO E CARDIO NO ESTILO EXATO DA FOTO DO USUÁRIO             */}
      {/* Com fonte branca e estilo limpo do site, iniciando em 0 e com check        */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4">
        {/* Card 1: Treino (Estilo Steps da foto: título + check, valor 0/210 + gráfico de barras) */}
        <div
          id="btn-toggle-workout"
          onClick={handleToggleWorkout}
          className="relative flex flex-col justify-between p-4 sm:p-5 rounded-[22px] bg-[#141416] border border-[#222226] hover:border-[#383842] transition-all duration-200 cursor-pointer shadow-sm select-none active:scale-[0.99]"
        >
          {/* Top Row: Ícone + Treino + Check apenas quando selecionado (sem círculo) */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Dumbbell className={`w-4 h-4 ${isWorkoutDone ? 'text-white' : 'text-zinc-400'}`} />
              <span className="text-xs sm:text-sm font-medium text-white tracking-tight">
                Treino
              </span>
            </div>
            {/* Check apenas quando selecionado, sem círculo */}
            <div className="w-5 h-5 flex items-center justify-end">
              {isWorkoutDone && (
                <Check className="w-4 h-4 text-white stroke-[2.5]" />
              )}
            </div>
          </div>

          {/* Bottom Row: Valor (inicia em 0, e selecionado aparece 210) e Gráfico com opacidade bem mais baixa sem seleção */}
          <div className="flex items-end justify-between mt-5 pt-1">
            <div className="flex flex-col">
              <span className="font-sans font-semibold text-2xl sm:text-3xl text-white tracking-tight leading-none">
                {isWorkoutDone ? '210' : '0'}
              </span>
              <span className="text-xs text-zinc-400 font-medium mt-1">
                kcal
              </span>
            </div>

            {/* Gráfico de Barras Verticais arredondadas (com opacidade bem mais baixa quando desmarcado) */}
            <div className={`flex items-end gap-1.5 h-10 pb-0.5 transition-opacity duration-300 ${isWorkoutDone ? 'opacity-100' : 'opacity-[0.07]'}`}>
              <div
                className={`w-2 sm:w-2.5 rounded-full transition-all duration-300 ${
                  isWorkoutDone ? 'bg-zinc-300' : 'bg-zinc-700'
                }`}
                style={{ height: '40%' }}
              />
              <div
                className={`w-2 sm:w-2.5 rounded-full transition-all duration-300 ${
                  isWorkoutDone ? 'bg-zinc-200' : 'bg-zinc-600'
                }`}
                style={{ height: '65%' }}
              />
              <div
                className={`w-2 sm:w-2.5 rounded-full transition-all duration-300 ${
                  isWorkoutDone ? 'bg-white shadow-[0_0_8px_rgba(255,255,255,0.5)]' : 'bg-zinc-400'
                }`}
                style={{ height: '100%' }}
              />
              <div
                className={`w-2 sm:w-2.5 rounded-full transition-all duration-300 ${
                  isWorkoutDone ? 'bg-zinc-300' : 'bg-zinc-700'
                }`}
                style={{ height: '50%' }}
              />
            </div>
          </div>
        </div>

        {/* Card 2: Cardio (Estilo Water da foto: título + check, valor 0/200 + linha de onda) */}
        <div
          id="btn-toggle-cardio"
          onClick={handleToggleCardio}
          className="relative flex flex-col justify-between p-4 sm:p-5 rounded-[22px] bg-[#141416] border border-[#222226] hover:border-[#383842] transition-all duration-200 cursor-pointer shadow-sm select-none active:scale-[0.99]"
        >
          {/* Top Row: Ícone + Cardio + Check apenas quando selecionado (sem círculo) */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Activity className={`w-4 h-4 ${isCardioDone ? 'text-white' : 'text-zinc-400'}`} />
              <span className="text-xs sm:text-sm font-medium text-white tracking-tight">
                Cardio
              </span>
            </div>
            {/* Check apenas quando selecionado, sem círculo */}
            <div className="w-5 h-5 flex items-center justify-end">
              {isCardioDone && (
                <Check className="w-4 h-4 text-white stroke-[2.5]" />
              )}
            </div>
          </div>

          {/* Bottom Row: Valor (inicia em 0, e selecionado aparece 200) e Linha com opacidade bem mais baixa sem seleção */}
          <div className="flex items-end justify-between mt-5 pt-1">
            <div className="flex flex-col">
              <span className="font-sans font-semibold text-2xl sm:text-3xl text-white tracking-tight leading-none">
                {isCardioDone ? '200' : '0'}
              </span>
              <span className="text-xs text-zinc-400 font-medium mt-1">
                kcal
              </span>
            </div>

            {/* Linha em formato de onda suave em SVG (com opacidade bem mais baixa quando desmarcado) */}
            <div className={`w-16 sm:w-20 h-10 flex items-center justify-end transition-opacity duration-300 ${isCardioDone ? 'opacity-100' : 'opacity-[0.07]'}`}>
              <svg viewBox="0 0 80 40" className="w-full h-full overflow-visible">
                <path
                  d="M 2,28 Q 12,28 20,20 T 38,18 T 54,8 T 68,26 T 78,22"
                  fill="none"
                  stroke={isCardioDone ? '#ffffff' : '#a1a1aa'}
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="transition-all duration-300"
                  style={{
                    filter: isCardioDone ? 'drop-shadow(0 0 4px rgba(255,255,255,0.4))' : 'none',
                  }}
                />
              </svg>
            </div>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 3. HISTÓRICO DE REFEIÇÕES                                                 */}
      {/* "se nenhum refeição for registarda nao coloque nada"                       */}
      {/* ========================================================================= */}
      {dayMeals.length > 0 && (
        <div className="flex flex-col gap-2.5 mt-1">
          <div className="flex items-center justify-between px-1">
            <h3 className="text-sm font-semibold text-zinc-200">
              Historico
            </h3>
          </div>

          <div className="flex flex-col gap-2">
            {dayMeals.map((meal) => (
              <div
                key={meal.id}
                onClick={() => handleOpenEditMeal(meal)}
                className="group relative flex items-center justify-between p-3.5 sm:p-4 rounded-2xl bg-[#141416] border border-[#222226] hover:border-zinc-500 transition-all duration-200 shadow-sm cursor-pointer"
                title="Toque para editar ou excluir"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-[#1b1b20] border border-[#282830] flex items-center justify-center text-xs text-white shrink-0">
                    🔥
                  </div>
                  <div className="flex flex-col">
                    <span className="text-sm font-medium text-white tracking-tight">
                      {meal.name}
                    </span>
                    {meal.time && (
                      <div className="flex items-center gap-1 mt-0.5 text-xs text-zinc-400">
                        <Clock className="w-3 h-3" />
                        <span className="font-mono text-[11px]">{meal.time}</span>
                      </div>
                    )}
                  </div>
                </div>

                <span className="px-2.5 py-1 rounded-lg bg-[#1a1a20] border border-[#2c2c36] font-mono text-xs font-semibold text-white">
                  {meal.calories} kcal
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 4. COMPARTILHAR E LIMPAR BEM EMBAIXO DO SITE                               */}
      {/* "deixe bem embaixo do site para ficar mais para baixo,                     */}
      {/* e troque o nome para Compartilhar, e Limpar"                              */}
      {/* ========================================================================= */}
      <div className="flex items-center justify-center gap-3 pt-12 pb-16 mt-8 border-t border-[#1c1c22]">
        {/* Compartilhar */}
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

        {/* Limpar */}
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

      {/* ========================================================================= */}
      {/* POPUP STEP 1: DIGITAR APENAS O VALOR DAS CALORIAS (Layout da imagem)      */}
      {/* Botão OK agora em BRANCO com texto PRETO                                  */}
      {/* ========================================================================= */}
      <AnimatePresence>
        {addMealStep === 'calories' && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.94, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.94, y: 15 }}
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
      {/* Sem poluição, horário é automático, OK estilo do site                      */}
      {/* ========================================================================= */}
      <AnimatePresence>
        {addMealStep === 'name' && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.94, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.94, y: 15 }}
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
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md">
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
