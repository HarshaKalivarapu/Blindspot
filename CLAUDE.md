
# CLAUDE.md

## Project Overview
A penetration testing web application for small businesses.
Scans a server for vulnerabilities and returns a plain english report.
Built for non-technical business owners with zero cybersecurity background.

## Target User
Small business owners — they built or hired someone to build their app.
They do not know what nmap or CVE means. Everything must be in plain english.

## Tech Stack
- Framework: React 19 + Vite 8
- Language: JavaScript (ESM) — no TypeScript
- Styling: Tailwind CSS v4 via @tailwindcss/vite plugin
- Animation: Framer Motion
- Routing: React Router v7 (BrowserRouter)
- Font: Mono font for terminal elements (e.g. JetBrains Mono or Fira Code)
        Clean sans-serif for all business-facing UI copy

## File Structure
pentest-mcp/
└── frontend/
    ├── index.html
    ├── vite.config.js
    ├── src/
    │   ├── main.jsx               # Entry point — BrowserRouter + Routes
    │   ├── index.css              # Tailwind import + global resets
    │   ├── pages/
    │   │   ├── Home.jsx           # Homepage — terminal intro + split screen
    │   │   ├── Scan.jsx           # Scan dashboard + chat interface
    │   │   ├── NewScan.jsx        # Scan configuration
    │   │   └── Guide.jsx          # Interactive User Guide
    │   ├── components/
    │   │   ├── intro/
    │   │   │   └── TerminalIntro.jsx  # Full screen terminal intro sequence
    │   │   ├── homepage/
    │   │   │   ├── ScanFeed.jsx         # Left panel — scrolling live scan feed
    │   │   │   ├── HeroPanel.jsx        # Right panel — app name + Get Started
    │   │   │   ├── ShaderBackground.jsx # GLSL shader background (Phase 2 only)
    │   │   │   └── AuthModal.jsx        # Unified signup/login popup overlay
    │   │   └── WarningModal.jsx   # Authorization confirmation modal
    │   └── lib/
    │       ├── scanFeedData.js    # Realistic pre-written scan output dataset
    │       ├── supabase.js        # Supabase client singleton — import from here only
    │       └── AuthContext.jsx    # Auth state provider + useAuth hook
    └── CLAUDE.md                  # This file — always refer here first

## Route Map
/ (src/pages/Home.jsx)            → Homepage (terminal intro + split screen)
/guide (src/pages/Guide.jsx)      → Full page interactive User Guide
/scan (src/pages/Scan.jsx)        → Scan dashboard + chat interface with backend
/scan/new (src/pages/NewScan.jsx) → Full page configuration form for generating scans

## Rules
- ALWAYS read CLAUDE.md before creating or modifying any file
- NEVER create files outside the structure above without updating CLAUDE.md
- All files must be .jsx and .js — no .tsx or .ts anywhere
- No hardcoded colors — Tailwind classes only (inline styles permitted for
  values not expressible as Tailwind classes, e.g. radial gradients)
- No made up statistics, fake CVE IDs, or invented data anywhere in the UI
- All CVE IDs used in scanFeedData.js must be real entries from the NVD database
- Mono font strictly for terminal/scan elements only
- Sans-serif strictly for all human-readable UI copy
- Framer Motion for every animation — no CSS keyframes

# claudehack_2026 — Project Context for Claude Code

This file is auto-loaded by every Claude Code session in this repo. It captures the project vision, architecture rules, and current state so any session starts with full context.

---

## What this project is

**A web vulnerability scanner for small businesses and startups.** Not a chat app. Not a general-purpose assistant.

Users open a web UI, select a scan level (passive recon, active recon, or full pipeline), provide a target, and confirm authorization. The backend then runs an orchestrated pipeline of pentest tools against the target and returns a detailed vulnerability report.

---

## The original vision (verbatim, from the user)

> Hey Claude, before we touch any more code, I want to clarify the exact vision and architecture for our hackathon project so we are on the same page.
>
> Here is the story and explanation of the product:
> "The point of this project is to essentially help smaller businesses and startups make sure their websites are safe from threats by checking if they have vulnerabilities (this was the part where we connected it to a story). To do this, we want to provide our user with a UI page where they can essentially select what level of checking they want and all those things. In the backend, based on what they select, we will do those checks. Which is why we have a passive and active reconnaiseance question, and then many other tools/commands that exist out there that we wanted to use. After we do all our checks, we would provide the user a detailed report on all the vulneraibilities we found and stuff."
>
> Here is how we were thinking about the architecture:
> "This is how it works. We thought we could use an MCP server so that we give all the tools to Claude for it to call whatever is needed based on the personalizations the user sleected, and infer based on the outputs, on what is the next tool in our overall process to call next."
>
> Because of this specific vision, it is really important to us that we stick to the MCP architecture. We want to keep the MCP server entirely separate from our web backend so it remains modular, scalable, and makes for a great pitch. I don't want to take the shortcut of natively wiring the Python tools directly inside FastAPI or Flask.
>
> Can we stick to this original plan? If so, help me figure out how we wire our FastAPI/Flask orchestrator to act as a client to our existing MCP server without ripping out the MCP setup.
>
> Don't write any code, jsut discussing

