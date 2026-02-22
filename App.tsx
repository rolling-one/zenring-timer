
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { TimerStatus, SoundType, Language } from './types';
import { translations } from './translations';
import { PREPARE_TIME, BUFFER_TIME, UI_HIDE_TIMEOUT } from './constants';
import { useZenAudio } from './hooks/useZenAudio';
import ProgressCircle from './components/ProgressCircle';
import Settings from './components/Settings';
import { Maximize, Minimize, CircleHelp } from 'lucide-react';

const App: React.FC = () => {
  const [duration, setDuration] = useState(() => Number(localStorage.getItem('zenring_duration')) || 900);
  const [lang, setLang] = useState<Language>(() => (localStorage.getItem('zenring_lang') as Language) || 'zh');
  const [soundType, setSoundType] = useState<SoundType>(() => (localStorage.getItem('zenring_soundType') as SoundType) || 'forest');
  const [status, setStatus] = useState<TimerStatus>('idle');
  const [timeLeft, setTimeLeft] = useState(0);
  const [startTime, setStartTime] = useState<number | null>(null);
  const [isUIVisible, setIsUIVisible] = useState(true);
  const [showHelp, setShowHelp] = useState(false);
  const [accelerateTransition, setAccelerateTransition] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [wasDragging, setWasDragging] = useState(false);
  
  const timerRef = useRef<number | null>(null);
  const uiHideTimeoutRef = useRef<number | null>(null);
  const lastMousePos = useRef({ x: 0, y: 0 });
  const { prepareAudio, playAmbient, fadeOutAll, stopAll, playBowl } = useZenAudio();

  const t = translations[lang];

  useEffect(() => {
    const handleFsChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFsChange);
    return () => document.removeEventListener('fullscreenchange', handleFsChange);
  }, []);

  const toggleFullscreen = useCallback(async () => {
    if (!document.fullscreenElement) {
      await document.documentElement.requestFullscreen().catch(e => console.error(e));
    } else {
      if (document.exitFullscreen) {
        await document.exitFullscreen().catch(e => console.error(e));
      }
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('zenring_duration', duration.toString());
    localStorage.setItem('zenring_lang', lang);
    localStorage.setItem('zenring_soundType', soundType);
  }, [duration, lang, soundType]);

  const resetTimer = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (uiHideTimeoutRef.current) clearTimeout(uiHideTimeoutRef.current);
    
    fadeOutAll(2000);
    
    setStatus('idle');
    setStartTime(null);
    setIsUIVisible(true);
    setAccelerateTransition(false);
    setWasDragging(false);
  }, [fadeOutAll]);

  const handleMouseMove = useCallback((e: MouseEvent | TouchEvent) => {
    let clientX = 0, clientY = 0;
    if ('clientX' in e) {
      clientX = (e as MouseEvent).clientX;
      clientY = (e as MouseEvent).clientY;
    } else if ((e as TouchEvent).touches && (e as TouchEvent).touches[0]) {
      clientX = (e as TouchEvent).touches[0].clientX;
      clientY = (e as TouchEvent).touches[0].clientY;
    }

    const hasMoved = Math.abs(clientX - lastMousePos.current.x) > 3 || Math.abs(clientY - lastMousePos.current.y) > 3;
    
    if (hasMoved) {
      lastMousePos.current = { x: clientX, y: clientY };
      if (status === 'meditating' || status === 'preparing') {
        setIsUIVisible(true);
        if (uiHideTimeoutRef.current) clearTimeout(uiHideTimeoutRef.current);
        if (!showHelp) {
          uiHideTimeoutRef.current = window.setTimeout(() => setIsUIVisible(false), UI_HIDE_TIMEOUT);
        }
      }
      if (status === 'finishing') {
        setAccelerateTransition(true);
      }
    }
  }, [status, showHelp]);

  useEffect(() => {
    if (status === 'meditating') {
      setIsUIVisible(true); 
      if (uiHideTimeoutRef.current) clearTimeout(uiHideTimeoutRef.current);
      uiHideTimeoutRef.current = window.setTimeout(() => {
        setIsUIVisible(false);
      }, UI_HIDE_TIMEOUT);
    }
  }, [status]);

  useEffect(() => {
    const evts = ['mousemove', 'touchstart'];
    const handler = (e: any) => handleMouseMove(e);
    evts.forEach(e => window.addEventListener(e, handler, { passive: true }));
    return () => evts.forEach(e => window.removeEventListener(e, handler));
  }, [handleMouseMove]);

  useEffect(() => {
    if (status === 'idle') return;

    timerRef.current = window.setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          if (status === 'preparing') {
            playBowl();
            setStatus('meditating');
            setStartTime(Date.now());
            return duration;
          }
          if (status === 'meditating') {
            playBowl();
            setStatus('finishing');
            setAccelerateTransition(false);
            setIsUIVisible(true);
            if (uiHideTimeoutRef.current) clearTimeout(uiHideTimeoutRef.current);
            return BUFFER_TIME;
          }
          resetTimer();
          return 0;
        }
        if (status === 'finishing' && prev === 10) fadeOutAll(10000);
        return prev - 1;
      });
    }, 1000);

    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [status, duration, playBowl, fadeOutAll, resetTimer]);

  const handleStart = useCallback(async (isDrag: boolean = false) => {
    await stopAll();
    prepareAudio();
    setWasDragging(isDrag);
    setStatus('preparing');
    setTimeLeft(PREPARE_TIME);
    playAmbient(soundType);
  }, [stopAll, prepareAudio, soundType, playAmbient]);

  const isMeditating = status === 'meditating';
  const isFinishing = status === 'finishing';

  let transitionDur = '2s';
  if (isMeditating) transitionDur = '5s';
  if (isFinishing && !accelerateTransition) transitionDur = '60s';

  const uiTransitionClass = isUIVisible || isFinishing ? 'duration-300' : 'duration-[5000ms]';
  const FullscreenIcon = isFullscreen ? Minimize : Maximize;

  return (
    <div 
      className="h-screen w-screen flex flex-col items-center justify-center overflow-hidden select-none stable-color-transition" 
      style={{
        backgroundColor: isMeditating ? '#000000' : '#FFFFFF',
        color: isMeditating ? '#FFFFFF' : '#000000',
        transitionDuration: transitionDur,
        cursor: (isMeditating && !isUIVisible) ? 'none' : 'default'
      }}
    >
      <header className="fixed top-6 md:top-10 left-0 w-full px-8 md:px-12 flex justify-between items-center z-[130] pointer-events-none">
        <h1 className={`text-sm md:text-base font-normal tracking-[0.7em] md:tracking-[1em] uppercase transition-opacity ${uiTransitionClass} flex items-center h-10 ${(isUIVisible || status === 'finishing') ? 'opacity-70' : 'opacity-0'}`}>
          <span className="translate-y-[1px]">ZenRing</span>
        </h1>
        
        <div className={`flex items-center gap-1 md:gap-2 pointer-events-auto transition-opacity ${uiTransitionClass} ${(isUIVisible || status === 'finishing') ? 'opacity-100' : 'opacity-0'}`}>
          <button 
            className="w-10 h-10 flex items-center justify-center opacity-40 hover:opacity-100 transition-opacity"
            onMouseEnter={() => setShowHelp(true)}
            onMouseLeave={() => setShowHelp(false)}
          >
            <CircleHelp size={20} strokeWidth={1.2} />
          </button>

          <button 
            onClick={() => setLang(l => l === 'zh' ? 'en' : 'zh')}
            className="w-10 h-10 flex items-center justify-center opacity-40 hover:opacity-100 transition-opacity"
          >
            {/* 这里的 div 保持 20x20px 以确保与旁边的图标占用相同的视觉空间 */}
            <div className="flex items-center justify-center w-[20px] h-[20px]">
              <span className={`leading-none uppercase ${lang === 'zh' ? 'text-[13px] md:text-[14px] font-normal' : 'text-[11px] md:text-[12px] font-light tracking-tighter'}`}>
                {lang === 'zh' ? '中' : 'EN'}
              </span>
            </div>
          </button>

          <button 
            onClick={toggleFullscreen}
            className="w-10 h-10 flex items-center justify-center opacity-40 hover:opacity-100 transition-opacity"
          >
            <FullscreenIcon size={20} strokeWidth={1.2} />
          </button>
        </div>
      </header>

      <main className="w-full h-full flex items-center justify-center px-6 relative">
        <div 
          className="absolute inset-0 z-[120] flex items-center justify-center transition-opacity duration-700 backdrop-blur-2xl pointer-events-none"
          style={{ 
            backgroundColor: status === 'meditating' ? 'rgba(0,0,0,0.85)' : 'rgba(255,255,255,0.85)',
            opacity: showHelp ? 1 : 0,
            pointerEvents: showHelp ? 'auto' : 'none'
          }}
        >
          <div className="max-w-md md:max-w-none w-full px-10 flex flex-col items-center text-center">
            <div className={`space-y-6 md:space-y-8 font-light text-[13px] md:text-[14px] leading-[2.2] opacity-80 ${lang === 'en' ? 'font-quicksand tracking-[0.1em]' : 'tracking-[0.3em] uppercase'}`}>
              {[t.adjustInstr, t.startInstr, t.endInstr, t.soundInstr].map((instr, i) => {
                const parts = instr.split(/[:：]/);
                const separator = instr.includes('：') ? '：' : ':';
                return (
                  <p key={i} className={`flex flex-wrap justify-center md:whitespace-nowrap ${lang === 'en' ? 'gap-x-[0.5em]' : ''}`}>
                    <span className="whitespace-nowrap">{parts[0]}{separator}</span>
                    <span className="whitespace-nowrap">{parts[1]?.trim()}</span>
                  </p>
                );
              })}
            </div>
            <div className="mt-16 md:mt-20 opacity-40 font-light text-[11px] md:text-[12px] tracking-[0.4em] uppercase">
              Made by Rolling with Gemini
            </div>
          </div>
        </div>

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
      </main>
    </div>
  );
};

export default App;
