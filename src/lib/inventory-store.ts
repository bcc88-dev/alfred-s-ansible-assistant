import { Host, Inventory } from "./alfred-types";

const KEY = "alfred.inventory.v1";

const seed: Inventory = {
  path: "/etc/ansible/hosts.ini",
  groups: {
    local: ["localhost"],
    web:   ["web-01", "web-02"],
    db:    ["db-primary"],
    k8s:   ["k8s-node-01"],
    edge:  ["edge-01"],
  },
  hosts: {
    "localhost":   { id: "localhost",   name: "localhost",   ip: "127.0.0.1",   user: "root",   port: 22, group: "local", connection: "local", venv: "system", status: "up" },
    "web-01":      { id: "web-01",      name: "web-01",      ip: "100.64.0.11", user: "ubuntu", port: 22, group: "web",   connection: "ssh",   venv: "ansible-3.12", status: "unknown" },
    "web-02":      { id: "web-02",      name: "web-02",      ip: "100.64.0.12", user: "ubuntu", port: 22, group: "web",   connection: "ssh",   venv: "ansible-3.12", status: "unknown" },
    "db-primary":  { id: "db-primary",  name: "db-primary",  ip: "100.64.0.21", user: "ubuntu", port: 22, group: "db",    connection: "ssh",   venv: "ansible-3.12", status: "unknown" },
    "k8s-node-01": { id: "k8s-node-01", name: "k8s-node-01", ip: "100.64.0.31", user: "root",   port: 22, group: "k8s",   connection: "ssh",   venv: "ansible-3.11", status: "unknown" },
    "edge-01":     { id: "edge-01",     name: "edge-01",     ip: "100.64.0.41", user: "root",   port: 22, group: "edge",  connection: "ssh",   venv: "ansible-3.12", status: "unknown" },
  },
};

export function loadInventory(): Inventory {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return JSON.parse(JSON.stringify(seed));
}

export function saveInventory(inv: Inventory) {
  localStorage.setItem(KEY, JSON.stringify(inv));
}

export function upsertHost(inv: Inventory, h: Host): Inventory {
  const next: Inventory = { ...inv, hosts: { ...inv.hosts, [h.id]: h }, groups: { ...inv.groups } };
  // remove from any prior group
  for (const g of Object.keys(next.groups)) {
    next.groups[g] = next.groups[g].filter((id) => id !== h.id);
  }
  next.groups[h.group] = [...(next.groups[h.group] ?? []), h.id];
  // prune empty groups except seeded ones
  for (const g of Object.keys(next.groups)) {
    if (next.groups[g].length === 0) delete next.groups[g];
  }
  return next;
}

export function deleteHost(inv: Inventory, id: string): Inventory {
  const next: Inventory = { ...inv, hosts: { ...inv.hosts }, groups: { ...inv.groups } };
  delete next.hosts[id];
  for (const g of Object.keys(next.groups)) {
    next.groups[g] = next.groups[g].filter((x) => x !== id);
    if (next.groups[g].length === 0) delete next.groups[g];
  }
  return next;
}

export function addGroup(inv: Inventory, name: string): Inventory {
  if (inv.groups[name]) return inv;
  return { ...inv, groups: { ...inv.groups, [name]: [] } };
}

export function allHosts(inv: Inventory): Host[] {
  return Object.values(inv.hosts);
}
