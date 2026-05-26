import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import * as XLSX from 'xlsx';
import './index.css';

// Make XLSX available globally if needed for debugging or inline scripts
(window as any).XLSX = XLSX;

// Global error handling for easier debugging
window.onerror = function (message, source, lineno, colno, error) {
  alert(`Erro detectado: ${message}\nLink: ${source}:${lineno}`);
  return false;
};

window.onunhandledrejection = function (event) {
  alert(`Promessa rejeitada: ${event.reason}`);
};

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
