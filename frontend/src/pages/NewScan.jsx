import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

const DESCRIPTIONS = {
  passive: 'A safe background check. We just look up public records to see what hackers can easily find out about your website online. We don\'t actually touch your servers.',
  active: 'A real stress test. We actively poke at your website\'s code and knock on its virtual doors to see if anything breaks. Important: Only use this on sites you actually own!',
  simple: 'A quick health check. We only test the main areas where standard web apps usually live. Fast, lightweight, and catches the most obvious setup mistakes.',
  aggressive: 'The deep dive. We check every single possible hidden entryway into your server. It takes way longer, but leaves absolutely no stone unturned.',
}

function RadioOption({ value, label, description, selected, onChange }) {
  return (
    <label
      style={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: 12,
        cursor: 'pointer',
        padding: '14px 18px',
        background: selected ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.02)',
        border: `1px solid ${selected ? 'rgba(255,255,255,0.3)' : 'rgba(255,255,255,0.08)'}`,
        borderRadius: 8,
        transition: 'all 0.2s',
      }}
      onClick={() => onChange(value)}
      onMouseEnter={(e) => { if (!selected) e.currentTarget.style.background = 'rgba(255,255,255,0.05)' }}
      onMouseLeave={(e) => { if (!selected) e.currentTarget.style.background = 'rgba(255,255,255,0.02)' }}
    >
      <div style={{
        marginTop: 2, width: 14, height: 14, borderRadius: '50%',
        border: `1px solid ${selected ? '#ffffff' : 'rgba(255,255,255,0.3)'}`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        flexShrink: 0, transition: 'border-color 0.15s',
      }}>
        {selected && <div style={{ width: 6, height: 6, borderRadius: '50%', backgroundColor: '#ffffff' }} />}
      </div>
      <div>
        <div style={{ fontFamily: 'system-ui, -apple-system, sans-serif', fontSize: 14, fontWeight: 500, color: selected ? '#ffffff' : 'rgba(255,255,255,0.7)', marginBottom: 4 }}>
          {label}
        </div>
        <div style={{ fontFamily: 'system-ui, -apple-system, sans-serif', fontSize: 13, color: 'rgba(255,255,255,0.45)', lineHeight: 1.4 }}>
          {description}
        </div>
      </div>
    </label>
  )
}

