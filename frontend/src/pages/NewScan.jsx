import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import ShaderBackground from '../components/homepage/ShaderBackground.jsx'

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
      onMouseEnter={(e) => {
        if (!selected) {
          e.currentTarget.style.background = 'rgba(255,255,255,0.05)';
        }
      }}
      onMouseLeave={(e) => {
        if (!selected) {
          e.currentTarget.style.background = 'rgba(255,255,255,0.02)';
        }
      }}
    >
      <div
        style={{
          marginTop: 2,
          width: 14,
          height: 14,
          borderRadius: '50%',
          border: `1px solid ${selected ? '#ffffff' : 'rgba(255,255,255,0.3)'}`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
          transition: 'border-color 0.15s',
        }}
      >
        {selected && (
          <div
            style={{
              width: 6,
              height: 6,
              borderRadius: '50%',
              backgroundColor: '#ffffff',
            }}
          />
        )}
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

export default function NewScan() {
  const navigate = useNavigate()
  const [target, setTarget] = useState('')
  const [level, setLevel] = useState('passive')
  const [intensity, setIntensity] = useState('simple')

  const canSubmit = target.trim().length > 0

  const handleSignOut = () => navigate('/')

  const handleSubmit = (e) => {
    e?.preventDefault()
    if (!canSubmit) return
    navigate('/scan', {
      state: { config: { target: target.trim(), level, intensity: level === 'active' ? intensity : null } }
    })
  }

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
          <div style={{ fontSize: 18, fontWeight: 600, color: '#ffffff', letterSpacing: '-0.02em', cursor: 'pointer' }} onClick={() => navigate('/scan')}>
            ShieldScan
          </div>
          <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
            <motion.button
              type="button"
              onClick={() => navigate('/guide')}
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
                letterSpacing: '0.01em',
                backdropFilter: 'blur(4px)',
              }}
            >
              User Guide
            </motion.button>
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
                letterSpacing: '0.01em',
                backdropFilter: 'blur(4px)',
              }}
            >
              Sign Out
            </motion.button>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
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
        <div style={{ width: '100%', maxWidth: 640 }}>
          <button
            type="button"
            onClick={() => navigate('/scan')}
            style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.5)', fontFamily: 'system-ui, -apple-system, sans-serif', fontSize: 13, cursor: 'pointer', marginBottom: 24, padding: 0 }}
          >
            ← Back to Dashboard
          </button>
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
                  width: '100%',
                  boxSizing: 'border-box',
                  background: 'rgba(255,255,255,0.05)',
                  border: '1px solid rgba(255,255,255,0.15)',
                  borderRadius: 8,
                  padding: '12px 16px',
                  fontFamily: 'system-ui, -apple-system, sans-serif',
                  fontSize: 14,
                  color: '#ffffff',
                  outline: 'none',
                  transition: 'border-color 0.2s',
                }}
                onFocus={(e) => (e.target.style.borderColor = 'rgba(255,255,255,0.5)')}
                onBlur={(e) => (e.target.style.borderColor = 'rgba(255,255,255,0.15)')}
              />
            </div>

            {/* Mode Select */}
            <div style={{ marginBottom: level === 'active' ? 24 : 32 }}>
              <label style={{ display: 'block', fontFamily: 'system-ui, -apple-system, sans-serif', fontSize: 13, fontWeight: 500, color: 'rgba(255,255,255,0.7)', marginBottom: 12 }}>
                Scan Mode
              </label>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <RadioOption
                  value="passive"
                  label="Passive Reconnaissance"
                  description={DESCRIPTIONS.passive}
                  selected={level === 'passive'}
                  onChange={setLevel}
                />
                <RadioOption
                  value="active"
                  label="Active Reconnaissance"
                  description={DESCRIPTIONS.active}
                  selected={level === 'active'}
                  onChange={setLevel}
                />
              </div>
            </div>

            {/* Intensity Select */}
            <AnimatePresence>
              {level === 'active' && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.2 }}
                  style={{ overflow: 'hidden' }}
                >
                  <div style={{ paddingBottom: 32 }}>
                    <label style={{ display: 'block', fontFamily: 'system-ui, -apple-system, sans-serif', fontSize: 13, fontWeight: 500, color: 'rgba(255,255,255,0.7)', marginBottom: 12 }}>
                      Scan Intensity
                    </label>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                      <RadioOption
                        value="simple"
                        label="Simple Scan"
                        description={DESCRIPTIONS.simple}
                        selected={intensity === 'simple'}
                        onChange={setIntensity}
                      />
                      <RadioOption
                        value="aggressive"
                        label="Aggressive Scan"
                        description={DESCRIPTIONS.aggressive}
                        selected={intensity === 'aggressive'}
                        onChange={setIntensity}
                      />
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
                width: '100%',
                padding: '14px 24px',
                borderRadius: 8,
                border: '1px solid rgba(255,255,255,0.2)',
                fontFamily: 'system-ui, -apple-system, sans-serif',
                fontSize: 15,
                fontWeight: 500,
                cursor: canSubmit ? 'pointer' : 'not-allowed',
                opacity: canSubmit ? 1 : 0.4,
              }}
            >
              Start Scan
            </motion.button>
          </form>
        </div>
      </motion.div>
    </div>
  )
}
