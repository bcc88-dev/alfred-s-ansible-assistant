import { useEffect, useMemo, useRef, useState } from "react";
import { Inventory, Host, QuickAction } from "@/lib/alfred-types";
import { allHosts, loadInventory, saveInventory } from "@/lib/inventory-store";
import { loadSettings, saveSettings, Settings } from "@/lib/alfred-settings";
import { runOnRelay, RelayClient, RelayEvent } from "@/lib/relay-client";
import { ParsedSuggestion } from "@/lib/alfred-ai";
import { InventoryPanel } from "@/components/alfred/InventoryPanel";
import { ActionsPanel } from "@/components/alfred/ActionsPanel";
import { AlfredPanel } from "@/components/alfred/AlfredPanel";
import { SettingsDialog } from "@/components/alfred/SettingsDialog";
import { Button } from "@/components/ui/button";
import { Settings as SettingsIcon, ServerCog, Wifi, WifiOff } from "lucide-react";
import { toast } from "sonner";

const VERSION = "1.0.0";

const Index = () => {
  const [inventory, setInventoryState] = useState<Inventory>(() => loadInventory());
  const [settings, setSettingsState] = useState<Settings>(() => loadSettings());
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [cursor, setCursor] = useState<string | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [relayUp, setRelayUp] = useState(false);
  const [activeTermHost, setActiveTermHost] = useState<Host | null>(null);

  const termFeedRef = useRef<((d: string) => void) | null>(null);
  const activeRunRef = useRef<RelayClient | null>(null);

  const setInventory = (i: Inventory) => { setInventoryState(i); saveInventory(i); };
  const setSettings  = (s: Settings)  => { setSettingsState(s);  saveSettings(s); };

  // SEO
  useEffect(() => {
    document.title = "Alfred — Web Ansible Orchestrator TUI";
    const meta = document.querySelector('meta[name="description"]') ?? (() => {
      const m = document.createElement("meta"); m.setAttribute("name", "description"); document.head.appendChild(m); return m;
    })();
    meta.setAttribute("content", "Alfred: a butler-grade web TUI for orchestrating Ansible — live inventory, quick actions, AI chat, and an in-browser SSH terminal.");
    let canon = document.querySelector('link[rel="canonical"]');
    if (!canon) { canon = document.createElement("link"); canon.setAttribute("rel", "canonical"); document.head.appendChild(canon); }
    canon.setAttribute("href", window.location.origin + "/");
  }, []);

  // Relay heartbeat
  useEffect(() => {
    let cancel = false;
    const probe = () => {
      try {
        const ws = new WebSocket(settings.relayUrl);
        const timer = setTimeout(() => { try { ws.close(); } catch {} if (!cancel) setRelayUp(false); }, 1500);
        ws.onopen = () => { clearTimeout(timer); if (!cancel) setRelayUp(true); ws.close(); };
        ws.onerror = () => { clearTimeout(timer); if (!cancel) setRelayUp(false); };
      } catch { if (!cancel) setRelayUp(false); }
    };
    probe();
    const id = setInterval(probe, 8000);
    return () => { cancel = true; clearInterval(id); };
  }, [settings.relayUrl]);

  const selectedHosts = useMemo(
    () => allHosts(inventory).filter((h) => selected.has(h.id)),
    [inventory, selected],
  );

  const writeTerm = (s: string) => termFeedRef.current?.(s.replace(/\n/g, "\r\n"));

  const dispatch = (
    payload: { kind: "cmd" | "playbook" | "ping"; data: string },
    label: string,
  ) => {
    if (selectedHosts.length === 0 && payload.kind !== "ping") {
      toast.error("Select hosts first, sir.");
      return;
    }
    activeRunRef.current?.close();
    writeTerm(`\r\n\x1b[33m▶ ${label}\x1b[0m\r\n`);

    const onEvent = (e: RelayEvent) => {
      if (e.type === "stdout" || e.type === "stderr") writeTerm(e.data);
      else if (e.type === "exit") writeTerm(`\r\n\x1b[32m✓ exit ${e.code}\x1b[0m\r\n`);
      else if (e.type === "error") { writeTerm(`\r\n\x1b[31m✗ ${e.message}\x1b[0m\r\n`); toast.error(e.message); }
    };

    if (!relayUp) {
      const msg = `Relay offline at ${settings.relayUrl}. Run alfred-relay.py on your control node, sir.`;
      writeTerm(`\r\n\x1b[31m✗ ${msg}\x1b[0m\r\n`);
      toast.error(msg);
      return;
    }
    activeRunRef.current = runOnRelay(
      settings,
      { ...payload, hosts: selectedHosts.length ? selectedHosts : allHosts(inventory).slice(0, 1), inventoryPath: inventory.path },
      onEvent,
    );
  };

  const onProbe = () => {
    if (!relayUp) {
      toast.error(`Relay offline at ${settings.relayUrl}. Cannot probe hosts.`);
      return;
    }
    dispatch({ kind: "ping", data: "ping" }, `ICMP probe — ${(selectedHosts.length || allHosts(inventory).length)} host(s)`);
  };

  const onQuickAction = (a: QuickAction) => {
    if (a.id === "icmp") return dispatch({ kind: "ping", data: "ping" }, "ICMP Ping");
    const cmd = a.cmd.replace("$INV", inventory.path);
    dispatch({ kind: a.id === "update" || a.id === "reboot" ? "playbook" : "cmd", data: cmd }, a.label);
  };

  const onRunPlaybook = (id: string) =>
    dispatch({ kind: "playbook", data: id }, `Playbook: ${id}`);

  const onExecuteSuggestion = (s: ParsedSuggestion) => {
    if (s.kind === "cmd") {
      const cmd = s.raw.replace(/\$INV/g, inventory.path);
      dispatch({ kind: "cmd", data: cmd }, "Alfred suggestion");
    } else {
      dispatch({ kind: "playbook", data: s.raw }, "Alfred playbook");
    }
  };

  const onOpenTerminal = (h: Host) => {
    setActiveTermHost(h);
    writeTerm(`\r\n\x1b[35m── Opening session: ${h.user}@${h.ip}:${h.port} ──\x1b[0m\r\n`);
    if (!relayUp) writeTerm(`\x1b[90mLocal relay not reachable at ${settings.relayUrl}. SSH PTY requires alfred-relay.py to be running.\x1b[0m\r\n`);
    else writeTerm(`\x1b[90m(relay session would attach here)\x1b[0m\r\n`);
  };

  return (
    <main className="flex h-screen w-screen flex-col bg-background text-foreground">
      {/* Top bar */}
      <header className="flex h-12 shrink-0 items-center gap-3 border-b border-border bg-card/60 px-4 backdrop-blur">
        <div className="flex items-center gap-2">
          <ServerCog className="h-5 w-5 text-primary glow-primary" />
          <h1 className="font-mono text-sm font-bold tracking-wider">
            <span className="text-primary">⬡ alfred</span>
            <span className="text-muted-foreground"> · web ansible orchestrator</span>
          </h1>
        </div>
        <span className="hidden sm:inline rounded bg-secondary px-2 py-0.5 font-mono text-[11px] text-muted-foreground">
          v{VERSION}
        </span>
        <div className="ml-auto flex items-center gap-3">
          <div className={`flex items-center gap-1.5 rounded border px-2 py-1 text-[11px] font-mono ${relayUp ? "border-status-up/40 text-status-up" : "border-status-down/40 text-status-down"}`}>
            {relayUp ? <Wifi className="h-3 w-3" /> : <WifiOff className="h-3 w-3" />}
            relay {relayUp ? "online" : "offline"}
          </div>
          <Button variant="ghost" size="sm" onClick={() => setSettingsOpen(true)} className="gap-2">
            <SettingsIcon className="h-4 w-4" /> Settings
          </Button>
        </div>
      </header>

      {/* 3-column workspace */}
      <div className="grid min-h-0 flex-1 grid-cols-1 lg:grid-cols-[minmax(320px,420px)_minmax(260px,320px)_1fr]">
        <section className="border-b border-border lg:border-b-0 lg:border-r min-h-[320px]">
          <InventoryPanel
            inventory={inventory}
            setInventory={setInventory}
            selected={selected}
            setSelected={setSelected}
            cursor={cursor}
            setCursor={setCursor}
            onProbe={onProbe}
            onOpenTerminal={onOpenTerminal}
          />
        </section>
        <section className="border-b border-border lg:border-b-0 lg:border-r min-h-[260px]">
          <ActionsPanel
            selectedCount={selected.size}
            onRunPlaybook={onRunPlaybook}
            onQuickAction={onQuickAction}
          />
        </section>
        <section className="min-h-[320px]">
          <AlfredPanel
            settings={settings}
            selectedHosts={selectedHosts}
            inventoryPath={inventory.path}
            onOpenSettings={() => setSettingsOpen(true)}
            onExecuteSuggestion={onExecuteSuggestion}
            termFeedRef={termFeedRef}
            activeTermHost={activeTermHost}
          />
        </section>
      </div>

      <SettingsDialog open={settingsOpen} onOpenChange={setSettingsOpen} settings={settings} setSettings={setSettings} />
    </main>
  );
};

export default Index;
