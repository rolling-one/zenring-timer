/**
 * Vite 配置文件
 * 用于配置开发服务器、插件、环境变量以及路径别名
 */
import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
    // 加载环境变量
    const env = loadEnv(mode, '.', '');
    
    return {
      // 开发服务器配置
      server: {
        port: 3000, // 端口号
        host: '0.0.0.0', // 允许外部访问
      },
      // 插件配置
      plugins: [react()],
      // 全局常量定义
      define: {
        'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
        'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY)
      },
      // 路径解析配置
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'), // 设置 @ 指向根目录
        }
      }
    };
});
