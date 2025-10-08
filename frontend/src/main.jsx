import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import AppWrapper from './App.jsx'; 
import { AuthProvider } from './context/AuthContext'; 
import './index.css';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <AuthProvider> {/* 2. Wrap your AppWrapper with the provider */}
      <AppWrapper />
    </AuthProvider>
  </StrictMode>,
);