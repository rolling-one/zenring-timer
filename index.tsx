
/**
 * 应用入口文件
 * 负责将 React 应用挂载到 HTML 页面的 root 节点上
 */
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

// 获取 HTML 中的 root 节点
const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("找不到 root 挂载点");
}

// 创建 React 根实例并渲染 App 组件
const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
