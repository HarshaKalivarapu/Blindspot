import { useState, useEffect, useRef, useMemo, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import ForceGraph2D from 'react-force-graph-2d'
import ShaderBackground from '../components/homepage/ShaderBackground.jsx'

// ─── HARDCODED SCAN DATA ────────────────────────────────────────────────────
// TODO: replace with actual scan data from Supabase
// const { data } = await supabase.from('scans')
//   .select('report').eq('id', scanId).single()
// setScanData(data.report)

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

// Maps risk string (from port.risk field) → color
function riskColor(risk) {
  return SEVERITY_COLOR[risk] ?? '#6b7280'
}

// ─── GRAPH DATA BUILDER ─────────────────────────────────────────────────────
// Transforms scanOutput → { nodes, links } for ForceGraph2D.
// Each field comment shows which JSON key it reads from.

function buildGraphData(scanOutput) {
  const nodes = []
  const links = []

  // Root node — reads scanOutput.target
  nodes.push({
    id: 'target',
    label: scanOutput.target,
    type: 'target',
    size: 24,
    color: '#ffffff',
    data: scanOutput,
  })

  for (const port of scanOutput.ports) {
    // Port node — reads port.port, port.service, port.risk
    const portId = `port-${port.port}`
    nodes.push({
      id: portId,
      label: `:${port.port}`,
      sublabel: port.service,
      type: 'port',
      size: 18,
      color: riskColor(port.risk),
      risk: port.risk,
      data: port,
    })
    links.push({ source: 'target', target: portId })

    // Scripts node — reads port.scripts_run[]
    if (port.scripts_run?.length > 0) {
      const id = `scripts-${port.port}`
      nodes.push({
        id,
        label: 'Scripts',
        sublabel: `${port.scripts_run.length} ran`,
        type: 'scripts',
        size: 10,
        color: '#4a9eff',
        data: port.scripts_run,
        portNumber: port.port,
      })
      links.push({ source: portId, target: id })
    }

    // Findings node — reads port.findings[]
    if (port.findings?.length > 0) {
      const id = `findings-${port.port}`
      nodes.push({
        id,
        label: 'Findings',
        sublabel: `${port.findings.length} found`,
        type: 'findings',
        size: 10,
        color: '#f59e0b',
        data: port.findings,
        portNumber: port.port,
      })
      links.push({ source: portId, target: id })
    }

    // Fix node — reads port.recommendations[]
    if (port.recommendations?.length > 0) {
      const id = `fix-${port.port}`
      nodes.push({
        id,
        label: 'Fixes',
        sublabel: `${port.recommendations.length} actions`,
        type: 'fix',
        size: 10,
        color: '#22c55e',
        data: port.recommendations,
        portNumber: port.port,
      })
      links.push({ source: portId, target: id })
    }

    // CVE nodes — reads port.cves[], each cve.id, cve.cvss_score, cve.severity, cve.exploit_available
    for (const cve of port.cves ?? []) {
      const id = `cve-${cve.id}`
      nodes.push({
        id,
        label: cve.id,
        sublabel: String(cve.cvss_score),
        type: 'cve',
        size: 12,
        color: SEVERITY_COLOR[cve.severity] ?? '#6b7280',
        severity: cve.severity,
        pulsing: cve.exploit_available === true,
        data: cve,
        portNumber: port.port,
      })
      links.push({ source: portId, target: id })
    }
  }

  return { nodes, links }
}

// ─── HELPER COMPONENTS ──────────────────────────────────────────────────────

function StatPill({ label, borderColor }) {
  return (
    <div style={{
      padding: '5px 12px',
      background: 'rgba(0,0,0,0.75)',
      border: `1px solid ${borderColor ?? 'rgba(255,255,255,0.2)'}`,
      borderRadius: 20,
      fontFamily: 'system-ui, -apple-system, sans-serif',
      fontSize: 12,
      fontWeight: 500,
      color: '#ffffff',
      backdropFilter: 'blur(8px)',
      whiteSpace: 'nowrap',
    }}>
      {label}
    </div>
  )
}

function ZoomButton({ label, onClick }) {
  return (
    <motion.button
      onClick={onClick}
      whileHover={{ backgroundColor: '#ffffff', color: '#0a0a0a', borderColor: '#ffffff' }}
      initial={{ backgroundColor: 'rgba(255,255,255,0.03)', color: '#ffffff', borderColor: 'rgba(255,255,255,0.15)' }}
      transition={{ duration: 0.2 }}
      style={{
        width: 36,
        height: 36,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        border: '1px solid rgba(255,255,255,0.15)',
        borderRadius: 6,
        fontSize: 18,
        cursor: 'pointer',
        fontFamily: 'system-ui, -apple-system, sans-serif',
        backdropFilter: 'blur(4px)',
        lineHeight: 1,
      }}
    >
      {label}
    </motion.button>
  )
}

function RiskBadge({ severity }) {
  const color = SEVERITY_COLOR[severity] ?? '#6b7280'
  return (
    <span style={{
      display: 'inline-block',
      padding: '2px 10px',
      background: `${color}22`,
      border: `1px solid ${color}`,
      borderRadius: 12,
      color,
      fontSize: 11,
      fontWeight: 700,
      fontFamily: 'system-ui, sans-serif',
      letterSpacing: '0.06em',
      textTransform: 'uppercase',
    }}>
      {severity}
    </span>
  )
}

// SVG half-circle arc gauge — reads score (0–10) and risk level
function ScoreGauge({ score, riskLevel }) {
  const color = SEVERITY_COLOR[riskLevel] ?? '#6b7280'
  // Half circle: center (60,60), radius 48, arc from 180° to 0°
  const cx = 60, cy = 60, r = 48
  const startAngle = Math.PI        // 180° — left
  const endAngle = 0                // 0° — right
  const fraction = Math.min(score / 10, 1)
  const sweepAngle = endAngle - startAngle  // negative = clockwise in SVG coords... use angles directly

  // Convert angle to SVG coords (0° = right, positive = clockwise)
  const toXY = (angle) => ({
    x: cx + r * Math.cos(angle),
    y: cy + r * Math.sin(angle),
  })

  // Track arc: full half circle (180° to 0°, going counter-clockwise = sweep-flag 0)
  const trackStart = toXY(Math.PI)
  const trackEnd = toXY(0)
  const trackD = `M ${trackStart.x} ${trackStart.y} A ${r} ${r} 0 0 1 ${trackEnd.x} ${trackEnd.y}`

  // Score arc: from 180° to (180° - fraction * 180°)
  const scoreAngle = Math.PI - fraction * Math.PI
  const scoreEnd = toXY(scoreAngle)
  const largeArc = fraction > 0.5 ? 1 : 0
  const scoreD = `M ${trackStart.x} ${trackStart.y} A ${r} ${r} 0 ${largeArc} 1 ${scoreEnd.x} ${scoreEnd.y}`

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
      <svg width="120" height="72" viewBox="0 0 120 72">
        {/* Track */}
        <path d={trackD} fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="8" strokeLinecap="round" />
        {/* Score fill */}
        {fraction > 0 && (
          <path d={scoreD} fill="none" stroke={color} strokeWidth="8" strokeLinecap="round" />
        )}
        {/* Center text */}
        <text x="60" y="56" textAnchor="middle" fill="#ffffff"
          style={{ fontFamily: '"JetBrains Mono", "Fira Code", monospace', fontSize: 18, fontWeight: 700 }}>
          {score}
        </text>
        <text x="60" y="68" textAnchor="middle" fill="rgba(255,255,255,0.4)"
          style={{ fontFamily: 'system-ui, sans-serif', fontSize: 10 }}>
          / 10
        </text>
      </svg>
      <RiskBadge severity={riskLevel} />
    </div>
  )
}

