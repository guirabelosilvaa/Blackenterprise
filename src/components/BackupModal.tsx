import React, { useState, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { PromptItem, TaskItem } from '../types';
import {
  X,
  Download,
  Upload,
  Copy,
  Check,
  FileCode,
  AlertCircle,
  HardDriveDownload,
  Cloud,
  Layers,
  FileText,
  CheckSquare,
} from 'lucide-react';

interface BackupModalProps {
  isOpen: boolean;
  onClose: () => void;
  pageContext: 'workspace' | 'prompts' | 'tasks';
  prompts: PromptItem[];
  tasks: TaskItem[];
  savedProjects?: string[];
  savedWorkflows?: string[];
  onImportPrompts: (imported: PromptItem[], mode: 'replace' | 'merge') => void;
  onImportTasks: (imported: TaskItem[], mode: 'replace' | 'merge') => void;
  onImportAll: (prompts: PromptItem[], tasks: TaskItem[], mode: 'replace' | 'merge') => void;
  onImportProjects?: (projects: string[], mode?: 'replace' | 'merge') => void;
  onImportWorkflows?: (workflows: string[], mode: 'replace' | 'merge') => void;
}

export const BackupModal: React.FC<BackupModalProps> = ({
  isOpen,
  onClose,
  pageContext,
  prompts,
  tasks,
  savedProjects = [],
  savedWorkflows = [],
  onImportPrompts,
  onImportTasks,
  onImportAll,
  onImportProjects,
  onImportWorkflows,
}) => {
  const [copied, setCopied] = useState(false);
  const [downloaded, setDownloaded] = useState(false);
  const [importConfirmed, setImportConfirmed] = useState(false);
  const [importText, setImportText] = useState('');
  const [importMode, setImportMode] = useState<'replace' | 'merge'>('replace');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'export' | 'import'>('export');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Flashlight border state
  const modalContainerRef = useRef<HTMLDivElement>(null);
  const [flashlight, setFlashlight] = useState({ x: 0, y: 0, isHovering: false });

  const handleMouseMoveModal = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!modalContainerRef.current) return;
    const rect = modalContainerRef.current.getBoundingClientRect();
    setFlashlight({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
      isHovering: true,
    });
  };

  // Generate full unified backup content containing all information (prompts, tasks, notes/obs, time, projects, workflows)
  const backupData = useMemo(() => {
    return {
      type: 'all',
      version: 1,
      exportedAt: new Date().toISOString(),
      projects: savedProjects,
      workflows: savedWorkflows,
      prompts: prompts.map((p) => ({
        id: p.id,
        title: p.title,
        description: p.description || '',
        mediaType: p.mediaType,
        mediaLabel: p.mediaLabel,
        category: p.category,
        categoryLabel: p.categoryLabel,
        styleTag: p.styleTag,
        imageUrl: p.imageUrl ? p.imageUrl.trim() : '',
        notes: p.notes ? p.notes.trim() : '',
        template: p.template,
        variables: p.variables || [],
        suggestedTones: p.suggestedTones || [],
        tags: p.tags || [],
        isCustom: p.isCustom ?? true,
        workflow: p.workflow || '',
        workflowOrder: p.workflowOrder,
        workflows: p.workflows || [],
        workflowSteps: p.workflowSteps || {},
      })),
      tasks: tasks.map((t) => {
        const isDaily = t.taskType === 'daily' || !t.date;
        return {
          id: t.id,
          title: t.title,
          date: isDaily ? '' : (t.date || ''),
          project: isDaily ? '' : (t.project || ''),
          completed: !!t.completed,
          taskType: isDaily ? 'daily' : 'business',
          time: t.time || '',
          notes: t.notes || '',
        };
      }),
    };
  }, [prompts, tasks, savedProjects, savedWorkflows]);

  const backupJson = JSON.stringify(backupData, null, 2);

  // Download JSON File
  const handleDownloadFile = () => {
    try {
      const blob = new Blob([backupJson], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      const dateStr = new Date().toISOString().slice(0, 10);
      const prefix = 'backup';
      a.href = url;
      a.download = `${prefix}-${dateStr}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      setDownloaded(true);
      setTimeout(() => setDownloaded(false), 2400);
      setSuccessMsg('Arquivo de backup baixado com sucesso!');
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch {
      setErrorMsg('Erro ao gerar arquivo de download.');
    }
  };

  // Copy JSON string
  const handleCopyJson = async () => {
    try {
      await navigator.clipboard.writeText(backupJson);
      setCopied(true);
      setTimeout(() => setCopied(false), 2200);
    } catch {
      setErrorMsg('Não foi possível copiar para a área de transferência.');
    }
  };

  // Smart Parser for Prompts and/or Tasks
  const parseAndApplyImport = (jsonString: string) => {
    const parsed = JSON.parse(jsonString);

    let parsedPrompts: PromptItem[] = [];
    let parsedTasks: TaskItem[] = [];

    // Case 1: Unified object with prompts and/or tasks
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      if (Array.isArray(parsed.prompts)) {
        parsedPrompts = validatePromptsList(parsed.prompts);
      }
      if (Array.isArray(parsed.tasks)) {
        parsedTasks = validateTasksList(parsed.tasks);
      }
    } else if (Array.isArray(parsed)) {
      // Case 2: Array of objects - detect whether it's prompts or tasks
      const looksLikePrompts = parsed.some(
        (item) => item && typeof item === 'object' && item.template !== undefined
      );
      const looksLikeTasks = parsed.some(
        (item) =>
          item &&
          typeof item === 'object' &&
          (item.taskType !== undefined ||
            item.date !== undefined ||
            item.project !== undefined ||
            (item.completed !== undefined && item.template === undefined) ||
            (item.title && item.template === undefined))
      );

      if (looksLikePrompts && !looksLikeTasks) {
        parsedPrompts = validatePromptsList(parsed);
      } else if (looksLikeTasks && !looksLikePrompts) {
        parsedTasks = validateTasksList(parsed);
      } else if (looksLikePrompts) {
        parsedPrompts = validatePromptsList(parsed);
      } else if (parsed.length > 0) {
        parsedTasks = validateTasksList(parsed);
      }
    }

    if (parsedPrompts.length === 0 && parsedTasks.length === 0) {
      throw new Error('Nenhum dado válido de prompts ou tarefas encontrado no JSON.');
    }

    // Extract projects if present in the backup or from imported tasks
    let importedProjects: string[] = [];
    if (parsed && typeof parsed === 'object' && Array.isArray(parsed.projects)) {
      importedProjects = parsed.projects
        .filter((p: any) => typeof p === 'string' && p.trim())
        .map((p: string) => p.trim());
    }
    parsedTasks.forEach((t) => {
      if (t.project && t.project.trim() && !importedProjects.includes(t.project.trim())) {
        importedProjects.push(t.project.trim());
      }
    });

    if (importedProjects.length > 0 && onImportProjects) {
      onImportProjects(importedProjects, importMode);
    }

    // Extract workflows if present in the backup or from imported prompts
    let importedWorkflows: string[] = [];
    if (parsed && typeof parsed === 'object' && Array.isArray(parsed.workflows)) {
      importedWorkflows = parsed.workflows
        .filter((w: any) => typeof w === 'string' && w.trim())
        .map((w: string) => w.trim());
    }
    parsedPrompts.forEach((p) => {
      if (p.workflow && p.workflow.trim() && !importedWorkflows.includes(p.workflow.trim())) {
        importedWorkflows.push(p.workflow.trim());
      }
      if (Array.isArray(p.workflows)) {
        p.workflows.forEach((wf) => {
          if (wf && wf.trim() && !importedWorkflows.includes(wf.trim())) {
            importedWorkflows.push(wf.trim());
          }
        });
      }
    });

    if (onImportWorkflows) {
      onImportWorkflows(importedWorkflows, importMode);
    }

    // Apply import
    if (parsedPrompts.length > 0 && parsedTasks.length > 0) {
      onImportAll(parsedPrompts, parsedTasks, importMode);
      setSuccessMsg(`${parsedPrompts.length} prompts e ${parsedTasks.length} tarefas sincronizados!`);
    } else if (parsedPrompts.length > 0) {
      onImportPrompts(parsedPrompts, importMode);
      setSuccessMsg(`${parsedPrompts.length} prompts sincronizados com sucesso!`);
    } else if (parsedTasks.length > 0) {
      onImportTasks(parsedTasks, importMode);
      setSuccessMsg(`${parsedTasks.length} tarefas sincronizadas!`);
    }

    setImportConfirmed(true);
    setTimeout(() => {
      setImportConfirmed(false);
      setSuccessMsg(null);
      onClose();
    }, 1400);
  };

  const validatePromptsList = (list: any[]): PromptItem[] => {
    return list.map((item, index) => {
      if (!item.title || !item.template) {
        throw new Error(`Item ${index + 1} inválido: requer "title" e "template".`);
      }

      const rawImg = item.imageUrl ?? item.image_url ?? item.image ?? item.img;
      const imageUrl =
        rawImg && typeof rawImg === 'string' && rawImg.trim() ? rawImg.trim() : undefined;

      const rawNotes = item.notes ?? item.obs ?? item.observacoes ?? item.observacao;
      const notes =
        rawNotes && typeof rawNotes === 'string' && rawNotes.trim() ? rawNotes.trim() : undefined;

      return {
        id: item.id ? String(item.id) : `imported-${Date.now()}-${index}`,
        title: String(item.title),
        description: item.description ? String(item.description) : '',
        mediaType: item.mediaType === 'video' ? 'video' : 'imagem',
        mediaLabel: item.mediaType === 'video' ? 'Vídeo' : 'Imagem',
        category: item.category || 'criativo',
        categoryLabel: item.categoryLabel || 'Personalizado',
        styleTag: item.styleTag || 'Personalizado',
        imageUrl,
        notes,
        template: String(item.template),
        variables: Array.isArray(item.variables)
          ? item.variables.map((v: any) => ({
              key: String(v.key || ''),
              label: String(v.label || v.key || ''),
              placeholder: '',
              defaultValue: String(v.defaultValue || ''),
              multiline: Boolean(v.multiline),
            }))
          : [],
        isCustom: true,
        tags: Array.isArray(item.tags)
          ? item.tags.map(String)
          : ['Personalizado', item.mediaType === 'video' ? 'Vídeo' : 'Imagem'],
        workflow: item.workflow ? String(item.workflow).trim() : undefined,
        workflowOrder: item.workflowOrder !== undefined ? Number(item.workflowOrder) : undefined,
        workflows: Array.isArray(item.workflows)
          ? item.workflows.filter((w: any) => typeof w === 'string' && w.trim()).map((w: string) => w.trim())
          : item.workflow
          ? [String(item.workflow).trim()]
          : undefined,
        workflowSteps: item.workflowSteps && typeof item.workflowSteps === 'object' ? item.workflowSteps : undefined,
      };
    });
  };

  const validateTasksList = (list: any[]): TaskItem[] => {
    return list
      .filter((item) => item && typeof item === 'object' && (item.title || item.titulo || item.task))
      .map((item, index) => {
        const rawType = String(item.taskType || item.type || '').toLowerCase().trim();
        const isDaily =
          rawType === 'daily' ||
          rawType === 'diaria' ||
          rawType === 'diária' ||
          (!item.date && !item.data && !item.project && !item.projeto);

        const projectVal = isDaily
          ? undefined
          : item.project
          ? String(item.project).trim()
          : item.projeto
          ? String(item.projeto).trim()
          : undefined;

        const timeVal = item.time
          ? String(item.time).trim()
          : item.horario
          ? String(item.horario).trim()
          : item.hour
          ? String(item.hour).trim()
          : undefined;

        const notesVal = item.notes
          ? String(item.notes).trim()
          : item.obs
          ? String(item.obs).trim()
          : item.observacao
          ? String(item.observacao).trim()
          : undefined;

        const rawDate = item.date !== undefined ? item.date : item.data;

        return {
          id: item.id ? String(item.id) : `task-imp-${Date.now()}-${index}`,
          title: String(item.title || item.titulo || item.task).trim(),
          date: isDaily ? '' : String(rawDate || ''),
          project: projectVal,
          completed: Boolean(item.completed || item.concluido),
          taskType: (isDaily ? 'daily' : 'business') as 'daily' | 'business',
          time: timeVal,
          notes: notesVal,
        };
      });
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    setErrorMsg(null);
    setSuccessMsg(null);
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        parseAndApplyImport(text);
      } catch (err: any) {
        setErrorMsg(err.message || 'Erro ao processar arquivo JSON.');
      }
    };
    reader.onerror = () => {
      setErrorMsg('Erro ao ler arquivo.');
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleManualImport = () => {
    setErrorMsg(null);
    setSuccessMsg(null);
    if (!importText.trim()) {
      setErrorMsg('Cole o código JSON do seu backup antes de restaurar.');
      return;
    }
    try {
      parseAndApplyImport(importText);
    } catch (err: any) {
      setErrorMsg(err.message || 'Formato JSON inválido.');
    }
  };

  const getModalTitle = () => {
    if (pageContext === 'workspace') return 'Backup Geral';
    if (pageContext === 'tasks') return 'Backup de Tarefas';
    return 'Backup de Prompts';
  };

  const getModalContextBadge = () => {
    if (pageContext === 'workspace') {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-medium rounded-full bg-blue-500/15 text-blue-300 border border-blue-500/30">
          <Layers className="w-2.5 h-2.5" />
          <span>Workspace</span>
        </span>
      );
    }
    if (pageContext === 'tasks') {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-medium rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
          <CheckSquare className="w-2.5 h-2.5" />
          <span>Tarefas</span>
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-medium rounded-full bg-zinc-700/40 text-zinc-300 border border-zinc-600/30">
        <FileText className="w-2.5 h-2.5" />
        <span>Prompts</span>
      </span>
    );
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div
          id="backup-modal-overlay"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/85 backdrop-blur-md overflow-y-auto"
          onClick={(e) => {
            if (e.target === e.currentTarget) onClose();
          }}
        >
          <motion.div
            ref={modalContainerRef}
            id="backup-modal-container"
            onMouseMove={handleMouseMoveModal}
            onMouseLeave={() => setFlashlight((prev) => ({ ...prev, isHovering: false }))}
            initial={{ opacity: 0, scale: 0.97, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.97, y: 10 }}
            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
            className="relative w-full max-w-xl bg-[#111113] border border-[#222227] rounded-2xl shadow-[0_32px_80px_rgba(0,0,0,0.95)] overflow-hidden flex flex-col text-zinc-100 my-auto"
          >
            {/* Flashlight Border Effect */}
            <div
              className="flashlight-layer absolute inset-0 rounded-2xl p-[1px] pointer-events-none z-40"
              style={{
                opacity: flashlight.isHovering ? 1 : 0,
                background: flashlight.isHovering
                  ? `radial-gradient(380px circle at ${flashlight.x}px ${flashlight.y}px, rgba(255, 255, 255, 0.85), rgba(255, 255, 255, 0.25) 35%, rgba(255, 255, 255, 0.05) 55%, transparent 75%)`
                  : 'none',
                WebkitMask:
                  'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)',
                WebkitMaskComposite: 'xor',
                maskComposite: 'exclude',
              }}
            />

            {/* Ambient Flashlight Glow inside */}
            <div
              className="flashlight-layer absolute inset-0 pointer-events-none rounded-2xl z-0"
              style={{
                opacity: flashlight.isHovering ? 1 : 0,
                background: flashlight.isHovering
                  ? `radial-gradient(420px circle at ${flashlight.x}px ${flashlight.y}px, rgba(255, 255, 255, 0.04), transparent 75%)`
                  : 'none',
              }}
            />

            {/* Header */}
            <div className="relative z-10 flex items-center justify-between px-6 py-4 border-b border-[#1f1f23] bg-[#141417]/80">
              <div className="flex items-center gap-3">
                <div className="p-1.5 rounded-lg bg-[#1c1c22] border border-[#2d2d36] text-white">
                  <Cloud className="w-4 h-4 text-white" />
                </div>
                <div className="flex items-center gap-2">
                  <h2 className="text-sm font-semibold text-white tracking-tight">
                    {getModalTitle()}
                  </h2>
                  {getModalContextBadge()}
                </div>
              </div>

              <button
                id="btn-close-backup-modal"
                onClick={onClose}
                className="p-1 text-zinc-400 hover:text-white transition-colors cursor-pointer"
                title="Fechar"
              >
                <X className="w-4 h-4 text-white" />
              </button>
            </div>

            {/* Sub-tabs: Exportar vs Importar */}
            <div className="relative z-10 flex items-center gap-2 px-6 pt-4 pb-2 border-b border-[#1c1c20]">
              <button
                type="button"
                onClick={() => {
                  setActiveTab('export');
                  setErrorMsg(null);
                  setSuccessMsg(null);
                }}
                className={`relative flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                  activeTab === 'export'
                    ? 'text-white bg-[#1c1c22] border border-[#2e2e38]'
                    : 'text-zinc-400 hover:text-zinc-200 border border-transparent'
                }`}
              >
                <Download className="w-3.5 h-3.5" />
                <span>Exportar Dados</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setActiveTab('import');
                  setErrorMsg(null);
                  setSuccessMsg(null);
                }}
                className={`relative flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                  activeTab === 'import'
                    ? 'text-white bg-[#1c1c22] border border-[#2e2e38]'
                    : 'text-zinc-400 hover:text-zinc-200 border border-transparent'
                }`}
              >
                <Upload className="w-3.5 h-3.5" />
                <span>Importar Dados</span>
              </button>
            </div>

            {/* Modal Body */}
            <div className="relative z-10 p-6 flex flex-col gap-4">
              {/* Messages */}
              {errorMsg && (
                <div className="flex items-center gap-2 p-3 rounded-lg bg-red-950/40 border border-red-800/50 text-red-200 text-xs animate-in fade-in duration-150">
                  <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
                  <span>{errorMsg}</span>
                </div>
              )}

              {successMsg && (
                <div className="flex items-center gap-2 p-3 rounded-lg bg-emerald-950/40 border border-emerald-800/50 text-emerald-200 text-xs animate-in fade-in duration-150">
                  <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>{successMsg}</span>
                </div>
              )}

              {activeTab === 'export' ? (
                /* EXPORT VIEW */
                <div className="flex flex-col gap-3.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-zinc-400">
                      {pageContext === 'workspace'
                        ? `${prompts.length} prompts e ${tasks.length} tarefas prontas para backup`
                        : pageContext === 'tasks'
                        ? `${tasks.length} tarefas (${tasks.filter((t) => t.taskType === 'daily').length} diárias)`
                        : `${prompts.length} prompts na sua biblioteca`}
                    </span>
                    <button
                      type="button"
                      onClick={handleCopyJson}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs text-zinc-300 hover:text-white bg-[#18181c] hover:bg-[#202026] border border-[#2a2a32] rounded-md transition-colors cursor-pointer"
                    >
                      {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                      <span>{copied ? 'Copiado!' : 'Copiar JSON'}</span>
                    </button>
                  </div>

                  {/* JSON Code Box */}
                  <div className="relative rounded-xl bg-[#09090b] border border-[#202025] p-3 max-h-48 overflow-y-auto font-mono text-[11px] text-zinc-300 select-all leading-relaxed">
                    <pre>{backupJson}</pre>
                  </div>

                  {/* Download Action */}
                  <div className="flex items-center justify-end pt-2">
                    <button
                      type="button"
                      onClick={handleDownloadFile}
                      className="relative overflow-hidden group flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold text-[#111113] bg-gradient-to-b from-[#ffffff] via-[#e2e5e9] to-[#b8bdc5] border border-white/90 shadow-md hover:shadow-lg transition-all cursor-pointer active:scale-95"
                    >
                      <span className="metallic-shine-layer" />
                      {downloaded ? (
                        <motion.span
                          initial={{ scale: 0.7, opacity: 0 }}
                          animate={{ scale: 1, opacity: 1 }}
                          className="flex items-center gap-1.5 text-emerald-950 font-bold"
                        >
                          <Check className="w-3.5 h-3.5 text-emerald-900 stroke-[3]" />
                          <span>Baixado!</span>
                        </motion.span>
                      ) : (
                        <>
                          <HardDriveDownload className="w-3.5 h-3.5 text-[#111113]" />
                          <span>Baixar Arquivo .json</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              ) : (
                /* IMPORT VIEW */
                <div className="flex flex-col gap-3.5">
                  {/* Mode selector */}
                  <div className="flex items-center justify-between bg-[#0a0a0c] p-2 rounded-lg border border-[#222228]">
                    <span className="text-[11px] text-zinc-400">Modo de sincronização:</span>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => setImportMode('replace')}
                        className={`px-2.5 py-1 rounded text-[11px] font-medium transition-colors cursor-pointer ${
                          importMode === 'replace'
                            ? 'bg-[#1e1e24] text-white border border-[#3e3e4c]'
                            : 'text-zinc-400 hover:text-zinc-200'
                        }`}
                      >
                        Substituir
                      </button>
                      <button
                        type="button"
                        onClick={() => setImportMode('merge')}
                        className={`px-2.5 py-1 rounded text-[11px] font-medium transition-colors cursor-pointer ${
                          importMode === 'merge'
                            ? 'bg-[#1e1e24] text-white border border-[#3e3e4c]'
                            : 'text-zinc-400 hover:text-zinc-200'
                        }`}
                      >
                        Mesclar
                      </button>
                    </div>
                  </div>

                  {/* Textarea for JSON */}
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[11px] text-zinc-400 flex items-center gap-1.5">
                      <FileCode className="w-3 h-3 text-zinc-400" />
                      <span>Cole o código JSON do backup ou faça upload do arquivo:</span>
                    </label>
                    <textarea
                      value={importText}
                      onChange={(e) => setImportText(e.target.value)}
                      placeholder='Ex: { "prompts": [...], "tasks": [...] } ou cole o array JSON'
                      className="w-full h-32 p-3 text-xs font-mono bg-[#09090b] text-zinc-200 border border-[#222228] rounded-xl focus:outline-none focus:border-zinc-300 placeholder:text-zinc-600 resize-none"
                    />
                  </div>

                  {/* Actions */}
                  <div className="flex items-center justify-between pt-2">
                    <input
                      type="file"
                      ref={fileInputRef}
                      accept=".json"
                      onChange={handleFileUpload}
                      className="hidden"
                    />
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-zinc-300 hover:text-white bg-[#161619] hover:bg-[#202025] border border-[#26262c] rounded-lg transition-colors cursor-pointer"
                    >
                      <Upload className="w-3.5 h-3.5" />
                      <span>Carregar Arquivo .json</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleManualImport}
                      className="relative overflow-hidden group flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold text-[#111113] bg-gradient-to-b from-[#ffffff] via-[#e2e5e9] to-[#b8bdc5] border border-white/90 shadow-md hover:shadow-lg transition-all cursor-pointer active:scale-95"
                    >
                      <span className="metallic-shine-layer" />
                      {importConfirmed ? (
                        <motion.span
                          initial={{ scale: 0.7, opacity: 0 }}
                          animate={{ scale: 1, opacity: 1 }}
                          className="flex items-center gap-1.5 text-emerald-950 font-bold"
                        >
                          <Check className="w-3.5 h-3.5 text-emerald-900 stroke-[3]" />
                          <span>Importado!</span>
                        </motion.span>
                      ) : (
                        <>
                          <Check className="w-3.5 h-3.5 text-[#111113] stroke-[3]" />
                          <span>Confirmar Importação</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
