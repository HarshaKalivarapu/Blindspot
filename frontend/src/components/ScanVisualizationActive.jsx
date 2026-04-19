import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import ReactMarkdown from 'react-markdown'

const W = 1000
const H = 560
const BW = 152
const BH = 50
const BRX = 10
const CX = W / 2

const TOP_Y = 85
const BOT_Y = 400
const CONV_Y = TOP_Y + (BOT_Y - TOP_Y) * 0.48

// Tool IDs match the real MCP tool names so SSE events map directly
const SIMPLE_TOOLS = [
  { id: 'nikto',        label: 'Nikto' },
  { id: 'whatweb_active', label: 'WhatWeb' },
  { id: 'hydra',        label: 'Hydra' },
]
const AGGRESSIVE_TOOLS = [
  { id: 'nikto',        label: 'Nikto' },
  { id: 'whatweb_active', label: 'WhatWeb' },
  { id: 'hydra',        label: 'Hydra' },
  { id: 'ffuf',         label: 'FFuF' },
]

function toolXPositions(n) {
  if (n === 1) return [CX]
  const margin = 80
  const step = (W - margin * 2) / (n - 1)
  return Array.from({ length: n }, (_, i) => margin + i * step)
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)) }

function bezierLen(x1, y1, cx1, cy1, cx2, cy2, x2, y2, n = 60) {
  let len = 0, px = x1, py = y1
  for (let i = 1; i <= n; i++) {
    const t = i / n, mt = 1 - t
    const bx = mt**3*x1 + 3*mt**2*t*cx1 + 3*mt*t**2*cx2 + t**3*x2
    const by = mt**3*y1 + 3*mt**2*t*cy1 + 3*mt*t**2*cy2 + t**3*y2
    len += Math.sqrt((bx-px)**2 + (by-py)**2)
    px = bx; py = by
  }
  return len
}

function bezierPoint(t, x1, y1, cx1, cy1, cx2, cy2, x2, y2) {
  const mt = 1 - t
  return {
    x: mt**3*x1 + 3*mt**2*t*cx1 + 3*mt*t**2*cx2 + t**3*x2,
    y: mt**3*y1 + 3*mt**2*t*cy1 + 3*mt*t**2*cy2 + t**3*y2,
  }
}

function Branch({ x1, y1, x2, y2, progress, visible, noBadge = false, noDot = false }) {
  const dy = y2 - y1
  const cp1x = x1, cp1y = y1 + dy * 0.45
  const cp2x = x2, cp2y = y2 - dy * 0.45
  const d = `M ${x1} ${y1} C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${x2} ${y2}`
  const len = bezierLen(x1, y1, cp1x, cp1y, cp2x, cp2y, x2, y2)
  const p = clamp(progress, 0, 100)
  const offset = len * (1 - p / 100)
  const head = bezierPoint(p / 100, x1, y1, cp1x, cp1y, cp2x, cp2y, x2, y2)
  const showHead = !noBadge && p > 3 && p < 97

  return (
    <g style={{ opacity: visible ? 1 : 0, transition: 'opacity 0.45s ease' }}>
      <path d={d} fill="none" stroke="rgba(255,255,255,0.13)" strokeWidth={2} />
      <path d={d} fill="none" stroke="rgba(255,255,255,0.88)" strokeWidth={2}
        strokeDasharray={`${len} ${len}`} strokeDashoffset={offset}
        style={{ transition: 'stroke-dashoffset 0.12s linear' }} />
      {showHead && (
        <g>
          <circle cx={head.x} cy={head.y} r={14}
            fill="#070a0d" stroke="rgba(255,255,255,0.65)" strokeWidth={1.2} />
          <text x={head.x} y={head.y} textAnchor="middle" dominantBaseline="middle"
            fill="rgba(255,255,255,0.9)" fontSize={9} fontFamily="system-ui, sans-serif">
            {Math.round(p)}%
          </text>
        </g>
      )}
      {!noDot && p >= 97 && <circle cx={x2} cy={y2} r={4} fill="rgba(34,197,94,0.9)" />}
    </g>
  )
}

function Block({ label, done, wide }) {
  const bw = wide ? BW + 30 : BW
  return (
    <g>
      <rect x={-bw/2} y={-BH/2} width={bw} height={BH} rx={BRX}
        fill={done ? 'rgba(34,197,94,0.10)' : 'rgba(255,255,255,0.07)'}
        stroke={done ? 'rgba(34,197,94,0.55)' : 'rgba(255,255,255,0.22)'}
        strokeWidth={1} />
      <text textAnchor="middle" dominantBaseline="middle"
        fill="white" fontSize={13} fontFamily="system-ui, sans-serif"
        fontWeight={done ? 500 : 400}>{label}</text>
      {done && (
        <text x={bw/2-11} y={-BH/2+13} textAnchor="middle" dominantBaseline="middle"
          fill="rgba(34,197,94,1)" fontSize={11} fontFamily="system-ui, sans-serif">✓</text>
      )}
    </g>
  )
}

