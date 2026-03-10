import React, { useRef, useEffect, useCallback } from 'react';
import { SOUND_SOURCES } from '../constants';
import { SoundType } from '../types';

export const useZenAudio = () => {
  const audioCtx = useRef<AudioContext | null>(null);
  const masterGain = useRef<GainNode | null>(null);
  const ambientRef = useRef<HTMLAudioElement | null>(null);
  const bowlRef = useRef<HTMLAudioElement | null>(null);
  const ambientSource = useRef<MediaElementAudioSourceNode | null>(null);
  const bowlSource = useRef<MediaElementAudioSourceNode | null>(null);
  const ambientPlayPromise = useRef<Promise<void> | null>(null);
  const bowlPlayPromise = useRef<Promise<void> | null>(null);
  const fadeTimeoutRef = useRef<number | null>(null);
  const isUnlocked = useRef(false);

  useEffect(() => {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    const ctx = new AudioContextClass({ latencyHint: 'playback' });
    audioCtx.current = ctx;

    const gain = ctx.createGain();
    gain.connect(ctx.destination);
    masterGain.current = gain;

    const ambient = new Audio();
    ambient.loop = true;
    ambient.preload = 'auto';
    ambient.crossOrigin = 'anonymous';
    ambientRef.current = ambient;

    const bowl = new Audio(SOUND_SOURCES.bowl);
    bowl.preload = 'auto';
    bowl.crossOrigin = 'anonymous';
    bowlRef.current = bowl;

    return () => {
      ctx.close();
      if (fadeTimeoutRef.current) window.clearTimeout(fadeTimeoutRef.current);
      if (ambientRef.current) {
        ambientRef.current.pause();
        ambientRef.current.src = '';
      }
      if (bowlRef.current) {
        bowlRef.current.pause();
        bowlRef.current.src = '';
      }
    };
  }, []);

  const safePlay = async (audio: HTMLAudioElement, promiseRef: React.MutableRefObject<Promise<void> | null>) => {
    try {
      if (promiseRef.current) await promiseRef.current;
      const promise = audio.play();
      promiseRef.current = promise;
      await promise;
      promiseRef.current = null;
    } catch (e) {
      promiseRef.current = null;
    }
  };

  const safePause = async (audio: HTMLAudioElement, promiseRef: React.MutableRefObject<Promise<void> | null>) => {
    if (promiseRef.current) {
      try { await promiseRef.current; } catch (e) {}
    }
    audio.pause();
  };

  const ensureContext = useCallback(async () => {
    if (audioCtx.current?.state === 'suspended') {
      await audioCtx.current.resume();
    }
  }, []);

  const clearFadeTimeout = useCallback(() => {
    if (fadeTimeoutRef.current) {
      window.clearTimeout(fadeTimeoutRef.current);
      fadeTimeoutRef.current = null;
    }
  }, []);

  const prepareAudio = useCallback(async () => {
    if (isUnlocked.current || !audioCtx.current || !masterGain.current) return;
    await ensureContext();
    if (ambientRef.current && !ambientSource.current) {
      ambientSource.current = audioCtx.current.createMediaElementSource(ambientRef.current);
      ambientSource.current.connect(masterGain.current);
    }
    if (bowlRef.current && !bowlSource.current) {
      bowlSource.current = audioCtx.current.createMediaElementSource(bowlRef.current);
      bowlSource.current.connect(masterGain.current);
    }
    isUnlocked.current = true;
  }, [ensureContext]);

  const playAmbient = useCallback(async (type: SoundType) => {
    const audio = ambientRef.current;
    const ctx = audioCtx.current;
    const gain = masterGain.current;
    if (!audio || !ctx || !gain) return;

    clearFadeTimeout();
    await ensureContext();
    gain.gain.cancelScheduledValues(ctx.currentTime);

    if (bowlRef.current) {
      await safePause(bowlRef.current, bowlPlayPromise);
      bowlRef.current.currentTime = 0;
    }

    if (type === 'none') {
      gain.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.5);
      fadeTimeoutRef.current = window.setTimeout(() => {
        safePause(audio, ambientPlayPromise);
        fadeTimeoutRef.current = null;
      }, 500);
      return;
    }

    const source = (SOUND_SOURCES as any)[type];
    if (source) {
      if (audio.src !== source) {
        audio.src = source;
        audio.load();
      }
      audio.currentTime = 0;
      gain.gain.cancelScheduledValues(ctx.currentTime);
      gain.gain.setValueAtTime(0, ctx.currentTime);
      await safePlay(audio, ambientPlayPromise);
      const now = ctx.currentTime;
      gain.gain.setValueAtTime(0, now);
      gain.gain.linearRampToValueAtTime(1.0, now + 2.0);
    }
  }, [ensureContext, clearFadeTimeout]);

  const stopAll = useCallback(async () => {
    const ctx = audioCtx.current;
    const gain = masterGain.current;
    clearFadeTimeout();
    if (ctx && gain) {
      gain.gain.cancelScheduledValues(ctx.currentTime);
      gain.gain.setValueAtTime(0.001, ctx.currentTime);
    }
    if (ambientRef.current) {
      await safePause(ambientRef.current, ambientPlayPromise);
      ambientRef.current.currentTime = 0;
    }
    if (bowlRef.current) {
      await safePause(bowlRef.current, bowlPlayPromise);
      bowlRef.current.currentTime = 0;
    }
  }, [clearFadeTimeout]);

  const fadeOutAll = useCallback((durationMs: number) => {
    const ctx = audioCtx.current;
    const gain = masterGain.current;
    if (!ctx || !gain) return;
    clearFadeTimeout();
    const durationSec = durationMs / 1000;
    gain.gain.cancelScheduledValues(ctx.currentTime);
    gain.gain.setValueAtTime(gain.gain.value, ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0, ctx.currentTime + durationSec);
    fadeTimeoutRef.current = window.setTimeout(async () => {
      if (ambientRef.current) await safePause(ambientRef.current, ambientPlayPromise);
      if (bowlRef.current) {
        await safePause(bowlRef.current, bowlPlayPromise);
        bowlRef.current.currentTime = 0;
      }
      fadeTimeoutRef.current = null;
    }, durationMs);
  }, [clearFadeTimeout]);

  const playBowl = useCallback(async () => {
    const audio = bowlRef.current;
    const ctx = audioCtx.current;
    const gain = masterGain.current;
    if (!audio || !ctx || !gain) return;
    clearFadeTimeout();
    await ensureContext();
    gain.gain.cancelScheduledValues(ctx.currentTime);
    gain.gain.setValueAtTime(1.0, ctx.currentTime);
    audio.currentTime = 0;
    await safePlay(audio, bowlPlayPromise);
  }, [ensureContext, clearFadeTimeout]);

  return { prepareAudio, playAmbient, stopAll, fadeOutAll, playBowl };
};
