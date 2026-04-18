import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import ShaderBackground from '../components/homepage/ShaderBackground.jsx'

// ─── HARDCODED SCAN DATA ────────────────────────────────────────────────────
const SCAN_OUTPUT = {
  target: '192.168.1.1',
  scan_type: 'active',
  scan_mode: 'aggressive',
  timestamp: '2023-10-27T10:45:00Z',
  risk_level: 'Critical',
  overall_score: 9.2,

  ports: [
    {
      port: 80,
      state: 'open',
      service: 'http',
      version: 'Apache httpd 2.4.49',
      risk: 'Critical',
      scripts_run: [
        {
          tool: 'nikto',
          command: 'nikto -h http://192.168.1.1',
          output: '+ Server: Apache/2.4.49 (Unix)\n+ /cgi-bin/ : Directory indexing found.\n+ CVE-2021-41773: Path traversal vulnerability identified.',
        },
      ],
      cves: [
        {
          id: 'CVE-2021-41773',
          cvss_score: 9.8,
          severity: 'Critical',
          description: 'A flaw was found in a change made to path normalization in Apache HTTP Server 2.4.49. An attacker could use a path traversal attack to map URLs to files outside the directories configured horizontally.',
          analogy: 'Imagine your web server is an office building where visitors are only allowed in the lobby. This vulnerability is like a structural flaw that lets anyone use the maintenance elevator to bypass security and access private executive files on any floor.',
          affected_version: '2.4.49',
          patch_version: '2.4.51',
        },
      ],
      findings: [
        { 
          type: 'Exposure', 
          severity: 'Medium', 
          detail: 'Directory indexing enabled on /uploads',
          analogy: 'Think of this like leaving your filing cabinet wide open in a public hallway. Anyone walking by can see and easily take all the documents inside without needing a key.'
        },
      ],
      recommendations: [
        { priority: 'Critical', action: 'Update Apache immediately to version 2.4.51 or higher' },
        { priority: 'High', action: 'Remove or properly secure /config.php.bak' },
        { priority: 'Medium', action: 'Disable directory indexing on /uploads via .htaccess' },
      ],
    },

    {
      port: 22,
      state: 'open',
      service: 'ssh',
      version: 'OpenSSH 4.7p1',
      risk: 'High',
      scripts_run: [
        {
          tool: 'nmap',
          command: 'nmap -p 22 --script ssh2-enum-algos 192.168.1.1',
          output: 'weak algorithms supported: \n kex: diffie-hellman-group1-sha1\n ciphers: aes128-cbc, 3des-cbc',
        },
      ],
      cves: [
        {
          id: 'CVE-2023-38408',
          cvss_score: 8.1,
          severity: 'High',
          description: 'Remote code execution in OpenSSH\'s forwarded ssh-agent.',
          analogy: 'This is equivalent to handing a counterfeited master remote control to a burglar, allowing them to open your garage door and run any commands inside your house from down the street.',
          affected_version: '< 9.3p2',
          patch_version: '9.3p2',
        },
      ],
      findings: [
        { 
          type: 'Outdated Component', 
          severity: 'High', 
          detail: 'OpenSSH 4.7p1 is severely outdated and supports weak algorithms',
          analogy: 'This is like using an antique skeleton-key lock on a modern bank vault. The security standards are so old that thieves can easily pick it with modern automated tools.'
        },
      ],
      recommendations: [
        { priority: 'High', action: 'Update OpenSSH to the latest version (9.x)' },
        { priority: 'Medium', action: 'Disable weak ciphers and MACs in sshd_config' },
        { priority: 'Low', action: 'Disable PasswordAuthentication and force Key-Based Auth' },
      ],
    },
  ],

  summary: {
    open_ports: [80, 22],
    critical: 1,
    high: 2,
    medium: 1,
  },
}

// ─── UTILITIES & STYLES ────────────────────────────────────────────────────────
const SEVERITY_COLOR = {
  Critical: '#ef4444',
  High: '#f97316',
  Medium: '#eab308',
  Low: '#6b7280',
}

