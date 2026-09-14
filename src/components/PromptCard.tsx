import React, { useState, useRef } from 'react';
import { motion } from 'motion/react';
import { PromptItem } from '../types';
import {
  Image as ImageIcon,
  Video,
  Copy,
  Check,
  Pencil,
  GripVertical,
  Layers,
} from 'lucide-react';

interface PromptCardProps {
  prompt: PromptItem;
  index?: number;
  onSelect: (prompt: PromptItem) => void;
  onEdit?: (prompt: PromptItem) => void;
  activeWorkflowFilter?: string | null;
  isHovered?: boolean;
  isAnyHovered?: boolean;
  onMouseEnter?: () => void;
  onMouseLeave?: () => void;
  // Drag & drop reordering
  isDragging?: boolean;
  isDragOver?: boolean;
  onDragStart?: (e: React.DragEvent, id: string) => void;
  onDragOver?: (e: React.DragEvent, id: string) => void;
  onDragLeave?: (e: React.DragEvent) => void;
  onDrop?: (e: React.DragEvent, id: string) => void;
  onDragEnd?: (e: React.DragEvent) => void;
}

export const PromptCard: React.FC<PromptCardProps> = ({
  prompt,
  index = 0,
  onSelect,
  onEdit,
  activeWorkflowFilter,
  isHovered = false,
  isAnyHovered = false,
  onMouseEnter,
  onMouseLeave,
  isDragging = false,
  isDragOver = false,
  onDragStart,
  onDragOver,
  onDragLeave,
  onDrop,
  onDragEnd,
}) => {
  const [copiedQuick, setCopiedQuick] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);

  // Subtle 3D Tilt & Mouse Coordinates
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

    // Very gentle 3D tilt (max ±2.5 degrees)
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

  const handleQuickCopy = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(prompt.template);
      setCopiedQuick(true);
      setTimeout(() => setCopiedQuick(false), 2200);
    } catch {
      onSelect(prompt);
    }
  };

  const handleEdit = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onEdit) {
      onEdit(prompt);
    }
  };

  const isDimmed = isAnyHovered && !isHovered;

  return (
    <motion.div
      initial={{ opacity: 0, y: 18 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.1 }}
      transition={{
        duration: 0.35,
        delay: Math.min((index % 4) * 0.04, 0.16),
        ease: [0.25, 0.46, 0.45, 0.94],
      }}
      className="card-perspective-container w-full h-full"
      draggable
      onDragStart={(e) => onDragStart && onDragStart(e as unknown as React.DragEvent, prompt.id)}
      onDragOver={(e) => onDragOver && onDragOver(e as unknown as React.DragEvent, prompt.id)}
      onDragLeave={(e) => onDragLeave && onDragLeave(e as unknown as React.DragEvent)}
      onDrop={(e) => onDrop && onDrop(e as unknown as React.DragEvent, prompt.id)}
      onDragEnd={(e) => onDragEnd && onDragEnd(e as unknown as React.DragEvent)}
    >
      <div
        ref={cardRef}
        id={`prompt-card-${prompt.id}`}
        onClick={() => onSelect(prompt)}
        onMouseMove={handleMouseMove}
        onMouseEnter={handleCardMouseEnter}
        onMouseLeave={handleCardMouseLeave}
        style={{
          transform: mouseCoords.isInteracting
            ? `perspective(1000px) rotateX(${mouseCoords.rotateX.toFixed(2)}deg) rotateY(${mouseCoords.rotateY.toFixed(2)}deg) scale3d(1.01, 1.01, 1.01)`
            : 'perspective(1000px) rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1)',
          transition: mouseCoords.isInteracting
            ? 'transform 0.08s ease-out'
            : 'transform 0.45s cubic-bezier(0.23, 1, 0.32, 1), opacity 0.3s ease-out',
        }}
        className={`group relative flex flex-col justify-between rounded-2xl bg-[#141416] cursor-grab active:cursor-grabbing p-4 select-none preserve-3d overflow-hidden transition-all duration-300 ${
          isDragging
            ? 'opacity-25 border border-dashed border-zinc-500 scale-95 shadow-none'
            : isDragOver
            ? 'border-2 border-white scale-[1.02] shadow-[0_0_20px_rgba(255,255,255,0.2)]'
            : isDimmed
            ? 'opacity-20 scale-[0.98] blur-[0.4px] border border-[#18181b] shadow-none'
            : isHovered
            ? 'opacity-100 z-30 shadow-[0_12px_40px_rgba(0,0,0,0.85),0_0_25px_rgba(255,255,255,0.04)]'
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
        {/* 2. SUBTLE MONOCHROMATIC REFLECTION (MUITO MAIS SUAVE)     */}
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
        {/* 3. CARD HEADER (Media Badge + Drag Handle + Edit)         */}
        {/* ========================================================= */}
        <div
          className="relative z-30 flex items-center justify-between mb-3 transition-transform duration-100 ease-out"
          style={{
            transform: mouseCoords.isInteracting
              ? 'translateZ(8px)'
              : 'translateZ(0px)',
          }}
        >
          <div className="flex items-center gap-2">
            <div
              className="text-zinc-600 group-hover:text-zinc-400 transition-colors cursor-grab active:cursor-grabbing p-0.5"
              title="Segure para mover o card"
            >
              <GripVertical className="w-3.5 h-3.5" />
            </div>

            <span
              id={`media-badge-${prompt.id}`}
              className={`inline-flex items-center gap-1.5 px-2 py-0.5 text-[11px] font-medium rounded-md shadow-sm transition-colors ${
                prompt.mediaType === 'video'
                  ? 'bg-[#0f172a]/70 text-blue-400 border border-blue-500/50'
                  : 'bg-[#1c1c20] text-white border border-[#2b2b32]'
              }`}
            >
              {prompt.mediaType === 'video' ? (
                <Video className="w-3 h-3 text-blue-400" />
              ) : (
                <ImageIcon className="w-3 h-3 text-white" />
              )}
              <span>{prompt.mediaLabel}</span>
            </span>
          </div>

          {/* Action icon: Edit */}
          <div
            className="flex items-center gap-1"
            draggable={false}
            onMouseDown={(e) => e.stopPropagation()}
          >
            {onEdit && (
              <button
                id={`btn-edit-${prompt.id}`}
                onClick={handleEdit}
                className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-[#222227] transition-all cursor-pointer"
                title="Editar prompt"
              >
                <Pencil className="w-3.5 h-3.5 text-white" />
              </button>
            )}
          </div>
        </div>

        {/* Card Body: Title and Text Preview */}
        <div className="relative z-30 flex flex-col flex-1 mb-4">
          <h3
            id={`prompt-title-${prompt.id}`}
            className="text-sm font-semibold text-white group-hover:text-zinc-100 transition-transform duration-100 line-clamp-1 mb-1.5 tracking-tight"
            style={{
              transform: mouseCoords.isInteracting
                ? 'translateZ(6px)'
                : 'translateZ(0px)',
            }}
          >
            {prompt.title}
          </h3>

          <p
            id={`prompt-preview-text-${prompt.id}`}
            className="text-xs font-mono text-zinc-400/50 group-hover:text-zinc-300/80 leading-relaxed line-clamp-3 select-none opacity-35 group-hover:opacity-75 transition-all duration-300"
            style={{
              transform: mouseCoords.isInteracting
                ? 'translateZ(4px)'
                : 'translateZ(0px)',
            }}
          >
            {prompt.template}
          </p>

          {/* Foto JPEG: posicionada debaixo do texto, aparece ao passar o mouse no card */}
          {prompt.imageUrl && (
            <div
              className={`relative overflow-hidden rounded-xl bg-[#09090b] transition-all duration-300 ease-out ${
                isHovered
                  ? 'mt-3 max-h-52 opacity-100 scale-100 border border-[#2c2c36] shadow-lg'
                  : 'mt-0 max-h-0 opacity-0 scale-95 border-transparent pointer-events-none group-hover:mt-3 group-hover:max-h-52 group-hover:opacity-100 group-hover:scale-100 group-hover:border-[#2c2c36] group-hover:shadow-lg'
              }`}
              style={{
                transform: mouseCoords.isInteracting
                  ? 'translateZ(8px)'
                  : 'translateZ(0px)',
              }}
            >
              <img
                src={prompt.imageUrl}
                alt={prompt.title}
                referrerPolicy="no-referrer"
                className="w-full h-36 sm:h-40 object-cover transition-transform duration-500 ease-out hover:scale-105"
                onError={(e) => {
                  (e.target as HTMLElement).style.display = 'none';
                }}
              />
            </div>
          )}
        </div>

        {/* Card Footer: Variáveis no canto esquerdo e Botão de Copiar no canto direito */}
        <div
          className="relative z-30 pt-2.5 border-t border-[#202024] flex items-center justify-between text-xs transition-transform duration-100"
          style={{
            transform: mouseCoords.isInteracting
              ? 'translateZ(8px)'
              : 'translateZ(0px)',
          }}
          draggable={false}
          onMouseDown={(e) => e.stopPropagation()}
        >
          {/* Canto esquerdo inferior: número de variação */}
          <div className="flex items-center">
            {prompt.variables.length > 0 ? (
              <span className="text-[11px] font-mono text-zinc-400 bg-[#17171a] px-2 py-0.5 rounded border border-[#242429]">
                {prompt.variables.length}{' '}
                {prompt.variables.length === 1 ? 'variação' : 'variações'}
              </span>
            ) : (
              <span className="text-[11px] font-mono text-zinc-600">
                0 variações
              </span>
            )}
          </div>

          {/* Canto direito inferior: Metallic Copy Button */}
          <button
            id={`btn-copy-icon-${prompt.id}`}
            onClick={handleQuickCopy}
            className={`relative overflow-hidden group/btn flex items-center justify-center min-w-[76px] h-[30px] px-3 rounded-lg transition-all duration-300 text-xs font-semibold cursor-pointer active:scale-95 ${
              copiedQuick
                ? 'bg-gradient-to-b from-[#34d399] via-[#10b981] to-[#059669] border border-[#6ee7b7]/80 shadow-[0_0_16px_rgba(16,185,129,0.5)]'
                : 'bg-gradient-to-b from-[#ffffff] via-[#e2e5e9] to-[#b8bdc5] text-[#111113] border border-white/80 shadow-[0_2px_10px_rgba(0,0,0,0.5),inset_0_1px_1px_rgba(255,255,255,0.9)] hover:shadow-[0_4px_14px_rgba(255,255,255,0.2)]'
            }`}
            title={copiedQuick ? 'Copiado!' : 'Copiar prompt'}
          >
            <span className="metallic-shine-layer" />
            <span className="absolute inset-x-0 top-0 h-[1px] bg-gradient-to-r from-transparent via-white to-transparent opacity-80" />

            {copiedQuick ? (
              <Check className="w-4 h-4 text-white stroke-[3.5] animate-check-pop" />
            ) : (
              <div className="flex items-center gap-1.5 text-[#111113]">
                <Copy className="w-3.5 h-3.5 text-[#111113] stroke-[2.2]" />
                <span>Copiar</span>
              </div>
            )}
          </button>
        </div>
      </div>
    </motion.div>
  );
};
