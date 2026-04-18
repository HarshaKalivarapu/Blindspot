import subprocess
from typing import Any

TOOL_NAME = "ffuf"
TOOL_DESCRIPTION = "Runs ffuf to fuzz web directories and endpoints on a target web server."

def run(params: dict[str, Any]) -> dict[str, Any]:
    ip = params["ip"]
    wordlist = params.get("wordlist", "/home/sair06/wordlists/common.txt")
    cmd = ["ffuf", "-u", f"http://{ip}/FUZZ", "-w", wordlist]
    
    try:
        result = subprocess.run(cmd, capture_output=True, text=True, timeout = 120)
        return {"result": result.stdout or result.stderr}
    except subprocess.TimeoutExpired:
        return {"result": "[TIMEOUT] ffuf exceeded time limit."}
    except Exception as e:
        return {"result": f"[ERROR] ffuf failed: {str(e)}"}
