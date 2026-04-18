"""
server.py — MCP Server entry point
------------------------------------
Uses FastMCP to expose tools to any MCP-compatible client.

Run with:
    python backend/server.py

The server communicates over stdio (stdin/stdout), which is the standard
transport expected by MCP clients. Do NOT use print() here — write debug
output to stderr instead.
"""

import sys
from mcp.server.fastmcp import FastMCP

from tools.passive.shodan import run as shodan_run
from tools.passive.whatweb import run as whatweb_passive_run

mcp = FastMCP("claudehack-mcp")


# ── Passive tools ─────────────────────────────────────────────────────────────

@mcp.tool()
def shodan(target: str) -> str:
    """
    Query Shodan's public database for information about the target.
    Returns open ports, running services, software versions, banners,
    and any CVEs Shodan has already flagged. Never contacts the target
    directly — only queries Shodan's existing index.

    Args:
        target: Domain name or IP address to look up (e.g. 'example.com').

    Returns:
        Plain text summary of everything Shodan knows about the target.
    """
    return shodan_run(target)


@mcp.tool()
def whatweb(target: str) -> str:
    """
    Fingerprint the technology stack of a target website using WhatWeb in passive
    mode (aggression level 1 — one request only). Identifies CMS, frameworks,
    server software, JavaScript libraries, and other technologies with version numbers.

    Use this in passive scans. Version numbers returned here should be passed to
    nvd_lookup for CVE correlation.

    Args:
        target: Domain name or URL to fingerprint (e.g. 'example.com').

    Returns:
        Plain text list of detected technologies, grouped by whether version
        info is available.
    """
    return whatweb_passive_run(target)


# ── Entry point ───────────────────────────────────────────────────────────────

if __name__ == "__main__":
    print("MCP server starting...", file=sys.stderr)
    mcp.run(transport="stdio")
