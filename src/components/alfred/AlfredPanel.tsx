import { useEffect, useRef, useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Bot, Send, Settings as SettingsIcon, TerminalSquare, Sparkles, Play, ScrollText } from "lucide-react";
import ReactMarkdown from "react-markdown";
import { Settings } from "@/lib/alfred-settings";
import { Host } from "@/lib/alfred-types";
import { ChatMsg, extractSuggestions, streamAlfred, stripTags, ParsedSuggestion } from "@/lib/alfred-ai";
import { XTermPanel } from "./XTermPanel";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface Props {
  settings: Settings;
  selectedHosts: Host[];
  inventoryPath: string;
  onOpenSettings: () => void;
  onExecuteSuggestion: (s: ParsedSuggestion) => void;
  termFeedRef: React.MutableRefObject<((data: string) => void) | null>;
  activeTermHost: Host | null;
}

interface UiMsg {
  role: "user" | "assistant";
  content: string;
  suggestions?: ParsedSuggestion[];
  streaming?: boolean;
}

export function AlfredPanel({
  settings, selectedHosts, inventoryPath, onOpenSettings, onExecuteSuggestion, termFeedRef, activeTermHost,
}: Props) {
  const [tab, setTab] = useState<"chat" | "term">("chat");
  const [messages, setMessages] = useState<UiMsg[]>([
    {
      role: "assistant",
      content: "Good evening, sir. Alfred at your service. Tell me what you'd like done — *install nginx*, *check disk space*, *restart apache* — and I'll prepare the command for your approval.",
    },
  ]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  const send = async () => {
    const text = input.trim();
    if (!text || busy) return;
    setInput("");
    const hostsLabel = selectedHosts.length ? selectedHosts.map((h) => h.name).join(", ") : "none selected";
    const userMsg: UiMsg = { role: "user", content: text };
    const assistant: UiMsg = { role: "assistant", content: "", streaming: true };
    setMessages((m) => [...m, userMsg, assistant]);
    setBusy(true);

    const history: ChatMsg[] = [
      ...messages.map((m) => ({ role: m.role, content: m.content }) as ChatMsg),
      { role: "user", content: `Selected hosts: ${hostsLabel}\nInventory: ${inventoryPath}\nRequest: ${text}` },
    ];

    let acc = "";
    try {
      await streamAlfred(settings, history, (chunk) => {
        acc += chunk;
        setMessages((m) => {
          const next = [...m];
          next[next.length - 1] = { role: "assistant", content: acc, streaming: true };
          return next;
        });
      });
      const sugs = extractSuggestions(acc);
      setMessages((m) => {
        const next = [...m];
        next[next.length - 1] = { role: "assistant", content: acc, suggestions: sugs, streaming: false };
        return next;
      });
      if (settings.autoRunSuggestions) sugs.forEach(onExecuteSuggestion);
    } catch (e: any) {
      setMessages((m) => {
        const next = [...m];
        next[next.length - 1] = { role: "assistant", content: `Terribly sorry, sir. ${e?.message ?? e}`, streaming: false };
        return next;
      });
      toast.error(e?.message ?? "Alfred failed to respond");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex h-full flex-col bg-card/40">
      <div className="flex items-center gap-2 border-b border-border px-3 py-2 bg-alfred-grad">
        <Bot className="h-4 w-4 text-alfred" />
        <h2 className="text-sm font-semibold tracking-wide text-alfred">Alfred — Your Ansible Butler</h2>
        <span className="ml-2 rounded bg-secondary px-1.5 py-0.5 font-mono text-[11px] text-muted-foreground">
          {settings.provider === "ollama" ? `ollama · ${settings.ollamaModel}` : "lovable AI"}
        </span>
        <Button variant="ghost" size="icon" className="ml-auto h-7 w-7" onClick={onOpenSettings} title="Settings">
          <SettingsIcon className="h-4 w-4" />
        </Button>
      </div>

      <Tabs value={tab} onValueChange={(v) => setTab(v as any)} className="flex flex-1 flex-col">
        <TabsList className="mx-3 mt-2 grid w-[calc(100%-1.5rem)] grid-cols-2">
          <TabsTrigger value="chat" className="gap-2"><Sparkles className="h-3.5 w-3.5" /> Chat</TabsTrigger>
          <TabsTrigger value="term" className="gap-2"><TerminalSquare className="h-3.5 w-3.5" /> Terminal{activeTermHost ? ` · ${activeTermHost.name}` : ""}</TabsTrigger>
        </TabsList>

        <TabsContent value="chat" className="flex-1 flex flex-col mt-2 px-3 pb-3 data-[state=inactive]:hidden">
          <div ref={scrollRef} className="flex-1 overflow-auto rounded-md border border-border bg-[#070a10] p-3 space-y-3">
            {messages.map((m, i) => (
              <MessageBubble key={i} msg={m} onExecute={onExecuteSuggestion} />
            ))}
            {busy && <div className="text-xs text-muted-foreground caret-blink">Alfred is composing</div>}
          </div>
          <div className="mt-2 flex gap-2">
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && (e.preventDefault(), send())}
              placeholder="Tell Alfred: 'install nginx', 'check disk', 'restart apache'…"
              className="font-mono"
              disabled={busy}
            />
            <Button onClick={send} disabled={busy || !input.trim()} className="gap-2 bg-alfred text-alfred-foreground hover:bg-alfred/90">
              <Send className="h-4 w-4" /> Send
            </Button>
          </div>
        </TabsContent>

        <TabsContent value="term" className="flex-1 mt-2 px-3 pb-3 data-[state=inactive]:hidden">
          <div className="h-full rounded-md border border-accent/30 glow-cyan overflow-hidden">
            <XTermPanel
              feedRef={termFeedRef}
              banner={`\x1b[36m⬡ Alfred terminal\x1b[0m — output streams here from quick actions, playbooks, and Alfred's executions.\r\nDouble-click a host in the inventory to scope an SSH session (requires the local relay).\r\n`}
            />
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function MessageBubble({ msg, onExecute }: { msg: UiMsg; onExecute: (s: ParsedSuggestion) => void }) {
  const isUser = msg.role === "user";
  return (
    <div className={cn("flex gap-2", isUser && "flex-row-reverse")}>
      <div className={cn(
        "flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold",
        isUser ? "bg-primary/20 text-primary" : "bg-alfred/20 text-alfred",
      )}>
        {isUser ? "You" : "A"}
      </div>
      <div className={cn(
        "max-w-[85%] rounded-lg border px-3 py-2 text-sm",
        isUser ? "bg-primary/10 border-primary/30" : "bg-card/80 border-border",
      )}>
        <div className={cn("prose prose-sm prose-invert max-w-none break-words", msg.streaming && "caret-blink")}>
          <ReactMarkdown>{stripTags(msg.content) || (msg.streaming ? "…" : "")}</ReactMarkdown>
        </div>
        {msg.suggestions?.map((s, i) => (
          <SuggestionCard key={i} s={s} onExecute={onExecute} />
        ))}
      </div>
    </div>
  );
}

function SuggestionCard({ s, onExecute }: { s: ParsedSuggestion; onExecute: (s: ParsedSuggestion) => void }) {
  return (
    <div className="mt-2 rounded-md border border-accent/40 bg-accent/5 p-2">
      <div className="mb-1 flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-accent">
        {s.kind === "cmd" ? <ScrollText className="h-3 w-3" /> : <Play className="h-3 w-3" />}
        {s.kind === "cmd" ? "command" : "playbook"}
      </div>
      <pre className="overflow-x-auto rounded bg-[#070a10] p-2 font-mono text-[11px] text-accent">{s.raw}</pre>
      <Button size="sm" onClick={() => onExecute(s)} className="mt-2 h-7 gap-1 bg-accent text-accent-foreground hover:bg-accent/90">
        <Play className="h-3 w-3" /> Execute on selected hosts
      </Button>
    </div>
  );
}
