"""
orchestrator.py — Flask HTTP API that bridges the React UI and Claude.

Endpoints:
    GET  /health       → liveness probe
    POST /chat         → { "message": "..." } → { "reply": "..." }

Run:
    python orchestrator.py
"""

import os
import sys

from dotenv import load_dotenv
from flask import Flask, jsonify, request
from flask_cors import CORS
from anthropic import Anthropic

load_dotenv()

ANTHROPIC_API_KEY = os.environ.get("ANTHROPIC_API_KEY")
MODEL = os.environ.get("ANTHROPIC_MODEL", "claude-sonnet-4-6")
PORT = int(os.environ.get("PORT", "5000"))

if not ANTHROPIC_API_KEY:
    print(
        "ANTHROPIC_API_KEY is not set. Copy backend/.env.example to backend/.env "
        "and fill it in.",
        file=sys.stderr,
    )

app = Flask(__name__)
CORS(app)

client = Anthropic(api_key=ANTHROPIC_API_KEY) if ANTHROPIC_API_KEY else None


@app.get("/health")
def health():
    return jsonify(status="ok", model=MODEL, key_loaded=bool(ANTHROPIC_API_KEY))


@app.post("/chat")
def chat():
    if client is None:
        return jsonify(error="server missing ANTHROPIC_API_KEY"), 500

    data = request.get_json(silent=True) or {}
    message = (data.get("message") or "").strip()
    if not message:
        return jsonify(error="message is required"), 400

    response = client.messages.create(
        model=MODEL,
        max_tokens=1024,
        messages=[{"role": "user", "content": message}],
    )

    reply = "".join(
        block.text for block in response.content if getattr(block, "type", "") == "text"
    )
    return jsonify(reply=reply)


if __name__ == "__main__":
    app.run(host="127.0.0.1", port=PORT, debug=True)
