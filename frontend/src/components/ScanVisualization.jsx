import { useState, useEffect, useRef, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'framer-motion'
import ReportRenderer from './ReportRenderer'

const ARROW_H = 12
const BAR_W = 10

// ── SVG canvas dimensions ────────────────────────────────────────────────────
const W = 1000
const H = 560

// ── Block dimensions ─────────────────────────────────────────────────────────
const BW = 152   // block width
const BH = 50    // block height
const BRX = 10   // border radius

// ── Layout constants ──────────────────────────────────────────────────────────
const TARGET_CX = W / 2
const TARGET_CY_INTRO = H / 2
const TARGET_CY_TOP = 85

const TOOL_X = [90, 275, 500, 725, 910]
const TOOL_CY_TOOLS = 370   // y when tools are in second layer
const TOOL_CY_NVD = 85      // y when tools move to top for NVD phase

const NVD_CX = W / 2
const NVD_CY = 420

const TOOLS = [
  { id: 'shodan',       label: 'Shodan API',   estimate: '~3s'  },
  { id: 'whatweb',      label: 'WhatWeb',       estimate: '~8s'  },
  { id: 'dns_whois',    label: 'DNS & WHOIS',   estimate: '~12s' },
  { id: 'ssl_tls',      label: 'SSL / TLS',     estimate: '~18s' },
  { id: 'http_headers', label: 'HTTP Headers',  estimate: '~5s'  },
]

// Generate a keyframe animation profile with a realistic stall zone.
// Returns an array of {t, p} waypoints: given elapsed ms → visual progress %.
function generateKeyframes() {
  const stallAt    = 20 + Math.random() * 45   // stall starts between 20–65%
  const stallDur   = 3000 + Math.random() * 5000  // stall lasts 3–8 seconds
  const preDur     = 600  + Math.random() * 1200  // time to reach stall point
  const postDur    = 500  + Math.random() * 1000  // time to finish after stall

  return [
    { t: 0,                            p: 0 },
    { t: preDur,                       p: stallAt },
    { t: preDur + stallDur,            p: stallAt + 2 + Math.random() * 3 }, // barely moves during stall
    { t: preDur + stallDur + postDur,  p: 100 },
  ]
}

function interpolateKeyframes(elapsed, kf) {
  if (elapsed >= kf[kf.length - 1].t) return 100
  for (let i = 1; i < kf.length; i++) {
    if (elapsed <= kf[i].t) {
      const { t: t0, p: p0 } = kf[i - 1]
      const { t: t1, p: p1 } = kf[i]
      const frac = (elapsed - t0) / (t1 - t0)
      return p0 + (p1 - p0) * frac
    }
  }
  return 100
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function clamp(v, lo, hi) {
  return Math.max(lo, Math.min(hi, v))
}

// Approximate arc length of a cubic bezier by sampling
function bezierLen(x1, y1, cx1, cy1, cx2, cy2, x2, y2, samples = 60) {
  let len = 0
  let px = x1, py = y1
  for (let i = 1; i <= samples; i++) {
    const t = i / samples
    const mt = 1 - t
    const bx = mt**3*x1 + 3*mt**2*t*cx1 + 3*mt*t**2*cx2 + t**3*x2
    const by = mt**3*y1 + 3*mt**2*t*cy1 + 3*mt*t**2*cy2 + t**3*y2
    len += Math.sqrt((bx - px)**2 + (by - py)**2)
    px = bx; py = by
  }
  return len
}

// Point at parametric t along a cubic bezier
function bezierPoint(t, x1, y1, cx1, cy1, cx2, cy2, x2, y2) {
  const mt = 1 - t
  return {
    x: mt**3*x1 + 3*mt**2*t*cx1 + 3*mt*t**2*cx2 + t**3*x2,
    y: mt**3*y1 + 3*mt**2*t*cy1 + 3*mt*t**2*cy2 + t**3*y2,
  }
}

// ── Branch (curved animated progress bar) ────────────────────────────────────
// Control points create an S-curve: the line leaves its start vertically,
// then curves to arrive at the destination vertically — like tree branches.
function Branch({ x1, y1, x2, y2, progress, visible, curvePull = 0, noBadge = false, noDot = false }) {
  const dy = y2 - y1
  // curvePull offsets CP1 right and CP2 left to force a visible S-curve
  // when x1 === x2 (pure vertical), otherwise 0 keeps the natural tree shape
  const cp1x = x1 + curvePull, cp1y = y1 + dy * 0.45
  const cp2x = x2 - curvePull, cp2y = y2 - dy * 0.45

  const d = `M ${x1} ${y1} C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${x2} ${y2}`
  const len = bezierLen(x1, y1, cp1x, cp1y, cp2x, cp2y, x2, y2)

  const p = clamp(progress, 0, 100)
  const offset = len * (1 - p / 100)

  // Head position: use t ≈ p/100 (close enough visually for smooth curves)
  const head = bezierPoint(p / 100, x1, y1, cp1x, cp1y, cp2x, cp2y, x2, y2)
  const showHead = !noBadge && p > 3 && p < 97

  return (
    <g style={{ opacity: visible ? 1 : 0, transition: 'opacity 0.5s ease' }}>
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

// ── SVG block with label ──────────────────────────────────────────────────────
function Block({ label, done, wide, estimate }) {
  const bw = wide ? BW + 30 : BW
  return (
    <g>
      <rect
        x={-bw / 2} y={-BH / 2}
        width={bw} height={BH}
        rx={BRX}
        fill={done ? 'rgba(34,197,94,0.10)' : 'rgba(255,255,255,0.07)'}
        stroke={done ? 'rgba(34,197,94,0.55)' : 'rgba(255,255,255,0.22)'}
        strokeWidth={1}
      />
      <text
        textAnchor="middle" dominantBaseline="middle"
        fill="white" fontSize={13}
        fontFamily="system-ui, sans-serif"
        fontWeight={done ? 500 : 400}
        y={estimate && !done ? -6 : 0}
      >
        {label}
      </text>
      {estimate && !done && (
        <text y={9} textAnchor="middle" dominantBaseline="middle"
          fill="rgba(255,255,255,0.28)" fontSize={9}
          fontFamily="system-ui, sans-serif">
          est. {estimate}
        </text>
      )}
      {done && (
        <text
          x={bw / 2 - 11} y={-BH / 2 + 13}
          textAnchor="middle" dominantBaseline="middle"
          fill="rgba(34,197,94,1)"
          fontSize={11}
          fontFamily="system-ui, sans-serif"
        >
          ✓
        </text>
      )}
    </g>
  )
}

// ── Report generation progress bars ──────────────────────────────────────────
function ReportProgress({ label, current, estimated }) {
  const pct = Math.min(95, (current / estimated) * 100)
  return (
    <div style={{ width: 320, display: 'flex', flexDirection: 'column', gap: 7 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'rgba(255,255,255,0.5)', fontFamily: 'system-ui, sans-serif' }}>
        <span>{label}</span>
        <span style={{ fontFamily: 'system-ui, sans-serif', fontSize: 11 }}>{current > 0 ? `${current.toLocaleString()} chars` : 'waiting...'}</span>
      </div>
      <div style={{ height: 5, background: 'rgba(255,255,255,0.08)', borderRadius: 3, overflow: 'hidden' }}>
        <motion.div
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
          style={{ height: '100%', background: 'rgba(255,255,255,0.45)', borderRadius: 3 }}
        />
      </div>
    </div>
  )
}

// ── Main visualization component ──────────────────────────────────────────────
function ReportView({ reportNonDev, reportDev, devChunkLen, nondevChunkLen, onTabChange }) {
  const [tab, setTab] = useState('non-dev')
  const content = tab === 'dev' ? reportDev : reportNonDev
  const chunkLen = tab === 'dev' ? devChunkLen : nondevChunkLen
  const estimated = tab === 'dev' ? 10000 : 8000

  function handleTab(key) {
    setTab(key)
    onTabChange?.(key)
  }

  return (
    <div>
      <div style={{ display: 'flex', background: 'rgba(0,0,0,0.3)', borderRadius: 12, padding: 6, marginBottom: 40, border: '1px solid rgba(255,255,255,0.05)', maxWidth: 360, margin: '0 auto 40px' }}>
        {[['non-dev', 'Non-Developer'], ['dev', 'Developer']].map(([key, label]) => (
          <button key={key} onClick={() => handleTab(key)} style={{
            flex: 1, padding: '12px 0', borderRadius: 8, border: 'none',
            background: tab === key ? 'rgba(255,255,255,0.1)' : 'transparent',
            color: tab === key ? '#ffffff' : 'rgba(255,255,255,0.4)',
            fontFamily: 'system-ui, sans-serif',
            fontSize: 14, fontWeight: 500, cursor: 'pointer', transition: 'all 0.2s',
          }}>
            {label}
          </button>
        ))}
      </div>
      {content ? (
        <ReportRenderer jsonString={content} />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '80px 0', gap: 24 }}>
          <motion.div
            animate={{ opacity: [0.4, 1, 0.4] }}
            transition={{ duration: 1.6, repeat: Infinity, ease: 'easeInOut' }}
            style={{ fontSize: 16, color: 'rgba(255,255,255,0.6)', fontFamily: 'system-ui, sans-serif', letterSpacing: '0.02em' }}
          >
            Generating report...
          </motion.div>
          <ReportProgress
            label={tab === 'dev' ? 'Developer Report' : 'Non-Developer Report'}
            current={chunkLen}
            estimated={estimated}
          />
        </div>
      )}
    </div>
  )
}

// externalDone: { [toolId]: boolean } — tools confirmed done by real SSE events
// externalRunning: { [toolId]: boolean } — tools confirmed started by real SSE events
// report: the actual markdown report text from the backend
export default function ScanVisualization({ target, onComplete, onTabChange, externalDone = {}, externalRunning = {}, generatingReport = false, reportDev = null, reportNonDev = null, devChunkLen = 0, nondevChunkLen = 0, topOffset = 0 }) {
  const report = reportNonDev || reportDev  // trigger on whichever arrives first
  const [phase, setPhase] = useState('intro')
  const [toolProgress, setToolProgress] = useState(
    Object.fromEntries(TOOLS.map(t => [t.id, 0]))
  )
  const [toolDone, setToolDone] = useState(
    Object.fromEntries(TOOLS.map(t => [t.id, false]))
  )
  const [convBranchProgress, setConvBranchProgress] = useState(0)
  const [trunkProgress, setTrunkProgress] = useState(0)
  const [nvdDone, setNvdDone] = useState(false)
  const [showReport, setShowReport] = useState(false)

  const scrollRef = useRef(null)
  const [thumbTop, setThumbTop] = useState(0)
  const [thumbHeight, setThumbHeight] = useState(0)

  const updateThumb = useCallback(() => {
    const el = scrollRef.current
    if (!el || el.scrollHeight <= el.clientHeight) { setThumbHeight(0); return }
    const trackH = el.clientHeight - 2 * ARROW_H
    const ratio = el.clientHeight / el.scrollHeight
    const th = Math.max(trackH * ratio, 24)
    const maxScroll = el.scrollHeight - el.clientHeight
    const scrollRatio = maxScroll > 0 ? el.scrollTop / maxScroll : 0
    setThumbHeight(th)
    setThumbTop(ARROW_H + scrollRatio * (trackH - th))
  }, [])

  useEffect(() => {
    if (showReport) updateThumb()
  }, [showReport, reportDev, reportNonDev, updateThumb])

  // Keep refs so intervals always read the latest external state without stale closures
  const externalDoneRef = useRef(externalDone)
  useEffect(() => { externalDoneRef.current = externalDone }, [externalDone])
  const externalRunningRef = useRef(externalRunning)
  useEffect(() => { externalRunningRef.current = externalRunning }, [externalRunning])

  // When report generation starts, snap all tools done and advance to nvd phase
  useEffect(() => {
    if (!generatingReport || report) return
    setToolProgress(Object.fromEntries(TOOLS.map(t => [t.id, 100])))
    setToolDone(Object.fromEntries(TOOLS.map(t => [t.id, true])))
    if (phase === 'tools' || phase === 'intro') setPhase('nvd')
  }, [generatingReport]) // eslint-disable-line react-hooks/exhaustive-deps

  // When the real report arrives, fast-forward to showing it
  useEffect(() => {
    if (!report) return
    setNvdDone(true)
    setPhase('fading')
  }, [report])

  // intro → tools
  useEffect(() => {
    if (phase !== 'intro') return
    const t = setTimeout(() => setPhase('tools'), 1200)
    return () => clearTimeout(t)
  }, [phase])

  // tools: keyframe-based animation with stall zones for realism.
  // Each tool's animation starts only when its "Running X..." SSE event arrives.
  // Falls back to starting after 5s so the visualization never gets stuck.
  useEffect(() => {
    if (phase !== 'tools') return

    const keyframes = TOOLS.map(() => generateKeyframes())
    const toolStartTimes = {}  // { [toolId]: timestamp } — when animation began for each tool
    const phaseStart = Date.now()

    const interval = setInterval(() => {
      const now = Date.now()
      const elapsedPhase = now - phaseStart
      const newProgress = {}
      const newDone = {}
      let allDone = true

      TOOLS.forEach((tool, i) => {
        const forceDone = externalDoneRef.current[tool.id]
        if (forceDone) {
          newProgress[tool.id] = 100
          newDone[tool.id] = true
          return
        }

        // Start this tool's animation when SSE says it's running, or after 5s fallback
        const isRunning = externalRunningRef.current[tool.id] || elapsedPhase > 5000
        if (!isRunning) {
          newProgress[tool.id] = toolProgress[tool.id] ?? 0
          newDone[tool.id] = false
          allDone = false
          return
        }

        if (!toolStartTimes[tool.id]) toolStartTimes[tool.id] = now
        const elapsed = now - toolStartTimes[tool.id]
        const p = interpolateKeyframes(elapsed, keyframes[i])
        newProgress[tool.id] = p
        newDone[tool.id] = p >= 100
        if (p < 100) allDone = false
      })

      setToolProgress(newProgress)
      setToolDone(newDone)

      if (allDone) {
        clearInterval(interval)
        setTimeout(() => setPhase('nvd'), 700)
      }
    }, 50)

    return () => clearInterval(interval)
  }, [phase]) // eslint-disable-line react-hooks/exhaustive-deps

  // nvd: branches fill in 500ms, trunk fills over 18-26s (matches report generation time).
  // Snaps to done immediately if nvd_lookup is confirmed complete externally.
  useEffect(() => {
    if (phase !== 'nvd') return

    const BRANCH_MS = 500
    const trunkDuration = 18000 + Math.random() * 8000
    const start = Date.now()

    const interval = setInterval(() => {
      const elapsed = Date.now() - start
      const nvdConfirmed = externalDoneRef.current['nvd_lookup']

      const bp = nvdConfirmed ? 100 : Math.min(100, (elapsed / BRANCH_MS) * 100)
      const tp = nvdConfirmed
        ? 100
        : elapsed > BRANCH_MS
          ? Math.min(100, ((elapsed - BRANCH_MS) / trunkDuration) * 100)
          : 0

      setConvBranchProgress(bp)
      setTrunkProgress(tp)

      if (tp >= 100) {
        clearInterval(interval)
        setNvdDone(true)
        setTimeout(() => setPhase('fading'), 700)
      }
    }, 50)

    return () => clearInterval(interval)
  }, [phase])

  // fading → transition to report screen (animation done; report data may still be loading)
  useEffect(() => {
    if (phase !== 'fading') return
    const t = setTimeout(() => {
      setShowReport(true)
      onComplete?.()
    }, 700)
    return () => clearTimeout(t)
  }, [phase, onComplete])

  const inNvdPhase = phase === 'nvd' || phase === 'fading'
  const toolCY = inNvdPhase ? TOOL_CY_NVD : TOOL_CY_TOOLS

  const toolBranchY1 = TARGET_CY_TOP + BH / 2 + 4
  const toolBranchY2 = TOOL_CY_TOOLS - BH / 2 - 4

  const convY = TOOL_CY_NVD + (NVD_CY - TOOL_CY_NVD) * 0.48
  const nvdBranchY1 = TOOL_CY_NVD + BH / 2 + 4
  const trunkY2 = NVD_CY - BH / 2 - 4

  return (
    <div style={{ position: 'fixed', top: topOffset, left: 0, right: 0, bottom: 0, background: 'transparent' }}>
      <AnimatePresence>
        {!showReport && (
          <motion.div
            key="viz"
            style={{ width: '100%', height: '100%', position: 'relative' }}
            exit={{ opacity: 0, transition: { duration: 0.8 } }}
          >
            <svg
              viewBox={`0 0 ${W} ${H}`}
              width="100%" height="100%"
              preserveAspectRatio="xMidYMid meet"
            >
              {/* ── Target block ── */}
              <motion.g
                initial={{ x: TARGET_CX, y: TARGET_CY_INTRO, opacity: 0, scale: 1.3 }}
                animate={{
                  x: TARGET_CX,
                  y: inNvdPhase ? TARGET_CY_INTRO : TARGET_CY_TOP,
                  opacity: inNvdPhase ? 0 : 1,
                  scale: phase === 'intro' ? 1.3 : 1,
                }}
                transition={{ duration: 0.65, ease: 'easeInOut' }}
              >
                <Block label={target} done={false} wide />
              </motion.g>

              {/* ── Tool → target branches (tools phase) ── */}
              {phase !== 'intro' && TOOLS.map((tool, i) => (
                <Branch
                  key={`branch-tool-${tool.id}`}
                  x1={TARGET_CX}
                  y1={toolBranchY1}
                  x2={TOOL_X[i]}
                  y2={toolBranchY2}
                  progress={toolProgress[tool.id]}
                  visible={!inNvdPhase}
                />
              ))}

              {/* ── Tool blocks ── */}
              {phase !== 'intro' && TOOLS.map((tool, i) => (
                <motion.g
                  key={`block-tool-${tool.id}`}
                  initial={{ x: TOOL_X[i], y: TOOL_CY_TOOLS, opacity: 0 }}
                  animate={{
                    x: TOOL_X[i],
                    y: toolCY,
                    opacity: 1,
                  }}
                  transition={{ duration: 0.55, ease: 'easeInOut', opacity: { duration: 0.35 } }}
                >
                  <Block label={tool.label} done={toolDone[tool.id]} estimate={tool.estimate} />
                </motion.g>
              ))}

              {/* ── NVD phase: 5 lines converge to a point, then single trunk to NVD ── */}
              {inNvdPhase && (
                <g>
                  {TOOL_X.map((tx, i) => (
                    <Branch key={`conv-${i}`}
                      x1={tx} y1={nvdBranchY1}
                      x2={NVD_CX} y2={convY}
                      progress={convBranchProgress}
                      noBadge noDot
                      visible />
                  ))}
                  <Branch
                    x1={NVD_CX} y1={convY}
                    x2={NVD_CX} y2={trunkY2}
                    progress={trunkProgress}
                    visible />
                </g>
              )}

              {/* ── NVD block ── */}
              {inNvdPhase && (
                <motion.g
                  initial={{ x: NVD_CX, y: NVD_CY, opacity: 0 }}
                  animate={{ x: NVD_CX, y: NVD_CY, opacity: 1 }}
                  transition={{ duration: 0.4 }}
                >
                  <Block label="NVD CVE Lookup" done={nvdDone} />
                </motion.g>
              )}

            </svg>
          </motion.div>
        )}

        {showReport && (
          <motion.div
            key="report"
            ref={scrollRef}
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="pentest-scrollbar-report"
            onScroll={updateThumb}
            style={{
              position: 'absolute',
              inset: 0,
              overflowY: 'auto',
              overscrollBehavior: 'contain',
              padding: '104px 0 64px',
              color: 'white',
              fontFamily: 'system-ui, sans-serif',
              fontSize: 14,
              lineHeight: 1.75,
            }}
          >
            <div style={{ width: '100%', maxWidth: 1000, margin: '0 auto', padding: '0 32px' }}>
              <ReportView reportNonDev={reportNonDev} reportDev={reportDev} devChunkLen={devChunkLen} nondevChunkLen={nondevChunkLen} onTabChange={onTabChange} />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      {showReport && createPortal(
        <div style={{ position: 'fixed', top: 0, right: 0, width: BAR_W, height: '100vh', zIndex: 51, pointerEvents: 'none' }}>
          <motion.button
            whileHover={{ backgroundColor: 'rgba(156, 163, 175, 0.25)' }}
            onClick={() => scrollRef.current?.scrollBy({ top: -80, behavior: 'smooth' })}
            style={{
              position: 'absolute', top: 0, left: 0, right: 0, height: ARROW_H,
              backgroundColor: 'rgba(156, 163, 175, 0.1)',
              border: 'none', cursor: 'pointer', padding: 0,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              pointerEvents: 'auto',
            }}
          >
            <svg width="6" height="4" viewBox="0 0 6 4"><polygon points="3,0 6,4 0,4" fill="rgba(156,163,175,0.75)" /></svg>
          </motion.button>
          <motion.div
            animate={{ top: thumbTop, height: thumbHeight }}
            transition={{ duration: 0.1, ease: 'easeOut' }}
            style={{
              position: 'absolute', left: 0, right: 0, borderRadius: 2,
              background: thumbHeight > 0 ? 'rgba(156, 163, 175, 0.35)' : 'transparent',
            }}
          />
          <motion.button
            whileHover={{ backgroundColor: 'rgba(156, 163, 175, 0.25)' }}
            onClick={() => scrollRef.current?.scrollBy({ top: 80, behavior: 'smooth' })}
            style={{
              position: 'absolute', bottom: 0, left: 0, right: 0, height: ARROW_H,
              backgroundColor: 'rgba(156, 163, 175, 0.1)',
              border: 'none', cursor: 'pointer', padding: 0,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              pointerEvents: 'auto',
            }}
          >
            <svg width="6" height="4" viewBox="0 0 6 4"><polygon points="3,4 6,0 0,0" fill="rgba(156,163,175,0.75)" /></svg>
          </motion.button>
        </div>,
        document.body
      )}
    </div>
  )
}
