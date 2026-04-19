import os
import re
import time
import requests


NVD_API_URL = "https://services.nvd.nist.gov/rest/json/cves/2.0"

# Without an API key NVD enforces 5 requests per 30 seconds.
# With a key the limit rises to 50 per 30 seconds.
_DELAY_NO_KEY = 6.5   # seconds between requests (safe under the 5/30s limit)
_DELAY_WITH_KEY = 0.7


def _get_severity_score(vuln: dict) -> tuple[float, str]:
    """Return (cvss_score, severity_label) preferring CVSSv3 over v2."""
    metrics = vuln.get("cve", {}).get("metrics", {})
    for key in ("cvssMetricV31", "cvssMetricV30", "cvssMetricV2"):
        entries = metrics.get(key)
        if entries:
            data = entries[0]
            cvss = data.get("cvssData", {})
            score = float(cvss.get("baseScore", 0))
            severity = (cvss.get("baseSeverity") or data.get("baseSeverity", "UNKNOWN")).upper()
            return score, severity
    return 0.0, "UNKNOWN"


def _get_description(vuln: dict) -> str:
    for desc in vuln.get("cve", {}).get("descriptions", []):
        if desc.get("lang") == "en":
            text = desc.get("value", "").strip()
            return text[:250] + ("..." if len(text) > 250 else "")
    return "No description available."


def _query_nvd(keyword: str, api_key: str | None) -> list[dict]:
    headers = {"apiKey": api_key} if api_key else {}
    params = {
        "keywordSearch": keyword,
        "resultsPerPage": 10,
    }
    try:
        resp = requests.get(NVD_API_URL, params=params, headers=headers, timeout=20)
        resp.raise_for_status()
        return resp.json().get("vulnerabilities", [])
    except requests.exceptions.Timeout:
        return [{"_error": f"NVD request timed out for '{keyword}'"}]
    except requests.exceptions.HTTPError as e:
        return [{"_error": f"NVD API error for '{keyword}': {e}"}]
    except Exception as e:
        return [{"_error": f"Unexpected error querying NVD for '{keyword}': {e}"}]


def _parse_software_list(raw: str) -> list[str]:
    """
    Parse a flexible input string into individual software+version entries.
    Accepts comma-separated or newline-separated values.
    e.g. "WordPress 5.8, PHP 7.4.3\nApache 2.4.51"
    """
    entries = []
    for part in re.split(r"[,\n]", raw):
        part = part.strip()
        if part:
            entries.append(part)
    return entries


def run(software_list: str) -> str:
    """
    Query the NVD for each software+version entry and return CVEs found,
    grouped by severity.

    software_list: comma or newline separated list of "Name Version" pairs.
    e.g. "WordPress 5.8, PHP 7.4.3, Apache 2.4.51, OpenSSH 7.2"
    """
    api_key = os.environ.get("NVD_API_KEY")
    delay = _DELAY_WITH_KEY if api_key else _DELAY_NO_KEY

    entries = _parse_software_list(software_list)
    if not entries:
        return "ERROR: No software entries provided. Pass a comma or newline separated list of 'Name Version' pairs."

    lines = ["=== NVD CVE Lookup ===", ""]
    if not api_key:
        lines.append("ℹ No NVD_API_KEY set — using unauthenticated tier (rate-limited, slower).")
        lines.append("")

    all_findings: dict[str, list] = {
        "CRITICAL": [],
        "HIGH": [],
        "MEDIUM": [],
        "LOW": [],
        "UNKNOWN": [],
    }

    for i, entry in enumerate(entries):
        lines.append(f"Querying NVD for: {entry}")

        vulns = _query_nvd(entry, api_key)

        # Check for errors returned from helper
        if vulns and "_error" in vulns[0]:
            lines.append(f"  ⚠ {vulns[0]['_error']}")
            lines.append("")
            if i < len(entries) - 1:
                time.sleep(delay)
            continue

        if not vulns:
            lines.append(f"  No CVEs found.")
            lines.append("")
            if i < len(entries) - 1:
                time.sleep(delay)
            continue

        # Sort by CVSS score descending, keep top 5
        scored = sorted(
            vulns,
            key=lambda v: _get_severity_score(v)[0],
            reverse=True
        )[:5]

        count = len(vulns)
        shown = len(scored)
        lines.append(f"  {count} CVE(s) found — showing top {shown} by severity:")

        for vuln in scored:
            cve_id = vuln.get("cve", {}).get("id", "N/A")
            score, severity = _get_severity_score(vuln)
            description = _get_description(vuln)
            published = vuln.get("cve", {}).get("published", "")[:10]

            finding = {
                "software": entry,
                "cve_id": cve_id,
                "score": score,
                "severity": severity,
                "description": description,
                "published": published,
            }
            all_findings[severity].append(finding)

            lines.append(f"    [{severity}] {cve_id} (CVSS {score}) — {published}")
            lines.append(f"      {description}")

        lines.append("")

        # Respect rate limit between requests
        if i < len(entries) - 1:
            time.sleep(delay)

    # ── Summary grouped by severity ───────────────────────────────────────────
    lines.append("── Summary by Severity ──")
    total = sum(len(v) for v in all_findings.values())

    if total == 0:
        lines.append("  No CVEs found across all software entries.")
        return "\n".join(lines)

    severity_order = ["CRITICAL", "HIGH", "MEDIUM", "LOW", "UNKNOWN"]
    severity_icons = {
        "CRITICAL": "🔴",
        "HIGH": "🟠",
        "MEDIUM": "🟡",
        "LOW": "🔵",
        "UNKNOWN": "⚪",
    }

    for severity in severity_order:
        findings = all_findings[severity]
        if not findings:
            continue
        icon = severity_icons[severity]
        lines.append(f"  {icon} {severity}: {len(findings)} CVE(s)")
        for f in findings:
            lines.append(f"    {f['cve_id']} ({f['software']}) — CVSS {f['score']}")

    lines.append("")
    lines.append(f"  Total CVEs surfaced: {total}")
    lines.append("  Pass these CVE IDs to searchsploit to check for public exploit scripts.")

    return "\n".join(lines)
