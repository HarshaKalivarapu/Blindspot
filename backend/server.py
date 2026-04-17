"""
server.py — MCP Server entry point
------------------------------------
Uses FastMCP to expose tools to any MCP-compatible client (e.g. Antigravity).

Run with:
    python backend/server.py

The server communicates over stdio (stdin/stdout), which is the standard
transport expected by MCP clients. Do NOT use print() here — write debug
output to stderr instead.
"""

import sys
from mcp.server.fastmcp import FastMCP

# Import tool functions from their modules
from tools.active.example_command import run as example_command_run

# ── Server setup ────────────────────────────────────────────────────────────

mcp = FastMCP("claudehack-mcp")


# ── Tool registrations ───────────────────────────────────────────────────────

@mcp.tool()
def example_command(message: str) -> str:
    """
    Echoes the provided message back to the caller.
    Use this to verify the MCP server is connected and working.

    Args:
        message: Any string you want echoed back.

    Returns:
        The echoed string, prefixed with 'Echo: '.
    """
    result = example_command_run({"message": message})
    return result["result"]


# ── Entry point ──────────────────────────────────────────────────────────────

if __name__ == "__main__":
    print("MCP server starting...", file=sys.stderr)
    mcp.run(transport="stdio")
