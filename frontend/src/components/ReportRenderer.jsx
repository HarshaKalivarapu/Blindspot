// ReportRenderer — renders structured JSON reports from the backend.
// Handles both Developer-Report and Non-Developer-Report schemas.
// Annotation syntax: [[term|definition]] → underlined word with tooltip.

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

// ── Annotation parser ─────────────────────────────────────────────────────────
function Annotated({ text }) {
  if (!text) return null
  const parts = text.split(/(\[\[.+?\|.+?\]\])/g)
  return (
    <>
      {parts.map((part, i) => {
        const m = part.match(/^\[\[(.+?)\|(.+?)\]\]$/)
        if (m) {
          return (
            <span key={i} title={m[2]} style={{
              textDecoration: 'underline',
              textDecorationStyle: 'dotted',
              textDecorationColor: 'rgba(255,255,255,0.4)',
              cursor: 'help',
            }}>
              {m[1]}
            </span>
          )
        }
        return <span key={i}>{part}</span>
      })}
    </>
  )
}

// ── Shared styles ─────────────────────────────────────────────────────────────
const S = {
  card: {
    background: 'rgba(255,255,255,0.04)',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: 12,
    padding: '20px 24px',
    marginBottom: 16,
  },
  label: {
    fontSize: 11,
    fontWeight: 600,
    letterSpacing: '0.08em',
    textTransform: 'uppercase',
    color: 'rgba(255,255,255,0.35)',
    marginBottom: 6,
  },
  code: {
    background: 'rgba(0,0,0,0.4)',
    border: '1px solid rgba(255,255,255,0.08)',
    borderRadius: 8,
    padding: '12px 16px',
    fontFamily: 'monospace',
    fontSize: 12,
    color: 'rgba(255,255,255,0.75)',
    overflowX: 'auto',
    marginBottom: 16,
    whiteSpace: 'pre-wrap',
    wordBreak: 'break-all',
  },
}

function cvssColor(score) {
  if (score >= 9) return '#ef4444'
  if (score >= 7) return '#f97316'
  if (score >= 4) return '#eab308'
  return '#22c55e'
}

// ── Generic list helper — numbered only when >2 items ─────────────────────────
function ItemList({ items, itemStyle }) {
  if (!items?.length) return null
  const Tag = items.length > 2 ? 'ol' : 'ul'
  return (
    <Tag style={{ margin: 0, paddingLeft: 20 }}>
      {items.map((item, i) => (
        <li key={i} style={itemStyle}>{item}</li>
      ))}
    </Tag>
  )
}

// ── Non-developer block renderers ─────────────────────────────────────────────

function ScoreStatementBlock({ block }) {
  const score = block.score ?? 0
  const color = cvssColor(10 - score) // invert: lower score = more vulnerable
  return (
    <div style={{ textAlign: 'center', padding: '32px 0 24px' }}>
      <div style={{ fontSize: 72, fontWeight: 700, color, lineHeight: 1, marginBottom: 12 }}>
        {score.toFixed(1)}
        <span style={{ fontSize: 24, color: 'rgba(255,255,255,0.3)', fontWeight: 400 }}>/10</span>
      </div>
      <p style={{ fontSize: 18, color: 'rgba(255,255,255,0.8)', maxWidth: 600, margin: '0 auto', lineHeight: 1.6 }}>
        <Annotated text={block.statement} />
      </p>
    </div>
  )
}

function TextBlock({ block }) {
  return (
    <p style={{ color: 'rgba(255,255,255,0.8)', lineHeight: 1.75, marginBottom: 16 }}>
      <Annotated text={block.content} />
    </p>
  )
}

function DoorBlock({ block }) {
  const hasProblem = block.problem && block.problem !== 'This is expected and normal.'
  return (
    <div style={{ ...S.card, borderLeft: `3px solid ${hasProblem ? '#f97316' : 'rgba(255,255,255,0.15)'}` }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
        <div style={{ fontSize: 16, fontWeight: 600, color: 'white' }}>{block.plain_name}</div>
        <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.3)', fontFamily: 'monospace' }}>Port {block.port}</div>
      </div>
      <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.65)', marginBottom: 6, lineHeight: 1.5 }}>
        <Annotated text={block.what_it_is} />
      </p>
      {hasProblem && (
        <p style={{ fontSize: 13, color: '#fbbf24', lineHeight: 1.5, margin: 0 }}>
          ⚠ <Annotated text={block.problem} />
        </p>
      )}
    </div>
  )
}

