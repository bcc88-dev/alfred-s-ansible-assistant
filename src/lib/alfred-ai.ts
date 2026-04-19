import { Settings } from "./alfred-settings";
import { ALFRED_SYSTEM } from "./alfred-types";

export type ChatMsg = { role: "system" | "user" | "assistant"; content: string };

/** Streams Alfred's reply token-by-token. Returns the full text. */
export async function streamAlfred(
  settings: Settings,
  messages: ChatMsg[],
  onDelta: (chunk: string) => void,
  signal?: AbortSignal,
): Promise<string> {
  const fullMessages: ChatMsg[] = [
    { role: "system", content: ALFRED_SYSTEM },
    ...messages,
  ];

  if (settings.provider === "ollama") {
    return streamOllama(settings, fullMessages, onDelta, signal);
  }
  // Lovable AI requires Cloud + edge function — fall back with helpful message.
  const msg =
    "Lovable AI requires Lovable Cloud to be enabled (for the secure edge function that proxies the API key). Switch to Ollama in Settings, or enable Cloud and ask me to wire up Lovable AI streaming, sir.";
  for (const ch of msg) onDelta(ch);
  return msg;
}

async function streamOllama(
  s: Settings,
  messages: ChatMsg[],
  onDelta: (chunk: string) => void,
  signal?: AbortSignal,
): Promise<string> {
  const url = s.ollamaUrl.replace(/\/+$/, "") + "/api/chat";
  const resp = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ model: s.ollamaModel, stream: true, messages }),
    signal,
  });
  if (!resp.ok || !resp.body) {
    throw new Error(`Ollama error ${resp.status} — is it running at ${s.ollamaUrl}?`);
  }
  const reader = resp.body.getReader();
  const dec = new TextDecoder();
  let buf = "";
  let full = "";
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buf += dec.decode(value, { stream: true });
    let nl: number;
    while ((nl = buf.indexOf("\n")) !== -1) {
      const line = buf.slice(0, nl).trim();
      buf = buf.slice(nl + 1);
      if (!line) continue;
      try {
        const j = JSON.parse(line);
        const tok = j?.message?.content as string | undefined;
        if (tok) { full += tok; onDelta(tok); }
      } catch { /* partial */ }
    }
  }
  return full;
}

export interface ParsedSuggestion {
  kind: "cmd" | "playbook";
  raw: string;
}

export function extractSuggestions(text: string): ParsedSuggestion[] {
  const out: ParsedSuggestion[] = [];
  const cmdRe = /<CMD>([\s\S]*?)<\/CMD>/g;
  const pbRe = /<PLAYBOOK>([\s\S]*?)<\/PLAYBOOK>/g;
  let m;
  while ((m = cmdRe.exec(text))) out.push({ kind: "cmd", raw: m[1].trim() });
  while ((m = pbRe.exec(text))) out.push({ kind: "playbook", raw: m[1].trim() });
  return out;
}

export function stripTags(text: string): string {
  return text
    .replace(/<CMD>[\s\S]*?<\/CMD>/g, "")
    .replace(/<PLAYBOOK>[\s\S]*?<\/PLAYBOOK>/g, "")
    .trim();
}
