import jsPDF from 'jspdf'
import { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType } from 'docx'

// ── Helpers ───────────────────────────────────────────────────────────────────

function stripAnnotations(text) {
  if (!text) return ''
  return text.replace(/\[\[(.+?)\|.+?\]\]/g, '$1')
}

function safeStr(val) {
  if (val === null || val === undefined) return ''
  return String(val)
}

// ── Block → lines (plain text) ────────────────────────────────────────────────

function blockToLines(block) {
  const lines = []
  switch (block.type) {
    case 'score_statement':
      lines.push(`Security Score: ${block.score?.toFixed(1) ?? '—'}/10`)
      lines.push(stripAnnotations(block.statement))
      break
    case 'text':
      lines.push(stripAnnotations(block.content))
      break
    case 'door':
      lines.push(`Port ${block.port} — ${block.plain_name}`)
      lines.push(stripAnnotations(block.what_it_is))
      if (block.problem && block.problem !== 'This is expected and normal.') {
        lines.push(`⚠ ${stripAnnotations(block.problem)}`)
      }
      break
    case 'finding':
      lines.push(`${block.confirmed ? '[CONFIRMED] ' : ''}${block.title}`)
      lines.push(`What it is: ${stripAnnotations(block.what_it_is)}`)
      lines.push(`Real-world impact: ${stripAnnotations(block.real_world_impact)}`)
      if (block.analogy) lines.push(`Think of it this way: ${stripAnnotations(block.analogy)}`)
      if (block.how_to_fix?.length) {
        lines.push('How to fix:')
        block.how_to_fix.forEach((step, i) => lines.push(`  ${i + 1}. ${step}`))
      }
      break
    case 'checklist':
      block.items?.forEach((item, i) => {
        lines.push(`${i + 1}. ${item.action}`)
        if (item.why) lines.push(`   Why: ${item.why}`)
      })
      break
    case 'summary_stats':
      lines.push(`Score: ${block.score?.toFixed(1) ?? '—'}/10`)
      lines.push(`Open Ports: ${block.open_ports?.join(', ') || '—'}`)
      lines.push(`CVEs Found: ${block.total_cves ?? '—'}`)
      lines.push(`Confirmed Exploits: ${block.confirmed_exploits ?? '—'}`)
      lines.push(`Tools Run: ${block.tools_run?.join(', ') || '—'}`)
      lines.push(`Duration: ${block.duration_seconds ? block.duration_seconds + 's' : '—'}`)
      if (block.commentary) lines.push(stripAnnotations(block.commentary))
      if (block.errors?.length) {
        lines.push('Errors:')
        block.errors.forEach(e => lines.push(`  ${e}`))
      }
      break
    case 'command':
      lines.push(`[${block.tool}] Command: ${block.command}`)
      break
    case 'output':
      lines.push(`[${block.tool}] Output:`)
      lines.push(safeStr(block.content))
      break
    case 'port_header':
      lines.push(`Port ${block.port} — ${block.service} ${block.version ?? ''} (${block.state?.toUpperCase()})`)
      break
    case 'cves':
      block.items?.forEach(cve => {
        lines.push(`${cve.id} — CVSS ${cve.cvss?.toFixed(1) ?? '?'}${cve.exploit_available ? ' [EXPLOIT AVAILABLE]' : ''}`)
        lines.push(stripAnnotations(cve.description))
        lines.push(`Affected: ${cve.affected_version ?? '—'}${cve.patch_version ? ' → Patched: ' + cve.patch_version : ''}`)
      })
      break
    case 'recommendations':
      block.items?.forEach((item, i) => lines.push(`${i + 1}. ${item}`))
      break
    case 'log':
      block.entries?.forEach(e => {
        lines.push(`[${e.timestamp}] ${e.tool} | ${e.command} | ${e.result} | ${e.status?.toUpperCase()}`)
      })
      break
    case 'searchsploit':
      lines.push(`Command: ${block.command}`)
      if (block.results?.length) {
        block.results.forEach(r => lines.push(`  ${r.path}  ${r.title}`))
      } else {
        lines.push('  No public exploits found.')
      }
      break
  }
  return lines
}

function reportToLines(data) {
  const out = []
  data.sections?.forEach(section => {
    out.push('')
    out.push(`=== ${section.heading} ===`)
    out.push('')
    section.blocks?.forEach(block => {
      const lines = blockToLines(block)
      lines.forEach(l => out.push(l))
      out.push('')
    })
  })
  return out
}

// ── Filename helper ───────────────────────────────────────────────────────────

function buildFilename(meta, mode, ext) {
  const target = (meta.target ?? 'scan').replace(/[^a-zA-Z0-9._-]/g, '_')
  const date = meta.scan_date ? new Date(meta.scan_date).toISOString().slice(0, 10) : 'unknown'
  const suffix = mode === 'dev' ? 'developer' : 'nondev'
  return `${target}_${date}_${suffix}.${ext}`
}

// ── TXT ───────────────────────────────────────────────────────────────────────

export function exportAsTxt(reportJson, meta, mode) {
  const data = parseReport(reportJson)
  const header = buildHeader(meta, mode)
  const lines = [header, '', ...reportToLines(data)]
  const blob = new Blob([lines.join('\n')], { type: 'text/plain' })
  download(blob, buildFilename(meta, mode, 'txt'))
}

