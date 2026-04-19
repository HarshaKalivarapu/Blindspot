import re
import requests


# Each entry: (header_name, severity_if_missing, what_it_prevents, recommendation)
_SECURITY_HEADERS = [
    (
        "Strict-Transport-Security",
        "HIGH",
        "Protocol downgrade attacks and cookie hijacking (HSTS)",
        "Add: Strict-Transport-Security: max-age=31536000; includeSubDomains; preload",
    ),
    (
        "Content-Security-Policy",
        "HIGH",
        "Cross-site scripting (XSS) and data injection attacks",
        "Add a Content-Security-Policy header restricting allowed script/style sources.",
    ),
    (
        "X-Frame-Options",
        "MEDIUM",
        "Clickjacking attacks (embedding your page in an attacker's iframe)",
        "Add: X-Frame-Options: DENY  (or SAMEORIGIN if you need iframes on your own domain)",
    ),
    (
        "X-Content-Type-Options",
        "MEDIUM",
        "MIME-type sniffing attacks",
        "Add: X-Content-Type-Options: nosniff",
    ),
    (
        "Referrer-Policy",
        "LOW",
        "Leaking URL paths and query strings to third-party sites",
        "Add: Referrer-Policy: strict-origin-when-cross-origin",
    ),
    (
        "Permissions-Policy",
        "LOW",
        "Unauthorized access to browser features (camera, mic, geolocation)",
        "Add: Permissions-Policy: geolocation=(), microphone=(), camera=()",
    ),
    (
        "X-XSS-Protection",
        "LOW",
        "Reflected XSS in older browsers (legacy header, mostly superseded by CSP)",
        "Add: X-XSS-Protection: 1; mode=block  (for legacy browser support)",
    ),
]

# Headers that should NOT be present (information disclosure)
_HEADERS_TO_REDACT = [
    (
        "Server",
        "LOW",
        "Reveals web server software and version to attackers (e.g. Apache/2.4.51)",
    ),
    (
        "X-Powered-By",
        "LOW",
        "Reveals backend technology (e.g. PHP/7.4.3, ASP.NET) to attackers",
    ),
    (
        "X-AspNet-Version",
        "LOW",
        "Reveals exact ASP.NET version to attackers",
    ),
    (
        "X-AspNetMvc-Version",
        "LOW",
        "Reveals exact ASP.NET MVC version to attackers",
    ),
]


def _analyse_hsts(value: str) -> list[str]:
    notes = []
    lower = value.lower()
    try:
        max_age_match = re.search(r"max-age=(\d+)", lower)
        if max_age_match:
            max_age = int(max_age_match.group(1))
            if max_age < 31536000:
                notes.append(f"  ⚠ max-age is {max_age}s — recommended minimum is 31536000 (1 year)")
        else:
            notes.append("  ⚠ max-age directive missing")
    except ValueError:
        pass
    if "includesubdomains" not in lower:
        notes.append("  ⚠ includeSubDomains not set — subdomains are not protected")
    if "preload" not in lower:
        notes.append("  ℹ preload not set — consider adding for browser preload list inclusion")
    return notes


def _analyse_csp(value: str) -> list[str]:
    notes = []
    lower = value.lower()
    if "unsafe-inline" in lower:
        notes.append("  ⚠ 'unsafe-inline' present — weakens XSS protection significantly")
    if "unsafe-eval" in lower:
        notes.append("  ⚠ 'unsafe-eval' present — allows dynamic code execution, weakens XSS protection")
    if "*" in value and "default-src" in lower:
        notes.append("  ⚠ Wildcard (*) in default-src — overly permissive policy")
    return notes


_HEADER_ANALYSERS = {
    "Strict-Transport-Security": _analyse_hsts,
    "Content-Security-Policy": _analyse_csp,
}