// ── Phases ────────────────────────────────────────────────────────────────────
// intro → nmap → tools → nvd → searchsploit → fading → report
// Only two layers visible at a time. Each block fades out when no longer needed.

function ReportViewActive({ content }) {
  const [tab, setTab] = useState('non-dev')
  return (
    <div>
      <div style={{ display: 'flex', background: 'rgba(0,0,0,0.3)', borderRadius: 12, padding: 6, marginBottom: 40, border: '1px solid rgba(255,255,255,0.05)', maxWidth: 360 }}>
        {[['non-dev', 'Non-Developer'], ['dev', 'Developer']].map(([key, label]) => (
          <button key={key} onClick={() => setTab(key)} style={{
            flex: 1, padding: '12px 0', borderRadius: 8, border: 'none',
            background: tab === key ? 'rgba(255,255,255,0.1)' : 'transparent',
            color: tab === key ? '#ffffff' : 'rgba(255,255,255,0.4)',
            fontFamily: 'system-ui, -apple-system, sans-serif',
            fontSize: 14, fontWeight: 500, cursor: 'pointer', transition: 'all 0.2s',
          }}>
            {label}
          </button>
        ))}
      </div>
      {content
        ? <ReactMarkdown components={mdComponents}>{content}</ReactMarkdown>
        : <p style={{ color: 'rgba(255,255,255,0.4)' }}>Scan complete — waiting for report...</p>
      }
    </div>
  )
}

const mdComponents = {
  h1: ({children}) => <h1 style={{fontSize:26,fontWeight:700,marginBottom:12,letterSpacing:'-0.02em',color:'#fff'}}>{children}</h1>,
  h2: ({children}) => <h2 style={{fontSize:20,fontWeight:600,marginTop:36,marginBottom:10,color:'rgba(255,255,255,0.95)',borderBottom:'1px solid rgba(255,255,255,0.08)',paddingBottom:8}}>{children}</h2>,
  h3: ({children}) => <h3 style={{fontSize:16,fontWeight:600,marginTop:20,marginBottom:6,color:'rgba(255,255,255,0.9)'}}>{children}</h3>,
  p: ({children}) => <p style={{marginBottom:12,color:'rgba(255,255,255,0.8)',lineHeight:1.75}}>{children}</p>,
  ul: ({children}) => <ul style={{paddingLeft:20,marginBottom:12}}>{children}</ul>,
  ol: ({children}) => <ol style={{paddingLeft:20,marginBottom:12}}>{children}</ol>,
  li: ({children}) => <li style={{marginBottom:4,color:'rgba(255,255,255,0.8)',lineHeight:1.7}}>{children}</li>,
  strong: ({children}) => <strong style={{color:'#fff',fontWeight:600}}>{children}</strong>,
  code: ({children}) => <code style={{background:'rgba(255,255,255,0.08)',padding:'2px 6px',borderRadius:4,fontSize:12,fontFamily:'monospace'}}>{children}</code>,
  hr: () => <hr style={{border:'none',borderTop:'1px solid rgba(255,255,255,0.1)',margin:'24px 0'}} />,
  blockquote: ({children}) => <blockquote style={{borderLeft:'3px solid rgba(255,255,255,0.2)',paddingLeft:16,margin:'16px 0',color:'rgba(255,255,255,0.6)'}}>{children}</blockquote>,
}

