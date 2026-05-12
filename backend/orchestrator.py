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
from datetime import datetime, timezone
import json
import os
import sys
import time

from anthropic import Anthropic, AsyncAnthropic
from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from mcp import ClientSession, StdioServerParameters
from mcp.client.stdio import stdio_client
from pydantic import BaseModel
from sse_starlette.sse import EventSourceResponse
from supabase import create_client as create_supabase_client

load_dotenv()

ANTHROPIC_API_KEY = os.environ.get("ANTHROPIC_API_KEY")
MODEL = os.environ.get("ANTHROPIC_MODEL", "claude-sonnet-4-6")
SUPABASE_URL = (os.environ.get("SUPABASE_URL") or "").strip() or None
SUPABASE_SERVICE_ROLE_KEY = (os.environ.get("SUPABASE_SERVICE_ROLE_KEY") or "").strip() or None

SEARCH_STRIP_PREFIXES = ["https://", "http://", "www."]

def clean_search_query(raw: str) -> tuple[str, str]:
    """Returns (cleaned_query, cleaned_query_without_dots)."""
    q = raw.strip().lower()
    for prefix in SEARCH_STRIP_PREFIXES:
        if q.startswith(prefix):
            q = q[len(prefix):]
            break
    slash_idx = q.find("/")
    if slash_idx != -1:
        q = q[:slash_idx]
    query_idx = q.find("?")
    if query_idx != -1:
        q = q[:query_idx]
    q_nodots = q.replace(".", "")
    return q, q_nodots

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
async_anthropic_client = AsyncAnthropic(api_key=ANTHROPIC_API_KEY) if ANTHROPIC_API_KEY else None
supabase_client = (
    create_supabase_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
    if SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY
    else None
)


# ── Request schema ───────────────────────────────────────────────────────────

class ScanRequest(BaseModel):
    target: str
    level: str                         # "passive" | "active"
    intensity: str = "simple"          # "simple" | "aggressive"
    authorization_confirmed: bool = False
    user_id: str | None = None
    scan_id: str | None = None         # pre-generated UUID from frontend


# ── Tool name sets ───────────────────────────────────────────────────────────

ACTIVE_TOOL_NAMES = {
    "nmap",
    "nikto",
    "ffuf",
    "hydra",
    "whatweb_active",
    "searchsploit",
}

AGGRESSIVE_TOOL_NAMES = {
    "ffuf",
}


# ── MCP helpers ──────────────────────────────────────────────────────────────

PROMPTS_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "prompts")


def _load_prompt(level: str, intensity: str, target: str) -> str:
    if level == "passive":
        filename = "passive.md"
    elif intensity == "aggressive":
        filename = "active_aggressive.md"
    else:
        filename = "active_simple.md"
    path = os.path.join(PROMPTS_DIR, filename)
    with open(path) as f:
        return f.read().replace("{target}", target)


_here = os.path.dirname(os.path.abspath(__file__))
_venv_python = os.path.join(_here, "venv", "bin", "python")
_python = _venv_python if os.path.exists(_venv_python) else sys.executable

MCP_SERVER_PARAMS = StdioServerParameters(
    command=_python,
    args=["server.py"],
    cwd=_here,
)


def _mcp_tool_to_anthropic(tool) -> dict:
    return {
        "name": tool.name,
        "description": tool.description or "",
        "input_schema": tool.inputSchema if tool.inputSchema else {"type": "object", "properties": {}},
    }


async def _get_filtered_tools(session: ClientSession, level: str, intensity: str, authorized: bool) -> list[dict]:
    result = await session.list_tools()
    filtered = []
    for tool in result.tools:
        is_active = tool.name in ACTIVE_TOOL_NAMES
        is_aggressive = tool.name in AGGRESSIVE_TOOL_NAMES
        if level == "passive" and is_active:
            continue
        if level == "active" and is_active and not authorized:
            continue
        if level == "active" and is_aggressive and intensity == "simple":
            continue
        filtered.append(_mcp_tool_to_anthropic(tool))
    return filtered


# ── Report generation helpers ─────────────────────────────────────────────────

def _clean_json_text(text: str) -> str:
    """Strip markdown fences from a Claude JSON response."""
    text = text.strip()
    if text.startswith("```"):
        first_newline = text.find("\n")
        text = text[first_newline + 1:] if first_newline != -1 else text
        text = text.rsplit("```", 1)[0].strip()
    return text


