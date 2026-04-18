"""
orchestrator.py — FastAPI app that acts as both HTTP server and MCP client.

Endpoints:
    GET  /health   → liveness probe
    POST /scan     → starts a scan, streams SSE progress events, ends with report

Run:
    uvicorn orchestrator:app --host 127.0.0.1 --port 5000 --reload

Environment:
    ANTHROPIC_API_KEY  — required
    ANTHROPIC_MODEL    — default: claude-sonnet-4-6
    PORT               — default: 5000
"""

import json
import os
import sys

from anthropic import Anthropic
from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from mcp import ClientSession, StdioServerParameters
from mcp.client.stdio import stdio_client
from pydantic import BaseModel
from sse_starlette.sse import EventSourceResponse

load_dotenv()

ANTHROPIC_API_KEY = os.environ.get("ANTHROPIC_API_KEY")
MODEL = os.environ.get("ANTHROPIC_MODEL", "claude-sonnet-4-6")
PORT = int(os.environ.get("PORT", "5000"))

if not ANTHROPIC_API_KEY:
    print(
        "ANTHROPIC_API_KEY is not set. Copy backend/.env.example to backend/.env and fill it in.",
        file=sys.stderr,
    )


# ── App setup ────────────────────────────────────────────────────────────────

app = FastAPI(title="ClaudeHack Orchestrator")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# The Anthropic client is what we use to talk to Claude (the AI brain).
# It's created once at startup and reused for every scan request.
anthropic_client = Anthropic(api_key=ANTHROPIC_API_KEY) if ANTHROPIC_API_KEY else None


# ── Request schema ───────────────────────────────────────────────────────────

# ScanRequest defines the exact shape of JSON the frontend must send to POST /scan.
# Pydantic validates this automatically — if a required field is missing or the
# wrong type, FastAPI returns a 422 error before our code even runs.
class ScanRequest(BaseModel):
    target: str                        # domain or IP to scan
    level: str                         # "passive" | "active"
    scan_type: str = "simple"          # "simple" | "aggressive" (only relevant for active)
    authorization_confirmed: bool = False


# ── Tool name sets ───────────────────────────────────────────────────────────

# These sets control which tools Claude is allowed to see.
# If a tool name isn't in the right set, Claude never receives its schema
# and physically cannot call it — this is the hard authorization gate.

# Tools that touch the target directly — require authorization_confirmed = True
ACTIVE_TOOL_NAMES = {
    "nmap_basic", "nmap_full",
    "nikto", "ffuf",
    "hydra_db", "hydra_ftp",
    "ssh_check", "telnet_check",
    "eternalblue", "searchsploit",
    "nvd_lookup",
}

# Tools that only run in aggressive mode (a subset of active tools)
AGGRESSIVE_TOOL_NAMES = {
    "nmap_full",    # scans all 65535 ports instead of top 1000
    "ffuf",         # directory brute-force (very noisy, many requests)
    "eternalblue",  # SMB exploit check
}


# ── MCP helpers ──────────────────────────────────────────────────────────────

# StdioServerParameters tells the MCP client how to launch server.py as a
# subprocess. "stdio" means they communicate through stdin/stdout — server.py
# reads requests from stdin and writes responses to stdout.
PROMPTS_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "prompts")

def _load_prompt(level: str, scan_type: str, target: str) -> str:
    if level == "passive":
        filename = "passive.md"
    elif scan_type == "aggressive":
        filename = "active_aggressive.md"
    else:
        filename = "active_simple.md"

    path = os.path.join(PROMPTS_DIR, filename)
    with open(path) as f:
        return f.read().replace("{target}", target)


MCP_SERVER_PARAMS = StdioServerParameters(
    command="python",
    args=["server.py"],
    cwd=os.path.dirname(os.path.abspath(__file__)),
)


def _mcp_tool_to_anthropic(tool) -> dict:
    # The Anthropic API expects tools in a specific JSON shape. MCP tools have
    # a slightly different shape, so this converts between the two formats.
    return {
        "name": tool.name,
        "description": tool.description or "",
        "input_schema": tool.inputSchema if tool.inputSchema else {"type": "object", "properties": {}},
    }


