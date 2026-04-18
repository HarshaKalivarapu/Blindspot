import { useState, useEffect, useRef } from 'react'
import { motion } from 'framer-motion'

const SCRIPT = [
  { type: 'type', text: 'root@pentest:~$ nmap -sV 10.0.1.1' },
  { type: 'pause', ms: 80 },
  { type: 'type', text: 'Discovered open port 80/tcp' },
  { type: 'pause', ms: 80 },
  { type: 'type', text: 'Scan complete. 1 vulnerability found.' },
]

export default function TerminalIntro({ onComplete }) {
  const [lines, setLines] = useState([])
  const [currentLine, setCurrentLine] = useState('')
  const [fadingOut, setFadingOut] = useState(false)
  const cancelRef = useRef(false)
  const onCompleteRef = useRef(onComplete)

  useEffect(() => {
    onCompleteRef.current = onComplete
  }, [onComplete])

  useEffect(() => {
    cancelRef.current = false

    const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms))
    // Speed up typing characters immensely (now 2-6ms per char instead of 10-18ms)
    const randomDelay = () => 2 + Math.random() * 4

    async function runScript() {
      for (const item of SCRIPT) {
        if (cancelRef.current) return

        if (item.type === 'pause') {
          await delay(item.ms)
        } else {
          for (let i = 1; i <= item.text.length; i++) {
            if (cancelRef.current) return
            setCurrentLine(item.text.slice(0, i))
            await delay(randomDelay())
          }
          if (cancelRef.current) return
          setLines((prev) => [...prev, item.text])
          setCurrentLine('')
          await delay(30) // Wait significantly less between commands
        }
      }

      // Finish quickly after the last command
      await delay(200)
      if (cancelRef.current) return
      setFadingOut(true)
      await delay(200)
      if (cancelRef.current) return
      onCompleteRef.current()
    }

    runScript()
    return () => {
      cancelRef.current = true
    }
  }, [])

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: fadingOut ? 0 : 1 }}
      transition={{ duration: fadingOut ? 0.4 : 0.4 }}
      style={{
        position: 'fixed',
        inset: 0,
        background: '#000',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 50,
      }}
    >
      <div
        style={{
          width: 680,
          maxWidth: '90vw',
          border: '1px solid #1e1e1e',
          borderRadius: 6,
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            background: '#111',
            padding: '10px 14px',
            display: 'flex',
            alignItems: 'center',
            gap: 7,
            borderBottom: '1px solid #1e1e1e',
          }}
        >
          <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#2a2a2a' }} />
          <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#252525' }} />
          <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#202020' }} />
        </div>

        <div
          style={{
            background: '#000',
            padding: '18px 20px',
            fontFamily: 'monospace',
            fontSize: 13,
            color: '#fff',
            lineHeight: 1.8,
            minHeight: 300,
          }}
        >
          {lines.map((line, i) => (
            <div key={i}>{line}</div>
          ))}
          <div>
            {currentLine}
            <motion.span
              animate={{ opacity: [1, 0] }}
              transition={{ repeat: Infinity, duration: 0.5, ease: 'steps(1)' }}
            >
              █
            </motion.span>
          </div>
        </div>
      </div>
    </motion.div>
  )
}