_EXTRACTION_SYSTEM = (
    "You are a security data extractor. Given raw penetration test tool outputs in a "
    "conversation, extract all findings into a compact structured JSON object. "
    "Be precise — only report what the tools actually found. Never invent data."
)

_EXTRACTION_TEMPLATE = """\
The conversation above contains raw output from a {scan_type} security scan of `{target}`.

Extract all key findings into the JSON structure below. Use ONLY what the tools actually \
reported — do not invent data. Omit fields that don't apply (null or empty array).

{{
  "target": "{target}",
  "scan_date": "<ISO 8601 UTC datetime>",
  "scan_type": "{scan_type}",
  "scan_mode": {scan_mode_json},
  "duration_seconds": {duration},
  "tools_run": ["<names of tools that completed>"],
  "tool_errors": ["<tool: error description>"],
  "open_ports": [<port integers>],
  "services": {{
    "<port>": {{"name": "<service>", "version": "<full version string or null>"}}
  }},
  "tech_stack": ["<Name Version>"],
  "cves": [
    {{
      "id": "<CVE-XXXX-XXXX>",
      "cvss": <0.0-10.0>,
      "affected_software": "<Name Version>",
      "description": "<one concise sentence>",
      "has_exploit": <true|false>,
      "exploit_sources": ["ExploitDB", "Metasploit"]
    }}
  ],
  "ssl": {{
    "valid": <true|false|null>,
    "expiry_date": "<YYYY-MM-DD or null>",
    "days_until_expiry": <integer or null>,
    "issues": ["<specific issue>"]
  }},
  "http_headers": {{
    "missing_security_headers": ["<header name>"],
    "info_disclosure": ["<Header: value>"]
  }},
  "dns_whois": {{
    "registrar": "<string or null>",
    "expiry_date": "<YYYY-MM-DD or null>",
    "days_until_expiry": <integer or null>,
    "nameservers": ["<ns>"],
    "subdomains_found": ["<fqdn>"]
  }},
  "shodan": {{
    "country": "<string or null>",
    "isp": "<string or null>",
    "ports_indexed": [<port integers>],
    "previously_flagged_cves": ["<CVE-ID>"]
  }},
  "nikto_findings": ["<concise finding>"],
  "hydra_results": {{
    "service": "<service or null>",
    "credentials_found": [{{"username": "<>", "password": "<>"}}]
  }},
  "ffuf_findings": ["<discovered path>"],
  "searchsploit_results": [
    {{"query": "<>", "exploits": [{{"title": "<>", "path": "<>"}}]}}
  ],
  "confirmed_exploits_count": <integer>,
  "total_issues_count": <integer>
}}

Return ONLY the JSON object. No preamble, no markdown fences, no trailing text."""


async def _extract_findings(
    scan_messages: list,
    target: str,
    scan_type: str,
    scan_mode: str,
    duration_seconds: float,
) -> str:
    """Distill raw tool outputs into a compact findings JSON. Returns the JSON string."""
    prompt = _EXTRACTION_TEMPLATE.format(
        target=target,
        scan_type=scan_type,
        scan_mode_json=json.dumps(scan_mode),
        duration=round(duration_seconds, 1),
    )
    messages = scan_messages + [{"role": "user", "content": prompt}]
    response = await async_anthropic_client.messages.create(
        model=MODEL,
        max_tokens=2048,
        system=_EXTRACTION_SYSTEM,
        messages=messages,
    )
    text = "".join(b.text for b in response.content if b.type == "text")
    return _clean_json_text(text)


