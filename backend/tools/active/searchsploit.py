import subprocess
from typing import Any

TOOL_NAME = "searchsploit"
TOOL_DESCRIPTION = "Searches ExploitDB for known exploits matching a service or CVE."

def run(params: dict[str, Any]) -> dict[str, Any]:
    query = params["query"]
    cmd = ["searchsploit", query]
    try:
        process = subprocess.Popen(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
        stdout, stderr = process.communicate(timeout=30)
        return {"result": stdout + stderr}
    except subprocess.TimeoutExpired:
        process.kill()
        return {"result": "[TIMEOUT] searchsploit exceeded time limit."}
    except Exception as e:
        return {"result": f"[ERROR] searchsploit failed: {str(e)}"}