function StatBox({ label, value, color, isMinimized }) {
  return (
    <div style={{
      background: 'rgba(255,255,255,0.02)',
      border: '1px solid rgba(255,255,255,0.05)',
      borderRadius: 12,
      padding: isMinimized ? '12px' : '20px',
      display: 'flex',
      flexDirection: 'column',
      gap: 4,
      position: 'relative',
      overflow: 'hidden'
    }}>
      <div style={{
        position: 'absolute',
        top: -20, right: -20, width: 80, height: 80,
        background: `radial-gradient(circle, ${color}22 0%, transparent 70%)`,
        filter: 'blur(10px)'
      }} />
      <div style={{ fontFamily: 'system-ui, sans-serif', fontSize: isMinimized ? 10 : 12, color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
        {label}
      </div>
      <div style={{ fontFamily: '"JetBrains Mono", monospace', fontSize: isMinimized ? 18 : 24, fontWeight: 700, color, position: 'relative', zIndex: 1 }}>
        {value}
      </div>
    </div>
  )
}

export default function ReportActiveVisual() {
  const [scanData] = useState(SCAN_OUTPUT)
  const navigate = useNavigate()
  
  const [selectedPort, setSelectedPort] = useState(null)
  
  // Track Modal state
  const [activeModal, setActiveModal] = useState({ isOpen: false, type: null, vuln: null, port: null })
  
  const portRefs = useRef({})
  const scrollRef = useRef(null)
  
  const [trunkCoords, setTrunkCoords] = useState(null)
  const [isReadyToDraw, setIsReadyToDraw] = useState(false)

  const updateTrunkPosition = () => {
    if (selectedPort && portRefs.current[selectedPort.port]) {
      const rect = portRefs.current[selectedPort.port].getBoundingClientRect();
      setTrunkCoords({ x: rect.right, y: rect.top + rect.height / 2 })
    }
  }

  // Follow position on resize
  useEffect(() => {
    if (isReadyToDraw) {
      updateTrunkPosition()
      window.addEventListener('resize', updateTrunkPosition)
      return () => window.removeEventListener('resize', updateTrunkPosition)
    }
  }, [selectedPort, isReadyToDraw])

  return (
    <div style={{ position: 'relative', height: '100vh', width: '100vw', overflow: 'hidden', background: '#070a0d', display: 'flex' }}>
      <ShaderBackground />

      <nav
        style={{
          position: 'absolute', top: 0, left: 0, right: 0, height: 64, zIndex: 50,
          background: 'linear-gradient(180deg, rgba(30, 35, 42, 0.6) 0%, rgba(20, 25, 30, 0.2) 100%)',
          backdropFilter: 'blur(16px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 32px',
        }}
      >
        <div style={{ width: '100%', maxWidth: 1000, display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontFamily: 'system-ui, sans-serif' }}>
          <div style={{ fontSize: 18, fontWeight: 600, color: '#ffffff', letterSpacing: '-0.02em', cursor: 'pointer' }} onClick={() => navigate('/scan')}>
            ShieldScan
          </div>
          <button
            onClick={() => navigate('/scan')}
            style={{
              fontFamily: 'system-ui, sans-serif', fontSize: 14, fontWeight: 500, padding: '8px 20px',
              border: '1px solid rgba(255, 255, 255, 0.15)', borderRadius: 6, cursor: 'pointer',
              background: 'rgba(255, 255, 255, 0.03)', color: '#ffffff'
            }}
          >
            Back to Console
          </button>
        </div>
      </nav>

      {/* Main Container Layer */}
      <div 
        ref={scrollRef}
        onScroll={() => { if (isReadyToDraw) updateTrunkPosition() }}
        style={{
          position: 'absolute', inset: '64px 0 0 0',
          display: 'flex', flexDirection: 'column',
          alignItems: selectedPort ? 'flex-start' : 'center',
          padding: '40px 32px', zIndex: 10,
          overflowY: 'auto', overflowX: 'hidden' 
        }}
      >
        <motion.div
           initial={{ width: 820 }}
           animate={{ 
             width: selectedPort ? 480 : 820,
             marginLeft: selectedPort ? '4vw' : '0' 
           }}
           transition={{ type: 'spring', stiffness: 220, damping: 28 }}
           onAnimationComplete={() => {
             if (selectedPort) {
               updateTrunkPosition()
               setIsReadyToDraw(true)
             }
           }}
           style={{
             background: 'transparent', backdropFilter: 'blur(8px)',
             border: '1px solid rgba(255, 255, 255, 0.08)', borderRadius: selectedPort ? 16 : 24,
             padding: selectedPort ? '32px 24px' : '48px 56px',
             color: '#ffffff', marginBottom: 64, 
           }}
        >
          {/* Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: selectedPort ? 32 : 48 }}>
            <div>
              <h1 style={{ fontFamily: 'system-ui, sans-serif', fontSize: selectedPort ? 24 : 36, fontWeight: 600, letterSpacing: '-0.02em', margin: '0 0 8px 0' }}>Vulnerability Report</h1>
              <div style={{ fontFamily: '"JetBrains Mono", monospace', fontSize: selectedPort ? 13 : 16, color: 'rgba(255,255,255,0.5)' }}>
                Target: <span style={{ color: '#ffffff', fontWeight: 600 }}>{scanData.target}</span>
              </div>
            </div>
          </div>

          {!selectedPort && (
             <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 48, paddingBottom: 48, borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
               <StatBox label="Overall Risk" value={scanData.risk_level} color={SEVERITY_COLOR[scanData.risk_level]} isMinimized={selectedPort} />
               <StatBox label="Threat Score" value={`${scanData.overall_score}/10`} color="#ffffff" isMinimized={selectedPort} />
               <StatBox label="Open Ports" value={scanData.summary.open_ports.length} color="#ffffff" isMinimized={selectedPort} />
               <StatBox label="Critical CVEs" value={scanData.summary.critical} color={SEVERITY_COLOR['Critical']} isMinimized={selectedPort} />
             </div>
          )}

          {/* Ports List */}
          <div>
            <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 20 }}>
              <h2 style={{ fontFamily: 'system-ui, sans-serif', fontSize: selectedPort ? 16 : 22, fontWeight: 600, margin: 0 }}>Attack Surfaces</h2>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {scanData.ports.map((port) => {
                const isActive = selectedPort && selectedPort.port === port.port;
                const opacity = selectedPort && !isActive ? 0.4 : 1;

                return (
                  <motion.div
                    key={port.port}
                    ref={(el) => portRefs.current[port.port] = el}
                    onClick={() => {
                      if (isActive) {
                        setSelectedPort(null)
                        setIsReadyToDraw(false)
                        setTrunkCoords(null)
                      } else {
                        setSelectedPort(port)
                        setIsReadyToDraw(false)
                        setTrunkCoords(null)
                      }
                    }}
                    transition={{ duration: 0.2 }}
                    style={{
                      opacity,
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      padding: selectedPort ? '16px' : '24px',
                      background: isActive ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.03)',
                      border: '1px solid', borderColor: isActive ? 'rgba(255,255,255,0.4)' : 'rgba(255,255,255,0.08)',
                      borderRadius: 12, cursor: 'pointer', position: 'relative'
                    }}
                  >
                    {isActive && (
                       <div style={{ position: 'absolute', right: -6, top: '50%', transform: 'translateY(-50%)', width: 10, height: 10, borderRadius: '50%', background: '#ffffff', boxShadow: '0 0 10px #ffffff' }} />
                    )}

                    <div style={{ display: 'flex', alignItems: 'center', gap: selectedPort ? 16 : 24 }}>
                      <div style={{
                        fontFamily: '"JetBrains Mono", monospace', fontSize: selectedPort ? 18 : 28, fontWeight: 700,
                        color: SEVERITY_COLOR[port.risk] ?? '#ffffff', width: selectedPort ? 45 : 80, letterSpacing: '-0.02em'
                      }}>
                        :{port.port}
                      </div>
                      <div>
                        <div style={{ fontFamily: 'system-ui, sans-serif', fontSize: selectedPort ? 14 : 18, fontWeight: 600, color: '#ffffff', marginBottom: 2 }}>{port.service.toUpperCase()}</div>
                        <div style={{ fontFamily: 'system-ui, sans-serif', fontSize: selectedPort ? 12 : 14, color: 'rgba(255,255,255,0.5)' }}>
                          {port.version.length > 20 && selectedPort ? port.version.substring(0,20)+'...' : port.version}
                        </div>
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                      <span style={{ fontFamily: 'system-ui, sans-serif', fontSize: selectedPort ? 11 : 13, color: 'rgba(255,255,255,0.5)', fontWeight: 500 }}>
                        {(port.cves?.length || 0) + (port.findings?.length || 0)} Triggers
                      </span>
                    </div>
                  </motion.div>
                )
              })}
            </div>
          </div>
        </motion.div>
      </div>

      {/* Network Overlay */}
      <AnimatePresence>
        {isReadyToDraw && trunkCoords && (
           <WireNetwork 
              key="wire-network" 
              trunkCoords={trunkCoords} 
              port={selectedPort} 
              openModal={(type, vuln) => setActiveModal({ isOpen: true, type, vuln, port: selectedPort })} 
           />
        )}
      </AnimatePresence>

      {/* Central Modal Overlay */}
      <AnimatePresence>
         {activeModal.isOpen && (
            <ModalOverlay modal={activeModal} onClose={() => setActiveModal({ isOpen: false, type: null, vuln: null, port: null })} />
         )}
      </AnimatePresence>
    </div>
  )
}