async def _stream_report(mode: str, extraction_json: str, schema: str, queue: asyncio.Queue):
    """Stream a full report using compact extraction as context. Posts to queue as (mode, kind, data)."""
    mode_label = "developer" if mode == "dev" else "non-developer"
    user_msg = (
        f"Here are all security findings from the scan in a compact structured format:\n\n"
        f"```json\n{extraction_json}\n```\n\n"
        f"Generate the complete {mode_label} vulnerability report following your schema exactly. "
        f"Return ONLY the complete JSON report object. No preamble, no markdown fences, no trailing text."
    )

    # ── Debug: dump exact Claude input to file ────────────────────────────────
    debug_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), f"debug_report_input_{mode}.md")
    with open(debug_path, "w") as dbf:
        dbf.write(f"# Report input debug — mode: {mode}\n\n")
        dbf.write(f"## Model\n{MODEL}\n\n")
        dbf.write(f"## System prompt (schema)\n\n```\n{schema}\n```\n\n")
        dbf.write(f"## User message\n\n```\n{user_msg}\n```\n")
    print(f"[{mode}/report] debug input written to {debug_path}", file=sys.stderr)
    # ─────────────────────────────────────────────────────────────────────────

    full_text = ""
    continuation_messages = [{"role": "user", "content": user_msg}]
    try:
        while True:
            async with async_anthropic_client.messages.stream(
                model=MODEL,
                max_tokens=8192,
                system=schema,
                messages=continuation_messages,
            ) as stream:
                async for chunk in stream.text_stream:
                    full_text += chunk
                    await queue.put((mode, "chunk", chunk))
                final = await stream.get_final_message()

            if final.stop_reason != "max_tokens":
                break

            print(f"[{mode}/report] truncated at {len(full_text)} chars, continuing...", file=sys.stderr)
            continuation_messages.append({"role": "assistant", "content": [{"type": "text", "text": full_text}]})
            continuation_messages.append({"role": "user", "content": "Continue from exactly where you left off. Output ONLY the continuation — no repetition, no preamble."})

        cleaned = _clean_json_text(full_text)
        json.loads(cleaned)  # validate — raises if malformed
        await queue.put((mode, "done", cleaned))
    except Exception as e:
        print(f"[{mode}/report] failed: {e}", file=sys.stderr)
        await queue.put((mode, "done", None))


# ── Endpoints ────────────────────────────────────────────────────────────────

@app.get("/health")
async def health():
    return {"status": "ok", "model": MODEL, "key_loaded": bool(ANTHROPIC_API_KEY)}


@app.get("/scans/search")
async def search_scans(q: str, user_id: str):
    if not supabase_client:
        raise HTTPException(status_code=500, detail="Supabase not configured")
    if not q or not user_id:
        return []
    q_clean, q_nodots = clean_search_query(q)
    if not q_clean:
        return []
    try:
        result = supabase_client.rpc(
            "search_user_scans",
            {"p_user_id": user_id, "p_query": q_clean, "p_query_nodots": q_nodots},
        ).execute()
        return result.data or []
    except Exception:
        return []


