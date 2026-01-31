import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App.jsx'
import './index.css'
import { AdminProvider } from './context/AdminContext'
import { ProductProvider } from './context/ProductContext'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <AdminProvider>
        <ProductProvider>
          <App />
        </ProductProvider>
      </AdminProvider>
    </BrowserRouter>
  </React.StrictMode>,
)
