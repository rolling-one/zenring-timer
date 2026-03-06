
// 导入必要的 React 钩子和动画库
import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
// 导入自定义类型和翻译
import { Language } from '../types';
import { translations } from '../translations';

interface Props { 
  isUIVisible: boolean; // UI 是否可见
  timeLeft: number; // 剩余时间（秒）
  startTime: number | null; // 开始时间戳
  duration: number; // 总时长
  status: string; // 当前状态 (preparing, meditating, finishing)
  lang: Language; // 当前语言
  onCancel: () => void; // 取消/重置的回调
  wasDragging?: boolean; // 是否是通过拖拽开始的
}

const ProgressCircle: React.FC<Props> = ({ isUIVisible, timeLeft, startTime, duration, status, lang, onCancel, wasDragging }) => {
  // --- 状态管理 ---
  // 圆环半径，根据屏幕宽度动态调整
  const [radius, setRadius] = useState(window.innerWidth < 700 ? 120 : 170);
  // 进度百分比 (0 到 1)
  const [progress, setProgress] = useState(0);
  // 是否处于初始准备状态的缩放动画
  const [isInitialPrepare, setIsInitialPrepare] = useState(status === 'preparing' && wasDragging);
  // 获取翻译文本
  const t = translations[lang];
  
  // 记录组件挂载时间，防止误触取消
  const mountTime = useRef(Date.now());
  // 记录 UI 唤醒时间
  const lastWakeTime = useRef(0);
  // 记录上一次 UI 可见性状态
  const prevUIVisible = useRef(isUIVisible);
  
  // 响应式调整圆环大小
  useEffect(() => {
    const handleResize = () => {
      setRadius(window.innerWidth < 700 ? 120 : 170);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // 圆环绘制常量
  const stroke = 6; // 进度条粗细
  const bgStroke = 2; // 背景圆环粗细
  const pathRadius = radius - stroke / 2; // 圆环路径半径
  const circumference = pathRadius * 2 * Math.PI; // 圆环周长

  // 派生变量
  const isAlwaysVisible = status === 'finishing' || status === 'preparing';
  const showUI = isUIVisible || isAlwaysVisible;
  const isFinishing = status === 'finishing';

  // 准备阶段的初始动画处理
  useEffect(() => {
    if (status === 'preparing') {
      const timer = setTimeout(() => setIsInitialPrepare(false), 50);
      return () => clearTimeout(timer);
    }
  }, [status]);

  // 记录 UI 唤醒时间，用于触摸屏防误触逻辑
  useEffect(() => {
    if (!prevUIVisible.current && isUIVisible) {
      lastWakeTime.current = Date.now();
    }
    prevUIVisible.current = isUIVisible;
  }, [isUIVisible]);

  // 核心进度更新逻辑：使用 requestAnimationFrame 确保动画极致平滑
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
    // 结束阶段进度填满，准备阶段进度清空
    if (status === 'finishing') {
      setProgress(1);
    } else if (status === 'preparing') {
      setProgress(0);
    }
  }, [status, startTime, duration]);

  // 处理圆环点击事件（用于取消/重置）
  const handleCircleClick = (e: React.MouseEvent) => {
    // 挂载 500ms 内禁止点击，防止误操作
    if (Date.now() - mountTime.current < 500) return;
    
    const isTouchDevice = window.matchMedia('(pointer: coarse)').matches;
    // 触摸屏特殊逻辑：如果 UI 刚唤醒，禁止立即点击取消，防止唤醒 UI 时误触取消
    if (status === 'meditating' && isTouchDevice) {
      const timeSinceWake = Date.now() - lastWakeTime.current;
      if (!isUIVisible || timeSinceWake < 500) return;
    }
    onCancel();
  };

  // 格式化时间显示
  const minutes = Math.floor(timeLeft / 60).toString().padStart(2, '0');
  const seconds = (timeLeft % 60).toString().padStart(2, '0');

  // UI 渐隐渐显的过渡时长
  const uiTransitionClass = showUI ? 'duration-300' : 'duration-[5000ms]';

  return (
    <div className="w-full h-full flex flex-col items-center z-10 px-6">
      <div className="flex-1 w-full" />

      {/* 进度圆环容器 */}
      <div 
        className={`relative flex items-center justify-center group flex-shrink-0 transition-transform duration-1000 ease-out w-[240px] h-[240px] md:w-[340px] md:h-[340px] ${showUI ? 'cursor-pointer' : 'cursor-none'} ${isInitialPrepare ? 'scale-105' : 'scale-100'}`} 
        onClick={handleCircleClick}
      >
        <div className="relative">
          <svg height={radius * 2} width={radius * 2} className="transform -rotate-90">
            {/* 背景底色圆环 */}
            <circle 
              stroke="currentColor" 
              fill="transparent" 
              strokeWidth={bgStroke} 
              r={pathRadius} 
              cx={radius} 
              cy={radius} 
              className={`transition-opacity ${uiTransitionClass} ${
                (status === 'preparing' && isInitialPrepare) ? 'opacity-30' : (isFinishing ? 'opacity-15' : 'opacity-10')
              }`} 
            />
            
            {/* 动态进度圆环 */}
            <circle 
              stroke="currentColor" 
              fill="transparent" 
              strokeWidth={stroke} 
              strokeDasharray={`${circumference} ${circumference}`} 
              style={{ 
                strokeDashoffset: circumference - (progress * circumference), 
                // 冥想中不使用 CSS 过渡，因为进度是由 requestAnimationFrame 逐帧更新的
                transition: status === 'meditating' ? 'none' : 'stroke-dashoffset 0.5s ease' 
              }} 
              className={`transition-opacity ${uiTransitionClass} ${!isFinishing ? 'text-neutral-400 opacity-100' : 'opacity-0'}`}
              strokeLinecap="round" 
              r={pathRadius} 
              cx={radius} 
              cy={radius} 
            />
            
            {/* 进度条末端的小圆点（仅在冥想中显示） */}
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
              className={`transition-opacity ${uiTransitionClass} opacity-100`} 
            />
          </svg>

          {/* 中心文字显示区域 */}
          <div 
            className={`absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-center fade-transition ${uiTransitionClass} ${showUI ? 'opacity-100' : 'opacity-0'}`}
          >
            <AnimatePresence mode="popLayout">
              {status === 'preparing' ? (
                // 准备阶段：显示“准备中”和 10 秒倒计时
                <motion.div 
                  key="preparing"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 0.6 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.5 }}
                  className="flex flex-col items-center justify-center uppercase no-color-transition"
                >
                  <div className="relative h-[11px] md:h-[15px] flex items-center justify-center">
                    <AnimatePresence>
                      <motion.span 
                        key={lang}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.5 }}
                        className="absolute text-[12px] md:text-[15px] font-normal tracking-[0.5em] pl-[0.5em] whitespace-nowrap no-color-transition"
                      >
                        {t.getReady}
                      </motion.span>
                    </AnimatePresence>
                  </div>
                  <span className="text-[24px] md:text-[32px] font-extralight mt-3 leading-none tabular-nums no-color-transition">
                    {timeLeft}
                  </span>
                </motion.div>
              ) : (
                // 冥想阶段：显示分:秒倒计时
                <motion.div 
                  key="meditating"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.5 }}
                  className="tabular-nums font-thin text-[50px] md:text-[70px] leading-none flex items-baseline no-color-transition"
                >
                  <span className="no-color-transition">{minutes}</span>
                  <span className="mx-[-0.05em] relative -top-[0.05em] no-color-transition">:</span>
                  <span className="no-color-transition">{seconds}</span>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>

      <div className="flex-1 w-full" />
    </div>
  );
};

export default ProgressCircle;