// ─── NETWORK VISUALIZATION FOR ALL BRANCHES SIMULTANEOUSLY ───
function WireNetwork({ trunkCoords, port, openModal }) {
  const vulnerabilities = [
    ...(port.cves || []).map((cve, i) => ({ id: `cve-${i}`, type: 'CVE', title: cve.id, detail: cve.description, analogy: cve.analogy, severity: cve.severity, data: cve })),
    ...(port.findings || []).map((f, i) => ({ id: `f-${i}`, type: 'Finding', title: f.type, detail: f.detail, analogy: f.analogy, severity: f.severity }))
  ];

  if (vulnerabilities.length === 0) {
    vulnerabilities.push({ id: 'none', type: 'System', title: 'Clean', detail: 'No vulnerabilities discovered on this port.', severity: 'Low' });
  }

  // Geometry calculations
  const trunkX = trunkCoords.x;
  const trunkY = trunkCoords.y;

  const ITEM_HEIGHT = 160; 
  const TOTAL_HEIGHT = vulnerabilities.length * ITEM_HEIGHT;
  const startY = trunkY - (TOTAL_HEIGHT / 2) + (ITEM_HEIGHT / 2);

  const TRUNK_TO_VULN_BEND = 60;
  const VULN_LINE_WIDTH = 220;

  const SEC_BEND = 40;
  const SEC_LINE_END = 60;
  const SEC_Y_SPACING = 45;

  return (
    <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 50 }}>
      {/* ─── SVG CANVAS ─── */}
      <svg style={{ position: 'absolute', width: '100%', height: '100%', overflow: 'visible', zIndex: 0 }}>
        {vulnerabilities.map((v, i) => {
          const targetY = startY + (i * ITEM_HEIGHT);
          const drawDelay = i * 0.1;

          // First Branch Path
          const vulnPath = `M ${trunkX},${trunkY} L ${trunkX + TRUNK_TO_VULN_BEND},${trunkY} L ${trunkX + TRUNK_TO_VULN_BEND},${targetY} L ${trunkX + TRUNK_TO_VULN_BEND + VULN_LINE_WIDTH},${targetY}`;
          
          const secItems = v.id !== 'none' ? [
            { id: 'term', title: 'Scripts', color: '#4a9eff' },
            { id: 'over', title: 'Overview', color: '#eab308' },
            { id: 'rem', title: 'Next Steps', color: '#22c55e' }
          ] : [];

          const secOriginX = trunkX + TRUNK_TO_VULN_BEND + VULN_LINE_WIDTH;

          return (
            <g key={`group-${v.id}`}>
              {/* Primary vulnerability white line */}
              <motion.path
                d={vulnPath} stroke="rgba(255,255,255,0.8)" strokeWidth="2" fill="none"
                initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 0.5, ease: 'easeOut', delay: drawDelay }}
              />
              {/* Secondary capability color lines */}
              {secItems.map((sec, j) => {
                const secY = targetY + ((j - 1) * SEC_Y_SPACING);
                const secPath = `M ${secOriginX},${targetY} L ${secOriginX + SEC_BEND},${targetY} L ${secOriginX + SEC_BEND},${secY} L ${secOriginX + SEC_BEND + SEC_LINE_END},${secY}`;
                return (
                  <motion.path
                    key={`secpath-${v.id}-${j}`}
                    d={secPath} stroke={sec.color} strokeWidth="2" fill="none"
                    initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 0.4, ease: 'easeOut', delay: drawDelay + 0.3 + (j * 0.05) }}
                  />
                )
              })}
            </g>
          )
        })}
      </svg>

      {/* ─── HTML TEXT & BUTTONS OVERLAY ─── */}
      {vulnerabilities.map((v, i) => {
        const targetY = startY + (i * ITEM_HEIGHT);
        const textStartX = trunkX + TRUNK_TO_VULN_BEND + 20;

        const secItems = v.id !== 'none' ? [
          { title: 'Scripts', desc: 'Raw Execution Logs', action: 'terminal' },
          { title: 'Overview', desc: 'Impact and Analogy details', action: 'overview' },
          { title: 'Next Steps', desc: 'IT Remediation Checklist', action: 'remediation' }
        ] : [];

        const secOriginX = trunkX + TRUNK_TO_VULN_BEND + VULN_LINE_WIDTH;
        const buttonStartX = secOriginX + SEC_BEND + SEC_LINE_END + 12;

        return (
          <div key={`html-${v.id}`}>
            {/* First Branch Text Block (Vuln Name) */}
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 + (i * 0.1) }}
              style={{
                 position: 'absolute',
                 left: textStartX,
                 top: targetY - 30, // Align right above the white line
                 width: VULN_LINE_WIDTH - 20,
                 zIndex: 20
              }}
            >
              <div style={{ fontFamily: 'system-ui, sans-serif', fontSize: 16, fontWeight: 700, color: SEVERITY_COLOR[v.severity], letterSpacing: '0.05em' }}>
                {v.title}
              </div>
            </motion.div>

            {/* Second Branch Buttons + Text */}
            {secItems.map((sec, j) => {
               const secY = targetY + ((j - 1) * SEC_Y_SPACING);

               return (
                 <motion.div
                   key={`sec-btn-${v.id}-${j}`}
                   initial={{ opacity: 0, x: -10 }}
                   animate={{ opacity: 1, x: 0 }}
                   transition={{ delay: 0.6 + (i * 0.1) + (j * 0.05) }}
                   style={{
                      position: 'absolute',
                      left: buttonStartX,
                      top: secY - 14, // align button height properly with the wire connection point
                      display: 'flex', alignItems: 'center', gap: 16,
                      pointerEvents: 'auto', zIndex: 30
                   }}
                 >
                   <button
                      onClick={() => openModal(sec.action, v)}
                      style={{
                        background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: 6,
                        padding: '6px 16px', color: '#ffffff', cursor: 'pointer', fontFamily: 'system-ui, sans-serif', fontSize: 12, fontWeight: 600, whiteSpace: 'nowrap',
                        transition: '0.2s'
                      }}
                      onMouseOver={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.1)' }}
                      onMouseOut={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.03)' }}
                   >
                     {sec.title}
                   </button>
                   <div style={{ fontFamily: 'system-ui, sans-serif', fontSize: 13, color: 'rgba(255,255,255,0.4)', whiteSpace: 'nowrap' }}>
                     {sec.desc}
                   </div>
                 </motion.div>
               )
            })}
          </div>
        )
      })}
    </div>
  )
}