export default function ScanVisualizationActive({ target, nmapType = 'basic', onComplete, externalDone = {}, report = null, topOffset = 0 }) {
  const tools = nmapType === 'aggressive' ? AGGRESSIVE_TOOLS : SIMPLE_TOOLS
  const toolXs = toolXPositions(tools.length)
  const nmapLabel = nmapType === 'aggressive' ? 'NMAP Full Port Scan' : 'NMAP Basic Scan'

  const [phase, setPhase] = useState('intro')
  const [nmapProgress, setNmapProgress] = useState(0)
  const [nmapDone, setNmapDone] = useState(false)
  const [toolProgress, setToolProgress] = useState(Object.fromEntries(tools.map(t => [t.id, 0])))
  const [toolDone, setToolDone] = useState(Object.fromEntries(tools.map(t => [t.id, false])))
  const [convBranchProgress, setConvBranchProgress] = useState(0)
  const [nvdProgress, setNvdProgress] = useState(0)
  const [nvdDone, setNvdDone] = useState(false)
  const [searchsploitProgress, setSearchsploitProgress] = useState(0)
  const [searchsploitDone, setSearchsploitDone] = useState(false)
  const [showReport, setShowReport] = useState(false)

  const externalDoneRef = useRef(externalDone)
  useEffect(() => { externalDoneRef.current = externalDone }, [externalDone])

  // When real report arrives, fast-forward to showing it
  useEffect(() => {
    if (!report) return
    setSearchsploitDone(true)
    setNvdDone(true)
    setPhase('fading')
  }, [report])

  useEffect(() => {
    if (phase !== 'intro') return
    const t = setTimeout(() => setPhase('nmap'), 1200)
    return () => clearTimeout(t)
  }, [phase])

  useEffect(() => {
    if (phase !== 'nmap') return
    const duration = nmapType === 'aggressive' ? 4000 + Math.random() * 2000 : 2500 + Math.random() * 1500
    const start = Date.now()
    const iv = setInterval(() => {
      const forceDone = externalDoneRef.current['nmap']
      const p = forceDone ? 100 : Math.min(100, ((Date.now() - start) / duration) * 100)
      setNmapProgress(p)
      if (p >= 100) { clearInterval(iv); setNmapDone(true); setTimeout(() => setPhase('tools'), 700) }
    }, 50)
    return () => clearInterval(iv)
  }, [phase, nmapType])

  useEffect(() => {
    if (phase !== 'tools') return
    const durations = tools.map(() => 1500 + Math.random() * 2500)
    const start = Date.now()
    const iv = setInterval(() => {
      const elapsed = Date.now() - start
      const newProg = {}, newDone = {}
      let allDone = true
      tools.forEach((t, i) => {
        const forceDone = externalDoneRef.current[t.id]
        const p = forceDone ? 100 : Math.min(100, (elapsed / durations[i]) * 100)
        newProg[t.id] = p
        newDone[t.id] = p >= 100
        if (p < 100) allDone = false
      })
      setToolProgress(newProg)
      setToolDone(newDone)
      if (allDone) { clearInterval(iv); setTimeout(() => setPhase('nvd'), 700) }
    }, 50)
    return () => clearInterval(iv)
  }, [phase, tools.length])

  useEffect(() => {
    if (phase !== 'nvd') return
    const BRANCH_MS = 500
    const trunkDur = 2500 + Math.random() * 2000
    const start = Date.now()
    const iv = setInterval(() => {
      const elapsed = Date.now() - start
      const nvdConfirmed = externalDoneRef.current['nvd_lookup']
      const bp = nvdConfirmed ? 100 : Math.min(100, (elapsed / BRANCH_MS) * 100)
      const tp = nvdConfirmed ? 100 : elapsed > BRANCH_MS ? Math.min(100, ((elapsed - BRANCH_MS) / trunkDur) * 100) : 0
      setConvBranchProgress(bp)
      setNvdProgress(tp)
      if (tp >= 100) { clearInterval(iv); setNvdDone(true); setTimeout(() => setPhase('searchsploit'), 700) }
    }, 50)
    return () => clearInterval(iv)
  }, [phase])

  useEffect(() => {
    if (phase !== 'searchsploit') return
    const duration = 2000 + Math.random() * 2000
    const start = Date.now()
    const iv = setInterval(() => {
      const forceDone = externalDoneRef.current['searchsploit']
      const p = forceDone ? 100 : Math.min(100, ((Date.now() - start) / duration) * 100)
      setSearchsploitProgress(p)
      if (p >= 100) { clearInterval(iv); setSearchsploitDone(true); setTimeout(() => setPhase('fading'), 700) }
    }, 50)
    return () => clearInterval(iv)
  }, [phase])

  useEffect(() => {
    if (phase !== 'fading') return
    const t = setTimeout(() => { setShowReport(true); onComplete?.() }, 700)
    return () => clearTimeout(t)
  }, [phase, onComplete])

  // ── Per-block visibility and position ─────────────────────────────────────
  // Each block is visible only during the two phases it participates in.
  // Opacity drives fade in/out; y drives the top→bottom position shift.

  const ipVisible   = phase === 'intro' || phase === 'nmap'
  const ipY         = TOP_Y

  const nmapVisible = phase === 'nmap' || phase === 'tools'
  const nmapY       = phase === 'tools' ? TOP_Y : BOT_Y

  const toolVisible = phase === 'tools' || phase === 'nvd'
  const toolY       = phase === 'nvd' ? TOP_Y : BOT_Y

  const nvdVisible  = phase === 'nvd' || phase === 'searchsploit'
  const nvdY        = phase === 'searchsploit' ? TOP_Y : BOT_Y

  const ssVisible   = phase === 'searchsploit' || phase === 'fading'

  // Branch visibility: only draw branches relevant to the current phase
  const showNmapBranch  = phase === 'nmap'
  const showToolBranches = phase === 'tools'
  const showNvdBranches  = phase === 'nvd'
  const showSsBranch    = phase === 'searchsploit'

  return (
    <div style={{ position: 'fixed', top: topOffset, left: 0, right: 0, bottom: 0, background: '#070a0d' }}>
      <AnimatePresence>
        {!showReport && (
          <motion.div key="viz" style={{ width: '100%', height: '100%' }}
            exit={{ opacity: 0, transition: { duration: 0.8 } }}>
            <svg viewBox={`0 0 ${W} ${H}`} width="100%" height="100%"
              preserveAspectRatio="xMidYMid meet">

              {/* IP block */}
              <motion.g
                initial={{ x: CX, y: H/2, opacity: 0, scale: 1.3 }}
                animate={{ x: CX, y: ipY, opacity: ipVisible ? 1 : 0, scale: phase === 'intro' ? 1.3 : 1 }}
                transition={{ duration: 0.65, ease: 'easeInOut' }}>
                <Block label={target} wide />
              </motion.g>

              {/* NMAP branch (IP → NMAP) */}
              <Branch x1={CX} y1={TOP_Y + BH/2 + 4} x2={CX} y2={BOT_Y - BH/2 - 4}
                progress={nmapProgress} visible={showNmapBranch} />

              {/* NMAP block */}
              {phase !== 'intro' && (
                <motion.g
                  initial={{ x: CX, y: BOT_Y, opacity: 0 }}
                  animate={{ x: CX, y: nmapY, opacity: nmapVisible ? 1 : 0 }}
                  transition={{ duration: 0.55, ease: 'easeInOut', opacity: { duration: 0.35 } }}>
                  <Block label={nmapLabel} done={nmapDone} wide />
                </motion.g>
              )}

              {/* Tool branches (NMAP → tools) */}
              {tools.map((tool, i) => (
                <Branch key={`b-tool-${tool.id}`}
                  x1={CX} y1={TOP_Y + BH/2 + 4}
                  x2={toolXs[i]} y2={BOT_Y - BH/2 - 4}
                  progress={toolProgress[tool.id]}
                  visible={showToolBranches} />
              ))}

              {/* Tool blocks */}
              {phase !== 'intro' && phase !== 'nmap' && tools.map((tool, i) => (
                <motion.g key={`block-${tool.id}`}
                  initial={{ x: toolXs[i], y: BOT_Y, opacity: 0 }}
                  animate={{ x: toolXs[i], y: toolY, opacity: toolVisible ? 1 : 0 }}
                  transition={{ duration: 0.55, ease: 'easeInOut', opacity: { duration: 0.35 } }}>
                  <Block label={tool.label} done={toolDone[tool.id]} />
                </motion.g>
              ))}

              {/* NVD convergence branches (tools → NVD) */}
              {showNvdBranches && (
                <g>
                  {toolXs.map((tx, i) => (
                    <Branch key={`conv-${i}`}
                      x1={tx} y1={TOP_Y + BH/2 + 4} x2={CX} y2={CONV_Y}
                      progress={convBranchProgress} noBadge noDot visible />
                  ))}
                  <Branch x1={CX} y1={CONV_Y} x2={CX} y2={BOT_Y - BH/2 - 4}
                    progress={nvdProgress} visible />
                </g>
              )}

              {/* NVD block */}
              {phase !== 'intro' && phase !== 'nmap' && phase !== 'tools' && (
                <motion.g
                  initial={{ x: CX, y: BOT_Y, opacity: 0 }}
                  animate={{ x: CX, y: nvdY, opacity: nvdVisible ? 1 : 0 }}
                  transition={{ duration: 0.4 }}>
                  <Block label="NVD CVE Lookup" done={nvdDone} />
                </motion.g>
              )}

              {/* Searchsploit branch (NVD → searchsploit) */}
              <Branch x1={CX} y1={TOP_Y + BH/2 + 4} x2={CX} y2={BOT_Y - BH/2 - 4}
                progress={searchsploitProgress} visible={showSsBranch} />

              {/* Searchsploit block */}
              {phase !== 'intro' && phase !== 'nmap' && phase !== 'tools' && phase !== 'nvd' && (
                <motion.g
                  initial={{ x: CX, y: BOT_Y, opacity: 0 }}
                  animate={{ x: CX, y: BOT_Y, opacity: ssVisible ? 1 : 0 }}
                  transition={{ duration: 0.4 }}>
                  <Block label="searchsploit" done={searchsploitDone} />
                </motion.g>
              )}

            </svg>
          </motion.div>
        )}

        {showReport && (
          <motion.div key="report"
            initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            style={{ position: 'absolute', inset: 0, overflowY: 'auto',
              padding: '48px 12%', color: 'white',
              fontFamily: 'system-ui, sans-serif', fontSize: 14, lineHeight: 1.75 }}>
            <ReportViewActive content={report} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
