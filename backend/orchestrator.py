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

import asyncio
import json
import os
import sys

from anthropic import Anthropic
from contextlib import asynccontextmanager
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

anthropic_client = Anthropic(api_key=ANTHROPIC_API_KEY) if ANTHROPIC_API_KEY else None


# ── Request schema ───────────────────────────────────────────────────────────

class ScanRequest(BaseModel):
    target: str
    level: str                        # "passive" | "active" | "full"
    authorization_confirmed: bool = False


# ── MCP helpers ──────────────────────────────────────────────────────────────

MCP_SERVER_PARAMS = StdioServerParameters(
    command="python",
    args=["server.py"],
    cwd=os.path.dirname(os.path.abspath(__file__)),
)

ACTIVE_TOOL_NAMES = {"nmap", "nikto", "gobuster", "ffuf", "hydra", "metasploit"}


def _mcp_tool_to_anthropic(tool) -> dict:
    """Convert an MCP tool definition to the schema Anthropic's API expects."""
    return {
        "name": tool.name,
        "description": tool.description or "",
        "input_schema": tool.inputSchema if tool.inputSchema else {"type": "object", "properties": {}},
    }


async def _get_filtered_tools(session: ClientSession, level: str, authorized: bool) -> list[dict]:
    """
    Fetch tools from the MCP server and filter by scan level + authorization.
    Active tools are physically withheld if authorization_confirmed is False.
    """
    result = await session.list_tools()
    tools = result.tools

    filtered = []
    for t in tools:
        is_active = t.name in ACTIVE_TOOL_NAMES
        if is_active and not authorized:
            continue
        if level == "passive" and is_active:
            continue
        filtered.append(_mcp_tool_to_anthropic(t))

    return filtered


# ── Endpoints ────────────────────────────────────────────────────────────────

@app.get("/health")
async def health():
    return {"status": "ok", "model": MODEL, "key_loaded": bool(ANTHROPIC_API_KEY)}


@app.post("/scan")
async def scan(req: ScanRequest):
    if not anthropic_client:
        raise HTTPException(status_code=500, detail="Server missing ANTHROPIC_API_KEY")

    if req.level in ("active", "full") and not req.authorization_confirmed:
        raise HTTPException(status_code=403, detail="Authorization required for active scanning")

    async def event_stream():
        yield {"data": json.dumps({"type": "status", "message": "Connecting to tool engine..."})}

        async with stdio_client(MCP_SERVER_PARAMS) as (read, write):
            async with ClientSession(read, write) as session:
                await session.initialize()

                yield {"data": json.dumps({"type": "status", "message": "Fetching available tools..."})}
                tools = await _get_filtered_tools(session, req.level, req.authorization_confirmed)
                tool_names = [t["name"] for t in tools]
                yield {"data": json.dumps({"type": "status", "message": f"Tools available: {', '.join(tool_names)}"})}

                system_prompt = (
                    f"You are a security scanner. The user has requested a {req.level} scan "
                    f"of the target: {req.target}. "
                    "Use the available tools methodically. After all results are gathered, "
                    "write a detailed vulnerability report summarizing every finding."
                )

                messages = [{"role": "user", "content": f"Begin {req.level} scan of {req.target}."}]

                # Tool-use loop
                while True:
                    response = anthropic_client.messages.create(
                        model=MODEL,
                        max_tokens=4096,
                        system=system_prompt,
                        tools=tools,
                        messages=messages,
                    )

                    # Collect any text output from this turn
                    for block in response.content:
                        if block.type == "text" and block.text.strip():
                            yield {"data": json.dumps({"type": "progress", "message": block.text.strip()})}

                    # Done — no more tool calls
                    if response.stop_reason == "end_turn":
                        final_text = " ".join(
                            b.text for b in response.content if b.type == "text"
                        )
                        yield {"data": json.dumps({"type": "report", "message": final_text})}
                        break

                    # Execute each tool Claude requested
                    tool_results = []
                    for block in response.content:
                        if block.type != "tool_use":
                            continue

                        yield {"data": json.dumps({"type": "status", "message": f"Running {block.name}..."})}

                        mcp_result = await session.call_tool(block.name, arguments=block.input)
                        result_text = (
                            mcp_result.content[0].text
                            if mcp_result.content and hasattr(mcp_result.content[0], "text")
                            else str(mcp_result.content)
                        )

                        yield {"data": json.dumps({"type": "status", "message": f"{block.name} complete."})}

                        tool_results.append({
                            "type": "tool_result",
                            "tool_use_id": block.id,
                            "content": result_text,
                        })

                    # Feed results back into the conversation
                    messages.append({"role": "assistant", "content": response.content})
                    messages.append({"role": "user", "content": tool_results})

    return EventSourceResponse(event_stream())
