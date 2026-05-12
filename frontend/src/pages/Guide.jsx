import { useState, useRef, useEffect, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import ShaderBackground from '../components/homepage/ShaderBackground.jsx'
import CopyButton from '../components/ui/CopyButton.jsx'
import { useAuth } from '../lib/AuthContext.jsx'

const ARROW_H = 12
const BAR_W = 10

// Intersection Reveal Wrapper for Text Sections
function SectionReveal({ children, id }) {
  const ref = useRef()
  const [inView, setInView] = useState(false)
  
  useEffect(() => {
    const ob = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) setInView(true)
    }, { threshold: 0.1 })
    if (ref.current) ob.observe(ref.current)
    return () => ob.disconnect()
  }, [])

  return (
    <motion.div
      id={id}
      ref={ref}
      initial={{ opacity: 0, y: 20 }}
      animate={inView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
      transition={{ duration: 0.5, ease: 'easeOut' }}
      style={{ marginBottom: 48 }}
    >
      {children}
    </motion.div>
  )
}

// Typing Effect Component
function TypewriterCommand({ command, attachBadge }) {
  const [displayedText, setDisplayedText] = useState('')
  const [isTyping, setIsTyping] = useState(false)
  const [hasTyped, setHasTyped] = useState(false)
  const ref = useRef(null)

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !hasTyped) {
          setIsTyping(true)
          let i = 0
          const interval = setInterval(() => {
            if (i < command.length) {
              setDisplayedText((prev) => prev + command.charAt(i))
              i++
            } else {
              clearInterval(interval)
              setIsTyping(false)
              setHasTyped(true)
            }
          }, 28) // 28ms typing speed requirement
        }
      },
      { threshold: 0.3 }
    )

    if (ref.current) observer.observe(ref.current)
    return () => observer.disconnect()
  }, [command, hasTyped])

  return (
    <div ref={ref} style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 20 }}>
      {attachBadge && (
        <div style={{ display: 'inline-block', alignSelf: 'flex-start', padding: '2px 8px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 4, fontFamily: 'monospace', fontSize: 10, color: 'rgba(255,255,255,0.6)' }}>
          {attachBadge}
        </div>
      )}
      <div style={{ position: 'relative', padding: '14px 18px', background: 'rgba(0,0,0,0.5)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, fontFamily: 'monospace', fontSize: 13, color: '#10b981', overflowX: 'auto', overscrollBehavior: 'contain', whiteSpace: 'pre' }}>
        <div style={{ position: 'absolute', top: 8, right: 8 }}>
          <CopyButton text={command} />
        </div>
        <span>{displayedText}</span>
        {isTyping && <motion.span animate={{ opacity: [1, 0] }} transition={{ repeat: Infinity, duration: 0.5, ease: 'steps(2)' }}>█</motion.span>}
        {!hasTyped && !isTyping && <span style={{ opacity: 0 }}>█</span>}
      </div>
    </div>
  )
}

// Q&A Checkpoint Component
function Checkpoint({ question, options, correctAnswerIndex, explanation }) {
  const [selected, setSelected] = useState(null)
  const [status, setStatus] = useState(null)

  const handleSelect = (idx) => {
    if (status === 'correct') return
    setSelected(idx)
    setStatus(idx === correctAnswerIndex ? 'correct' : 'wrong')
  }

  return (
    <SectionReveal>
      <div style={{ padding: '24px 32px', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12 }}>
        <div style={{ fontFamily: 'system-ui, -apple-system, sans-serif', fontSize: 11, fontWeight: 700, color: '#f59e0b', textTransform: 'uppercase', letterSpacing: '0.15em', marginBottom: 12 }}>
          Q&A Checkpoint
        </div>
        <div style={{ fontFamily: 'system-ui, -apple-system, sans-serif', fontSize: 16, fontWeight: 500, color: '#ffffff', marginBottom: 20, lineHeight: 1.5 }}>
          {question}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {options.map((opt, i) => {
            const isSelected = selected === i
            const isCorrect = isSelected && status === 'correct'
            const isWrong = isSelected && status === 'wrong'
            
            let borderColor = 'rgba(255,255,255,0.1)'
            if (isCorrect) borderColor = '#10b981'
            if (isWrong) borderColor = '#ef4444'

            return (
              <motion.button
                key={i}
                type="button"
                onClick={() => handleSelect(i)}
                whileHover={!(status === 'correct') && !isSelected ? { backgroundColor: 'rgba(255,255,255,0.05)' } : {}}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '14px 20px',
                  background: 'rgba(0,0,0,0.3)',
                  border: `1px solid ${borderColor}`,
                  borderRadius: 8,
                  color: '#ffffff',
                  fontFamily: 'system-ui, -apple-system, sans-serif',
                  fontSize: 14,
                  cursor: status === 'correct' ? 'default' : 'pointer',
                  transition: 'border-color 0.2s',
                  textAlign: 'left',
                  outline: 'none',
                }}
              >
                <span>{String.fromCharCode(65 + i)}) {opt}</span>
                {isCorrect && <span style={{ color: '#10b981', fontWeight: 'bold' }}>✓</span>}
              </motion.button>
            )
          })}
        </div>
        <AnimatePresence>
          {status === 'wrong' && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              style={{ overflow: 'hidden' }}
            >
              <div style={{ marginTop: 16, padding: '16px 20px', background: 'rgba(239,68,68,0.05)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 8, color: '#fca5a5', fontFamily: 'system-ui, -apple-system, sans-serif', fontSize: 13, lineHeight: 1.5 }}>
                {explanation}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </SectionReveal>
  )
}

function LogoBadge({ name }) {
  return (
    <motion.div
      whileHover={{ scale: 1.05, backgroundColor: 'rgba(255,255,255,0.1)' }}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        padding: '6px 16px',
        background: 'rgba(255,255,255,0.03)',
        border: '1px solid rgba(255,255,255,0.1)',
        borderRadius: 24,
        fontFamily: 'monospace',
        fontSize: 12,
        color: 'rgba(255,255,255,0.8)',
        cursor: 'pointer',
        whiteSpace: 'nowrap',
        boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
      }}
      onClick={() => {
        const el = document.getElementById(`tool-${name.toLowerCase().replace(/[\s/]/g, '-')}`)
        if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' })
      }}
    >
      {name}
    </motion.div>
  )
}

