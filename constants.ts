
/**
 * 应用常量配置
 */

// 准备阶段的时长（秒）
export const PREPARE_TIME = 5; 

// 冥想结束后的缓冲时长（秒），用于平滑过渡回主界面
export const BUFFER_TIME = 120; 

// 冥想过程中，无操作后 UI 自动隐藏的延迟时间（毫秒）
export const UI_HIDE_TIMEOUT = 5000; 

/**
 * 音频资源路径
 */
export const SOUND_SOURCES = {
  forest: '/audio/forest.mp3', // 森林环境音
  stream: '/audio/stream.mp3', // 溪流环境音
  bowl: '/audio/bowl.mp3'      // 颂钵音效
};
