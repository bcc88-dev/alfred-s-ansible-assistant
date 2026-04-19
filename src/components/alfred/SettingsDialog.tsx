import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Settings as SettingsIcon, Download } from "lucide-react";
import { Settings } from "@/lib/alfred-settings";

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  settings: Settings;
  setSettings: (s: Settings) => void;
}

const RELAY_SCRIPT_URL = "/alfred-relay.py";

export function SettingsDialog({ open, onOpenChange, settings, setSettings }: Props) {
  const set = <K extends keyof Settings>(k: K, v: Settings[K]) => setSettings({ ...settings, [k]: v });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl bg-card border-border">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 font-mono text-accent">
            <SettingsIcon className="h-4 w-4" /> Alfred Settings
          </DialogTitle>
          <DialogDescription>
            Configure where Alfred thinks (AI provider) and how he reaches your hosts (relay).
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label className="text-muted-foreground">AI Provider</Label>
            <Select value={settings.provider} onValueChange={(v) => set("provider", v as Settings["provider"])}>
              <SelectTrigger className="font-mono"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="ollama">Local Ollama (browser → localhost)</SelectItem>
                <SelectItem value="lovable">Lovable AI Gateway (requires Cloud)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {settings.provider === "ollama" && (
            <div className="grid grid-cols-2 gap-3 rounded border border-border p-3">
              <div className="col-span-2">
                <Label className="text-muted-foreground">Ollama URL</Label>
                <Input value={settings.ollamaUrl} onChange={(e) => set("ollamaUrl", e.target.value)} className="font-mono" />
              </div>
              <div className="col-span-2">
                <Label className="text-muted-foreground">Model</Label>
                <Input value={settings.ollamaModel} onChange={(e) => set("ollamaModel", e.target.value)} className="font-mono" placeholder="llama3.1" />
              </div>
              <p className="col-span-2 text-[11px] text-muted-foreground">
                Tip: run <code className="text-accent">OLLAMA_ORIGINS="*" ollama serve</code> so the browser can reach it.
              </p>
            </div>
          )}

          <div>
            <Label className="text-muted-foreground">Local Relay WebSocket</Label>
            <Input value={settings.relayUrl} onChange={(e) => set("relayUrl", e.target.value)} className="font-mono" placeholder="ws://localhost:8765" />
            <div className="mt-2 flex items-center justify-between rounded border border-border bg-secondary/30 px-3 py-2 text-xs">
              <span className="text-muted-foreground">
                Run <code className="text-accent">alfred-relay.py</code> on your control node so Alfred can actually execute commands.
              </span>
              <a href={RELAY_SCRIPT_URL} download className="ml-2 inline-flex items-center gap-1 text-primary hover:underline">
                <Download className="h-3 w-3" /> Download
              </a>
            </div>
          </div>

          <div className="flex items-center justify-between rounded border border-border p-3">
            <div>
              <Label>Auto-run Alfred's suggestions</Label>
              <p className="text-[11px] text-muted-foreground">When off, suggestions become click-to-run cards (recommended).</p>
            </div>
            <Switch checked={settings.autoRunSuggestions} onCheckedChange={(v) => set("autoRunSuggestions", v)} />
          </div>
        </div>

        <div className="flex justify-end">
          <Button onClick={() => onOpenChange(false)} className="bg-primary text-primary-foreground hover:bg-primary/90">Done</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
