import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import ShaderBackground from '../components/homepage/ShaderBackground.jsx'

// ─── HARDCODED SCAN DATA ────────────────────────────────────────────────────
const SCAN_OUTPUT = {
  target: '192.168.1.1',
  scan_type: 'active',
  scan_mode: 'aggressive',
  timestamp: '2026-04-18T22:47:01Z',
  overall_score: 2.1,
  risk_level: 'Critical',

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
          output: '+ /admin/ found\n+ Missing X-Frame-Options\n+ Apache 2.4.49 outdated',
        },
        {
          tool: 'gobuster',
          command: 'gobuster dir -u http://192.168.1.1 -w /usr/share/wordlists/dirb/common.txt',
          output: '/admin (200)\n/.git (200)\n/uploads (200)\n/phpMyAdmin (200)',
        },
        {
          tool: 'whatweb',
          command: 'whatweb http://192.168.1.1',
          output: 'Apache[2.4.49], PHP[7.4.0], jQuery[3.6.0]',
        },
      ],
      cves: [
        {
          id: 'CVE-2021-41773',
          cvss_score: 9.8,
          severity: 'Critical',
          description: 'Path traversal and RCE in Apache 2.4.49',
          affected_version: 'Apache 2.4.49',
          patch_version: 'Apache 2.4.50',
          exploit_available: true,
          exploits: [
            { name: 'apache_normalize_path_rce', source: 'Metasploit', confirmed: true },
            { name: 'Apache 2.4.49 RCE', source: 'ExploitDB', confirmed: false },
          ],
        },
      ],
      findings: [
        { type: 'exposed_directory', severity: 'High', detail: '/.git directory publicly accessible — source code downloadable' },
        { type: 'exposed_panel', severity: 'High', detail: '/admin panel accessible with no IP restriction' },
        { type: 'exposed_panel', severity: 'High', detail: '/phpMyAdmin accessible publicly' },
        { type: 'misconfiguration', severity: 'Medium', detail: 'Missing X-Frame-Options header — clickjacking possible' },
        { type: 'misconfiguration', severity: 'Medium', detail: 'Missing Content-Security-Policy header' },
      ],
      recommendations: [
        { priority: 'Critical', action: 'Upgrade Apache to 2.4.50 or higher immediately' },
        { priority: 'High', action: 'Remove .git directory from web root' },
        { priority: 'High', action: 'Restrict /admin and /phpMyAdmin to your IP via firewall' },
        { priority: 'Medium', action: 'Add X-Frame-Options and CSP headers to Apache config' },
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
          command: 'nmap -A -p 22 192.168.1.1',
          output: '22/tcp open ssh OpenSSH 4.7p1\nssh-hostkey: 1024 RSA',
        },
        {
          tool: 'searchsploit',
          command: 'searchsploit OpenSSH 4.7',
          output: 'OpenSSH 4.7 - User Enumeration | exploits/linux/remote/45210.py',
        },
      ],
      cves: [
        {
          id: 'CVE-2023-38408',
          cvss_score: 8.1,
          severity: 'High',
          description: 'Remote code execution in OpenSSH ssh-agent',
          affected_version: 'OpenSSH < 9.3p2',
          patch_version: 'OpenSSH 9.3p2',
          exploit_available: false,
          exploits: [],
        },
        {
          id: 'CVE-2018-15473',
          cvss_score: 5.3,
          severity: 'Medium',
          description: 'User enumeration via timing difference in auth',
          affected_version: 'OpenSSH < 7.8',
          patch_version: 'OpenSSH 7.8',
          exploit_available: true,
          exploits: [{ name: 'OpenSSH User Enumeration', source: 'ExploitDB', confirmed: false }],
        },
      ],
      findings: [
        { type: 'outdated_software', severity: 'High', detail: 'OpenSSH 4.7 is severely outdated — current version is 9.x' },
        { type: 'exposure', severity: 'Medium', detail: 'SSH exposed to public internet — brute force attempts likely' },
      ],
      recommendations: [
        { priority: 'High', action: 'Upgrade OpenSSH to 9.3p2 or higher' },
        { priority: 'High', action: 'Restrict SSH to your IP address only via firewall rule' },
        { priority: 'Medium', action: 'Disable password auth — use SSH keys only' },
      ],
    },

    {
      port: 3306,
      state: 'open',
      service: 'mysql',
      version: 'MySQL 5.0.51a',
      risk: 'Critical',
      scripts_run: [
        {
          tool: 'hydra',
          command: 'hydra -l root -P /usr/share/wordlists/rockyou.txt mysql://192.168.1.1',
          output: '[3306][mysql] host: 192.168.1.1 login: root password: (empty)',
        },
        {
          tool: 'searchsploit',
          command: 'searchsploit MySQL 5.0.51',
          output: 'MySQL 5.0.51 - Arbitrary Library Loading | exploits/linux/local/36463.c',
        },
        {
          tool: 'nmap',
          command: 'nmap -A -p 3306 192.168.1.1',
          output: '3306/tcp open mysql MySQL 5.0.51a\n| mysql-info: Protocol: 10\n| Version: 5.0.51a',
        },
      ],
      cves: [
        {
          id: 'CVE-2012-2122',
          cvss_score: 7.5,
          severity: 'High',
          description: 'Authentication bypass in MySQL 5.x via timing attack',
          affected_version: 'MySQL 5.0.x',
          patch_version: 'MySQL 5.0.96',
          exploit_available: true,
          exploits: [{ name: 'MySQL Authentication Bypass', source: 'ExploitDB', confirmed: false }],
        },
      ],
      findings: [
        { type: 'credentials', severity: 'Critical', detail: 'Root login confirmed with empty password via Hydra' },
        { type: 'exposure', severity: 'Critical', detail: 'MySQL port 3306 exposed directly to public internet' },
        { type: 'outdated_software', severity: 'High', detail: 'MySQL 5.0.51 is end of life — current version is 8.x' },
      ],
      recommendations: [
        { priority: 'Critical', action: 'Set a strong password on MySQL root account immediately' },
        { priority: 'Critical', action: 'Close port 3306 from public internet via firewall' },
        { priority: 'High', action: 'Upgrade MySQL to 8.x' },
      ],
    },

    {
      port: 21,
      state: 'open',
      service: 'ftp',
      version: 'vsftpd 2.3.4',
      risk: 'Critical',
      scripts_run: [
        {
          tool: 'hydra',
          command: 'hydra -l admin -P /usr/share/wordlists/rockyou.txt ftp://192.168.1.1',
          output: '[21][ftp] host: 192.168.1.1 login: admin password: admin',
        },
        {
          tool: 'searchsploit',
          command: 'searchsploit vsftpd 2.3.4',
          output: 'vsftpd 2.3.4 - Backdoor Command Execution | exploits/unix/remote/17491.rb',
        },
      ],
      cves: [
        {
          id: 'CVE-2011-2523',
          cvss_score: 10.0,
          severity: 'Critical',
          description: 'vsftpd 2.3.4 contains a backdoor that opens a shell on port 6200',
          affected_version: 'vsftpd 2.3.4',
          patch_version: 'vsftpd 2.3.5',
          exploit_available: true,
          exploits: [
            { name: 'vsftpd 2.3.4 Backdoor', source: 'Metasploit', confirmed: true },
            { name: 'vsftpd 2.3.4 Backdoor Command Execution', source: 'ExploitDB', confirmed: false },
          ],
        },
      ],
      findings: [
        { type: 'backdoor', severity: 'Critical', detail: 'vsftpd 2.3.4 contains a known backdoor — confirmed via Metasploit' },
        { type: 'credentials', severity: 'Critical', detail: 'FTP login confirmed with default credentials admin:admin' },
      ],
      recommendations: [
        { priority: 'Critical', action: 'Remove vsftpd 2.3.4 immediately — this version has a backdoor' },
        { priority: 'Critical', action: 'If FTP is needed upgrade to vsftpd 3.x and change all credentials' },
        { priority: 'High', action: 'Consider replacing FTP with SFTP entirely' },
      ],
    },
  ],

  nvd_summary: [
    { id: 'CVE-2021-41773', cvss: 9.8, severity: 'Critical', port: 80 },
    { id: 'CVE-2011-2523', cvss: 10.0, severity: 'Critical', port: 21 },
    { id: 'CVE-2023-38408', cvss: 8.1, severity: 'High', port: 22 },
    { id: 'CVE-2012-2122', cvss: 7.5, severity: 'High', port: 3306 },
    { id: 'CVE-2018-15473', cvss: 5.3, severity: 'Medium', port: 22 },
  ],

  summary: {
    open_ports: [80, 22, 3306, 21],
    total_findings: 11,
    critical: 4,
    high: 4,
    medium: 3,
    low: 0,
    confirmed_exploits: 2,
    tools_run: ['nmap', 'nikto', 'gobuster', 'whatweb', 'hydra', 'searchsploit', 'metasploit'],
  },
}

