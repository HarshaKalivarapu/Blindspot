"""
example_reader.py — Example Passive Tool
------------------------------------------
Passive tools are read-only — they observe, query, or return data
without modifying any state.

This file demonstrates the skeleton for a passive tool.
Replace the logic inside `run()` with your own implementation.
"""

from typing import Any


# Tool metadata read by the MCP server at registration time
TOOL_NAME = "example_reader"
TOOL_DESCRIPTION = "An example passive tool that reads and returns a piece of data."


def run(params: dict[str, Any]) -> dict[str, Any]:
    """
    Entry point called by the MCP server when this tool is invoked.

    Args:
        params: Dictionary of input parameters sent by the MCP client.
                Expected keys:
                    - key (str): The data key to look up.

    Returns:
        A dictionary with the tool's output, e.g.:
            {"value": "some data"}
    """
    key = params.get("key", "")

    # -------------------------------------------------------------------
    # TODO: Replace this with your actual read / query logic.
    # Example ideas:
    #   - Query a database
    #   - Read a config file
    #   - Fetch a URL and return its contents
    # -------------------------------------------------------------------
    mock_store = {
        "status": "ok",
        "version": "0.1.0",
    }

    value = mock_store.get(key, f"No data found for key '{key}'")

    return {"value": value}
