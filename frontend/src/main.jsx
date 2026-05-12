import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Routes, Route, Link } from 'react-router-dom'
import { AuthProvider, useAuth } from './lib/AuthContext.jsx'
import { motion } from 'framer-motion'
import ShaderBackground from './components/homepage/ShaderBackground.jsx'
import './index.css'
import Home from './pages/Home.jsx'
import Scan from './pages/Scan.jsx'
import Guide from './pages/Guide.jsx'
import ScanReport from './pages/ScanReport.jsx'
import VisualizationDemo from './pages/VisualizationDemo.jsx'
import VisualizationDemoActive from './pages/VisualizationDemoActive.jsx'

function Unauthorized() {
  return (
    <div style={{ position: 'relative', height: '100vh', width: '100vw', overflow: 'hidden', background: '#070a0d', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <ShaderBackground />
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
        style={{ position: 'relative', zIndex: 10, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16, textAlign: 'center' }}
      >
        <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 80, fontWeight: 700, color: '#ffffff', lineHeight: 1, letterSpacing: '-0.03em' }}>
          401
        </span>
        <span style={{ fontFamily: 'system-ui, -apple-system, sans-serif', fontSize: 18, fontWeight: 400, color: 'rgba(255,255,255,0.6)', letterSpacing: '0.01em' }}>
          You are unauthorized to access this page.
        </span>
        <Link to="/" style={{ textDecoration: 'none' }}>
          <motion.div
            whileHover={{ backgroundColor: '#ffffff', color: '#0a0a0a', borderColor: '#ffffff' }}
            initial={{ backgroundColor: 'rgba(255,255,255,0.03)', color: '#ffffff', borderColor: 'rgba(255,255,255,0.15)' }}
            transition={{ duration: 0.2 }}
            style={{
              marginTop: 8,
              fontFamily: 'system-ui, -apple-system, sans-serif',
              fontSize: 14,
              fontWeight: 500,
              padding: '10px 28px',
              border: '1px solid rgba(255,255,255,0.15)',
              borderRadius: 6,
              cursor: 'pointer',
              letterSpacing: '0.01em',
              boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
              backdropFilter: 'blur(4px)',
            }}
          >
            Return to Home
          </motion.div>
        </Link>
      </motion.div>
    </div>
  )
}

function NotFound() {
  return (
    <div style={{ position: 'relative', height: '100vh', width: '100vw', overflow: 'hidden', background: '#070a0d', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <ShaderBackground />
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
        style={{ position: 'relative', zIndex: 10, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16, textAlign: 'center' }}
      >
        <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 80, fontWeight: 700, color: '#ffffff', lineHeight: 1, letterSpacing: '-0.03em' }}>
          404
        </span>
        <span style={{ fontFamily: 'system-ui, -apple-system, sans-serif', fontSize: 18, fontWeight: 400, color: 'rgba(255,255,255,0.6)', letterSpacing: '0.01em' }}>
          This page does not exist.
        </span>
        <Link to="/" style={{ textDecoration: 'none' }}>
          <motion.div
            whileHover={{ backgroundColor: '#ffffff', color: '#0a0a0a', borderColor: '#ffffff' }}
            initial={{ backgroundColor: 'rgba(255,255,255,0.03)', color: '#ffffff', borderColor: 'rgba(255,255,255,0.15)' }}
            transition={{ duration: 0.2 }}
            style={{
              marginTop: 8,
              fontFamily: 'system-ui, -apple-system, sans-serif',
              fontSize: 14,
              fontWeight: 500,
              padding: '10px 28px',
              border: '1px solid rgba(255,255,255,0.15)',
              borderRadius: 6,
              cursor: 'pointer',
              letterSpacing: '0.01em',
              boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
              backdropFilter: 'blur(4px)',
            }}
          >
            Return to Home
          </motion.div>
        </Link>
      </motion.div>
    </div>
  )
}

function ProtectedRoute({ children }) {
  const { user, loading } = useAuth()
  if (loading) return null
  return user ? children : <Unauthorized />
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/guide" element={<Guide />} />
          <Route path="/scan" element={<ProtectedRoute><Scan /></ProtectedRoute>} />
          <Route path="/scan/:id" element={<ProtectedRoute><ScanReport /></ProtectedRoute>} />
          <Route path="/demo" element={<VisualizationDemo />} />
          <Route path="/demo-active" element={<VisualizationDemoActive />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  </StrictMode>,
)
