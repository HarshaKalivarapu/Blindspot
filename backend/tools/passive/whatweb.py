import json
import os
import shutil
import subprocess
import tempfile


def run(target: str) -> str:
    if not shutil.which("whatweb"):
        return "ERROR: WhatWeb is not installed. Run: sudo apt install whatweb"

    url = target if target.startswith(("http://", "https://")) else f"http://{target}"

    tmp = tempfile.NamedTemporaryFile(suffix=".json", delete=False)
    tmp_path = tmp.name
    tmp.close()

    try:
        proc = subprocess.run(
            [
                "whatweb",
                "--aggression", "1",
                f"--log-json={tmp_path}",
                "--quiet",
                url,
            ],
            capture_output=True,
            text=True,
            timeout=30,
        )

        with open(tmp_path) as f:
            raw = f.read().strip()
    except subprocess.TimeoutExpired:
        return f"ERROR: WhatWeb timed out after 30 seconds scanning {target}."
    except Exception as e:
        return f"ERROR: Failed to run WhatWeb — {e}"
    finally:
        os.unlink(tmp_path)

    if not raw:
        stderr = proc.stderr.strip()[:300]
        return f"ERROR: WhatWeb returned no output for {target}.\nStderr: {stderr}"

    try:
        entries = json.loads(raw)
    except json.JSONDecodeError:
        return f"ERROR: Could not parse WhatWeb JSON output.\nRaw:\n{raw[:500]}"

    lines = [f"=== WhatWeb Results for {target} (Passive — aggression 1) ===", ""]

    for entry in entries:
        url_scanned = entry.get("target", url)
        status = entry.get("http_status", "N/A")
        plugins = entry.get("plugins", {})

        lines.append(f"URL    : {url_scanned}")
        lines.append(f"Status : HTTP {status}")
        lines.append("")

        if not plugins:
            lines.append("  No technologies detected.")
            lines.append("")
            continue

        versioned = {}
        unversioned = []

        for name, details in plugins.items():
            versions = details.get("version", [])
            strings = details.get("string", [])
            if versions:
                versioned[name] = [str(v) for v in versions[:3]]
            elif strings:
                snippet = str(strings[0])[:80].strip()
                unversioned.append(f"{name} [{snippet}]")
            else:
                unversioned.append(name)

        if versioned:
            lines.append("  Technologies with version info (prioritize for CVE lookup):")
            for name, versions in versioned.items():
                lines.append(f"    {name}: {', '.join(versions)}")
            lines.append("")

        if unversioned:
            lines.append("  Other detected technologies:")
            for entry_str in unversioned:
                lines.append(f"    {entry_str}")
            lines.append("")

    return "\n".join(lines)
