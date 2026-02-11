import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';

// Global styles
const style = document.createElement('style');
style.textContent = `
  * {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
  }

  html, body, #root {
    width: 100%;
    height: 100%;
    overflow: hidden;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    background: #0a0a15;
    color: #e0e0e0;
  }

  ::-webkit-scrollbar {
    width: 6px;
  }

  ::-webkit-scrollbar-track {
    background: #1a1a2a;
  }

  ::-webkit-scrollbar-thumb {
    background: #333366;
    border-radius: 3px;
  }

  ::-webkit-scrollbar-thumb:hover {
    background: #4444aa;
  }

  button {
    font-family: inherit;
  }

  select {
    font-family: inherit;
  }
`;
document.head.appendChild(style);

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
