import { useState, useRef, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import WarningModal from '../components/WarningModal'
import ShaderBackground from '../components/homepage/ShaderBackground.jsx'
import AuthModal from '../components/homepage/AuthModal.jsx'
import ScanVisualization from '../components/ScanVisualization.jsx'
import ScanVisualizationActive from '../components/ScanVisualizationActive.jsx'
import { supabase } from '../lib/supabase.js'
import { useAuth } from '../lib/AuthContext.jsx'

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL ?? 'http://localhost:5000'
const SANS = 'system-ui, -apple-system, sans-serif'

const STRIP_PREFIXES = ['https://', 'http://', 'www.']

function cleanSearchInput(raw) {
  let q = raw.trim().toLowerCase()
  for (const prefix of STRIP_PREFIXES) {
    if (q.startsWith(prefix)) { q = q.slice(prefix.length); break }
  }
  const slashIdx = q.indexOf('/')
  if (slashIdx !== -1) q = q.slice(0, slashIdx)
  const queryIdx = q.indexOf('?')
  if (queryIdx !== -1) q = q.slice(0, queryIdx)
  return q
}

function SkeletonCard() {
  return (
    <div style={{
      aspectRatio: '1', borderRadius: 16, overflow: 'hidden', position: 'relative',
      backgroundColor: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)',
    }}>
      <motion.div
        animate={{ x: ['-100%', '100%'] }}
        transition={{ duration: 1.4, repeat: Infinity, ease: 'linear', repeatDelay: 0.5 }}
        style={{
          position: 'absolute', inset: 0,
          background: 'linear-gradient(105deg, transparent 30%, rgba(255,255,255,0.07) 50%, transparent 70%)',
        }}
      />
    </div>
  )
}

function scoreColor(score) {
  if (score === null || score === undefined) return 'rgba(255,255,255,0.4)'
  if (score < 4.0) return '#f87171'
  if (score < 7.0) return '#fbbf24'
  return '#34d399'
}

