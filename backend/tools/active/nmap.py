import subprocess
from typing import Any

TOOL_NAME = "nmap"
TOOL_DESCRIPTION = "Runs an nmap scan on a target IP to find open ports and services."

def run(params: dict[str, Any]) -> dict[str, Any]:
    ip = params["ip"]
    aggressive = params.get("aggressive", False)

    if aggressive:
        cmd = ["nmap", "-p-", "-sV", "-O", "-A", "--script", "vuln", ip]
    else:
        cmd = ["nmap", "-sV", "-A", ip]

    result = subprocess.run(cmd, capture_output=True, text=True)
    return {"result": result.stdout}


