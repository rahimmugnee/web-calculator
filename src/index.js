import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import AdminApp from './admin/AdminApp';
import reportWebVitals from './reportWebVitals';
import { CatalogProvider } from './context/CatalogContext';
import { blurActiveNumberInputOnWheel } from './lib/numberInputWheel';

// Browsers increment/decrement a focused number field when the mouse wheel is
// used over it. Blur before the default action so the wheel keeps scrolling the
// page without changing the field's value.
document.addEventListener('wheel', blurActiveNumberInputOnWheel, true);

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    {window.location.pathname.startsWith('/admin') ? (
      <AdminApp />
    ) : (
      <CatalogProvider>
        <App />
      </CatalogProvider>
    )}
  </React.StrictMode>
);

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals();
