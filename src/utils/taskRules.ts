import { TaskItem } from '../types';

/**
 * Enforces the rule that there can be at most 15 completed tasks.
 * If there are more than 15 completed tasks, the oldest created ones are deleted.
 * Non-completed tasks are always preserved.
 */
export const enforceMaxCompletedTasks = (tasks: TaskItem[]): TaskItem[] => {
  const completedTasks = tasks.filter((t) => t.completed);
  if (completedTasks.length <= 15) {
    return tasks;
  }

  // Get timestamp or index for sorting
  const getTaskTimestamp = (task: TaskItem, index: number): number => {
    if (typeof task.createdAt === 'number') return task.createdAt;
    const match = task.id.match(/\d{10,14}/);
    if (match) return parseInt(match[0], 10);
    return index;
  };

  // Sort completed tasks by creation time ascending (oldest created first)
  const sortedCompleted = [...completedTasks].sort((a, b) => {
    const aTime = getTaskTimestamp(a, tasks.indexOf(a));
    const bTime = getTaskTimestamp(b, tasks.indexOf(b));
    return aTime - bTime;
  });

  const excessCount = completedTasks.length - 15;
  const toDeleteIds = new Set(sortedCompleted.slice(0, excessCount).map((t) => t.id));

  return tasks.filter((t) => !toDeleteIds.has(t.id));
};

/**
 * Tasks no longer filter by dates. Enforces max 15 completed tasks.
 */
export const filterTasksWithinWindow = (tasks: TaskItem[]): TaskItem[] => {
  return enforceMaxCompletedTasks(tasks);
};

