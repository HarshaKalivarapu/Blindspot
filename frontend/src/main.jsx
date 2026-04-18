import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { GoogleOAuthProvider } from '@react-oauth/google'
import './index.css'
import Home from './pages/Home.jsx'
import Scan from './pages/Scan.jsx'
import NewScan from './pages/NewScan.jsx'
import Guide from './pages/Guide.jsx'
import ReportActiveVisual from './pages/ReportActiveVisual.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <GoogleOAuthProvider clientId={import.meta.env.VITE_GOOGLE_CLIENT_ID}>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/guide" element={<Guide />} />
          <Route path="/scan/new" element={<NewScan />} />
          <Route path="/scan" element={<Scan />} />
          <Route path="/report/active/visual" element={<ReportActiveVisual />} />
        </Routes>
      </BrowserRouter>
    </GoogleOAuthProvider>
  </StrictMode>,
)
