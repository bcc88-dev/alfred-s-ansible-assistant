
## Alfred — Web Ansible Orchestrator (v1)

A faithful web reimagining of your Textual TUI, with a real browser SSH terminal so Alfred can actually drive sessions — not simulate them.

### Layout (3-column, terminal/butler hybrid)
- **Left — Inventory** (live from a watched path)
  - Header bar shows the active inventory path + Refresh / Change-path buttons
  - Auto-discovered table: `● | Host | IP | User | Group | Venv | Status`
  - Status column = live ICMP + SSH probe (green / amber / red dot)
  - Row click = toggle select; group buttons = bulk select
  - Add / Edit / Delete still available, writes back to the same file
- **Middle — Playbooks & Quick Actions** (your beloved dropdown stays)
  - Big labeled `Select playbook…` dropdown + "▶ Run Playbook" button
  - Quick Action buttons (clearly labeled, color-coded, with icons & tooltips):
    ICMP Ping · SSH Check · Disk · Memory · CPU · Uptime · Open Ports · Who · Gather Facts · Update Packages · Reboot
  - Each button shows the exact ansible command on hover
- **Right — Alfred Chat + Live Terminal** (tabbed)
  - **Chat tab**: butler avatar, formal greetings, streaming responses, `<CMD>` / `<PLAYBOOK>` blocks rendered as runnable cards with one-click "Execute on selected hosts"
  - **Terminal tab**: full xterm.js SSH session to the focused host (Guacamole-style VDI in the browser)
  - Tabs per open host, copy-paste, resize, reconnect

### How the backend actually does the work
A small **Lovable Cloud edge function bridge** plus a documented **local relay** the user runs once on their control node:
1. Edge function `/orchestrate` receives the action + selected hosts + inventory path
2. Forwards over an authenticated WebSocket to the user's local relay (open-source script we generate, ~80 lines of Python)
3. Relay runs `ansible`, `ansible-playbook`, `ping`, or opens an SSH PTY and streams stdout back
4. Browser renders streamed output into Chat log or xterm Terminal

The relay is what reads the inventory file path, watches it for changes, and pushes the host list to the UI — giving you the "permanent path the app discovers" behavior you asked for.

### Auth (Tailscale-style SSO/MFA you mentioned)
- Lovable Cloud auth: email/password + Google OAuth out of the box
- Relay pairs to your account with a one-time token; only your authenticated session can drive it
- (Tailscale IDP can sit in front later — same WebSocket, just behind tsnet)

### Alfred (AI)
- Default: **Lovable AI gateway** (no setup, streaming, free tier)
- Settings toggle: **Local Ollama URL** (defaults to `http://localhost:11434`, model picker)
- System prompt is your existing `ALFRED_SYSTEM` — formal "sir", `<CMD>` / `<PLAYBOOK>` tags
- Tag detection in the UI converts suggestions into clickable execute cards instead of auto-running (safer; one click = run)

### Visual style — "Hybrid Butler"
- Dark slate canvas, monospace for output & commands, sans for chrome
- Accent palette: butler-green `#4ec994`, terminal-cyan `#39d5ff`, alert-amber, soft-purple for Alfred
- Subtle scanline / glow on the terminal panel, animated caret in chat, status dots pulse
- Polished cards & rounded borders so it doesn't feel "empty" — every panel has a header, a count, and live state
- Fully responsive: 3-col → 2-col → stacked with bottom nav on mobile

### What ships in v1 (after plan approval)
1. Full UI with all three panels, dropdowns, quick-action buttons, chat
2. Lovable Cloud + email/Google auth + inventory persistence
3. Alfred chat via Lovable AI (streaming) with Ollama toggle in Settings
4. xterm.js terminal panel wired to the relay protocol
5. Edge function `/orchestrate` + downloadable `alfred-relay.py` script with setup instructions
6. Inventory file watcher: paste a path, app shows live hosts + status

### Out of scope for v1 (easy follow-ups)
- Tailscale IDP enforcement on the relay
- Playbook editor / library beyond the 8 built-ins
- Run history & audit log
- Multi-user team workspaces
