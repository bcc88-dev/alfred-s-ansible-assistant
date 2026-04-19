import { useMemo, useState } from "react";
import { Inventory, Host } from "@/lib/alfred-types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Users, CheckSquare, Square, Pencil, Trash2, RefreshCw, FolderTree } from "lucide-react";
import { StatusDot } from "./StatusDot";
import { HostDialog } from "./HostDialog";
import { addGroup, allHosts, deleteHost, upsertHost } from "@/lib/inventory-store";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface Props {
  inventory: Inventory;
  setInventory: (i: Inventory) => void;
  selected: Set<string>;
  setSelected: (s: Set<string>) => void;
  cursor: string | null;
  setCursor: (id: string | null) => void;
  onProbe: () => void;
  onOpenTerminal: (h: Host) => void;
}

export function InventoryPanel({
  inventory, setInventory, selected, setSelected, cursor, setCursor, onProbe, onOpenTerminal,
}: Props) {
  const [pathDraft, setPathDraft] = useState(inventory.path);
  const [editing, setEditing] = useState<Host | undefined>();
  const [adding, setAdding] = useState(false);

  const groups = Object.keys(inventory.groups);
  const hosts = useMemo(() => allHosts(inventory), [inventory]);

  const toggle = (id: string) => {
    const next = new Set(selected);
    next.has(id) ? next.delete(id) : next.add(id);
    setSelected(next);
  };
  const selectAll = () => setSelected(new Set(hosts.map((h) => h.id)));
  const clearAll = () => setSelected(new Set());
  const selectGroup = (g: string) => {
    const next = new Set(selected);
    inventory.groups[g].forEach((id) => next.add(id));
    setSelected(next);
  };

  const onSave = (h: Host) => {
    setInventory(upsertHost(inventory, h));
    toast.success(`${editing ? "Updated" : "Added"} ${h.name}`);
  };
  const onDelete = (id: string) => {
    setInventory(deleteHost(inventory, id));
    const next = new Set(selected); next.delete(id); setSelected(next);
    toast.success(`Deleted ${id}`);
  };

  const newGroup = () => {
    const name = prompt("New group name:");
    if (name) setInventory(addGroup(inventory, name.trim()));
  };

  return (
    <div className="flex h-full flex-col bg-card/40">
      {/* Header */}
      <div className="flex items-center gap-2 border-b border-border px-3 py-2 bg-butler">
        <FolderTree className="h-4 w-4 text-primary" />
        <h2 className="text-sm font-semibold tracking-wide text-primary">Inventory</h2>
        <span className="ml-auto rounded bg-secondary px-1.5 py-0.5 font-mono text-[11px] text-muted-foreground">
          {hosts.length} hosts · {groups.length} groups
        </span>
      </div>

      {/* Path bar */}
      <div className="flex items-center gap-2 border-b border-border px-3 py-2">
        <Input
          value={pathDraft}
          onChange={(e) => setPathDraft(e.target.value)}
          onBlur={() => setInventory({ ...inventory, path: pathDraft })}
          className="h-8 font-mono text-xs"
          placeholder="/etc/ansible/hosts.ini"
        />
        <Button variant="outline" size="icon" className="h-8 w-8" onClick={onProbe} title="Probe ICMP + SSH">
          <RefreshCw className="h-3.5 w-3.5" />
        </Button>
      </div>

      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-1 border-b border-border px-2 py-1.5">
        <Button size="sm" variant="outline" className="h-7 gap-1 border-primary/40 text-primary hover:bg-primary/10" onClick={() => setAdding(true)}>
          <Plus className="h-3 w-3" /> Host
        </Button>
        <Button size="sm" variant="outline" className="h-7 gap-1 border-accent/40 text-accent hover:bg-accent/10" onClick={newGroup}>
          <Users className="h-3 w-3" /> Group
        </Button>
        <Button size="sm" variant="ghost" className="h-7 gap-1 text-status-up" onClick={selectAll}>
          <CheckSquare className="h-3 w-3" /> All
        </Button>
        <Button size="sm" variant="ghost" className="h-7 gap-1 text-destructive" onClick={clearAll}>
          <Square className="h-3 w-3" /> None
        </Button>
        <Button size="sm" variant="ghost" className="h-7 gap-1" disabled={!cursor} onClick={() => cursor && setEditing(inventory.hosts[cursor])}>
          <Pencil className="h-3 w-3" /> Edit
        </Button>
        <Button size="sm" variant="ghost" className="h-7 gap-1 text-destructive" disabled={!cursor} onClick={() => cursor && confirm(`Delete ${cursor}?`) && onDelete(cursor)}>
          <Trash2 className="h-3 w-3" />
        </Button>
      </div>

      {/* Group chips */}
      {groups.length > 0 && (
        <div className="flex flex-wrap gap-1 border-b border-border px-2 py-2">
          {groups.map((g) => (
            <button
              key={g}
              onClick={() => selectGroup(g)}
              className="rounded border border-primary/30 bg-primary/5 px-2 py-0.5 font-mono text-[11px] text-primary hover:bg-primary/15 transition-colors"
            >
              ▸ {g} <span className="text-muted-foreground">({inventory.groups[g].length})</span>
            </button>
          ))}
        </div>
      )}

      {/* Table */}
      <div className="flex-1 overflow-auto">
        <table className="w-full font-mono text-xs">
          <thead className="sticky top-0 z-10 bg-card/95 backdrop-blur">
            <tr className="border-b border-border text-left text-accent">
              <th className="px-2 py-1.5 font-semibold">●</th>
              <th className="px-2 py-1.5 font-semibold">Host</th>
              <th className="px-2 py-1.5 font-semibold">IP</th>
              <th className="px-2 py-1.5 font-semibold">User</th>
              <th className="px-2 py-1.5 font-semibold">Group</th>
              <th className="px-2 py-1.5 font-semibold">Venv</th>
              <th className="px-2 py-1.5 font-semibold">St</th>
            </tr>
          </thead>
          <tbody>
            {hosts.map((h) => {
              const sel = selected.has(h.id);
              const cur = cursor === h.id;
              return (
                <tr
                  key={h.id}
                  onClick={() => { setCursor(h.id); toggle(h.id); }}
                  onDoubleClick={() => onOpenTerminal(h)}
                  className={cn(
                    "cursor-pointer border-b border-border/50 hover:bg-secondary/40 transition-colors",
                    cur && "bg-primary/10",
                  )}
                >
                  <td className="px-2 py-1.5">
                    {sel ? <span className="text-primary">●</span> : <span className="text-muted-foreground">○</span>}
                  </td>
                  <td className="px-2 py-1.5 text-foreground">{h.name}</td>
                  <td className="px-2 py-1.5 text-muted-foreground">{h.ip}</td>
                  <td className="px-2 py-1.5 text-muted-foreground">{h.user}</td>
                  <td className="px-2 py-1.5"><span className="text-accent">{h.group}</span></td>
                  <td className="px-2 py-1.5 text-muted-foreground">{h.venv ?? "—"}</td>
                  <td className="px-2 py-1.5"><StatusDot status={h.status} /></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Selection summary */}
      <div className="border-t border-border bg-card/60 px-3 py-2 text-xs">
        {selected.size === 0
          ? <span className="text-muted-foreground">no hosts selected · click a row to toggle · double-click to open terminal</span>
          : <span><span className="text-primary font-semibold">{selected.size}</span> <span className="text-muted-foreground">selected</span></span>}
      </div>

      <HostDialog
        open={adding || !!editing}
        onOpenChange={(o) => { if (!o) { setAdding(false); setEditing(undefined); } }}
        initial={editing}
        groups={groups.length ? groups : ["all"]}
        onSave={onSave}
      />
    </div>
  );
}
