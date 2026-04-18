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
    }, 475) // 475ms interval for a steady stream of logs

    return () => clearInterval(interval)
  }, [])

  const sectionStyle = {
    width: '100%',
    overflow: 'hidden',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'flex-end',
    padding: '0 20px',
    boxSizing: 'border-box',
  }

  return (
    <div style={{
      position: 'relative',
      height: '100%',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      maskImage: 'linear-gradient(to bottom, transparent 0%, black 15%, black 85%, transparent 100%)',
      WebkitMaskImage: 'linear-gradient(to bottom, transparent 0%, black 15%, black 85%, transparent 100%)',
    }}>

      {/* Top section: Alerts / Vulnerabilities (red + orange) */}
      <div style={{ ...sectionStyle, maxWidth: 900 }}>
        {bottomLines.map((line) => {
          const isCritical = line.type === 'critical'
          const isHigh = line.type === 'high'
          const baseColor = isCritical ? '239,68,68' : isHigh ? '249,115,22' : '234,179,8'
          return (
            <motion.div
              key={line.id}
              layout
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
              style={{
                fontFamily: 'monospace',
                fontSize: 18,
                lineHeight: 1.8,
                color: `rgba(${baseColor}, 0.72)`,
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                flexShrink: 0,
              }}
            >
              <span style={{ color: 'rgba(255,255,255,0.12)', marginRight: 8 }}>
                {line.timestamp}
              </span>
              {line.text}
            </motion.div>
          )
        })}
      </div>

      <div style={{ height: 74 }} />

      {/* Bottom section: Normal logs (green) */}
      <div style={{ ...sectionStyle, maxWidth: 900 }}>
        {topLines.map((line) => (
          <motion.div
            key={line.id}
            layout
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            style={{
              fontFamily: 'monospace',
              fontSize: 18,
              lineHeight: 1.8,
              color: 'rgba(22, 163, 74, 0.78)',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              flexShrink: 0,
            }}
          >
            <span style={{ color: 'rgba(255,255,255,0.12)', marginRight: 8 }}>
              {line.timestamp}
            </span>
            {line.text}
          </motion.div>
        ))}
      </div>

    </div>
  )
}
