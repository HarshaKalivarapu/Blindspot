import { useState, useRef, useEffect } from 'react'
import { useNavigate, useParams, useLocation } from 'react-router-dom'
import { motion } from 'framer-motion'
import ShaderBackground from '../components/homepage/ShaderBackground.jsx'
import WarningModal from '../components/WarningModal'
import ScanVisualization from '../components/ScanVisualization.jsx'
import ScanVisualizationActive from '../components/ScanVisualizationActive.jsx'
import NewScan from './NewScan.jsx'
import { supabase } from '../lib/supabase.js'
import { useAuth } from '../lib/AuthContext.jsx'

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL ?? 'http://localhost:5000'

export default function ScanReport() {
  const navigate = useNavigate()
  const { id } = useParams()
  const location = useLocation()
  const { user } = useAuth()

  // phase: 'config' | 'scanning' | 'history' | 'not_found'
  const [phase, setPhase] = useState(location.state?.isNew ? 'config' : 'history')
  const [scanConfig, setScanConfig] = useState(null)
  const [authorized, setAuthorized] = useState(false)
  const [showWarning, setShowWarning] = useState(false)
  const [sending, setSending] = useState(false)
  const [externalDone, setExternalDone] = useState({})
  const [reportDev, setReportDev] = useState(null)
  const [reportNonDev, setReportNonDev] = useState(null)
  const [generatingReport, setGeneratingReport] = useState(false)
  const [historyMeta, setHistoryMeta] = useState(null)
  const [historyLoading, setHistoryLoading] = useState(false)
  const scanStarted = useRef(false)

  // History fetch
  useEffect(() => {
    if (phase !== 'history') return
    setHistoryLoading(true)
    supabase
      .from('scans')
      .select('target, scan_type, scan_mode, report_dev, report_nondev')
      .eq('id', id)
      .single()
      .then(({ data }) => {
        if (data) {
          setHistoryMeta(data)
          setReportDev(JSON.stringify(data.report_dev))
          setReportNonDev(JSON.stringify(data.report_nondev))
        } else {
          setPhase('not_found')
        }
        setHistoryLoading(false)
      })
  }, [phase, id])

  // Auto-start scan when entering scanning phase
  useEffect(() => {
    if (phase !== 'scanning' || !scanConfig || scanStarted.current) return
    if (scanConfig.level === 'active' && !authorized) {
      setShowWarning(true)
      return
    }
    scanStarted.current = true
    startScan(scanConfig, authorized)
  }, [phase, scanConfig, authorized]) // eslint-disable-line react-hooks/exhaustive-deps

  const handleConfigSubmit = (config) => {
    setScanConfig(config)
    setPhase('scanning')
  }

  const startScan = async (config, isAuthorized) => {
    setSending(true)
    setExternalDone({})
    setReportDev(null)
    setReportNonDev(null)
    setGeneratingReport(false)

    try {
      const res = await fetch(`${BACKEND_URL}/scan`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          target: config.target,
          level: config.level,
          intensity: config.intensity ?? 'simple',
          authorization_confirmed: isAuthorized,
          user_id: user?.id ?? null,
          scan_id: id,
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
        buffer = lines.pop()

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
            } else if (event.type === 'report_dev') {
              setReportDev(event.message)
            } else if (event.type === 'report_nondev') {
              setReportNonDev(event.message)
            }
          } catch { /* skip malformed */ }
        }
      }
    } catch (err) {
      console.error('Scan error:', err)
    } finally {
      setSending(false)
    }
  }

  const navBar = (
    <nav style={{
      position: 'absolute', top: 0, left: 0, right: 0, height: 64, zIndex: 50,
      background: 'linear-gradient(180deg, rgba(30,35,42,0.6) 0%, rgba(20,25,30,0.2) 100%)',
      backdropFilter: 'blur(16px)', display: 'flex', alignItems: 'center',
      justifyContent: 'center', padding: '0 32px',
    }}>
      <div style={{
        width: '100%', maxWidth: 1000, display: 'flex', alignItems: 'center',
        justifyContent: 'space-between', fontFamily: 'system-ui, -apple-system, sans-serif',
      }}>
        <div
          style={{ fontSize: 18, fontWeight: 600, color: '#ffffff', letterSpacing: '-0.02em', cursor: 'pointer' }}
          onClick={() => navigate('/scan')}
        >
          Blindspot
        </div>
        <motion.button
          type="button"
          onClick={() => navigate('/scan')}
          whileHover={{ backgroundColor: '#ffffff', color: '#0a0a0a', borderColor: '#ffffff' }}
          initial={{ backgroundColor: 'rgba(255,255,255,0.03)', color: '#ffffff', borderColor: 'rgba(255,255,255,0.15)' }}
          transition={{ duration: 0.2 }}
          style={{
            fontFamily: 'system-ui, -apple-system, sans-serif', fontSize: 14, fontWeight: 500,
            padding: '10px 24px', border: '1px solid rgba(255,255,255,0.15)', borderRadius: 6,
            cursor: 'pointer', letterSpacing: '0.01em', backdropFilter: 'blur(4px)',
          }}
        >
          Back to Dashboard
        </motion.button>
      </div>
    </nav>
  )

  return (
    <div style={{ position: 'relative', height: '100vh', width: '100vw', overflow: 'hidden', background: '#070a0d' }}>
      <ShaderBackground />
      {navBar}

      {/* Phase: config */}
      {phase === 'config' && (
        <div style={{ position: 'absolute', inset: '64px 0 0 0', overflowY: 'auto', zIndex: 1 }}>
          <NewScan onSubmit={handleConfigSubmit} onBack={() => navigate('/scan')} />
        </div>
      )}

      {/* Phase: scanning (live scan visualization) */}
      {phase === 'scanning' && (
        <div style={{ position: 'absolute', inset: '64px 0 0 0' }}>
          {scanConfig?.level === 'active'
            ? <ScanVisualizationActive
                target={scanConfig.target}
                nmapType={scanConfig.intensity ?? 'simple'}
                externalDone={externalDone}
                generatingReport={generatingReport}
                reportDev={reportDev}
                reportNonDev={reportNonDev}
                topOffset={0}
                onComplete={() => setSending(false)} />
            : <ScanVisualization
                target={scanConfig?.target ?? ''}
                externalDone={externalDone}
                generatingReport={generatingReport}
                reportDev={reportDev}
                reportNonDev={reportNonDev}
                topOffset={0}
                onComplete={() => setSending(false)} />
          }
        </div>
      )}

      {/* Phase: history loading */}
      {phase === 'history' && historyLoading && (
        <div style={{
          position: 'absolute', inset: '64px 0 0 0', display: 'flex',
          alignItems: 'center', justifyContent: 'center',
          fontFamily: 'system-ui, -apple-system, sans-serif', color: 'rgba(255,255,255,0.4)', fontSize: 15,
        }}>
          Loading report...
        </div>
      )}

      {/* Phase: history loaded */}
      {phase === 'history' && !historyLoading && historyMeta && (
        <div style={{ position: 'absolute', inset: '64px 0 0 0' }}>
          {historyMeta.scan_type === 'active'
            ? <ScanVisualizationActive
                target={historyMeta.target ?? ''}
                nmapType={historyMeta.scan_mode ?? 'simple'}
                externalDone={{}}
                generatingReport={false}
                reportDev={reportDev}
                reportNonDev={reportNonDev}
                topOffset={0}
                onComplete={() => {}} />
            : <ScanVisualization
                target={historyMeta.target ?? ''}
                externalDone={{}}
                generatingReport={false}
                reportDev={reportDev}
                reportNonDev={reportNonDev}
                topOffset={0}
                onComplete={() => {}} />
          }
        </div>
      )}

      {/* Phase: not found */}
      {phase === 'not_found' && (
        <div style={{
          position: 'absolute', inset: '64px 0 0 0', display: 'flex',
          alignItems: 'center', justifyContent: 'center',
          fontFamily: 'system-ui, -apple-system, sans-serif', color: 'rgba(255,255,255,0.4)', fontSize: 15,
        }}>
          Report not found.
        </div>
      )}

      {showWarning && (
        <WarningModal
          onConfirm={() => {
            setAuthorized(true)
            setShowWarning(false)
            scanStarted.current = false
          }}
          onCancel={() => {
            setShowWarning(false)
            navigate('/scan')
          }}
        />
      )}
    </div>
  )
}
