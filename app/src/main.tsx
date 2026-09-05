import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { initDB } from './db';
import './styles/global.css';

// 初始化数据库
initDB()
  .then(() => {
    console.log('✅ Database initialized successfully');
  })
  .catch((error) => {
    console.error('❌ Failed to initialize database:', error);
  });

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
