# CLAUDE.md

## Project Overview
A penetration testing web application for small businesses.
Scans a server for vulnerabilities and returns a plain english report.
Built for non-technical business owners with zero cybersecurity background.

## Target User
Small business owners — they built or hired someone to build their app.
They do not know what nmap or CVE means. Everything must be in plain english.

## Tech Stack
- Framework: React 19 + Vite 8
- Language: JavaScript (ESM) — no TypeScript
- Styling: Tailwind CSS v4 via @tailwindcss/vite plugin
- Animation: Framer Motion
- Routing: React Router v7 (BrowserRouter)
- Font: Mono font for terminal elements (e.g. JetBrains Mono or Fira Code)
        Clean sans-serif for all business-facing UI copy

## File Structure
pentest-mcp/
└── frontend/
    ├── index.html
    ├── vite.config.js
    ├── src/
    │   ├── main.jsx               # Entry point — BrowserRouter + Routes
    │   ├── index.css              # Tailwind import + global resets
    │   ├── pages/
    │   │   ├── Home.jsx           # Homepage — terminal intro + split screen
    │   │   └── Scan.jsx           # Scan input page (chat interface)
    │   ├── components/
    │   │   ├── intro/
    │   │   │   └── TerminalIntro.jsx  # Full screen terminal intro sequence
    │   │   ├── homepage/
    │   │   │   ├── ScanFeed.jsx         # Left panel — scrolling live scan feed
    │   │   │   ├── HeroPanel.jsx        # Right panel — app name + Get Started
    │   │   │   └── ShaderBackground.jsx # GLSL shader background (Phase 2 only)
    │   │   └── WarningModal.jsx   # Authorization confirmation modal
    │   └── lib/
    │       └── scanFeedData.js    # Realistic pre-written scan output dataset
    └── CLAUDE.md                  # This file — always refer here first

## Route Map
/ (src/pages/Home.jsx)        → Homepage (terminal intro + split screen)
/scan (src/pages/Scan.jsx)    → Scan input page — chat interface with backend

## Rules
- ALWAYS read CLAUDE.md before creating or modifying any file
- NEVER create files outside the structure above without updating CLAUDE.md
- All files must be .jsx and .js — no .tsx or .ts anywhere
- No hardcoded colors — Tailwind classes only (inline styles permitted for
  values not expressible as Tailwind classes, e.g. radial gradients)
- No made up statistics, fake CVE IDs, or invented data anywhere in the UI
- All CVE IDs used in scanFeedData.js must be real entries from the NVD database
- Mono font strictly for terminal/scan elements only
- Sans-serif strictly for all human-readable UI copy
- Framer Motion for every animation — no CSS keyframes
