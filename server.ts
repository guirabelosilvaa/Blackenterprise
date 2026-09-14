import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import dotenv from 'dotenv';
import { GoogleGenAI, Type } from '@google/genai';

dotenv.config();

const PORT = 3000;

// Lazy initialization of Gemini client
let genAIClient: GoogleGenAI | null = null;
function getGenAI(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;
  if (!genAIClient) {
    genAIClient = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });
  }
  return genAIClient;
}

// Helper: Smart Rule-Based Parser for instant fallback / offline execution
function parseActionLocally(
  rawMessage: string,
  existingProjects: string[] = [],
  selectedProject?: string,
  selectedDate?: string
): {
  action: 'create_task' | 'create_project' | 'message';
  task?: {
    title: string;
    taskType: 'business' | 'daily';
    project?: string;
    date: string;
    time?: string;
    notes?: string;
  };
  project?: {
    name: string;
  };
  reply: string;
} {
  const msg = rawMessage.trim();
  const lower = msg.toLowerCase();

  const getTodayIso = () => {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  };

  // 1. Check for Project Creation (explicit request)
  if (lower.startsWith('cria projeto') || lower.startsWith('criar projeto') || lower.startsWith('novo projeto')) {
    const name = msg.replace(/^(?:cria(?:r)?|novo)\s+projeto\s+/i, '').trim();
    const formatted = name.charAt(0).toUpperCase() + name.slice(1);
    return {
      action: 'create_project',
      project: { name: formatted || 'Novo Projeto' },
      reply: `Projeto "${formatted || 'Novo Projeto'}" criado com sucesso!`,
    };
  }

  // 2. Default all commands to Task Creation (chat é exclusivo para tarefas)
  const isDaily =
    lower.includes('diaria') ||
    lower.includes('diária') ||
    lower.includes('rotina') ||
    lower.includes('pessoal');
  const taskType: 'business' | 'daily' = isDaily ? 'daily' : 'business';

  // Extract project if mentioned or use pre-selected project
  let project: string | undefined = selectedProject || undefined;
  const projectMatch =
    msg.match(/(?:projeto|no projeto|para o projeto)\s+([a-zA-Z0-9_\-À-ÿ\s]+?)(?:\s+(?:no black|hoje|amanha|amanhã)|$)/i) ||
    msg.match(/(?:no|em|para)\s+([a-zA-Z0-9_\-À-ÿ]+)$/i);

  if (projectMatch && projectMatch[1]) {
    const extracted = projectMatch[1].trim();
    if (extracted && !['black', 'hoje', 'amanha', 'amanhã', 'diaria', 'diária'].includes(extracted.toLowerCase())) {
      const existing = existingProjects.find(
        (p) => p.toLowerCase() === extracted.toLowerCase()
      );
      project = existing || extracted.charAt(0).toUpperCase() + extracted.slice(1);
    }
  }

  // Extract time if specified (ex: "às 14:00", "as 09:30", "14h", "14:00")
  let time: string | undefined = undefined;
  const timeMatch = msg.match(/(?:às|as|ás|at)?\s*([0-2]?[0-9](?::[0-5][0-9]|h(?:[0-5][0-9])?))/i);
  if (timeMatch && timeMatch[1]) {
    time = timeMatch[1].replace('h', ':').padEnd(5, '0');
  }

  // Extract notes / obs if specified (ex: "obs: ligar antes", "nota: ...")
  let notes: string | undefined = undefined;
  const notesMatch = msg.match(/(?:obs:|observa[çc][ãa]o:|nota:)\s*(.+)$/i);
  if (notesMatch && notesMatch[1]) {
    notes = notesMatch[1].trim();
  }

  // Extract clean task title
  let title = msg;
  title = title
    .replace(/^(?:por favor,?\s*)?(?:adicion[ae]|cria(?:r)?|nova|coloqu?e|bota|botar|add)\s+(?:uma\s+)?(?:tarefa\s+)?/i, '')
    .replace(/(?:no\s+black|nas\s+tarefas\s+black|no\s+diario|na\s+diaria|nas\s+diarias)/gi, '')
    .replace(/(?:para\s+eu\s+|pra\s+mim\s+|pra\s+eu\s+)/gi, '')
    .replace(/(?:no\s+projeto|para\s+o\s+projeto|projeto)\s+([a-zA-Z0-9_\-À-ÿ\s]+)$/gi, '')
    .replace(/(?:obs:|observa[çc][ãa]o:|nota:)\s*(.+)$/gi, '')
    .replace(/(?:às|as|ás)?\s*[0-2]?[0-9]:[0-5][0-9]/gi, '')
    .trim();

  if (!title) {
    title = 'Nova Tarefa';
  }

  title = title.charAt(0).toUpperCase() + title.slice(1);
  const targetDate = isDaily ? '' : (selectedDate || getTodayIso());

  return {
    action: 'create_task',
    task: {
      title,
      taskType,
      project: isDaily ? undefined : project,
      date: targetDate,
      time: isDaily ? time : undefined,
      notes,
    },
    reply: 'Tarefa adicionada!',
  };
}

