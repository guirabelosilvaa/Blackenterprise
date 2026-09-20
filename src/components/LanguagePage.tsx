import React, { useState, useMemo, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  ArrowLeft,
  Check,
  X,
  Trash2,
  Pencil,
  ArrowRight,
  Flame,
  RotateCcw,
  Search,
  CheckCircle2,
  XCircle,
  Trophy,
  Download,
  Upload,
} from 'lucide-react';
import { VocabCard } from '../types';

interface LanguagePageProps {
  cards: VocabCard[];
  onAddCard: (card: Omit<VocabCard, 'id'>) => void;
  onUpdateCard: (card: VocabCard) => void;
  onDeleteCard: (id: string) => void;
  showNotification: (msg: string) => void;
  onOpenBackup?: () => void;
}

// Direção do flashcard sorteada aleatoriamente
export type FlashcardDirection = 'en_to_pt' | 'pt_to_en';

// Efeitos sonoros sutis apenas para acerto e erro
const playChimeSound = (combo = 1) => {
  try {
    const AudioContextClass =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    const baseFreq = 523.25;
    const pitchOffset = Math.min(combo * 35, 280);
    osc.frequency.setValueAtTime(baseFreq + pitchOffset, now);
    osc.frequency.exponentialRampToValueAtTime((baseFreq + pitchOffset) * 1.4, now + 0.12);

    gain.gain.setValueAtTime(0.08, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.28);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.28);
  } catch {
    // Silencioso
  }
};

const playWrongSound = () => {
  try {
    const AudioContextClass =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(220, now);
    osc.frequency.exponentialRampToValueAtTime(130, now + 0.18);

    gain.gain.setValueAtTime(0.07, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.2);
  } catch {
    // Silencioso
  }
};

