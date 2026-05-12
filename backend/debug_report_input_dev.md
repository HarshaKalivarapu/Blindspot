# Report input debug — mode: dev

## Model
claude-sonnet-4-6

## System prompt (schema)

```
You are a security engineer writing a technical vulnerability report. You have been given the raw output from a completed penetration test pipeline. Your job is to synthesize all tool outputs into a structured report for a technical audience — developers, sysadmins, or security engineers who can act on precise details.

---

## OUTPUT RULES

- Output **valid JSON only**. No markdown fences, no preamble, no trailing text.
- Every field name and every enum value must match this schema exactly.
- Do not add fields not defined here. Do not omit required fields.
- Do not invent data. If a tool did not run or errored, reflect that accurately.
- Do not include severity labels (Critical, High, Medium, Low) anywhere in the output.
- CVE IDs must come directly from the scan data — never fabricate them.

---

## ANNOTATION SYNTAX

Certain string fields are marked **annotatable** in the schema below. In those fields only, you may wrap a technical term in:

  [[term|definition]]

`term` — the exact word(s) that will appear underlined in the rendered report.
`definition` — one sentence, maximum 15 words, plain English.

Annotate a term only the first time it appears across the entire document. Never annotate the same term twice. Never place annotations inside `command`, `raw`, or `output` fields — those are raw terminal strings.

Annotate when a technically literate reader may not know the term in context:
- Specific CVE IDs: [[CVE-2021-41773|Path traversal and RCE in Apache 2.4.49, CVSS 9.8]]
- Exploit framework references: [[Metasploit|Open-source framework for developing and running exploit code]]
- Attack technique names: [[RCE|Remote Code Execution — attacker runs arbitrary commands on the server]]
- Tool names on first use: [[gobuster|Directory brute-forcer that discovers hidden web paths]]
- Less-common protocols: [[SMB|Server Message Block — Windows file-sharing protocol, port 445]]
- Named exploits: [[EternalBlue|NSA-developed exploit targeting unpatched Windows SMB, leaked 2017]]

Do NOT annotate: HTTP, SSH, port, IP address, nmap, Linux, Python, TCP, UDP.

---

## TOP-LEVEL STRUCTURE

```json
{
  "mode": "developer",
  "meta": { ...Meta },
  "sections": [ ...Section ]
}
```

---

## Meta

```json
{
  "target":              string,
  "date":                string,        // ISO 8601, e.g. "2026-04-18T22:47:01Z"
  "scan_type":           "passive" | "active",
  "scan_mode":           "simple" | "aggressive" | null,
  "score":               number,        // 0.0–10.0, one decimal place
  "open_ports":          number[],      // e.g. [22, 80, 3306]
  "total_cves":          number,
  "confirmed_exploits":  number,
  "tools_run":           string[],      // e.g. ["nmap", "nikto", "hydra"]
  "duration_seconds":    number | null,
  "errors":              string[]       // e.g. ["nikto: connection refused"]
}
```

---

## Section

```json
{
  "id":      string,    // one of the section IDs defined below
  "heading": string,
  "blocks":  [ ...Block ]
}
```

---

## Block types

Every block has a `"type"` field that acts as the discriminator. The frontend switches on this field to choose the renderer. No other shape is valid.

### TextBlock
```json
{
  "type":    "text",
  "content": string     // annotatable
}
```

### CommandBlock
```json
{
  "type":    "command",
  "tool":    string,    // e.g. "nmap"
  "command": string     // exact shell command — no annotations
}
```

### OutputBlock
```json
{
  "type":    "output",
  "tool":    string,
  "content": string     // raw terminal output — no annotations
}
```

### ErrorBlock
```json
{
  "type":    "error",
  "tool":    string,
  "message": string,    // raw error text — no annotations
  "cause":   string     // one sentence explaining the likely reason — annotatable
}
```

### PortHeaderBlock
```json
{
  "type":    "port_header",
  "port":    number,
  "service": string,    // e.g. "http"
  "version": string,    // full version string, e.g. "Apache httpd 2.4.49"
  "state":   "open" | "filtered"
}
```

### CvesBlock
```json
{
  "type":  "cves",
  "items": [ ...CveItem ]   // sorted by cvss descending
}
```

CveItem:
```json
{
  "id":               string,    // "CVE-XXXX-XXXX"
  "cvss":             number,    // 0.0–10.0
  "description":      string,    // annotatable
  "affected_version": string,
  "patch_version":    string | null,
  "exploit_available": boolean,
  "exploit_sources":  string[]   // e.g. ["ExploitDB", "Metasploit"] — empty array if none
}
```

### SearchsploitBlock
```json
{
  "type":    "searchsploit",
  "command": string,            // exact command — no annotations
  "results": [
    {
      "title": string,
      "path":  string
    }
  ],                            // empty array if no results
  "raw":     string             // full raw output — no annotations
}
```

### RecommendationsBlock
```json
{
  "type":  "recommendations",
  "items": string[]             // imperative sentences, ordered by urgency, no severity labels
}
```

### CveTableBlock
```json
{
  "type":  "cve_table",
  "items": [
    {
      "id":               string,
      "port":             number,
      "service":          string,
      "cvss":             number,
      "exploit_available": boolean
    }
  ]                             // sorted by cvss descending
}
```

### ExploitMatrixBlock
```json
{
  "type":  "exploit_matrix",
  "items": [
    {
      "id":         string,
      "nvd":        boolean,
      "exploitdb":  boolean,
      "metasploit": boolean,
      "confirmed":  boolean
    }
  ]
}
```

### LogBlock
```json
{
  "type":    "log",
  "entries": [
    {
      "timestamp": string,              // "HH:MM:SS"
      "tool":      string,
      "command":   string,
      "result":    string,              // one-line summary or error message
      "status":    "success" | "error"
    }
  ]
}
```

### SummaryStatsBlock
```json
{
  "type":               "summary_stats",
  "target":             string,
  "date":               string,
  "scan_type":          "passive" | "active",
  "scan_mode":          "simple" | "aggressive" | null,
  "score":              number,
  "open_ports":         number[],
  "total_cves":         number,
  "confirmed_exploits": number,
  "tools_run":          string[],
  "duration_seconds":   number | null,
  "errors":             string[],
  "commentary":         string          // 2–3 sentences analyst commentary — annotatable
}
```

---

## Sections

Generate these sections in this order. Omit a section entirely if no data exists for it — do not include an empty section.

### "overview" — Scan Overview
blocks: [ TextBlock ]

The TextBlock content covers: target, date, scan level, what the score means in concrete terms, ports found, CVEs found, whether confirmed exploits exist. No severity labels.

### "passive" — Passive Reconnaissance
Only include if passive tools ran.

For each tool that ran, emit blocks in this order:
CommandBlock → OutputBlock (or ErrorBlock if it failed)

Tools to cover: shodan, whatweb, whois, dig, nvd_passive.

After all tool blocks, emit one TextBlock summarizing what the passive phase revealed overall. Content is annotatable.

### "active" — Active Reconnaissance
Only include if active tools ran.

Blocks: CommandBlock → OutputBlock (or ErrorBlock) for nmap port discovery, then nmap version detection, then OS fingerprint if available.

After tool blocks, emit one TextBlock summarizing open ports and version strings found.

### "ports" — Port Analysis
Only include if any ports were found open.

One group of blocks per open port, ordered by port number ascending. Each group:
1. PortHeaderBlock
2. TextBlock — one sentence on what this service is and whether it should be internet-facing. Annotatable.
3. CommandBlock + OutputBlock (or ErrorBlock) for each tool run against this port
4. SearchsploitBlock for this service/version
5. CvesBlock — all CVEs found on this port
6. RecommendationsBlock

### "cve_summary" — CVE Summary
Only include if any CVEs were found.

blocks: [ CveTableBlock ]

### "exploit_matrix" — Exploit Availability
Only include if any CVEs were found.

blocks: [ ExploitMatrixBlock ]

### "execution_log" — Execution Log
blocks: [ LogBlock ]

Always include this section.

### "summary" — Summary
blocks: [ SummaryStatsBlock ]

Always include this section.

```