// ─── PANEL CONTENT ──────────────────────────────────────────────────────────
// Reads node.type to decide which sub-panel to render.

function PanelContent({ node, expandedScript, setExpandedScript }) {
  switch (node.type) {
    case 'target':   return <TargetPanel node={node} />
    case 'port':     return <PortPanel node={node} expandedScript={expandedScript} setExpandedScript={setExpandedScript} />
    case 'cve':      return <CvePanel node={node} />
    case 'scripts':  return <ScriptsPanel node={node} expandedScript={expandedScript} setExpandedScript={setExpandedScript} />
    case 'findings': return <FindingsPanel node={node} />
    case 'fix':      return <FixPanel node={node} />
    default:         return null
  }
}

function TargetPanel({ node }) {
  // node.data = full scanOutput object
  const d = node.data
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <div>
        <div style={{ fontFamily: '"JetBrains Mono", "Fira Code", monospace', fontSize: 26, fontWeight: 700, color: '#ffffff', marginBottom: 4 }}>
          {d.target}
        </div>
        <div style={{ fontFamily: 'system-ui, sans-serif', fontSize: 13, color: 'rgba(255,255,255,0.4)' }}>
          {d.scan_mode} scan · {new Date(d.timestamp).toLocaleString()}
        </div>
      </div>
      <ScoreGauge score={d.overall_score} riskLevel={d.risk_level} />
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        {[
          { label: 'Open Ports', value: d.summary.open_ports.length },
          { label: 'Total Findings', value: d.summary.total_findings },
          { label: 'Confirmed Exploits', value: d.summary.confirmed_exploits },
          { label: 'Tools Run', value: d.summary.tools_run.length },
        ].map(({ label, value }) => (
          <div key={label} style={{
            padding: '12px 14px',
            background: 'rgba(255,255,255,0.04)',
            borderRadius: 8,
            border: '1px solid rgba(255,255,255,0.08)',
          }}>
            <div style={{ fontFamily: '"JetBrains Mono", monospace', fontSize: 22, fontWeight: 700, color: '#ffffff' }}>{value}</div>
            <div style={{ fontFamily: 'system-ui, sans-serif', fontSize: 11, color: 'rgba(255,255,255,0.45)', marginTop: 2 }}>{label}</div>
          </div>
        ))}
      </div>
      <div>
        <SectionLabel>Severity Breakdown</SectionLabel>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 8 }}>
          {[
            { sev: 'Critical', count: d.summary.critical },
            { sev: 'High', count: d.summary.high },
            { sev: 'Medium', count: d.summary.medium },
            { sev: 'Low', count: d.summary.low },
          ].map(({ sev, count }) => (
            <div key={sev} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: SEVERITY_COLOR[sev], display: 'inline-block' }} />
              <span style={{ fontFamily: 'system-ui, sans-serif', fontSize: 13, color: 'rgba(255,255,255,0.7)' }}>{count} {sev}</span>
            </div>
          ))}
        </div>
      </div>
      <div>
        <SectionLabel>Tools Run</SectionLabel>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 8 }}>
          {d.summary.tools_run.map(t => (
            <span key={t} style={{
              padding: '3px 10px',
              background: 'rgba(74,158,255,0.1)',
              border: '1px solid rgba(74,158,255,0.3)',
              borderRadius: 12,
              fontFamily: '"JetBrains Mono", monospace',
              fontSize: 11,
              color: '#4a9eff',
            }}>{t}</span>
          ))}
        </div>
      </div>
    </div>
  )
}

