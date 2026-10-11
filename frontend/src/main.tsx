import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import App from './App.tsx';
import { AuthProvider } from './context/AuthContext';
import { SettingsProvider } from './hooks/useSettings';
import { ThemeProvider } from './context/ThemeContext';
import { ErrorBoundary } from './components/ErrorBoundary';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <ThemeProvider>
        <AuthProvider>
          <SettingsProvider>
            <BrowserRouter>
              <App />
              <Toaster
                position="top-right"
                toastOptions={{
                  duration: 3500,
                  style: {
                    borderRadius: '12px',
                    fontSize: '14px',
                    fontWeight: 500,
                  },
                  success: { iconTheme: { primary: '#10b981', secondary: '#fff' } },
                  error: { iconTheme: { primary: '#ef4444', secondary: '#fff' }, duration: 5000 },
                }}
              />
            </BrowserRouter>
          </SettingsProvider>
        </AuthProvider>
      </ThemeProvider>
    </ErrorBoundary>
  </StrictMode>,
);
