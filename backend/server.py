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
from tools.active.nmap import run as nmap_run
from tools.active.nikto import run as nikto_run
from tools.active.ffuf import run as ffuf_run
from tools.active.hydra import run as hydra_run
from tools.active.whatweb import run as whatweb_active_run
from tools.active.searchsploit import run as searchsploit_run
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

@mcp.tool()
def nmap(ip: str, aggressive: bool = False) -> str:
    """
    Runs an nmap scan on a target IP to discover open ports and service versions.
    Always use this tool for nmap scans. Never run nmap manually and never modify or add any flags.
    Use aggressive=True for a full port scan (-p-), False for a standard scan.
    Args:
        ip: Target IP address to scan.
        aggressive: If True, scans all 65535 ports. If False, scans common ports only.
    Returns:
        Raw nmap output with open ports, services, and versions.
    Note: aggressive mode runs --script vuln which includes EternalBlue (MS17-010) check on port 445.
    """
    return nmap_run({"ip": ip, "aggressive": aggressive})["result"]

@mcp.tool()
def nikto(ip:str) -> str:
    """
    Runs a nikto scan on a target web server to find vulnerabilities and misconfigurations.
    Only use this tool when port 80 or 443 is found open. Never modify or add any additional flags.
    Args:
        ip: Target IP address of the web server.
    Returns:
        Raw nikto output with vulnerabilities found.
    """
    return nikto_run({"ip": ip})["result"]

@mcp.tool()
def ffuf(ip: str) -> str:
    """
    Runs ffuf to fuzz web directories on a target web server.
    Only use this tool when port 80 or 443 is found open. Never modify or add any additional flags.
    Args:
        ip: Target IP address of the web server.
    Returns:
        Raw ffuf output with discovered directories and endpoints.
    """
    return ffuf_run({"ip": ip})["result"]

@mcp.tool()
def hydra(ip: str, service: str) -> str:
    """
    Runs hydra to brute force credentials on a target service.
    Use service='ftp' for port 21, service='mysql' for port 3306, service='postgres' for port 5432.
    Only use this tool when the relevant port is found open by nmap.
    Never modify or add any additionals flags.
    Args:
        ip: Target IP address.
        service: Service to brute force (ftp, ssh, mysql, postgres).
    Returns:
        Raw hydra output with any credentials found.
    """
    return hydra_run({"ip": ip, "service": service})["result"]

@mcp.tool()
def whatweb_active(ip: str) -> str:
    """
    Runs an aggressive WhatWeb scan to fingerprint a target web server.
    Only use this in active mode when port 80 or 443 is found open. Never modify or add any additionals flags.
    Args:
        ip: Target IP address of the web server.
    Returns:
        WhatWeb output with detected technologies and versions.
    """
    return whatweb_active_run({"ip": ip})["result"]

@mcp.tool()
def searchsploit(query: str) -> str:
    """
    Searches ExploitDB for known public exploits matching a service name or CVE.
    Use this after NVD CVE lookup to find if a public exploit exists.
    Args:
        query: Service name, version, or CVE ID to search for (e.g. 'Apache 2.2.14', 'CVE-2021-41773').
    Returns:
        List of matching exploits from ExploitDB.
    """
    return searchsploit_run({"query": query})["result"]

# ── Entry point ──────────────────────────────────────────────────────────────

if __name__ == "__main__":
    print("MCP server starting...", file=sys.stderr)
    mcp.run(transport="stdio")
