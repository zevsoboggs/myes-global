import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Hide initial preloader when React app starts
setTimeout(() => {
  if (typeof window !== 'undefined' && window.hidePreloader) {
    window.hidePreloader();
  }
}, 1500); // Give React time to initialize

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
