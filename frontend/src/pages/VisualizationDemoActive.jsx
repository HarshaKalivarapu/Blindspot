import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import ScanVisualizationActive from '../components/ScanVisualizationActive'

export default function VisualizationDemoActive() {
  const [started, setStarted] = useState(false)
  const [target, setTarget] = useState('example.com')
  const [nmapType, setNmapType] = useState('basic')
  const [key, setKey] = useState(0)

  const handleStart = () => { setKey(k => k + 1); setStarted(true) }

  return (
    <div style={{ position: 'fixed', inset: 0, background: '#070a0d' }}>
      <AnimatePresence mode="wait">
        {!started ? (
          <motion.div key="launcher"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            style={{ display: 'flex', flexDirection: 'column', alignItems: 'center',
              justifyContent: 'center', height: '100%', gap: 20,
              fontFamily: 'system-ui, sans-serif' }}>

            <h1 style={{ color: 'white', fontSize: 28, fontWeight: 600,
              letterSpacing: '-0.02em', margin: 0 }}>
              Active Scan Visualization Demo
            </h1>
            <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 14, margin: 0 }}>
              Watch the active scan pipeline animate in real time.
            </p>

            <input type="text" value={target} onChange={e => setTarget(e.target.value)}
              placeholder="Target domain or IP"
              style={{ background: 'rgba(255,255,255,0.05)',
                border: '1px solid rgba(255,255,255,0.15)', borderRadius: 8,
                padding: '12px 20px', color: 'white', fontFamily: 'system-ui, sans-serif',
                fontSize: 15, outline: 'none', width: 320, textAlign: 'center' }} />

            <div style={{ display: 'flex', gap: 12 }}>
              {['basic', 'aggressive'].map(type => (
                <button key={type} onClick={() => setNmapType(type)}
                  style={{ padding: '10px 24px', borderRadius: 8, cursor: 'pointer',
                    fontFamily: 'system-ui, sans-serif', fontSize: 14, fontWeight: 500,
                    background: nmapType === type ? 'rgba(255,255,255,0.12)' : 'rgba(255,255,255,0.04)',
                    border: `1px solid ${nmapType === type ? 'rgba(255,255,255,0.4)' : 'rgba(255,255,255,0.15)'}`,
                    color: 'white' }}>
                  {type === 'basic' ? 'Simple Scan' : 'Aggressive Scan'}
                </button>
              ))}
            </div>

            <motion.button onClick={handleStart}
              whileHover={{ backgroundColor: '#ffffff', color: '#070a0d' }}
              initial={{ backgroundColor: 'rgba(255,255,255,0.07)', color: '#ffffff' }}
              transition={{ duration: 0.2 }}
              style={{ padding: '12px 40px', border: '1px solid rgba(255,255,255,0.2)',
                borderRadius: 8, fontFamily: 'system-ui, sans-serif',
                fontSize: 15, fontWeight: 500, cursor: 'pointer' }}>
              Start Demo
            </motion.button>
          </motion.div>
        ) : (
          <motion.div key={`viz-${key}`}
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            style={{ width: '100%', height: '100%', position: 'relative' }}>
            <ScanVisualizationActive
              target={target || 'example.com'}
              nmapType={nmapType}
              onComplete={() => {}} />
            <button onClick={() => setStarted(false)}
              style={{ position: 'fixed', top: 20, right: 24,
                background: 'rgba(255,255,255,0.05)',
                border: '1px solid rgba(255,255,255,0.15)', borderRadius: 6,
                color: 'rgba(255,255,255,0.5)', fontFamily: 'system-ui, sans-serif',
                fontSize: 12, padding: '6px 14px', cursor: 'pointer', zIndex: 100 }}>
              ← Reset
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
