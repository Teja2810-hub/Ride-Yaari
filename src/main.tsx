import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { setupGlobalErrorHandling } from './utils/errorReporting';

// Set up global error handling
setupGlobalErrorHandling();
//right click disable
// window.addEventListener('contextmenu', (e) => {
//   e.preventDefault()
// })
//end code right click 
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
