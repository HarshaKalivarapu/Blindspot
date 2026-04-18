import { useState } from 'react'
import { motion } from 'framer-motion'
import TerminalIntro from '../components/intro/TerminalIntro.jsx'
import ScanFeed from '../components/homepage/ScanFeed.jsx'
import HeroPanel from '../components/homepage/HeroPanel.jsx'
import ShaderBackground from '../components/homepage/ShaderBackground.jsx'

export default function Home() {
  const [phase, setPhase] = useState('intro')

  return (
    <div style={{ background: '#0a0a0a', minHeight: '100vh' }}>
      {phase === 'intro' && (
        <TerminalIntro onComplete={() => setPhase('splitscreen')} />
      )}

      {phase === 'splitscreen' && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5 }}
          style={{ height: '100vh', background: '#0a0a0a', position: 'relative', overflow: 'hidden' }}
        >
          <ShaderBackground />

          {/* Full-screen terminal background */}
          <div style={{ position: 'absolute', inset: 0, zIndex: 1 }}>
            <ScanFeed />
          </div>

          {/* Radial vignette so hero text is legible */}
          <div style={{
            position: 'absolute',
            inset: 0,
            zIndex: 2,
            background: 'radial-gradient(ellipse 55% 65% at 50% 50%, rgba(10,10,10,0.82) 0%, transparent 100%)',
          }} />

          {/* Centered hero */}
          <motion.div
            initial={{ opacity: 0, filter: 'blur(12px)', zIndex: 0 }}
            animate={{ opacity: 1, filter: 'blur(0px)', zIndex: 3 }}
            transition={{ duration: 0.75, delay: 2.0, ease: 'easeOut' }}
            style={{
              position: 'absolute',
              inset: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <HeroPanel />
          </motion.div>
        </motion.div>
      )}
    </div>
  )
}
