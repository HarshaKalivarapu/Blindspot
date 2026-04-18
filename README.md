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

---

## Setup (First Time)

### 1. Clone

```bash
git clone <repo-url>
cd claudehack_2026
```

### 2. Backend — Python venv + deps

```bash
cd backend
python3 -m venv venv

# Mac / Linux
venv/bin/pip install -r requirements.txt
```

Copy the env template and fill in your key:

```bash
cp .env.example .env
# then edit .env and set ANTHROPIC_API_KEY=sk-ant-...
```

### 3. Frontend — Node deps

```bash
cd ../frontend
npm install
cp .env.example .env # VITE_BACKEND_URL defaults to http://localhost:5000
```

---

## Running the App

You need two terminals.

**Terminal 1 — Flask orchestrator:**

```bash
cd backend
venv/bin/python orchestrator.py # Mac / Linux
```

Listens on `http://localhost:5000`. Hit `/health` to confirm the key is loaded.

**Terminal 2 — React UI:**

```bash
cd frontend
npm run dev
```

Opens the Vite dev server (default `http://localhost:5173`). Accept the authorization modal, then send a message — it hits `POST /chat` on the orchestrator, which calls Claude and returns the reply.

---

## MCP Server (optional)

`server.py` is a separate entry point for [Claude Code](https://claude.com/claude-code). It exposes the tools under `backend/tools/` over the Model Context Protocol so Claude Code can call them directly from the terminal.

### Test the server runs

```bash

# Mac / Linux
venv/bin/python server.py
```

You should see `MCP server starting...` on stderr, then it waits for JSON-RPC over stdin. Press `Ctrl+C` to stop. Claude Code manages this process automatically once registered.

### Register with Claude Code

Claude Code reads `.mcp.json` from the project root.

**Mac / Linux `.mcp.json`:**
```json
{
"mcpServers": {
"claudehack": {
"command": "$(pwd)/backend/venv/bin/python",
"args": ["$(pwd)/backend/server.py"],
"cwd": "$(pwd)/backend"
}
}
}
```

### Register the MCP server
```bash

claude mcp add claudehack "$(pwd)/backend/venv/bin/python" -- "$(pwd)/backend/server.py"
```

Replace paths with the absolute location of your clone. Verify with `claude mcp list`.

### Adding tools

Active tool (does something) — create `backend/tools/active/my_tool.py`:

```python
from typing import Any

TOOL_NAME = "my_tool"
TOOL_DESCRIPTION = "Does something useful."

def run(params: dict[str, Any]) -> dict[str, Any]:
return {"result": "did the thing"}
```

Register it in `backend/server.py`:

```python
from tools.active.my_tool import run as my_tool_run

@mcp.tool()
def my_tool(input: str) -> str:
"""Describe what your tool does — Claude reads this docstring."""
return my_tool_run({"input": input})["result"]
```

Restart Claude Code and the tool is live. Passive tools follow the same pattern under `backend/tools/passive/`.

---

## Troubleshooting

| Problem | Fix |
|---|---|
| `ANTHROPIC_API_KEY is not set` on orchestrator start | Copy `backend/.env.example` → `backend/.env` and fill in your key |
| React shows `Network error` when sending | Orchestrator isn't running or `VITE_BACKEND_URL` is wrong |
| CORS error in browser console | Confirm `flask-cors` installed and orchestrator restarted |
| `ModuleNotFoundError: No module named 'mcp'` | `venv\Scripts\pip install -r requirements.txt` |
| `claudehack` missing from `claude mcp list` | Check `.mcp.json` paths are absolute and correctly escaped |
| `ImportError` on MCP server startup | `cwd` in `.mcp.json` must point to `backend/` |

---

## Key Concepts

- **Orchestrator (Flask)** — HTTP bridge between the React UI and the Anthropic API. The UI never holds the API key.
- **MCP (Model Context Protocol)** — open standard that lets Claude Code call local Python tools.
- **FastMCP** — Python library for building MCP servers.
- **Active tools** — mutate state (run commands, write files).
- **Passive tools** — read-only observers/queries.

## Note: Backend must be run on linux