import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
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
  const [showCredits, setShowCredits] = useState(false);
  const [accelerateTransition, setAccelerateTransition] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [wasDragging, setWasDragging] = useState(false);
  const wakeLockRef = useRef<any>(null);
  const lastActiveStatus = useRef<TimerStatus | null>(null);

  const getStableRadius = () => {
    const shortSide = Math.min(window.innerWidth, window.innerHeight);
    return shortSide < 600 ? 120 : 170;
  };
  const [radius, setRadius] = useState(getStableRadius);
  const isLarge = radius > 150;

  const timerRef = useRef<number | null>(null);
  const uiHideTimeoutRef = useRef<number | null>(null);
  const lastMousePos = useRef({ x: 0, y: 0 });
  const { prepareAudio, playAmbient, fadeOutAll, stopAll, playBowl } = useZenAudio();

  const t = translations[lang];

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
    lastActiveStatus.current = null;
    setStartTime(null);
    setIsUIVisible(true);
    setAccelerateTransition(false);
    setWasDragging(false);
  }, [fadeOutAll]);

  const requestWakeLock = useCallback(async () => {
    if ('wakeLock' in navigator) {
      try {
        wakeLockRef.current = await (navigator as any).wakeLock.request('screen');
      } catch (err: any) {}
    }
  }, []);

  const releaseWakeLock = useCallback(async () => {
    if (wakeLockRef.current) {
      try {
        await wakeLockRef.current.release();
        wakeLockRef.current = null;
      } catch (err: any) {}
    }
  }, []);

  useEffect(() => {
    const handleFsChange = () => setIsFullscreen(!!document.fullscreenElement);
    const handleResize = () => setRadius(getStableRadius());
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        if (status === 'meditating' || status === 'preparing') {
          lastActiveStatus.current = status;
          setStatus('paused');
          stopAll();
        }
        releaseWakeLock();
      } else {
        if (status === 'paused' && lastActiveStatus.current) {
          const prevStatus = lastActiveStatus.current;
          lastActiveStatus.current = null;
          setStatus(prevStatus);
          playAmbient(soundType);
        }
        if (status === 'meditating' || status === 'preparing') requestWakeLock();
      }
    };

    document.addEventListener('fullscreenchange', handleFsChange);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('resize', handleResize);
    return () => {
      document.removeEventListener('fullscreenchange', handleFsChange);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('resize', handleResize);
      releaseWakeLock();
    };
  }, [status, resetTimer, requestWakeLock, releaseWakeLock, stopAll, playAmbient, soundType]);

  useEffect(() => {
    if (status === 'meditating' || status === 'preparing') requestWakeLock();
    else releaseWakeLock();
  }, [status, requestWakeLock, releaseWakeLock]);

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
        if (!showHelp) uiHideTimeoutRef.current = window.setTimeout(() => setIsUIVisible(false), UI_HIDE_TIMEOUT);
      }
      if (status === 'finishing') setAccelerateTransition(true);
    }
  }, [status, showHelp]);

  useEffect(() => {
    if (status === 'meditating') {
      if (uiHideTimeoutRef.current) clearTimeout(uiHideTimeoutRef.current);
      uiHideTimeoutRef.current = window.setTimeout(() => setIsUIVisible(false), 5000);
    }
  }, [status]);

  useEffect(() => {
    const evts = ['mousemove', 'touchstart'];
    const handler = (e: any) => handleMouseMove(e);
    evts.forEach(e => window.addEventListener(e, handler, { passive: true }));
    return () => evts.forEach(e => window.removeEventListener(e, handler));
  }, [handleMouseMove]);

  useEffect(() => {
    if (status === 'idle' || status === 'paused') return;
    const targetTime = Date.now() + timeLeft * 1000;
    timerRef.current = window.setInterval(() => {
      const now = Date.now();
      const remaining = Math.max(0, Math.round((targetTime - now) / 1000));
      setTimeLeft(remaining);
      if (remaining <= 0) {
        if (status === 'preparing') {
          playBowl();
          setStatus('meditating');
          setStartTime(Date.now());
          setTimeLeft(duration);
          return;
        }
        if (status === 'meditating') {
          playBowl();
          setStatus('finishing');
          setAccelerateTransition(false);
          setIsUIVisible(true);
          if (uiHideTimeoutRef.current) clearTimeout(uiHideTimeoutRef.current);
          setTimeLeft(BUFFER_TIME);
          return;
        }
        resetTimer();
      }
      if (status === 'finishing' && remaining === 10) fadeOutAll(10000);
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

  useEffect(() => {
    document.body.style.backgroundColor = isMeditating ? '#000000' : '#FFFFFF';
  }, [isMeditating]);

  let transitionDur = '2s';
  if (isMeditating) transitionDur = '5s';
  if (isFinishing && !accelerateTransition) transitionDur = '60s';

  const isAlwaysVisible = status === 'finishing' || status === 'preparing';
  const showUI = isUIVisible || isAlwaysVisible;
  const uiTransitionClass = showUI ? 'duration-300' : 'duration-[5000ms]';
  const FullscreenIcon = isFullscreen ? Minimize : Maximize;

  return (
    <div
      className="h-[100dvh] w-screen flex flex-col items-center justify-center overflow-hidden select-none stable-color-transition"
      style={{
        backgroundColor: isMeditating ? '#000000' : '#FFFFFF',
        color: isMeditating ? '#FFFFFF' : '#000000',
        transitionDuration: transitionDur,
        cursor: (isMeditating && !isUIVisible) ? 'none' : 'default',
        paddingTop: 'env(safe-area-inset-top)',
        paddingBottom: 'env(safe-area-inset-bottom)',
        paddingLeft: 'env(safe-area-inset-left)',
        paddingRight: 'env(safe-area-inset-right)'
      }}
    >
      <header className="fixed left-0 w-full px-8 md:px-12 flex justify-between items-center z-[130] pointer-events-none" style={{ top: isLarge ? 40 : 24 }}>
        <button
          className={`font-normal uppercase fade-transition ${uiTransitionClass} flex items-center h-10 pointer-events-auto ${showUI ? 'opacity-70' : 'opacity-0'}`}
          style={{ fontSize: isLarge ? 16 : 14, letterSpacing: isLarge ? '1em' : '0.7em' }}
          onPointerEnter={(e) => e.pointerType === 'mouse' && setShowCredits(true)}
          onPointerLeave={(e) => e.pointerType === 'mouse' && setShowCredits(false)}
          onClick={() => {
            const isTouch = window.matchMedia('(pointer: coarse)').matches;
            if (isTouch) setShowCredits(prev => !prev);
          }}
        >
          <span className="translate-y-[1px]">ZenRing</span>
        </button>
        <div className={`flex items-center pointer-events-auto fade-transition ${uiTransitionClass} ${showUI ? 'opacity-100' : 'opacity-0'}`} style={{ gap: isLarge ? 8 : 4 }}>
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
          <button onClick={() => setLang(l => l === 'zh' ? 'en' : 'zh')} className="w-10 h-10 flex items-center justify-center opacity-40 hover:opacity-100 transition-opacity">
            <div className="relative w-[20px] h-[20px] overflow-hidden">
              <AnimatePresence>
                <motion.span
                  key={lang}
                  initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                  transition={{ duration: 0.5 }}
                  className={`absolute inset-0 flex items-center justify-center leading-none uppercase ${lang === 'zh' ? 'font-light md:font-normal' : 'font-light tracking-tighter'}`}
                  style={{ fontSize: lang === 'zh' ? (isLarge ? 16 : 17) : 14 }}
                >
                  {lang === 'zh' ? '中' : 'EN'}
                </motion.span>
              </AnimatePresence>
            </div>
          </button>
          <button onClick={toggleFullscreen} className="w-10 h-10 flex items-center justify-center opacity-40 hover:opacity-100 transition-opacity">
            <FullscreenIcon size={20} strokeWidth={1.2} />
          </button>
        </div>
      </header>
      <main className="w-full h-full flex items-center justify-center px-6 relative">
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
                  initial={{ opacity: 0 }} animate={{ opacity: 0.6 }} exit={{ opacity: 0 }}
                  transition={{ duration: 0.5 }}
                  className={`col-start-1 row-start-1 font-normal leading-[2.2] ${lang === 'zh' ? 'tracking-[0.3em] uppercase' : 'tracking-[0.4em] uppercase'}`}
                  style={{ fontSize: lang === 'zh' ? (isLarge ? 16 : 14) : (isLarge ? 14 : 12), gap: isLarge ? 32 : 24 }}
                >
                  {[t.startInstr, t.adjustInstr, t.endInstr].map((instr, i) => {
                    const parts = instr.split(/[:：]/);
                    const separator = instr.includes('：') ? '：' : ':';
                    return (
                      <p key={i} className={`flex flex-wrap justify-center md:whitespace-nowrap ${lang === 'en' ? 'gap-x-[0.5em]' : ''}`} style={{ marginBottom: isLarge ? 32 : 24 }}>
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
            <div className="opacity-60 font-normal tracking-[0.4em] uppercase" style={{ fontSize: isLarge ? 14 : 12 }}>
              Made by Rolling with Gemini
            </div>
          </div>
        </div>
        <div className="grid grid-cols-1 grid-rows-1 w-full h-full">
          <AnimatePresence mode="popLayout">
            <motion.div
              key={status === 'idle' ? 'idle' : 'active'}
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              transition={{ duration: 0.5 }}
              className="col-start-1 row-start-1 w-full h-full flex items-center justify-center"
            >
              {status === 'idle' ? (
                <Settings duration={duration} setDuration={setDuration} soundType={soundType} setSoundType={setSoundType} onStart={handleStart} lang={lang} />
              ) : (
                <ProgressCircle isUIVisible={isUIVisible} timeLeft={timeLeft} startTime={startTime} duration={duration} status={status} lang={lang} onCancel={resetTimer} wasDragging={wasDragging} />
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </main>
    </div>
  );
};

export default App;
