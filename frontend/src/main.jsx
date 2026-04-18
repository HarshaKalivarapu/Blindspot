import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { AuthProvider } from './lib/AuthContext.jsx'
import './index.css'
import Home from './pages/Home.jsx'
import Scan from './pages/Scan.jsx'
import NewScan from './pages/NewScan.jsx'
import Guide from './pages/Guide.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/guide" element={<Guide />} />
          <Route path="/scan/new" element={<NewScan />} />
          <Route path="/scan" element={<Scan />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  </StrictMode>,
)