export default function NewScan({ onSubmit, onBack }) {
  const [target, setTarget] = useState('')
  const [level, setLevel] = useState('passive')
  const [intensity, setIntensity] = useState('simple')

  const isValidIPv4 = (v) =>
    /^(\d{1,3}\.){3}\d{1,3}$/.test(v) && v.split('.').every((n) => Number(n) >= 0 && Number(n) <= 255)

  const isValidDomain = (v) =>
    /^(?!-)[a-zA-Z0-9-]{1,63}(?<!-)(\.[a-zA-Z0-9-]{1,63})*\.[a-zA-Z]{2,}$/.test(v)

  const trimmed = target.trim()
  const hasProtocol = /^https?:\/\//i.test(trimmed)
  const hasPath = /[/?#]/.test(trimmed.replace(/^https?:\/\//i, ''))
  const clean = trimmed.replace(/^https?:\/\//i, '').split(/[/?#]/)[0]

  let targetError = null
  if (trimmed.length > 0) {
    if (hasProtocol) targetError = 'Remove the http:// or https:// prefix — enter the host only'
    else if (hasPath) targetError = 'Remove any path or query string — enter the host only'
    else if (!isValidIPv4(clean) && !isValidDomain(clean))
      targetError = 'Must be a valid IP address (e.g. 192.168.1.1) or domain (e.g. yoursite.com)'
  }

  const canSubmit = trimmed.length > 0 && !targetError

  const handleSubmit = (e) => {
    e?.preventDefault()
    if (!canSubmit) return
    onSubmit({ target: trimmed, level, intensity: level === 'active' ? intensity : null })
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        padding: '64px 32px',
        zIndex: 1,
      }}
    >
      <div style={{ width: '100%', maxWidth: 640 }}>
        <h1 style={{ fontFamily: 'system-ui, -apple-system, sans-serif', fontSize: 32, fontWeight: 600, color: '#ffffff', marginBottom: 32, letterSpacing: '-0.02em' }}>
          New Scan Configuration
        </h1>

        <form onSubmit={handleSubmit} style={{ background: 'rgba(0,0,0,0.3)', backdropFilter: 'blur(16px)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12, padding: 32 }}>
          {/* Target Input */}
          <div style={{ marginBottom: 32 }}>
            <label style={{ display: 'block', fontFamily: 'system-ui, -apple-system, sans-serif', fontSize: 13, fontWeight: 500, color: 'rgba(255,255,255,0.7)', marginBottom: 8 }}>
              Target
            </label>
            <input
              type="text"
              value={target}
              onChange={(e) => setTarget(e.target.value)}
              placeholder="IP address or domain (e.g. 192.168.1.1)"
              style={{
                width: '100%', boxSizing: 'border-box',
                background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.15)',
                borderRadius: 8, padding: '12px 16px',
                fontFamily: 'system-ui, -apple-system, sans-serif', fontSize: 14, color: '#ffffff',
                outline: 'none', transition: 'border-color 0.2s',
              }}
              onFocus={(e) => (e.target.style.borderColor = 'rgba(255,255,255,0.5)')}
              onBlur={(e) => (e.target.style.borderColor = targetError ? 'rgba(248,113,113,0.6)' : 'rgba(255,255,255,0.15)')}
            />
            <AnimatePresence>
              {targetError && (
                <motion.p
                  key="target-err"
                  initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }}
                  transition={{ duration: 0.15 }}
                  style={{ margin: '6px 0 0', color: '#f87171', fontSize: 12, fontFamily: 'system-ui, -apple-system, sans-serif' }}
                >
                  ⚠ {targetError}
                </motion.p>
              )}
            </AnimatePresence>
            <div style={{ marginTop: 10, color: 'rgba(255,255,255,0.3)', fontSize: 12, fontFamily: 'system-ui, -apple-system, sans-serif', lineHeight: 1.8 }}>
              <p style={{ margin: '0 0 2px' }}>Valid formats:</p>
              <ul style={{ margin: 0, paddingLeft: 16 }}>
                <li>IPv4 — 4 numbers from 0–255 separated by dots <span style={{ opacity: 0.6 }}>(e.g. 192.168.1.1)</span></li>
                <li>Domain — letters, numbers, hyphens, and dots <span style={{ opacity: 0.6 }}>(e.g. yoursite.com)</span></li>
                <li>No <code style={{ fontFamily: 'monospace', fontSize: 11 }}>http://</code> prefix or trailing path</li>
              </ul>
            </div>
          </div>

          {/* Mode Select */}
          <div style={{ marginBottom: level === 'active' ? 24 : 32 }}>
            <label style={{ display: 'block', fontFamily: 'system-ui, -apple-system, sans-serif', fontSize: 13, fontWeight: 500, color: 'rgba(255,255,255,0.7)', marginBottom: 12 }}>
              Scan Mode
            </label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <RadioOption value="passive" label="Passive Reconnaissance" description={DESCRIPTIONS.passive} selected={level === 'passive'} onChange={setLevel} />
              <RadioOption value="active" label="Active Reconnaissance" description={DESCRIPTIONS.active} selected={level === 'active'} onChange={setLevel} />
            </div>
          </div>

          {/* Intensity Select */}
          <AnimatePresence>
            {level === 'active' && (
              <motion.div
                initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.2 }} style={{ overflow: 'hidden' }}
              >
                <div style={{ paddingBottom: 32 }}>
                  <label style={{ display: 'block', fontFamily: 'system-ui, -apple-system, sans-serif', fontSize: 13, fontWeight: 500, color: 'rgba(255,255,255,0.7)', marginBottom: 12 }}>
                    Scan Intensity
                  </label>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    <RadioOption value="simple" label="Simple Scan" description={DESCRIPTIONS.simple} selected={intensity === 'simple'} onChange={setIntensity} />
                    <RadioOption value="aggressive" label="Aggressive Scan" description={DESCRIPTIONS.aggressive} selected={intensity === 'aggressive'} onChange={setIntensity} />
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <motion.button
            type="submit"
            whileHover={canSubmit ? { backgroundColor: '#ffffff', color: '#0a0a0a', borderColor: '#ffffff' } : {}}
            initial={{ backgroundColor: 'rgba(255,255,255,0.05)', color: '#ffffff', borderColor: 'rgba(255,255,255,0.2)' }}
            transition={{ duration: 0.2 }}
            style={{
              width: '100%', padding: '14px 24px', borderRadius: 8,
              border: '1px solid rgba(255,255,255,0.2)',
              fontFamily: 'system-ui, -apple-system, sans-serif', fontSize: 15, fontWeight: 500,
              cursor: canSubmit ? 'pointer' : 'not-allowed', opacity: canSubmit ? 1 : 0.4,
            }}
          >
            Start Scan
          </motion.button>
        </form>
      </div>
    </motion.div>
  )
}
