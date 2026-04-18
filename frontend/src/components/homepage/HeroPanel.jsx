import { useState, useRef } from 'react'
import { motion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'

export default function HeroPanel() {
  const navigate = useNavigate()
  const [isHovered, setIsHovered] = useState(false)
  const [showCursor, setShowCursor] = useState(false)
  const [flash, setFlash] = useState(false)
  const cursorTimerRef = useRef(null)

  const handleMouseEnter = () => {
    setIsHovered(true)
    setShowCursor(true)
    clearTimeout(cursorTimerRef.current)
    cursorTimerRef.current = setTimeout(() => setShowCursor(false), 300)
  }

  const handleMouseLeave = () => {
    setIsHovered(false)
    setShowCursor(false)
  }

  const handleClick = () => {
    setFlash(true)
    setTimeout(() => navigate('/scan'), 80)
  }

  return (
    <div
      style={{
        position: 'relative',
        height: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'transparent',
        overflow: 'hidden',
      }}
    >
 

      <div
        style={{
          position: 'relative',
          zIndex: 1,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 24,
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
          <span
            style={{
              fontFamily: 'monospace',
              fontSize: 48,
              fontWeight: 500,
              color: '#ffffff',
              letterSpacing: '0.08em',
              lineHeight: 1,
            }}
          >
            ShieldScan
          </span>
          <div
            style={{
              width: 40,
              height: 1,
              background: 'rgba(255,255,255,0.2)',
            }}
          />
        </div>

        <motion.button
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
          onClick={handleClick}
          animate={{
            backgroundColor: isHovered ? '#ffffff' : 'transparent',
            color: isHovered ? '#0d0d0d' : '#ffffff',
          }}
          transition={{ duration: 0.15 }}
          style={{
            fontFamily: 'monospace',
            fontSize: 14,
            padding: '14px 32px',
            border: '1px solid #ffffff',
            borderRadius: 2,
            cursor: 'pointer',
            outline: 'none',
            letterSpacing: '0.04em',
            minWidth: 140,
          }}
        >
          Get Started{showCursor ? ' |' : ''}
        </motion.button>
      </div>

      {flash && (
        <motion.div
          initial={{ opacity: 1 }}
          animate={{ opacity: 0 }}
          transition={{ duration: 0.08 }}
          style={{
            position: 'fixed',
            inset: 0,
            background: '#ffffff',
            zIndex: 100,
            pointerEvents: 'none',
          }}
        />
      )}
    </div>
  )
}
