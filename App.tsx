
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { TimerStatus, SoundType, Language } from './types';
import { translations } from './translations';
import { PREPARE_TIME, BUFFER_TIME, UI_HIDE_TIMEOUT } from './constants';
import { useZenAudio } from './hooks/useZenAudio';
import ProgressCircle from './components/ProgressCircle';
import Settings from './components/Settings';

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
  
  const timerRef = useRef<number | null>(null);
  const uiHideTimeoutRef = useRef<number | null>(null);
  const { playAmbient, fadeOutAmbient, fadeOutAll, playBowl } = useZenAudio();

  const t = translations[lang];

  useEffect(() => {
    localStorage.setItem('zenring_duration', duration.toString());
    localStorage.setItem('zenring_lang', lang);
    localStorage.setItem('zenring_soundType', soundType);
  }, [duration, lang, soundType]);

  const resetTimer = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (uiHideTimeoutRef.current) clearTimeout(uiHideTimeoutRef.current);
    
    // 无论是因为点击结束还是自然结束，都执行 2 秒音频淡出
    fadeOutAll(2000);
    
    setStatus('idle');
    setStartTime(null);
    setIsUIVisible(true);
    setAccelerateTransition(false);
  }, [fadeOutAll]);

  const handleMouseMove = useCallback(() => {
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
  }, [status, showHelp]);

  // 监听状态变为 meditating 时，强制启动 3 秒隐藏计时器
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
    evts.forEach(e => window.addEventListener(e, handleMouseMove));
    return () => evts.forEach(e => window.removeEventListener(e, handleMouseMove));
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
        if (status === 'finishing' && prev === 10) fadeOutAmbient(10000);
        return prev - 1;
      });
    }, 1000);

    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [status, duration, playBowl, fadeOutAmbient, resetTimer]);

  const getContainerStyle = (): React.CSSProperties => {
    const s: Record<string, any> = { 
      transition: 'background-color 2s, color 2s', 
      backgroundColor: '#FFFFFF', 
      color: '#000000',
      cursor: 'default'
    };

    if (status === 'meditating') {
      s.backgroundColor = '#000000'; 
      s.color = '#FFFFFF'; 
      s.transitionDuration = '5s';
      // 当处于冥想状态且 UI 已经自动隐藏时，同时隐藏鼠标
      if (!isUIVisible) {
        s.cursor = 'none';
      }
    } else if (status === 'finishing') {
      s.backgroundColor = '#FFFFFF';
      s.color = '#000000';
      s.transitionDuration = accelerateTransition ? '2s' : '60s'; 
    }
    return s;
  };

  const bgColorClass = status === 'meditating' ? 'bg-black' : 'bg-white';

  return (
    <div className={`h-screen w-screen flex flex-col items-center justify-center overflow-hidden select-none zen-transition ${bgColorClass}`} style={getContainerStyle()}>
      <header className="fixed top-8 md:top-12 left-0 w-full px-8 md:px-12 flex justify-between items-center z-[110] pointer-events-none">
        <h1 className={`text-[10px] md:text-xs font-extralight tracking-[0.6em] md:tracking-[0.8em] uppercase transition-opacity duration-1000 ${(isUIVisible || status === 'finishing') ? 'opacity-70' : 'opacity-0'}`}>ZenRing</h1>
        
        <div className={`flex items-center space-x-8 pointer-events-auto transition-opacity duration-1000 ${(isUIVisible || status === 'finishing') ? 'opacity-100' : 'opacity-0'}`}>
          <button 
            onClick={() => setLang(l => l === 'zh' ? 'en' : 'zh')}
            className="text-[10px] md:text-xs tracking-[0.2em] uppercase opacity-40 hover:opacity-100 transition-opacity font-light tabular-nums"
          >
            {lang === 'zh' ? '中' : 'EN'}
          </button>

          <div 
            className="cursor-help opacity-40 hover:opacity-100 transition-opacity flex items-center justify-center"
            onMouseEnter={() => setShowHelp(true)}
            onMouseLeave={() => setShowHelp(false)}
          >
            <span className="text-sm md:text-base font-light tabular-nums">?</span>
          </div>
        </div>
      </header>

      <main className="w-full h-full flex items-center justify-center px-6 relative">
        <div className={`absolute inset-0 z-50 flex items-center justify-center transition-all duration-700 backdrop-blur-xl ${bgColorClass} ${showHelp ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}>
          <div className="max-w-md w-full px-12 flex flex-col items-center text-center">
            <div className="space-y-12 font-light text-[13px] md:text-[15px] tracking-[0.08em] leading-relaxed opacity-70">
              <p>{t.adjustInstr}</p>
              <p>{t.startInstr}</p>
              <p>{t.endInstr}</p>
              <p>{t.soundInstr}</p>
            </div>
            
            <div className="mt-20 opacity-30 font-extralight text-[9px] md:text-[10px] tracking-[0.3em] uppercase transition-opacity duration-1000">
              Made by Rolling with Gemini
            </div>
          </div>
        </div>

        {status === 'idle' ? (
          <Settings duration={duration} setDuration={setDuration} soundType={soundType} setSoundType={setSoundType} onStart={() => { setStatus('preparing'); setTimeLeft(PREPARE_TIME); playAmbient(soundType); }} lang={lang} />
        ) : (
          <ProgressCircle isUIVisible={isUIVisible} timeLeft={timeLeft} startTime={startTime} duration={duration} status={status} lang={lang} onCancel={resetTimer} />
        )}
      </main>
    </div>
  );
};

export default App;
