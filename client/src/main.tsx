import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './assets/index.css'
import './theme.css'
import "@arco-design/web-react/dist/css/arco.css";
import { initPerformanceMonitoring } from './utils/performanceMonitor'

// 初始化性能监控
initPerformanceMonitoring();

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)
