# BlindSpot

Live Demo: https://blindspot-scan.vercel.app

BlindSpot is an automated web vulnerability scanner built for small businesses and startups who ship fast and skip security. Most professional penetration testing tools — nmap, Nikto, Gobuster, Hydra, Metasploit — are Linux-native binaries that require deep command-line expertise to operate. They are completely inaccessible to developers without a security background.

We built a custom Model Context Protocol (MCP) server that solves this directly. The MCP server exposes each Linux security binary as a callable tool. An AI reasoning layer connects to the MCP server, autonomously decides which tools to invoke based on scan output, and orchestrates the full pipeline — from port discovery to CVE correlation — without any manual terminal interaction. The result is a plain-english vulnerability report with a prioritized fix checklist, accessible to any developer or business owner regardless of security background.

---

ARCHITECTURE
============

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

The AI reasoning layer plays two roles:
1. Orchestrator — reads each tool's raw output and decides the next tool to invoke based on what was found
2. Report writer — synthesizes all findings into a structured vulnerability report scored 1-10 by severity

---

SCANNING PIPELINE
=================

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

---

FILE STRUCTURE
==============

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

---

SETUP
=====

Prerequisites:
- Node.js 18+
- Python 3.11+
- Kali Linux or Ubuntu (backend must run on Linux)
- Security tools installed

Install security tools:
  sudo apt install nmap nikto gobuster hydra whatweb metasploit-framework

1. Clone
--------
  git clone https://github.com/samaypatel27/pentest-mcp.git
  cd pentest-mcp

2. Backend
----------
  cd backend
  python3 -m venv venv
  source venv/bin/activate
  pip install -r requirements.txt
  cp .env.example .env

Fill in .env:
  ANTHROPIC_API_KEY=sk-ant-...
  SUPABASE_URL=https://your-project.supabase.co
  SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
  SHODAN_API_KEY=your-shodan-key
  NVD_API_KEY=your-nvd-key

3. Frontend
-----------
  cd ../frontend
  npm install
  cp .env.example .env

Fill in .env:
  VITE_BACKEND_URL=http://localhost:5000
  VITE_SUPABASE_URL=https://your-project.supabase.co
  VITE_SUPABASE_ANON_KEY=your-anon-key

---

RUNNING
=======

Two terminals required. Backend must run on Linux.

Terminal 1 — Backend:
  cd backend
  source venv/bin/activate
  uvicorn orchestrator:app --host 127.0.0.1 --port 5000 --reload

Terminal 2 — Frontend:
  cd frontend
  npm run dev

App runs at http://localhost:5173

---

DEPLOYMENT
==========

Frontend  — Vercel (vercel --prod from /frontend)
Backend   — Linux VPS (DigitalOcean, Linode) with security tools installed
Database  — Supabase (PostgreSQL + Google OAuth)

---

TECH STACK
==========

Layer           Technology
-----------     --------------------------------------------------
Frontend        React 19, Vite, Tailwind CSS, Framer Motion
Backend         Python, FastAPI, FastMCP
AI              Anthropic Claude (via MCP)
Protocol        Model Context Protocol (MCP)
Database        Supabase — PostgreSQL
Auth            Google OAuth via Supabase
Security Tools  nmap, Nikto, Gobuster, Hydra, Metasploit,
                WhatWeb, SearchSploit, Shodan, NVD API

---

TROUBLESHOOTING
===============

Problem                                     Fix
-----------------------------------------   ----------------------------------------
ANTHROPIC_API_KEY is not set                Fill in backend/.env
Network error on scan                       Backend not running or VITE_BACKEND_URL wrong
ModuleNotFoundError: No module named 'mcp'  Run pip install -r requirements.txt in venv
Security tools not found                    sudo apt install nmap nikto gobuster hydra
CORS error in browser                       Confirm backend running and CORS origins set
Credit balance too low                      Add credits at console.anthropic.com/billing

---

AUTHORS
=======

Built at HackOHI/O 2026 — The Ohio State University
