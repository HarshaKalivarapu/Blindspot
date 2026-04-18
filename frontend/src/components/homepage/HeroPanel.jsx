import { useState } from 'react'
import { motion } from 'framer-motion'
import { createPortal } from 'react-dom'
import AuthModal from './AuthModal.jsx'
import { TextScramble } from '../ui/text-scramble.jsx'

export default function HeroPanel({ onOpenModal }) {
  const [isHovered, setIsHovered] = useState(false)

  const handleMouseEnter = () => setIsHovered(true)
  const handleMouseLeave = () => setIsHovered(false)

  const handleClick = () => {
    if (onOpenModal) onOpenModal()
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
          gap: 32,
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
          <span
            style={{
              fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
              fontSize: 64,
              fontWeight: 600,
              color: '#ffffff',
              letterSpacing: '-0.02em',
              lineHeight: 1.1,
            }}
          >
            <TextScramble text="ShieldScan" delay={2200} />
          </span>
          <span
            style={{
              fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
              fontSize: 18,
              fontWeight: 400,
              color: 'rgba(255, 255, 255, 0.6)',
              letterSpacing: '0.01em',
            }}
          >
            Next generation vulnerability scanning software for your business
          </span>
        </div>

        <motion.button
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
          onClick={handleClick}
          animate={{
            backgroundColor: isHovered ? '#ffffff' : 'rgba(255, 255, 255, 0.03)',
            color: isHovered ? '#0a0a0a' : '#ffffff',
            borderColor: isHovered ? '#ffffff' : 'rgba(255, 255, 255, 0.15)',
          }}
          transition={{ duration: 0.2 }}
          style={{
            fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
            fontSize: 15,
            fontWeight: 500,
            padding: '14px 40px',
            border: '1px solid rgba(255, 255, 255, 0.15)',
            borderRadius: 6,
            cursor: 'pointer',
            outline: 'none',
            letterSpacing: '0.01em',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
            backdropFilter: 'blur(4px)',
          }}
        >
          Get Started
        </motion.button>
      </div>

    </div>
  )
}
