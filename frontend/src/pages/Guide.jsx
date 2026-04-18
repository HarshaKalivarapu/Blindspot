import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import ShaderBackground from '../components/homepage/ShaderBackground.jsx'
import CopyButton from '../components/ui/CopyButton.jsx'

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
      <div style={{ position: 'relative', padding: '14px 18px', background: 'rgba(0,0,0,0.5)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, fontFamily: 'monospace', fontSize: 13, color: '#10b981', overflowX: 'auto', whiteSpace: 'pre' }}>
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
        question="Your scan comes back with a score of 3. What should you do?"
        options={["Nothing, 3 out of 10 sounds fine", "Fix it sometime this month", "Treat it as an emergency and act immediately"]}
        correctAnswerIndex={2}
        explanation="Wait! The question is slightly tricky based on normal school failing grades, but a score of 3 in vulnerability scanning means confirmed attack paths exist. This is not a warning — it is an emergency."
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

function DeveloperTab() {
  const tools = ['Shodan', 'WhatWeb', 'nmap', 'Nikto', 'Gobuster', 'FFuF', 'Hydra', 'Metasploit', 'John the Ripper', 'NVD', 'ExploitDB']
  
  return (
    <motion.div
      key="dev"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.3 }}
      style={{ width: '100%' }}
    >
      <div style={{ display: 'flex', gap: 12, overflowX: 'auto', paddingBottom: 24, marginBottom: 40, borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
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
        question="Claude decides which tool to run next based on:"
        options={["A hardcoded list of if/else rules in the code", "The output of the previous tool — Claude reasons about what to do next", "Whatever the user types in chat"]}
        correctAnswerIndex={1}
        explanation="Claude reads each tool's raw output and decides the next step dynamically. The branching logic is Claude's live reasoning, not hardcoded conditionals."
      />

      <SectionReveal>
        <h2 style={{ fontFamily: 'system-ui, -apple-system, sans-serif', fontSize: 24, fontWeight: 600, color: '#ffffff', marginBottom: 16, letterSpacing: '-0.02em' }}>3. Passive vs Active Reconnaissance</h2>
        <p style={{ fontFamily: 'system-ui, -apple-system, sans-serif', fontSize: 15, color: 'rgba(255,255,255,0.65)', lineHeight: 1.6, marginBottom: 16 }}>
          <strong>Passive:</strong> No raw TCP packets are ever routed to the target. All recon relies heavily on querying third-party APIs and DNS registers. This introduces absolutely zero legal risk.
        </p>
        <p style={{ fontFamily: 'system-ui, -apple-system, sans-serif', fontSize: 15, color: 'rgba(255,255,255,0.65)', lineHeight: 1.6, marginBottom: 16 }}>
          <strong>Active:</strong> Direct traffic is routed to the target. The target server will register our footprints in their Apache/Nginx access logs and intrusion detection monitors. It is strictly only legal on systems you own or maintain written permission to attack.
        </p>
      </SectionReveal>

      <SectionReveal id="tool-shodan">
        <h2 style={{ fontFamily: 'system-ui, -apple-system, sans-serif', fontSize: 24, fontWeight: 600, color: '#ffffff', marginBottom: 24, letterSpacing: '-0.02em' }}>4. Passive Recon Commands</h2>
        
        <TypewriterCommand attachBadge="Shodan" command="shodan host [ip]" />
        <p style={{ fontFamily: 'system-ui, sans-serif', fontSize: 14, color: 'rgba(255,255,255,0.5)', marginBottom: 32 }}>Queries the global Shodan index for exposed IoT properties or historical port data without directly pinging the host.</p>
        
        <TypewriterCommand attachBadge="dig" command="dig [ip]" />
        <p style={{ fontFamily: 'system-ui, sans-serif', fontSize: 14, color: 'rgba(255,255,255,0.5)', marginBottom: 32 }}>Queries authoritative DNS servers to rip records related to the domain.</p>
        
        <TypewriterCommand attachBadge="WhatWeb" command="whatweb http://[ip]" />
        <p style={{ fontFamily: 'system-ui, sans-serif', fontSize: 14, color: 'rgba(255,255,255,0.5)', marginBottom: 32 }}>Pulls HTTP headers and aggressively parses them to identify backend web technologies, frameworks, and CMS versions.</p>
        
        <div id="tool-nvd">
          <TypewriterCommand attachBadge="NVD" command='curl "https://services.nvd.nist.gov/rest/json/cves/2.0?keywordSearch=Apache+2.4.49"' />
          <p style={{ fontFamily: 'system-ui, sans-serif', fontSize: 14, color: 'rgba(255,255,255,0.5)', marginBottom: 32 }}>Queries the National Vulnerability Database API directly for cross-referencing precise software strings parsed earlier in the pipeline for known exploits.</p>
        </div>
      </SectionReveal>

      <Checkpoint 
        question="WhatWeb returns 'Apache httpd 2.4.49' — what is the immediate next step?"
        options={["Run gobuster to find hidden directories", "Look up Apache 2.4.49 in the NVD CVE database", "Run hydra against port 80"]}
        correctAnswerIndex={1}
        explanation="The version string is fed directly into the NVD API. CVE-2021-41773 affects Apache 2.4.49 specifically — without the version you cannot look up the right CVE."
      />

      <SectionReveal id="tool-nmap">
        <h2 style={{ fontFamily: 'system-ui, -apple-system, sans-serif', fontSize: 24, fontWeight: 600, color: '#ffffff', marginBottom: 24, letterSpacing: '-0.02em' }}>5. Active Recon Commands</h2>
        
        <TypewriterCommand attachBadge="nmap" command="nmap [ip]" />
        <p style={{ fontFamily: 'system-ui, sans-serif', fontSize: 14, color: 'rgba(255,255,255,0.5)', marginBottom: 16 }}>Lightweight SYN stealth scan against the 1000 most common ports.</p>
        
        <TypewriterCommand attachBadge="nmap" command="nmap -A -p [open ports] [ip]" />
        <p style={{ fontFamily: 'system-ui, sans-serif', fontSize: 14, color: 'rgba(255,255,255,0.5)', marginBottom: 32 }}>Aggressive script scanning, OS footprinting, and banner grabbing against newly identified open service ports.</p>
        
        <div id="tool-nikto">
          <TypewriterCommand attachBadge="Nikto" command="nikto -h http://[ip]" />
          <p style={{ fontFamily: 'system-ui, sans-serif', fontSize: 14, color: 'rgba(255,255,255,0.5)', marginBottom: 32 }}>Throws massive arrays of generic web-server attacks and misconfiguration checks against any identified Port 80 / 443 web servers.</p>
        </div>
        
        <div id="tool-gobuster">
          <TypewriterCommand attachBadge="Gobuster" command="gobuster dir -u http://[ip] -w /usr/share/wordlists/dirb/common.txt" />
          <p style={{ fontFamily: 'system-ui, sans-serif', fontSize: 14, color: 'rgba(255,255,255,0.5)', marginBottom: 32 }}>Brute forces the target webserver using massive custom dictionaries to uncover hidden endpoints and admin panels.</p>
        </div>
        
        <div id="tool-hydra">
          <TypewriterCommand attachBadge="Hydra" command="hydra -l root -P /usr/share/wordlists/rockyou.txt mysql://[ip]" />
          <p style={{ fontFamily: 'system-ui, sans-serif', fontSize: 14, color: 'rgba(255,255,255,0.5)', marginBottom: 32 }}>Network logon cracker blasting default and leaked passwords against exposed login nodes (SSH, MySQL, Redis).</p>
        </div>
        
        <div id="tool-metasploit">
          <TypewriterCommand attachBadge="Metasploit" command='msfconsole -x "use auxiliary/scanner/smb/smb_ms17_010; set RHOSTS [ip]; run"' />
          <p style={{ fontFamily: 'system-ui, sans-serif', fontSize: 14, color: 'rgba(255,255,255,0.5)', marginBottom: 32 }}>Automatically triggers known exploit scripts programmatically when severe high-profile vulnerabilities are mapped in the reconnaissance phase.</p>
        </div>
      </SectionReveal>

      <Checkpoint 
        question="Nmap finds port 445 open. What runs next?"
        options={["Hydra brute force", "Nikto web scanner", "EternalBlue SMB auxiliary scan"]}
        correctAnswerIndex={2}
        explanation="Port 445 is SMB — Windows file sharing. EternalBlue (MS17-010) is the most critical known SMB exploit and is checked automatically when 445 is open via Metasploit modules."
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
            <span style={{ color: 'rgba(255,255,255,0.6)' }}>Hydra brute force → John the Ripper (if hashes extracted)</span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '60px 100px 1fr', gap: 16, padding: '12px 16px', fontFamily: 'monospace', fontSize: 13, color: '#ffffff', background: 'rgba(0,0,0,0.2)', borderRadius: 8 }}>
            <span style={{ color: '#60a5fa' }}>80/443</span>
            <span>HTTP/S</span>
            <span style={{ color: 'rgba(255,255,255,0.6)' }}>WhatWeb → Nikto → Gobuster → FFuF</span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '60px 100px 1fr', gap: 16, padding: '12px 16px', fontFamily: 'monospace', fontSize: 13, color: '#ffffff', background: 'rgba(0,0,0,0.2)', borderRadius: 8 }}>
            <span style={{ color: '#60a5fa' }}>445</span>
            <span>SMB</span>
            <span style={{ color: 'rgba(255,255,255,0.6)' }}>Metasploit MS17-010 Scanning Module</span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '60px 100px 1fr', gap: 16, padding: '12px 16px', fontFamily: 'monospace', fontSize: 13, color: '#ffffff', background: 'rgba(0,0,0,0.2)', borderRadius: 8 }}>
            <span style={{ color: '#60a5fa' }}>3306</span>
            <span>MySQL</span>
            <span style={{ color: 'rgba(255,255,255,0.6)' }}>Hydra check for blank/default credentials</span>
          </div>
        </div>
      </SectionReveal>

    </motion.div>
  )
}

export default function Guide() {
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState('non-dev') // 'non-dev' | 'dev'

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
          <div style={{ fontSize: 18, fontWeight: 600, color: '#ffffff', letterSpacing: '-0.02em', cursor: 'pointer' }} onClick={() => navigate('/')}>
            Blindspot
          </div>
          <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
            <motion.button 
              type="button"
              onClick={() => navigate('/scan/new')}
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
        style={{
          position: 'absolute',
          inset: '64px 0 0 0',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          padding: '48px 32px',
          zIndex: 1,
          overflowY: 'auto',
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
    </div>
  )
}
