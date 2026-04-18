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

    for item in host.get("data", []):
        port = item.get("port")
        transport = item.get("transport", "tcp")
        product = item.get("product", "")
        version = item.get("version", "")
        banner = (item.get("data", "") or "").strip()[:300]

        service_line = f"Port {port}/{transport}"
        if product:
            service_line += f" — {product}"
        if version:
            service_line += f" {version}"
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

        lines.append("")

    tags = host.get("tags", [])
    if tags:
        lines.append(f"Tags: {', '.join(tags)}")

    hostnames = host.get("hostnames", [])
    if hostnames:
        lines.append(f"Hostnames: {', '.join(hostnames)}")

    return "\n".join(lines)
