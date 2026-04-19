import { useState, useRef, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import WarningModal from '../components/WarningModal'
import ShaderBackground from '../components/homepage/ShaderBackground.jsx'
import AuthModal from '../components/homepage/AuthModal.jsx'
import { supabase } from '../lib/supabase.js'
import { useAuth } from '../lib/AuthContext.jsx'

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL ?? 'http://localhost:5000'

function Scan() {
  const navigate = useNavigate()
  const location = useLocation()
  const { user, signOut } = useAuth()
  const [view, setView] = useState('dashboard') // 'dashboard' or 'chat'
  const [showWarning, setShowWarning] = useState(false)
  const [showAuthModal, setShowAuthModal] = useState(false)
  const [authorized, setAuthorized] = useState(false)
  const [scanConfig, setScanConfig] = useState(null)
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const [scanError, setScanError] = useState(false)
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      text: 'Scanner ready. Describe a target or ask a question to begin.',
    },
  ])
  const scrollRef = useRef(null)
  const scanInserted = useRef(false)

  useEffect(() => {
    if (view === 'chat') {
      scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight })
    }
  }, [messages, view])

  useEffect(() => {
    if (location.state?.config) {
      const config = location.state.config
      setScanConfig(config)
      navigate('/scan', { replace: true, state: {} })

      if (config.level === 'active' && !authorized) {
        setShowWarning(true)
      } else {
        setView('chat')
      }
    }
  }, [location.state, authorized, navigate])

  // Auto-start scan when we enter chat view with a config
  useEffect(() => {
    if (view === 'chat' && scanConfig && !sending) {
      startScan(scanConfig, authorized)
    }
  }, [view]) // eslint-disable-line react-hooks/exhaustive-deps

  const handleStartScan = () => {
    navigate('/scan/new')
  }

  const handleSignOut = async () => {
    await signOut()
    navigate('/')
  }

  useEffect(() => {
    if (view === 'chat' && user && !scanInserted.current) {
      scanInserted.current = true
      supabase.from('scans').insert({ user_id: user.id, report: null })
    }
  }, [view, user])

  const handleSend = async (e) => {
    e.preventDefault()
    const trimmed = input.trim()
    if (!trimmed || sending) return
    setMessages((m) => [...m, { role: 'user', text: trimmed }])
    setInput('')
  }
  const startScan = async (config, isAuthorized) => {
    setSending(true)
    setScanError(false)
    setMessages([{ role: 'assistant', text: `Starting ${config.level} scan of ${config.target}...` }])

    try {
      const res = await fetch(`${BACKEND_URL}/scan`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          target: config.target,
          level: config.level,
          intensity: config.intensity ?? 'simple',
          authorization_confirmed: isAuthorized,
        }),
      })

      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() // keep incomplete last line

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue
          try {
            const event = JSON.parse(line.slice(6))
            if (event.type === 'status') {
              setMessages((m) => [...m, { role: 'status', text: event.message }])
            } else if (event.type === 'progress') {
              setMessages((m) => [...m, { role: 'assistant', text: event.message }])
            } else if (event.type === 'report') {
              setMessages((m) => [...m, { role: 'report', text: event.message }])
            }
          } catch {
            // skip malformed lines
          }
        }
      }
    } catch (err) {
      setMessages((m) => [...m, { role: 'assistant', text: `Network error: ${err.message}` }])
      setScanError(true)
    } finally {
      setSending(false)
    }
  }

  const renderDashboard = () => (
    <motion.div
      key="dashboard"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
      style={{
        position: 'absolute',
        inset: '64px 0 0 0',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        padding: '64px 32px',
        zIndex: 1,
      }}
    >
      <div style={{ width: '100%', maxWidth: 1000 }}>
        <h1
          style={{
            fontFamily: 'system-ui, -apple-system, sans-serif',
            fontSize: 36,
            fontWeight: 600,
            color: '#ffffff',
            marginBottom: 40,
            letterSpacing: '-0.02em',
          }}
        >
          Scan History
        </h1>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 24 }}>
          {/* New Scan Box */}
          <motion.button
            onClick={handleStartScan}
            whileHover={{ scale: 1.02, backgroundColor: 'rgba(255, 255, 255, 0.04)', borderColor: 'rgba(255, 255, 255, 0.3)' }}
            whileTap={{ scale: 0.98 }}
            style={{
              aspectRatio: '1',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: 'rgba(255, 255, 255, 0.02)',
              border: '1px dashed rgba(255, 255, 255, 0.15)',
              borderRadius: 16,
              cursor: 'pointer',
              color: 'rgba(255, 255, 255, 0.6)',
              fontFamily: 'system-ui, -apple-system, sans-serif',
              transition: 'color 0.2s',
              backdropFilter: 'blur(4px)',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.color = '#ffffff')}
            onMouseLeave={(e) => (e.currentTarget.style.color = 'rgba(255, 255, 255, 0.6)')}
          >
            <div style={{ fontSize: 48, fontWeight: 300, marginBottom: 8, lineHeight: 1 }}>+</div>
            <div style={{ fontSize: 16, fontWeight: 500, letterSpacing: '0.01em' }}>New Scan</div>
          </motion.button>
        </div>
      </div>
    </motion.div>
  )

  const renderChat = () => (
    <motion.div
      key="chat"
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
      className="flex h-full flex-col text-slate-100 relative z-10"
      style={{ position: 'absolute', inset: '64px 0 0 0' }}
    >
      <header className="border-b border-white/10 px-6 py-4 bg-black/20 backdrop-blur-md">
        <div className="mx-auto flex max-w-4xl items-center justify-between">
          <div>
            <h1 className="text-lg font-semibold tracking-tight" style={{ fontFamily: 'system-ui, -apple-system, sans-serif' }}>
              Recon Console
            </h1>
            <p className="text-xs text-white/50" style={{ fontFamily: 'system-ui, -apple-system, sans-serif' }}>
              {authorized ? 'Active scanning authorized' : 'Awaiting authorization'}
            </p>
          </div>
          <div className="flex gap-4 items-center">
            <button
              onClick={() => setView('dashboard')}
              className="text-white/50 hover:text-white text-sm transition-colors"
              style={{ fontFamily: 'system-ui, -apple-system, sans-serif' }}
            >
              Back to Dashboard
            </button>
            {scanError && (
              <motion.button
                onClick={handleStartScan}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                whileHover={{ backgroundColor: 'rgba(255,255,255,0.12)', borderColor: 'rgba(255,255,255,0.4)' }}
                whileTap={{ scale: 0.97 }}
                style={{
                  fontFamily: 'system-ui, -apple-system, sans-serif',
                  fontSize: 13,
                  fontWeight: 500,
                  padding: '6px 16px',
                  border: '1px solid rgba(255,255,255,0.2)',
                  borderRadius: 6,
                  cursor: 'pointer',
                  color: '#ffffff',
                  backgroundColor: 'rgba(255,255,255,0.06)',
                  outline: 'none',
                  letterSpacing: '0.01em',
                }}
              >
                + New Scan
              </motion.button>
            )}
            <span
              className={`rounded-full px-3 py-1 text-xs font-medium ${authorized ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                }`}
              style={{ fontFamily: 'monospace' }}
            >
              {authorized ? 'AUTHORIZED' : 'LOCKED'}
            </span>
          </div>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-4xl flex-1 flex-col px-6 py-6 pb-8 min-h-0 overflow-hidden">
        <div
          ref={scrollRef}
          className="flex-1 space-y-4 overflow-y-auto rounded-xl border border-white/10 bg-black/30 backdrop-blur-md p-4"
        >
          {messages.map((m, i) => (
            <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div
                style={{
                  fontFamily: 'system-ui, -apple-system, sans-serif',
                  maxWidth: m.role === 'report' ? '100%' : '75%',
                  borderRadius: 16,
                  padding: m.role === 'status' ? '6px 14px' : '12px 20px',
                  fontSize: m.role === 'status' ? 12 : 14,
                  lineHeight: 1.6,
                  whiteSpace: 'pre-wrap',
                  background:
                    m.role === 'user'   ? '#ffffff' :
                    m.role === 'status' ? 'rgba(255,255,255,0.04)' :
                    m.role === 'report' ? 'rgba(255,255,255,0.06)' :
                                          'rgba(255,255,255,0.1)',
                  color:
                    m.role === 'user'   ? '#000000' :
                    m.role === 'status' ? 'rgba(255,255,255,0.4)' :
                                          '#ffffff',
                  border: m.role === 'report' ? '1px solid rgba(255,255,255,0.15)' : 'none',
                  width: m.role === 'report' ? '100%' : undefined,
                }}
              >
                {m.role === 'status' && '› '}{m.text}
              </div>
            </div>
          ))}
        </div>

        {sending && (
          <div className="mt-4 text-center text-sm" style={{ color: 'rgba(255,255,255,0.35)', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
            Scan in progress...
          </div>
        )}
      </main>
    </motion.div>
  )

  return (
    <div style={{ position: 'relative', height: '100vh', width: '100vw', overflow: 'hidden', background: '#070a0d' }}>
      <ShaderBackground />

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
          <div style={{ fontSize: 18, fontWeight: 600, color: '#ffffff', letterSpacing: '-0.02em', cursor: 'pointer' }} onClick={() => setView('dashboard')}>
            Blindspot
          </div>
          <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
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
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <motion.button
                  type="button"
                  onClick={handleSignOut}
                  whileHover={{ backgroundColor: '#ffffff', color: '#0a0a0a', borderColor: '#ffffff' }}
                  initial={{ backgroundColor: 'rgba(255, 255, 255, 0.03)', color: '#ffffff', borderColor: 'rgba(255, 255, 255, 0.15)' }}
                  transition={{ duration: 0.2 }}
                  style={{
                    fontFamily: 'system-ui, -apple-system, sans-serif',
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
                  Sign Out
                </motion.button>
                {user.user_metadata?.avatar_url ? (
                  <img
                    src={user.user_metadata.avatar_url}
                    alt="profile"
                    style={{ width: 32, height: 32, borderRadius: '50%', border: '1px solid rgba(255,255,255,0.2)' }}
                  />
                ) : (
                  <span style={{ fontFamily: 'system-ui, sans-serif', fontSize: 13, color: 'rgba(255,255,255,0.7)' }}>
                    {user.email}
                  </span>
                )}
              </div>
            ) : (
              <motion.button
                type="button"
                onClick={() => setShowAuthModal(true)}
                whileHover={{ backgroundColor: '#ffffff', color: '#0a0a0a', borderColor: '#ffffff' }}
                initial={{ backgroundColor: 'rgba(255, 255, 255, 0.03)', color: '#ffffff', borderColor: 'rgba(255, 255, 255, 0.15)' }}
                transition={{ duration: 0.2 }}
                style={{
                  fontFamily: 'system-ui, -apple-system, sans-serif',
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
                Sign In
              </motion.button>
            )}
          </div>
        </div>
      </nav>

      <AnimatePresence mode="wait">
        {view === 'dashboard' ? renderDashboard() : renderChat()}
      </AnimatePresence>

      {showWarning && (
        <WarningModal
          onConfirm={() => {
            setAuthorized(true)
            setShowWarning(false)
            setView('chat')
          }}
          onCancel={() => {
            setShowWarning(false)
          }}
        />
      )}
      <AuthModal isOpen={showAuthModal} onClose={() => setShowAuthModal(false)} />
    </div>
  )
}

export default Scan
