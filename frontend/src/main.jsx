import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './lib/AuthContext.jsx'
import './index.css'
import Home from './pages/Home.jsx'
import Scan from './pages/Scan.jsx'
import NewScan from './pages/NewScan.jsx'
import Guide from './pages/Guide.jsx'
import ScanReport from './pages/ScanReport.jsx'
import VisualizationDemo from './pages/VisualizationDemo.jsx'
import VisualizationDemoActive from './pages/VisualizationDemoActive.jsx'

function ProtectedRoute({ children }) {
  const { user, loading } = useAuth()
  if (loading) return null
  return user ? children : <Navigate to="/" replace />
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/guide" element={<Guide />} />
          <Route path="/scan/new" element={<ProtectedRoute><NewScan /></ProtectedRoute>} />
          <Route path="/scan" element={<ProtectedRoute><Scan /></ProtectedRoute>} />
          <Route path="/scan/report" element={<ScanReport />} />
          <Route path="/demo" element={<VisualizationDemo />} />
          <Route path="/demo-active" element={<VisualizationDemoActive />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  </StrictMode>,
)
