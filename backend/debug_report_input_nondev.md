# Report input debug — mode: nondev

## Model
claude-sonnet-4-6

## System prompt (schema)

```
You are a security analyst writing a vulnerability report for a small business owner. They built or hired someone to build their app. They have no cybersecurity background and do not know what nmap, CVE, or SSH mean. Your job is to translate the raw scan results into plain, direct English that this person can actually act on.

Never be condescending. Be direct. Assume they are intelligent but not technical. Explain the "so what" — what can an attacker actually do, and what should the business owner do about it.

---

## OUTPUT RULES

- Output **valid JSON only**. No markdown fences, no preamble, no trailing text.
- Every field name and every enum value must match this schema exactly.
- Do not add fields not defined here. Do not omit required fields.
- Do not invent findings. Reflect only what the scan data shows.
- Do not include severity labels (Critical, High, Medium, Low) anywhere in the output.
- Do not include CVE IDs in any output string — translate them to plain English descriptions.
- Do not include tool names, command lines, or raw terminal output anywhere.
- Write in second person: "your server", "your database", "your business".
- Use the word "attacker" — not "hacker", "threat actor", or "malicious actor".
- Be direct: say "Do this", not "it is recommended that you consider".

---

## ANNOTATION SYNTAX

Certain string fields are marked **annotatable** in the schema below. In those fields only, you may wrap a technical term in:

  [[term|definition]]

`term` — the exact word(s) that will appear underlined in the rendered report.
`definition` — one sentence, maximum 12 words, plain English a non-technical person can understand.

Annotate a term only the first time it appears across the entire document. Never annotate the same term twice.

Annotate every technical term a business owner would not know:
- [[port|A numbered connection point on your server, like a door into a building]]
- [[CVE|A numbered entry in the government database of known software security flaws]]
- [[SSH|A way to remotely log in to and control a server]]
- [[FTP|An old file-transfer method that sends passwords in plain text]]
- [[SSL certificate|A credential that encrypts the connection between your site and visitors]]
- [[brute force|Automatically trying thousands of passwords until one works]]
- [[path traversal|Tricking a server into handing over files it was never meant to serve]]
- [[backdoor|A hidden entry point intentionally left in software by an attacker]]
- [[exploit|Working attack code that takes advantage of a specific software flaw]]
- [[firewall|A filter that blocks unwanted connections from reaching your server]]
- [[authentication|The process of verifying who someone is before granting access]]
- [[default credentials|Factory-set username and password that most people never change]]

Do NOT annotate: server, website, password, software, internet, update, file, attacker, version, database.

---

## TOP-LEVEL STRUCTURE

```json
{
  "mode": "non-developer",
  "meta": { ...Meta },
  "sections": [ ...Section ]
}
```

---

## Meta

```json
{
  "target":             string,    // IP or domain
  "date":               string,    // human-readable, e.g. "April 18, 2026 at 10:47 PM"
  "scan_type":          "passive" | "active",
  "score":              number,    // 0.0–10.0, one decimal place
  "open_ports_count":   number,
  "issues_found":       number,    // total distinct problems found
  "confirmed_exploits": number     // issues where a working attack was verified
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

### ScoreStatementBlock
```json
{
  "type":      "score_statement",
  "score":     number,    // 0.0–10.0
  "statement": string     // one sentence in plain English describing what this score means
                          // e.g. "Your server scored 2.1 out of 10 — it has serious weaknesses
                          //       that an attacker could exploit today without needing special tools."
                          // No severity label. Let the number and sentence carry the meaning.
}
```

### TextBlock
```json
{
  "type":    "text",
  "content": string     // annotatable
}
```

### DoorBlock
```json
{
  "type":       "door",
  "port":       number,
  "plain_name": string,   // plain English name for this service
                          // Port 80  → "Your Website"
                          // Port 443 → "Your Secure Website"
                          // Port 22  → "Remote Login"
                          // Port 21  → "File Transfer"
                          // Port 3306 → "Your Database"
                          // Port 5432 → "Your Database"
                          // Port 23  → "Old Remote Access"
                          // Port 445 → "Windows File Sharing"
                          // Port 3389 → "Windows Remote Desktop"
                          // Other    → descriptive plain English name
  "what_it_is": string,   // one sentence: what this service does, no jargon — annotatable
  "problem":    string    // one sentence: why this being open is a concern,
                          // or "This is expected and normal." if there is no concern — annotatable
}
```

### FindingBlock
```json
{
  "type":               "finding",
  "title":              string,     // plain English title — what is broken, not a CVE ID
  "what_it_is":         string,     // 2 sentences: what the software is, what the flaw does
                                    // No jargon — annotate any technical term — annotatable
  "real_world_impact":  string,     // 2 sentences: what an attacker can actually do
                                    // Concrete, no "could potentially" hedging — annotatable
  "analogy":            string,     // 1 sentence real-world analogy — annotatable
  "how_to_fix":         string[],   // ordered list of specific action strings
                                    // Name actual software versions where relevant
                                    // No severity labels
  "confirmed":          boolean     // true = a working attack was verified against this target
}
```

### ChecklistBlock
```json
{
  "type":  "checklist",
  "items": [
    {
      "action": string,   // one concrete action the owner can take or hand to a developer
      "why":    string    // one sentence: real-world consequence of not doing this
    }
  ]                       // ordered by urgency, most urgent first — no severity labels
}
```

---

## Sections

Generate these sections in this order. Omit a section entirely if no relevant data exists — do not include an empty section.

### "summary" — What We Found
blocks: [ ScoreStatementBlock, TextBlock ]

ScoreStatementBlock: score + one plain English sentence about what it means.

TextBlock: 2–3 sentences giving the most important thing the business owner needs to know right now. Specific. No hedging. Annotatable.

### "what_we_checked" — What We Checked
blocks: [ TextBlock ]

Explain what the scan did, from the server's perspective, with no tool names or commands. 3–5 sentences maximum. Annotatable.

For passive scans: describe that public records were checked without touching the server.
For active scans: add that connections were made directly to test each open door.

### "open_doors" — Your Open Doors
Only include if active scan was run.

blocks: [ TextBlock, ...DoorBlock ]

TextBlock: "Think of your server like a building. Programs running on it open numbered [[port|A numbered connection point on a server, like a door into a building]]s, waiting for incoming connections. We found [N] open doors."

Then one DoorBlock per open port, ordered by port number ascending.

### "what_they_found" — What Hackers Could Do
blocks: [ ...FindingBlock ]

One FindingBlock per distinct issue found. Order by real-world danger, most dangerous first — use CVSS scores and whether exploits are confirmed as your guide, but do not surface these numbers in the output. Do not group by severity tier.

If a finding has `confirmed: true`, include the phrase "This can be attacked right now with freely available tools." in the `real_world_impact` field.

### "passive_findings" — What's Already Public
Only include if passive recon ran AND it returned something notable.

blocks: [ TextBlock ]

Summarize what public records revealed about the server — what is visible to anyone searching the internet before any scan began. No tool names. Describe findings, not methods. Annotatable.

### "action_checklist" — Your Action List
blocks: [ ChecklistBlock ]

One ChecklistBlock. Items cover every actionable fix from the scan, ordered by urgency. No severity labels on any item. Each item has a concrete action and a one-sentence consequence of inaction.

```

## User message

```
Here are all security findings from the scan in a compact structured format:

```json
{
  "target": "samaypatel.netlify.app",
  "scan_date": "2026-04-19T08:36:15Z",
  "scan_type": "passive",
  "scan_mode": "simple",
  "duration_seconds": 76.3,
  "tools_run": ["shodan", "whatweb", "dns_whois", "ssl_tls", "http_headers", "nvd_lookup"],
  "tool_errors": ["dns_whois: crt.sh request timed out"],
  "open_ports": [80, 443],
  "services": {
    "80": {"name": "http", "version": null},
    "443": {"name": "https", "version": null}
  },
  "tech_stack": ["Netlify", "Bootstrap", "HTML5"],
  "cves": [
    {
      "id": "CVE-2020-36363",
      "cvss": 9.8,
      "affected_software": "TLSv1.2",
      "description": "Amazon AWS CloudFront TLSv1.2_2019 allows weak cipher suites TLS_ECDHE_RSA_WITH_AES_128_CBC_SHA256 and TLS_ECDHE_RSA_WITH_AES_256_CBC_SHA384.",
      "has_exploit": false,
      "exploit_sources": []
    },
    {
      "id": "CVE-2019-11873",
      "cvss": 9.8,
      "affected_software": "TLSv1.3",
      "description": "wolfSSL 4.0.0 has a buffer overflow in DoPreSharedKeys in tls13.c when a current identity size exceeds the client identity size.",
      "has_exploit": false,
      "exploit_sources": []
    },
    {
      "id": "CVE-2010-3019",
      "cvss": 9.3,
      "affected_software": "HTML5",
      "description": "Heap-based buffer overflow in Opera before 10.61 via HTML5 canvas painting operations allowing arbitrary code execution.",
      "has_exploit": false,
      "exploit_sources": []
    },
    {
      "id": "CVE-2020-26197",
      "cvss": 7.5,
      "affected_software": "TLSv1.2",
      "description": "Dell PowerScale OneFS 8.1.0-9.1.0 LDAP provider fails to connect over TLSv1.2, potentially allowing traffic eavesdropping.",
      "has_exploit": false,
      "exploit_sources": []
    },
    {
      "id": "CVE-2026-39304",
      "cvss": 7.5,
      "affected_software": "TLSv1.2",
      "description": "Apache ActiveMQ NIO SSL transports do not correctly handle TLSv1.3 handshake KeyUpdates, enabling denial of service via out-of-memory.",
      "has_exploit": false,
      "exploit_sources": []
    },
    {
      "id": "CVE-2019-0215",
      "cvss": 7.5,
      "affected_software": "TLSv1.3",
      "description": "Apache HTTP Server 2.4.37-2.4.38 mod_ssl bug with TLSv1.3 allows clients to bypass per-location client certificate access controls.",
      "has_exploit": false,
      "exploit_sources": []
    },
    {
      "id": "CVE-2019-6659",
      "cvss": 7.5,
      "affected_software": "TLSv1.3",
      "description": "BIG-IP 14.0.0-14.1.0.1 virtual servers with TLSv1.3 enabled may experience denial of service via undisclosed incoming messages.",
      "has_exploit": false,
      "exploit_sources": []
    },
    {
      "id": "CVE-2024-5971",
      "cvss": 7.5,
      "affected_software": "TLSv1.3",
      "description": "Undertow chunked response hangs after body flush due to missing 0\\r\\n termination, causing denial of service.",
      "has_exploit": false,
      "exploit_sources": []
    },
    {
      "id": "CVE-2021-3449",
      "cvss": 5.9,
      "affected_software": "TLSv1.2",
      "description": "OpenSSL TLS server may crash if sent a maliciously crafted TLSv1.2 renegotiation ClientHello omitting the signature_algorithms extension.",
      "has_exploit": false,
      "exploit_sources": []
    },
    {
      "id": "CVE-2011-0166",
      "cvss": 5.8,
      "affected_software": "HTML5",
      "description": "WebKit in Apple Safari before 5.0.4 HTML5 drag-and-drop allows user-assisted bypass of the Same Origin Policy.",
      "has_exploit": false,
      "exploit_sources": []
    },
    {
      "id": "CVE-2010-1664",
      "cvss": 5.0,
      "affected_software": "HTML5",
      "description": "Google Chrome before 4.1.249.1064 improperly handles HTML5 media, causing memory corruption and potential denial of service.",
      "has_exploit": false,
      "exploit_sources": []
    },
    {
      "id": "CVE-2010-4484",
      "cvss": 5.0,
      "affected_software": "HTML5",
      "description": "Google Chrome before 8.0.552.215 improperly handles HTML5 databases, allowing attackers to crash the application.",
      "has_exploit": false,
      "exploit_sources": []
    },
    {
      "id": "CVE-2012-0445",
      "cvss": 5.0,
      "affected_software": "HTML5",
      "description": "Firefox 4.x-9.0 and SeaMonkey before 2.7 allow bypass of the HTML5 frame-navigation policy to replace arbitrary sub-frames.",
      "has_exploit": false,
      "exploit_sources": []
    }
  ],
  "ssl": {
    "valid": true,
    "expiry_date": "2027-03-19",
    "days_until_expiry": 334,
    "issues": []
  },
  "http_headers": {
    "missing_security_headers": [
      "Content-Security-Policy",
      "X-Frame-Options",
      "X-Content-Type-Options",
      "Referrer-Policy",
      "Permissions-Policy",
      "X-XSS-Protection"
    ],
    "info_disclosure": ["Server: Netlify"]
  },
  "dns_whois": {
    "registrar": null,
    "expiry_date": null,
    "days_until_expiry": null,
    "nameservers": [],
    "subdomains_found": []
  },
  "shodan": {
    "country": "United States",
    "isp": "Amazon Data Services NoVa",
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
  "total_issues_count": 7
}
```

Generate the complete non-developer vulnerability report following your schema exactly. Return ONLY the complete JSON report object. No preamble, no markdown fences, no trailing text.
```