@app.post("/scan")
async def scan(req: ScanRequest):
    if not anthropic_client:
        raise HTTPException(status_code=500, detail="Server missing ANTHROPIC_API_KEY")
    if req.level == "active" and not req.authorization_confirmed:
        raise HTTPException(status_code=403, detail="Authorization required for active scanning")

    async def event_stream():
        def emit(type: str, message: str):
            return {"data": json.dumps({"type": type, "message": message})}

        scan_start_time = time.time()
        yield emit("status", "Connecting to tool engine...")

        async with stdio_client(MCP_SERVER_PARAMS) as (read, write):
            async with ClientSession(read, write) as session:
                await session.initialize()

                yield emit("status", "Fetching available tools...")
                tools = await _get_filtered_tools(
                    session, req.level, req.intensity, req.authorization_confirmed
                )
                tool_names = [t["name"] for t in tools]
                yield emit("status", f"Tools loaded: {', '.join(tool_names)}")

                system_prompt = _load_prompt(req.level, req.intensity, req.target)
                messages = [{"role": "user", "content": f"Begin {req.level} scan of {req.target}."}]

                # ── Tool-use loop ─────────────────────────────────────────
                while True:
                    response = await asyncio.to_thread(
                        anthropic_client.messages.create,
                        model=MODEL,
                        max_tokens=4096,
                        system=system_prompt,
                        tools=tools,
                        messages=messages,
                    )

                    for block in response.content:
                        if block.type == "text" and block.text.strip():
                            yield emit("progress", block.text.strip())

                    if response.stop_reason == "end_turn":
                        # ── Step 1: Extract compact findings from raw outputs ──
                        messages.append({"role": "assistant", "content": response.content})
                        yield emit("status", "Analyzing findings...")
                        try:
                            extraction_json = await _extract_findings(
                                messages,
                                req.target,
                                req.level,
                                req.intensity,
                                time.time() - scan_start_time,
                            )
                        except Exception as e:
                            print(f"Extraction failed: {e}", file=sys.stderr)
                            extraction_json = "{}"

                        # ── Step 2: Stream both reports in parallel from compact data ──
                        yield emit("status", "Generating reports...")

                        with open(os.path.join(PROMPTS_DIR, "Developer-Report.md")) as f:
                            dev_schema = f.read()
                        with open(os.path.join(PROMPTS_DIR, "Non-Developer-Report.md")) as f:
                            nondev_schema = f.read()

                        q: asyncio.Queue = asyncio.Queue()
                        report_tasks = [
                            asyncio.create_task(
                                _stream_report("dev", extraction_json, dev_schema, q)
                            ),
                            asyncio.create_task(
                                _stream_report("nondev", extraction_json, nondev_schema, q)
                            ),
                        ]

                        assembled = {}
                        done_count = 0
                        while done_count < 2:
                            mode, kind, data = await q.get()
                            if kind == "chunk":
                                yield emit(f"report_{mode}_chunk", data)
                            else:
                                if data:
                                    yield emit(f"report_{mode}", data)
                                    assembled[mode] = data
                                done_count += 1

                        await asyncio.gather(*report_tasks)

                        if supabase_client and req.user_id and "dev" in assembled and "nondev" in assembled:
                            try:
                                ext = json.loads(extraction_json)
                                cves = ext.get("cves") or []

                                def _cvss_bucket(cvss):
                                    if cvss >= 9.0: return "critical"
                                    if cvss >= 7.0: return "high"
                                    if cvss >= 4.0: return "medium"
                                    return "low"

                                counts = {"critical": 0, "high": 0, "medium": 0, "low": 0}
                                for c in cves:
                                    counts[_cvss_bucket(c.get("cvss") or 0)] += 1

                                insert_row = {
                                    "user_id": req.user_id,
                                    "target": ext.get("target"),
                                    "scan_date": datetime.now(timezone.utc).isoformat(),
                                    "scan_type": ext.get("scan_type"),
                                    "scan_mode": ext.get("scan_mode"),
                                    "duration_seconds": ext.get("duration_seconds"),
                                    "tools_run": ext.get("tools_run") or [],
                                    "total_issues_count": ext.get("total_issues_count") or 0,
                                    "confirmed_exploits_count": ext.get("confirmed_exploits_count") or 0,
                                    "cve_critical_count": counts["critical"],
                                    "cve_high_count": counts["high"],
                                    "cve_medium_count": counts["medium"],
                                    "cve_low_count": counts["low"],
                                    "report_dev": json.loads(assembled["dev"]),
                                    "report_nondev": json.loads(assembled["nondev"]),
                                    "extraction_json": ext,
                                }
                                nondev_parsed = json.loads(assembled["nondev"])
                                insert_row["score"] = nondev_parsed.get("meta", {}).get("score")
                                if req.scan_id:
                                    insert_row["id"] = req.scan_id
                                supabase_client.table("scans").insert(insert_row).execute()
                                print("[supabase] scan saved", file=sys.stderr)
                            except Exception as e:
                                print(f"[supabase] insert failed: {e}", file=sys.stderr)

                        break

                    # ── Execute all tool calls concurrently ───────────────
                    tool_blocks = [b for b in response.content if b.type == "tool_use"]

                    for block in tool_blocks:
                        yield emit("status", f"Running {block.name}...")

                    async def _call(block):
                        r = await session.call_tool(block.name, arguments=block.input)
                        return block, r

                    pairs = await asyncio.gather(*[_call(b) for b in tool_blocks])

                    tool_results = []
                    for block, mcp_result in pairs:
                        result_text = (
                            mcp_result.content[0].text
                            if mcp_result.content and hasattr(mcp_result.content[0], "text")
                            else str(mcp_result.content)
                        )
                        yield emit("status", f"{block.name} complete.")
                        tool_results.append({
                            "type": "tool_result",
                            "tool_use_id": block.id,
                            "content": result_text,
                        })

                    messages.append({"role": "assistant", "content": response.content})
                    messages.append({"role": "user", "content": tool_results})

    return EventSourceResponse(event_stream())