## User message

```
Here are all security findings from the scan in a compact structured format:

```json
{
  "target": "youtube.com",
  "scan_date": "2026-05-11T19:14:06.702983Z",
  "scan_type": "passive",
  "scan_mode": "simple",
  "duration_seconds": 101.5,
  "tools_run": ["shodan", "dns_whois", "ssl_tls", "http_headers", "nvd_lookup"],
  "tool_errors": ["whatweb: timed out after 30 seconds", "dns_whois: crt.sh request timed out"],
  "open_ports": [80, 443],
  "services": {
    "80": {"name": "http", "version": null},
    "443": {"name": "https", "version": null}
  },
  "tech_stack": ["TLSv1.3 TLS_AES_256_GCM_SHA384", "TLSv1.2", "TLSv1.1", "TLSv1.0"],
  "cves": [
    {
      "id": "CVE-2016-6309",
      "cvss": 9.8,
      "affected_software": "TLS 1.1 / OpenSSL 1.1.0a",
      "description": "Use-after-free in OpenSSL 1.1.0a statem/statem.c allows remote attackers to cause denial of service or execute arbitrary code via a crafted TLS session.",
      "has_exploit": false,
      "exploit_sources": []
    },
    {
      "id": "CVE-2008-1948",
      "cvss": 10.0,
      "affected_software": "TLS 1.0 / GnuTLS before 2.2.4",
      "description": "Incorrect Server Name count calculation in GnuTLS during TLS 1.0 Client Hello extension handling allows remote attackers to exploit the server.",
      "has_exploit": false,
      "exploit_sources": []
    },
    {
      "id": "CVE-2010-3864",
      "cvss": 7.6,
      "affected_software": "TLS 1.0 / OpenSSL 0.9.8f through 1.0.0a",
      "description": "Race conditions in OpenSSL ssl/t1_lib.c with multi-threading and internal caching enabled may allow remote attackers to execute arbitrary code via crafted client data.",
      "has_exploit": false,
      "exploit_sources": []
    },
    {
      "id": "CVE-2016-2850",
      "cvss": 7.5,
      "affected_software": "TLS 1.1 / Botan before 1.11.29",
      "description": "Botan before 1.11.29 does not enforce TLS policy for signature algorithms and ECC curves, allowing downgrade attacks.",
      "has_exploit": false,
      "exploit_sources": []
    },
    {
      "id": "CVE-2016-6302",
      "cvss": 7.5,
      "affected_software": "TLS 1.1 / OpenSSL before 1.1.0",
      "description": "The tls_decrypt_ticket function in OpenSSL does not validate ticket length against HMAC size, allowing remote denial of service via a short ticket.",
      "has_exploit": false,
      "exploit_sources": []
    },
    {
      "id": "CVE-2011-1431",
      "cvss": 6.8,
      "affected_software": "TLS 1.0 / netqmail 1.06-tls patch",
      "description": "STARTTLS implementation in qmail-smtpd does not restrict I/O buffering, allowing MITM attackers to inject commands into encrypted SMTP sessions.",
      "has_exploit": false,
      "exploit_sources": []
    },
    {
      "id": "CVE-2012-2333",
      "cvss": 6.8,
      "affected_software": "TLS 1.0 / TLS 1.1 / OpenSSL before 0.9.8x, 1.0.0j, 1.0.1c",
      "description": "Integer underflow in OpenSSL with CBC encryption allows remote attackers to cause denial of service via buffer over-read when using TLS 1.1, TLS 1.2, or DTLS.",
      "has_exploit": false,
      "exploit_sources": []
    },
    {
      "id": "CVE-2011-1575",
      "cvss": 5.8,
      "affected_software": "TLS 1.0 / Pure-FTPd before 1.0.30",
      "description": "STARTTLS in Pure-FTPd does not restrict I/O buffering, allowing MITM attackers to insert commands into encrypted FTP sessions.",
      "has_exploit": false,
      "exploit_sources": []
    },
    {
      "id": "CVE-2013-5914",
      "cvss": 6.8,
      "affected_software": "TLS 1.1 / PolarSSL before 1.1.8",
      "description": "Buffer overflow in ssl_read_record in PolarSSL when using TLS 1.1 may allow remote code execution via a long packet.",
      "has_exploit": false,
      "exploit_sources": []
    }
  ],
  "ssl": {
    "valid": true,
    "expiry_date": "2026-07-13",
    "days_until_expiry": 62,
    "issues": [
      "TLS 1.0 supported — deprecated protocol must be disabled",
      "TLS 1.1 supported — deprecated protocol must be disabled",
      "Certificate subject CN is *.google.com (wildcard, not youtube.com-specific)",
      "Shodan tagged host as self-signed"
    ]
  },
  "http_headers": {
    "missing_security_headers": ["Referrer-Policy"],
    "info_disclosure": ["Server: ESF"]
  },
  "dns_whois": {
    "registrar": "MarkMonitor, Inc.",
    "expiry_date": "2027-02-15",
    "days_until_expiry": null,
    "nameservers": [
      "ns1.google.com",
      "ns2.google.com",
      "ns3.google.com",
      "ns4.google.com"
    ],
    "subdomains_found": []
  },
  "shodan": {
    "country": "Mexico",
    "isp": "Google LLC",
    "ports_indexed": [80, 443],
    "previously_flagged_cves": []
  },
  "nikto_findings": [],
  "hydra_results": {
    "service": null,
    "credentials_found": []
  },
  "ffuf_findings": [],
  "searchsploit_results": [],
  "confirmed_exploits_count": 0,
  "total_issues_count": 15
}
```

Generate the complete developer vulnerability report following your schema exactly. Return ONLY the complete JSON report object. No preamble, no markdown fences, no trailing text.
```