function FindingBlock({ block }) {
  return (
    <div style={{ ...S.card, borderLeft: `3px solid ${block.confirmed ? '#ef4444' : '#f97316'}` }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <div style={{ fontSize: 16, fontWeight: 600, color: 'white' }}>{block.title}</div>
        {block.confirmed && (
          <span style={{ fontSize: 11, fontWeight: 600, color: '#ef4444', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 6, padding: '2px 8px' }}>
            CONFIRMED
          </span>
        )}
      </div>
      <div style={{ marginBottom: 10 }}>
        <div style={S.label}>What it is</div>
        <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.75)', lineHeight: 1.6, margin: 0 }}>
          <Annotated text={block.what_it_is} />
        </p>
      </div>
      <div style={{ marginBottom: 10 }}>
        <div style={S.label}>What an attacker could do</div>
        <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.75)', lineHeight: 1.6, margin: 0 }}>
          <Annotated text={block.real_world_impact} />
        </p>
      </div>
      {block.analogy && (
        <div style={{ marginBottom: 10 }}>
          <div style={S.label}>Think of it this way</div>
          <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.6)', fontStyle: 'italic', lineHeight: 1.6, margin: 0 }}>
            <Annotated text={block.analogy} />
          </p>
        </div>
      )}
      {block.how_to_fix?.length > 0 && (
        <div>
          <div style={S.label}>How to fix it</div>
          <ItemList
            items={block.how_to_fix}
            itemStyle={{ fontSize: 13, color: 'rgba(255,255,255,0.75)', lineHeight: 1.6, marginBottom: 4 }}
          />
        </div>
      )}
    </div>
  )
}

function ChecklistBlock({ block }) {
  return (
    <div>
      {block.items?.map((item, i) => (
        <div key={i} style={{ ...S.card, display: 'flex', gap: 16, alignItems: 'flex-start' }}>
          <div style={{
            width: 24, height: 24, borderRadius: 6, border: '1px solid rgba(255,255,255,0.2)',
            flexShrink: 0, marginTop: 1,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 11, color: 'rgba(255,255,255,0.3)',
          }}>
            {i + 1}
          </div>
          <div>
            <div style={{ fontSize: 14, fontWeight: 500, color: 'white', marginBottom: 4 }}>{item.action}</div>
            <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.45)', lineHeight: 1.5 }}>{item.why}</div>
          </div>
        </div>
      ))}
    </div>
  )
}

// ── Developer block renderers ─────────────────────────────────────────────────

function SummaryStatsBlock({ block }) {
  const stats = [
    { label: 'Score', value: `${block.score?.toFixed(1)}/10` },
    { label: 'Open Ports', value: block.open_ports?.join(', ') || '—' },
    { label: 'CVEs Found', value: block.total_cves ?? '—' },
    { label: 'Confirmed Exploits', value: block.confirmed_exploits ?? '—' },
    { label: 'Tools Run', value: block.tools_run?.join(', ') || '—' },
    { label: 'Duration', value: block.duration_seconds ? `${block.duration_seconds}s` : '—' },
  ]
  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 16 }}>
        {stats.map(({ label, value }) => (
          <div key={label} style={S.card}>
            <div style={S.label}>{label}</div>
            <div style={{ fontSize: 15, fontWeight: 600, color: 'white' }}>{value}</div>
          </div>
        ))}
      </div>
      {block.commentary && (
        <p style={{ color: 'rgba(255,255,255,0.7)', lineHeight: 1.7, fontSize: 14 }}>
          <Annotated text={block.commentary} />
        </p>
      )}
      {block.errors?.length > 0 && (
        <div style={{ marginTop: 8 }}>
          <div style={S.label}>Errors</div>
          {block.errors.map((e, i) => (
            <div key={i} style={{ fontSize: 12, color: '#f97316', fontFamily: 'monospace', marginBottom: 4 }}>{e}</div>
          ))}
        </div>
      )}
    </div>
  )
}

function CommandBlock({ block }) {
  return (
    <div style={{ marginBottom: 8 }}>
      <div style={{ ...S.label, marginBottom: 4 }}>{block.tool} — command</div>
      <div style={S.code}>{block.command}</div>
    </div>
  )
}

