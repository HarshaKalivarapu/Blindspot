import subprocess
from typing import Any

TOOL_NAME = "nikto"
TOOL_DESCRIPTION = "Runs a nikto scan on a target web server to find vulnerabilities."

def run(params: dict[str, Any]) -> dict[str, Any]:
    ip = params["ip"]
    cmd = ["nikto", "-h", ip]
    try:
        result = subprocess.run(cmd, capture_output=True, text=True, timeout=180)
        return {"result": result.stdout or result.stderr}
    except subprocess.TimeoutExpired:
        return {"result":  "[TIMEOUT] nikto exceeded time limit."}
    except Exception as e:
        return {"result": f"[ERROR] nikto failed: {str(e)}"}