function NonDeveloperTab() {
  return (
    <motion.div
      key="non-dev"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.3 }}
      style={{ width: '100%' }}
    >
      <SectionReveal>
        <h2 style={{ fontFamily: 'system-ui, -apple-system, sans-serif', fontSize: 24, fontWeight: 600, color: '#ffffff', marginBottom: 16, letterSpacing: '-0.02em' }}>1. What is this app?</h2>
        <p style={{ fontFamily: 'system-ui, -apple-system, sans-serif', fontSize: 15, color: 'rgba(255,255,255,0.65)', lineHeight: 1.6, marginBottom: 16 }}>
          Think of this tool as a digital security guard for your entire network. It scans every device and entry point on your network the exact same way a hacker would, looks for unlocked doors and open pathways, and then hands you a plain-english checklist explaining what was found and exactly how to fix it before anyone else does.
        </p>
      </SectionReveal>

      <SectionReveal>
        <h2 style={{ fontFamily: 'system-ui, -apple-system, sans-serif', fontSize: 24, fontWeight: 600, color: '#ffffff', marginBottom: 16, letterSpacing: '-0.02em' }}>2. What is an IP address?</h2>
        <p style={{ fontFamily: 'system-ui, -apple-system, sans-serif', fontSize: 15, color: 'rgba(255,255,255,0.65)', lineHeight: 1.6, marginBottom: 16 }}>
          Just like every building on a street has a unique address, every device on a network has a digital address called an IP Address (e.g. 192.168.1.1). This tool just needs that address so our scanner knows exactly where to look.
        </p>
      </SectionReveal>

      <SectionReveal>
        <h2 style={{ fontFamily: 'system-ui, -apple-system, sans-serif', fontSize: 24, fontWeight: 600, color: '#ffffff', marginBottom: 16, letterSpacing: '-0.02em' }}>3. Passive vs Active Scanning</h2>
        <p style={{ fontFamily: 'system-ui, -apple-system, sans-serif', fontSize: 15, color: 'rgba(255,255,255,0.65)', lineHeight: 1.6, marginBottom: 16 }}>
          <strong>Passive:</strong> This is like googling your own home address. We simply look your server up in massive public databases without ever actually touching it or interacting with it.
        </p>
        <p style={{ fontFamily: 'system-ui, -apple-system, sans-serif', fontSize: 15, color: 'rgba(255,255,255,0.65)', lineHeight: 1.6, marginBottom: 16 }}>
          <strong>Active:</strong> This means we are actually walking up to the property and pulling on the door handles to see what is unlocked. You should only ever run Active scans on servers you officially own.
        </p>
      </SectionReveal>

      <Checkpoint 
        question="You want to check if your app has vulnerabilities but you are not sure if you are allowed to run a full scan on it yet. Which mode should you use?"
        options={["Active — it finds more things", "Passive — it never touches your server directly", "Both at the same time"]}
        correctAnswerIndex={1}
        explanation="Passive mode only looks up public databases — it never sends any traffic to your server, so it is always safe to run first."
      />

      <SectionReveal>
        <h2 style={{ fontFamily: 'system-ui, -apple-system, sans-serif', fontSize: 24, fontWeight: 600, color: '#ffffff', marginBottom: 16, letterSpacing: '-0.02em' }}>4. What happens during a scan?</h2>
        <ul style={{ listStyleType: 'disc', paddingLeft: 24, display: 'flex', flexDirection: 'column', gap: 12 }}>
          <li style={{ fontFamily: 'system-ui, -apple-system, sans-serif', fontSize: 15, color: 'rgba(255,255,255,0.65)', lineHeight: 1.5 }}>We look up how your network is publicly visible across the internet.</li>
          <li style={{ fontFamily: 'system-ui, -apple-system, sans-serif', fontSize: 15, color: 'rgba(255,255,255,0.65)', lineHeight: 1.5 }}>We map every open digital door (port) across all devices on your network.</li>
          <li style={{ fontFamily: 'system-ui, -apple-system, sans-serif', fontSize: 15, color: 'rgba(255,255,255,0.65)', lineHeight: 1.5 }}>We identify what software and services are running behind each of those doors.</li>
          <li style={{ fontFamily: 'system-ui, -apple-system, sans-serif', fontSize: 15, color: 'rgba(255,255,255,0.65)', lineHeight: 1.5 }}>We check whether that software has any known, publicly documented weaknesses.</li>
          <li style={{ fontFamily: 'system-ui, -apple-system, sans-serif', fontSize: 15, color: 'rgba(255,255,255,0.65)', lineHeight: 1.5 }}>We test common default passwords on any services exposed to the internet (SSH, databases, remote access).</li>
          <li style={{ fontFamily: 'system-ui, -apple-system, sans-serif', fontSize: 15, color: 'rgba(255,255,255,0.65)', lineHeight: 1.5 }}>We check for shared drives, file servers, and remote management tools left open by mistake.</li>
          <li style={{ fontFamily: 'system-ui, -apple-system, sans-serif', fontSize: 15, color: 'rgba(255,255,255,0.65)', lineHeight: 1.5 }}>We compile everything into a final report with a risk score out of 10.</li>
        </ul>
      </SectionReveal>

      <SectionReveal>
        <h2 style={{ fontFamily: 'system-ui, -apple-system, sans-serif', fontSize: 24, fontWeight: 600, color: '#ffffff', marginBottom: 16, letterSpacing: '-0.02em' }}>5. Understanding your score</h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '60px 1fr', gap: 16 }}>
            <span style={{ fontFamily: 'monospace', color: '#10b981', fontWeight: 600 }}>0 - 5:</span>
            <span style={{ fontFamily: 'system-ui, sans-serif', fontSize: 14, color: 'rgba(255,255,255,0.65)', lineHeight: 1.5 }}>Completely clean! Your basic security hygiene is fantastic, and no glaring holes were found. Keep it up.</span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '60px 1fr', gap: 16 }}>
            <span style={{ fontFamily: 'monospace', color: '#f59e0b', fontWeight: 600 }}>5 - 7:</span>
            <span style={{ fontFamily: 'system-ui, sans-serif', fontSize: 14, color: 'rgba(255,255,255,0.65)', lineHeight: 1.5 }}>Some concern. You might be running slightly outdated software or have some information leaking. Get this looked at eventually.</span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '60px 1fr', gap: 16 }}>
            <span style={{ fontFamily: 'monospace', color: '#f97316', fontWeight: 600 }}>7 - 9:</span>
            <span style={{ fontFamily: 'system-ui, sans-serif', fontSize: 14, color: 'rgba(255,255,255,0.65)', lineHeight: 1.5 }}>Dangerous territory. You have active misconfigurations that hackers could use to take you offline. Action required quickly.</span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '60px 1fr', gap: 16 }}>
            <span style={{ fontFamily: 'monospace', color: '#ef4444', fontWeight: 600 }}>9 - 10:</span>
            <span style={{ fontFamily: 'system-ui, sans-serif', fontSize: 14, color: 'rgba(255,255,255,0.65)', lineHeight: 1.5 }}>Emergency trigger. We found a direct, critical path into your infrastructure. Drop everything and patch this immediately.</span>
          </div>
        </div>
      </SectionReveal>

      <Checkpoint
        question="What does it mean when our scanner finds an 'open port' on your server?"
        options={["A piece of software on your server is broken and needs to be repaired", "A doorway is open on your server that outside programs can connect through", "Someone has already gotten into your server without permission", "Your server is running too many programs at once"]}
        correctAnswerIndex={1}
        explanation="Think of ports like labeled mailboxes on the side of your building — each one handles a specific type of traffic. Your website uses one, your database uses another. An open port just means that mailbox is active and accepting deliveries. The risk comes when a mailbox is open that should be private, or when the software handling it has a known security flaw that attackers can exploit."
      />

      <SectionReveal>
        <h2 style={{ fontFamily: 'system-ui, -apple-system, sans-serif', fontSize: 24, fontWeight: 600, color: '#ffffff', marginBottom: 16, letterSpacing: '-0.02em' }}>6. Understanding the Report</h2>
        <p style={{ fontFamily: 'system-ui, -apple-system, sans-serif', fontSize: 15, color: 'rgba(255,255,255,0.65)', lineHeight: 1.6, marginBottom: 16 }}>
          At the end of your scan, you will receive a breakdown organized by risk (Critical, High, Medium, Low). 
        </p>
        <p style={{ fontFamily: 'system-ui, -apple-system, sans-serif', fontSize: 15, color: 'rgba(255,255,255,0.65)', lineHeight: 1.6, marginBottom: 16 }}>
          Sometimes you will see items labeled "CVE". A CVE is simply a government-tracked listing of a specific known bug in a piece of software, along with an official rating of how dangerous that particular bug is. Think of it like an automotive safety recall, but for the code powering your app.
        </p>
      </SectionReveal>

    </motion.div>
  )
}

