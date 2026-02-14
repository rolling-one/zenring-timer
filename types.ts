
export type TimerStatus = 'idle' | 'preparing' | 'meditating' | 'finishing' | 'ended';

export type SoundType = 'forest' | 'stream' | 'none';

export type Language = 'zh' | 'en';

export interface TimerConfig {
  duration: number; // in seconds
  soundType: SoundType;
}