async function startServer() {
  const app = express();
  app.use(express.json());

  // API Route: AI Agent command processing
  app.post('/api/agent', async (req, res) => {
    try {
      const { message, context } = req.body;
      if (!message || typeof message !== 'string') {
        res.status(400).json({ error: 'Mensagem é obrigatória' });
        return;
      }

      const existingProjects: string[] = Array.isArray(context?.projects) ? context.projects : [];
      const selectedProject: string | undefined = typeof context?.selectedProject === 'string' && context.selectedProject.trim() ? context.selectedProject.trim() : undefined;
      const selectedDate: string | undefined = typeof context?.selectedDate === 'string' && context.selectedDate.trim() ? context.selectedDate.trim() : undefined;

      const ai = getGenAI();
      const todayIso = new Date().toISOString().split('T')[0];

      if (ai) {
        try {
          const prompt = `Você é o AI Agent assistente exclusivo de TAREFAS do aplicativo "BLACK".
O usuário digitou o seguinte comando:
"${message}"

Contexto do aplicativo:
- Data atual (hoje): ${todayIso}
- Data pré-selecionada no chat: ${selectedDate || todayIso}
- Projeto pré-selecionado no topo do chat: ${selectedProject || 'Nenhum'}
- Projetos cadastrados no sistema: ${JSON.stringify(existingProjects)}

O chat serve exclusivamente para TAREFAS (não para prompts). Suas possíveis ações são:
1. "create_task":
   - task.title: Título conciso, limpo e direto da tarefa (ex: "Fazer vídeo TikTok"). Remova palavras de comando como "adicionar", "tarefa", "no black", etc.
   - task.taskType: "daily" se o usuário mencionar rotina/diária/pessoal, ou "business" para tarefas do Black/negócios/projetos.
   - task.project: Se for "business", utilize o projeto mencionado ou o projeto pré-selecionado (${selectedProject || 'nenhum'}). Se for "daily", deixe vazio.
   - task.date: Para business, data no formato YYYY-MM-DD (padrão: ${selectedDate || todayIso}). Se for daily, deixe vazio.
   - task.time: Se for daily e o usuário informou horário (ex: "14:00" ou "09:30"), extraia.
   - task.notes: Se houver observação ou "obs:", extraia o texto.
2. "create_project":
   - Se o usuário pediu explicitamente para criar um novo projeto (project.name).
3. "message":
   - Dúvidas gerais sobre tarefas.

No campo "reply", se uma tarefa foi criada, retorne "Tarefa adicionada!". Se for projeto criado, confirme a criação.`;

          const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: {
              responseMimeType: 'application/json',
              responseSchema: {
                type: Type.OBJECT,
                properties: {
                  action: {
                    type: Type.STRING,
                    description: 'create_task | create_project | message',
                  },
                  task: {
                    type: Type.OBJECT,
                    properties: {
                      title: { type: Type.STRING },
                      taskType: { type: Type.STRING },
                      project: { type: Type.STRING },
                      date: { type: Type.STRING },
                      time: { type: Type.STRING },
                      notes: { type: Type.STRING },
                    },
                  },
                  project: {
                    type: Type.OBJECT,
                    properties: {
                      name: { type: Type.STRING },
                    },
                  },
                  reply: {
                    type: Type.STRING,
                    description: 'Resposta curta (ex: "Tarefa adicionada!")',
                  },
                },
                required: ['action', 'reply'],
              },
            },
          });

          const parsed = JSON.parse(response.text || '{}');
          res.json({
            ...parsed,
            source: 'gemini',
          });
          return;
        } catch (geminiErr) {
          console.warn('Erro na chamada do Gemini API, usando fallback local:', geminiErr);
          // Fallback to local parsing below
        }
      }

      // Local fallback parser
      const localResult = parseActionLocally(message, existingProjects, selectedProject, selectedDate);
      res.json({
        ...localResult,
        source: 'local_fallback',
        hasApiKey: !!process.env.GEMINI_API_KEY,
      });
    } catch (err: any) {
      console.error('Erro na rota /api/agent:', err);
      res.status(500).json({
        error: 'Erro ao processar comando',
        details: err?.message || String(err),
      });
    }
  });

  // Health check endpoint
  app.get('/api/health', (req, res) => {
    res.json({
      status: 'ok',
      hasGeminiApiKey: !!process.env.GEMINI_API_KEY,
    });
  });

  // Vite integration
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
