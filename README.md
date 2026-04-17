# Pen Test MCP

A React chat UI talking to a Flask orchestrator that calls Claude, plus an MCP server exposing local Python tools to Claude Code.

---

## Project Structure

```
claudehack_2026/
├── .gitignore
├── README.md
│
├── frontend/                      ← React + Vite + Tailwind UI
│   ├── .env                       ← VITE_BACKEND_URL=http://localhost:5000
│   ├── .env.example
│   ├── package.json
│   └── src/
│       ├── App.jsx                ← Chat window
│       └── components/
│           └── WarningModal.jsx   ← "I agree" authorization popup
│
└── backend/
    ├── .env                       ← ANTHROPIC_API_KEY goes here (gitignored)
    ├── .env.example
    ├── requirements.txt           ← flask, flask-cors, anthropic, mcp, python-dotenv
    ├── orchestrator.py            ← Flask HTTP API bridging React ↔ Claude
    ├── server.py                  ← MCP server entry point (FastMCP)
    ├── tools/
    │   ├── active/                ← Tools that DO things
    │   │   └── example_command.py
    │   └── passive/               ← Tools that READ things
    │       └── example_reader.py
    ├── config/
    ├── logs/
    ├── reports/
    └── utils/
```

Two backend processes live side-by-side:

- `orchestrator.py` — a Flask server the React UI talks to over HTTP. It forwards user messages to the Anthropic API and streams replies back.
- `server.py` — an MCP server Claude Code launches as a subprocess over stdio. Used when you want Claude Code (the CLI) to call your local tools directly, independent of the web UI.

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
cp .env.example .env         # VITE_BACKEND_URL defaults to http://localhost:5000
```

---

## Running the App

You need two terminals.

**Terminal 1 — Flask orchestrator:**

```bash
cd backend
venv/bin/python orchestrator.py      # Mac / Linux
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