function PassiveFullGraph() {
  const toolXs = [90, 275, 500, 725, 910]
  const toolLabels = ['Shodan API', 'WhatWeb', 'DNS & WHOIS', 'SSL / TLS', 'HTTP Headers']
  const bs = { fill: 'rgba(255,255,255,0.07)', stroke: 'rgba(255,255,255,0.22)', strokeWidth: 1 }
  const ls = { stroke: 'rgba(255,255,255,0.5)', strokeWidth: 1.5, fill: 'none' }
  function curve(x1, y1, x2, y2) {
    const dy = y2 - y1
    return `M ${x1} ${y1} C ${x1} ${y1+dy*0.45}, ${x2} ${y2-dy*0.45}, ${x2} ${y2}`
  }
  return (
    <svg viewBox="0 0 1000 520" width="100%" height="100%" preserveAspectRatio="xMidYMid meet">
      {toolXs.map((tx, i) => <path key={`fo-${i}`} d={curve(500,105,tx,235)} {...ls} />)}
      {toolXs.map((tx, i) => <path key={`cv-${i}`} d={curve(tx,285,500,420)} {...ls} />)}
      <g transform="translate(500,80)">
        <rect x={-91} y={-25} width={182} height={50} rx={10} {...bs} />
        <text textAnchor="middle" dominantBaseline="middle" fill="white" fontSize={13} fontFamily="system-ui,sans-serif">yourdomain.com</text>
      </g>
      {toolXs.map((tx, i) => (
        <g key={i} transform={`translate(${tx},260)`}>
          <rect x={-76} y={-25} width={152} height={50} rx={10} {...bs} />
          <text textAnchor="middle" dominantBaseline="middle" fill="white" fontSize={11} fontFamily="system-ui,sans-serif">{toolLabels[i]}</text>
        </g>
      ))}
      <g transform="translate(500,445)">
        <rect x={-76} y={-25} width={152} height={50} rx={10} {...bs} />
        <text textAnchor="middle" dominantBaseline="middle" fill="white" fontSize={13} fontFamily="system-ui,sans-serif">NVD CVE Lookup</text>
      </g>
    </svg>
  )
}

function ActiveFullGraph() {
  const toolXs = [200, 500, 800]
  const toolLabels = ['Nikto', 'WhatWeb', 'Hydra']
  const bs = { fill: 'rgba(255,255,255,0.07)', stroke: 'rgba(255,255,255,0.22)', strokeWidth: 1 }
  const ls = { stroke: 'rgba(255,255,255,0.5)', strokeWidth: 1.5, fill: 'none' }
  function curve(x1, y1, x2, y2) {
    const dy = y2 - y1
    return `M ${x1} ${y1} C ${x1} ${y1+dy*0.45}, ${x2} ${y2-dy*0.45}, ${x2} ${y2}`
  }
  return (
    <svg viewBox="0 0 1000 620" width="100%" height="100%" preserveAspectRatio="xMidYMid meet">
      <path d={curve(500,90,500,155)} {...ls} />
      {toolXs.map((tx, i) => <path key={`fo-${i}`} d={curve(500,205,tx,290)} {...ls} />)}
      {toolXs.map((tx, i) => <path key={`cv-${i}`} d={curve(tx,340,500,420)} {...ls} />)}
      <path d={curve(500,470,500,535)} {...ls} />
      <g transform="translate(500,65)">
        <rect x={-91} y={-25} width={182} height={50} rx={10} {...bs} />
        <text textAnchor="middle" dominantBaseline="middle" fill="white" fontSize={13} fontFamily="system-ui,sans-serif">yourdomain.com</text>
      </g>
      <g transform="translate(500,180)">
        <rect x={-91} y={-25} width={182} height={50} rx={10} {...bs} />
        <text textAnchor="middle" dominantBaseline="middle" fill="white" fontSize={13} fontFamily="system-ui,sans-serif">NMAP Basic Scan</text>
      </g>
      {toolXs.map((tx, i) => (
        <g key={i} transform={`translate(${tx},315)`}>
          <rect x={-76} y={-25} width={152} height={50} rx={10} {...bs} />
          <text textAnchor="middle" dominantBaseline="middle" fill="white" fontSize={12} fontFamily="system-ui,sans-serif">{toolLabels[i]}</text>
        </g>
      ))}
      <g transform="translate(500,445)">
        <rect x={-76} y={-25} width={152} height={50} rx={10} {...bs} />
        <text textAnchor="middle" dominantBaseline="middle" fill="white" fontSize={12} fontFamily="system-ui,sans-serif">NVD CVE Lookup</text>
      </g>
      <g transform="translate(500,560)">
        <rect x={-76} y={-25} width={152} height={50} rx={10} {...bs} />
        <text textAnchor="middle" dominantBaseline="middle" fill="white" fontSize={12} fontFamily="system-ui,sans-serif">searchsploit</text>
      </g>
    </svg>
  )
}