---

## Architecture

Three processes, one direction of data flow:

```
[ React + Vite + Tailwind frontend ]
              │
              │  HTTP (scan config, SSE for progress)
              ▼
[ Python orchestrator  =  MCP CLIENT  +  Anthropic API client ]
              │
              │  MCP protocol (stdio or streamable-http)
              ▼
[ FastMCP server  =  exposes pentest tools as MCP tools ]
              │
              │  subprocess / SDKs
              ▼
[ Kali pentest binaries: nmap, whatweb, nikto, gobuster, ffuf,
  hydra, john, metasploit, dig, whois, shodan, NVD lookups ]
```

Claude (via Anthropic API) plays **two roles** inside the orchestrator:
1. **Brain** — given the user's scan level, picks which MCP tools to call and in what order, reading each tool's output to decide the next step.
2. **Report writer** — once the pipeline finishes, synthesizes all findings into a human-readable vulnerability report.

---

## Pipeline flow

`workflow_visualization.html` is the visualization we made to see all the tools we want to implement — open it in a browser to see the full pipeline as a Mermaid diagram.

```
                          Start
                            │
              ┌─────────────┴─────────────┐
              ▼                           ▼
         PASSIVE recon              ACTIVE recon
         (no target contact)        (touches target)
              │                           │
   ┌──────────┼──────────┐                ▼
   ▼          ▼          ▼              NMAP
 Shodan   WhatWeb    DNS/WHOIS            │
                                          ├─► Gobuster / FFuF
                                          ├─► Nikto
                                          ├─► WhatWeb
                                          ├─► Metasploit
                                          ├─► Hydra ──► SSH ──► John
                                          │
              └──────────┬───────────────┘
                         ▼
                       NVD lookup (CVE correlation)
                         │
                         ▼
              Claude correlates + writes report
```

---

## Non-negotiables

### 1. MCP is the integration layer — never bypass it
The orchestrator talks to tools **only** through the MCP server. Do not import tool functions directly into the orchestrator. Do not use Anthropic's native tool-use to wrap the Python tool functions in-process. The MCP separation is core to the project's modularity story and the hackathon pitch.

If you're tempted to "simplify" by inlining a tool call, stop. Add it as an MCP tool in `backend/server.py` and have the orchestrator invoke it via the MCP client session.

### 2. Linux is the runtime
Most pipeline tools (whatweb, nikto, metasploit, hydra, msfconsole, gobuster, ffuf) are Kali-native. The backend runs on **WSL2 + Kali Linux**. The repo is cloned inside WSL at `~/vscodeprojects/ClaudeHack2026/` — **not** under `/mnt/c/...` or any OneDrive path (OneDrive sync corrupts venvs and Linux symlinks).

Frontend can run anywhere; backend must run in Linux.

### 3. Authorization gate is real
The frontend modal ("Active scanning is aggressive. Do you have legal authorization?") is not decorative. Active-tier tools (nmap, nikto, hydra, metasploit, etc.) must be filtered out of the tool list passed to Claude unless `authorization_confirmed = true` arrives in the scan request.

---

## Next implementation phase

1. **Annotate tools** — add `category: "passive" | "active"` metadata to each MCP tool in `server.py` so the orchestrator can filter them by scan level + authorization.
2. **Swap Flask → FastAPI** in `backend/requirements.txt` (add `fastapi`, `uvicorn[standard]`, `sse-starlette`).
3. **Rewrite `orchestrator.py`** as:
   - FastAPI app with `lifespan` hook that opens an MCP client session to `server.py` and calls `list_tools()` once.
   - `POST /scan` endpoint accepting `ScanRequest { target, level, scope, authorization_confirmed }`.
   - SSE response streaming progress events as Claude's tool-use loop runs.
   - Tool-use loop: pass filtered MCP tools (adapted to Anthropic schema) to Claude → on each `tool_use` block, call MCP server → feed result back → loop until Claude returns final report.
4. **Rebuild frontend** as a multi-step flow: scan config form → live progress (SSE) → final report view.
5. **For pitch demo**, optionally flip `server.py` transport from stdio to `streamable-http` so the MCP server can be shown as a standalone running service.

---

## Working with this project

- **Always run backend from inside WSL.** If a session is on Windows, flag it — the user should switch terminals.
- **Check `workflow_visualization.html`** before suggesting which tools belong in which scan level.
- **Don't propose in-process tool calls.** If MCP feels like overhead for a one-off, that's still the wrong instinct here.
- **Use `gh` CLI** for GitHub operations (already authenticated inside WSL).

