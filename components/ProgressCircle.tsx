
import React, { useState, useEffect, useRef } from 'react';
import { Language } from '../types';
import { translations } from '../translations';

interface Props { 
  isUIVisible: boolean; 
  timeLeft: number; 
  startTime: number | null; 
  duration: number; 
  status: string; 
  lang: Language; 
  onCancel: () => void; 
  wasDragging?: boolean;
}

const ProgressCircle: React.FC<Props> = ({ isUIVisible, timeLeft, startTime, duration, status, lang, onCancel, wasDragging }) => {
  const [progress, setProgress] = useState(0);
  const [isInitialPrepare, setIsInitialPrepare] = useState(status === 'preparing' && wasDragging);
  const t = translations[lang];
  
  const mountTime = useRef(Date.now());
  const lastWakeTime = useRef(0);
  const prevUIVisible = useRef(isUIVisible);
  
  const radius = window.innerWidth < 768 ? 120 : 170;
  const stroke = 6; 
  const bgStroke = 2; 
  const pathRadius = radius - stroke / 2; 
  const circumference = pathRadius * 2 * Math.PI;

  const isAlwaysVisible = status === 'finishing' || status === 'preparing';
  const showUI = isUIVisible || isAlwaysVisible;
  const isFinishing = status === 'finishing';

  useEffect(() => {
    if (status === 'preparing') {
      const timer = setTimeout(() => setIsInitialPrepare(false), 50);
      return () => clearTimeout(timer);
    }
  }, [status]);

  useEffect(() => {
    if (!prevUIVisible.current && isUIVisible) {
      lastWakeTime.current = Date.now();
    }
    prevUIVisible.current = isUIVisible;
  }, [isUIVisible]);

  useEffect(() => {
    if (status === 'meditating' && startTime) {
      const update = () => {
        const p = Math.min((Date.now() - startTime) / 1000 / duration, 1);
        setProgress(p);
        requestAnimationFrame(update);
      };
      const id = requestAnimationFrame(update);
      return () => cancelAnimationFrame(id);
    }
    if (status === 'finishing') {
      setProgress(1);
    } else if (status === 'preparing') {
      setProgress(0);
    }
  }, [status, startTime, duration]);

  const handleCircleClick = (e: React.MouseEvent) => {
    if (Date.now() - mountTime.current < 500) return;
    const isTouchDevice = window.matchMedia('(pointer: coarse)').matches;
    if (status === 'meditating' && isTouchDevice) {
      const timeSinceWake = Date.now() - lastWakeTime.current;
      if (!isUIVisible || timeSinceWake < 500) return;
    }
    onCancel();
  };

  const minutes = Math.floor(timeLeft / 60).toString().padStart(2, '0');
  const seconds = (timeLeft % 60).toString().padStart(2, '0');

  const uiTransitionClass = showUI ? 'duration-300' : 'duration-[5000ms]';

  return (
    <div className="w-full h-full flex flex-col items-center z-10 px-6">
      <div className="flex-1 w-full" />

      <div 
        className={`relative flex items-center justify-center group flex-shrink-0 transition-transform duration-1000 w-[240px] h-[240px] md:w-[340px] md:h-[340px] ${showUI ? 'cursor-pointer' : 'cursor-none'} ${isInitialPrepare ? 'scale-105' : 'scale-100'}`} 
        onClick={handleCircleClick}
      >
        <div className="relative">
          <svg height={radius * 2} width={radius * 2} className="transform -rotate-90">
            <circle 
              stroke="currentColor" 
              fill="transparent" 
              strokeWidth={bgStroke} 
              r={pathRadius} 
              cx={radius} 
              cy={radius} 
              className={`transition-opacity ${status === 'preparing' ? 'duration-1000' : 'duration-1000'} ${
                (status === 'preparing' && isInitialPrepare) ? 'opacity-30' : (isFinishing ? 'opacity-15' : 'opacity-10')
              }`} 
            />
            
            <circle 
              stroke="currentColor" 
              fill="transparent" 
              strokeWidth={stroke} 
              strokeDasharray={`${circumference} ${circumference}`} 
              style={{ 
                strokeDashoffset: circumference - (progress * circumference), 
                transition: status === 'meditating' ? 'none' : 'stroke-dashoffset 0.5s ease' 
              }} 
              className={`transition-all duration-1000 ${!isFinishing ? 'text-neutral-400 opacity-100' : 'opacity-0'}`}
              strokeLinecap="round" 
              r={pathRadius} 
              cx={radius} 
              cy={radius} 
            />
            
            <circle 
              cx={radius + pathRadius} 
              cy={radius} 
              r={3} 
              fill={status === 'finishing' ? 'currentColor' : '#FFFFFF'} 
              style={{ 
                transform: `rotate(${progress * 360}deg)`, 
                transformOrigin: `${radius}px ${radius}px`, 
                display: (status === 'meditating') ? 'block' : 'none' 
              }} 
              className="transition-opacity duration-1000 opacity-100" 
            />
          </svg>

          <div 
            className={`absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-center fade-transition ${uiTransitionClass} ${showUI ? 'opacity-100' : 'opacity-0'}`}
          >
            {status === 'preparing' ? (
              <div className="flex flex-col items-center justify-center uppercase no-color-transition opacity-40">
                <span className="text-[12px] md:text-[14px] font-light tracking-[0.3em] pl-[0.3em] whitespace-nowrap">
                  {t.getReady}
                </span>
                <span className="text-[14px] md:text-[16px] font-light mt-2 leading-none tabular-nums tracking-[0.3em] pl-[0.3em]">
                  {timeLeft}
                </span>
              </div>
            ) : (
              <div className="tabular-nums font-thin text-[50px] md:text-[70px] leading-none flex items-baseline no-color-transition">
                <span className="no-color-transition">{minutes}</span>
                <span className="mx-[-0.05em] relative -top-[0.05em] no-color-transition">:</span>
                <span className="no-color-transition">{seconds}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="flex-1 w-full" />
    </div>
  );
};

export default ProgressCircle;
