import subprocess
from typing import Any

TOOL_NAME = "whatweb_active"
TOOL_DESCRIPTION = "Runs an aggressive WhatWeb scan to fingerprint a target web server."

def run(params: dict[str, Any]) -> dict[str, Any]:
    ip = params["ip"]
    cmd = ["/usr/bin/whatweb", "--aggression", "3", ip]
    try:
        process = subprocess.Popen(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
        stdout, stderr = process.communicate(timeout=60)
        return {"result": stdout + stderr}
    except subprocess.TimeoutExpired:
        process.kill()
        return {"result": "[TIMEOUT] WhatWeb active scan exceeded time limit."}
    except Exception as e:
        return {"result": f"[ERROR] WhatWeb active scan failed: {str(e)}"}
