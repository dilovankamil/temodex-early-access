import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import TemodexApp from './temodex/TemodexApp';
import { AppErrorBoundary } from './components/AppErrorBoundary';

const rootElement = document.getElementById('root');
if (!rootElement) throw new Error('Application root element is missing.');

createRoot(rootElement).render(
  <StrictMode>
    <AppErrorBoundary><TemodexApp /></AppErrorBoundary>
  </StrictMode>,
);
