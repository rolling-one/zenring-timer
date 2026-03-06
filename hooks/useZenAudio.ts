
// 导入必要的 React 钩子
import React, { useRef, useEffect, useCallback } from 'react';
// 导入常量和类型
import { SOUND_SOURCES } from '../constants';
import { SoundType } from '../types';

/**
 * 自定义 Hook：管理冥想应用的所有音频逻辑
 * 包括背景环境音、颂钵音效、淡入淡出效果以及 Web Audio API 的集成
 */
export const useZenAudio = () => {
  // Web Audio API 上下文，用于精确控制音量和淡入淡出
  const audioCtx = useRef<AudioContext | null>(null);
  // 主音量控制节点
  const masterGain = useRef<GainNode | null>(null);
  
  // HTML5 Audio 元素引用
  const ambientRef = useRef<HTMLAudioElement | null>(null); // 环境音（森林、流水）
  const bowlRef = useRef<HTMLAudioElement | null>(null);    // 颂钵音
  
  // 将 Audio 元素连接到 Web Audio API 的源节点
  const ambientSource = useRef<MediaElementAudioSourceNode | null>(null);
  const bowlSource = useRef<MediaElementAudioSourceNode | null>(null);
  
  // 追踪播放 Promise 以防止“play() request was interrupted by a call to pause()”错误
  const ambientPlayPromise = useRef<Promise<void> | null>(null);
  const bowlPlayPromise = useRef<Promise<void> | null>(null);
  
  // 追踪淡出任务的定时器，防止旧任务干扰新开启的音频
  const fadeTimeoutRef = useRef<number | null>(null);
  
  // 标记音频上下文是否已被用户交互解锁
  const isUnlocked = useRef(false);

  // 初始化音频系统
  useEffect(() => {
    // 兼容不同浏览器的 AudioContext
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    
    // 针对移动端优化：使用 latencyHint 提示浏览器增加缓冲，减少卡顿
    const ctx = new AudioContextClass({
      latencyHint: 'playback'
    });
    audioCtx.current = ctx;

    // 创建增益节点（音量控制器）并连接到扬声器
    const gain = ctx.createGain();
    gain.connect(ctx.destination);
    masterGain.current = gain;

    // 初始化环境音元素
    const ambient = new Audio();
    ambient.loop = true; // 环境音需要循环播放
    ambient.preload = 'auto';
    // 如果未来音频放在 CDN 上，允许跨域以便接入 Web Audio
    ambient.crossOrigin = 'anonymous';
    ambientRef.current = ambient;

    // 初始化颂钵音元素
    const bowl = new Audio(SOUND_SOURCES.bowl);
    bowl.preload = 'auto';
    bowl.crossOrigin = 'anonymous';
    bowlRef.current = bowl;

    // 监听音频上下文状态变化（便于调试挂起问题）
    const handleStateChange = () => {
      if (ctx.state === 'suspended') {
        console.log('音频上下文被挂起，等待用户交互或尝试恢复...');
      }
    };
    ctx.addEventListener('statechange', handleStateChange);
    
    // 组件卸载时清理资源
    return () => {
      ctx.removeEventListener('statechange', handleStateChange);
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

  /**
   * 安全播放音频：等待之前的播放请求完成后再开始新的播放
   */
  const safePlay = async (audio: HTMLAudioElement, promiseRef: React.MutableRefObject<Promise<void> | null>) => {
    try {
      if (promiseRef.current) {
        await promiseRef.current;
      }
      const promise = audio.play();
      promiseRef.current = promise;
      await promise;
      promiseRef.current = null;
    } catch (e) {
      if (e instanceof Error && e.name === 'AbortError') {
        // 被 pause() 中断，属于正常情况，忽略
      } else {
        console.warn("播放失败:", e);
      }
      promiseRef.current = null;
    }
  };

  /**
   * 安全暂停音频：等待播放请求加载完成后再执行暂停
   */
  const safePause = async (audio: HTMLAudioElement, promiseRef: React.MutableRefObject<Promise<void> | null>) => {
    if (promiseRef.current) {
      try {
        await promiseRef.current;
      } catch (e) {
        // 忽略尝试暂停时的播放失败
      }
    }
    audio.pause();
  };

  /**
   * 确保音频上下文处于运行状态（处理浏览器的自动播放限制）
   */
  const ensureContext = useCallback(async () => {
    if (audioCtx.current?.state === 'suspended') {
      await audioCtx.current.resume();
    }
  }, []);

  /**
   * 清除当前的淡出定时器
   */
  const clearFadeTimeout = useCallback(() => {
    if (fadeTimeoutRef.current) {
      window.clearTimeout(fadeTimeoutRef.current);
      fadeTimeoutRef.current = null;
    }
  }, []);

  /**
   * 预准备音频：在用户第一次点击时解锁音频上下文并建立节点连接
   */
  const prepareAudio = useCallback(async () => {
    if (isUnlocked.current || !audioCtx.current || !masterGain.current) return;

    await ensureContext();

    // 建立环境音连接
    if (ambientRef.current && !ambientSource.current) {
      ambientSource.current = audioCtx.current.createMediaElementSource(ambientRef.current);
      ambientSource.current.connect(masterGain.current);
      // 静默播放一次以解锁
      ambientRef.current.play().then(() => ambientRef.current?.pause()).catch(() => {});
    }

    // 建立颂钵音连接
    if (bowlRef.current && !bowlSource.current) {
      bowlSource.current = audioCtx.current.createMediaElementSource(bowlRef.current);
      bowlSource.current.connect(masterGain.current);
      bowlRef.current.play().then(() => bowlRef.current?.pause()).catch(() => {});
    }

    isUnlocked.current = true;
  }, [ensureContext]);

  /**
   * 播放环境音（带淡入效果）
   */
  const playAmbient = useCallback(async (type: SoundType) => {
    const audio = ambientRef.current;
    const ctx = audioCtx.current;
    const gain = masterGain.current;
    if (!audio || !ctx || !gain) return;

    clearFadeTimeout();
    await ensureContext();

    // 取消之前的音量调度
    gain.gain.cancelScheduledValues(ctx.currentTime);
    
    // 播放环境音前先停掉颂钵音
    if (bowlRef.current) {
      await safePause(bowlRef.current, bowlPlayPromise);
      bowlRef.current.currentTime = 0;
    }

    // 如果选择“无音效”，则执行淡出并停止
    if (type === 'none') {
      gain.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.5);
      fadeTimeoutRef.current = window.setTimeout(() => {
        safePause(audio, ambientPlayPromise);
        fadeTimeoutRef.current = null;
      }, 500);
      return;
    }

    // 获取音频源 URL
    const source = (SOUND_SOURCES as any)[type];
    if (source) {
      if (audio.src !== source) {
        audio.src = source;
        audio.load();
      }

      audio.currentTime = 0;
      // 设置初始音量为静音，准备淡入
      gain.gain.setValueAtTime(0, ctx.currentTime);
      
      await safePlay(audio, ambientPlayPromise);
      // 在 2 秒内线性淡入到正常音量
      gain.gain.linearRampToValueAtTime(1.0, ctx.currentTime + 2.0);
    }
  }, [ensureContext, clearFadeTimeout]);

  /**
   * 立即停止所有音频
   */
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

  /**
   * 平滑淡出所有音频
   * @param durationMs 淡出持续时间（毫秒）
   */
  const fadeOutAll = useCallback((durationMs: number) => {
    const ctx = audioCtx.current;
    const gain = masterGain.current;
    if (!ctx || !gain) return;

    clearFadeTimeout();

    const durationSec = durationMs / 1000;
    gain.gain.cancelScheduledValues(ctx.currentTime);
    gain.gain.setValueAtTime(gain.gain.value, ctx.currentTime);
    // 线性淡出到静音
    gain.gain.linearRampToValueAtTime(0, ctx.currentTime + durationSec);
    
    // 淡出完成后彻底暂停音频元素
    fadeTimeoutRef.current = window.setTimeout(async () => {
      if (ambientRef.current) {
        await safePause(ambientRef.current, ambientPlayPromise);
      }
      if (bowlRef.current) {
        await safePause(bowlRef.current, bowlPlayPromise);
        bowlRef.current.currentTime = 0;
      }
      fadeTimeoutRef.current = null;
    }, durationMs);
  }, [clearFadeTimeout]);

  /**
   * 播放颂钵音效（冥想开始和结束时使用）
   */
  const playBowl = useCallback(async () => {
    const audio = bowlRef.current;
    const ctx = audioCtx.current;
    const gain = masterGain.current;
    if (!audio || !ctx || !gain) return;

    clearFadeTimeout();
    await ensureContext();
    
    // 颂钵音通常不需要淡入，直接设为最大音量
    gain.gain.cancelScheduledValues(ctx.currentTime);
    gain.gain.setValueAtTime(1.0, ctx.currentTime);

    audio.currentTime = 0;
    await safePlay(audio, bowlPlayPromise);
  }, [ensureContext, clearFadeTimeout]);

  // 返回外部可以调用的方法
  return { prepareAudio, playAmbient, stopAll, fadeOutAll, playBowl };
};
