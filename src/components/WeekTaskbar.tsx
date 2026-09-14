import React, { useMemo } from 'react';
import { motion } from 'motion/react';
import { Menu } from 'lucide-react';
import { TaskItem } from '../types';

interface WeekTaskbarProps {
  selectedDate: string; // YYYY-MM-DD or 'all'
  onSelectDate: (date: string) => void;
  tasks?: TaskItem[];
}

export const WeekTaskbar: React.FC<WeekTaskbarProps> = ({
  selectedDate,
  onSelectDate,
}) => {
  // Generate the next 7 days starting from today
  const days = useMemo(() => {
    const list = [];

    for (let i = 0; i < 7; i++) {
      const d = new Date();
      d.setDate(d.getDate() + i);

      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const dayNum = String(d.getDate()).padStart(2, '0');
      const iso = `${year}-${month}-${dayNum}`;

      list.push({
        iso,
        dayNum,
      });
    }
    return list;
  }, []);

  const isAllSelected = selectedDate === 'all';

  const navVariants = {
    hidden: {
      opacity: 0,
      clipPath: 'inset(0% 100% 0% 0% round 9999px)',
    },
    visible: {
      opacity: 1,
      clipPath: 'inset(0% 0% 0% 0% round 9999px)',
      transition: {
        clipPath: {
          duration: 0.38,
          ease: [0.16, 1, 0.3, 1],
        },
        opacity: { duration: 0.1 },
        staggerChildren: 0.035,
        delayChildren: 0.04,
      },
    },
    exit: {
      opacity: 0,
      clipPath: 'inset(0% 100% 0% 0% round 9999px)',
      transition: { duration: 0.18, ease: 'easeIn' },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, x: -8, scale: 0.86 },
    visible: {
      opacity: 1,
      x: 0,
      scale: 1,
      transition: {
        type: 'spring',
        stiffness: 320,
        damping: 24,
      },
    },
  };

  return (
    <motion.nav
      id="week-taskbar"
      aria-label="Barra dos Próximos 7 Dias"
      variants={navVariants}
      initial="hidden"
      animate="visible"
      exit="exit"
      className="flex items-center gap-1 sm:gap-1.5 p-1.5 rounded-full bg-[#0e0e0e] border border-[#202025] shadow-[0_8px_24px_rgba(0,0,0,0.85)] backdrop-blur-md overflow-x-auto"
    >
      {days.map((day) => {
        const isSelected = selectedDate === day.iso;

        return (
          <motion.button
            key={day.iso}
            type="button"
            variants={itemVariants}
            id={`week-day-${day.iso}`}
            onClick={() => onSelectDate(day.iso)}
            className={`relative w-8 h-8 sm:w-9 sm:h-9 rounded-full transition-colors duration-200 cursor-pointer flex items-center justify-center select-none text-xs sm:text-sm ${
              isSelected
                ? 'text-white font-bold'
                : 'text-zinc-500 hover:text-zinc-300 font-medium'
            }`}
            title={`Dia ${day.dayNum}`}
          >
            {isSelected && (
              <motion.div
                layoutId="week-active-day-pill"
                initial={{ opacity: 0, scale: 0.8, x: -8 }}
                animate={{ opacity: 1, scale: 1, x: 0 }}
                transition={{ type: 'spring', stiffness: 380, damping: 28 }}
                className="absolute inset-0 rounded-full bg-[#1a1a1f] border border-[#30303a] shadow-sm pointer-events-none"
              />
            )}
            <span className="relative z-10">{day.dayNum}</span>
          </motion.button>
        );
      })}

      {/* Separador sutil */}
      <motion.div variants={itemVariants} className="w-[1px] h-4 bg-[#232328] mx-0.5 shrink-0" />

      {/* Opção Todas: Símbolo de 3 linhas após os 7 dias */}
      <motion.button
        type="button"
        variants={itemVariants}
        id="week-day-all-tasks"
        onClick={() => onSelectDate('all')}
        className={`relative w-8 h-8 sm:w-9 sm:h-9 rounded-full transition-colors duration-200 cursor-pointer flex items-center justify-center select-none ${
          isAllSelected
            ? 'text-white font-bold'
            : 'text-zinc-500 hover:text-zinc-300 font-medium'
        }`}
        title="Ver todas as tarefas"
      >
        {isAllSelected && (
          <motion.div
            layoutId="week-active-day-pill"
            initial={{ opacity: 0, scale: 0.8, x: -8 }}
            animate={{ opacity: 1, scale: 1, x: 0 }}
            transition={{ type: 'spring', stiffness: 380, damping: 28 }}
            className="absolute inset-0 rounded-full bg-[#1a1a1f] border border-[#30303a] shadow-sm pointer-events-none"
          />
        )}
        <Menu className="relative z-10 w-3.5 h-3.5 stroke-[2.2]" />
      </motion.button>
    </motion.nav>
  );
};




