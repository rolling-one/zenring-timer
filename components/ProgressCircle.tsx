
import React, { useState, useEffect } from 'react';
import { Language } from '../types';
import { translations } from '../translations';

interface Props { isUIVisible: boolean; timeLeft: number; startTime: number | null; duration: number; status: string; lang: Language; onCancel: () => void; }

const ProgressCircle: React.FC<Props> = ({ isUIVisible, timeLeft, startTime, duration, status, lang, onCancel }) => {
  const [progress, setProgress] = useState(0);
  const t = translations[lang];
  
  const radius = window.innerWidth < 768 ? 130 : 170;
  const stroke = 4;
  const bgStroke = 1;
  const normalizedRadius = radius - stroke / 2;
  const bgNormalizedRadius = radius - bgStroke / 2;
  const circumference = normalizedRadius * 2 * Math.PI;

  const isAlwaysVisible = status === 'finishing' || status === 'preparing';
  const showUI = isUIVisible || isAlwaysVisible;
  const isFinishing = status === 'finishing';

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

  const minutes = Math.floor(timeLeft / 60).toString().padStart(2, '0');
  const seconds = (timeLeft % 60).toString().padStart(2, '0');

  return (
    <div className="w-full h-full flex flex-col items-center justify-between py-16 md:py-24 z-10 px-6">
      <div className="h-[10px]" />

      {/* 修复：根据 UI 是否可见动态切换 cursor。当 showUI 为 false 时强制 cursor-none */}
      <div 
        className={`relative flex items-center justify-center group ${showUI ? 'cursor-pointer' : 'cursor-none'}`} 
        onClick={onCancel}
      >
        <div className="relative">
          <svg height={radius * 2} width={radius * 2} className="transform -rotate-90">
            {/* 背景圆环：保持恒定亮度，不受鼠标移动影响 */}
            <circle 
              stroke="currentColor" 
              fill="transparent" 
              strokeWidth={bgStroke} 
              r={bgNormalizedRadius} 
              cx={radius} 
              cy={radius} 
              className={`transition-opacity duration-1000 ${isFinishing ? 'opacity-10' : 'opacity-5'}`} 
            />
            
            {/* 进度圆环：在冥想期间保持恒定亮度 (opacity-40)，不随 isUIVisible 变化 */}
            <circle 
              stroke="currentColor" 
              fill="transparent" 
              strokeWidth={stroke} 
              strokeDasharray={`${circumference} ${circumference}`} 
              style={{ 
                strokeDashoffset: circumference - (progress * circumference), 
                transition: status === 'meditating' ? 'none' : 'stroke-dashoffset 0.5s ease' 
              }} 
              className={`transition-opacity duration-1000 ${!isFinishing ? 'opacity-40' : 'opacity-0'}`}
              strokeLinecap="round" 
              r={normalizedRadius} 
              cx={radius} 
              cy={radius} 
            />
            
            {/* 呼吸点：保持恒定亮度或随 UI 淡出 */}
            <circle 
              cx={radius + normalizedRadius} 
              cy={radius} 
              r={2.5} 
              fill={status === 'finishing' ? 'currentColor' : '#FFFFFF'} 
              style={{ 
                transform: `rotate(${progress * 360}deg)`, 
                transformOrigin: `${radius}px ${radius}px`, 
                display: (status === 'meditating') ? 'block' : 'none' 
              }} 
              className="transition-opacity duration-1000 opacity-100" 
            />
          </svg>

          {/* 时间数字：依然保持随鼠标移动淡入淡出 */}
          <div className={`absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-center transition-opacity duration-1000 ${showUI ? 'opacity-100' : 'opacity-0'}`}>
            <div className="tabular-nums font-thin text-6xl md:text-7xl tracking-tight flex items-baseline">
              <span>{minutes}</span>
              <span className="mx-[-0.12em] opacity-70 relative -top-[0.05em]">:</span>
              <span>{seconds}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="h-10 opacity-0 pointer-events-none" />
    </div>
  );
};

export default ProgressCircle;
