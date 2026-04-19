import { Host } from "./alfred-types";
import { Settings } from "./alfred-settings";

export type RelayEvent =
  | { type: "open" }
  | { type: "stdout"; data: string }
  | { type: "stderr"; data: string }
  | { type: "exit"; code: number }
  | { type: "error"; message: string };

export interface RelayClient {
  send: (cmd: string) => void;
  close: () => void;
}

/** Connects to the local relay (alfred-relay.py). Falls back to a friendly error if not reachable. */
export function runOnRelay(
  settings: Settings,
  payload: { kind: "cmd" | "playbook" | "ssh" | "ping"; data: string; hosts: Host[]; inventoryPath: string },
  onEvent: (e: RelayEvent) => void,
): RelayClient | null {
  let ws: WebSocket;
  try {
    ws = new WebSocket(settings.relayUrl);
  } catch (e) {
    onEvent({ type: "error", message: `Cannot connect to relay at ${settings.relayUrl}` });
    return null;
  }

  ws.onopen = () => {
    onEvent({ type: "open" });
    ws.send(JSON.stringify({ ...payload, hosts: payload.hosts.map((h) => ({
      name: h.name, ip: h.ip, user: h.user, port: h.port, connection: h.connection,
    })) }));
  };
  ws.onmessage = (ev) => {
    try {
      const msg = JSON.parse(ev.data);
      onEvent(msg);
    } catch {
      onEvent({ type: "stdout", data: String(ev.data) });
    }
  };
  ws.onerror = () => onEvent({ type: "error", message: `Relay connection failed (${settings.relayUrl}). Run alfred-relay.py on your control node.` });
  ws.onclose = () => onEvent({ type: "exit", code: 0 });

  return {
    send: (cmd) => { try { ws.send(JSON.stringify({ type: "stdin", data: cmd })); } catch {} },
    close: () => { try { ws.close(); } catch {} },
  };
}

/** Demo simulator — when no relay is configured, fakes plausible streaming output. */
export function runSimulated(
  payload: { kind: "cmd" | "playbook" | "ping"; data: string; hosts: Host[] },
  onEvent: (e: RelayEvent) => void,
): RelayClient {
  let cancelled = false;
  const lines: string[] = [];
  if (payload.kind === "ping") {
    for (const h of payload.hosts) {
      if (h.connection === "local" || h.ip === "127.0.0.1") {
        lines.push(`● ${h.name} (${h.ip}) — reachable  rtt min/avg/max = 0.04/0.05/0.07 ms`);
      } else {
        const ok = Math.random() > 0.25;
        lines.push(ok
          ? `● ${h.name} (${h.ip}) — reachable  rtt min/avg/max = 12.1/14.3/18.7 ms`
          : `○ ${h.name} (${h.ip}) — UNREACHABLE (ICMP)`);
      }
    }
  } else if (payload.kind === "cmd") {
    lines.push(`$ ${payload.data}`);
    for (const h of payload.hosts) {
      const ok = Math.random() > 0.15;
      lines.push(ok
        ? `${h.name} | SUCCESS | rc=0 >>`
        : `${h.name} | UNREACHABLE! => {"changed": false, "msg": "ssh: connect to host ${h.ip} timed out"}`);
      if (ok) lines.push(`  (simulated output for: ${payload.data})`);
    }
  } else {
    lines.push(`PLAY [generated playbook] *********************************************`);
    for (const h of payload.hosts) {
      lines.push(`TASK [Gathering Facts] ************************************************`);
      lines.push(`ok: [${h.name}]`);
      lines.push(`changed: [${h.name}]`);
    }
    lines.push(`PLAY RECAP ************************************************************`);
    for (const h of payload.hosts) {
      lines.push(`${h.name.padEnd(20)} : ok=2  changed=1  unreachable=0  failed=0`);
    }
  }

  setTimeout(() => onEvent({ type: "open" }), 50);
  let i = 0;
  const tick = () => {
    if (cancelled) return;
    if (i >= lines.length) { onEvent({ type: "exit", code: 0 }); return; }
    onEvent({ type: "stdout", data: lines[i++] + "\n" });
    setTimeout(tick, 80 + Math.random() * 120);
  };
  setTimeout(tick, 200);

  return {
    send: () => {},
    close: () => { cancelled = true; },
  };
}
