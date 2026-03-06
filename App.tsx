
// 导入必要的 React 钩子和外部库
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
// 导入自定义类型、翻译、常量和音频钩子
import { TimerStatus, SoundType, Language } from './types';
import { translations } from './translations';
import { PREPARE_TIME, BUFFER_TIME, UI_HIDE_TIMEOUT } from './constants';
import { useZenAudio } from './hooks/useZenAudio';
// 导入 UI 组件
import ProgressCircle from './components/ProgressCircle';
import Settings from './components/Settings';
import { Maximize, Minimize, CircleHelp } from 'lucide-react';

const App: React.FC = () => {
  // --- 状态管理 ---
  // 冥想时长（秒），从本地存储读取或默认为 900秒 (15分钟)
  const [duration, setDuration] = useState(() => Number(localStorage.getItem('zenring_duration')) || 900);
  // 当前语言设置
  const [lang, setLang] = useState<Language>(() => (localStorage.getItem('zenring_lang') as Language) || 'zh');
  // 背景音效类型
  const [soundType, setSoundType] = useState<SoundType>(() => (localStorage.getItem('zenring_soundType') as SoundType) || 'forest');
  // 计时器状态：idle (闲置), preparing (准备中), meditating (冥想中), finishing (结束中)
  const [status, setStatus] = useState<TimerStatus>('idle');
  // 倒计时剩余时间
  const [timeLeft, setTimeLeft] = useState(0);
  // 冥想开始的绝对时间戳
  const [startTime, setStartTime] = useState<number | null>(null);
  // UI 是否可见（冥想时会自动隐藏）
  const [isUIVisible, setIsUIVisible] = useState(true);
  // 是否显示帮助遮罩
  const [showHelp, setShowHelp] = useState(false);
  // 是否显示致谢遮罩
  const [showCredits, setShowCredits] = useState(false);
  // 是否加速背景色过渡（用于结束阶段）
  const [accelerateTransition, setAccelerateTransition] = useState(false);
  // 是否处于全屏模式
  const [isFullscreen, setIsFullscreen] = useState(false);
  // 记录是否通过拖拽圆环开始（用于区分交互方式）
  const [wasDragging, setWasDragging] = useState(false);
  
  // --- 引用 (Refs) ---
  // 计时器 Interval 的引用
  const timerRef = useRef<number | null>(null);
  // UI 自动隐藏的 Timeout 引用
  const uiHideTimeoutRef = useRef<number | null>(null);
  // 记录上一次鼠标位置，用于检测真实移动
  const lastMousePos = useRef({ x: 0, y: 0 });
  // 音频控制钩子
  const { prepareAudio, playAmbient, fadeOutAll, stopAll, playBowl } = useZenAudio();

  // 获取当前语言的翻译文本
  const t = translations[lang];

  // 监听全屏状态变化
  useEffect(() => {
    const handleFsChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFsChange);
    return () => document.removeEventListener('fullscreenchange', handleFsChange);
  }, []);

  // 切换全屏函数
  const toggleFullscreen = useCallback(async () => {
    if (!document.fullscreenElement) {
      await document.documentElement.requestFullscreen().catch(e => console.error(e));
    } else {
      if (document.exitFullscreen) {
        await document.exitFullscreen().catch(e => console.error(e));
      }
    }
  }, []);

  // 将用户偏好持久化到本地存储
  useEffect(() => {
    localStorage.setItem('zenring_duration', duration.toString());
    localStorage.setItem('zenring_lang', lang);
    localStorage.setItem('zenring_soundType', soundType);
  }, [duration, lang, soundType]);

  // 重置计时器到初始状态
  const resetTimer = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (uiHideTimeoutRef.current) clearTimeout(uiHideTimeoutRef.current);
    
    fadeOutAll(2000); // 2秒内淡出所有声音
    
    setStatus('idle');
    setStartTime(null);
    setIsUIVisible(true);
    setAccelerateTransition(false);
    setWasDragging(false);
  }, [fadeOutAll]);

  // 处理鼠标或触摸移动，用于唤醒 UI
  const handleMouseMove = useCallback((e: MouseEvent | TouchEvent) => {
    let clientX = 0, clientY = 0;
    if ('clientX' in e) {
      clientX = (e as MouseEvent).clientX;
      clientY = (e as MouseEvent).clientY;
    } else if ((e as TouchEvent).touches && (e as TouchEvent).touches[0]) {
      clientX = (e as TouchEvent).touches[0].clientX;
      clientY = (e as TouchEvent).touches[0].clientY;
    }

    // 只有移动超过 3 像素才认为是有效移动，防止传感器抖动唤醒 UI
    const hasMoved = Math.abs(clientX - lastMousePos.current.x) > 3 || Math.abs(clientY - lastMousePos.current.y) > 3;
    
    if (hasMoved) {
      lastMousePos.current = { x: clientX, y: clientY };
      if (status === 'meditating' || status === 'preparing') {
        setIsUIVisible(true);
        if (uiHideTimeoutRef.current) clearTimeout(uiHideTimeoutRef.current);
        if (!showHelp) {
          // 停止操作后，UI 保持可见一段时间（UI_HIDE_TIMEOUT），然后自动隐去
          uiHideTimeoutRef.current = window.setTimeout(() => setIsUIVisible(false), UI_HIDE_TIMEOUT);
        }
      }
      if (status === 'finishing') {
        // 结束阶段如果移动鼠标，加速背景色变白的过程
        setAccelerateTransition(true);
      }
    }
  }, [status, showHelp]);

  // 冥想开始时的 UI 自动隐藏逻辑
  useEffect(() => {
    if (status === 'meditating') {
      if (uiHideTimeoutRef.current) clearTimeout(uiHideTimeoutRef.current);
      uiHideTimeoutRef.current = window.setTimeout(() => {
        setIsUIVisible(false);
      }, 5000); // 5秒后自动隐藏 UI
    }
  }, [status]);

  // 绑定全局移动监听
  useEffect(() => {
    const evts = ['mousemove', 'touchstart'];
    const handler = (e: any) => handleMouseMove(e);
    evts.forEach(e => window.addEventListener(e, handler, { passive: true }));
    return () => evts.forEach(e => window.removeEventListener(e, handler));
  }, [handleMouseMove]);

  // 核心计时器逻辑
  useEffect(() => {
    if (status === 'idle') return;

    timerRef.current = window.setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          // 准备阶段结束 -> 开始冥想
          if (status === 'preparing') {
            playBowl(); // 敲响颂钵
            setStatus('meditating');
            setStartTime(Date.now());
            return duration;
          }
          // 冥想阶段结束 -> 进入收尾阶段
          if (status === 'meditating') {
            playBowl(); // 敲响颂钵
            setStatus('finishing');
            setAccelerateTransition(false);
            setIsUIVisible(true);
            if (uiHideTimeoutRef.current) clearTimeout(uiHideTimeoutRef.current);
            return BUFFER_TIME; // 收尾缓冲时间
          }
          // 收尾结束 -> 回到闲置状态
          resetTimer();
          return 0;
        }
        // 在收尾阶段最后 10 秒开始淡出环境音
        if (status === 'finishing' && prev === 10) fadeOutAll(10000);
        return prev - 1;
      });
    }, 1000);

    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [status, duration, playBowl, fadeOutAll, resetTimer]);

  // 开始冥想的处理函数
  const handleStart = useCallback(async (isDrag: boolean = false) => {
    await stopAll();
    prepareAudio(); // 预加载音频上下文
    setWasDragging(isDrag);
    setStatus('preparing');
    setTimeLeft(PREPARE_TIME);
    playAmbient(soundType); // 播放环境音
  }, [stopAll, prepareAudio, soundType, playAmbient]);

  // 状态派生变量
  const isMeditating = status === 'meditating';
  const isPreparing = status === 'preparing';
  const isFinishing = status === 'finishing';

  // 根据不同阶段计算背景色过渡时长
  let transitionDur = '2s';
  if (isMeditating) transitionDur = '5s'; // 进入冥想时背景变黑较慢
  if (isFinishing && !accelerateTransition) transitionDur = '60s'; // 结束时背景变白非常缓慢，营造宁静感

  const isAlwaysVisible = status === 'finishing' || status === 'preparing';
  const showUI = isUIVisible || isAlwaysVisible;
  // UI 隐去时的过渡时长（5秒）与显示时的时长（0.3秒）不同
  const uiTransitionClass = showUI ? 'duration-300' : 'duration-[5000ms]';
  const FullscreenIcon = isFullscreen ? Minimize : Maximize;

  return (
    <div 
      className="w-screen flex flex-col items-center justify-center overflow-hidden select-none stable-color-transition" 
      style={{
        // 始终占满可视区域，避免 iPad 全屏时顶部出现空白
        height: '100dvh',
        // 冥想时背景为黑，文字为白；闲置时相反
        backgroundColor: isMeditating ? '#000000' : '#FFFFFF',
        color: isMeditating ? '#FFFFFF' : '#000000',
        transitionDuration: transitionDur,
        // 冥想且 UI 隐藏时隐藏鼠标指针
        cursor: (isMeditating && !isUIVisible) ? 'none' : 'default'
      }}
    >
      {/* 顶部导航栏 */}
      <header className="fixed top-6 md:top-10 left-0 w-full px-8 md:px-12 flex justify-between items-center z-[130] pointer-events-none">
        {/* 左侧 Logo / 致谢入口 */}
        <button 
          className={`text-sm md:text-base font-normal tracking-[0.7em] md:tracking-[1em] uppercase fade-transition ${uiTransitionClass} flex items-center h-10 pointer-events-auto ${showUI ? 'opacity-70' : 'opacity-0'}`}
          onPointerEnter={(e) => e.pointerType === 'mouse' && setShowCredits(true)}
          onPointerLeave={(e) => e.pointerType === 'mouse' && setShowCredits(false)}
          onClick={() => {
            const isTouch = window.matchMedia('(pointer: coarse)').matches;
            if (isTouch) setShowCredits(prev => !prev);
          }}
        >
          <span className="translate-y-[1px]">ZenRing</span>
        </button>
        
        {/* 右侧控制按钮组 */}
        <div className={`flex items-center gap-1 md:gap-2 pointer-events-auto fade-transition ${uiTransitionClass} ${showUI ? 'opacity-100' : 'opacity-0'}`}>
          {/* 帮助按钮 */}
          <button 
            className="w-10 h-10 flex items-center justify-center opacity-40 hover:opacity-100 transition-opacity"
            onPointerEnter={(e) => e.pointerType === 'mouse' && setShowHelp(true)}
            onPointerLeave={(e) => e.pointerType === 'mouse' && setShowHelp(false)}
            onClick={() => {
              const isTouch = window.matchMedia('(pointer: coarse)').matches;
              if (isTouch) setShowHelp(prev => !prev);
            }}
          >
            <CircleHelp size={20} strokeWidth={1.2} />
          </button>

          {/* 语言切换按钮 */}
          <button 
            onClick={() => setLang(l => l === 'zh' ? 'en' : 'zh')}
            className="w-10 h-10 flex items-center justify-center opacity-40 hover:opacity-100 transition-opacity"
          >
            <div className="relative w-[20px] h-[20px] overflow-hidden">
              <AnimatePresence>
                <motion.span 
                  key={lang}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.5 }}
                  className={`absolute inset-0 flex items-center justify-center leading-none uppercase ${lang === 'zh' ? 'text-[17px] md:text-[16px] font-light md:font-normal' : 'text-[14px] md:text-[14px] font-light tracking-tighter'}`}
                >
                  {lang === 'zh' ? '中' : 'EN'}
                </motion.span>
              </AnimatePresence>
            </div>
          </button>

          {/* 全屏切换按钮 */}
          <button 
            onClick={toggleFullscreen}
            className="w-10 h-10 flex items-center justify-center opacity-40 hover:opacity-100 transition-opacity"
          >
            <FullscreenIcon size={20} strokeWidth={1.2} />
          </button>
        </div>
      </header>

      {/* 主内容区域 */}
      <main className="w-full h-full flex items-center justify-center px-6 relative">
        {/* 帮助信息遮罩层 */}
        <div 
          onClick={() => setShowHelp(false)}
          className="absolute inset-0 z-[120] flex items-center justify-center transition-opacity duration-700 backdrop-blur-2xl pointer-events-none"
          style={{ 
            backgroundColor: status === 'meditating' ? 'rgba(0,0,0,0.85)' : 'rgba(255,255,255,0.85)',
            opacity: showHelp ? 1 : 0,
            pointerEvents: showHelp ? 'auto' : 'none'
          }}
        >
          <div className="max-w-md md:max-w-none w-full h-full px-10 flex flex-col items-center text-center">
            <div className="grid grid-cols-1 grid-rows-1 w-full h-full place-items-center">
              <AnimatePresence>
                <motion.div 
                  key={lang}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 0.6 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.5 }}
                  className={`col-start-1 row-start-1 space-y-6 md:space-y-8 font-normal leading-[2.2] ${lang === 'zh' ? 'text-[14px] md:text-[16px] tracking-[0.3em] uppercase' : 'text-[12px] md:text-[14px] tracking-[0.4em] uppercase'}`}
                >
                  {/* 渲染操作指南步骤 */}
                  {[t.startInstr, t.adjustInstr, t.endInstr].map((instr, i) => {
                    const parts = instr.split(/[:：]/);
                    const separator = instr.includes('：') ? '：' : ':';
                    return (
                      <p key={i} className={`flex flex-wrap justify-center md:whitespace-nowrap ${lang === 'en' ? 'gap-x-[0.5em]' : ''}`}>
                        <span className="whitespace-nowrap">{parts[0]}{separator}</span>
                        <span className="whitespace-nowrap">{parts[1]?.trim()}</span>
                      </p>
                    );
                  })}
                </motion.div>
              </AnimatePresence>
            </div>
          </div>
        </div>

        {/* 致谢遮罩层 */}
        <div 
          onClick={() => setShowCredits(false)}
          className="absolute inset-0 z-[120] flex items-center justify-center transition-opacity duration-700 backdrop-blur-2xl pointer-events-none"
          style={{ 
            backgroundColor: status === 'meditating' ? 'rgba(0,0,0,0.85)' : 'rgba(255,255,255,0.85)',
            opacity: showCredits ? 1 : 0,
            pointerEvents: showCredits ? 'auto' : 'none'
          }}
        >
          <div className="max-w-md md:max-w-none w-full px-10 flex flex-col items-center text-center">
            <div className="opacity-60 font-normal text-[12px] md:text-[14px] tracking-[0.4em] uppercase">
              Made by Rolling with Gemini
            </div>
          </div>
        </div>

        {/* 核心交互组件：闲置时显示设置，运行中显示进度环 */}
        <div className="grid grid-cols-1 grid-rows-1 w-full h-full">
          <AnimatePresence mode="popLayout">
            <motion.div
              key={status === 'idle' ? 'idle' : 'active'}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.5 }}
              className="col-start-1 row-start-1 w-full h-full flex items-center justify-center"
            >
              {status === 'idle' ? (
                <Settings 
                  duration={duration} 
                  setDuration={setDuration} 
                  soundType={soundType} 
                  setSoundType={setSoundType} 
                  onStart={handleStart} 
                  lang={lang} 
                />
              ) : (
                <ProgressCircle 
                  isUIVisible={isUIVisible} 
                  timeLeft={timeLeft} 
                  startTime={startTime} 
                  duration={duration} 
                  status={status} 
                  lang={lang} 
                  onCancel={resetTimer} 
                  wasDragging={wasDragging}
                />
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </main>
    </div>
  );
};

export default App;

