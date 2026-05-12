import { useState } from 'react'
import { createPortal } from 'react-dom'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import TerminalIntro from '../components/intro/TerminalIntro.jsx'
import ScanFeed from '../components/homepage/ScanFeed.jsx'
import HeroPanel from '../components/homepage/HeroPanel.jsx'
import ShaderBackground from '../components/homepage/ShaderBackground.jsx'
import AuthModal from '../components/homepage/AuthModal.jsx'
import { useAuth } from '../lib/AuthContext.jsx'

export default function Home() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [phase, setPhase] = useState('intro')
  const [isModalOpen, setIsModalOpen] = useState(false)

  return (
    <div style={{ background: '#0a0a0a', minHeight: '100vh' }}>
      {phase === 'intro' && (
        <TerminalIntro onComplete={() => setPhase('splitscreen')} />
      )}

      {phase === 'splitscreen' && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5 }}
          style={{ height: '100vh', background: '#0a0a0a', position: 'relative', overflow: 'hidden' }}
        >
          <ShaderBackground />

          {/* Full-screen terminal background */}
          <div style={{ position: 'absolute', inset: 0, zIndex: 1 }}>
            <ScanFeed />
          </div>

          {/* Radial vignette so hero text is legible */}
          <div style={{
            position: 'absolute',
            inset: 0,
            zIndex: 2,
            background: 'radial-gradient(ellipse 55% 65% at 50% 50%, rgba(10,10,10,0.82) 0%, transparent 100%)',
          }} />

          {/* Global App Navbar */}
          <nav
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              height: 64,
              zIndex: 50,
              background: 'linear-gradient(180deg, rgba(30, 35, 42, 0.6) 0%, rgba(20, 25, 30, 0.2) 100%)',
              backdropFilter: 'blur(16px)',
              borderBottom: 'none',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '0 32px',
            }}
          >
            <div style={{
              width: '100%',
              maxWidth: 1000,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              fontFamily: 'system-ui, -apple-system, sans-serif'
            }}>
              <div style={{ fontSize: 18, fontWeight: 600, color: '#ffffff', letterSpacing: '-0.02em', fontFamily: "'IBM Plex Mono', monospace" }}>
                Blindspot
              </div>
              <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
                <a 
                  href="https://github.com/samaypatel27/pentest-mcp" 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  style={{ color: 'rgba(255, 255, 255, 0.65)', display: 'flex', alignItems: 'center', marginRight: 8, transition: 'color 0.2s' }} 
                  onMouseEnter={(e) => e.currentTarget.style.color = '#ffffff'} 
                  onMouseLeave={(e) => e.currentTarget.style.color = 'rgba(255, 255, 255, 0.65)'}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="currentColor" viewBox="0 0 24 24">
                    <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.477 2 12c0 4.42 2.865 8.166 6.839 9.489.5.092.682-.217.682-.482 0-.237-.009-.866-.013-1.699-2.782.604-3.369-1.34-3.369-1.34-.454-1.156-1.11-1.464-1.11-1.464-.908-.62.069-.608.069-.608 1.003.07 1.531 1.03 1.531 1.03.892 1.529 2.341 1.087 2.91.831.092-.646.35-1.086.636-1.336-2.22-.253-4.555-1.11-4.555-4.943 0-1.091.39-1.984 1.03-2.682-.103-.253-.447-1.27.098-2.646 0 0 .84-.269 2.75 1.025A9.578 9.578 0 0112 6.836c.85.004 1.705.114 2.504.336 1.909-1.294 2.747-1.025 2.747-1.025.546 1.376.202 2.394.1 2.646.64.699 1.026 1.591 1.026 2.682 0 3.841-2.337 4.687-4.565 4.935.359.309.678.919.678 1.852 0 1.336-.012 2.415-.012 2.743 0 .267.18.578.688.48C19.138 20.161 22 16.418 22 12c0-5.523-4.477-10-10-10z" />
                  </svg>
                </a>
                <motion.button 
                  type="button"
                  onClick={() => navigate('/guide')}
                  whileHover={{ backgroundColor: '#ffffff', color: '#0a0a0a', borderColor: '#ffffff' }}
                  initial={{ backgroundColor: 'rgba(255, 255, 255, 0.03)', color: '#ffffff', borderColor: 'rgba(255, 255, 255, 0.15)' }}
                  transition={{ duration: 0.2 }}
                  style={{
                    fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
                    fontSize: 14,
                    fontWeight: 500,
                    padding: '10px 24px',
                    border: '1px solid rgba(255, 255, 255, 0.15)',
                    borderRadius: 6,
                    cursor: 'pointer',
                    outline: 'none',
                    letterSpacing: '0.01em',
                    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
                    backdropFilter: 'blur(4px)',
                  }}
                >
                  User Guide
                </motion.button>
                {user ? (
                  <motion.button
                    type="button"
                    onClick={() => navigate('/scan')}
                    whileHover={{ backgroundColor: '#ffffff', color: '#0a0a0a', borderColor: '#ffffff' }}
                    initial={{ backgroundColor: 'rgba(255, 255, 255, 0.03)', color: '#ffffff', borderColor: 'rgba(255, 255, 255, 0.15)' }}
                    transition={{ duration: 0.2 }}
                    style={{
                      fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
                      fontSize: 14,
                      fontWeight: 500,
                      padding: '10px 24px',
                      border: '1px solid rgba(255, 255, 255, 0.15)',
                      borderRadius: 6,
                      cursor: 'pointer',
                      outline: 'none',
                      letterSpacing: '0.01em',
                      boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
                      backdropFilter: 'blur(4px)',
                    }}
                  >
                    Dashboard
                  </motion.button>
                ) : (
                  <motion.button
                    type="button"
                    onClick={() => setIsModalOpen(true)}
                    whileHover={{ backgroundColor: '#ffffff', color: '#0a0a0a', borderColor: '#ffffff' }}
                    initial={{ backgroundColor: 'rgba(255, 255, 255, 0.03)', color: '#ffffff', borderColor: 'rgba(255, 255, 255, 0.15)' }}
                    transition={{ duration: 0.2 }}
                    style={{
                      fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
                      fontSize: 14,
                      fontWeight: 500,
                      padding: '10px 24px',
                      border: '1px solid rgba(255, 255, 255, 0.15)',
                      borderRadius: 6,
                      cursor: 'pointer',
                      outline: 'none',
                      letterSpacing: '0.01em',
                      boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
                      backdropFilter: 'blur(4px)',
                    }}
                  >
                    Login
                  </motion.button>
                )}
              </div>
            </div>
          </nav>

          {/* Centered hero */}
          <motion.div
            initial={{ opacity: 0, filter: 'blur(12px)', zIndex: 0 }}
            animate={{ opacity: 1, filter: 'blur(0px)', zIndex: 3 }}
            transition={{ duration: 0.75, delay: 2.0, ease: 'easeOut' }}
            style={{
              position: 'absolute',
              inset: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <HeroPanel onOpenModal={() => setIsModalOpen(true)} />
          </motion.div>
        </motion.div>
      )}

      {isModalOpen && createPortal(
        <AuthModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />,
        document.body
      )}
    </div>
  )
}
