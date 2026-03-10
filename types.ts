
/**
 * 计时器状态类型
 * idle: 空闲/设置中
 * preparing: 准备阶段（10秒倒计时）
 * meditating: 冥想进行中
 * finishing: 冥想结束过渡中
 * paused: 暂停中
 * ended: 彻底结束
 */
export type TimerStatus = 'idle' | 'preparing' | 'meditating' | 'finishing' | 'paused' | 'ended';

/**
 * 音效类型
 * forest: 森林
 * stream: 溪流
 * none: 无音效
 */
export type SoundType = 'forest' | 'stream' | 'none';

/**
 * 语言类型
 * zh: 中文
 * en: 英文
 */
export type Language = 'zh' | 'en';

/**
 * 计时器配置接口
 */
export interface TimerConfig {
  duration: number; // 持续时间（秒）
  soundType: SoundType; // 选中的音效类型
}