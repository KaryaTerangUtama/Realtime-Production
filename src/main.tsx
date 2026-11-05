import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { initVersionMonitoring } from './services/versionManager';

// Initialize automatic version monitoring and proactive cache invalidation
initVersionMonitoring();

createRoot(document.getElementById('root')!).render(<App />);
