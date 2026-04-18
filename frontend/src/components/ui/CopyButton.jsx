import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

const CopyIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect width="14" height="14" x="8" y="8" rx="2" ry="2"/>
    <path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/>
  </svg>
)

const CheckIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#4ade80" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="20 6 9 17 4 12"/>
  </svg>
)

export default function CopyButton({ text = '' }) {
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {
      // clipboard unavailable
    }
  }

  return (
    <motion.button
      type="button"
      onClick={handleCopy}
      disabled={copied}
      whileHover={!copied ? { backgroundColor: 'rgba(255,255,255,0.1)' } : {}}
      style={{
        position: 'relative',
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        padding: '5px 12px',
        background: 'rgba(255,255,255,0.05)',
        border: '1px solid rgba(255,255,255,0.12)',
        borderRadius: 6,
        color: copied ? '#4ade80' : 'rgba(255,255,255,0.6)',
        fontFamily: 'system-ui, sans-serif',
        fontSize: 12,
        cursor: copied ? 'default' : 'pointer',
        transition: 'color 0.2s',
        overflow: 'hidden',
      }}
    >
      <span style={{ position: 'relative', width: 15, height: 15 }}>
        <AnimatePresence mode="wait">
          {copied ? (
            <motion.span
              key="check"
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0, opacity: 0 }}
              transition={{ duration: 0.15 }}
              style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center' }}
            >
              <CheckIcon />
            </motion.span>
          ) : (
            <motion.span
              key="copy"
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0, opacity: 0 }}
              transition={{ duration: 0.15 }}
              style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center' }}
            >
              <CopyIcon />
            </motion.span>
          )}
        </AnimatePresence>
      </span>
      {copied ? 'Copied!' : 'Copy'}
    </motion.button>
  )
}
