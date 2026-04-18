import os
import socket
import shodan


def run(target: str) -> str:
    api_key = os.environ.get("SHODAN_API_KEY")
    if not api_key:
        return "ERROR: SHODAN_API_KEY is not set in environment."

    # Resolve domain to IP if needed
    try:
        ip = socket.gethostbyname(target)
    except socket.gaierror:
        return f"ERROR: Could not resolve '{target}' to an IP address."

    try:
        api = shodan.Shodan(api_key)
        host = api.host(ip)
    except shodan.APIError as e:
        return f"ERROR: Shodan API error — {e}"

    lines = []
    lines.append(f"=== Shodan Results for {target} ({ip}) ===")
    lines.append(f"Organization : {host.get('org', 'N/A')}")
    lines.append(f"OS           : {host.get('os', 'Unknown')}")
    lines.append(f"Country      : {host.get('country_name', 'N/A')}")
    lines.append(f"Last updated : {host.get('last_update', 'N/A')}")
    lines.append(f"Open ports   : {', '.join(str(p) for p in host.get('ports', []))}")
    lines.append("")

    tags = host.get("tags", [])
    if tags:
        lines.append(f"Tags: {', '.join(tags)}")

    hostnames = host.get("hostnames", [])
    if hostnames:
        lines.append(f"Hostnames: {', '.join(hostnames)}")

    lines.append("")

    # Collect versioned software as we go — used for NVD section at the end
    nvd_candidates = []
    all_shodan_cves = []

    data_items = host.get("data", [])
    if len(data_items) > 25:
        lines.append(f"(Showing 25 of {len(data_items)} services — capped to keep output manageable)")
        data_items = data_items[:25]

    for item in data_items:
        port = item.get("port")
        transport = item.get("transport", "tcp")
        product = item.get("product", "")
        version = item.get("version", "")
        banner = (item.get("data", "") or "").strip()[:150]

        service_line = f"Port {port}/{transport}"
        if product:
            service_line += f" — {product}"
        if version:
            service_line += f" {version}"
            nvd_candidates.append(f"{product} {version}".strip())
        lines.append(service_line)

        if banner:
            lines.append(f"  Banner: {banner}")

        vulns = item.get("vulns", {})
        if vulns:
            lines.append(f"  Vulnerabilities flagged by Shodan:")
            for cve, details in vulns.items():
                cvss = details.get("cvss", "N/A")
                summary = details.get("summary", "")[:150]
                lines.append(f"    {cve} (CVSS {cvss}): {summary}")
                all_shodan_cves.append(cve)

        lines.append("")

    # Explicit NVD section so Claude knows exactly what to pass to nvd_lookup
    lines.append("── Software Versions for NVD Lookup ──")
    if nvd_candidates:
        lines.append("Pass these to nvd_lookup (combine with versions from other tools):")
        for candidate in nvd_candidates:
            lines.append(f"  {candidate}")
    else:
        lines.append("  No versioned software detected — Shodan may not have banner data for this host.")

    if all_shodan_cves:
        lines.append("")
        lines.append(f"CVEs already flagged by Shodan (include in report):")
        for cve in all_shodan_cves:
            lines.append(f"  {cve}")

    return "\n".join(lines)
