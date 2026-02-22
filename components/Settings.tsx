
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { SoundType, Language } from '../types';
import { translations } from '../translations';
import { TreePine, Waves, VolumeX, ArrowUp, ArrowDown } from 'lucide-react';

interface Props { 
  duration: number; 
  setDuration: (d: number) => void; 
  soundType: SoundType; 
  setSoundType: (s: SoundType) => void; 
  onStart: (isDrag?: boolean) => void; 
  lang: Language;
}

const Settings: React.FC<Props> = ({ duration, setDuration, soundType, setSoundType, onStart, lang }) => {
  const [isHolding, setIsHolding] = useState(false);
  const lastY = useRef(0);
  const accumulatedDelta = useRef(0);
  const moved = useRef(false);
  const t = translations[lang];

  const radius = window.innerWidth < 768 ? 120 : 170;
  const stroke = 6; 
  const bgStroke = 2; 
  const pathRadius = radius - stroke / 2;

  const handleEnd = useCallback((e: React.PointerEvent | PointerEvent) => {
    if (isHolding) {
      const wasDrag = moved.current;
      setIsHolding(false);
      onStart(wasDrag);
      if (e.cancelable) e.preventDefault();
    }
  }, [isHolding, onStart]);

  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      if (!isHolding) return;
      const currentY = e.clientY;
      const dy = lastY.current - currentY; // 向上为正
      lastY.current = currentY;

      if (Math.abs(dy) > 1) {
        moved.current = true;
      }

      accumulatedDelta.current += dy;

      if (Math.abs(accumulatedDelta.current) >= 10) {
        const steps = Math.trunc(accumulatedDelta.current / 10);
        const amount = steps * 300;
        
        setDuration(prev => {
          const next = prev + amount;
          const capped = Math.max(300, Math.min(7200, next));
          
          // 如果触碰或超过边界，重置累积值，确保反向立即响应
          if (next >= 7200 || next <= 300) {
            accumulatedDelta.current = 0;
          } else {
            accumulatedDelta.current -= steps * 10;
          }
          return capped;
        });
      }
    };
    
    const onWindowEnd = (e: PointerEvent) => handleEnd(e);

    if (isHolding) {
      window.addEventListener('pointermove', onMove);
      window.addEventListener('pointerup', onWindowEnd);
      window.addEventListener('pointercancel', onWindowEnd);
    }
    return () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onWindowEnd);
      window.removeEventListener('pointercancel', onWindowEnd);
    };
  }, [isHolding, handleEnd, setDuration]);

  const handlePointerDown = (e: React.PointerEvent) => {
    setIsHolding(true);
    moved.current = false;
    lastY.current = e.clientY;
    accumulatedDelta.current = 0;
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };

  const uiTransitionClass = !isHolding ? 'duration-300' : 'duration-[5000ms]';

  return (
    <div className="relative w-full h-full flex flex-col items-center z-10 px-6">
      <div className="flex-1 w-full" /> 

      <div 
        className="relative group cursor-ns-resize flex items-center justify-center touch-none select-none flex-shrink-0 w-[240px] h-[240px] md:w-[340px] md:h-[340px]" 
        onPointerDown={handlePointerDown}
        onPointerUp={handleEnd}
      >
        <div className={`absolute inset-0 transition-all duration-1000 flex items-center justify-center ${isHolding ? 'scale-105' : 'scale-100'}`}>
          <svg height={radius * 2} width={radius * 2} className="transform -rotate-90">
            <circle 
              stroke="currentColor" 
              fill="transparent" 
              strokeWidth={bgStroke} 
              r={pathRadius} 
              cx={radius} 
              cy={radius} 
              className={`transition-opacity duration-1000 ${isHolding ? 'opacity-30' : 'opacity-10 group-hover:opacity-20'}`} 
            />
            <circle 
              stroke="transparent" 
              fill="transparent" 
              strokeWidth={stroke} 
              r={pathRadius} 
              cx={radius} 
              cy={radius} 
            />
          </svg>
        </div>
        
        <ArrowUp className={`absolute -left-12 md:-left-16 transition-all duration-500 ${isHolding ? 'opacity-40 -translate-y-2' : 'opacity-0'}`} size={18} strokeWidth={1} />
        <ArrowDown className={`absolute -right-12 md:-right-16 transition-all duration-500 ${isHolding ? 'opacity-40 translate-y-2' : 'opacity-0'}`} size={18} strokeWidth={1} />

        {/* 核心改动：数字移除 tracking 以保证单数字绝对居中；单位使用 pl 对等抵消 tracking 的右间隙 */}
        <div className={`relative z-10 flex flex-col items-center justify-center gap-1 md:gap-2 transition-transform duration-500 ${isHolding ? 'scale-110' : ''}`}>
          <span className="text-[72px] md:text-[96px] font-thin tabular-nums leading-none tracking-normal">
            {Math.floor(duration / 60)}
          </span>
          <span className="text-[12px] md:text-[14px] uppercase tracking-[0.3em] pl-[0.3em] transition-opacity duration-500 font-light leading-none opacity-40">
            {t.min}
          </span>
        </div>
      </div>

      <div className="flex-1 w-full flex flex-col items-center justify-center">
        <div className={`flex items-center justify-center space-x-12 md:space-x-20 transition-opacity ${uiTransitionClass} ${!isHolding ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
          {[ 
            {id:'forest', icon:TreePine, label:t.forest}, 
            {id:'none', icon:VolumeX, label:t.none},
            {id:'stream', icon:Waves, label:t.stream} 
          ].map(s => (
            <button 
              key={s.id} 
              onClick={(e) => { e.stopPropagation(); setSoundType(s.id as SoundType); }} 
              className={`flex flex-col items-center space-y-4 transition-all duration-1000 ${soundType === s.id ? 'opacity-90 scale-110' : 'opacity-30 hover:opacity-60'}`}
            >
              <s.icon size={24} strokeWidth={1} />
              <span className="text-[10px] md:text-[11px] uppercase tracking-[0.5em] pl-[0.5em] font-normal">{s.label}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

export default Settings;
