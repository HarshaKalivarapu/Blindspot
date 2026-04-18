import { useState, useEffect, useRef } from 'react'
import { motion } from 'framer-motion'
import { scanFeedData } from '../../lib/scanFeedData.js'

function getLineType(text) {
  if (text.includes('CRITICAL')) return 'critical'
  if (text.includes('HIGH')) return 'high'
  if (text.includes('CVE lookup') || text.includes('Scan complete') || text.includes('exposed') || text.includes('active') || text.includes('detected')) return 'alert'
  return 'normal'
}

function formatTimestamp(date) {
  const hh = String(date.getHours()).padStart(2, '0')
  const mm = String(date.getMinutes()).padStart(2, '0')
  const ss = String(date.getSeconds()).padStart(2, '0')
  return `[${hh}:${mm}:${ss}]`
}

export default function ScanFeed() {
  const [topLines, setTopLines] = useState([])
  const [bottomLines, setBottomLines] = useState([])
  const indexRef = useRef(0)

  useEffect(() => {
    const interval = setInterval(() => {
      const text = scanFeedData[indexRef.current % scanFeedData.length]
      indexRef.current++
      const type = getLineType(text)
      const entry = {
        id: Date.now() + Math.random(),
        text,
        timestamp: formatTimestamp(new Date()),
        type,
      }
      
      if (type === 'critical' || type === 'high' || type === 'alert') {
        setBottomLines((prev) => [...prev, entry].slice(-25))
      } else {
        setTopLines((prev) => [...prev, entry].slice(-25))
      }
    }, 600)

    return () => clearInterval(interval)
  }, [])

  return (
    <div style={{ position: 'relative', height: '100%', display: 'flex', flexDirection: 'column' }}>
      
      {/* Top Container: Alerts / Vulnerabilities */}
      <div
        style={{
          flex: 1,
          height: '50%',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'flex-end',
          borderLeft: '1px solid rgba(239, 68, 68, 0.2)',
          padding: '12px 20px 24px 16px',
          boxSizing: 'border-box',
          maskImage: 'linear-gradient(to bottom, transparent 0%, black 15%, black 100%)',
          WebkitMaskImage: 'linear-gradient(to bottom, transparent 0%, black 15%, black 100%)',
        }}
      >
        {bottomLines.map((line) => {
          const isCritical = line.type === 'critical'
          const isHigh = line.type === 'high'
          const color = isCritical ? '#ef4444' : (isHigh ? '#f97316' : '#eab308')
          
          return (
             <motion.div
              key={line.id}
              layout
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
              style={{
                fontFamily: 'monospace',
                fontSize: 13,
                lineHeight: 1.8,
                color: color,
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                flexShrink: 0,
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

      {/* Bottom Container: Normal Logs */}
      <div
        style={{
          flex: 1,
          height: '50%',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'flex-end',
          borderLeft: '1px solid rgba(22, 101, 52, 0.2)',
          padding: '24px 20px 12px 16px',
          boxSizing: 'border-box',
          maskImage: 'linear-gradient(to bottom, transparent 0%, black 15%, black 100%)',
          WebkitMaskImage: 'linear-gradient(to bottom, transparent 0%, black 15%, black 100%)',
        }}
      >
        {topLines.map((line) => (
          <motion.div
            key={line.id}
            layout
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            style={{
              fontFamily: 'monospace',
              fontSize: 13,
              lineHeight: 1.8,
              color: '#166534',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              flexShrink: 0,
            }}
          >
            <span style={{ color: 'rgba(255,255,255,0.15)', marginRight: 8 }}>
              {line.timestamp}
            </span>
            {line.text}
          </motion.div>
        ))}
      </div>
      
    </div>
  )
}