function OutputBlock({ block }) {
  return (
    <div style={{ marginBottom: 16 }}>
      <div style={{ ...S.label, marginBottom: 4 }}>{block.tool} — output</div>
      <div style={{ ...S.code, maxHeight: 300, overflowY: 'auto' }}>{block.content}</div>
    </div>
  )
}

function PortHeaderBlock({ block }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '12px 0', borderBottom: '1px solid rgba(255,255,255,0.08)', marginBottom: 16 }}>
      <div style={{
        background: block.state === 'open' ? 'rgba(34,197,94,0.1)' : 'rgba(255,255,255,0.05)',
        border: `1px solid ${block.state === 'open' ? 'rgba(34,197,94,0.4)' : 'rgba(255,255,255,0.1)'}`,
        borderRadius: 8, padding: '6px 14px',
        fontFamily: 'monospace', fontSize: 15, fontWeight: 700,
        color: block.state === 'open' ? '#4ade80' : 'rgba(255,255,255,0.5)',
      }}>
        {block.port}
      </div>
      <div>
        <div style={{ fontSize: 15, fontWeight: 600, color: 'white' }}>{block.service}</div>
        <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', fontFamily: 'monospace' }}>{block.version}</div>
      </div>
      <div style={{ marginLeft: 'auto', fontSize: 11, fontWeight: 600, color: block.state === 'open' ? '#4ade80' : 'rgba(255,255,255,0.3)' }}>
        {block.state?.toUpperCase()}
      </div>
    </div>
  )
}

function CvesBlock({ block }) {
  if (!block.items?.length) return null
  return (
    <div style={{ marginBottom: 16 }}>
      {block.items.map((cve, i) => (
        <div key={i} style={{ ...S.card, marginBottom: 10 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
            <div style={{ fontFamily: 'monospace', fontSize: 13, fontWeight: 600, color: 'white' }}>{cve.id}</div>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              {cve.exploit_available && (
                <span style={{ fontSize: 10, fontWeight: 700, color: '#ef4444', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 4, padding: '1px 6px' }}>
                  EXPLOIT AVAILABLE
                </span>
              )}
              <span style={{ fontSize: 13, fontWeight: 700, color: cvssColor(cve.cvss) }}>
                CVSS {cve.cvss?.toFixed(1)}
              </span>
            </div>
          </div>
          <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.65)', lineHeight: 1.6, margin: '0 0 8px' }}>
            <Annotated text={cve.description} />
          </p>
          <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)' }}>
            Affected: {cve.affected_version}
            {cve.patch_version && ` → Patched in: ${cve.patch_version}`}
          </div>
        </div>
      ))}
    </div>
  )
}

function RecommendationsBlock({ block }) {
  return (
    <ItemList
      items={block.items}
      itemStyle={{ color: 'rgba(255,255,255,0.8)', lineHeight: 1.7, marginBottom: 6, fontSize: 14 }}
    />
  )
}