function GraphOverlay({ type, onClose }) {
  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose])

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 200 }}>
      {/* Animated background only — plain div outer so no transform creates a containing block */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.3 }}
        style={{ position: 'absolute', inset: 0, background: 'rgba(7,10,13,0.97)' }}
      />
      <div style={{
        position: 'absolute', top: 24, left: 32, zIndex: 202,
        fontFamily: 'system-ui, sans-serif', fontSize: 13, fontWeight: 600,
        color: 'rgba(255,255,255,0.5)', letterSpacing: '0.08em', textTransform: 'uppercase',
      }}>
        {type === 'passive' ? 'Passive Recon Pipeline' : 'Active Recon Pipeline'}
      </div>
      <motion.button
        onClick={onClose}
        whileHover={{ backgroundColor: 'rgba(255,255,255,0.08)' }}
        style={{
          position: 'absolute', top: 18, right: 24, zIndex: 202,
          background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.12)',
          borderRadius: 8, padding: '8px 16px', cursor: 'pointer',
          color: 'rgba(255,255,255,0.7)', fontFamily: 'system-ui, sans-serif',
          fontSize: 13, fontWeight: 500, display: 'flex', alignItems: 'center', gap: 8,
        }}
      >
        <span>Zoom out</span>
        <span style={{ fontSize: 11, opacity: 0.6 }}>✕</span>
      </motion.button>
      <div style={{
        position: 'absolute',
        top: 64,
        left: 48,
        right: 48,
        bottom: 48,
        zIndex: 201,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}>
        {type === 'passive' ? <PassiveFullGraph /> : <ActiveFullGraph />}
      </div>
    </div>
  )
}