// Funções de limpeza e validação de digitação
function cleanText(str: string): string {
  return str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // remove acentos
    .replace(/\(.*?\)/g, '') // remove parênteses
    .replace(/\[.*?\]/g, '') // remove colchetes
    .replace(/[.,/#!$%^&*;:{}=\-_`~()?"'’]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function stripArticles(str: string): string {
  const articles = ['o ', 'a ', 'os ', 'as ', 'um ', 'uma ', 'uns ', 'umas ', 'to ', 'the '];
  let cleaned = str.trim();
  for (const art of articles) {
    if (cleaned.startsWith(art)) {
      cleaned = cleaned.slice(art.length).trim();
    }
  }
  return cleaned;
}

function checkAnswerMatch(userAnswer: string, expectedText: string): boolean {
  const normUser = cleanText(userAnswer);
  if (!normUser) return false;

  const rawUserWithoutArticles = stripArticles(normUser);

  const expectedAlternatives = expectedText
    .split(/[/,;|\\]|\bou\b|\bor\b/i)
    .map((s) => cleanText(s))
    .filter(Boolean);

  expectedAlternatives.push(cleanText(expectedText));

  for (const alt of expectedAlternatives) {
    const altNoArticles = stripArticles(alt);
    if (normUser === alt) return true;
    if (rawUserWithoutArticles === altNoArticles) return true;
    if (normUser.replace(/\s/g, '') === alt.replace(/\s/g, '')) return true;
    if (rawUserWithoutArticles.replace(/\s/g, '') === altNoArticles.replace(/\s/g, '')) return true;
  }

  return false;
}

function shuffleArray<T>(arr: T[]): T[] {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

// Hook de 3D Tilt e Flashlight sutil no padrão do site
function useCardTiltEffect(tiltAmount = 1.8) {
  const ref = useRef<HTMLDivElement>(null);
  const [mouseCoords, setMouseCoords] = useState({
    x: 0,
    y: 0,
    px: 50,
    py: 50,
    rotateX: 0,
    rotateY: 0,
    isInteracting: false,
  });

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const px = Math.max(0, Math.min(100, (x / rect.width) * 100));
    const py = Math.max(0, Math.min(100, (y / rect.height) * 100));

    const rotateY = ((x - rect.width / 2) / (rect.width / 2)) * tiltAmount;
    const rotateX = ((y - rect.height / 2) / (rect.height / 2)) * -tiltAmount;

    setMouseCoords({
      x,
      y,
      px,
      py,
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
      px: 50,
      py: 50,
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

export const LanguagePage: React.FC<LanguagePageProps> = ({
  cards,
  onAddCard,
  onUpdateCard,
  onDeleteCard,
  showNotification,
  onOpenBackup,
}) => {
  // Fases do jogo: 'idle' | 'playing' | 'completed'
  const [gameState, setGameState] = useState<'idle' | 'playing' | 'completed'>('idle');

  // Sub-fase da rodada ativa: 'main' (todas as palavras) ou 'review' (apenas as que errou)
  const [sessionPhase, setSessionPhase] = useState<'main' | 'review'>('main');

  // Deck ativo e índice
  const [activeDeck, setActiveDeck] = useState<VocabCard[]>([]);
  const [currentIdx, setCurrentIdx] = useState(0);

  // Direção atual do flashcard (EN -> PT ou PT -> EN) sorteada aleatoriamente
  const [currentDirection, setCurrentDirection] = useState<FlashcardDirection>('en_to_pt');

  // Fila de palavras erradas para repescagem obrigatória
  const [missedQueue, setMissedQueue] = useState<VocabCard[]>([]);

  // Estatísticas da primeira tentativa
  const [initialSequenceTotal, setInitialSequenceTotal] = useState(0);
  const [initialSequenceCorrect, setInitialSequenceCorrect] = useState(0);
  const [initialSequenceWrong, setInitialSequenceWrong] = useState(0);

  // Estado do turno
  const [turnFeedback, setTurnFeedback] = useState<'idle' | 'correct' | 'wrong'>('idle');
  const [typedInput, setTypedInput] = useState('');
  const [combo, setCombo] = useState(0);

  // Modais de Adicionar e Gerenciar Palavras
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isManageModalOpen, setIsManageModalOpen] = useState(false);
  const [manageSearch, setManageSearch] = useState('');

  const [newWordEn, setNewWordEn] = useState('');
  const [newWordPt, setNewWordPt] = useState('');
  const [newWordNotes, setNewWordNotes] = useState('');
  const [editingCard, setEditingCard] = useState<VocabCard | null>(null);

  const inputRef = useRef<HTMLInputElement>(null);
  const advanceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const missedQueueRef = useRef<VocabCard[]>([]);

  // Mantém a fila de repescagem sempre sincronizada para transições instantâneas
  useEffect(() => {
    missedQueueRef.current = missedQueue;
  }, [missedQueue]);

  // Tilt effects
  const playCardTilt = useCardTiltEffect(1.8);
  const gameCardTilt = useCardTiltEffect(1.4);

  // Limpeza de timeout ao desmontar
  useEffect(() => {
    return () => {
      if (advanceTimerRef.current) {
        clearTimeout(advanceTimerRef.current);
      }
    };
  }, []);

  // Sorteia direção aleatória para o flashcard (EN->PT ou PT->EN)
  const pickRandomDirection = (): FlashcardDirection => {
    return Math.random() > 0.5 ? 'en_to_pt' : 'pt_to_en';
  };

  // Iniciar jogo
  const handleStartGame = () => {
    if (cards.length === 0) {
      showNotification('Adicione palavras antes de iniciar o treino!');
      setIsAddModalOpen(true);
      return;
    }

    const shuffled = shuffleArray<VocabCard>(cards);
    setActiveDeck(shuffled);
    setCurrentIdx(0);
    setMissedQueue([]);
    setInitialSequenceTotal(shuffled.length);
    setInitialSequenceCorrect(0);
    setInitialSequenceWrong(0);
    setCombo(0);
    setSessionPhase('main');

    // Configura o primeiro card
    setTypedInput('');
    setTurnFeedback('idle');
    setCurrentDirection(pickRandomDirection());
    setGameState('playing');

    setTimeout(() => inputRef.current?.focus(), 80);
  };

  const currentCard = activeDeck[currentIdx] || null;

  // Palavra em destaque e resposta esperada de acordo com a direção atual
  const promptWord = currentCard
    ? currentDirection === 'en_to_pt'
      ? currentCard.en
      : currentCard.pt
    : '';

  const expectedAnswer = currentCard
    ? currentDirection === 'en_to_pt'
      ? currentCard.pt
      : currentCard.en
    : '';

  const inputPlaceholder =
    currentDirection === 'en_to_pt'
      ? 'Digite a tradução em português...'
      : 'Digite a tradução em inglês...';

  const directionBadgeLabel =
    currentDirection === 'en_to_pt' ? 'Inglês ➔ Português' : 'Português ➔ Inglês';

  // Avançar para a próxima palavra
  const handleAdvanceNext = () => {
    if (advanceTimerRef.current) {
      clearTimeout(advanceTimerRef.current);
      advanceTimerRef.current = null;
    }

    const nextIndex = currentIdx + 1;

    // Ainda há palavras no deck atual
    if (nextIndex < activeDeck.length) {
      setCurrentIdx(nextIndex);
      setTypedInput('');
      setTurnFeedback('idle');
      setCurrentDirection(pickRandomDirection());
      setTimeout(() => inputRef.current?.focus(), 50);
      return;
    }

    // O deck atual terminou
    const currentMissed = missedQueueRef.current;

    if (sessionPhase === 'main') {
      if (currentMissed.length > 0) {
        // HOUVE ERROS: Inicia automaticamente a repescagem APENAS com as palavras erradas
        const reviewDeck = shuffleArray<VocabCard>(currentMissed);
        setSessionPhase('review');
        setActiveDeck(reviewDeck);
        setCurrentIdx(0);
        setTypedInput('');
        setTurnFeedback('idle');
        setCurrentDirection(pickRandomDirection());
        showNotification(
          `Sequência finalizada! Agora vamos revisar as ${currentMissed.length} palavras que você errou até acertar todas.`
        );
        setTimeout(() => inputRef.current?.focus(), 50);
      } else {
        // Gabaritou de primeira!
        setGameState('completed');
      }
    } else {
      // Repescagem: confere se a fila de erradas foi zerada
      if (currentMissed.length === 0) {
        setGameState('completed');
      } else {
        // Ainda restam algumas erradas
        const reshuffledMissed = shuffleArray<VocabCard>(currentMissed);
        setActiveDeck(reshuffledMissed);
        setCurrentIdx(0);
        setTypedInput('');
        setTurnFeedback('idle');
        setCurrentDirection(pickRandomDirection());
        setTimeout(() => inputRef.current?.focus(), 50);
      }
    }
  };

  // Avaliação da resposta
  const processAnswerSubmission = () => {
    if (!currentCard) return;

    // Se já estiver exibindo feedback (ex: de erro), 1 único Enter avança instantaneamente!
    if (turnFeedback !== 'idle') {
      handleAdvanceNext();
      return;
    }

    // Se o campo estiver vazio, não faz nada (não marca como erro)
    if (!typedInput.trim()) return;

    const isCorrect = checkAnswerMatch(typedInput, expectedAnswer);

    if (isCorrect) {
      const nextCombo = combo + 1;
      setCombo(nextCombo);
      playChimeSound(nextCombo);
      setTurnFeedback('correct');

      onUpdateCard({
        ...currentCard,
        timesCorrect: (currentCard.timesCorrect || 0) + 1,
        lastResult: 'correct',
      });

      if (sessionPhase === 'main') {
        setInitialSequenceCorrect((prev) => prev + 1);
      } else {
        // Na repescagem: acertou uma errada, remove da fila
        setMissedQueue((prev) => prev.filter((c) => c.id !== currentCard.id));
      }

      // NOVO: NO ACERTO DÁ TEMPO CONFORTÁVEL PARA VER O FEEDBACK (1.2s) OU ENTER PARA AVANÇAR NA HORA
      if (advanceTimerRef.current) clearTimeout(advanceTimerRef.current);
      advanceTimerRef.current = setTimeout(() => {
        handleAdvanceNext();
      }, 1200);
    } else {
      setCombo(0);
      playWrongSound();
      setTurnFeedback('wrong');

      onUpdateCard({
        ...currentCard,
        timesWrong: (currentCard.timesWrong || 0) + 1,
        lastResult: 'wrong',
      });

      if (sessionPhase === 'main') {
        setInitialSequenceWrong((prev) => prev + 1);
        setMissedQueue((prev) => {
          if (prev.some((c) => c.id === currentCard.id)) return prev;
          return [...prev, currentCard];
        });
      }
      // No erro, exibe a resposta correta e com 1 único Enter o usuário avança!
    }
  };

  // Tecla Enter no input
  const handleInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      processAnswerSubmission();
    }
  };

  // Salvar nova palavra
  const handleAddWordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newWordEn.trim() || !newWordPt.trim()) {
      showNotification('Preencha a palavra em inglês e a tradução em português.');
      return;
    }

    onAddCard({
      en: newWordEn.trim(),
      pt: newWordPt.trim(),
      notes: newWordNotes.trim() || undefined,
    });

    showNotification(`"${newWordEn.trim()}" adicionada com sucesso!`);
    setNewWordEn('');
    setNewWordPt('');
    setNewWordNotes('');
    setIsAddModalOpen(false);
  };

  // Salvar edição
  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCard || !editingCard.en.trim() || !editingCard.pt.trim()) return;

    onUpdateCard(editingCard);
    showNotification('Palavra atualizada.');
    setEditingCard(null);
  };

  // Exportar palavras cadastradas do deck em JSON
  const handleExportVocabJson = () => {
    if (cards.length === 0) {
      showNotification('Nenhuma palavra para exportar.');
      return;
    }
    const exportPayload = {
      type: 'vocab',
      version: 1,
      exportedAt: new Date().toISOString(),
      vocabCards: cards,
    };
    const blob = new Blob([JSON.stringify(exportPayload, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `vocab-palavras-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    showNotification(`${cards.length} palavras exportadas com sucesso!`);
  };

  // Filtragem de palavras para gerenciar
  const filteredCards = useMemo(() => {
    if (!manageSearch.trim()) return cards;
    const term = cleanText(manageSearch);
    return cards.filter(
      (c) => cleanText(c.en).includes(term) || cleanText(c.pt).includes(term)
    );
  }, [cards, manageSearch]);

  // Porcentagem calculada na primeira sequência
  const accuracyPercentage = useMemo(() => {
    if (initialSequenceTotal === 0) return 100;
    const pct = Math.round((initialSequenceCorrect / initialSequenceTotal) * 100);
    return Math.max(0, Math.min(100, pct));
  }, [initialSequenceCorrect, initialSequenceTotal]);

  return (
    <div className="w-full max-w-4xl mx-auto flex flex-col items-center justify-center min-h-[55vh] px-3 py-2 animate-in fade-in duration-300">
      <AnimatePresence mode="wait">
        {/* ================================================================= */}
        {/* TELA 1: BENTO GRID MONOCROMÁTICO DARK PREMIUM (IDENTIDADE DO SITE)*/}
        {/* ================================================================= */}
        {gameState === 'idle' && (
          <motion.div
            key="screen-idle-bento"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.22 }}
            className="w-full grid grid-cols-1 md:grid-cols-3 gap-4 max-w-3xl"
          >
            {/* CARD 1 (DESTAQUE PRINCIPAL): CARD PLAY FLASHCARDS COM EFEITO DO SITE */}
            <div
              id="card-play-flashcards"
              ref={playCardTilt.ref}
              onClick={handleStartGame}
              onMouseMove={playCardTilt.handleMouseMove}
              onMouseEnter={playCardTilt.handleMouseEnter}
              onMouseLeave={playCardTilt.handleMouseLeave}
              style={{
                transform: playCardTilt.mouseCoords.isInteracting
                  ? `perspective(1000px) rotateX(${playCardTilt.mouseCoords.rotateX.toFixed(2)}deg) rotateY(${playCardTilt.mouseCoords.rotateY.toFixed(2)}deg) scale3d(1.01, 1.01, 1.01)`
                  : 'perspective(1000px) rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1)',
                transition: playCardTilt.mouseCoords.isInteracting
                  ? 'transform 0.08s ease-out'
                  : 'transform 0.4s cubic-bezier(0.23, 1, 0.32, 1)',
              }}
              className="group relative md:col-span-2 rounded-[28px] bg-[#121215] p-7 sm:p-8 cursor-pointer select-none transition-all duration-300 overflow-hidden flex flex-col justify-between min-h-[250px] border border-[#242429] hover:border-[#383842] shadow-[0_12px_40px_rgba(0,0,0,0.65)] hover:shadow-[0_16px_50px_rgba(0,0,0,0.85)] preserve-3d"
            >
              {/* Flashlight Border Effect (Padrão do site / PromptCard) */}
              <div
                className="flashlight-layer absolute inset-0 rounded-[28px] p-[1px] pointer-events-none z-10"
                style={{
                  opacity: playCardTilt.mouseCoords.isInteracting ? 1 : 0,
                  background: playCardTilt.mouseCoords.isInteracting
                    ? `radial-gradient(320px circle at ${playCardTilt.mouseCoords.x}px ${playCardTilt.mouseCoords.y}px, rgba(255, 255, 255, 0.35), rgba(255, 255, 255, 0.05) 45%, transparent 75%)`
                    : 'none',
                  WebkitMask:
                    'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)',
                  WebkitMaskComposite: 'xor',
                  maskComposite: 'exclude',
                }}
              />

              {/* Monochromatic Subtle Holographic Foil */}
              <div
                className="holographic-foil absolute inset-0 pointer-events-none rounded-[28px] z-20"
                style={{
                  opacity: playCardTilt.mouseCoords.isInteracting ? 0.18 : 0,
                  background: `
                    linear-gradient(${115 + playCardTilt.mouseCoords.rotateY * 2}deg, 
                      transparent 30%, 
                      rgba(255, 255, 255, 0.03) 48%, 
                      rgba(255, 255, 255, 0.07) 50%, 
                      rgba(255, 255, 255, 0.03) 52%, 
                      transparent 70%
                    ),
                    radial-gradient(circle at ${playCardTilt.mouseCoords.px}% ${playCardTilt.mouseCoords.py}%, 
                      rgba(255, 255, 255, 0.05) 0%, 
                      transparent 60%
                    )
                  `,
                }}
              />

              {/* Topo: Eyebrow minimalista */}
              <div className="relative z-30 flex items-start justify-between">
                <span className="text-[11px] font-mono tracking-wider uppercase text-zinc-300 font-medium px-2.5 py-1 rounded-md bg-[#18181c] border border-[#2b2b32]">
                  FLASHCARDS • PRÁTICA
                </span>
              </div>

              {/* Centro: Título com as fontes do site */}
              <div className="relative z-30 my-3">
                <h3 className="text-2xl sm:text-3xl font-semibold tracking-tight text-white group-hover:text-zinc-100 transition-colors">
                  Iniciar Flashcards
                </h3>
              </div>

              {/* Base: Status do Deck + Botão Metálico com Seta (->) igual ao botão de copiar */}
              <div className="relative z-30 flex items-center justify-between pt-2">
                <span className="text-xs text-zinc-400 font-mono">
                  {cards.length === 0
                    ? 'Nenhuma palavra cadastrada'
                    : cards.length === 1
                    ? '1 palavra no deck'
                    : `${cards.length} palavras no deck`}
                </span>

                {/* BOTÃO METÁLICO COM SETA IGUAL AO BOTÃO DE COPIAR DO PROMPT */}
                <div
                  className="relative overflow-hidden group/btn flex items-center justify-center min-w-[76px] h-[32px] px-3 rounded-lg transition-all duration-300 text-xs font-semibold cursor-pointer active:scale-95 bg-gradient-to-b from-[#ffffff] via-[#e2e5e9] to-[#b8bdc5] text-[#111113] border border-white/80 shadow-[0_2px_10px_rgba(0,0,0,0.5),inset_0_1px_1px_rgba(255,255,255,0.9)] hover:shadow-[0_4px_14px_rgba(255,255,255,0.2)]"
                  title="Começar agora"
                >
                  <span className="metallic-shine-layer" />
                  <span className="absolute inset-x-0 top-0 h-[1px] bg-gradient-to-r from-transparent via-white to-transparent opacity-80" />

                  <div className="flex items-center gap-1.5 text-[#111113]">
                    <span>Praticar</span>
                    <ArrowRight className="w-3.5 h-3.5 text-[#111113] stroke-[2.4]" />
                  </div>
                </div>
              </div>
            </div>

            {/* COLUNA LATERAL COM OS CARDS SECUNDÁRIOS */}
            <div className="flex flex-col gap-4">
              {/* CARD 2: ADICIONAR PALAVRAS */}
              <div
                id="card-add-vocab"
                onClick={() => setIsAddModalOpen(true)}
                className="group relative flex-1 rounded-[24px] bg-[#121215] p-5 cursor-pointer select-none transition-all duration-300 border border-[#242429] hover:border-[#383842] shadow-[0_10px_30px_rgba(0,0,0,0.6)] flex flex-col justify-between overflow-hidden min-h-[115px]"
              >
                <div className="flex items-start justify-between">
                  <span className="text-[10px] font-mono tracking-wider uppercase text-zinc-400">
                    NOVA PALAVRA
                  </span>
                </div>

                <div>
                  <h4 className="text-base font-semibold text-white tracking-tight group-hover:text-zinc-200">
                    Adicionar Palavras
                  </h4>
                </div>

                <div className="flex justify-end pt-1">
                  {/* Botão metálico de adicionar */}
                  <div className="relative overflow-hidden group/btn flex items-center justify-center h-[26px] px-2.5 rounded-md transition-all duration-300 text-[11px] font-semibold cursor-pointer active:scale-95 bg-gradient-to-b from-[#ffffff] via-[#e2e5e9] to-[#b8bdc5] text-[#111113] border border-white/80 shadow-[0_2px_8px_rgba(0,0,0,0.4),inset_0_1px_1px_rgba(255,255,255,0.9)]">
                    <span className="metallic-shine-layer" />
                    <span className="absolute inset-x-0 top-0 h-[1px] bg-gradient-to-r from-transparent via-white to-transparent opacity-80" />
                    <div className="flex items-center gap-1 text-[#111113]">
                      <span>Criar</span>
                      <ArrowRight className="w-3 h-3 text-[#111113] stroke-[2.4]" />
                    </div>
                  </div>
                </div>
              </div>

              {/* CARD 3: GERENCIAR PALAVRAS (SEU DECK) */}
              <div
                id="card-manage-vocab"
                onClick={() => setIsManageModalOpen(true)}
                className="group relative flex-1 rounded-[24px] bg-[#121215] p-5 cursor-pointer select-none transition-all duration-300 border border-[#242429] hover:border-[#383842] shadow-[0_10px_30px_rgba(0,0,0,0.6)] flex flex-col justify-between overflow-hidden min-h-[115px]"
              >
                <div className="flex items-start justify-between">
                  <span className="text-[10px] font-mono tracking-wider uppercase text-zinc-400">
                    SEU DECK
                  </span>
                </div>

                <div>
                  <h4 className="text-base font-semibold text-white tracking-tight group-hover:text-zinc-200">
                    {cards.length} {cards.length === 1 ? 'Palavra' : 'Palavras'}
                  </h4>
                </div>

                <div className="flex justify-end pt-1">
                  {/* Botão metálico de gerenciar */}
                  <div className="relative overflow-hidden group/btn flex items-center justify-center h-[26px] px-2.5 rounded-md transition-all duration-300 text-[11px] font-semibold cursor-pointer active:scale-95 bg-gradient-to-b from-[#ffffff] via-[#e2e5e9] to-[#b8bdc5] text-[#111113] border border-white/80 shadow-[0_2px_8px_rgba(0,0,0,0.4),inset_0_1px_1px_rgba(255,255,255,0.9)]">
                    <span className="metallic-shine-layer" />
                    <span className="absolute inset-x-0 top-0 h-[1px] bg-gradient-to-r from-transparent via-white to-transparent opacity-80" />
                    <div className="flex items-center gap-1 text-[#111113]">
                      <span>Listar</span>
                      <ArrowRight className="w-3 h-3 text-[#111113] stroke-[2.4]" />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* ================================================================= */}
        {/* TELA 2: SESSÃO DE FLASHCARD ATIVA (1 ÚNICO ENTER AVANÇA DIRETO)   */}
        {/* ================================================================= */}
        {gameState === 'playing' && currentCard && (
          <motion.div
            key="screen-playing-flashcard"
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.98 }}
            transition={{ duration: 0.2 }}
            className="w-full max-w-xl flex flex-col items-center py-2"
          >
            {/* CARD DO FLASHCARD COM IDENTIDADE DO SITE */}
            <div
              ref={gameCardTilt.ref}
              onMouseMove={gameCardTilt.handleMouseMove}
              onMouseEnter={gameCardTilt.handleMouseEnter}
              onMouseLeave={gameCardTilt.handleMouseLeave}
              style={{
                transform: gameCardTilt.mouseCoords.isInteracting
                  ? `perspective(1000px) rotateX(${gameCardTilt.mouseCoords.rotateX.toFixed(2)}deg) rotateY(${gameCardTilt.mouseCoords.rotateY.toFixed(2)}deg) scale3d(1.008, 1.008, 1.008)`
                  : 'perspective(1000px) rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1)',
                transition: gameCardTilt.mouseCoords.isInteracting
                  ? 'transform 0.08s ease-out'
                  : 'transform 0.4s cubic-bezier(0.23, 1, 0.32, 1)',
              }}
              className={`group relative w-full rounded-[28px] p-7 sm:p-9 shadow-[0_16px_50px_rgba(0,0,0,0.8)] transition-all duration-300 overflow-hidden border preserve-3d ${
                turnFeedback === 'correct'
                  ? 'bg-[#121513] border-white/40 shadow-[0_0_40px_rgba(255,255,255,0.08)]'
                  : turnFeedback === 'wrong'
                  ? 'bg-[#181214] border-rose-500/40 shadow-[0_0_40px_rgba(244,63,94,0.12)]'
                  : 'bg-[#121215] border-[#242429] hover:border-[#383842]'
              }`}
            >
              {/* Flashlight Border Effect */}
              <div
                className="flashlight-layer absolute inset-0 rounded-[28px] p-[1px] pointer-events-none z-10"
                style={{
                  opacity: gameCardTilt.mouseCoords.isInteracting ? 1 : 0,
                  background: gameCardTilt.mouseCoords.isInteracting
                    ? `radial-gradient(320px circle at ${gameCardTilt.mouseCoords.x}px ${gameCardTilt.mouseCoords.y}px, rgba(255, 255, 255, 0.35), rgba(255, 255, 255, 0.05) 45%, transparent 75%)`
                    : 'none',
                  WebkitMask:
                    'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)',
                  WebkitMaskComposite: 'xor',
                  maskComposite: 'exclude',
                }}
              />

              {/* Header do Flashcard: Sair + Direção + Progresso */}
              <div className="relative z-30 flex items-center justify-between mb-5">
                <button
                  type="button"
                  onClick={() => setGameState('idle')}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs text-zinc-400 hover:text-white bg-[#18181c] hover:bg-[#202026] border border-[#2b2b32] transition-colors cursor-pointer"
                  title="Sair do treino"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Sair</span>
                </button>

                <div className="flex items-center gap-2.5">
                  {/* Badge de Repescagem se estiver revisando as erradas */}
                  {sessionPhase === 'review' && (
                    <span className="flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-rose-500/15 border border-rose-500/30 text-rose-300 text-[10px] font-mono font-medium">
                      <RotateCcw className="w-2.5 h-2.5" />
                      <span>Revisando erradas ({missedQueue.length})</span>
                    </span>
                  )}

                  {/* Badge de Combo */}
                  <AnimatePresence>
                    {combo > 1 && (
                      <motion.div
                        initial={{ scale: 0.8, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0.8, opacity: 0 }}
                        className="flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-white/10 border border-white/20 text-zinc-200 text-[11px] font-mono font-semibold"
                      >
                        <Flame className="w-3.5 h-3.5 text-zinc-300" />
                        <span>x{combo}</span>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  <span className="text-xs font-mono text-zinc-400">
                    <span className="text-white font-semibold">{currentIdx + 1}</span> /{' '}
                    {activeDeck.length}
                  </span>
                </div>
              </div>

              {/* Tag com a Direção Atual do Flashcard (EN ➔ PT ou PT ➔ EN) */}
              <div className="relative z-30 flex justify-center mb-3">
                <span className="text-[11px] font-mono font-medium uppercase tracking-wider px-3 py-1 rounded-md bg-[#18181c] border border-[#2b2b32] text-zinc-300">
                  {directionBadgeLabel}
                </span>
              </div>

              {/* PALAVRA EM DESTAQUE COM AS FONTES DO SITE */}
              <div className="relative z-30 flex flex-col items-center text-center my-4">
                <h2 className="text-3xl sm:text-4xl font-semibold tracking-tight text-white select-none">
                  {promptWord}
                </h2>

                {currentCard.notes && (
                  <p className="text-xs text-zinc-400 italic max-w-sm mt-2 leading-relaxed">
                    "{currentCard.notes}"
                  </p>
                )}
              </div>

              {/* CAMPO DE DIGITAÇÃO COM BOTÃO METÁLICO E SETA IDÊNTICA AO BOTÃO COPIAR */}
              <div className="relative z-30 w-full mt-6">
                <div className="relative flex items-center">
                  <input
                    ref={inputRef}
                    type="text"
                    disabled={turnFeedback === 'correct'}
                    value={typedInput}
                    onChange={(e) => setTypedInput(e.target.value)}
                    onKeyDown={handleInputKeyDown}
                    placeholder={inputPlaceholder}
                    autoComplete="off"
                    spellCheck={false}
                    className={`w-full pl-4 pr-16 py-3.5 text-base sm:text-lg rounded-xl outline-none transition-all ${
                      turnFeedback === 'correct'
                        ? 'bg-[#181c19] text-white border-2 border-white/70 font-semibold'
                        : turnFeedback === 'wrong'
                        ? 'bg-rose-950/25 text-rose-300 border-2 border-rose-500 font-semibold'
                        : 'bg-[#18181c] text-white border border-[#292932] focus:border-zinc-400'
                    }`}
                  />

                  {/* BOTÃO METÁLICO COM SETA IGUAL AO BOTÃO DE COPIAR DO PROMPT */}
                  <button
                    type="button"
                    onClick={processAnswerSubmission}
                    disabled={turnFeedback === 'idle' && !typedInput.trim()}
                    className={`absolute right-2 overflow-hidden group/btn flex items-center justify-center min-w-[42px] h-[34px] px-2.5 rounded-lg transition-all duration-300 cursor-pointer active:scale-95 ${
                      turnFeedback === 'correct'
                        ? 'bg-gradient-to-b from-[#ffffff] via-[#e2e5e9] to-[#b8bdc5] text-[#111113] border border-white shadow-[0_0_16px_rgba(255,255,255,0.4)]'
                        : typedInput.trim() || turnFeedback !== 'idle'
                        ? 'bg-gradient-to-b from-[#ffffff] via-[#e2e5e9] to-[#b8bdc5] text-[#111113] border border-white/80 shadow-[0_2px_10px_rgba(0,0,0,0.5),inset_0_1px_1px_rgba(255,255,255,0.9)] hover:shadow-[0_4px_14px_rgba(255,255,255,0.2)]'
                        : 'bg-[#222228] text-zinc-600 border border-[#2c2c36] cursor-not-allowed opacity-50'
                    }`}
                    title={
                      turnFeedback === 'idle'
                        ? 'Confirmar resposta (Enter)'
                        : 'Próxima palavra (Enter)'
                    }
                  >
                    <span className="metallic-shine-layer" />
                    <span className="absolute inset-x-0 top-0 h-[1px] bg-gradient-to-r from-transparent via-white to-transparent opacity-80" />

                    {turnFeedback === 'correct' ? (
                      <Check className="w-4 h-4 text-[#111113] stroke-[3.2] animate-check-pop" />
                    ) : (
                      <ArrowRight className="w-4 h-4 text-[#111113] stroke-[2.4]" />
                    )}
                  </button>
                </div>

                {/* Feedback ao errar: mostra a resposta certa com total clareza e indica 1 único Enter para avançar */}
                {turnFeedback === 'wrong' && (
                  <motion.div
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mt-3 p-3.5 rounded-xl bg-rose-950/40 border border-rose-500/40 text-xs text-rose-300 flex items-center justify-between shadow-lg"
                  >
                    <div className="flex items-center gap-2">
                      <div className="w-5 h-5 rounded-full bg-rose-500/20 border border-rose-500/40 flex items-center justify-center text-rose-400 font-bold text-xs shrink-0">
                        ✕
                      </div>
                      <div className="text-sm">
                        Incorreto. Resposta correta:{' '}
                        <strong className="text-white text-base ml-1 font-bold tracking-wide">
                          {expectedAnswer}
                        </strong>
                      </div>
                    </div>
                    <span className="text-[11px] font-mono text-rose-200 bg-rose-900/50 px-2.5 py-1 rounded-md border border-rose-500/40 shrink-0">
                      Enter ↵ para continuar
                    </span>
                  </motion.div>
                )}

                {/* Feedback ao acertar: mensagem de sucesso nítida com a palavra confirmada */}
                {turnFeedback === 'correct' && (
                  <motion.div
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mt-3 p-3.5 rounded-xl bg-emerald-950/30 border border-emerald-500/35 text-xs text-zinc-200 flex items-center justify-between shadow-lg"
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="w-5 h-5 rounded-full bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 shrink-0">
                        <Check className="w-3.5 h-3.5 stroke-[3]" />
                      </div>
                      <div className="text-sm">
                        <span className="font-bold text-emerald-400">Correto!</span>
                        <span className="text-zinc-300 ml-2 font-medium">({expectedAnswer})</span>
                      </div>
                    </div>
                    <span className="text-[11px] font-mono text-zinc-400 bg-zinc-800/70 px-2.5 py-1 rounded-md border border-zinc-700/50 shrink-0">
                      Enter ↵ para avançar
                    </span>
                  </motion.div>
                )}
              </div>
            </div>
          </motion.div>
        )}

        {/* ================================================================= */}
        {/* TELA 3: RESULTADO FINAL COM ESTATÍSTICAS E PORCENTAGEM            */}
        {/* ================================================================= */}
        {gameState === 'completed' && (
          <motion.div
            key="screen-completed-flashcard"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.25 }}
            className="w-full max-w-md rounded-[28px] bg-[#121215] border border-[#242429] p-7 sm:p-9 shadow-[0_20px_60px_rgba(0,0,0,0.85)] flex flex-col items-center text-center my-4"
          >
            {/* Ícone de Troféu */}
            <div className="relative flex items-center justify-center w-14 h-14 rounded-full bg-gradient-to-b from-[#ffffff] via-[#e2e5e9] to-[#b8bdc5] text-[#111113] shadow-[0_4px_20px_rgba(255,255,255,0.2)] mb-4">
              <Trophy className="w-7 h-7 fill-[#111113] text-[#111113] stroke-[1.8]" />
            </div>

            <h3 className="text-2xl sm:text-3xl font-semibold text-white tracking-tight">
              Treino Concluído!
            </h3>

            <p className="text-xs text-zinc-400 mt-1 max-w-xs leading-relaxed">
              {initialSequenceWrong === 0
                ? 'Excelente! Você acertou todas de primeira!'
                : 'Todas as palavras erradas foram revisadas até você acertar 100%!'}
            </p>

            {/* Destaque de Porcentagem */}
            <div className="my-6 flex flex-col items-center">
              <div className="flex items-baseline gap-1">
                <span className="text-5xl sm:text-6xl font-extrabold tracking-tight text-white font-mono">
                  {accuracyPercentage}%
                </span>
                <span className="text-sm font-semibold text-zinc-400">de acertos</span>
              </div>
              <span className="text-[11px] text-zinc-500 font-mono mt-1">
                Aproveitamento na 1ª tentativa
              </span>
            </div>

            {/* Estatísticas Detalhadas: Certas vs Erradas */}
            <div className="w-full grid grid-cols-2 gap-3 mb-6">
              <div className="p-3.5 rounded-xl bg-[#18181c] border border-[#2b2b32] flex flex-col items-center">
                <div className="flex items-center gap-1.5 text-zinc-300 mb-1">
                  <CheckCircle2 className="w-4 h-4 text-white" />
                  <span className="text-xs font-medium">Certas</span>
                </div>
                <span className="text-2xl font-bold text-white font-mono">
                  {initialSequenceCorrect}
                </span>
              </div>

              <div className="p-3.5 rounded-xl bg-rose-950/20 border border-rose-500/30 flex flex-col items-center">
                <div className="flex items-center gap-1.5 text-rose-400 mb-1">
                  <XCircle className="w-4 h-4" />
                  <span className="text-xs font-medium">Erradas</span>
                </div>
                <span className="text-2xl font-bold text-white font-mono">
                  {initialSequenceWrong}
                </span>
              </div>
            </div>

            {/* Ações com o botão metálico padrão do site */}
            <div className="w-full flex flex-col gap-2.5">
              <button
                type="button"
                onClick={handleStartGame}
                className="relative overflow-hidden group/btn w-full py-3 rounded-xl transition-all duration-300 text-xs font-semibold cursor-pointer active:scale-95 bg-gradient-to-b from-[#ffffff] via-[#e2e5e9] to-[#b8bdc5] text-[#111113] border border-white/80 shadow-[0_2px_10px_rgba(0,0,0,0.5),inset_0_1px_1px_rgba(255,255,255,0.9)] hover:shadow-[0_4px_14px_rgba(255,255,255,0.2)] flex items-center justify-center gap-2"
              >
                <span className="metallic-shine-layer" />
                <span className="absolute inset-x-0 top-0 h-[1px] bg-gradient-to-r from-transparent via-white to-transparent opacity-80" />
                <RotateCcw className="w-3.5 h-3.5 stroke-[2.5]" />
                <span>Jogar Novamente</span>
              </button>

              <button
                type="button"
                onClick={() => setGameState('idle')}
                className="w-full py-2.5 rounded-xl bg-[#18181c] hover:bg-[#22222a] text-zinc-400 hover:text-white border border-[#282832] text-xs font-medium cursor-pointer transition-colors"
              >
                Voltar ao Menu
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* =================================================================== */}
      {/* MODAL 1: ADICIONAR PALAVRA                                          */}
      {/* =================================================================== */}
      <AnimatePresence>
        {isAddModalOpen && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
            onClick={(e) => {
              if (e.target === e.currentTarget) setIsAddModalOpen(false);
            }}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="w-full max-w-md rounded-[24px] bg-[#121215] border border-[#242429] p-6 shadow-2xl flex flex-col text-white"
            >
              <div className="flex items-center justify-between pb-3 border-b border-[#202026] mb-4">
                <span className="text-sm font-semibold text-white">Adicionar Palavra</span>
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="p-1 rounded-lg text-zinc-400 hover:text-white cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleAddWordSubmit} className="flex flex-col gap-4">
                <div>
                  <label className="block text-xs font-medium text-zinc-400 mb-1.5">
                    Palavra em Inglês (EN)
                  </label>
                  <input
                    type="text"
                    value={newWordEn}
                    onChange={(e) => setNewWordEn(e.target.value)}
                    placeholder="Ex: Breakthrough, Resilient"
                    className="w-full px-4 py-2.5 text-sm text-white bg-[#18181c] border border-[#282832] focus:border-zinc-400 rounded-xl outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-zinc-400 mb-1.5">
                    Tradução em Português (PT)
                  </label>
                  <input
                    type="text"
                    value={newWordPt}
                    onChange={(e) => setNewWordPt(e.target.value)}
                    placeholder="Ex: Avanço, Resiliente"
                    className="w-full px-4 py-2.5 text-sm text-white bg-[#18181c] border border-[#282832] focus:border-zinc-400 rounded-xl outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-zinc-400 mb-1.5">
                    Frase ou contexto (opcional)
                  </label>
                  <input
                    type="text"
                    value={newWordNotes}
                    onChange={(e) => setNewWordNotes(e.target.value)}
                    placeholder="Ex: This was a major breakthrough."
                    className="w-full px-4 py-2 text-xs text-white bg-[#18181c] border border-[#282832] focus:border-zinc-400 rounded-xl outline-none"
                  />
                </div>

                <button
                  type="submit"
                  className="relative overflow-hidden group/btn w-full py-3 rounded-xl transition-all duration-300 text-xs font-semibold cursor-pointer active:scale-95 bg-gradient-to-b from-[#ffffff] via-[#e2e5e9] to-[#b8bdc5] text-[#111113] border border-white/80 shadow-[0_2px_10px_rgba(0,0,0,0.5),inset_0_1px_1px_rgba(255,255,255,0.9)] hover:shadow-[0_4px_14px_rgba(255,255,255,0.2)] mt-2"
                >
                  <span className="metallic-shine-layer" />
                  <span className="absolute inset-x-0 top-0 h-[1px] bg-gradient-to-r from-transparent via-white to-transparent opacity-80" />
                  Salvar Palavra
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* =================================================================== */}
      {/* MODAL 2: GERENCIAR PALAVRAS (BUSCA, EDIÇÃO, EXCLUSÃO)               */}
      {/* =================================================================== */}
      <AnimatePresence>
        {isManageModalOpen && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
            onClick={(e) => {
              if (e.target === e.currentTarget) setIsManageModalOpen(false);
            }}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="w-full max-w-lg rounded-[24px] bg-[#121215] border border-[#242429] p-6 shadow-2xl flex flex-col text-white"
            >
              <div className="flex items-center justify-between pb-3 border-b border-[#202026] mb-3">
                <span className="text-sm font-semibold text-white">
                  Seu Deck ({cards.length} palavras)
                </span>
                <button
                  type="button"
                  onClick={() => setIsManageModalOpen(false)}
                  className="p-1 rounded-lg text-zinc-400 hover:text-white cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Busca rápida */}
              <div className="relative mb-3">
                <Search className="absolute left-3 top-2.5 w-3.5 h-3.5 text-zinc-500" />
                <input
                  type="text"
                  value={manageSearch}
                  onChange={(e) => setManageSearch(e.target.value)}
                  placeholder="Buscar palavra..."
                  className="w-full pl-9 pr-4 py-2 text-xs bg-[#18181c] border border-[#282832] rounded-xl text-white outline-none"
                />
              </div>

              <div className="flex flex-col gap-2 max-h-[340px] overflow-y-auto pr-1">
                {filteredCards.length === 0 ? (
                  <div className="py-8 text-center text-xs text-zinc-500">
                    Nenhuma palavra encontrada.
                  </div>
                ) : (
                  filteredCards.map((card) => (
                    <div
                      key={card.id}
                      className="flex items-center justify-between p-3 rounded-xl bg-[#18181c] border border-[#242429]"
                    >
                      <div className="flex flex-col">
                        <span className="text-sm font-semibold text-white">{card.en}</span>
                        <span className="text-xs text-zinc-400">{card.pt}</span>
                        {card.notes && (
                          <span className="text-[10px] text-zinc-500 italic mt-0.5">
                            {card.notes}
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => setEditingCard(card)}
                          className="p-1.5 rounded-lg text-zinc-400 hover:text-white cursor-pointer"
                          title="Editar"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => onDeleteCard(card.id)}
                          className="p-1.5 rounded-lg text-zinc-400 hover:text-rose-400 cursor-pointer"
                          title="Excluir"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Rodapé com Importar e Exportar do Deck */}
              <div className="flex items-center justify-between pt-3 mt-3 border-t border-[#202026]">
                <button
                  type="button"
                  onClick={handleExportVocabJson}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-zinc-300 hover:text-white bg-[#18181c] hover:bg-[#22222a] border border-[#2b2b34] transition-colors cursor-pointer"
                  title="Baixar arquivo JSON com as palavras"
                >
                  <Download className="w-3.5 h-3.5 text-zinc-400" />
                  <span>Exportar Palavras</span>
                </button>

                {onOpenBackup && (
                  <button
                    type="button"
                    onClick={() => {
                      setIsManageModalOpen(false);
                      onOpenBackup();
                    }}
                    className="relative overflow-hidden group/btn inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-[#111113] bg-gradient-to-b from-[#ffffff] via-[#e2e5e9] to-[#b8bdc5] border border-white/90 shadow-sm transition-all cursor-pointer active:scale-95"
                    title="Abrir backup e sincronização completa do site"
                  >
                    <span className="metallic-shine-layer" />
                    <Upload className="w-3.5 h-3.5 text-[#111113]" />
                    <span>Importar / Backup</span>
                  </button>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* =================================================================== */}
      {/* MODAL 3: EDIÇÃO DE PALAVRA                                          */}
      {/* =================================================================== */}
      <AnimatePresence>
        {editingCard && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm"
            onClick={(e) => {
              if (e.target === e.currentTarget) setEditingCard(null);
            }}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-sm rounded-2xl bg-[#121215] border border-[#242429] p-6 shadow-2xl text-white flex flex-col gap-4"
            >
              <div className="flex items-center justify-between pb-2 border-b border-[#202026]">
                <span className="text-xs font-semibold text-zinc-300">Editar Palavra</span>
                <button
                  type="button"
                  onClick={() => setEditingCard(null)}
                  className="p-1 text-zinc-500 hover:text-white cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleSaveEdit} className="flex flex-col gap-3">
                <div>
                  <label className="block text-xs text-zinc-400 mb-1">Inglês</label>
                  <input
                    type="text"
                    value={editingCard.en}
                    onChange={(e) => setEditingCard({ ...editingCard, en: e.target.value })}
                    className="w-full px-3.5 py-2 text-sm bg-[#18181c] border border-[#282832] rounded-xl text-white outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs text-zinc-400 mb-1">Português</label>
                  <input
                    type="text"
                    value={editingCard.pt}
                    onChange={(e) => setEditingCard({ ...editingCard, pt: e.target.value })}
                    className="w-full px-3.5 py-2 text-sm bg-[#18181c] border border-[#282832] rounded-xl text-white outline-none"
                  />
                </div>

                <div className="flex items-center gap-2 mt-2">
                  <button
                    type="button"
                    onClick={() => setEditingCard(null)}
                    className="flex-1 py-2.5 rounded-xl bg-[#18181c] text-xs text-zinc-400 hover:text-white border border-[#282832] cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="relative overflow-hidden group/btn flex-1 py-2.5 rounded-xl transition-all duration-300 text-xs font-semibold cursor-pointer active:scale-95 bg-gradient-to-b from-[#ffffff] via-[#e2e5e9] to-[#b8bdc5] text-[#111113] border border-white/80 shadow-[0_2px_10px_rgba(0,0,0,0.5),inset_0_1px_1px_rgba(255,255,255,0.9)] hover:shadow-[0_4px_14px_rgba(255,255,255,0.2)]"
                  >
                    <span className="metallic-shine-layer" />
                    <span className="absolute inset-x-0 top-0 h-[1px] bg-gradient-to-r from-transparent via-white to-transparent opacity-80" />
                    Salvar
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