// ─── MODAL SYSTEM ────────────────────────────────────────────────────────────

function ModalOverlay({ modal, onClose }) {
  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      style={{
        position: 'fixed', inset: 0, zIndex: 9999,
        background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(8px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        pointerEvents: 'auto'
      }}
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.95, opacity: 0, y: 20 }}
        onClick={(e) => e.stopPropagation()}
        style={{
          width: 700, maxWidth: '90vw', maxHeight: '85vh', overflowY: 'auto',
          background: '#0a0d14', border: '1px solid rgba(255,255,255,0.1)',
          borderRadius: 24, padding: 32, boxShadow: '0 30px 60px rgba(0,0,0,0.5)'
        }}
      >
         <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 16 }}>
            <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: 'rgba(255,255,255,0.5)', cursor: 'pointer', fontSize: 24, lineHeight: 1 }}>&times;</button>
         </div>

         {modal.type === 'terminal' && <TerminalContent vuln={modal.vuln} port={modal.port} />}
         {modal.type === 'overview' && <OverviewContent vuln={modal.vuln} port={modal.port} />}
         {modal.type === 'remediation' && <RemediationContent port={modal.port} />}
      </motion.div>
    </motion.div>
  )
}

function TerminalContent({ port }) {
  const [typedOutput, setTypedOutput] = useState('');
  const [isTyping, setIsTyping] = useState(true);

  const fullScript = port.scripts_run && port.scripts_run.length > 0 
    ? port.scripts_run.map(s => `root@shieldscan:~# ${s.command}\n${s.output}`).join('\n\n')
    : `root@shieldscan:~# No manual scripts registered for this port.\nScanner relied exclusively on passive fingerprint signatures.`;

  useEffect(() => {
    let index = 0;
    setTypedOutput('');
    setIsTyping(true);
    const interval = setInterval(() => {
      setTypedOutput(prev => prev + fullScript.charAt(index));
      index++;
      if (index >= fullScript.length - 1) {
        clearInterval(interval);
        setIsTyping(false);
      }
    }, 10); 
    return () => clearInterval(interval);
  }, [fullScript]);

  return (
    <div>
       <h2 style={{ fontFamily: 'system-ui, sans-serif', color: '#fff', fontSize: 24, marginTop: 0, marginBottom: 24 }}>Raw Execution Terminal</h2>
       <div style={{ 
          background: '#050505', border: '1px solid #222', borderRadius: 8, padding: 20, 
          fontFamily: '"JetBrains Mono", monospace', fontSize: 13, color: '#4ade80', 
          whiteSpace: 'pre-wrap', minHeight: 200, marginBottom: 24, boxShadow: 'inset 0 0 20px rgba(0,0,0,1)'
       }}>
          {typedOutput}
          {isTyping && <motion.span animate={{ opacity: [1, 0] }} transition={{ repeat: Infinity, duration: 0.8 }}>█</motion.span>}
       </div>
       <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: 12, padding: 20, border: '1px solid rgba(255,255,255,0.05)' }}>
          <div style={{ fontFamily: 'system-ui, sans-serif', fontSize: 11, fontWeight: 700, color: '#4a9eff', textTransform: 'uppercase', marginBottom: 8, letterSpacing: '0.05em' }}>Explanation</div>
          <div style={{ fontFamily: 'system-ui, sans-serif', fontSize: 14, color: '#ccc', lineHeight: 1.5 }}>
             The intelligent agent actively injected payloads through the listed scripts directly against port {port.port}. The outputs verify the true existence of the vulnerability path natively across the network.
          </div>
       </div>
    </div>
  )
}