function DeveloperTab() {
  const tools = ['Shodan', 'WhatWeb', 'nmap', 'Nikto', 'Gobuster', 'FFuF', 'Hydra', 'Metasploit', 'John the Ripper', 'NVD', 'ExploitDB', 'SSL/TLS', 'HTTP Headers']
  const [expandedGraph, setExpandedGraph] = useState(null)

  return (
    <>
    <motion.div
      key="dev"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.3 }}
      style={{ width: '100%' }}
    >
      <div style={{ display: 'flex', gap: 12, overflowX: 'auto', overscrollBehavior: 'contain', paddingBottom: 24, marginBottom: 40, borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
        {tools.map(tool => (
          <LogoBadge key={tool} name={tool} />
        ))}
      </div>

      <SectionReveal>
        <h2 style={{ fontFamily: 'system-ui, -apple-system, sans-serif', fontSize: 24, fontWeight: 600, color: '#ffffff', marginBottom: 16, letterSpacing: '-0.02em' }}>1. What is this app?</h2>
        <p style={{ fontFamily: 'system-ui, -apple-system, sans-serif', fontSize: 15, color: 'rgba(255,255,255,0.65)', lineHeight: 1.6, marginBottom: 16 }}>
          This is an automated penetration testing orchestrator. Claude acts as the reasoning layer, orchestrating real Linux security binaries via an MCP (Model Context Protocol) server. Each tool runs natively on the backend, and its raw standard output is fed right back into Claude to decide what branch of the logic tree to execute next down the pipeline.
        </p>
      </SectionReveal>

      <SectionReveal>
        <h2 style={{ fontFamily: 'system-ui, -apple-system, sans-serif', fontSize: 24, fontWeight: 600, color: '#ffffff', marginBottom: 16, letterSpacing: '-0.02em' }}>2. Background on Linux Security Tools</h2>
        <p style={{ fontFamily: 'system-ui, -apple-system, sans-serif', fontSize: 15, color: 'rgba(255,255,255,0.65)', lineHeight: 1.6, marginBottom: 16 }}>
          Most professional security auditing runs almost entirely on Linux infrastructure. Kali Linux ships as the standard distribution. The tools we automate via MCP here in the backend (nmap, gobuster, hydra, metasploit) are the exact identical binaries that professional ethical hackers spawn manually inside terminal environments.
        </p>
      </SectionReveal>

      <Checkpoint
        question="How does the app decide which tool to run after nmap?"
        options={["The order is hardcoded — it always runs the same sequence of tools", "Claude reads what nmap found and decides what to check next", "The user has to tell it what to run next"]}
        correctAnswerIndex={1}
        explanation="There's no preset order. Claude reads what nmap printed out, thinks about what it means, and decides what to try next. If it found port 80 open, it'll go after the web server. If it found SSH, it'll try that instead."
      />

      <SectionReveal>
        <h2 style={{ fontFamily: 'system-ui, -apple-system, sans-serif', fontSize: 24, fontWeight: 600, color: '#ffffff', marginBottom: 16, letterSpacing: '-0.02em' }}>3. Passive vs Active Reconnaissance</h2>
        <p style={{ fontFamily: 'system-ui, -apple-system, sans-serif', fontSize: 15, color: 'rgba(255,255,255,0.65)', lineHeight: 1.6, marginBottom: 16 }}>
          <strong>Passive:</strong> Passive mode never actually contacts the target. We pull info from places like Shodan and DNS that already have data on most servers out there. The server never knows we looked.
        </p>
        <p style={{ fontFamily: 'system-ui, -apple-system, sans-serif', fontSize: 15, color: 'rgba(255,255,255,0.65)', lineHeight: 1.6, marginBottom: 16 }}>
          <strong>Active:</strong> Active mode actually connects to the target. Your requests show up in their server logs. Scanning a server you don't own is illegal — it falls under the Computer Fraud and Abuse Act. The authorization checkbox in the app is a legal requirement, not just a formality.
        </p>
      </SectionReveal>

      {/* ── Pipeline Overview: static SVG thumbnails ─────────────────────────── */}
      <SectionReveal>
        <p style={{ fontFamily: 'system-ui, sans-serif', fontSize: 11, fontWeight: 600, color: 'rgba(255,255,255,0.35)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 16 }}>
          Pipeline Overview — click to expand
        </p>
        <div style={{ display: 'flex', gap: 20, marginBottom: 8 }}>
          {/* Passive Recon card */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 10 }}>
            <span style={{ fontFamily: 'system-ui, sans-serif', fontSize: 11, fontWeight: 600, color: 'rgba(255,255,255,0.4)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>Passive Recon</span>
            <motion.div
              onClick={() => setExpandedGraph('passive')}
              whileHover={{ borderColor: 'rgba(255,255,255,0.28)' }}
              style={{ cursor: 'pointer', border: '1px solid rgba(255,255,255,0.10)', borderRadius: 10, overflow: 'hidden', background: 'rgba(255,255,255,0.02)', aspectRatio: '1000/560' }}
            >
              <svg viewBox="0 0 1000 560" width="100%" height="100%" style={{ display: 'block' }}>
                {/* Fan-out lines: target → tools */}
                {[90, 275, 500, 725, 910].map((tx, i) => (
                  <line key={i} x1={500} y1={105} x2={tx} y2={255} stroke="rgba(255,255,255,0.55)" strokeWidth={1.5} />
                ))}
                {/* Convergence lines: tools → NVD */}
                {[90, 275, 500, 725, 910].map((tx, i) => (
                  <line key={i} x1={tx} y1={305} x2={500} y2={415} stroke="rgba(255,255,255,0.55)" strokeWidth={1.5} />
                ))}
                {/* Target block */}
                <g transform="translate(500, 80)">
                  <rect x={-91} y={-25} width={182} height={50} rx={10} fill="rgba(255,255,255,0.07)" stroke="rgba(255,255,255,0.22)" strokeWidth={1} />
                  <text textAnchor="middle" dominantBaseline="middle" fill="white" fontSize={13} fontFamily="system-ui, sans-serif">yourdomain.com</text>
                </g>
                {/* Tool blocks */}
                {[90, 275, 500, 725, 910].map((tx, i) => (
                  <g key={i} transform={`translate(${tx}, 280)`}>
                    <rect x={-76} y={-25} width={152} height={50} rx={10} fill="rgba(255,255,255,0.07)" stroke="rgba(255,255,255,0.22)" strokeWidth={1} />
                    <text textAnchor="middle" dominantBaseline="middle" fill="white" fontSize={11} fontFamily="system-ui, sans-serif">
                      {['Shodan API','WhatWeb','DNS & WHOIS','SSL / TLS','HTTP Headers'][i]}
                    </text>
                  </g>
                ))}
                {/* NVD block */}
                <g transform="translate(500, 440)">
                  <rect x={-76} y={-25} width={152} height={50} rx={10} fill="rgba(255,255,255,0.07)" stroke="rgba(255,255,255,0.22)" strokeWidth={1} />
                  <text textAnchor="middle" dominantBaseline="middle" fill="white" fontSize={13} fontFamily="system-ui, sans-serif">NVD CVE Lookup</text>
                </g>
              </svg>
            </motion.div>
            <p style={{ fontFamily: 'system-ui, sans-serif', fontSize: 11, color: 'rgba(255,255,255,0.25)', textAlign: 'center', margin: 0 }}>Click to expand</p>
          </div>

          {/* Active Recon card */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 10 }}>
            <span style={{ fontFamily: 'system-ui, sans-serif', fontSize: 11, fontWeight: 600, color: 'rgba(255,255,255,0.4)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>Active Recon</span>
            <motion.div
              onClick={() => setExpandedGraph('active')}
              whileHover={{ borderColor: 'rgba(255,255,255,0.28)' }}
              style={{ cursor: 'pointer', border: '1px solid rgba(255,255,255,0.10)', borderRadius: 10, overflow: 'hidden', background: 'rgba(255,255,255,0.02)', aspectRatio: '1000/560' }}
            >
              <svg viewBox="0 0 1000 560" width="100%" height="100%" style={{ display: 'block' }}>
                {/* target → nmap */}
                <line x1={500} y1={75} x2={500} y2={150} stroke="rgba(255,255,255,0.55)" strokeWidth={1.5} />
                {/* nmap → tools */}
                {[200, 500, 800].map((tx, i) => (
                  <line key={i} x1={500} y1={200} x2={tx} y2={280} stroke="rgba(255,255,255,0.55)" strokeWidth={1.5} />
                ))}
                {/* tools → NVD */}
                {[200, 500, 800].map((tx, i) => (
                  <line key={i} x1={tx} y1={330} x2={500} y2={400} stroke="rgba(255,255,255,0.55)" strokeWidth={1.5} />
                ))}
                {/* NVD → searchsploit */}
                <line x1={500} y1={450} x2={500} y2={490} stroke="rgba(255,255,255,0.55)" strokeWidth={1.5} />
                {/* Target block */}
                <g transform="translate(500, 50)">
                  <rect x={-91} y={-25} width={182} height={50} rx={10} fill="rgba(255,255,255,0.07)" stroke="rgba(255,255,255,0.22)" strokeWidth={1} />
                  <text textAnchor="middle" dominantBaseline="middle" fill="white" fontSize={13} fontFamily="system-ui, sans-serif">yourdomain.com</text>
                </g>
                {/* NMAP block */}
                <g transform="translate(500, 175)">
                  <rect x={-91} y={-25} width={182} height={50} rx={10} fill="rgba(255,255,255,0.07)" stroke="rgba(255,255,255,0.22)" strokeWidth={1} />
                  <text textAnchor="middle" dominantBaseline="middle" fill="white" fontSize={13} fontFamily="system-ui, sans-serif">NMAP Basic Scan</text>
                </g>
                {/* Tool blocks */}
                {[200, 500, 800].map((tx, i) => (
                  <g key={i} transform={`translate(${tx}, 305)`}>
                    <rect x={-76} y={-25} width={152} height={50} rx={10} fill="rgba(255,255,255,0.07)" stroke="rgba(255,255,255,0.22)" strokeWidth={1} />
                    <text textAnchor="middle" dominantBaseline="middle" fill="white" fontSize={12} fontFamily="system-ui, sans-serif">
                      {['Nikto','WhatWeb','Hydra'][i]}
                    </text>
                  </g>
                ))}
                {/* NVD block */}
                <g transform="translate(500, 425)">
                  <rect x={-76} y={-25} width={152} height={50} rx={10} fill="rgba(255,255,255,0.07)" stroke="rgba(255,255,255,0.22)" strokeWidth={1} />
                  <text textAnchor="middle" dominantBaseline="middle" fill="white" fontSize={12} fontFamily="system-ui, sans-serif">NVD CVE Lookup</text>
                </g>
                {/* Searchsploit block */}
                <g transform="translate(500, 515)">
                  <rect x={-76} y={-25} width={152} height={50} rx={10} fill="rgba(255,255,255,0.07)" stroke="rgba(255,255,255,0.22)" strokeWidth={1} />
                  <text textAnchor="middle" dominantBaseline="middle" fill="white" fontSize={12} fontFamily="system-ui, sans-serif">searchsploit</text>
                </g>
              </svg>
            </motion.div>
            <p style={{ fontFamily: 'system-ui, sans-serif', fontSize: 11, color: 'rgba(255,255,255,0.25)', textAlign: 'center', margin: 0 }}>Click to expand</p>
          </div>
        </div>
      </SectionReveal>

      {/* ── 4. Passive Recon: Step by Step ──────────────────────────────────── */}
      <SectionReveal id="tool-shodan">
        <h2 style={{ fontFamily: 'system-ui, -apple-system, sans-serif', fontSize: 24, fontWeight: 600, color: '#ffffff', marginBottom: 24, letterSpacing: '-0.02em' }}>4. Passive Recon: Step by Step</h2>

        <TypewriterCommand attachBadge="Shodan" command="shodan host [ip]" />
        <p style={{ fontFamily: 'system-ui, sans-serif', fontSize: 14, color: 'rgba(255,255,255,0.5)', marginBottom: 32 }}>Shodan is a search engine that continuously scans the internet and records what it finds. When we query it, we're just reading their data — nothing gets sent to the target at all.</p>

        <div id="tool-whatweb">
          <TypewriterCommand attachBadge="WhatWeb" command="whatweb http://[ip]" />
          <p style={{ fontFamily: 'system-ui, sans-serif', fontSize: 14, color: 'rgba(255,255,255,0.5)', marginBottom: 32 }}>WhatWeb makes one request to the server and reads what comes back. From the response, it can figure out what software is running and which version. We need those version numbers for the vulnerability lookup that comes later.</p>
        </div>

        <TypewriterCommand attachBadge="DNS/WHOIS" command="dig any yourdomain.com" />
        <p style={{ fontFamily: 'system-ui, sans-serif', fontSize: 14, color: 'rgba(255,255,255,0.5)', marginBottom: 32 }}>We ask DNS to tell us everything it knows about the domain. Subdomains, mail servers, who registered it — all public info. None of this ever touches the actual server.</p>

        <div id="tool-ssl-tls">
          <TypewriterCommand attachBadge="SSL/TLS" command="sslyze --regular yourdomain.com" />
          <p style={{ fontFamily: 'system-ui, sans-serif', fontSize: 14, color: 'rgba(255,255,255,0.5)', marginBottom: 32 }}>This checks how the server handles encrypted connections. We look at whether it's using old encryption methods that have known weaknesses, and whether its certificate is still valid. A lot of servers have outdated settings here without realizing it.</p>
        </div>

        <div id="tool-http-headers">
          <TypewriterCommand attachBadge="HTTP Headers" command="curl -I http://yourdomain.com" />
          <p style={{ fontFamily: 'system-ui, sans-serif', fontSize: 14, color: 'rgba(255,255,255,0.5)', marginBottom: 32 }}>We make one request and look at what the server sends back. There are several security settings that are supposed to be in the response by default — things that tell the browser how to handle the connection safely. If they're missing, that's a misconfiguration, not a bug.</p>
        </div>

        <div id="tool-nvd">
          <TypewriterCommand attachBadge="NVD" command='curl "https://services.nvd.nist.gov/rest/json/cves/2.0?keywordSearch=Apache+2.4.49"' />
          <p style={{ fontFamily: 'system-ui, sans-serif', fontSize: 14, color: 'rgba(255,255,255,0.5)', marginBottom: 32 }}>We take the software versions we found and look them up in the NVD — it's a government database that tracks known vulnerabilities in software. Each entry is called a CVE and has a severity score from 0 to 10.</p>
        </div>
      </SectionReveal>

      <Checkpoint
        question="WhatWeb comes back saying the server runs Apache httpd 2.4.49. What happens next?"
        options={["Gobuster starts trying to find hidden pages", "We look up that version number in the vulnerability database", "Hydra tries to log in on port 80"]}
        correctAnswerIndex={1}
        explanation="We search the NVD for that exact version. There's a known vulnerability — CVE-2021-41773 — that only affects Apache 2.4.49 specifically. You can't find the right entry without knowing the exact version first."
      />

      {/* ── 5. Active Recon: Step by Step ───────────────────────────────────── */}
      <SectionReveal id="tool-nmap">
        <h2 style={{ fontFamily: 'system-ui, -apple-system, sans-serif', fontSize: 24, fontWeight: 600, color: '#ffffff', marginBottom: 24, letterSpacing: '-0.02em' }}>5. Active Recon: Step by Step</h2>

        <TypewriterCommand attachBadge="nmap" command="nmap [ip]" />
        <p style={{ fontFamily: 'system-ui, sans-serif', fontSize: 14, color: 'rgba(255,255,255,0.5)', marginBottom: 16 }}>First, nmap checks which ports are open. Ports are numbered channels — different services listen on different ones. nmap probes the most common ones and sees which respond. It does this without fully connecting, so it's fast and doesn't generate much noise.</p>

        <TypewriterCommand attachBadge="nmap" command="nmap -A -p [open ports] [ip]" />
        <p style={{ fontFamily: 'system-ui, sans-serif', fontSize: 14, color: 'rgba(255,255,255,0.5)', marginBottom: 32 }}>Once we know which ports are open, we go back and look closer. This time nmap figures out what software is running on each one, what version, and what operating system. Claude reads this output and decides what tools to run next.</p>

        <div id="tool-nikto">
          <TypewriterCommand attachBadge="Nikto" command="nikto -h http://[ip]" />
          <p style={{ fontFamily: 'system-ui, sans-serif', fontSize: 14, color: 'rgba(255,255,255,0.5)', marginBottom: 32 }}>If port 80 or 443 is open, there's a web server. Nikto hits it with thousands of requests looking for known issues — old files, misconfigured settings, outdated software. The server will definitely notice this traffic.</p>
        </div>

        <div id="tool-whatweb-active">
          <TypewriterCommand attachBadge="WhatWeb" command="whatweb -a 3 http://[ip]" />
          <p style={{ fontFamily: 'system-ui, sans-serif', fontSize: 14, color: 'rgba(255,255,255,0.5)', marginBottom: 32 }}>After Nikto confirms the web server is running, we run WhatWeb again with more requests. We're double-checking the software versions — more requests means more confidence in what we find.</p>
        </div>

        <div id="tool-gobuster">
          <TypewriterCommand attachBadge="Gobuster" command="gobuster dir -u http://[ip] -w /usr/share/wordlists/dirb/common.txt" />
          <p style={{ fontFamily: 'system-ui, sans-serif', fontSize: 14, color: 'rgba(255,255,255,0.5)', marginBottom: 32 }}>Gobuster tries to find pages and folders that aren't linked anywhere publicly. It goes through a big wordlist of common names and requests each one. If something responds, it exists. That's how you find admin panels and forgotten backup files.</p>
        </div>

        <div id="tool-ffuf">
          <TypewriterCommand attachBadge="FFuF" command="ffuf -w /usr/share/wordlists/dirb/common.txt -u http://[ip]/FUZZ" />
          <p style={{ fontFamily: 'system-ui, sans-serif', fontSize: 14, color: 'rgba(255,255,255,0.5)', marginBottom: 32 }}>FFuF does the same kind of thing as Gobuster but faster and more flexible. You can point it at any part of the URL — not just the path. Useful for finding hidden parameters and subdomains in addition to directories.</p>
        </div>

        <div id="tool-hydra">
          <TypewriterCommand attachBadge="Hydra" command="hydra -l root -P /usr/share/wordlists/rockyou.txt mysql://[ip]" />
          <p style={{ fontFamily: 'system-ui, sans-serif', fontSize: 14, color: 'rgba(255,255,255,0.5)', marginBottom: 32 }}>If we find a port that requires a login — like SSH on port 22 or a database port — Hydra tries to get in. It uses the RockYou list, a huge collection of real passwords from a past data breach. A lot of servers still have weak default credentials.</p>
        </div>

        <div id="tool-metasploit">
          <TypewriterCommand attachBadge="Metasploit" command='msfconsole -x "use auxiliary/scanner/smb/smb_ms17_010; set RHOSTS [ip]; run"' />
          <p style={{ fontFamily: 'system-ui, sans-serif', fontSize: 14, color: 'rgba(255,255,255,0.5)', marginBottom: 32 }}>If port 445 is open, that's the Windows file sharing port, and we check for EternalBlue. EternalBlue is a vulnerability the NSA found and kept secret until it leaked. It's what WannaCry was built on. An unpatched Windows server with that port exposed can be taken over in seconds.</p>
        </div>

        <div id="tool-exploitdb">
          <TypewriterCommand attachBadge="searchsploit" command="searchsploit apache 2.4.49" />
          <p style={{ fontFamily: 'system-ui, sans-serif', fontSize: 14, color: 'rgba(255,255,255,0.5)', marginBottom: 32 }}>After finding CVEs in the NVD, we check ExploitDB to see if someone's already written working exploit code for them. A vulnerability with published exploit code is way more dangerous than a theoretical one — anyone can use it.</p>
        </div>
      </SectionReveal>

      <Checkpoint
        question="Nmap finds port 445 open. What should run next?"
        options={["Hydra — tries to log in using common passwords", "Nikto — scans the web server on port 445", "Metasploit — checks if the server is vulnerable to EternalBlue"]}
        correctAnswerIndex={2}
        explanation="Port 445 is Windows file sharing. EternalBlue is a vulnerability the NSA built and kept secret — it leaked, and then hackers used it to build WannaCry. An unpatched Windows server with this port open can be fully compromised in seconds. That's why we check it immediately."
      />

      <SectionReveal>
        <h2 style={{ fontFamily: 'system-ui, -apple-system, sans-serif', fontSize: 24, fontWeight: 600, color: '#ffffff', marginBottom: 24, letterSpacing: '-0.02em' }}>6. Typical Port Map Routing</h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: 12, padding: 16 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '60px 100px 1fr', gap: 16, padding: '8px 16px', borderBottom: '1px solid rgba(255,255,255,0.1)', fontFamily: 'system-ui, sans-serif', fontSize: 12, fontWeight: 600, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            <span>Port</span>
            <span>Service</span>
            <span>Triggered Tool Action</span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '60px 100px 1fr', gap: 16, padding: '12px 16px', fontFamily: 'monospace', fontSize: 13, color: '#ffffff', background: 'rgba(0,0,0,0.2)', borderRadius: 8 }}>
            <span style={{ color: '#60a5fa' }}>22</span>
            <span>SSH</span>
            <span style={{ color: 'rgba(255,255,255,0.6)' }}>Hydra tries common passwords → John the Ripper cracks any password hashes we find</span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '60px 100px 1fr', gap: 16, padding: '12px 16px', fontFamily: 'monospace', fontSize: 13, color: '#ffffff', background: 'rgba(0,0,0,0.2)', borderRadius: 8 }}>
            <span style={{ color: '#60a5fa' }}>80/443</span>
            <span>HTTP/S</span>
            <span style={{ color: 'rgba(255,255,255,0.6)' }}>WhatWeb → Nikto → Gobuster → FFuF</span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '60px 100px 1fr', gap: 16, padding: '12px 16px', fontFamily: 'monospace', fontSize: 13, color: '#ffffff', background: 'rgba(0,0,0,0.2)', borderRadius: 8 }}>
            <span style={{ color: '#60a5fa' }}>445</span>
            <span>SMB</span>
            <span style={{ color: 'rgba(255,255,255,0.6)' }}>Metasploit checks for EternalBlue (MS17-010)</span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '60px 100px 1fr', gap: 16, padding: '12px 16px', fontFamily: 'monospace', fontSize: 13, color: '#ffffff', background: 'rgba(0,0,0,0.2)', borderRadius: 8 }}>
            <span style={{ color: '#60a5fa' }}>3306</span>
            <span>MySQL</span>
            <span style={{ color: 'rgba(255,255,255,0.6)' }}>Hydra tries blank passwords, root/root, and common leaked credentials</span>
          </div>
        </div>
      </SectionReveal>

    </motion.div>
    {createPortal(
      <AnimatePresence>
        {expandedGraph !== null && (
          <GraphOverlay key={expandedGraph} type={expandedGraph} onClose={() => setExpandedGraph(null)} />
        )}
      </AnimatePresence>,
      document.body
    )}
    </>
  )
}