function PortPanel({ node, expandedScript, setExpandedScript }) {
  // node.data = full port object
  const port = node.data
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
        <span style={{ fontFamily: '"JetBrains Mono", monospace', fontSize: 32, fontWeight: 700, color: node.color }}>
          :{port.port}
        </span>
        <RiskBadge severity={port.risk} />
      </div>
      <div style={{ fontFamily: 'system-ui, sans-serif', fontSize: 14, color: 'rgba(255,255,255,0.7)' }}>
        {port.service} · <span style={{ fontFamily: '"JetBrains Mono", monospace', fontSize: 13 }}>{port.version}</span>
      </div>

      {port.cves?.length > 0 && (
        <div>
          <SectionLabel>CVEs ({port.cves.length})</SectionLabel>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 8 }}>
            {port.cves.map(cve => (
              <div key={cve.id} style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '8px 12px',
                background: 'rgba(255,255,255,0.04)',
                borderRadius: 6,
                border: `1px solid ${SEVERITY_COLOR[cve.severity]}33`,
              }}>
                <span style={{ fontFamily: '"JetBrains Mono", monospace', fontSize: 12, color: '#ffffff' }}>{cve.id}</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontFamily: '"JetBrains Mono", monospace', fontSize: 12, color: SEVERITY_COLOR[cve.severity], fontWeight: 700 }}>{cve.cvss_score}</span>
                  <RiskBadge severity={cve.severity} />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {port.findings?.length > 0 && (
        <div>
          <SectionLabel>Findings ({port.findings.length})</SectionLabel>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 8 }}>
            {port.findings.map((f, i) => (
              <div key={i} style={{
                padding: '10px 12px',
                background: 'rgba(255,255,255,0.04)',
                borderRadius: 6,
                border: '1px solid rgba(255,255,255,0.07)',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                  <RiskBadge severity={f.severity} />
                  <span style={{ fontFamily: '"JetBrains Mono", monospace', fontSize: 10, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase' }}>{f.type}</span>
                </div>
                <div style={{ fontFamily: 'system-ui, sans-serif', fontSize: 13, color: 'rgba(255,255,255,0.7)', lineHeight: 1.5 }}>{f.detail}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {port.recommendations?.length > 0 && (
        <div>
          <SectionLabel>Recommendations</SectionLabel>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 8 }}>
            {port.recommendations.map((r, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '8px 0' }}>
                <span style={{ marginTop: 1 }}><RiskBadge severity={r.priority} /></span>
                <span style={{ fontFamily: 'system-ui, sans-serif', fontSize: 13, color: 'rgba(255,255,255,0.7)', lineHeight: 1.5 }}>{r.action}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {port.scripts_run?.length > 0 && (
        <div>
          <SectionLabel>Scripts Run</SectionLabel>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 8 }}>
            {port.scripts_run.map((s, i) => {
              const key = `${port.port}-${i}`
              return (
                <ScriptCard key={key} script={s} scriptKey={key}
                  expanded={expandedScript === key}
                  onToggle={() => setExpandedScript(expandedScript === key ? null : key)} />
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

function CvePanel({ node }) {
  // node.data = cve object
  const cve = node.data
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div>
        <div style={{ fontFamily: '"JetBrains Mono", monospace', fontSize: 16, fontWeight: 700, color: '#ffffff', marginBottom: 8, wordBreak: 'break-all' }}>
          {cve.id}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ fontFamily: '"JetBrains Mono", monospace', fontSize: 36, fontWeight: 800, color: SEVERITY_COLOR[cve.severity] }}>
            {cve.cvss_score}
          </span>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <RiskBadge severity={cve.severity} />
            <span style={{ fontFamily: 'system-ui, sans-serif', fontSize: 11, color: 'rgba(255,255,255,0.4)' }}>CVSS Score</span>
          </div>
        </div>
      </div>

      <div>
        <SectionLabel>Description</SectionLabel>
        <p style={{ fontFamily: 'system-ui, sans-serif', fontSize: 14, color: 'rgba(255,255,255,0.75)', lineHeight: 1.6, marginTop: 8 }}>
          {cve.description}
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        <div style={{ padding: '10px 12px', background: 'rgba(255,255,255,0.04)', borderRadius: 6, border: '1px solid rgba(255,255,255,0.07)' }}>
          <div style={{ fontFamily: 'system-ui, sans-serif', fontSize: 10, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>Affected</div>
          <div style={{ fontFamily: '"JetBrains Mono", monospace', fontSize: 12, color: '#ef4444' }}>{cve.affected_version}</div>
        </div>
        <div style={{ padding: '10px 12px', background: 'rgba(255,255,255,0.04)', borderRadius: 6, border: '1px solid rgba(255,255,255,0.07)' }}>
          <div style={{ fontFamily: 'system-ui, sans-serif', fontSize: 10, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>Patch</div>
          <div style={{ fontFamily: '"JetBrains Mono", monospace', fontSize: 12, color: '#22c55e' }}>{cve.patch_version ?? 'No patch'}</div>
        </div>
      </div>

      {cve.exploit_available && (
        <div style={{ padding: '14px', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 8 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#ef4444', display: 'inline-block' }} />
            <span style={{ fontFamily: 'system-ui, sans-serif', fontSize: 12, fontWeight: 700, color: '#ef4444', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              Public Exploit Available
            </span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {cve.exploits?.map((ex, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{
                  padding: '2px 8px',
                  background: ex.confirmed ? 'rgba(239,68,68,0.2)' : 'rgba(255,255,255,0.06)',
                  border: `1px solid ${ex.confirmed ? '#ef4444' : 'rgba(255,255,255,0.1)'}`,
                  borderRadius: 10,
                  fontFamily: 'system-ui, sans-serif',
                  fontSize: 10,
                  color: ex.confirmed ? '#ef4444' : 'rgba(255,255,255,0.5)',
                  fontWeight: 600,
                }}>
                  {ex.source}
                </span>
                <span style={{ fontFamily: '"JetBrains Mono", monospace', fontSize: 12, color: 'rgba(255,255,255,0.7)' }}>{ex.name}</span>
                {ex.confirmed && <span style={{ fontFamily: 'system-ui, sans-serif', fontSize: 10, color: '#ef4444' }}>✓ confirmed</span>}
              </div>
            ))}
          </div>
        </div>
      )}

      <a
        href={`https://nvd.nist.gov/vuln/detail/${cve.id}`}
        target="_blank"
        rel="noopener noreferrer"
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 6,
          fontFamily: 'system-ui, sans-serif',
          fontSize: 13,
          color: '#4a9eff',
          textDecoration: 'underline',
          textDecorationColor: 'rgba(74,158,255,0.4)',
        }}
      >
        View on NVD ↗
      </a>
    </div>
  )
}

function ScriptsPanel({ node, expandedScript, setExpandedScript }) {
  // node.data = port.scripts_run array
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ fontFamily: 'system-ui, sans-serif', fontSize: 15, fontWeight: 600, color: '#ffffff' }}>
        Scripts run on port {node.portNumber}
      </div>
      {node.data.map((s, i) => {
        const key = `scripts-panel-${i}`
        return (
          <ScriptCard key={key} script={s} scriptKey={key}
            expanded={expandedScript === key}
            onToggle={() => setExpandedScript(expandedScript === key ? null : key)} />
        )
      })}
    </div>
  )
}

function FindingsPanel({ node }) {
  // node.data = port.findings array
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ fontFamily: 'system-ui, sans-serif', fontSize: 15, fontWeight: 600, color: '#ffffff' }}>
        Findings on port {node.portNumber}
      </div>
      {node.data.map((f, i) => (
        <div key={i} style={{
          padding: '12px 14px',
          background: 'rgba(255,255,255,0.04)',
          borderRadius: 8,
          border: `1px solid ${SEVERITY_COLOR[f.severity]}33`,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
            <RiskBadge severity={f.severity} />
            <span style={{ fontFamily: '"JetBrains Mono", monospace', fontSize: 10, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase' }}>{f.type}</span>
          </div>
          <div style={{ fontFamily: 'system-ui, sans-serif', fontSize: 13, color: 'rgba(255,255,255,0.75)', lineHeight: 1.6 }}>{f.detail}</div>
        </div>
      ))}
    </div>
  )
}

function FixPanel({ node }) {
  // node.data = port.recommendations array
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ fontFamily: 'system-ui, sans-serif', fontSize: 15, fontWeight: 600, color: '#ffffff' }}>
        Recommendations for port {node.portNumber}
      </div>
      {node.data.map((r, i) => (
        <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 12, padding: '10px 0', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
          {/* Decorative checkbox */}
          <svg width="16" height="16" viewBox="0 0 16 16" style={{ flexShrink: 0, marginTop: 1 }}>
            <rect x="1" y="1" width="14" height="14" rx="3" fill="none" stroke="rgba(255,255,255,0.25)" strokeWidth="1.5" />
          </svg>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <RiskBadge severity={r.priority} />
            <span style={{ fontFamily: 'system-ui, sans-serif', fontSize: 13, color: 'rgba(255,255,255,0.75)', lineHeight: 1.5 }}>{r.action}</span>
          </div>
        </div>
      ))}
    </div>
  )
}

// Reusable script card used in both PortPanel and ScriptsPanel
function ScriptCard({ script, scriptKey, expanded, onToggle }) {
  return (
    <div style={{
      padding: '12px 14px',
      background: 'rgba(255,255,255,0.04)',
      borderRadius: 8,
      border: '1px solid rgba(255,255,255,0.07)',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
        <span style={{
          padding: '3px 10px',
          background: 'rgba(74,158,255,0.1)',
          border: '1px solid rgba(74,158,255,0.3)',
          borderRadius: 12,
          fontFamily: '"JetBrains Mono", monospace',
          fontSize: 11,
          color: '#4a9eff',
          fontWeight: 600,
        }}>
          {script.tool}
        </span>
        <button
          onClick={onToggle}
          style={{
            background: 'none',
            border: 'none',
            color: 'rgba(255,255,255,0.4)',
            cursor: 'pointer',
            fontFamily: 'system-ui, sans-serif',
            fontSize: 11,
            padding: '2px 6px',
          }}
        >
          {expanded ? 'hide output' : 'show output'}
        </button>
      </div>
      <pre style={{
        margin: 0,
        fontFamily: '"JetBrains Mono", "Fira Code", monospace',
        fontSize: 11,
        color: '#10b981',
        background: '#0a0a0a',
        padding: '8px 10px',
        borderRadius: 6,
        overflowX: 'auto',
        whiteSpace: 'pre-wrap',
        wordBreak: 'break-all',
      }}>
        {script.command}
      </pre>
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            style={{ overflow: 'hidden' }}
          >
            <pre style={{
              margin: '8px 0 0',
              fontFamily: '"JetBrains Mono", "Fira Code", monospace',
              fontSize: 11,
              color: 'rgba(255,255,255,0.6)',
              background: '#0a0a0a',
              padding: '8px 10px',
              borderRadius: 6,
              maxHeight: 200,
              overflowY: 'auto',
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-all',
            }}>
              {script.output}
            </pre>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

function SectionLabel({ children }) {
  return (
    <div style={{
      fontFamily: 'system-ui, sans-serif',
      fontSize: 10,
      fontWeight: 700,
      color: 'rgba(255,255,255,0.35)',
      textTransform: 'uppercase',
      letterSpacing: '0.1em',
    }}>
      {children}
    </div>
  )
}

// ─── MAIN COMPONENT ─────────────────────────────────────────────────────────

export default function ReportActiveVisual() {
  // TODO: replace with actual scan data from Supabase
  // const { data } = await supabase.from('scans')
  //   .select('report').eq('id', scanId).single()
  // setScanData(data.report)
  const [scanData] = useState(SCAN_OUTPUT)

  const [visibleNodes, setVisibleNodes] = useState([])
  const [visibleLinks, setVisibleLinks] = useState([])
  const [selectedNode, setSelectedNode] = useState(null)
  const [expandedScript, setExpandedScript] = useState(null)
  const [graphWidth, setGraphWidth] = useState(window.innerWidth)
  const [currentZoom, setCurrentZoom] = useState(1)

  const graphRef = useRef(null)
  const containerRef = useRef(null)
  const frameRef = useRef(0)        // rAF timestamp — read by nodeCanvasObject for pulse animation
  const pulseTimerRef = useRef(null)

  // Pre-compute all nodes/links once; slice into them during animation sequence
  const { nodes: allNodes, links: allLinks } = useMemo(
    () => buildGraphData(scanData),
    [scanData]
  )

  // Top-bar stats derived from scanData.summary
  const stats = useMemo(() => ({
    score: scanData.overall_score,
    riskLevel: scanData.risk_level,
    critical: scanData.summary.critical,
    ports: scanData.summary.open_ports.length,
    exploits: scanData.summary.confirmed_exploits,
  }), [scanData])

  // ── Animation sequence: nodes reveal in cinematic order ──────────────────
  useEffect(() => {
    const timers = []

    // T=0ms — target node glows in first
    timers.push(setTimeout(() => {
      const targetNode = allNodes.find(n => n.id === 'target')
      if (targetNode) setVisibleNodes([targetNode])
    }, 0))

    // T=600ms — port nodes shoot out one by one, 150ms apart
    const portNodes = allNodes.filter(n => n.type === 'port')
    portNodes.forEach((pn, i) => {
      timers.push(setTimeout(() => {
        setVisibleNodes(prev => prev.find(n => n.id === pn.id) ? prev : [...prev, pn])
        setVisibleLinks(prev => {
          const lnk = allLinks.find(l => l.source === 'target' && l.target === pn.id)
          return lnk && !prev.find(l => l.target === pn.id) ? [...prev, lnk] : prev
        })
      }, 600 + i * 150))
    })

    // T=1400ms — scripts/findings/fix satellites radiate, 80ms apart
    const satNodes = allNodes.filter(n => ['scripts', 'findings', 'fix'].includes(n.type))
    satNodes.forEach((sn, i) => {
      timers.push(setTimeout(() => {
        setVisibleNodes(prev => prev.find(n => n.id === sn.id) ? prev : [...prev, sn])
        setVisibleLinks(prev => {
          const lnk = allLinks.find(l => l.target === sn.id)
          return lnk && !prev.find(l => l.target === sn.id) ? [...prev, lnk] : prev
        })
      }, 1400 + i * 80))
    })

    // T=2000ms — CVE nodes last, critical first, 100ms apart
    const cveNodes = allNodes
      .filter(n => n.type === 'cve')
      .sort((a, b) => {
        const order = { Critical: 0, High: 1, Medium: 2, Low: 3 }
        return (order[a.severity] ?? 4) - (order[b.severity] ?? 4)
      })
    cveNodes.forEach((cn, i) => {
      timers.push(setTimeout(() => {
        setVisibleNodes(prev => prev.find(n => n.id === cn.id) ? prev : [...prev, cn])
        setVisibleLinks(prev => {
          const lnk = allLinks.find(l => l.target === cn.id)
          return lnk && !prev.find(l => l.target === cn.id) ? [...prev, lnk] : prev
        })
      }, 2000 + i * 100))
    })

    return () => timers.forEach(clearTimeout)
  }, [allNodes, allLinks])

  // ── rAF loop: increments frameRef.current each frame for CVE pulse rings ──
  useEffect(() => {
    const tick = (ts) => {
      frameRef.current = ts
      pulseTimerRef.current = requestAnimationFrame(tick)
    }
    pulseTimerRef.current = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(pulseTimerRef.current)
  }, [])

  // ── graphWidth: shrink canvas when detail panel opens ──────────────────────
  useEffect(() => {
    setGraphWidth(selectedNode ? window.innerWidth - 380 : window.innerWidth)
  }, [selectedNode])

  useEffect(() => {
    const onResize = () => {
      setGraphWidth(selectedNode ? window.innerWidth - 380 : window.innerWidth)
    }
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [selectedNode])

  // ── Custom canvas node renderer ───────────────────────────────────────────
  // Uses frameRef (a ref, not state) so sine-wave pulses don't trigger re-renders.
  const nodeCanvasObject = useCallback((node, ctx) => {
    const { x, y, type, size, label, sublabel, pulsing } = node
    const baseR = (size ?? 10) / 2

    ctx.save()

    switch (type) {
      case 'target': {
        // Measure actual text width so the circle always fits the IP string
        const fontSize = 11
        ctx.font = `bold ${fontSize}px "JetBrains Mono", "Fira Code", monospace`
        const textW = ctx.measureText(label).width
        const r = Math.max(baseR, textW / 2 + 10) // 10px padding on each side

        // Transparent fill, white glowing stroke
        ctx.beginPath()
        ctx.arc(x, y, r, 0, Math.PI * 2)
        ctx.shadowBlur = 18
        ctx.shadowColor = 'rgba(255,255,255,0.45)'
        ctx.strokeStyle = 'rgba(255,255,255,0.9)'
        ctx.lineWidth = 2
        ctx.stroke()
        ctx.shadowBlur = 0

        // IP label inside
        ctx.fillStyle = '#ffffff'
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        ctx.fillText(label, x, y)
        break
      }

      case 'port': {
        // Transparent fill, white outline; port number + service below
        ctx.beginPath()
        ctx.arc(x, y, baseR, 0, Math.PI * 2)
        ctx.strokeStyle = 'rgba(255,255,255,0.75)'
        ctx.lineWidth = 1.5
        ctx.stroke()

        const portFontSize = Math.max(5, baseR * 0.7)
        ctx.fillStyle = '#ffffff'
        ctx.font = `bold ${portFontSize}px "JetBrains Mono", "Fira Code", monospace`
        ctx.textAlign = 'center'
        ctx.textBaseline = 'top'
        ctx.fillText(label, x, y + baseR + 3)
        if (sublabel) {
          ctx.font = `${Math.max(4, baseR * 0.5)}px system-ui, -apple-system, sans-serif`
          ctx.fillStyle = 'rgba(255,255,255,0.5)'
          ctx.fillText(sublabel, x, y + baseR + 3 + portFontSize + 2)
        }
        break
      }

      case 'cve': {
        // Transparent fill; white outline; pulse stroke weight/opacity for exploit CVEs
        const t = frameRef.current
        if (pulsing) {
          // Pulse the stroke width and opacity on the main circle
          const pulseAlpha = 0.55 + Math.sin(t * 0.003) * 0.4
          const pulseWidth = 1.5 + Math.sin(t * 0.003) * 1.5
          ctx.beginPath()
          ctx.arc(x, y, baseR, 0, Math.PI * 2)
          ctx.strokeStyle = `rgba(255,255,255,${pulseAlpha})`
          ctx.lineWidth = pulseWidth
          ctx.stroke()
        } else {
          ctx.beginPath()
          ctx.arc(x, y, baseR, 0, Math.PI * 2)
          ctx.strokeStyle = 'rgba(255,255,255,0.65)'
          ctx.lineWidth = 1.5
          ctx.stroke()
        }

        // Last 5 chars of CVE ID inside (e.g. "41773")
        const shortId = label.slice(-5)
        ctx.fillStyle = '#ffffff'
        ctx.font = `bold ${Math.max(4, baseR * 0.55)}px "JetBrains Mono", monospace`
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        ctx.fillText(shortId, x, y)
        if (sublabel) {
          ctx.fillStyle = 'rgba(255,255,255,0.7)'
          ctx.font = `${Math.max(4, baseR * 0.5)}px "JetBrains Mono", monospace`
          ctx.textBaseline = 'top'
          ctx.fillText(sublabel, x, y + baseR + 2)
        }
        break
      }

      case 'scripts':
      case 'findings':
      case 'fix': {
        // Transparent fill, white outline; letter inside (S/F/R); count below
        ctx.beginPath()
        ctx.arc(x, y, baseR, 0, Math.PI * 2)
        ctx.strokeStyle = 'rgba(255,255,255,0.6)'
        ctx.lineWidth = 1.5
        ctx.stroke()

        const letter = type === 'scripts' ? 'S' : type === 'findings' ? 'F' : 'R'
        ctx.fillStyle = '#ffffff'
        ctx.font = `bold ${Math.max(4, baseR * 0.8)}px system-ui, -apple-system, sans-serif`
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        ctx.fillText(letter, x, y)
        if (sublabel) {
          ctx.fillStyle = 'rgba(255,255,255,0.5)'
          ctx.font = `${Math.max(3, baseR * 0.6)}px system-ui, -apple-system, sans-serif`
          ctx.textBaseline = 'top'
          ctx.fillText(sublabel, x, y + baseR + 2)
        }
        break
      }

      default:
        ctx.beginPath()
        ctx.arc(x, y, baseR, 0, Math.PI * 2)
        ctx.strokeStyle = 'rgba(255,255,255,0.5)'
        ctx.lineWidth = 1.5
        ctx.stroke()
    }

    ctx.restore()
  }, []) // frameRef is a ref — .current is always current even with empty deps

  // Glowing cable links using the shader's blue-green palette, saturated and thick
  const linkCanvasObject = useCallback((link, ctx) => {
    const start = link.source
    const end = link.target
    if (typeof start !== 'object' || typeof end !== 'object') return
    if (start.x == null || end.x == null) return

    ctx.save()
    ctx.beginPath()
    ctx.moveTo(start.x, start.y)
    ctx.lineTo(end.x, end.y)
    ctx.strokeStyle = 'rgba(30, 115, 200, 0.8)'
    ctx.lineWidth = 2.5
    ctx.lineCap = 'round'
    ctx.shadowColor = 'rgba(30, 115, 200, 0.55)'
    ctx.shadowBlur = 8
    ctx.stroke()
    ctx.restore()
  }, [])

  const handleNodeClick = useCallback((node) => {
    setSelectedNode(node)
  }, [])

  const handleBackgroundClick = useCallback(() => {
    setSelectedNode(null)
  }, [])

  const handleZoomIn = useCallback(() => {
    const z = Math.min(currentZoom * 1.4, 8)
    graphRef.current?.zoom(z, 400)
    setCurrentZoom(z)
  }, [currentZoom])

  const handleZoomOut = useCallback(() => {
    const z = Math.max(currentZoom / 1.4, 0.1)
    graphRef.current?.zoom(z, 400)
    setCurrentZoom(z)
  }, [currentZoom])

  return (
    <div style={{
      position: 'relative',
      width: '100vw',
      height: '100vh',
      overflow: 'hidden',
      background: '#070a0d',
    }}>

      {/* Shader background — same as every other page in the app */}
      <ShaderBackground />

      {/* Graph canvas container — narrows when detail panel opens */}
      <div
        ref={containerRef}
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: graphWidth,
          height: '100vh',
          transition: 'width 0.3s ease',
          zIndex: 1,
        }}
      >
        <ForceGraph2D
          ref={graphRef}
          graphData={{ nodes: visibleNodes, links: visibleLinks }}
          nodeCanvasObject={nodeCanvasObject}
          nodeCanvasObjectMode={() => 'replace'}
          linkCanvasObject={linkCanvasObject}
          linkCanvasObjectMode={() => 'replace'}
          onNodeClick={handleNodeClick}
          onBackgroundClick={handleBackgroundClick}
          backgroundColor="transparent"
          width={graphWidth}
          height={window.innerHeight}
          nodeRelSize={1}
          cooldownTicks={80}
          d3AlphaDecay={0.02}
          d3VelocityDecay={0.3}
        />
      </div>

      {/* Top-left: stats bar */}
      <div style={{
        position: 'fixed',
        top: 20,
        left: 20,
        zIndex: 10,
        display: 'flex',
        gap: 8,
        flexWrap: 'wrap',
      }}>
        <StatPill label={`Score ${stats.score}/10`} borderColor={SEVERITY_COLOR[stats.riskLevel]} />
        <StatPill label={`${stats.critical} Critical`} borderColor="#ef4444" />
        <StatPill label={`${stats.ports} Ports`} borderColor="rgba(255,255,255,0.2)" />
        <StatPill label={`${stats.exploits} Confirmed Exploits`} borderColor="#f97316" />
      </div>

      {/* Top-right: developer mode toggle */}
      {/* TODO: wire to non-developer report view when that route exists */}
      <div style={{
        position: 'fixed',
        top: 20,
        right: selectedNode ? 400 : 20,
        zIndex: 10,
        transition: 'right 0.3s ease',
      }}>
        <motion.button
          whileHover={{ backgroundColor: '#ffffff', color: '#0a0a0a', borderColor: '#ffffff' }}
          initial={{ backgroundColor: 'rgba(255,255,255,0.03)', color: '#ffffff', borderColor: 'rgba(255,255,255,0.15)' }}
          transition={{ duration: 0.2 }}
          style={{
            padding: '8px 16px',
            border: '1px solid rgba(255,255,255,0.15)',
            borderRadius: 6,
            fontFamily: 'system-ui, -apple-system, sans-serif',
            fontSize: 13,
            fontWeight: 500,
            cursor: 'pointer',
            letterSpacing: '0.01em',
            backdropFilter: 'blur(4px)',
          }}
        >
          Developer Mode
        </motion.button>
      </div>

      {/* Bottom-left: zoom controls */}
      <div style={{
        position: 'fixed',
        bottom: 24,
        left: 24,
        zIndex: 10,
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
      }}>
        <ZoomButton label="+" onClick={handleZoomIn} />
        <ZoomButton label="−" onClick={handleZoomOut} />
      </div>

      {/* Slide-in detail panel */}
      <AnimatePresence>
        {selectedNode && (
          <motion.div
            key="detail-panel"
            initial={{ x: 380, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: 380, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 280, damping: 30 }}
            style={{
              position: 'fixed',
              top: 0,
              right: 0,
              width: 380,
              height: '100vh',
              background: 'rgba(8, 14, 20, 0.88)',
              backdropFilter: 'blur(20px)',
              borderLeft: '1px solid rgba(255,255,255,0.09)',
              zIndex: 20,
              display: 'flex',
              flexDirection: 'column',
              overflowY: 'hidden',
            }}
          >
            {/* Panel header */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '18px 24px 14px',
              borderBottom: '1px solid rgba(255,255,255,0.07)',
              flexShrink: 0,
            }}>
              <span style={{
                fontFamily: 'system-ui, -apple-system, sans-serif',
                fontSize: 11,
                fontWeight: 700,
                color: 'rgba(255,255,255,0.35)',
                textTransform: 'uppercase',
                letterSpacing: '0.1em',
              }}>
                {selectedNode.type}
              </span>
              <motion.button
                onClick={() => setSelectedNode(null)}
                whileHover={{ backgroundColor: '#ffffff', color: '#0a0a0a', borderColor: '#ffffff' }}
                initial={{ backgroundColor: 'rgba(255,255,255,0.03)', color: 'rgba(255,255,255,0.6)', borderColor: 'rgba(255,255,255,0.15)' }}
                transition={{ duration: 0.2 }}
                style={{
                  border: '1px solid rgba(255,255,255,0.15)',
                  borderRadius: 6,
                  padding: '4px 10px',
                  cursor: 'pointer',
                  fontSize: 16,
                  lineHeight: 1,
                  fontFamily: 'system-ui, -apple-system, sans-serif',
                  backdropFilter: 'blur(4px)',
                }}
              >
                ×
              </motion.button>
            </div>

            {/* Scrollable panel content */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px 40px' }}>
              <PanelContent
                node={selectedNode}
                expandedScript={expandedScript}
                setExpandedScript={setExpandedScript}
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
