import { useState, useEffect, useRef } from 'react'
import { motion } from 'framer-motion'
import { scanFeedData } from '../../lib/scanFeedData.js'

function getLineType(text) {
  if (text.includes('CRITICAL')) return 'critical'
  if (text.includes('HIGH')) return 'high'
  return 'normal'
}

function formatTimestamp(date) {
  const hh = String(date.getHours()).padStart(2, '0')
  const mm = String(date.getMinutes()).padStart(2, '0')
  const ss = String(date.getSeconds()).padStart(2, '0')
  return `[${hh}:${mm}:${ss}]`
}

export default function ScanFeed() {
  const [displayedLines, setDisplayedLines] = useState([])
  const indexRef = useRef(0)

  useEffect(() => {
    const interval = setInterval(() => {
      const text = scanFeedData[indexRef.current % scanFeedData.length]
      indexRef.current++
      const entry = {
        id: Date.now() + Math.random(),
        text,
        timestamp: formatTimestamp(new Date()),
        type: getLineType(text),
      }
      setDisplayedLines((prev) => [...prev, entry].slice(-60))
    }, 1500)

    return () => clearInterval(interval)
  }, [])

  return (
    <div style={{ position: 'relative', height: '100%', overflow: 'hidden' }}>
      <div
        style={{
          height: '100%',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'flex-end',
          borderLeft: '1px solid rgba(22, 101, 52, 0.2)',
          padding: '12px 20px 12px 16px',
          boxSizing: 'border-box',
        }}
      >
        {displayedLines.map((line) => {
          if (line.type === 'critical') {
            return (
              <motion.div
                key={line.id}
                initial={{ opacity: 0, y: 8, color: '#ffffff' }}
                animate={{ opacity: 1, y: 0, color: '#ef4444' }}
                transition={{
                  opacity: { duration: 0.2 },
                  y: { duration: 0.2 },
                  color: { duration: 0.5, delay: 0.1 },
                }}
                style={{
                  fontFamily: 'monospace',
                  fontSize: 13,
                  lineHeight: 1.8,
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}
              >
                <span style={{ color: 'rgba(255,255,255,0.2)', marginRight: 8 }}>
                  {line.timestamp}
                </span>
                {line.text}
              </motion.div>
            )
          }

          return (
            <motion.div
              key={line.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
              style={{
                fontFamily: 'monospace',
                fontSize: 13,
                lineHeight: 1.8,
                color: line.type === 'high' ? '#f97316' : '#166534',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
            >
              <span style={{ color: 'rgba(255,255,255,0.15)', marginRight: 8 }}>
                {line.timestamp}
              </span>
              {line.text}
            </motion.div>
          )
        })}
      </div>

 
    </div>
  )
}