function LogBlock({ block }) {
  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
        <thead>
          <tr>
            {['Time', 'Tool', 'Command', 'Result', 'Status'].map(h => (
              <th key={h} style={{ textAlign: 'left', padding: '8px 12px', color: 'rgba(255,255,255,0.35)', fontWeight: 600, fontSize: 10, letterSpacing: '0.06em', textTransform: 'uppercase', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {block.entries?.map((entry, i) => (
            <tr key={i} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
              <td style={{ padding: '8px 12px', color: 'rgba(255,255,255,0.4)', fontFamily: 'monospace' }}>{entry.timestamp}</td>
              <td style={{ padding: '8px 12px', color: 'rgba(255,255,255,0.7)', fontFamily: 'monospace' }}>{entry.tool}</td>
              <td style={{ padding: '8px 12px', color: 'rgba(255,255,255,0.5)', fontFamily: 'monospace', maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{entry.command}</td>
              <td style={{ padding: '8px 12px', color: 'rgba(255,255,255,0.65)' }}>{entry.result}</td>
              <td style={{ padding: '8px 12px' }}>
                <span style={{ fontSize: 10, fontWeight: 700, color: entry.status === 'success' ? '#4ade80' : '#f97316' }}>
                  {entry.status?.toUpperCase()}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function SearchsploitBlock({ block }) {
  return (
    <div style={{ marginBottom: 16 }}>
      <div style={S.code}>{block.command}</div>
      {block.results?.length > 0 && (
        <div>
          {block.results.map((r, i) => (
            <div key={i} style={{ padding: '6px 0', borderBottom: '1px solid rgba(255,255,255,0.06)', fontSize: 12 }}>
              <span style={{ color: '#fbbf24', fontFamily: 'monospace' }}>{r.path}</span>
              <span style={{ color: 'rgba(255,255,255,0.5)', marginLeft: 12 }}>{r.title}</span>
            </div>
          ))}
        </div>
      )}
      {(!block.results || block.results.length === 0) && (
        <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.3)' }}>No public exploits found.</div>
      )}
    </div>
  )
}

// ── Block dispatcher ──────────────────────────────────────────────────────────

function Block({ block }) {
  switch (block.type) {
    // Non-developer
    case 'score_statement':    return <ScoreStatementBlock block={block} />
    case 'text':               return <TextBlock block={block} />
    case 'door':               return <DoorBlock block={block} />
    case 'finding':            return <FindingBlock block={block} />
    case 'checklist':          return <ChecklistBlock block={block} />
    // Developer
    case 'summary_stats':      return <SummaryStatsBlock block={block} />
    case 'command':            return <CommandBlock block={block} />
    case 'output':             return <OutputBlock block={block} />
    case 'port_header':        return <PortHeaderBlock block={block} />
    case 'cves':               return <CvesBlock block={block} />
    case 'recommendations':    return <RecommendationsBlock block={block} />
    case 'log':                return <LogBlock block={block} />
    case 'searchsploit':       return <SearchsploitBlock block={block} />
    default:
      return null
  }
}

// ── Collapsible section ───────────────────────────────────────────────────────

function CollapsibleSection({ heading, children }) {
  const [open, setOpen] = useState(false)
  return (
    <section style={{ marginBottom: 12 }}>
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          background: open ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.02)',
          border: '1px solid rgba(255,255,255,0.08)', borderRadius: open ? '8px 8px 0 0' : 8,
          padding: '14px 20px', cursor: 'pointer', transition: 'background 0.2s, border-radius 0.2s',
        }}
        onMouseEnter={e => { if (!open) e.currentTarget.style.background = 'rgba(255,255,255,0.04)' }}
        onMouseLeave={e => { if (!open) e.currentTarget.style.background = 'rgba(255,255,255,0.02)' }}
      >
        <span style={{
          fontSize: 17, fontWeight: 600, color: 'rgba(255,255,255,0.95)',
          fontFamily: 'system-ui, -apple-system, sans-serif', textAlign: 'left',
        }}>
          {heading}
        </span>
        <motion.span
          animate={{ rotate: open ? 180 : 0 }}
          transition={{ duration: 0.2 }}
          style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', flexShrink: 0, marginLeft: 12 }}
        >
          ▼
        </motion.span>
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.22 }}
            style={{
              overflow: 'hidden',
              border: '1px solid rgba(255,255,255,0.08)', borderTop: 'none',
              borderRadius: '0 0 8px 8px',
              padding: '20px 20px 8px',
            }}
          >
            {children}
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  )
}

// ── Main renderer ─────────────────────────────────────────────────────────────

export default function ReportRenderer({ jsonString }) {
  if (!jsonString) {
    return <p style={{ color: 'rgba(255,255,255,0.4)' }}>Generating report...</p>
  }

  let data
  try {
    const cleaned = jsonString.replace(/^```json?\s*/i, '').replace(/```\s*$/i, '').trim()
    data = JSON.parse(cleaned)
  } catch {
    return (
      <div style={{ fontFamily: 'monospace', fontSize: 12, color: 'rgba(255,255,255,0.6)', whiteSpace: 'pre-wrap', lineHeight: 1.6 }}>
        {jsonString}
      </div>
    )
  }

  return (
    <div>
      {data.sections?.map((section, i) => (
        i === 0 ? (
          <section key={i} style={{ marginBottom: 24 }}>
            <h2 style={{
              fontSize: 20, fontWeight: 600, color: 'rgba(255,255,255,0.95)',
              borderBottom: '1px solid rgba(255,255,255,0.08)',
              paddingBottom: 10, marginBottom: 20,
            }}>
              {section.heading}
            </h2>
            {section.blocks?.map((block, j) => (
              <Block key={j} block={block} />
            ))}
          </section>
        ) : (
          <CollapsibleSection key={i} heading={section.heading}>
            {section.blocks?.map((block, j) => (
              <Block key={j} block={block} />
            ))}
          </CollapsibleSection>
        )
      ))}
    </div>
  )
}