async def _get_filtered_tools(
    session: ClientSession,
    level: str,
    scan_type: str,
    authorized: bool,
) -> list[dict]:
    # Ask the MCP server for every tool it knows about.
    # `session` is the live connection to server.py — calling list_tools()
    # sends a request over stdio and gets back all @mcp.tool() registrations.
    result = await session.list_tools()

    filtered = []
    for tool in result.tools:
        is_active = tool.name in ACTIVE_TOOL_NAMES
        is_aggressive = tool.name in AGGRESSIVE_TOOL_NAMES

        # Rule 1: passive scan — strip all active tools regardless of auth
        if level == "passive" and is_active:
            continue

        # Rule 2: active scan without authorization — strip all active tools
        if level == "active" and is_active and not authorized:
            continue

        # Rule 3: active simple scan — strip aggressive-only tools
        if level == "active" and is_aggressive and scan_type == "simple":
            continue

        filtered.append(_mcp_tool_to_anthropic(tool))

    return filtered


# ── Endpoints ────────────────────────────────────────────────────────────────

@app.get("/health")
async def health():
    return {"status": "ok", "model": MODEL, "key_loaded": bool(ANTHROPIC_API_KEY)}


@app.post("/scan")
async def scan(req: ScanRequest):
    if not anthropic_client:
        raise HTTPException(status_code=500, detail="Server missing ANTHROPIC_API_KEY")

    if req.level == "active" and not req.authorization_confirmed:
        raise HTTPException(status_code=403, detail="Authorization required for active scanning")

    # event_stream is a Python async generator — it yields SSE events one by
    # one as the scan progresses. EventSourceResponse wraps it and handles
    # the SSE wire format so the frontend receives a live stream.
    async def event_stream():
        def emit(type: str, message: str):
            return {"data": json.dumps({"type": type, "message": message})}

        yield emit("status", "Connecting to tool engine...")

        # stdio_client launches server.py as a subprocess and gives us two
        # streams: `read` (server → us) and `write` (us → server).
        # ClientSession wraps those streams with the MCP protocol.
        async with stdio_client(MCP_SERVER_PARAMS) as (read, write):
            async with ClientSession(read, write) as session:
                await session.initialize()

                yield emit("status", "Fetching available tools...")
                tools = await _get_filtered_tools(
                    session, req.level, req.scan_type, req.authorization_confirmed
                )
                tool_names = [t["name"] for t in tools]
                yield emit("status", f"Tools loaded: {', '.join(tool_names)}")

                system_prompt = _load_prompt(req.level, req.scan_type, req.target)

                messages = [
                    {"role": "user", "content": f"Begin {scan_description} scan of {req.target}."}
                ]

                # ── Tool-use loop ─────────────────────────────────────────
                # Each iteration: send conversation to Claude → Claude responds
                # with either tool calls or a final answer → if tool calls,
                # execute them via MCP and append results → repeat.
                while True:
                    response = anthropic_client.messages.create(
                        model=MODEL,
                        max_tokens=4096,
                        system=system_prompt,
                        tools=tools,
                        messages=messages,
                    )

                    # Stream any reasoning text Claude writes between tool calls
                    for block in response.content:
                        if block.type == "text" and block.text.strip():
                            yield emit("progress", block.text.strip())

                    # stop_reason == "end_turn" means Claude has no more tool
                    # calls — its final response is the vulnerability report
                    if response.stop_reason == "end_turn":
                        final_text = " ".join(
                            b.text for b in response.content if b.type == "text"
                        )
                        yield emit("report", final_text)
                        break

                    # stop_reason == "tool_use" means Claude wants to call tools.
                    # Execute each one against the MCP server and collect results.
                    tool_results = []
                    for block in response.content:
                        if block.type != "tool_use":
                            continue

                        yield emit("status", f"Running {block.name}...")

                        # session.call_tool sends the tool call to server.py
                        # and waits for the result. block.input is the dict of
                        # arguments Claude decided to pass to the tool.
                        mcp_result = await session.call_tool(block.name, arguments=block.input)
                        result_text = (
                            mcp_result.content[0].text
                            if mcp_result.content and hasattr(mcp_result.content[0], "text")
                            else str(mcp_result.content)
                        )

                        yield emit("status", f"{block.name} complete.")

                        # Anthropic requires tool results to reference the
                        # tool_use_id from Claude's request so it knows which
                        # result belongs to which call.
                        tool_results.append({
                            "type": "tool_result",
                            "tool_use_id": block.id,
                            "content": result_text,
                        })

                    # Append Claude's response and the tool results to the
                    # conversation history so Claude has full context next turn.
                    messages.append({"role": "assistant", "content": response.content})
                    messages.append({"role": "user", "content": tool_results})

    return EventSourceResponse(event_stream())
