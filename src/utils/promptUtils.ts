import { PromptVariable } from '../types';

export function formatVariableLabel(rawKey: string): string {
  return rawKey
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

/**
 * Extracts all [variable_name] or {{variable_name}} tokens from a template string
 */
export function extractVariablesFromTemplate(template: string): PromptVariable[] {
  const regex = /\[([a-zA-Z0-9_\-áàâãéèêíïóôõöúçñ\s]+)\]|\{\{([a-zA-Z0-9_\-áàâãéèêíïóôõöúçñ\s]+)\}\}/g;
  const foundKeys = new Set<string>();
  const variables: PromptVariable[] = [];

  let match;
  while ((match = regex.exec(template)) !== null) {
    const rawKey = (match[1] || match[2]).trim();
    if (!foundKeys.has(rawKey)) {
      foundKeys.add(rawKey);
      const label = formatVariableLabel(rawKey);
      
      const isLong = rawKey.includes('codigo') || rawKey.includes('contexto') || rawKey.includes('texto') || rawKey.includes('relatorio');
      
      variables.push({
        key: rawKey,
        label,
        placeholder: `Digite ${label.toLowerCase()}...`,
        defaultValue: '',
        multiline: isLong,
      });
    }
  }

  return variables;
}

/**
 * Replaces variable placeholders in the template with user values.
 * If unfilled, can either leave placeholder or replace with default/fallback.
 */
export function renderPrompt(
  template: string,
  values: Record<string, string>,
  toneInstruction?: string
): string {
  let rendered = template;

  // Replace [key] and {{key}}
  for (const [key, val] of Object.entries(values)) {
    const safeKey = key.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
    const pattern = new RegExp(`\\[${safeKey}\\]|\\{\\{${safeKey}\\}\\}`, 'g');
    const replacement = val.trim() !== '' ? val.trim() : `[${key}]`;
    rendered = rendered.replace(pattern, replacement);
  }

  if (toneInstruction && toneInstruction.trim() !== '') {
    rendered += `\n\nDiretriz de Estilo: ${toneInstruction.trim()}`;
  }

  return rendered;
}