def run(target: str) -> str:
    # Ensure we have a URL with scheme
    if not target.startswith(("http://", "https://")):
        url = f"https://{target}"
    else:
        url = target

    lines = [f"=== HTTP Security Headers for {url} ===", ""]

    try:
        resp = requests.get(
            url,
            timeout=15,
            allow_redirects=True,
            headers={"User-Agent": "Mozilla/5.0 (security-scan)"},
        )
    except requests.exceptions.SSLError as e:
        lines.append(f"ERROR: SSL error connecting to {url} — {e}")
        lines.append("Try running ssl_tls tool to diagnose the certificate issue.")
        return "\n".join(lines)
    except requests.exceptions.ConnectionError:
        # Fall back to HTTP if HTTPS fails
        if url.startswith("https://"):
            http_url = url.replace("https://", "http://", 1)
            lines.append(f"⚠ HTTPS connection failed — falling back to HTTP ({http_url})")
            lines.append("  This itself is a finding: HTTPS may not be properly configured.")
            lines.append("")
            try:
                resp = requests.get(http_url, timeout=15, allow_redirects=True)
                url = http_url
            except Exception as e:
                lines.append(f"ERROR: Could not connect to {target} over HTTP or HTTPS — {e}")
                return "\n".join(lines)
        else:
            lines.append(f"ERROR: Could not connect to {url}")
            return "\n".join(lines)
    except requests.exceptions.Timeout:
        lines.append(f"ERROR: Request to {url} timed out.")
        return "\n".join(lines)
    except Exception as e:
        lines.append(f"ERROR: Unexpected error — {e}")
        return "\n".join(lines)

    headers = resp.headers
    final_url = resp.url
    status = resp.status_code

    if final_url != url:
        lines.append(f"Followed redirect → {final_url}")
    lines.append(f"HTTP Status : {status}")
    lines.append("")

    # ── Security headers that should be present ───────────────────────────────
    lines.append("── Required Security Headers ──")
    missing = []
    present = []

    for header_name, severity, prevents, recommendation in _SECURITY_HEADERS:
        value = headers.get(header_name)
        if value is None:
            missing.append((header_name, severity, prevents, recommendation))
        else:
            present.append((header_name, value))
            # Run deeper analysis on some headers
            analyser = _HEADER_ANALYSERS.get(header_name)
            if analyser:
                notes = analyser(value)
                if notes:
                    present[-1] = (header_name, value, notes)

    if missing:
        lines.append(f"  MISSING ({len(missing)} headers):")
        for header_name, severity, prevents, recommendation in missing:
            lines.append(f"")
            lines.append(f"  [{severity}] {header_name}")
            lines.append(f"    Prevents : {prevents}")
            lines.append(f"    Fix      : {recommendation}")
    else:
        lines.append("  All required security headers present ✓")

    lines.append("")
    lines.append("  PRESENT:")
    for entry in present:
        name = entry[0]
        value = entry[1]
        notes = entry[2] if len(entry) > 2 else []
        # Truncate very long values (CSP can be huge)
        display_value = value if len(value) <= 120 else value[:117] + "..."
        lines.append(f"  ✓ {name}: {display_value}")
        for note in notes:
            lines.append(note)

    lines.append("")

    # ── Headers that should NOT be present ────────────────────────────────────
    lines.append("── Information Disclosure Headers ──")
    disclosed = []
    for header_name, severity, risk in _HEADERS_TO_REDACT:
        value = headers.get(header_name)
        if value:
            disclosed.append((header_name, value, severity, risk))

    if disclosed:
        lines.append(f"  FOUND ({len(disclosed)} headers leaking server info):")
        for header_name, value, severity, risk in disclosed:
            lines.append(f"")
            lines.append(f"  [{severity}] {header_name}: {value}")
            lines.append(f"    Risk : {risk}")
            lines.append(f"    Fix  : Remove or suppress this header in your server config.")
    else:
        lines.append("  No sensitive server information headers detected ✓")

    return "\n".join(lines)
