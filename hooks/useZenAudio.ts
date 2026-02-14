
import { useRef, useEffect, useCallback } from 'react';
import { SOUND_SOURCES } from '../constants';
import { SoundType } from '../types';

export const useZenAudio = () => {
  const ambientRef = useRef<HTMLAudioElement | null>(null);
  const bowlRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    ambientRef.current = new Audio();
    ambientRef.current.loop = true;
    bowlRef.current = new Audio(SOUND_SOURCES.bowl);

    return () => {
      if (ambientRef.current) {
        ambientRef.current.pause();
        ambientRef.current = null;
      }
      if (bowlRef.current) {
        bowlRef.current.pause();
        bowlRef.current = null;
      }
    };
  }, []);

  const playAmbient = useCallback((type: SoundType) => {
    if (!ambientRef.current) return;
    if (type === 'none') {
      ambientRef.current.pause();
      return;
    }
    // @ts-ignore - type is checked to be one of the keys in SOUND_SOURCES
    const source = SOUND_SOURCES[type];
    if (source) {
      ambientRef.current.src = source;
      ambientRef.current.volume = 1;
      ambientRef.current.play().catch(console.error);
    }
  }, []);

  const stopAmbient = useCallback(() => {
    if (ambientRef.current) {
      ambientRef.current.pause();
    }
  }, []);

  const fadeOutAudio = (audio: HTMLAudioElement | null, durationMs: number) => {
    if (!audio || audio.paused || audio.volume <= 0) return;
    
    const initialVolume = audio.volume;
    const startTime = Date.now();

    const fade = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / durationMs, 1);
      
      if (audio) {
        audio.volume = initialVolume * (1 - progress);
        if (progress < 1) {
          requestAnimationFrame(fade);
        } else {
          audio.pause();
          audio.volume = 1; // 重置音量以便下次播放
        }
      }
    };
    fade();
  };

  const fadeOutAmbient = useCallback((durationMs: number) => {
    fadeOutAudio(ambientRef.current, durationMs);
  }, []);

  const fadeOutAll = useCallback((durationMs: number) => {
    fadeOutAudio(ambientRef.current, durationMs);
    fadeOutAudio(bowlRef.current, durationMs);
  }, []);

  const playBowl = useCallback(() => {
    if (!bowlRef.current) return;
    bowlRef.current.currentTime = 0;
    bowlRef.current.volume = 1;
    bowlRef.current.play().catch(console.error);
  }, []);

  return { playAmbient, stopAmbient, fadeOutAmbient, fadeOutAll, playBowl };
};
