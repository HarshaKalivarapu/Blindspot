import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import ShaderBackground from '../components/homepage/ShaderBackground.jsx'
import AuthModal from '../components/homepage/AuthModal.jsx'
import { useAuth } from '../lib/AuthContext.jsx'
import { supabase } from '../lib/supabase.js'

const SANS = 'system-ui, -apple-system, sans-serif'

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

function ScanHistoryCard({ row, onClick }) {
  const score = row.score ?? null
  const color = scoreColor(score)
  return (
    <motion.div
      onClick={onClick}
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
      <div>
        <span style={{ fontFamily: SANS, fontSize: 12, color: 'rgba(255,255,255,0.5)' }}>
          {row.total_issues_count ?? 0} vulnerabilities found
        </span>
      </div>
    </motion.div>
  )
}

function Scan() {
  const navigate = useNavigate()
  const { user, signOut } = useAuth()
  const [showAuthModal, setShowAuthModal] = useState(false)
  const [scans, setScans] = useState([])
  const [scansLoading, setScansLoading] = useState(false)

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

  const handleNewScan = () => {
    const id = crypto.randomUUID()
    navigate('/scan/' + id, { state: { isNew: true } })
  }

  const handleSignOut = async () => {
    sessionStorage.removeItem('authed')
    await signOut()
    navigate('/')
  }

  return (
    <div style={{ position: 'relative', height: '100vh', width: '100vw', overflow: 'hidden', background: '#070a0d' }}>
      <ShaderBackground />

      <nav style={{
        position: 'absolute', top: 0, left: 0, right: 0, height: 64, zIndex: 50,
        background: 'linear-gradient(180deg, rgba(30, 35, 42, 0.6) 0%, rgba(20, 25, 30, 0.2) 100%)',
        backdropFilter: 'blur(16px)', display: 'flex', alignItems: 'center',
        justifyContent: 'center', padding: '0 32px',
      }}>
        <div style={{
          width: '100%', maxWidth: 1000, display: 'flex', alignItems: 'center',
          justifyContent: 'space-between', fontFamily: SANS,
        }}>
          <div style={{ fontSize: 18, fontWeight: 600, color: '#ffffff', letterSpacing: '-0.02em', cursor: 'pointer' }}
            onClick={() => navigate('/scan')}>
            Blindspot
          </div>
          <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
            <motion.button
              type="button" onClick={() => navigate('/guide')}
              whileHover={{ backgroundColor: '#ffffff', color: '#0a0a0a', borderColor: '#ffffff' }}
              initial={{ backgroundColor: 'rgba(255,255,255,0.03)', color: '#ffffff', borderColor: 'rgba(255,255,255,0.15)' }}
              transition={{ duration: 0.2 }}
              style={{ fontFamily: SANS, fontSize: 14, fontWeight: 500, padding: '10px 24px', border: '1px solid rgba(255,255,255,0.15)', borderRadius: 6, cursor: 'pointer', letterSpacing: '0.01em', backdropFilter: 'blur(4px)' }}
            >
              User Guide
            </motion.button>
            {user ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <motion.button
                  type="button" onClick={handleSignOut}
                  whileHover={{ backgroundColor: '#ffffff', color: '#0a0a0a', borderColor: '#ffffff' }}
                  initial={{ backgroundColor: 'rgba(255,255,255,0.03)', color: '#ffffff', borderColor: 'rgba(255,255,255,0.15)' }}
                  transition={{ duration: 0.2 }}
                  style={{ fontFamily: SANS, fontSize: 14, fontWeight: 500, padding: '10px 24px', border: '1px solid rgba(255,255,255,0.15)', borderRadius: 6, cursor: 'pointer', letterSpacing: '0.01em', backdropFilter: 'blur(4px)' }}
                >
                  Sign Out
                </motion.button>
                {user.user_metadata?.avatar_url ? (
                  <img src={user.user_metadata.avatar_url} alt="profile"
                    style={{ width: 32, height: 32, borderRadius: '50%', border: '1px solid rgba(255,255,255,0.2)' }} />
                ) : (
                  <span style={{ fontFamily: SANS, fontSize: 13, color: 'rgba(255,255,255,0.7)' }}>{user.email}</span>
                )}
              </div>
            ) : (
              <motion.button
                type="button" onClick={() => setShowAuthModal(true)}
                whileHover={{ backgroundColor: '#ffffff', color: '#0a0a0a', borderColor: '#ffffff' }}
                initial={{ backgroundColor: 'rgba(255,255,255,0.03)', color: '#ffffff', borderColor: 'rgba(255,255,255,0.15)' }}
                transition={{ duration: 0.2 }}
                style={{ fontFamily: SANS, fontSize: 14, fontWeight: 500, padding: '10px 24px', border: '1px solid rgba(255,255,255,0.15)', borderRadius: 6, cursor: 'pointer', letterSpacing: '0.01em', backdropFilter: 'blur(4px)' }}
              >
                Sign In
              </motion.button>
            )}
          </div>
        </div>
      </nav>

      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3 }}
        style={{ position: 'absolute', inset: '64px 0 0 0', display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '64px 32px', zIndex: 1, overflowY: 'auto' }}
      >
        <div style={{ width: '100%', maxWidth: 1000 }}>
          <h1 style={{ fontFamily: SANS, fontSize: 36, fontWeight: 600, color: '#ffffff', marginBottom: 40, letterSpacing: '-0.02em' }}>
            Scan History
          </h1>

          <motion.div
            style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 24 }}
            variants={{ show: { transition: { staggerChildren: 0.07 } } }}
            initial="hidden" animate="show"
          >
            {/* New Scan card */}
            <motion.button
              variants={{ hidden: { opacity: 0, y: 10 }, show: { opacity: 1, y: 0 } }}
              onClick={handleNewScan}
              whileHover={{ scale: 1.02, backgroundColor: 'rgba(255,255,255,0.04)', borderColor: 'rgba(255,255,255,0.3)' }}
              whileTap={{ scale: 0.98 }}
              style={{
                aspectRatio: '1', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                backgroundColor: 'rgba(255,255,255,0.02)', border: '1px dashed rgba(255,255,255,0.15)',
                borderRadius: 16, cursor: 'pointer', color: 'rgba(255,255,255,0.6)', fontFamily: SANS,
                transition: 'color 0.2s', backdropFilter: 'blur(4px)',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.color = '#ffffff')}
              onMouseLeave={(e) => (e.currentTarget.style.color = 'rgba(255,255,255,0.6)')}
            >
              <div style={{ fontSize: 48, fontWeight: 300, marginBottom: 8, lineHeight: 1 }}>+</div>
              <div style={{ fontSize: 16, fontWeight: 500, letterSpacing: '0.01em' }}>New Scan</div>
            </motion.button>

            {/* History cards */}
            {scansLoading && (
              <motion.div
                variants={{ hidden: { opacity: 0 }, show: { opacity: 1 } }}
                style={{ aspectRatio: '1', borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)' }}
              />
            )}
            {!scansLoading && scans.map((row) => (
              <motion.div key={row.id} variants={{ hidden: { opacity: 0, y: 10 }, show: { opacity: 1, y: 0 } }}>
                <ScanHistoryCard row={row} onClick={() => navigate('/scan/' + row.id)} />
              </motion.div>
            ))}
          </motion.div>
        </div>
      </motion.div>

      <AuthModal isOpen={showAuthModal} onClose={() => setShowAuthModal(false)} />
    </div>
  )
}

export default Scan
