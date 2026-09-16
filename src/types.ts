export type PromptMediaType = 'imagem' | 'video' | 'todos';

export type PromptCategory = 
  | 'todos'
  | 'tiktok_shop'
  | 'moda'
  | 'ecommerce'
  | 'criativo'
  | 'marketing';

export type ResponseTone = 
  | 'direto'
  | 'realista'
  | 'comercial'
  | 'editorial'
  | 'tecnico'
  | 'persuasivo'
  | 'padrao';

export interface PromptVariable {
  key: string;
  label: string;
  placeholder: string;
  defaultValue?: string;
  multiline?: boolean;
}

export interface PromptItem {
  id: string;
  title: string;
  description: string;
  mediaType: 'imagem' | 'video';
  mediaLabel: string; // e.g. 'Imagem', 'Vídeo'
  category: PromptCategory;
  categoryLabel: string; // e.g. 'Tiktok Shop', 'Moda & E-commerce', 'Criativo'
  styleTag: string; // Shown at bottom left of card, e.g. 'Tiktok Shop'
  imageUrl?: string;
  template: string; // Text containing [variable_name]
  variables: PromptVariable[];
  suggestedTones?: ResponseTone[];
  tags: string[];
  isCustom?: boolean;
  notes?: string; // Observações / notas adicionais sobre o prompt
  workflow?: string; // Nome do workflow associado (ex: "Estilo de Vídeo X")
  workflowOrder?: number; // Sequência/Passo no workflow (1, 2, 3...)
  workflows?: string[]; // Múltiplos workflows associados a este prompt
  workflowSteps?: Record<string, number>; // Passo para cada workflow específico
}

export type TaskCategoryType = 'daily' | 'business';

export interface TaskItem {
  id: string;
  title: string; // Nome da Tarefa
  date: string; // Formato YYYY-MM-DD
  project?: string; // Nome do projeto associado
  notes?: string; // Observações / notas adicionais (ex: "obs: ligar antes")
  time?: string; // Horário opcional para tarefas diárias (ex: "14:00")
  completed?: boolean;
  taskType?: TaskCategoryType; // 'daily' (diária/pessoal) ou 'business' (negócios)
}

export interface MealItem {
  id: string;
  name: string; // Nome do prato / refeição (ex: Almoço, Shake de Proteína)
  calories: number; // Quantidade de calorias (kcal)
  date: string; // Formato YYYY-MM-DD
  time?: string; // Horário opcional (ex: 12:30)
  category?: 'breakfast' | 'lunch' | 'dinner' | 'snack';
  notes?: string;
}

export interface DayFuelData {
  date: string; // YYYY-MM-DD
  calorieGoal: number; // Meta base diária (ex: 1800 kcal)
  waterMl?: number; // Consumo de água
  waterGoalMl?: number; // Meta de água
  steps?: number; // Passos dados
  stepsGoal?: number; // Meta de passos
  workoutDone?: boolean; // Treino de musculação realizado (-210 kcal)
  cardioDone?: boolean; // Cardio realizado (-200 kcal)
}

