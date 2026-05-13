# BlindSpot

**Live Demo:** [blindspot-scan.vercel.app](https://blindspot-scan.vercel.app)

BlindSpot is an automated penetration testing tool built for small businesses and startups who ship fast and skip security. Claude acts as the reasoning layer, deciding which security tools to run and in what order. The tools themselves live on a separate MCP server — a protocol that lets Claude call external tools the same way it calls anything else. Claude sees a list of available tools, picks one, runs it, reads the raw output, and loops. Each result becomes the input to Claude's next decision, which is why there's no hardcoded sequence.

Most professional security work runs on Linux. Kali Linux is the standard distribution security engineers use. The tools we automate here — nmap, Gobuster, Hydra, Metasploit — are the exact same tools that professional ethical hackers run manually in their terminals. We wrapped each one as an MCP tool so Claude can call them directly, read their terminal output, and decide what to chain next — the same workflow a security engineer follows by hand, automated.

---

## Architecture

```
[ React 19 + Vite + Tailwind CSS — Frontend ]
                    |
                    |  HTTP + SSE
                    v
[ FastAPI Orchestrator — MCP Client + Anthropic API ]
                    |
                    |  Model Context Protocol (stdio)
                    v
[ FastMCP Server — Linux Security Tools as MCP Tools ]
                    |
                    |  subprocess
                    v
[ nmap · Nikto · Gobuster · FFuF · Hydra · Metasploit
  WhatWeb · SearchSploit · Shodan API · NVD API · dig · whois ]
```

The AI reasoning layer plays two roles:
1. **Orchestrator** — reads each tool's raw output and decides the next tool to invoke based on what was found
2. **Report writer** — synthesizes all findings into a structured vulnerability report scored 1–10 by severity

---

## Scanning Pipeline

```
Start: Target + Authorization
            |
    +-------+--------+
    |                |
PASSIVE           ACTIVE
(no contact)      (direct scan)
    |                |
Shodan           NMAP port scan
WhatWeb               |
DNS & WHOIS      +----+----+
                 |    |    |
              Web   DB    SSH
              tools tools tools
    |                |
    +--------+-------+
             |
      NVD CVE Lookup
      SearchSploit
             |
             v
    AI: Correlate + Report
```

---

## File Structure

```
pentest-mcp/
├── frontend/
│   ├── src/
│   │   ├── pages/
│   │   │   ├── Home.jsx          # Landing page with terminal intro
│   │   │   ├── Scan.jsx          # Dashboard + chat interface
│   │   │   ├── Guide.jsx         # User guide (dev + non-dev modes)
│   │   │   └── ScanNew.jsx       # Scan configuration modal
│   │   ├── components/
│   │   │   ├── homepage/
│   │   │   │   ├── ShaderBackground.jsx
│   │   │   │   ├── ScanFeed.jsx
│   │   │   │   ├── HeroPanel.jsx
│   │   │   │   └── AuthModal.jsx
│   │   │   └── WarningModal.jsx
│   │   ├── lib/
│   │   │   ├── supabase.js       # Supabase client
│   │   │   └── AuthContext.jsx   # Google OAuth session
│   │   └── main.jsx
│   ├── .env.example
│   └── package.json
│
├── backend/
│   ├── orchestrator.py           # FastAPI app — MCP client + Anthropic API
│   ├── server.py                 # FastMCP server — tools exposed via MCP
│   ├── tools/
│   │   ├── active/               # nmap, nikto, gobuster, hydra, metasploit
│   │   └── passive/              # shodan, whatweb, whois, dig, nvd
│   ├── .env.example
│   └── requirements.txt
│
├── CLAUDE.md                     # Claude Code project context
└── README.md
```

---

## Setup

### Prerequisites
- Node.js 18+
- Python 3.11+
- Kali Linux or Ubuntu (backend must run on Linux)

Install security tools:
```bash
sudo apt install nmap nikto gobuster hydra whatweb metasploit-framework
```

### 1. Clone
```bash
git clone https://github.com/samaypatel27/pentest-mcp.git
cd pentest-mcp
```

### 2. Backend
```bash
cd backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
```

Fill in `.env`:
```
ANTHROPIC_API_KEY=sk-ant-...
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
SHODAN_API_KEY=your-shodan-key
NVD_API_KEY=your-nvd-key
```

### 3. Frontend
```bash
cd ../frontend
npm install
cp .env.example .env
```

Fill in `.env`:
```
VITE_BACKEND_URL=http://localhost:5000
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

---

## Running

Two terminals required. Backend must run on Linux.

**Terminal 1 — Backend:**
```bash
cd backend
source venv/bin/activate
uvicorn orchestrator:app --host 127.0.0.1 --port 5000 --reload
```

**Terminal 2 — Frontend:**
```bash
cd frontend
npm run dev
```

App runs at `http://localhost:5173`

---

## Deployment

| Layer | Platform |
|---|---|
| Frontend | Vercel — `vercel --prod` from `/frontend` |
| Backend | Linux VPS (DigitalOcean, Linode) with security tools installed |
| Database | Supabase (PostgreSQL + Google OAuth) |

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 19, Vite, Tailwind CSS, Framer Motion |
| Backend | Python, FastAPI, FastMCP |
| AI | Anthropic Claude (via MCP) |
| Protocol | Model Context Protocol (MCP) |
| Database | Supabase — PostgreSQL |
| Auth | Google OAuth via Supabase |
| Security Tools | nmap, Nikto, Gobuster, Hydra, Metasploit, WhatWeb, SearchSploit, Shodan, NVD API |

---

## Troubleshooting

| Problem | Fix |
|---|---|
| `ANTHROPIC_API_KEY is not set` | Fill in `backend/.env` |
| `Network error` on scan | Backend not running or `VITE_BACKEND_URL` is wrong |
| `ModuleNotFoundError: No module named 'mcp'` | Run `pip install -r requirements.txt` inside venv |
| Security tools not found | Run `sudo apt install nmap nikto gobuster hydra` |
| CORS error in browser | Confirm backend is running and CORS origins include frontend URL |
| `Credit balance too low` | Add credits at console.anthropic.com/billing |

---

## Authors

Built at HackOHI/O 2026 — The Ohio State University
