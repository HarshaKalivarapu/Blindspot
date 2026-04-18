import datetime
import re
import requests
import whois
import dns.resolver
import dns.exception


def _dns_section(domain: str) -> list[str]:
    lines = ["── DNS Records ──"]
    record_types = ["A", "AAAA", "MX", "NS", "TXT", "CNAME", "SOA"]

    for rtype in record_types:
        try:
            answers = dns.resolver.resolve(domain, rtype, lifetime=10)
            for rdata in answers:
                lines.append(f"  {rtype:6} {rdata.to_text()}")
        except (dns.resolver.NoAnswer, dns.resolver.NXDOMAIN):
            pass
        except dns.exception.Timeout:
            lines.append(f"  {rtype:6} [timeout]")
        except Exception:
            pass

    if len(lines) == 1:
        lines.append("  No DNS records found.")

    return lines


def _whois_section(domain: str) -> list[str]:
    lines = ["── WHOIS ──"]

    try:
        w = whois.whois(domain)
    except Exception as e:
        lines.append(f"  ERROR: WHOIS lookup failed — {e}")
        return lines

    def fmt_date(val):
        if isinstance(val, list):
            val = val[0]
        if isinstance(val, datetime.datetime):
            return val.strftime("%Y-%m-%d")
        return str(val) if val else "N/A"

    def fmt_list(val):
        if isinstance(val, list):
            return ", ".join(str(v) for v in val if v)
        return str(val) if val else "N/A"

    expiry = w.expiration_date
    expiry_str = fmt_date(expiry)

    # Flag domains expiring within 60 days
    expiry_warning = ""
    try:
        expiry_dt = expiry[0] if isinstance(expiry, list) else expiry
        if expiry_dt and isinstance(expiry_dt, datetime.datetime):
            days_left = (expiry_dt - datetime.datetime.utcnow()).days
            if days_left < 0:
                expiry_warning = " ⚠ EXPIRED"
            elif days_left <= 60:
                expiry_warning = f" ⚠ EXPIRES IN {days_left} DAYS"
    except Exception:
        pass

    lines.append(f"  Registrar      : {fmt_list(w.registrar)}")
    lines.append(f"  Registered     : {fmt_date(w.creation_date)}")
    lines.append(f"  Expires        : {expiry_str}{expiry_warning}")
    lines.append(f"  Updated        : {fmt_date(w.updated_date)}")
    lines.append(f"  Name servers   : {fmt_list(w.name_servers)}")
    lines.append(f"  Registrant org : {fmt_list(getattr(w, 'org', None))}")
    lines.append(f"  Status         : {fmt_list(w.status)}")

    return lines


def _crtsh_section(domain: str) -> list[str]:
    lines = ["── Certificate Transparency (crt.sh) ──"]

    try:
        resp = requests.get(
            "https://crt.sh/",
            params={"q": f"%.{domain}", "output": "json"},
            timeout=15,
            headers={"Accept": "application/json"},
        )
        resp.raise_for_status()
        data = resp.json()
    except requests.exceptions.Timeout:
        lines.append("  ERROR: crt.sh request timed out.")
        return lines
    except Exception as e:
        lines.append(f"  ERROR: crt.sh lookup failed — {e}")
        return lines

    # Extract unique subdomains, strip wildcards
    subdomains = set()
    for entry in data:
        name = entry.get("name_value", "")
        for part in name.split("\n"):
            part = part.strip().lstrip("*.")
            if part and domain in part:
                subdomains.add(part.lower())

    if not subdomains:
        lines.append("  No subdomains found in certificate logs.")
        return lines

    sorted_subs = sorted(subdomains)
    lines.append(f"  {len(sorted_subs)} subdomain(s) found in certificate transparency logs:")
    for sub in sorted_subs:
        # Flag potentially sensitive subdomains
        sensitive_keywords = [
            "dev", "staging", "stage", "test", "qa", "uat",
            "admin", "internal", "vpn", "api", "old", "backup",
            "beta", "demo", "portal", "jenkins", "gitlab", "jira",
        ]
        flags = [kw for kw in sensitive_keywords if kw in sub.split(".")[0]]
        flag_str = f"  ← REVIEW: matches '{flags[0]}'" if flags else ""
        lines.append(f"    {sub}{flag_str}")

    return lines


def run(target: str) -> str:
    # Strip scheme if provided — DNS/WHOIS operate on domain names only
    domain = re.sub(r"^https?://", "", target).split("/")[0].strip()

    sections = []
    sections.append(f"=== DNS / WHOIS / Certificate Transparency for {domain} ===")
    sections.append("")

    sections.extend(_dns_section(domain))
    sections.append("")
    sections.extend(_whois_section(domain))
    sections.append("")
    sections.extend(_crtsh_section(domain))

    return "\n".join(sections)