function formatDate(iso) {
  if (!iso) return ''
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function ScanHistoryCard({ row, onClick, onDelete, index, animated }) {
  const score = row.score ?? null
  const color = scoreColor(score)
  return (
    <motion.div
      onClick={onClick}
      initial={animated ? { opacity: 0, y: 20 } : false}
      animate={animated ? { opacity: 1, y: 0 } : undefined}
      transition={animated ? { duration: 1.5, ease: 'easeOut', delay: index * 0.25 } : undefined}
      whileHover={{ backgroundColor: 'rgba(255,255,255,0.06)', borderColor: 'rgba(255,255,255,0.25)' }}
      whileTap={{ scale: 0.98 }}
      style={{
        aspectRatio: '1', display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
        backgroundColor: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.1)',
        borderRadius: 16, padding: 20, cursor: 'pointer', backdropFilter: 'blur(4px)',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <span style={{ fontFamily: SANS, fontSize: 32, fontWeight: 700, color, lineHeight: 1 }}>
            {score !== null ? score.toFixed(1) : '—'}
          </span>
          <span style={{ fontFamily: SANS, fontSize: 14, color: 'rgba(255,255,255,0.35)', marginLeft: 4 }}>/10</span>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontFamily: 'monospace', fontSize: 13, color: '#ffffff', marginBottom: 2 }}>
            {row.target ?? '—'}
          </div>
          <div style={{ fontFamily: SANS, fontSize: 12, color: 'rgba(255,255,255,0.4)', marginBottom: 6 }}>
            {formatDate(row.scan_date)}
          </div>
          <span style={{
            fontFamily: SANS, fontSize: 11, fontWeight: 500, padding: '2px 8px', borderRadius: 99,
            backgroundColor: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.6)', textTransform: 'capitalize',
          }}>
            {row.scan_type ?? 'scan'}
          </span>
        </div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontFamily: SANS, fontSize: 12, color: 'rgba(255,255,255,0.5)' }}>
          {row.total_issues_count ?? 0} vulnerabilities found
        </span>
        <motion.button
          type="button"
          onClick={(e) => { e.stopPropagation(); onDelete(row.id) }}
          whileHover={{ color: '#ef4444', backgroundColor: 'rgba(239,68,68,0.1)', borderColor: 'rgba(239,68,68,0.4)' }}
          initial={{ color: 'rgba(255,255,255,0.25)', backgroundColor: 'transparent', borderColor: 'rgba(255,255,255,0.1)' }}
          transition={{ duration: 0.15 }}
          style={{ fontFamily: SANS, fontSize: 11, fontWeight: 500, padding: '4px 10px',
            border: '1px solid rgba(255,255,255,0.1)', borderRadius: 6, cursor: 'pointer', flexShrink: 0 }}
        >
          Delete
        </motion.button>
      </div>
    </motion.div>
  )
}

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
  const [messages, setMessages] = useState([])
  const [externalDone, setExternalDone] = useState({})
  const [reportDev, setReportDev] = useState(null)
  const [reportNonDev, setReportNonDev] = useState(null)
  const [generatingReport, setGeneratingReport] = useState(false)
  const [devChunkLen, setDevChunkLen] = useState(0)
  const [nondevChunkLen, setNondevChunkLen] = useState(0)
  const [scans, setScans] = useState([])
  const [scansLoading, setScansLoading] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState([])
  const [searchLoading, setSearchLoading] = useState(false)
  const [deleteScanId, setDeleteScanId] = useState(null)
  const [deletingSingle, setDeletingSingle] = useState(false)
  const scrollRef = useRef(null)
  const scanInserted = useRef(false)
  const animatedOnce = useRef(false)

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

  useEffect(() => {
    if (!user) return
    setScansLoading(true)
    supabase
      .from('scans')
      .select('id, target, scan_date, scan_type, total_issues_count, score')
      .eq('user_id', user.id)
      .order('scan_date', { ascending: false })
      .then(({ data }) => {
        setScans(data ?? [])
        setScansLoading(false)
      })
  }, [user])

  useEffect(() => {
    if (scans.length > 0) animatedOnce.current = true
  }, [scans])

  useEffect(() => {
    if (!user || searchQuery.length === 0) {
      setSearchResults([])
      return
    }
    const cleaned = cleanSearchInput(searchQuery)
    if (!cleaned) { setSearchResults([]); return }
    const isIpLike = /^\d[\d.]*$/.test(cleaned)
    const q = isIpLike ? cleaned.replace(/\./g, '') : cleaned
    setSearchLoading(true)
    fetch(`${BACKEND_URL}/scans/search?q=${encodeURIComponent(q)}&user_id=${user.id}`)
      .then(r => r.json())
      .then(data => { setSearchResults(Array.isArray(data) ? data : []); setSearchLoading(false) })
      .catch(() => { setSearchResults([]); setSearchLoading(false) })
  }, [searchQuery, user])

  const handleStartScan = () => {
    const id = crypto.randomUUID()
    navigate('/scan/' + id, { state: { isNew: true } })
  }

  const handleDeleteAll = async () => {
    if (!user) return
    setDeleting(true)
    await supabase.from('scans').delete().eq('user_id', user.id)
    setScans([])
    setDeleting(false)
    setShowDeleteModal(false)
  }

  const handleSignOut = async () => {
    sessionStorage.removeItem('authed')
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
    setExternalDone({})
    setReportDev(null)
    setReportNonDev(null)
    setGeneratingReport(false)
    setDevChunkLen(0)
    setNondevChunkLen(0)
    setMessages([])

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
              if (event.message.endsWith(' complete.')) {
                const toolName = event.message.slice(0, -' complete.'.length)
                setExternalDone(prev => ({ ...prev, [toolName]: true }))
              } else if (
                event.message === 'Analyzing findings...' ||
                event.message === 'Generating reports...'
              ) {
                setGeneratingReport(true)
              }
            } else if (event.type === 'report_dev_chunk') {
              setDevChunkLen(prev => prev + event.message.length)
            } else if (event.type === 'report_nondev_chunk') {
              setNondevChunkLen(prev => prev + event.message.length)
            } else if (event.type === 'report_dev') {
              setReportDev(event.message)
            } else if (event.type === 'report_nondev') {
              setReportNonDev(event.message)
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
        overflowY: 'auto',
      }}
    >
      <div style={{ width: '100%', maxWidth: 1000 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 40 }}>
          <h1 style={{ fontFamily: SANS, fontSize: 36, fontWeight: 600, color: '#ffffff', letterSpacing: '-0.02em', margin: 0 }}>
            Scan History
          </h1>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ position: 'relative', width: 280 }}>
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search by network or ip address"
                style={{
                  fontFamily: SANS, fontSize: 13, color: '#ffffff',
                  background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.12)',
                  borderRadius: 6, padding: '8px 36px 8px 14px', outline: 'none', width: '100%',
                  letterSpacing: '0.01em', boxSizing: 'border-box',
                }}
              />
              <svg
                xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none"
                stroke="rgba(255,255,255,0.35)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', width: 15, height: 15, pointerEvents: 'none' }}
              >
                <circle cx="11" cy="11" r="7" />
                <line x1="16.5" y1="16.5" x2="21" y2="21" />
              </svg>
            </div>
            {user && scans.length > 0 && (
              <motion.button
                type="button"
                onClick={() => setShowDeleteModal(true)}
                whileHover={{ backgroundColor: 'rgba(239,68,68,0.12)', borderColor: 'rgba(239,68,68,0.5)', color: '#f87171' }}
                initial={{ backgroundColor: 'transparent', borderColor: 'rgba(255,255,255,0.12)', color: 'rgba(255,255,255,0.4)' }}
                transition={{ duration: 0.2 }}
                style={{ fontFamily: SANS, fontSize: 13, fontWeight: 500, padding: '8px 18px',
                  border: '1px solid rgba(255,255,255,0.12)', borderRadius: 6, cursor: 'pointer', letterSpacing: '0.01em' }}
              >
                Clear history
              </motion.button>
            )}
          </div>
        </div>

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

          {/* History cards */}
          {(scansLoading || searchLoading) && <SkeletonCard />}
          {!scansLoading && !searchLoading && (searchQuery.length > 0 ? searchResults : scans).map((row, i) => (
            <ScanHistoryCard
              key={row.id}
              row={row}
              index={i}
              animated={!animatedOnce.current}
              onClick={() => navigate('/scan/' + row.id)}
              onDelete={(id) => setDeleteScanId(id)}
            />
          ))}
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

      <div style={{ position: 'absolute', inset: '64px 0 0 0' }}>
        {scanConfig?.level === 'active'
          ? <ScanVisualizationActive
              target={scanConfig.target}
              nmapType={scanConfig.intensity ?? 'simple'}
              externalDone={externalDone}
              generatingReport={generatingReport}
              reportDev={reportDev}
              reportNonDev={reportNonDev}
              devChunkLen={devChunkLen}
              nondevChunkLen={nondevChunkLen}
              topOffset={64}
              onComplete={() => setSending(false)} />
          : <ScanVisualization
              target={scanConfig?.target ?? ''}
              externalDone={externalDone}
              generatingReport={generatingReport}
              reportDev={reportDev}
              reportNonDev={reportNonDev}
              devChunkLen={devChunkLen}
              nondevChunkLen={nondevChunkLen}
              topOffset={64}
              onComplete={() => setSending(false)} />
        }
      </div>
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
          <div style={{ fontSize: 18, fontWeight: 600, color: '#ffffff', letterSpacing: '-0.02em', cursor: 'pointer', fontFamily: "'IBM Plex Mono', monospace" }} onClick={() => navigate('/')}>
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
      <AnimatePresence>
        {showDeleteModal && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            style={{ position: 'fixed', inset: 0, zIndex: 200, display: 'flex',
              alignItems: 'center', justifyContent: 'center',
              background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(6px)' }}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 12 }}
              transition={{ duration: 0.2 }}
              style={{ background: 'rgba(18,22,27,0.97)', border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: 16, padding: '32px 36px', maxWidth: 420, width: '90%', fontFamily: SANS }}
            >
              <h2 style={{ fontSize: 20, fontWeight: 600, color: '#fff', marginBottom: 10, letterSpacing: '-0.01em' }}>
                Clear all scan history?
              </h2>
              <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.5)', lineHeight: 1.6, marginBottom: 28 }}>
                This will permanently delete all your scans and reports. This cannot be undone.
              </p>
              <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
                <motion.button
                  type="button"
                  onClick={() => setShowDeleteModal(false)}
                  whileHover={{ backgroundColor: 'rgba(255,255,255,0.08)' }}
                  style={{ fontFamily: SANS, fontSize: 14, fontWeight: 500, padding: '10px 22px',
                    border: '1px solid rgba(255,255,255,0.15)', borderRadius: 6, cursor: 'pointer',
                    color: '#fff', background: 'transparent' }}
                >
                  Cancel
                </motion.button>
                <motion.button
                  type="button"
                  onClick={handleDeleteAll}
                  disabled={deleting}
                  whileHover={{ backgroundColor: '#dc2626' }}
                  style={{ fontFamily: SANS, fontSize: 14, fontWeight: 500, padding: '10px 22px',
                    border: 'none', borderRadius: 6, cursor: deleting ? 'not-allowed' : 'pointer',
                    background: '#ef4444', color: '#fff', opacity: deleting ? 0.6 : 1 }}
                >
                  {deleting ? 'Deleting…' : 'Delete all'}
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {deleteScanId && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            style={{ position: 'fixed', inset: 0, zIndex: 200, display: 'flex',
              alignItems: 'center', justifyContent: 'center',
              background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(6px)' }}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 12 }}
              transition={{ duration: 0.2 }}
              style={{ background: 'rgba(18,22,27,0.97)', border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: 16, padding: '32px 36px', maxWidth: 420, width: '90%', fontFamily: SANS }}
            >
              <h2 style={{ fontSize: 20, fontWeight: 600, color: '#fff', marginBottom: 10, letterSpacing: '-0.01em' }}>
                Delete this scan?
              </h2>
              <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.5)', lineHeight: 1.6, marginBottom: 28 }}>
                This will permanently delete the scan and its report. This cannot be undone.
              </p>
              <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
                <motion.button
                  type="button"
                  onClick={() => setDeleteScanId(null)}
                  whileHover={{ backgroundColor: 'rgba(255,255,255,0.08)' }}
                  style={{ fontFamily: SANS, fontSize: 14, fontWeight: 500, padding: '10px 22px',
                    border: '1px solid rgba(255,255,255,0.15)', borderRadius: 6, cursor: 'pointer',
                    color: '#fff', background: 'transparent' }}
                >
                  Cancel
                </motion.button>
                <motion.button
                  type="button"
                  onClick={async () => {
                    setDeletingSingle(true)
                    await supabase.from('scans').delete().eq('id', deleteScanId)
                    setScans(prev => prev.filter(s => s.id !== deleteScanId))
                    setDeletingSingle(false)
                    setDeleteScanId(null)
                  }}
                  disabled={deletingSingle}
                  whileHover={{ backgroundColor: '#dc2626' }}
                  style={{ fontFamily: SANS, fontSize: 14, fontWeight: 500, padding: '10px 22px',
                    border: 'none', borderRadius: 6, cursor: deletingSingle ? 'not-allowed' : 'pointer',
                    background: '#ef4444', color: '#fff', opacity: deletingSingle ? 0.6 : 1 }}
                >
                  {deletingSingle ? 'Deleting…' : 'Delete scan'}
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AuthModal isOpen={showAuthModal} onClose={() => setShowAuthModal(false)} />
    </div>
  )
}

export default Scan
