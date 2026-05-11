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
  "target": "leidos.com",
  "scan_date": "2025-05-11T00:00:00Z",
  "scan_type": "passive",
  "scan_mode": "simple",
  "duration_seconds": 140.2,
  "tools_run": ["dns_whois", "ssl_tls", "http_headers", "nvd_lookup"],
  "tool_errors": [
    "shodan: Access denied (403 Forbidden)",
    "whatweb: Not installed — run: sudo apt install whatweb",
    "dns_whois: crt.sh request timed out"
  ],
  "open_ports": [443],
  "services": {
    "443": {"name": "HTTPS", "version": null}
  },
  "tech_stack": ["Cloudflare", "TLS 1.2", "TLS 1.3", "Google Trust Services WE1"],
  "cves": [
    {
      "id": "CVE-2019-10842",
      "cvss": 9.8,
      "affected_software": "Cloudflare (bootstrap-sass 3.2.0.3)",
      "description": "Arbitrary code execution via backdoor in bootstrap-sass 3.2.0.3 using a crafted ___cfduid cookie value evaluated through eval().",
      "has_exploit": false,
      "exploit_sources": []
    },
    {
      "id": "CVE-2022-4428",
      "cvss": 8.9,
      "affected_software": "Cloudflare WARP client",
      "description": "Improper validation of support_uri in mdm.xml allows privilege escalation and arbitrary executable launch on local machine.",
      "has_exploit": false,
      "exploit_sources": []
    },
    {
      "id": "CVE-2017-7235",
      "cvss": 8.8,
      "affected_software": "cloudflare-scrape 1.6.6–1.7.1",
      "description": "Malicious website owner can craft a page that executes arbitrary Python code against cfscrape users.",
      "has_exploit": false,
      "exploit_sources": []
    },
    {
      "id": "CVE-2020-15236",
      "cvss": 8.6,
      "affected_software": "Cloudflare (Wiki.js before 2.5.151)",
      "description": "Directory traversal vulnerability allows a malicious user to read arbitrary files via crafted URIs when local asset cache fetching is enabled.",
      "has_exploit": false,
      "exploit_sources": []
    },
    {
      "id": "CVE-2021-3761",
      "cvss": 7.5,
      "affected_software": "Cloudflare (OctoRPKI before 1.3.0)",
      "description": "Any CA in RPKI can trick OctoRPKI into emitting invalid VRP MaxLength values, terminating RTR sessions and disabling RPKI Origin Validation.",
      "has_exploit": false,
      "exploit_sources": []
    },
    {
      "id": "CVE-2018-0487",
      "cvss": 9.8,
      "affected_software": "ARM mbed TLS (TLS 1.3, before 1.3.22/2.1.10/2.7.0)",
      "description": "Remote attackers can execute arbitrary code or cause DoS via a crafted certificate chain mishandled during RSASSA-PSS signature verification.",
      "has_exploit": false,
      "exploit_sources": []
    },
    {
      "id": "CVE-2018-0488",
      "cvss": 9.8,
      "affected_software": "ARM mbed TLS (TLS 1.3, before 1.3.22/2.1.10/2.7.0)",
      "description": "When truncated HMAC extension and CBC are used, remote attackers can cause heap corruption via a crafted application packet.",
      "has_exploit": false,
      "exploit_sources": []
    },
    {
      "id": "CVE-2017-2784",
      "cvss": 8.1,
      "affected_software": "ARM mbed TLS (TLS 1.3, before 1.3.19/2.1.7/2.4.2)",
      "description": "Specially crafted x509 certificate causes a free of a stack pointer during certificate parsing, enabling code execution or DoS.",
      "has_exploit": false,
      "exploit_sources": []
    },
    {
      "id": "CVE-2017-14032",
      "cvss": 8.1,
      "affected_software": "ARM mbed TLS (TLS 1.3, before 1.3.21/2.1.9)",
      "description": "With optional authentication configured, remote attackers can bypass peer authentication via an X.509 certificate chain with many intermediates.",
      "has_exploit": false,
      "exploit_sources": []
    },
    {
      "id": "CVE-2018-16528",
      "cvss": 8.1,
      "affected_software": "AWS FreeRTOS through 1.3.1 (TLS 1.3/mbedTLS)",
      "description": "Remote attackers can execute arbitrary code due to mbedTLS context object corruption in AWS TLS connectivity modules.",
      "has_exploit": false,
      "exploit_sources": []
    },
    {
      "id": "CVE-2012-2333",
      "cvss": 6.8,
      "affected_software": "OpenSSL (TLS 1.2, before 0.9.8x/1.0.0j/1.0.1c)",
      "description": "Integer underflow with CBC encryption in TLS 1.1/1.2/DTLS allows remote DoS via buffer over-read.",
      "has_exploit": false,
      "exploit_sources": []
    },
    {
      "id": "CVE-2015-5291",
      "cvss": 6.8,
      "affected_software": "PolarSSL/ARM mbed TLS (TLS 1.2, before 1.2.17/1.3.14/2.1.2)",
      "description": "Heap-based buffer overflow via long response from SSL server can cause client crash or arbitrary code execution.",
      "has_exploit": false,
      "exploit_sources": []
    },
    {
      "id": "CVE-2009-3243",
      "cvss": 5.0,
      "affected_software": "Wireshark 1.2.0–1.2.1 (TLS 1.2)",
      "description": "Unspecified vulnerability in TLS dissector on Windows causes application crash via unknown vectors in TLS 1.2 conversations.",
      "has_exploit": false,
      "exploit_sources": []
    },
    {
      "id": "CVE-2012-2686",
      "cvss": 5.0,
      "affected_software": "OpenSSL 1.0.1 before 1.0.1d (TLS 1.2 AES-NI)",
      "description": "Remote attackers can cause application crash via crafted CBC data in AES-NI TLS 1.1/1.2 implementation.",
      "has_exploit": false,
      "exploit_sources": []
    },
    {
      "id": "CVE-2013-1621",
      "cvss": 4.3,
      "affected_software": "PolarSSL before 1.2.5 (TLS 1.2)",
      "description": "Array index error in SSL module allows remote DoS via crafted padding-length value during CBC padding validation.",
      "has_exploit": false,
      "exploit_sources": []
    }
  ],
  "ssl": {
    "valid": true,
    "expiry_date": "2026-06-24",
    "days_until_expiry": 44,
    "issues": [
      "Certificate expires in 44 days (2026-06-24)",
```

Generate the complete developer vulnerability report following your schema exactly. Return ONLY the complete JSON report object. No preamble, no markdown fences, no trailing text.
```
