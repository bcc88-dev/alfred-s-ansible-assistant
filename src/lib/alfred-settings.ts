export type Provider = "lovable" | "ollama";

export interface Settings {
  provider: Provider;
  ollamaUrl: string;
  ollamaModel: string;
  relayUrl: string;          // e.g. ws://localhost:8765
  inventoryPath: string;
  autoRunSuggestions: boolean;
}

const KEY = "alfred.settings.v1";

const defaults: Settings = {
  provider: "ollama",
  ollamaUrl: "http://localhost:11434",
  ollamaModel: "llama3.1",
  relayUrl: "ws://localhost:8765",
  inventoryPath: "/etc/ansible/hosts.ini",
  autoRunSuggestions: false,
};

export function loadSettings(): Settings {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return { ...defaults, ...JSON.parse(raw) };
  } catch {}
  return defaults;
}

export function saveSettings(s: Settings) {
  localStorage.setItem(KEY, JSON.stringify(s));
}