// ─── COLOR MAPS ─────────────────────────────────────────────────────────────
const SEVERITY_COLOR = {
  Critical: '#ef4444',
  High: '#f97316',
  Medium: '#eab308',
  Low: '#6b7280',
}

function RiskBadge({ severity }) {
  const color = SEVERITY_COLOR[severity] ?? '#6b7280'
  return (
    <span style={{
      display: 'inline-flex',
      alignItems: 'center',
      padding: '4px 12px',
      background: `${color}22`,
      border: `1px solid ${color}66`,
      borderRadius: 16,
      color,
      fontSize: 11,
      fontWeight: 700,
      fontFamily: 'system-ui, sans-serif',
      letterSpacing: '0.08em',
      textTransform: 'uppercase',
    }}>
      <span style={{ width: 6, height: 6, borderRadius: '50%', background: color, marginRight: 6 }} />
      {severity}
    </span>
  )
}

function StatBox({ label, value, color }) {
  return (
    <div style={{
      background: 'rgba(255,255,255,0.02)',
      border: '1px solid rgba(255,255,255,0.05)',
      borderRadius: 16,
      padding: '20px',
      display: 'flex',
      flexDirection: 'column',
      gap: 8,
      position: 'relative',
      overflow: 'hidden'
    }}>
      {/* Decorative gradient blob */}
      <div style={{
        position: 'absolute',
        top: -20,
        right: -20,
        width: 80,
        height: 80,
        background: `radial-gradient(circle, ${color}22 0%, transparent 70%)`,
        filter: 'blur(10px)'
      }} />
      <div style={{ fontFamily: 'system-ui, sans-serif', fontSize: 12, color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
        {label}
      </div>
      <div style={{ fontFamily: '"JetBrains Mono", monospace', fontSize: 24, fontWeight: 700, color, position: 'relative', zIndex: 1 }}>
        {value}
      </div>
    </div>
  )
}

export default function ReportActiveVisual() {
  const [scanData] = useState(SCAN_OUTPUT)
  const navigate = useNavigate()
  
  const [selectedPort, setSelectedPort] = useState(null)
  const [selectedVuln, setSelectedVuln] = useState(null)

  return (
    <div style={{ position: 'relative', height: '100vh', width: '100vw', overflow: 'hidden', background: '#070a0d', display: 'flex' }}>
      <ShaderBackground />

      {/* Global App Navbar */}
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
          <div style={{ fontSize: 18, fontWeight: 600, color: '#ffffff', letterSpacing: '-0.02em', cursor: 'pointer' }} onClick={() => navigate('/scan')}>
            ShieldScan
          </div>
          <motion.button
            onClick={() => navigate('/scan')}
            whileHover={{ backgroundColor: '#ffffff', color: '#0a0a0a', borderColor: '#ffffff' }}
            initial={{ backgroundColor: 'rgba(255, 255, 255, 0.03)', color: '#ffffff', borderColor: 'rgba(255, 255, 255, 0.15)' }}
            transition={{ duration: 0.2 }}
            style={{
              fontFamily: 'system-ui, sans-serif',
              fontSize: 14,
              fontWeight: 500,
              padding: '8px 20px',
              border: '1px solid rgba(255, 255, 255, 0.15)',
              borderRadius: 6,
              cursor: 'pointer',
              outline: 'none',
              backdropFilter: 'blur(4px)',
            }}
          >
            Back to Console
          </motion.button>
        </div>
      </nav>

      {/* Main Document Box Container */}
      <motion.div
        initial={{ x: 0 }}
        animate={{ x: selectedPort ? '-23vw' : '0vw' }}
        transition={{ type: 'spring', stiffness: 220, damping: 28 }}
        style={{
          position: 'absolute',
          inset: '64px 0 0 0',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          padding: '40px 32px',
          zIndex: 10,
          overflowY: 'auto'
        }}
      >
        <motion.div
           initial={{ opacity: 0, y: 20 }}
           animate={{ opacity: 1, y: 0 }}
           transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
           style={{
             width: '100%',
             maxWidth: 820,
             background: 'transparent',
             backdropFilter: 'blur(8px)',
             border: '1px solid rgba(255, 255, 255, 0.08)',
             borderRadius: 24,
             padding: '48px 56px',
             color: '#ffffff',
             boxShadow: '0 30px 60px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.1)',
             marginBottom: 64, 
           }}
        >
          {/* Header Row */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 48 }}>
            <div>
              <div style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
                background: 'rgba(255,255,255,0.06)',
                padding: '6px 14px',
                borderRadius: 20,
                border: '1px solid rgba(255,255,255,0.1)',
                marginBottom: 20
              }}>
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#ffffff' }} />
                <span style={{ fontFamily: 'system-ui, sans-serif', fontSize: 13, fontWeight: 600, letterSpacing: '0.04em', color: '#ffffff' }}>
                  {scanData.scan_mode.toUpperCase()} SCAN CAPTURE
                </span>
              </div>
              <h1 style={{
                fontFamily: 'system-ui, sans-serif',
                fontSize: 36,
                fontWeight: 600,
                letterSpacing: '-0.02em',
                margin: '0 0 12px 0'
              }}>Vulnerability Report</h1>
              <div style={{ fontFamily: '"JetBrains Mono", monospace', fontSize: 16, color: 'rgba(255,255,255,0.5)' }}>
                Target IP: <span style={{ color: '#ffffff', fontWeight: 600 }}>{scanData.target}</span>
              </div>
            </div>
            <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6 }}>
              <div style={{ fontFamily: 'system-ui, sans-serif', fontSize: 13, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'rgba(255,255,255,0.4)', fontWeight: 600 }}>
                Captured On
              </div>
              <div style={{ fontFamily: '"JetBrains Mono", monospace', fontSize: 14, color: '#ffffff', opacity: 0.9 }}>
                {new Date(scanData.timestamp).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
              </div>
            </div>
          </div>

          {/* Summary Stats Row */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(4, 1fr)',
            gap: 16,
            marginBottom: 48,
            paddingBottom: 48,
            borderBottom: '1px solid rgba(255,255,255,0.1)'
          }}>
            <StatBox label="Overall Risk" value={scanData.risk_level} color={SEVERITY_COLOR[scanData.risk_level]} />
            <StatBox label="Threat Score" value={`${scanData.overall_score}/10`} color="#ffffff" />
            <StatBox label="Open Ports" value={scanData.summary.open_ports.length} color="#ffffff" />
            <StatBox label="Critical CVEs" value={scanData.summary.critical} color={SEVERITY_COLOR['Critical']} />
          </div>

          {/* Ports List */}
          <div>
            <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 24 }}>
              <h2 style={{
                fontFamily: 'system-ui, sans-serif',
                fontSize: 22,
                fontWeight: 600,
                letterSpacing: '-0.01em',
                margin: 0
              }}>Discovered Attack Port #</h2>
              <span style={{ fontFamily: 'system-ui, sans-serif', fontSize: 14, color: 'rgba(255,255,255,0.4)' }}>Select a port to investigate details</span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {scanData.ports.map((port, i) => {
                const isActive = selectedPort && selectedPort.port === port.port;
                return (
                  <motion.div
                    key={port.port}
                    onClick={() => {
                      setSelectedPort(isActive ? null : port);
                      setSelectedVuln(null);
                    }}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.4, delay: i * 0.1 }}
                    whileHover={{ scale: 1.01, backgroundColor: 'rgba(255,255,255,0.06)' }}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '24px',
                      background: isActive ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.03)',
                      border: '1px solid',
                      borderColor: isActive ? 'rgba(255,255,255,0.3)' : 'rgba(255,255,255,0.08)',
                      borderRadius: 16,
                      cursor: 'pointer',
                      transition: 'border-color 0.2sease, box-shadow 0.2s ease, background 0.2s ease',
                      boxShadow: isActive ? '0 8px 24px rgba(0,0,0,0.3)' : 'none'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
                      <div style={{
                        fontFamily: '"JetBrains Mono", monospace',
                        fontSize: 28,
                        fontWeight: 700,
                        color: SEVERITY_COLOR[port.risk] ?? '#ffffff',
                        width: 80,
                        letterSpacing: '-0.02em'
                      }}>
                        :{port.port}
                      </div>
                      <div>
                        <div style={{ fontFamily: 'system-ui, sans-serif', fontSize: 18, fontWeight: 600, color: '#ffffff', marginBottom: 4 }}>
                          {port.service.toUpperCase()} Service
                        </div>
                        <div style={{ fontFamily: 'system-ui, sans-serif', fontSize: 14, color: 'rgba(255,255,255,0.5)' }}>
                          Version: {port.version}
                        </div>
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6 }}>
                        <span style={{ fontFamily: 'system-ui, sans-serif', fontSize: 13, color: 'rgba(255,255,255,0.5)', fontWeight: 500 }}>
                          {(port.cves?.length || 0) + (port.findings?.length || 0)} Vulnerabilities
                        </span>
                      </div>
                      <motion.div style={{
                        color: isActive ? '#ffffff' : 'rgba(255,255,255,0.4)',
                        padding: '8px',
                        background: isActive ? 'rgba(255,255,255,0.15)' : 'rgba(255,255,255,0.05)',
                        borderRadius: '50%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}>
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          {isActive ? <polyline points="9 18 15 12 9 6"></polyline> : <polyline points="9 18 15 12 9 6"></polyline>}
                        </svg>
                      </motion.div>
                    </div>
                  </motion.div>
                )
              })}
            </div>
          </div>
        </motion.div>
      </motion.div>

      {/* Central Network Lines Overlay */}
      <AnimatePresence mode="wait">
        {selectedPort && (
           <WireNetwork key="wire-network" selectedPort={selectedPort} selectedVuln={selectedVuln} setSelectedVuln={setSelectedVuln} />
        )}
      </AnimatePresence>

    </div>
  )
}

