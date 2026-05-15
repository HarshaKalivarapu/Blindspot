import datetime
import re
import socket
import ssl


# Cipher names containing these substrings are considered weak
_WEAK_CIPHER_PATTERNS = [
    "RC4", "DES", "3DES", "NULL", "EXPORT", "MD5", "ANON", "ADH", "AECDH"
]

_TLS_VERSIONS = [
    (ssl.TLSVersion.TLSv1,   "TLS 1.0", "DEPRECATED — must be disabled"),
    (ssl.TLSVersion.TLSv1_1, "TLS 1.1", "DEPRECATED — must be disabled"),
    (ssl.TLSVersion.TLSv1_2, "TLS 1.2", "Acceptable"),
    (ssl.TLSVersion.TLSv1_3, "TLS 1.3", "Best — recommended"),
]


def _get_cert_and_connection(hostname: str, port: int):
    """
    Returns (cert_dict, cipher_tuple, negotiated_version, error_str).
    Tries with full verification first, then without (to still extract cert info
    even if the chain is broken, flagging it as an error).
    """
    for verify in (True, False):
        ctx = ssl.create_default_context()
        if not verify:
            ctx.check_hostname = False
            ctx.verify_mode = ssl.CERT_NONE

        try:
            with socket.create_connection((hostname, port), timeout=10) as sock:
                with ctx.wrap_socket(sock, server_hostname=hostname) as ssock:
                    cert = ssock.getpeercert()
                    cipher = ssock.cipher()
                    version = ssock.version()
                    err = None if verify else "Certificate verification FAILED (chain untrusted or hostname mismatch)"
                    return cert, cipher, version, err
        except ssl.SSLCertVerificationError as e:
            if verify:
                verification_error = str(e)
                continue  # retry without verification
            return None, None, None, f"SSL error: {e}"
        except ConnectionRefusedError:
            return None, None, None, f"Port {port} is closed — HTTPS may not be configured."
        except socket.timeout:
            return None, None, None, f"Connection to {hostname}:{port} timed out."
        except Exception as e:
            return None, None, None, f"Unexpected error: {e}"

    return None, None, None, verification_error


def _check_tls_version_support(hostname: str, port: int, tls_version) -> bool:
    ctx = ssl.SSLContext(ssl.PROTOCOL_TLS_CLIENT)
    ctx.check_hostname = False
    ctx.verify_mode = ssl.CERT_NONE
    try:
        ctx.minimum_version = tls_version
        ctx.maximum_version = tls_version
        with socket.create_connection((hostname, port), timeout=5) as sock:
            with ctx.wrap_socket(sock, server_hostname=hostname):
                return True
    except Exception:
        return False


def _parse_cert_section(cert: dict, hostname: str, verified: bool) -> list[str]:
    lines = ["── Certificate ──"]

    subject = dict(x[0] for x in cert.get("subject", []))
    issuer = dict(x[0] for x in cert.get("issuer", []))

    cn = subject.get("commonName", "N/A")
    org = subject.get("organizationName", "N/A")
    issuer_cn = issuer.get("commonName", "N/A")
    issuer_org = issuer.get("organizationName", "N/A")

    lines.append(f"  Subject CN   : {cn}")
    lines.append(f"  Subject Org  : {org}")
    lines.append(f"  Issuer       : {issuer_cn} ({issuer_org})")

    # Self-signed check
    if subject == issuer:
        lines.append("  ⚠ SELF-SIGNED certificate — not trusted by browsers")

    # SANs
    sans = [v for t, v in cert.get("subjectAltName", []) if t == "DNS"]
    if sans:
        lines.append(f"  SANs         : {', '.join(sans[:10])}" + (" ..." if len(sans) > 10 else ""))

    # Hostname match — inferred from whether full verification succeeded
    if verified:
        lines.append(f"  Hostname     : MATCHES certificate ✓")
    else:
        lines.append(f"  Hostname     : ⚠ MISMATCH or chain issue — cert may not be valid for {hostname}")

    # Expiry
    not_after_str = cert.get("notAfter", "")
    not_before_str = cert.get("notBefore", "")
    fmt = "%b %d %H:%M:%S %Y %Z"

    try:
        not_after = datetime.datetime.strptime(not_after_str, fmt).replace(tzinfo=datetime.timezone.utc)
        not_before = datetime.datetime.strptime(not_before_str, fmt).replace(tzinfo=datetime.timezone.utc)
        now = datetime.datetime.now(datetime.timezone.utc)
        days_left = (not_after - now).days

        lines.append(f"  Valid from   : {not_before.strftime('%Y-%m-%d')}")
        lines.append(f"  Expires      : {not_after.strftime('%Y-%m-%d')}", )

        if days_left < 0:
            lines.append(f"  ⚠ CRITICAL: Certificate EXPIRED {abs(days_left)} days ago")
        elif days_left <= 14:
            lines.append(f"  ⚠ CRITICAL: Expires in {days_left} days — renew immediately")
        elif days_left <= 30:
            lines.append(f"  ⚠ HIGH: Expires in {days_left} days — renew soon")
        elif days_left <= 60:
            lines.append(f"  ⚠ MEDIUM: Expires in {days_left} days")
        else:
            lines.append(f"  Valid for    : {days_left} more days ✓")
    except ValueError:
        lines.append(f"  Expires      : {not_after_str}")

    return lines


def _parse_cipher_section(cipher: tuple) -> list[str]:
    lines = ["── Cipher & Protocol ──"]

    if not cipher:
        lines.append("  No cipher info available.")
        return lines

    name, protocol, bits = cipher
    lines.append(f"  Negotiated   : {name}")
    lines.append(f"  Protocol     : {protocol}")
    lines.append(f"  Key bits     : {bits}")

    issues = []
    for pattern in _WEAK_CIPHER_PATTERNS:
        if pattern in name.upper():
            issues.append(f"cipher contains '{pattern}' — cryptographically weak")
    if bits and bits < 128:
        issues.append(f"key length {bits} bits is below minimum safe threshold of 128 bits")

    if issues:
        for issue in issues:
            lines.append(f"  ⚠ WEAK: {issue}")
    else:
        lines.append("  Cipher strength: Acceptable ✓")

    return lines


def _parse_tls_version_section(hostname: str, port: int) -> list[str]:
    lines = ["── TLS Version Support ──"]

    for tls_ver, label, note in _TLS_VERSIONS:
        try:
            supported = _check_tls_version_support(hostname, port, tls_ver)
        except Exception:
            supported = False

        status = "SUPPORTED" if supported else "not supported"
        prefix = "⚠" if supported and "DEPRECATED" in note else " "
        lines.append(f"  {prefix} {label}: {status} — {note}")

    return lines


def run(target: str) -> str:
    # Strip scheme and path — we only need the hostname
    hostname = re.sub(r"^https?://", "", target).split("/")[0].strip()
    port = 443

    lines = [f"=== SSL/TLS Check for {hostname} (port {port}) ===", ""]

    cert, cipher, version, error = _get_cert_and_connection(hostname, port)

    if cert is None:
        lines.append(f"ERROR: Could not retrieve SSL certificate — {error}")
        return "\n".join(lines)

    verified = error is None
    if error:
        lines.append(f"⚠ WARNING: {error}")
        lines.append("")

    lines.extend(_parse_cert_section(cert, hostname, verified))
    lines.append("")
    lines.extend(_parse_cipher_section(cipher))
    lines.append("")
    lines.extend(_parse_tls_version_section(hostname, port))

    return "\n".join(lines)
