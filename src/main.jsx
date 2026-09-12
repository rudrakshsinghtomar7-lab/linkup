import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App.jsx'
import './index.css'
import { startUpdateCheck } from './lib/updateCheck'

startUpdateCheck()

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter basename="/linkup">
      <App />
    </BrowserRouter>
  </StrictMode>,
)
