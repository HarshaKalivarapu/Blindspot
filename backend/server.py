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
from dotenv import load_dotenv
from mcp.server.fastmcp import FastMCP

load_dotenv()

from tools.passive.shodan import run as shodan_run
from tools.passive.whatweb import run as whatweb_passive_run
from tools.passive.dns_whois import run as dns_whois_run
from tools.passive.ssl_tls import run as ssl_tls_run
from tools.passive.http_headers import run as http_headers_run
from tools.shared.nvd_lookup import run as nvd_lookup_run
from tools.active.nmap import run as nmap_run
from tools.active.nikto import run as nikto_run
from tools.active.ffuf import run as ffuf_run
from tools.active.hydra import run as hydra_run
from tools.active.whatweb import run as whatweb_active_run
from tools.active.searchsploit import run as searchsploit_run

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
def nmap(ip: str, aggressive: bool = False) -> str:
    """
    Runs an nmap scan on a target IP to discover open ports and service versions.
    Always use this tool for nmap scans. Never run nmap manually and never modify or add any flags.
    Use aggressive=True for a full port scan (-p-), False for a standard scan.
    Always use the -Pn flag for every single nmap scan.
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


@mcp.tool()
def dns_whois(target: str) -> str:
    """
    Perform DNS record lookup, WHOIS registration query, and certificate
    transparency search (crt.sh) for the target domain. All three are fully
    passive — no packets are sent to the target's servers.

    DNS reveals IP addresses, mail servers, nameservers, and TXT records.
    WHOIS reveals domain ownership, registration dates, and expiry (domains
    expiring soon can be hijacked). crt.sh reveals every subdomain that has
    ever had an SSL certificate issued — including forgotten dev/staging sites.

    Args:
        target: Domain name to investigate (e.g. 'example.com'). Schemes
                (http://) are stripped automatically.

    Returns:
        Three clearly labelled sections: DNS records, WHOIS data, and
        subdomains discovered via certificate transparency logs.
    """
    return dns_whois_run(target)


@mcp.tool()
def ssl_tls(target: str) -> str:
    """
    Audit the SSL/TLS configuration of the target's HTTPS endpoint (port 443).
    Checks certificate validity and expiry, hostname matching, cipher suite
    strength, and which TLS protocol versions the server accepts.

    Flags: expired or near-expiry certs, deprecated TLS 1.0/1.1 support,
    weak cipher suites (RC4, DES, NULL, EXPORT), self-signed certificates,
    and hostname mismatches.

    Does not require authorization — port 443 is publicly accessible.

    Args:
        target: Domain name or URL (e.g. 'example.com'). Scheme is stripped
                automatically.

    Returns:
        Three sections: Certificate details, Cipher info, TLS version support.
    """
    return ssl_tls_run(target)


@mcp.tool()
def http_headers(target: str) -> str:
    """
    Check the HTTP security response headers of a target website. Makes a
    single GET request — no authorization required.

    Checks for the presence of required security headers (HSTS, CSP,
    X-Frame-Options, X-Content-Type-Options, Referrer-Policy,
    Permissions-Policy, X-XSS-Protection) and flags missing ones with
    severity level and remediation advice.

    Also checks for information disclosure headers (Server, X-Powered-By,
    X-AspNet-Version) that leak server software details to attackers.

    For headers that are present, performs deeper analysis — e.g. flags
    weak CSP policies containing 'unsafe-inline' or HSTS with short max-age.

    Args:
        target: Domain name or URL (e.g. 'example.com'). Scheme is added
                automatically if missing; falls back to HTTP if HTTPS fails.

    Returns:
        Two sections: required security headers (present/missing with severity
        and fix instructions), and information disclosure headers found.
    """
    return http_headers_run(target)


@mcp.tool()
def nvd_lookup(software_list: str) -> str:
    """
    Query the National Vulnerability Database (NVD) for known CVEs affecting
    the software versions discovered during the scan.

    Call this ONCE after all other tools have finished — pass ALL software
    names and versions found in a single call, comma or newline separated.
    Do NOT call this after each individual tool.

    Example input:
        "WordPress 5.8, PHP 7.4.3, Apache 2.4.51, OpenSSH 7.2"

    Results are grouped by severity (Critical → High → Medium → Low).
    After this tool completes, pass the CVE IDs to searchsploit to check
    for public exploit scripts.

    Args:
        software_list: Comma or newline separated list of "Name Version" pairs
                       collected from shodan, whatweb, ssl_tls, nmap, etc.

    Returns:
        Per-software CVE listings and a grouped severity summary.
    """
    return nvd_lookup_run(software_list)


# ── Entry point ───────────────────────────────────────────────────────────────

if __name__ == "__main__":
    print("MCP server starting...", file=sys.stderr)
    mcp.run(transport="stdio")
