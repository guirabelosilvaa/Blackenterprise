import { TaskItem } from '../types';

/**
 * Checks if a date string (YYYY-MM-DD) is within the allowed window:
 * between 2 days ago and 7 days ahead from today.
 */
export const isDateWithinTaskWindow = (dateStr: string): boolean => {
  if (!dateStr) return false;
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [y, m, d] = dateStr.split('-').map(Number);
    if (!y || !m || !d) return false;

    const target = new Date(y, m - 1, d);
    target.setHours(0, 0, 0, 0);

    const diffDays = Math.round((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    // -2 <= diffDays <= 7
    return diffDays >= -2 && diffDays <= 7;
  } catch {
    return false;
  }
};

/**
 * Filters a list of tasks keeping only those within [-2 days, +7 days].
 * Daily tasks do not have fixed dates and are always preserved.
 */
export const filterTasksWithinWindow = (tasks: TaskItem[]): TaskItem[] => {
  return tasks.filter((t) => {
    if (t.taskType === 'daily' || !t.date) return true;
    return isDateWithinTaskWindow(t.date);
  });
};
