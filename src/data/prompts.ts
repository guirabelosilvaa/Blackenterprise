import { PromptItem, PromptMediaType } from '../types';

export const MEDIA_FILTERS: { id: PromptMediaType; label: string; iconName: string }[] = [
  { id: 'imagem', label: 'Imagem', iconName: 'Image' },
  { id: 'video', label: 'Vídeo', iconName: 'Video' },
  { id: 'todos', label: 'Todos', iconName: 'LayoutGrid' },
];

export const INITIAL_PROMPTS: PromptItem[] = [];