// ── PDF ───────────────────────────────────────────────────────────────────────

export function exportAsPdf(reportJson, meta, mode) {
  const data = parseReport(reportJson)
  const doc = new jsPDF({ unit: 'pt', format: 'a4' })
  const pageW = doc.internal.pageSize.getWidth()
  const pageH = doc.internal.pageSize.getHeight()
  const margin = 48
  const maxW = pageW - margin * 2
  let y = margin

  doc.setFillColor(255, 255, 255)
  doc.rect(0, 0, pageW, pageH, 'F')

  function checkPage(needed = 16) {
    if (y + needed > pageH - margin) {
      doc.addPage()
      doc.setFillColor(255, 255, 255)
      doc.rect(0, 0, pageW, pageH, 'F')
      y = margin
    }
  }

  function addText(text, size = 10, bold = false, color = [30, 30, 30]) {
    doc.setFontSize(size)
    doc.setFont('helvetica', bold ? 'bold' : 'normal')
    doc.setTextColor(...color)
    const lines = doc.splitTextToSize(safeStr(text), maxW)
    lines.forEach(line => {
      checkPage()
      doc.text(line, margin, y)
      y += size * 1.4
    })
  }

  // Header
  addText(buildHeader(meta, mode), 11, true)
  y += 12

  data.sections?.forEach(section => {
    checkPage(30)
    y += 8
    doc.setDrawColor(200, 200, 200)
    doc.line(margin, y, pageW - margin, y)
    y += 6
    addText(section.heading, 14, true, [15, 15, 15])
    y += 4

    section.blocks?.forEach(block => {
      const lines = blockToLines(block)
      lines.forEach(line => {
        if (!line.trim()) { y += 6; return }
        const isHeading = line.startsWith('===') || line.startsWith('[CONFIRMED]')
        addText(line, 10, isHeading)
      })
      y += 4
    })
  })

  doc.save(buildFilename(meta, mode, 'pdf'))
}

// ── DOCX ──────────────────────────────────────────────────────────────────────

export async function exportAsDocx(reportJson, meta, mode) {
  const data = parseReport(reportJson)
  const paragraphs = []

  paragraphs.push(new Paragraph({
    children: [new TextRun({ text: buildHeader(meta, mode), bold: true, size: 22, color: '111111' })],
    spacing: { after: 200 },
  }))

  data.sections?.forEach(section => {
    paragraphs.push(new Paragraph({
      text: section.heading,
      heading: HeadingLevel.HEADING_2,
      spacing: { before: 300, after: 100 },
    }))

    section.blocks?.forEach(block => {
      const lines = blockToLines(block)
      lines.forEach(line => {
        if (!line.trim()) {
          paragraphs.push(new Paragraph({ text: '', spacing: { after: 60 } }))
          return
        }
        const isCode = block.type === 'command' || block.type === 'output' || block.type === 'log'
        paragraphs.push(new Paragraph({
          children: [new TextRun({
            text: line,
            font: isCode ? 'Courier New' : 'Calibri',
            size: isCode ? 18 : 20,
            color: '222222',
          })],
          spacing: { after: 80 },
          alignment: AlignmentType.LEFT,
        }))
      })
    })
  })

  const doc = new Document({ sections: [{ properties: {}, children: paragraphs }] })
  const blob = await Packer.toBlob(doc)
  download(blob, buildFilename(meta, mode, 'docx'))
}

// ── Orchestrator ──────────────────────────────────────────────────────────────

export async function triggerExport(format, scanId, mode, supabaseClient) {
  const { data } = await supabaseClient
    .from('scans')
    .select('target, scan_date, scan_type, scan_mode, score, total_issues_count, report_dev, report_nondev')
    .eq('id', scanId)
    .single()

  if (!data) throw new Error('Scan not found')

  const reportJson = mode === 'dev'
    ? JSON.stringify(data.report_dev)
    : JSON.stringify(data.report_nondev)

  const meta = {
    target: data.target,
    scan_date: data.scan_date,
    scan_type: data.scan_type,
    scan_mode: data.scan_mode,
    score: data.score,
    total_issues_count: data.total_issues_count,
  }

  if (format === 'txt') exportAsTxt(reportJson, meta, mode)
  else if (format === 'pdf') exportAsPdf(reportJson, meta, mode)
  else if (format === 'docx') await exportAsDocx(reportJson, meta, mode)
}

// ── Internal utils ────────────────────────────────────────────────────────────

function parseReport(jsonString) {
  try {
    const cleaned = safeStr(jsonString).replace(/^```json?\s*/i, '').replace(/```\s*$/i, '').trim()
    return JSON.parse(cleaned)
  } catch {
    return { sections: [] }
  }
}

function buildHeader(meta, mode) {
  const modeLabel = mode === 'dev' ? 'Developer Report' : 'Non-Developer Report'
  const date = meta.scan_date ? new Date(meta.scan_date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) : ''
  const score = meta.score != null ? ` — Score: ${Number(meta.score).toFixed(1)}/10` : ''
  return `Blindspot ${modeLabel} | ${meta.target ?? ''}${score} | ${date}`
}

function download(blob, filename) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}
