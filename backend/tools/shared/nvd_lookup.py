import os
import re
import time
import requests
from packaging.version import Version, InvalidVersion


NVD_API_URL = "https://services.nvd.nist.gov/rest/json/cves/2.0"

_DELAY_NO_KEY = 6.5   # seconds between requests (safe under 5/30s unauthenticated limit)
_DELAY_WITH_KEY = 0.7


# ── Version parsing ───────────────────────────────────────────────────────────

def _parse_version(s: str) -> Version | None:
    """Parse a version string into a comparable Version object. Returns None if unparseable."""
    if not s or s in ("*", "-"):
        return None
    # Strip non-numeric suffixes like "p2", "b1", "rc1" that packaging can't handle
    cleaned = re.sub(r"[^\d.]", ".", s).strip(".")
    # Collapse multiple consecutive dots
    cleaned = re.sub(r"\.{2,}", ".", cleaned)
    try:
        return Version(cleaned)
    except InvalidVersion:
        return None


def _cpe_version(criteria: str) -> str | None:
    """Extract the version field (index 5) from a CPE 2.3 string."""
    parts = criteria.split(":")
    return parts[5] if len(parts) > 5 else None


# ── Version range filtering ───────────────────────────────────────────────────

def _version_in_node(detected: Version, node: dict) -> bool:
    """Return True if `detected` is vulnerable per any cpeMatch in this node."""
    for match in node.get("cpeMatch", []):
        if not match.get("vulnerable", False):
            continue

        start_incl = match.get("versionStartIncluding")
        start_excl = match.get("versionStartExcluding")
        end_incl   = match.get("versionEndIncluding")
        end_excl   = match.get("versionEndExcluding")

        has_range = any([start_incl, start_excl, end_incl, end_excl])

        if has_range:
            if start_incl:
                v = _parse_version(start_incl)
                if v and detected < v:
                    continue
            if start_excl:
                v = _parse_version(start_excl)
                if v and detected <= v:
                    continue
            if end_incl:
                v = _parse_version(end_incl)
                if v and detected > v:
                    continue
            if end_excl:
                v = _parse_version(end_excl)
                if v and detected >= v:
                    continue
            return True
        else:
            # No range — check for an exact version in the CPE criteria string
            cpe_ver_str = _cpe_version(match.get("criteria", ""))
            if not cpe_ver_str or cpe_ver_str in ("*", "-"):
                return True  # Wildcard means all versions affected
            cpe_ver = _parse_version(cpe_ver_str)
            if cpe_ver and cpe_ver == detected:
                return True

    return False


def _is_version_affected(version_str: str, configurations: list) -> bool | None:
    """
    Check whether `version_str` falls within a vulnerable range defined in the
    CVE's CPE configuration data.

    Returns:
        True  — confirmed vulnerable
        False — confirmed not in any vulnerable range
        None  — no configuration data; caller decides (conservative = include)
    """
    detected = _parse_version(version_str)
    if detected is None:
        return None  # Can't parse version — caller decides

    if not configurations:
        return None  # No CPE data — caller decides

    for config in configurations:
        operator = config.get("operator", "OR")
        nodes = config.get("nodes", [])

        if operator == "AND":
            # All nodes must match — conservative: treat as unknown if complex
            if all(_version_in_node(detected, n) for n in nodes):
                return True
        else:
            # OR: any matching node is sufficient
            for node in nodes:
                if _version_in_node(detected, node):
                    return True

    return False


# ── NVD API query ─────────────────────────────────────────────────────────────

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
        "resultsPerPage": 25,  # Fetch more candidates — version filtering reduces this further
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


# ── Input parsing ─────────────────────────────────────────────────────────────

def _parse_software_entry(entry: str) -> tuple[str, str | None]:
    """
    Split "Name 1.2.3" into (name, "1.2.3").
    Returns (entry, None) if no version-like token is found.
    """
    match = re.search(r"\b(\d+(?:[.\-]\d+)+(?:[.\-]\w+)*)\s*$", entry.strip())
    if match:
        version = match.group(1)
        name = entry[: match.start()].strip()
        return name, version
    return entry.strip(), None


def _parse_software_list(raw: str) -> list[str]:
    entries = []
    for part in re.split(r"[,\n]", raw):
        part = part.strip()
        if part:
            entries.append(part)
    return entries


# ── Main entry point ──────────────────────────────────────────────────────────