export default function Guide() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [activeTab, setActiveTab] = useState('non-dev') // 'non-dev' | 'dev'
  const guideScrollRef = useRef(null)
  const [thumbTop, setThumbTop] = useState(0)
  const [thumbHeight, setThumbHeight] = useState(0)

  const updateThumb = useCallback(() => {
    const el = guideScrollRef.current
    if (!el || el.scrollHeight <= el.clientHeight) { setThumbHeight(0); return }
    const trackH = window.innerHeight - 2 * ARROW_H
    const ratio = el.clientHeight / el.scrollHeight
    const th = Math.max(trackH * ratio, 24)
    const maxScroll = el.scrollHeight - el.clientHeight
    const scrollRatio = maxScroll > 0 ? el.scrollTop / maxScroll : 0
    setThumbHeight(th)
    setThumbTop(ARROW_H + scrollRatio * (trackH - th))
  }, [])

  useEffect(() => { updateThumb() }, [updateThumb])

  return (
    <div style={{ position: 'relative', height: '100vh', width: '100vw', overflow: 'hidden', background: '#070a0d' }}>
      <ShaderBackground />

      <nav
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: 64,
          zIndex: 50,
          background: 'linear-gradient(180deg, rgba(30, 35, 42, 0.6) 0%, rgba(20, 25, 30, 0.2) 100%)',
          backdropFilter: 'blur(16px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '0 32px',
        }}
      >
        <div style={{
          width: '100%',
          maxWidth: 1000,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          fontFamily: 'system-ui, -apple-system, sans-serif'
        }}>
          <div style={{ fontSize: 18, fontWeight: 600, color: '#ffffff', letterSpacing: '-0.02em', cursor: 'pointer', fontFamily: "'IBM Plex Mono', monospace" }} onClick={() => navigate('/')}>
            Blindspot
          </div>
          <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
            <motion.button 
              type="button"
              onClick={() => navigate(user ? '/scan' : '/')}
              whileHover={{ backgroundColor: '#ffffff', color: '#0a0a0a', borderColor: '#ffffff' }}
              initial={{ backgroundColor: 'rgba(255, 255, 255, 0.03)', color: '#ffffff', borderColor: 'rgba(255, 255, 255, 0.15)' }}
              transition={{ duration: 0.2 }}
              style={{
                fontFamily: 'system-ui, -apple-system, sans-serif',
                fontSize: 14,
                fontWeight: 500,
                padding: '10px 24px',
                border: '1px solid rgba(255, 255, 255, 0.15)',
                borderRadius: 6,
                cursor: 'pointer',
                letterSpacing: '0.01em',
                backdropFilter: 'blur(4px)',
              }}
            >
              Back to App
            </motion.button>
          </div>
        </div>
      </nav>

      <div
        ref={guideScrollRef}
        className="pentest-scrollbar-report"
        onScroll={updateThumb}
        style={{
          position: 'absolute',
          inset: '64px 0 0 0',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          padding: '48px 32px',
          zIndex: 1,
          overflowY: 'auto',
          overscrollBehavior: 'contain',
          scrollBehavior: 'smooth',
        }}
      >
        <div style={{ width: '100%', maxWidth: 720 }}>
          <div style={{ textAlign: 'center', marginBottom: 48 }}>
            <h1 style={{ fontFamily: 'system-ui, -apple-system, sans-serif', fontSize: 40, fontWeight: 700, color: '#ffffff', marginBottom: 16, letterSpacing: '-0.03em' }}>
              Living User Guide
            </h1>
            <p style={{ fontFamily: 'system-ui, -apple-system, sans-serif', fontSize: 16, color: 'rgba(255,255,255,0.5)' }}>
              Select your background level to adapt the manual's language.
            </p>
          </div>

          <div style={{ display: 'flex', background: 'rgba(0,0,0,0.3)', borderRadius: 12, padding: 6, marginBottom: 48, border: '1px solid rgba(255,255,255,0.05)' }}>
            <button
              onClick={() => setActiveTab('non-dev')}
              style={{
                flex: 1,
                padding: '14px 0',
                borderRadius: 8,
                border: 'none',
                background: activeTab === 'non-dev' ? 'rgba(255,255,255,0.1)' : 'transparent',
                color: activeTab === 'non-dev' ? '#ffffff' : 'rgba(255,255,255,0.4)',
                fontFamily: 'system-ui, -apple-system, sans-serif',
                fontSize: 15,
                fontWeight: 500,
                cursor: 'pointer',
                transition: 'all 0.2s',
              }}
            >
              Non-Developer
            </button>
            <button
              onClick={() => setActiveTab('dev')}
              style={{
                flex: 1,
                padding: '14px 0',
                borderRadius: 8,
                border: 'none',
                background: activeTab === 'dev' ? 'rgba(255,255,255,0.1)' : 'transparent',
                color: activeTab === 'dev' ? '#ffffff' : 'rgba(255,255,255,0.4)',
                fontFamily: 'system-ui, -apple-system, sans-serif',
                fontSize: 15,
                fontWeight: 500,
                cursor: 'pointer',
                transition: 'all 0.2s',
              }}
            >
              Developer
            </button>
          </div>

          <AnimatePresence mode="wait">
            {activeTab === 'non-dev' ? <NonDeveloperTab /> : <DeveloperTab />}
          </AnimatePresence>

          <div style={{ height: 120 }} />
        </div>
      </div>

      {createPortal(
        <div style={{ position: 'fixed', top: 0, right: 0, width: BAR_W, height: '100vh', zIndex: 51, pointerEvents: 'none' }}>
          <motion.button
            whileHover={{ backgroundColor: 'rgba(156, 163, 175, 0.25)' }}
            onClick={() => guideScrollRef.current?.scrollBy({ top: -80, behavior: 'smooth' })}
            style={{
              position: 'absolute', top: 0, left: 0, right: 0, height: ARROW_H,
              backgroundColor: 'rgba(156, 163, 175, 0.1)', border: 'none', cursor: 'pointer',
              padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'auto',
            }}
          >
            <svg width="6" height="4" viewBox="0 0 6 4"><polygon points="3,0 6,4 0,4" fill="rgba(156,163,175,0.75)" /></svg>
          </motion.button>
          <motion.div
            animate={{ top: thumbTop, height: thumbHeight }}
            transition={{ duration: 0.1, ease: 'easeOut' }}
            style={{
              position: 'absolute', left: 0, right: 0, borderRadius: 2,
              background: thumbHeight > 0 ? 'rgba(156, 163, 175, 0.35)' : 'transparent',
            }}
          />
          <motion.button
            whileHover={{ backgroundColor: 'rgba(156, 163, 175, 0.25)' }}
            onClick={() => guideScrollRef.current?.scrollBy({ top: 80, behavior: 'smooth' })}
            style={{
              position: 'absolute', bottom: 0, left: 0, right: 0, height: ARROW_H,
              backgroundColor: 'rgba(156, 163, 175, 0.1)', border: 'none', cursor: 'pointer',
              padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'auto',
            }}
          >
            <svg width="6" height="4" viewBox="0 0 6 4"><polygon points="3,4 6,0 0,0" fill="rgba(156,163,175,0.75)" /></svg>
          </motion.button>
        </div>,
        document.body
      )}
    </div>
  )
}
