import subprocess
from pathlib import Path
from typing import Any

TOOL_NAME = "hydra"
TOOL_DESCRIPTION = "Runs hydra to brute force credentials on a target service."

_WORDLISTS = Path(__file__).parent.parent.parent / "wordlists"

def run(params: dict[str, Any]) -> dict[str, Any]:
    ip = params["ip"]
    service = params["service"]  # ftp, ssh, mysql, postgres
    cmd = ["hydra", "-L", str(_WORDLISTS / "usernames.txt"),
           "-P", str(_WORDLISTS / "passwords.txt"), "-f", "-t", "4", "-e", "nsr",
           ip, service]

    try:
        result = subprocess.run(cmd, capture_output=True, text=True, timeout=300)
        return {"result": result.stdout or result.stderr}
    except subprocess.TimeoutExpired:
        return {"result": "[TIMEOUT] hydra exceeded time limit."}
    except Exception as e:
        return {"result": f"[ERROR] hydra failed: {str(e)}"}

