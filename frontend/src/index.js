import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App'; // Ensure this points to your App.js
import './index.css';

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