function OverviewContent({ vuln }) {
  const isCve = vuln.type === 'CVE';
  return (
    <div>
       <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 32 }}>
          <div>
             <h2 style={{ fontFamily: 'system-ui, sans-serif', color: '#fff', fontSize: 24, margin: '0 0 8px 0' }}>{vuln.title} Overview</h2>
             <div style={{ fontFamily: 'system-ui, sans-serif', fontSize: 14, color: '#888' }}>Vulnerability Description</div>
          </div>
          <div style={{ background: `${SEVERITY_COLOR[vuln.severity]}22`, color: SEVERITY_COLOR[vuln.severity], padding: '6px 16px', borderRadius: 16, fontSize: 12, fontWeight: 700, letterSpacing: '0.05em' }}>
             {vuln.severity.toUpperCase()} EXPOSURE
          </div>
       </div>
       
       <div style={{ fontFamily: 'system-ui, sans-serif', fontSize: 15, color: '#ddd', lineHeight: 1.6, marginBottom: 24, background: 'rgba(255,255,255,0.02)', padding: 20, borderRadius: 12, border: '1px solid rgba(255,255,255,0.05)' }}>
          {vuln.detail}
       </div>

       {vuln.analogy && (
          <div style={{ fontFamily: 'system-ui, sans-serif', fontSize: 15, color: '#4a9eff', lineHeight: 1.6, marginBottom: 32, background: 'rgba(74, 158, 255, 0.05)', padding: 20, borderRadius: 12, border: '1px solid rgba(74, 158, 255, 0.2)' }}>
            <strong>Layman Analogy:</strong> {vuln.analogy}
          </div>
       )}

       {isCve && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
             <div style={{ background: 'rgba(255,255,255,0.02)', padding: 20, borderRadius: 12, border: '1px solid rgba(255,255,255,0.05)' }}>
                <div style={{ fontSize: 11, color: '#888', textTransform: 'uppercase', marginBottom: 8, letterSpacing: '0.05em', fontWeight: 600 }}>CVSS Base Score</div>
                <div style={{ fontFamily: '"JetBrains Mono", monospace', fontSize: 32, color: SEVERITY_COLOR[vuln.severity], fontWeight: 700 }}>{vuln.data.cvss_score}</div>
             </div>
             <div style={{ background: 'rgba(255,255,255,0.02)', padding: 20, borderRadius: 12, border: '1px solid rgba(255,255,255,0.05)' }}>
                <div style={{ fontSize: 11, color: '#888', textTransform: 'uppercase', marginBottom: 8, letterSpacing: '0.05em', fontWeight: 600 }}>Official Patch</div>
                <div style={{ fontSize: 16, color: '#fff', fontWeight: 600 }}>{vuln.data.patch_version || 'Not Available'}</div>
             </div>
          </div>
       )}
    </div>
  )
}

