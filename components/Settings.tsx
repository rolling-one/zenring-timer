
// 导入必要的 React 钩子和外部库
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
// 导入自定义类型、翻译和图标
import { SoundType, Language } from '../types';
import { translations } from '../translations';
import { TreePine, Waves, VolumeX, ArrowUp, ArrowDown } from 'lucide-react';

interface Props { 
  duration: number; // 当前设定的时长
  setDuration: (d: number) => void; // 设置时长的回调
  soundType: SoundType; // 当前选中的音效
  setSoundType: (s: SoundType) => void; // 设置音效的回调
  onStart: (isDrag?: boolean) => void; // 开始冥想的回调
  lang: Language; // 当前语言
}

const Settings: React.FC<Props> = ({ duration, setDuration, soundType, setSoundType, onStart, lang }) => {
  // --- 状态管理 ---
  // 是否正在按住圆环
  const [isHolding, setIsHolding] = useState(false);
  // 是否正在拖拽调整时间
  const [isDragging, setIsDragging] = useState(false);
  // 记录上一次触摸/鼠标的 Y 坐标，用于计算偏移量
  const lastY = useRef(0);
  // 圆环半径，根据屏幕短边动态调整，确保旋转屏幕时大小保持一致
  const getStableRadius = () => {
    const shortSide = Math.min(window.innerWidth, window.innerHeight);
    return shortSide < 700 ? 120 : 170;
  };

  const [radius, setRadius] = useState(getStableRadius);
  // 累积的垂直移动距离，用于控制时间步进
  const accumulatedDelta = useRef(0);
  // 记录是否发生了移动，用于区分“点击”和“拖拽后释放”
  const moved = useRef(false);
  // 获取翻译文本
  const t = translations[lang];

  // 响应式调整圆环大小
  useEffect(() => {
    const handleResize = () => {
      setRadius(getStableRadius());
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // 样式常量
  const stroke = 6; // 进度条粗细
  const bgStroke = 2; // 背景圆环粗细
  const pathRadius = radius - stroke / 2; // 圆环路径半径

  // 处理交互结束（松开鼠标或手指）
  const handleEnd = useCallback((e: React.PointerEvent | PointerEvent) => {
    if (isHolding) {
      const wasDrag = moved.current;
      setIsHolding(false);
      setIsDragging(false);
      // 触发开始冥想，并告知是否是拖拽后释放
      onStart(wasDrag);
      if (e.cancelable) e.preventDefault();
    }
  }, [isHolding, onStart]);

  // 处理拖拽移动逻辑
  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      if (!isHolding) return;
      const currentY = e.clientY;
      const dy = lastY.current - currentY; // 向上滑动为正值
      lastY.current = currentY;

      // 只有移动超过 1 像素才标记为正在拖拽
      if (Math.abs(dy) > 1) {
        moved.current = true;
        setIsDragging(true);
      }

      accumulatedDelta.current += dy;

      // 每垂直移动 10 像素，调整 5 分钟 (300秒)
      if (Math.abs(accumulatedDelta.current) >= 10) {
        const steps = Math.trunc(accumulatedDelta.current / 10);
        const amount = steps * 300;
        
        setDuration(prev => {
          const next = prev + amount;
          // 限制时间范围在 5 分钟到 120 分钟之间
          const capped = Math.max(300, Math.min(7200, next));
          
          // 如果触碰或超过边界，重置累积值，确保反向滑动时能立即响应
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

    // 当按住时，监听全局移动和结束事件，确保即使移出圆环范围也能继续交互
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

  // 处理按下事件
  const handlePointerDown = (e: React.PointerEvent) => {
    setIsHolding(true);
    setIsDragging(false);
    moved.current = false;
    lastY.current = e.clientY;
    accumulatedDelta.current = 0;
    // 捕获指针，防止移动时触发其他元素的事件
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };

  return (
    <div className="relative w-full h-full flex flex-col items-center z-10 px-6">
      {/* 顶部占位，将圆环推向中心 */}
      <div className="flex-1 w-full" /> 

      {/* 核心交互圆环区域 */}
      <div 
        className="relative group cursor-ns-resize flex items-center justify-center touch-none select-none flex-shrink-0" 
        style={{ width: radius * 2, height: radius * 2 }}
        onPointerDown={handlePointerDown}
        onPointerUp={handleEnd}
      >
        {/* 背景圆环 SVG */}
        <div className={`absolute inset-0 transition-all duration-500 flex items-center justify-center ${isDragging ? 'scale-105' : 'scale-100'}`}>
          <svg height={radius * 2} width={radius * 2} className="transform -rotate-90">
            <circle 
              stroke="currentColor" 
              fill="transparent" 
              strokeWidth={bgStroke} 
              r={pathRadius} 
              cx={radius} 
              cy={radius} 
              className={`transition-opacity duration-1000 ${isDragging ? 'opacity-30' : 'opacity-10'}`} 
            />
          </svg>
        </div>
        
        {/* 拖拽提示箭头 */}
        <ArrowUp className={`absolute -left-12 md:-left-16 transition-all duration-500 ${isHolding ? 'opacity-40 -translate-y-2' : 'opacity-0'}`} size={18} strokeWidth={1} />
        <ArrowDown className={`absolute -right-12 md:-right-16 transition-all duration-500 ${isHolding ? 'opacity-40 translate-y-2' : 'opacity-0'}`} size={18} strokeWidth={1} />

        {/* 时间显示区域 */}
        <div className={`relative z-10 flex flex-col items-center justify-center gap-1 md:gap-2 transition-transform duration-500 ${isDragging ? 'scale-105' : ''}`}>
          {/* 分钟数 */}
          <span className="text-[72px] md:text-[96px] font-thin tabular-nums leading-none tracking-normal">
            {Math.floor(duration / 60)}
          </span>
          {/* 单位标签 */}
          <div className="relative h-[11px] md:h-[14px] grid grid-cols-1 grid-rows-1 place-items-center">
            <AnimatePresence>
              <motion.span 
                key={lang}
                initial={{ opacity: 0 }}
                animate={{ opacity: isHolding ? 0.2 : 0.6 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.5 }}
                className="col-start-1 row-start-1 text-[12px] md:text-[14px] uppercase tracking-[0.7em] pl-[0.7em] font-normal leading-none"
              >
                {t.min}
              </motion.span>
            </AnimatePresence>
          </div>
        </div>
      </div>

      {/* 底部音效选择区域 */}
      <div className="flex-1 w-full flex flex-col items-center justify-center">
        <div 
          className={`flex items-center justify-center transition-[gap,opacity] duration-700 ease-in-out ${!isHolding ? 'opacity-100' : 'opacity-0 pointer-events-none'} ${lang === 'en' ? 'gap-10 md:gap-20' : 'gap-8 md:gap-16'}`}
        >
          {[ 
            {id:'forest', icon:TreePine, label:t.forest}, 
            {id:'none', icon:VolumeX, label:t.none},
            {id:'stream', icon:Waves, label:t.stream} 
          ].map(s => (
            <button 
              key={s.id} 
              onClick={(e) => { e.stopPropagation(); setSoundType(s.id as SoundType); }} 
              className={`flex flex-col items-center space-y-4 transition-[opacity,transform] duration-700 ease-in-out ${soundType === s.id ? 'opacity-90 scale-110' : 'opacity-30 hover:opacity-60'}`}
            >
              <s.icon size={24} strokeWidth={1} />
              {/* 音效标签，带固定宽度以防止语言切换时抖动 */}
              <div className="relative h-[11px] md:h-[12px] w-16 md:w-24 grid grid-cols-1 grid-rows-1 place-items-center">
                <AnimatePresence>
                  <motion.span 
                    key={lang + s.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.6 }}
                    className={`col-start-1 row-start-1 whitespace-nowrap text-[12px] md:text-[12px] uppercase font-normal ${lang === 'en' ? 'tracking-[0.3em] pl-[0.3em]' : 'tracking-[0.5em] pl-[0.5em]'}`}
                  >
                    {s.label}
                  </motion.span>
                </AnimatePresence>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

export default Settings;

