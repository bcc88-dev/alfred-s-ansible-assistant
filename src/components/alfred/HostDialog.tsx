import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Host } from "@/lib/alfred-types";

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  initial?: Host;
  groups: string[];
  onSave: (h: Host) => void;
}

export function HostDialog({ open, onOpenChange, initial, groups, onSave }: Props) {
  const [h, setH] = useState<Host>(
    initial ?? {
      id: "", name: "", ip: "", user: "root", port: 22,
      group: groups[0] ?? "all", connection: "ssh", status: "unknown", venv: "ansible-3.12",
    },
  );

  const set = <K extends keyof Host>(k: K, v: Host[K]) => setH((p) => ({ ...p, [k]: v }));
  const submit = () => {
    if (!h.name.trim() || !h.ip.trim()) return;
    onSave({ ...h, id: h.id || h.name.trim() });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-card border-border">
        <DialogHeader>
          <DialogTitle className="font-mono text-primary">
            {initial ? "── Edit Host ──" : "── Add Host ──"}
          </DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-3">
          <div className="col-span-2">
            <Label className="text-muted-foreground">Name</Label>
            <Input value={h.name} onChange={(e) => set("name", e.target.value)} placeholder="web-03" className="font-mono" />
          </div>
          <div className="col-span-2">
            <Label className="text-muted-foreground">IP / hostname</Label>
            <Input value={h.ip} onChange={(e) => set("ip", e.target.value)} placeholder="192.168.1.5" className="font-mono" />
          </div>
          <div>
            <Label className="text-muted-foreground">SSH user</Label>
            <Input value={h.user} onChange={(e) => set("user", e.target.value)} className="font-mono" />
          </div>
          <div>
            <Label className="text-muted-foreground">Port</Label>
            <Input type="number" value={h.port} onChange={(e) => set("port", Number(e.target.value) || 22)} className="font-mono" />
          </div>
          <div>
            <Label className="text-muted-foreground">Group</Label>
            <Input value={h.group} onChange={(e) => set("group", e.target.value)} className="font-mono" list="alfred-groups" />
            <datalist id="alfred-groups">{groups.map((g) => <option key={g} value={g} />)}</datalist>
          </div>
          <div>
            <Label className="text-muted-foreground">Connection</Label>
            <Select value={h.connection} onValueChange={(v) => set("connection", v as Host["connection"])}>
              <SelectTrigger className="font-mono"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="ssh">ssh</SelectItem>
                <SelectItem value="local">local</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="col-span-2">
            <Label className="text-muted-foreground">Python venv (label)</Label>
            <Input value={h.venv ?? ""} onChange={(e) => set("venv", e.target.value)} placeholder="ansible-3.12" className="font-mono" />
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={submit} className="bg-primary text-primary-foreground hover:bg-primary/90">Save</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
