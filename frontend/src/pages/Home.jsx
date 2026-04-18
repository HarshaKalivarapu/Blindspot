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
          className="flex flex-col md:flex-row"
          style={{ height: '100vh', background: '#0a0a0a', position: 'relative' }}
        >
          <ShaderBackground />
          <div className="h-[35vh] md:h-auto md:flex-1 relative overflow-hidden" style={{ zIndex: 1 }}>
            <ScanFeed />
          </div>
          <div className="flex-1 relative overflow-hidden" style={{ zIndex: 1 }}>
            <HeroPanel />
          </div>
        </motion.div>
      )}
    </div>
  )
}