function WireNetwork({ selectedPort, selectedVuln, setSelectedVuln }) {
  if (!selectedPort) return null;

  const vulnerabilities = [
    ...(selectedPort.findings || []).map((f, i) => ({ id: `f-${i}`, type: 'Finding', title: f.type.replace(/_/g, ' ').toUpperCase(), detail: f.detail, severity: f.severity })),
    ...(selectedPort.cves || []).map((cve, i) => ({ id: `cve-${i}`, type: 'CVE', title: cve.id, detail: cve.description, severity: cve.severity, data: cve }))
  ];

  if (vulnerabilities.length === 0) {
    vulnerabilities.push({ id: 'none', type: 'System', title: 'CLEAN', detail: 'No vulnerabilities discovered on this port.', severity: 'Low' });
  }

  const ITEM_HEIGHT = 100;
  const BRANCH_X_START = 60; 
  const BRANCH_X_END = 80;
  const TEXT_LINE_WIDTH = 350;
  const TOTAL_HEIGHT = vulnerabilities.length * ITEM_HEIGHT;
  const CENTER_Y = TOTAL_HEIGHT / 2;

  const generatePath = (i) => {
    const targetY = (i * ITEM_HEIGHT) + (ITEM_HEIGHT / 2);
    // Smooth angled branch lines like a circuit board
    return `M 0,${CENTER_Y} L ${BRANCH_X_START},${CENTER_Y} L ${BRANCH_X_START},${targetY} L ${BRANCH_X_START + BRANCH_X_END + TEXT_LINE_WIDTH},${targetY}`;
  }

  return (
    <motion.div
       initial={{ opacity: 0 }}
       animate={{ opacity: 1 }}
       exit={{ opacity: 0 }}
       style={{ 
         position: 'absolute', 
         left: '46vw', 
         top: '25%', 
         zIndex: 0
       }}
    >
      {/* Background SVG routing the lines */}
      <svg width={BRANCH_X_START + BRANCH_X_END + TEXT_LINE_WIDTH + 60} height={TOTAL_HEIGHT} style={{ overflow: 'visible', position: 'absolute', left: 0, top: 0 }}>
        {vulnerabilities.map((v, i) => {
          return (
             <motion.path
                key={`path-${v.id}`}
                d={generatePath(i)}
                stroke="rgba(255,255,255,0.7)"
                strokeWidth="2"
                fill="none"
                initial={{ pathLength: 0 }}
                animate={{ pathLength: 1 }}
                transition={{ duration: 0.8, ease: 'easeOut', delay: i * 0.1 }}
             />
          )
        })}
      </svg>

      {/* Trunk Port Label */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2 }}
        style={{
           position: 'absolute',
           left: 0,
           top: CENTER_Y - 30, // Directly above the trunk line
           fontFamily: '"JetBrains Mono", monospace',
           fontSize: 16,
           fontWeight: 700,
           color: '#ffffff',
           letterSpacing: '0.1em'
        }}
      >
        PORT {selectedPort.port}
      </motion.div>

      {/* Foreground React Branch Content */}
      <div style={{ position: 'relative', width: BRANCH_X_START + BRANCH_X_END + TEXT_LINE_WIDTH, height: TOTAL_HEIGHT }}>
        {vulnerabilities.map((v, i) => {
          const targetY = (i * ITEM_HEIGHT) + (ITEM_HEIGHT / 2);
          const textX = BRANCH_X_START + BRANCH_X_END;
          const isSelected = selectedVuln && selectedVuln.id === v.id;

          return (
            <motion.div
              key={`content-${v.id}`}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.6 + i * 0.1 }}
              style={{
                 position: 'absolute',
                 left: textX + 16,
                 top: targetY - 48, // Placed precisely above the horizontal wire
                 width: TEXT_LINE_WIDTH - 32,
                 display: 'flex',
                 flexDirection: 'column',
                 gap: 4
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ fontFamily: 'system-ui, sans-serif', fontSize: 13, fontWeight: 700, color: '#ffffff', letterSpacing: '0.04em', paddingRight: 10 }}>
                  {v.title}
                </div>
                <RiskBadge severity={v.severity} />
              </div>
              <div style={{ fontFamily: 'system-ui, sans-serif', fontSize: 14, color: 'rgba(255,255,255,0.7)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {v.detail}
              </div>

              {/* Action Icon Node at the very end of this wire */}
              <motion.div
                 onClick={() => setSelectedVuln(isSelected ? null : v)}
                 whileHover={{ scale: 1.1, backgroundColor: 'rgba(255,255,255,0.1)' }}
                 whileTap={{ scale: 0.95 }}
                 style={{
                    position: 'absolute',
                    right: -36, 
                    bottom: -20, 
                    width: 32,
                    height: 32,
                    borderRadius: '50%',
                    border: `1px solid ${isSelected ? '#ffffff' : 'rgba(255,255,255,0.3)'}`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    background: isSelected ? 'rgba(255,255,255,0.15)' : 'rgba(10,15,20,0.8)',
                    backdropFilter: 'blur(4px)',
                    cursor: 'pointer',
                    zIndex: 20
                 }}
              >
                 <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    {isSelected ? <line x1="18" y1="6" x2="6" y2="18"></line> : <line x1="5" y1="12" x2="19" y2="12"></line>}
                    {isSelected ? <line x1="6" y1="6" x2="18" y2="18"></line> : <polyline points="12 5 19 12 12 19"></polyline>}
                 </svg>
              </motion.div>
            </motion.div>
          )
        })}
      </div>
      
      {/* Level 3: The Trust Cards */}
      <AnimatePresence>
        {selectedVuln && (
           <motion.div
             initial={{ opacity: 0, x: -30 }}
             animate={{ opacity: 1, x: 0 }}
             exit={{ opacity: 0, x: 20 }}
             transition={{ type: 'spring', stiffness: 280, damping: 25 }}
             style={{
                position: 'absolute',
                left: BRANCH_X_START + BRANCH_X_END + TEXT_LINE_WIDTH + 60,
                top: Math.max(-100, (vulnerabilities.findIndex(v => v.id === selectedVuln.id) * ITEM_HEIGHT) + (ITEM_HEIGHT / 2) - 180),
                width: 400,
                display: 'flex',
                flexDirection: 'column',
                gap: 16,
                zIndex: 30
             }}
           >
              {/* Short line connecting selected node to cards */}
              <svg style={{ position: 'absolute', left: -50, top: 180, overflow: 'visible', zIndex: -1 }}>
                 <motion.path 
                    d="M 0,0 L 40,0" 
                    stroke="rgba(255,255,255,0.8)" strokeWidth="2" fill="none"
                    initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 0.4 }}
                 />
              </svg>
              
              <TrustCards vuln={selectedVuln} port={selectedPort} />
           </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

function TrustCards({ vuln, port }) {
  return (
    <>
       {/* Card 1: Evidence / Description */}
       <div style={{ background: 'rgba(12, 16, 22, 0.85)', backdropFilter: 'blur(20px)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: 16, padding: '24px', boxShadow: '0 10px 30px rgba(0,0,0,0.3)' }}>
          <div style={{ fontFamily: 'system-ui, sans-serif', fontSize: 11, fontWeight: 700, color: '#4a9eff', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 8 }}>
            Observation
          </div>
          <div style={{ fontFamily: 'system-ui, sans-serif', fontSize: 14, color: '#ffffff', lineHeight: 1.5, marginBottom: 16 }}>
            {vuln.type === 'CVE' ? 'Our scanners matched this public CVE record against the detected service version.' : 'Our security scanner flagged this directly over the network during active inspection.'}
          </div>
          <div style={{ background: 'rgba(0,0,0,0.4)', borderRadius: 8, padding: '16px', border: '1px solid rgba(255,255,255,0.08)' }}>
             <div style={{ fontFamily: '"JetBrains Mono", monospace', fontSize: 13, color: 'rgba(255,255,255,0.85)', lineHeight: 1.5 }}>
                {vuln.detail}
             </div>
          </div>
       </div>
       
       {/* Card 2: Threat Level & Effort */}
       <div style={{ background: 'rgba(12, 16, 22, 0.85)', backdropFilter: 'blur(20px)', border: `1px solid ${SEVERITY_COLOR[vuln.severity]}55`, borderRadius: 16, padding: '24px', boxShadow: '0 10px 30px rgba(0,0,0,0.3)' }}>
          <div style={{ fontFamily: 'system-ui, sans-serif', fontSize: 11, fontWeight: 700, color: SEVERITY_COLOR[vuln.severity], letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 12 }}>
            Exploitability
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 12 }}>
             <div style={{ fontFamily: '"JetBrains Mono", monospace', fontSize: 28, fontWeight: 700, color: SEVERITY_COLOR[vuln.severity] }}>
                {vuln.type === 'CVE' ? vuln.data.cvss_score : vuln.severity}
             </div>
             <RiskBadge severity={vuln.severity} />
          </div>
          <div style={{ fontFamily: 'system-ui, sans-serif', fontSize: 14, color: 'rgba(255,255,255,0.7)', lineHeight: 1.5 }}>
             {vuln.severity === 'Critical' ? 'A hacker does not require special skills to attack this; automated exploit scripts exist publicly online.' : 
              vuln.severity === 'High' ? 'This represents a significant exposure that an attacker will aggressively target.' :
              'Requires more effort to exploit, but can be chained with other attacks.'}
          </div>
       </div>

       {/* Card 3: The Fix */}
       <div style={{ background: '#0a0a0a', border: '1px solid rgba(34, 197, 94, 0.4)', borderRadius: 16, padding: '24px', boxShadow: '0 10px 30px rgba(0,0,0,0.3)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
             <div style={{ fontFamily: 'system-ui, sans-serif', fontSize: 11, fontWeight: 700, color: '#22c55e', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
               Remediation Plan
             </div>
             <button style={{ 
               background: 'rgba(34, 197, 94, 0.15)', border: '1px solid rgba(34, 197, 94, 0.3)', borderRadius: 6, color: '#22c55e', padding: '6px 12px', fontSize: 12, cursor: 'pointer', fontFamily: 'system-ui, sans-serif', fontWeight: 500 
             }}>
               Copy to IT
             </button>
          </div>
          <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 10 }}>
             {port.recommendations?.slice(0,3).map((rec, i) => (
                <li key={i} style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                   <div style={{ width: 16, height: 16, marginTop: 2, background: 'rgba(34,197,94,0.2)', border: '1px solid rgba(34,197,94,0.5)', borderRadius: 4, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                   </div>
                   <div style={{ fontFamily: 'system-ui, sans-serif', fontSize: 14, color: '#ffffff', lineHeight: 1.5 }}>
                      {rec.action}
                   </div>
                </li>
             ))}
          </ul>
       </div>
    </>
  )
}

