import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import WarningModal from '../components/WarningModal'
import ShaderBackground from '../components/homepage/ShaderBackground.jsx'

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL ?? 'http://localhost:5000'

function Scan() {
  const navigate = useNavigate()
  const [view, setView] = useState('dashboard') // 'dashboard' or 'chat'
  const [showWarning, setShowWarning] = useState(false)
  const [authorized, setAuthorized] = useState(false)
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      text: 'Scanner ready. Describe a target or ask a question to begin.',
    },
  ])
  const scrollRef = useRef(null)

  useEffect(() => {
    if (view === 'chat') {
      scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight })
    }
  }, [messages, view])

  const handleStartScan = () => {
    setView('chat')
    if (!authorized) {
      setShowWarning(true)
    }
  }

  const handleSignOut = () => {
    navigate('/')
  }

  const handleSend = async (e) => {
    e.preventDefault()
    const trimmed = input.trim()
    if (!trimmed || sending) return
    setMessages((m) => [...m, { role: 'user', text: trimmed }])
    setInput('')
    setSending(true)
    try {
      const res = await fetch(`${BACKEND_URL}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: trimmed }),
      })
      const data = await res.json()
      const reply = res.ok
        ? data.reply ?? '(empty response)'
        : `Error: ${data.error ?? res.statusText}`
      setMessages((m) => [...m, { role: 'assistant', text: reply }])
    } catch (err) {
      setMessages((m) => [
        ...m,
        { role: 'assistant', text: `Network error: ${err.message}` },
      ])
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

      <main className="mx-auto flex w-full max-w-4xl flex-1 flex-col px-6 py-6 pb-8">
        <div
          ref={scrollRef}
          className="flex-1 space-y-4 overflow-y-auto rounded-xl border border-white/10 bg-black/30 backdrop-blur-md p-4"
        >
          {messages.map((m, i) => (
            <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div
                className={`max-w-[75%] rounded-2xl px-5 py-3 text-sm leading-relaxed ${m.role === 'user' ? 'bg-white text-black' : 'bg-white/10 text-white'
                  }`}
                style={{ fontFamily: 'system-ui, -apple-system, sans-serif' }}
              >
                {m.text}
              </div>
            </div>
          ))}
        </div>

        <form onSubmit={handleSend} className="mt-4 flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={authorized ? 'Send a message...' : 'Authorize to enable input'}
            disabled={!authorized || sending}
            className="flex-1 rounded-lg border border-white/20 bg-black/40 backdrop-blur-md px-4 py-3 text-sm placeholder-white/40 outline-none focus:border-white disabled:cursor-not-allowed disabled:opacity-50"
            style={{ fontFamily: 'system-ui, -apple-system, sans-serif', color: 'white' }}
          />
          <button
            type="submit"
            disabled={!authorized || sending}
            className="rounded-lg bg-white px-6 py-3 text-sm font-medium text-black hover:bg-slate-200 disabled:cursor-not-allowed disabled:opacity-50 transition-colors"
            style={{ fontFamily: 'system-ui, -apple-system, sans-serif' }}
          >
            {sending ? 'Sending...' : 'Send'}
          </button>
        </form>
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
            ShieldScan
          </div>
          <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
            <motion.button
              type="button"
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
              User Manual
            </motion.button>
            <motion.button
              type="button"
              onClick={handleSignOut}
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
              Sign Out
            </motion.button>
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
          }}
          onCancel={() => {
            setAuthorized(false)
            setShowWarning(false)
          }}
        />
      )}
    </div>
  )
}

export default Scan