def run(software_list: str) -> str:
    """
    Query the NVD for each software+version entry and return only CVEs whose
    version ranges actually include the detected version.

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

    skipped_no_version = []

    for i, entry in enumerate(entries):
        _, version = _parse_software_entry(entry)

        # Skip entries with no version — keyword-only searches return CVEs for any
        # third-party product that merely *mentions* the software name in its description,
        # producing false positives that can't be version-filtered.
        if not version:
            skipped_no_version.append(entry)
            continue

        lines.append(f"Querying NVD for: {entry}")

        vulns = _query_nvd(entry, api_key)

        if vulns and "_error" in vulns[0]:
            lines.append(f"  ⚠ {vulns[0]['_error']}")
            lines.append("")
            if i < len(entries) - 1:
                time.sleep(delay)
            continue

        if not vulns:
            lines.append("  No CVEs found.")
            lines.append("")
            if i < len(entries) - 1:
                time.sleep(delay)
            continue

        # ── Version-range filter ──────────────────────────────────────────────
        if version:
            confirmed, uncertain, filtered_out = [], [], 0
            for v in vulns:
                configs = v.get("cve", {}).get("configurations", [])
                result = _is_version_affected(version, configs)
                if result is True:
                    confirmed.append(v)
                elif result is None:
                    uncertain.append(v)
                else:
                    filtered_out += 1  # Confirmed NOT in range

            if filtered_out:
                lines.append(
                    f"  ⚙ Filtered {filtered_out} CVE(s) whose version ranges "
                    f"don't include {version}."
                )
            if uncertain:
                lines.append(
                    f"  ⚠ {len(uncertain)} CVE(s) had no CPE version data — "
                    f"included conservatively."
                )

            vulns = confirmed + uncertain
        # ─────────────────────────────────────────────────────────────────────

        if not vulns:
            lines.append(f"  No CVEs confirmed for version {version}.")
            lines.append("")
            if i < len(entries) - 1:
                time.sleep(delay)
            continue

        # Sort by CVSS descending, show top 5
        scored = sorted(
            vulns,
            key=lambda v: _get_severity_score(v)[0],
            reverse=True,
        )[:5]

        label = f"confirmed for version {version}" if version else "found"
        lines.append(f"  {len(vulns)} CVE(s) {label} — showing top {len(scored)} by severity:")

        for vuln in scored:
            cve_id = vuln.get("cve", {}).get("id", "N/A")
            score, severity = _get_severity_score(vuln)
            description = _get_description(vuln)
            published = vuln.get("cve", {}).get("published", "")[:10]

            all_findings[severity].append(
                {
                    "software": entry,
                    "cve_id": cve_id,
                    "score": score,
                    "severity": severity,
                    "description": description,
                    "published": published,
                }
            )

            lines.append(f"    [{severity}] {cve_id} (CVSS {score}) — {published}")
            lines.append(f"      {description}")

        lines.append("")
        if i < len(entries) - 1:
            time.sleep(delay)

    if skipped_no_version:
        lines.append("── Skipped (no version detected) ──")
        lines.append(
            "  The following entries had no version number and were not queried."
        )
        lines.append(
            "  Without a version, NVD keyword search returns CVEs for unrelated products"
        )
        lines.append(
            "  that merely mention this technology by name — those are not valid findings."
        )
        for s in skipped_no_version:
            lines.append(f"  • {s}")
        lines.append("")

    # ── Summary ───────────────────────────────────────────────────────────────
    lines.append("── Summary by Severity ──")
    total = sum(len(v) for v in all_findings.values())

    if total == 0:
        lines.append("  No CVEs confirmed across all software entries.")
        return "\n".join(lines)

    severity_order = ["CRITICAL", "HIGH", "MEDIUM", "LOW", "UNKNOWN"]
    severity_icons = {"CRITICAL": "🔴", "HIGH": "🟠", "MEDIUM": "🟡", "LOW": "🔵", "UNKNOWN": "⚪"}

    for severity in severity_order:
        findings = all_findings[severity]
        if not findings:
            continue
        lines.append(f"  {severity_icons[severity]} {severity}: {len(findings)} CVE(s)")
        for f in findings:
            lines.append(f"    {f['cve_id']} ({f['software']}) — CVSS {f['score']}")

    lines.append("")
    lines.append(f"  Total confirmed CVEs: {total}")
    lines.append("  Pass these CVE IDs to searchsploit to check for public exploit scripts.")

    return "\n".join(lines)
