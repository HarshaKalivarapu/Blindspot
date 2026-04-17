"""
example_command.py — Example Active Tool
-----------------------------------------
Active tools are MCP tools that *do* something — they run commands,
write files, call APIs, etc.

This file demonstrates the skeleton for an active tool.
Replace the logic inside `run()` with your own implementation.
"""

from typing import Any


# Tool metadata read by the MCP server at registration time
TOOL_NAME = "example_command"
TOOL_DESCRIPTION = "An example active tool that echoes a message back to the caller."


def run(params: dict[str, Any]) -> dict[str, Any]:
    """
    Entry point called by the MCP server when this tool is invoked.

    Args:
        params: Dictionary of input parameters sent by the MCP client.
                Expected keys:
                    - message (str): The text to echo.

    Returns:
        A dictionary with the tool's output, e.g.:
            {"result": "Echo: hello world"}
    """
    message = params.get("message", "")

    # -------------------------------------------------------------------
    # TODO: Replace this with your actual command / action logic.
    # Example ideas:
    #   - Run a subprocess: subprocess.run(["git", "status"], capture_output=True)
    #   - Call an external API
    #   - Write a file to disk
    # -------------------------------------------------------------------
    result = f"Echo: {message}"

    return {"result": result}
