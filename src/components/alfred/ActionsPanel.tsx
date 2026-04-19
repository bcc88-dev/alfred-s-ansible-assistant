import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { PLAYBOOKS, QUICK_ACTIONS, QuickAction } from "@/lib/alfred-types";
import { Play, Sparkles } from "lucide-react";
import { useState } from "react";
import * as Icons from "lucide-react";
import { cn } from "@/lib/utils";

const toneClass: Record<QuickAction["tone"], string> = {
  cyan:   "border-accent/40 text-accent hover:bg-accent/10 hover:border-accent",
  green:  "border-primary/40 text-primary hover:bg-primary/10 hover:border-primary",
  amber:  "border-warn/40 text-warn hover:bg-warn/10 hover:border-warn",
  purple: "border-alfred/40 text-alfred hover:bg-alfred/10 hover:border-alfred",
  red:    "border-destructive/40 text-destructive hover:bg-destructive/10 hover:border-destructive",
  teal:   "border-accent/30 text-accent/90 hover:bg-accent/10",
};

interface Props {
  selectedCount: number;
  onRunPlaybook: (id: string) => void;
  onQuickAction: (a: QuickAction) => void;
}

export function ActionsPanel({ selectedCount, onRunPlaybook, onQuickAction }: Props) {
  const [pb, setPb] = useState<string>("");

  return (
    <TooltipProvider delayDuration={300}>
      <div className="flex h-full flex-col bg-card/40">
        <div className="flex items-center gap-2 border-b border-border px-3 py-2 bg-butler">
          <Sparkles className="h-4 w-4 text-accent" />
          <h2 className="text-sm font-semibold tracking-wide text-accent">Playbooks &amp; Quick Actions</h2>
          <span className="ml-auto rounded bg-secondary px-1.5 py-0.5 font-mono text-[11px] text-muted-foreground">
            {selectedCount} target{selectedCount === 1 ? "" : "s"}
          </span>
        </div>

        <div className="space-y-3 overflow-auto p-3">
          {/* Playbook selector */}
          <div className="rounded-lg border border-border bg-card/60 p-3">
            <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Playbook
            </label>
            <Select value={pb} onValueChange={setPb}>
              <SelectTrigger className="font-mono">
                <SelectValue placeholder="Select playbook…" />
              </SelectTrigger>
              <SelectContent>
                {PLAYBOOKS.map((p) => (
                  <SelectItem key={p.id} value={p.id} className="font-mono">{p.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              onClick={() => pb && onRunPlaybook(pb)}
              disabled={!pb || selectedCount === 0}
              className="mt-2 w-full gap-2 bg-primary text-primary-foreground hover:bg-primary/90 glow-primary"
            >
              <Play className="h-4 w-4" /> Run Playbook
            </Button>
          </div>

          {/* Quick actions */}
          <div>
            <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Quick Actions
            </label>
            <div className="grid grid-cols-1 gap-1.5">
              {QUICK_ACTIONS.map((a) => {
                const Icon = (Icons as any)[a.icon] ?? Icons.Terminal;
                return (
                  <Tooltip key={a.id}>
                    <TooltipTrigger asChild>
                      <Button
                        variant="outline"
                        onClick={() => onQuickAction(a)}
                        disabled={selectedCount === 0}
                        className={cn(
                          "h-9 justify-start gap-2 bg-card/60 font-mono text-xs transition-all",
                          toneClass[a.tone],
                        )}
                      >
                        <Icon className="h-3.5 w-3.5" />
                        <span className="flex-1 text-left">{a.label}</span>
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent side="left" className="max-w-xs">
                      <p className="text-xs">{a.description}</p>
                      <pre className="mt-1 overflow-x-auto rounded bg-secondary/60 p-1 font-mono text-[10px] text-accent">
                        {a.cmd}
                      </pre>
                    </TooltipContent>
                  </Tooltip>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </TooltipProvider>
  );
}
