import React, { useState, useRef } from 'react';
import { motion } from 'motion/react';
import { Volume2, Pencil, Trash2, Check, X } from 'lucide-react';
import { VocabCard } from '../types';

interface VocabCardItemProps {
  card: VocabCard;
  index: number;
  onEdit: (card: VocabCard) => void;
  onDelete: (id: string) => void;
  onSpeak: (text: string) => void;
  isHovered?: boolean;
  isAnyHovered?: boolean;
  onMouseEnter?: () => void;
  onMouseLeave?: () => void;
}

export const VocabCardItem: React.FC<VocabCardItemProps> = ({
  card,
  index,
  onEdit,
  onDelete,
  onSpeak,
  isHovered = false,
  isAnyHovered = false,
  onMouseEnter,
  onMouseLeave,
}) => {
  const cardRef = useRef<HTMLDivElement>(null);

  // Subtle 3D Tilt & Mouse Coordinates (same physics as PromptCard)
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
    if (!cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const px = Math.max(0, Math.min(100, (x / rect.width) * 100));
    const py = Math.max(0, Math.min(100, (y / rect.height) * 100));

    // Gentle 3D tilt (max ±2.5 deg)
    const rotateY = ((x - rect.width / 2) / (rect.width / 2)) * 2.5;
    const rotateX = ((y - rect.height / 2) / (rect.height / 2)) * -2.5;

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

  const handleCardMouseEnter = () => {
    if (onMouseEnter) onMouseEnter();
    setMouseCoords((prev) => ({ ...prev, isInteracting: true }));
  };

  const handleCardMouseLeave = () => {
    if (onMouseLeave) onMouseLeave();
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

  const isDimmed = isAnyHovered && !isHovered;
  const totalAttempts = (card.timesCorrect || 0) + (card.timesWrong || 0);

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.1 }}
      transition={{
        duration: 0.32,
        delay: Math.min((index % 6) * 0.04, 0.2),
        ease: [0.25, 0.46, 0.45, 0.94],
      }}
      className="card-perspective-container w-full h-full"
    >
      <div
        ref={cardRef}
        id={`vocab-card-${card.id}`}
        onMouseMove={handleMouseMove}
        onMouseEnter={handleCardMouseEnter}
        onMouseLeave={handleCardMouseLeave}
        style={{
          transform: mouseCoords.isInteracting
            ? `perspective(1000px) rotateX(${mouseCoords.rotateX.toFixed(2)}deg) rotateY(${mouseCoords.rotateY.toFixed(2)}deg) scale3d(1.015, 1.015, 1.015)`
            : 'perspective(1000px) rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1)',
          transition: mouseCoords.isInteracting
            ? 'transform 0.08s ease-out'
            : 'transform 0.45s cubic-bezier(0.23, 1, 0.32, 1), opacity 0.3s ease-out',
        }}
        className={`group relative flex flex-col justify-between rounded-2xl bg-[#141416] p-4 select-none preserve-3d overflow-hidden transition-all duration-300 ${
          isDimmed
            ? 'opacity-25 scale-[0.98] blur-[0.3px] border border-[#18181b] shadow-none'
            : isHovered
            ? 'opacity-100 z-20 shadow-[0_12px_40px_rgba(0,0,0,0.85),0_0_25px_rgba(255,255,255,0.04)] border-[#35353d]'
            : 'border border-[#222226] shadow-[0_4px_20px_rgba(0,0,0,0.45)] hover:border-[#35353d]'
        }`}
      >
        {/* ========================================================= */}
        {/* 1. STRIPE FLASHLIGHT EFFECT: Pure Monochromatic Border    */}
        {/* ========================================================= */}
        <div
          className="flashlight-layer absolute inset-0 rounded-2xl p-[1px] pointer-events-none z-10"
          style={{
            opacity: mouseCoords.isInteracting ? 1 : 0,
            background: mouseCoords.isInteracting
              ? `radial-gradient(240px circle at ${mouseCoords.x}px ${mouseCoords.y}px, rgba(255, 255, 255, 0.4), rgba(255, 255, 255, 0.05) 40%, transparent 75%)`
              : 'none',
            WebkitMask:
              'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)',
            WebkitMaskComposite: 'xor',
            maskComposite: 'exclude',
          }}
        />

        {/* Flashlight Ambient Surface Glow */}
        <div
          className="flashlight-layer absolute inset-0 pointer-events-none rounded-2xl z-0"
          style={{
            opacity: mouseCoords.isInteracting ? 1 : 0,
            background: mouseCoords.isInteracting
              ? `radial-gradient(280px circle at ${mouseCoords.x}px ${mouseCoords.y}px, rgba(255, 255, 255, 0.035), transparent 75%)`
              : 'none',
          }}
        />

        {/* ========================================================= */}
        {/* 2. SUBTLE MONOCHROMATIC REFLECTION                        */}
        {/* ========================================================= */}
        <div
          className="holographic-foil absolute inset-0 pointer-events-none rounded-2xl z-20"
          style={{
            opacity: mouseCoords.isInteracting ? 0.22 : 0,
            background: `
              linear-gradient(${115 + mouseCoords.rotateY * 2}deg, 
                transparent 30%, 
                rgba(255, 255, 255, 0.03) 48%, 
                rgba(255, 255, 255, 0.07) 50%, 
                rgba(255, 255, 255, 0.03) 52%, 
                transparent 70%
              ),
              radial-gradient(circle at ${mouseCoords.px}% ${mouseCoords.py}%, 
                rgba(255, 255, 255, 0.06) 0%, 
                transparent 60%
              )
            `,
          }}
        />

        {/* ========================================================= */}
        {/* 3. CARD HEADER: Status Badge + Action Buttons with Motion */}
        {/* ========================================================= */}
        <div className="relative z-30 flex items-center justify-between gap-2 mb-3">
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] font-mono tracking-wider text-zinc-500 uppercase">
              EN
            </span>
            <span className="text-zinc-700 text-[10px]">•</span>
            <span className="text-[10px] font-mono text-zinc-500">PT</span>
          </div>

          <div className="flex items-center gap-1">
            {/* Audio Button with motion animation */}
            <motion.button
              type="button"
              whileHover={{ scale: 1.12 }}
              whileTap={{ scale: 0.9 }}
              transition={{ type: 'spring', stiffness: 450, damping: 20 }}
              onClick={(e) => {
                e.stopPropagation();
                onSpeak(card.en);
              }}
              className="p-1.5 rounded-lg text-zinc-500 hover:text-white hover:bg-[#1f1f26] transition-colors cursor-pointer"
              title="Ouvir pronúncia"
            >
              <Volume2 className="w-3.5 h-3.5" />
            </motion.button>

            {/* Edit Button with motion animation */}
            <motion.button
              type="button"
              whileHover={{ scale: 1.12 }}
              whileTap={{ scale: 0.9 }}
              transition={{ type: 'spring', stiffness: 450, damping: 20 }}
              onClick={(e) => {
                e.stopPropagation();
                onEdit(card);
              }}
              className="p-1.5 rounded-lg text-zinc-500 hover:text-white hover:bg-[#1f1f26] transition-colors cursor-pointer"
              title="Editar palavra"
            >
              <Pencil className="w-3 h-3" />
            </motion.button>

            {/* Delete Button with motion animation */}
            <motion.button
              type="button"
              whileHover={{ scale: 1.12 }}
              whileTap={{ scale: 0.9 }}
              transition={{ type: 'spring', stiffness: 450, damping: 20 }}
              onClick={(e) => {
                e.stopPropagation();
                onDelete(card.id);
              }}
              className="p-1.5 rounded-lg text-zinc-500 hover:text-rose-400 hover:bg-rose-950/20 transition-colors cursor-pointer"
              title="Excluir palavra"
            >
              <Trash2 className="w-3 h-3" />
            </motion.button>
          </div>
        </div>

        {/* ========================================================= */}
        {/* 4. CARD BODY: Clean Minimalist Vocabulary Content         */}
        {/* ========================================================= */}
        <div className="relative z-30 flex-1 flex flex-col gap-1.5 mb-4">
          <h3 className="text-base sm:text-[17px] font-semibold text-white tracking-tight leading-snug">
            {card.en}
          </h3>

          <p className="text-xs text-zinc-300 font-medium tracking-normal">
            {card.pt}
          </p>

          {card.notes && (
            <p className="text-[11px] text-zinc-500 italic mt-1 line-clamp-2 leading-relaxed">
              "{card.notes}"
            </p>
          )}
        </div>

        {/* ========================================================= */}
        {/* 5. CARD FOOTER: Minimalist Stats & Feedback Indicator     */}
        {/* ========================================================= */}
        <div className="relative z-30 pt-2.5 border-t border-[#1d1d22] flex items-center justify-between text-[10px] font-mono text-zinc-500">
          <div className="flex items-center gap-1.5">
            {card.lastResult === 'correct' ? (
              <span className="inline-flex items-center gap-1 text-emerald-400/90">
                <Check className="w-2.5 h-2.5" />
                <span>Acertou</span>
              </span>
            ) : card.lastResult === 'wrong' ? (
              <span className="inline-flex items-center gap-1 text-rose-400/90">
                <X className="w-2.5 h-2.5" />
                <span>Errou</span>
              </span>
            ) : (
              <span className="text-zinc-600">Não testado</span>
            )}
          </div>

          {totalAttempts > 0 && (
            <span className="text-zinc-500" title="Taxa de acertos">
              {card.timesCorrect || 0}/{totalAttempts}
            </span>
          )}
        </div>
      </div>
    </motion.div>
  );
};
