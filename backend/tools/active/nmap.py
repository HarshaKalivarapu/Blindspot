import subprocess
from typing import Any

TOOL_NAME = "nmap"
TOOL_DESCRIPTION = "Runs an nmap scan on a target IP to find open ports and services."

def run(params: dict[str, Any]) -> dict[str, Any]:
    ip = params["ip"]
    aggressive = params.get("aggressive", False)
    
    if aggressive:
        cmd = ["nmap", "-p-", "-sV", "-A", "--script", "vuln", ip]
        timeout = 600
    else:
        cmd = ["nmap", "-sV", "-A", ip]
        timeout = 60

    try:
        process = subprocess.Popen(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
        stdout, stderr = process.communicate(timeout=timeout)
        return {"result": stdout + stderr}
    except subprocess.TimeoutExpired:
        process.kill()
        return {"result": "[TIMEOUT] nmap exceeded time limit."}
    except Exception as e:
        return {"result": f"[ERROR] nmap failed: {str(e)}"}
