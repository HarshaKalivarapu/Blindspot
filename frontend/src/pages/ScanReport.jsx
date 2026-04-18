import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import ShaderBackground from '../components/homepage/ShaderBackground.jsx'

export default function ScanReport() {
  const navigate = useNavigate()

  return (
    <div style={{ position: 'relative', height: '100vh', width: '100vw', overflow: 'hidden', background: '#070a0d' }}>
      <ShaderBackground />

      <nav style={{
        position: 'absolute',
        top: 0, left: 0, right: 0,
        height: 64,
        zIndex: 50,
        background: 'linear-gradient(180deg, rgba(30,35,42,0.6) 0%, rgba(20,25,30,0.2) 100%)',
        backdropFilter: 'blur(16px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '0 32px',
      }}>
        <div style={{
          width: '100%',
          maxWidth: 1000,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          fontFamily: 'system-ui, -apple-system, sans-serif',
        }}>
          <div
            style={{ fontSize: 18, fontWeight: 600, color: '#ffffff', letterSpacing: '-0.02em', cursor: 'pointer' }}
            onClick={() => navigate('/scan')}
          >
            ShieldScan
          </div>
          <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
            <motion.button
              type="button"
              onClick={() => navigate('/scan')}
              whileHover={{ backgroundColor: '#ffffff', color: '#0a0a0a', borderColor: '#ffffff' }}
              initial={{ backgroundColor: 'rgba(255,255,255,0.03)', color: '#ffffff', borderColor: 'rgba(255,255,255,0.15)' }}
              transition={{ duration: 0.2 }}
              style={{
                fontFamily: 'system-ui, -apple-system, sans-serif',
                fontSize: 14,
                fontWeight: 500,
                padding: '10px 24px',
                border: '1px solid rgba(255,255,255,0.15)',
                borderRadius: 6,
                cursor: 'pointer',
                letterSpacing: '0.01em',
                backdropFilter: 'blur(4px)',
              }}
            >
              Back to Dashboard
            </motion.button>
          </div>
        </div>
      </nav>

      {/* Report container — content will be rendered here from generated report data */}
      <div style={{
        position: 'absolute',
        inset: '64px 0 0 0',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        padding: '48px 32px',
        zIndex: 1,
        overflowY: 'auto',
      }}>
        <div style={{
          width: '100%',
          maxWidth: 860,
          minHeight: 'calc(100vh - 160px)',
          border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: 12,
          background: 'rgba(0,0,0,0.25)',
          backdropFilter: 'blur(16px)',
        }} />
      </div>
    </div>
  )
}
