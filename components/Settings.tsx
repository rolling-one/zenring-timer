import React, { useState, useRef, useEffect } from 'react';
import { SoundType, Language } from '../types';
import { translations } from '../translations';
import { TreePine, Waves, VolumeX, ArrowUp, ArrowDown } from 'lucide-react';

interface Props { duration: number; setDuration: (d: number) => void; soundType: SoundType; setSoundType: (s: SoundType) => void; onStart: () => void; lang: Language; }

const Settings: React.FC<Props> = ({ duration, setDuration, soundType, setSoundType, onStart, lang }) => {
  const [isHolding, setIsHolding] = useState(false);
  const startY = useRef(0);
  const startDur = useRef(0);
  const t = translations[lang];

  useEffect(() => {
    const onMove = (e: any) => {
      if (!isHolding) return;
      const y = e.touches ? e.touches[0].clientY : e.clientY;
      const delta = Math.floor((startY.current - y) / 10);
      setDuration(Math.max(60, Math.min(startDur.current + delta * 60, 7200)));
    };
    const onEnd = () => { if (isHolding) { setIsHolding(false); onStart(); } };
    
    if (isHolding) {
      window.addEventListener('mousemove', onMove);
      window.addEventListener('mouseup', onEnd);
      window.addEventListener('touchmove', onMove);
      window.addEventListener('touchend', onEnd);
    }
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onEnd);
      window.removeEventListener('touchmove', onMove);
      window.removeEventListener('touchend', onEnd);
    };
  }, [isHolding, onStart, setDuration]);

  const handleStart = (y: number) => { setIsHolding(true); startY.current = y; startDur.current = duration; };

  return (
    <div className="relative w-full h-full flex flex-col items-center justify-between py-16 md:py-24 z-10 px-6">
      <div className="h-[10px]" /> 

      <div className="relative group cursor-ns-resize flex items-center justify-center touch-none" onMouseDown={e => handleStart(e.clientY)} onTouchStart={e => handleStart(e.touches[0].clientY)}>
        <div className={`absolute rounded-full border transition-all duration-700 w-[260px] h-[260px] md:w-[340px] md:h-[340px] 
          ${isHolding 
            ? 'border-black/30 border-[1.5px] scale-105 bg-white/50 shadow-xl shadow-black/5' 
            : 'border-black/5 group-hover:border-black/10'}`} 
        />
        
        <ArrowUp className={`absolute -left-12 md:-left-16 transition-all duration-500 ${isHolding ? 'opacity-40 -translate-y-2' : 'opacity-0'}`} size={16} strokeWidth={1} />
        <ArrowDown className={`absolute -right-12 md:-right-16 transition-all duration-500 ${isHolding ? 'opacity-40 translate-y-2' : 'opacity-0'}`} size={16} strokeWidth={1} />

        <div className={`relative z-10 flex flex-col items-center transition-transform duration-500 ${isHolding ? 'scale-110' : ''}`}>
          {/* 取中间值 7xl/8xl */}
          <span className="text-7xl md:text-8xl font-thin tracking-[-0.02em] tabular-nums leading-none mb-2">{Math.floor(duration / 60)}</span>
          <span className={`text-[10px] uppercase tracking-[0.6em] transition-opacity duration-500 mr-[-0.6em] ${isHolding ? 'opacity-20' : 'opacity-40'}`}>
            {t.min}
          </span>
        </div>
      </div>

      <div className={`flex items-center justify-center space-x-10 md:space-x-16 transition-opacity duration-700 ${isHolding ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}>
        {[ 
          {id:'forest', icon:TreePine, label:t.forest}, 
          {id:'none', icon:VolumeX, label:t.none},
          {id:'stream', icon:Waves, label:t.stream} 
        ].map(s => (
          <button key={s.id} onClick={() => setSoundType(s.id as SoundType)} className={`flex flex-col items-center space-y-2 transition-all duration-1000 ${soundType === s.id ? 'opacity-80 scale-110' : 'opacity-20 hover:opacity-50'}`}>
            <s.icon size={18} strokeWidth={1} />
            <span className="text-[9px] uppercase tracking-[0.4em] font-light">{s.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
};

export default Settings;