function RemediationContent({ port }) {
  const [checkedItems, setCheckedItems] = useState({});

  const toggleCheck = (idx) => {
    setCheckedItems(prev => ({ ...prev, [idx]: !prev[idx] }));
  }

  return (
    <div>
       <h2 style={{ fontFamily: 'system-ui, sans-serif', color: '#fff', fontSize: 24, marginTop: 0, marginBottom: 32 }}>Remediation Action Plan</h2>
       <div style={{ fontFamily: 'system-ui, sans-serif', fontSize: 14, color: '#888', marginBottom: 24 }}>Check off tasks below as your IT team implements the security patches.</div>
       
       <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 16 }}>
          {port.recommendations?.map((rec, i) => {
             const isChecked = checkedItems[i];
             return (
               <li 
                  key={i} 
                  onClick={() => toggleCheck(i)}
                  style={{ 
                    display: 'flex', gap: 16, padding: 20, borderRadius: 12, cursor: 'pointer', transition: '0.2s',
                    background: isChecked ? 'rgba(34,197,94,0.05)' : 'rgba(255,255,255,0.02)', 
                    border: '1px solid', borderColor: isChecked ? 'rgba(34,197,94,0.3)' : 'rgba(255,255,255,0.05)',
                    opacity: isChecked ? 0.6 : 1
                  }}
               >
                  {/* Interactive Checkbox */}
                  <div style={{ 
                    width: 24, height: 24, borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, transition: '0.2s',
                    background: isChecked ? '#22c55e' : 'rgba(255,255,255,0.05)', 
                    border: isChecked ? 'none' : '1px solid rgba(255,255,255,0.2)' 
                  }}>
                     {isChecked && <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#000" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>}
                  </div>

                  <div>
                     <div style={{ fontFamily: 'system-ui, sans-serif', fontSize: 11, fontWeight: 700, color: isChecked ? '#888' : '#22c55e', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6, textDecoration: isChecked ? 'line-through' : 'none' }}>
                       Priority: {rec.priority}
                     </div>
                     <div style={{ fontFamily: 'system-ui, sans-serif', fontSize: 15, color: isChecked ? '#888' : '#eee', lineHeight: 1.5, textDecoration: isChecked ? 'line-through' : 'none' }}>
                       {rec.action}
                     </div>
                  </div>
               </li>
             )
          })}
       </ul>
    </div>
  )
}
