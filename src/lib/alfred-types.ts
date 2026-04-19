export type ConnKind = "ssh" | "local";
export type Status = "up" | "warn" | "down" | "unknown";

export interface Host {
  id: string;
  name: string;
  ip: string;
  user: string;
  port: number;
  group: string;
  connection: ConnKind;
  venv?: string;
  status: Status;
  lastChecked?: number;
}

export interface Inventory {
  path: string;          // virtual path the user "watches"
  groups: Record<string, string[]>; // group -> host ids
  hosts: Record<string, Host>;
}

export interface QuickAction {
  id: string;
  label: string;
  icon: string;
  cmd: string;
  tone: "cyan" | "green" | "amber" | "purple" | "red" | "teal";
  description: string;
}

export const QUICK_ACTIONS: QuickAction[] = [
  { id: "icmp",   label: "ICMP Ping",        icon: "Radio",      cmd: "ping -c 3 -W 2 <host>",                                tone: "cyan",   description: "Layer-3 reachability — no SSH required." },
  { id: "ssh",    label: "SSH Connectivity", icon: "PlugZap",    cmd: "ansible all -i $INV -m ping",                          tone: "green",  description: "Ansible ping module over SSH." },
  { id: "disk",   label: "Disk Space",       icon: "HardDrive",  cmd: "ansible all -i $INV -m shell -a 'df -h'",              tone: "amber",  description: "Filesystem usage on every selected host." },
  { id: "mem",    label: "Memory",           icon: "MemoryStick",cmd: "ansible all -i $INV -m shell -a 'free -h'",            tone: "purple", description: "RAM and swap usage." },
  { id: "cpu",    label: "CPU Load",         icon: "Cpu",        cmd: "ansible all -i $INV -m shell -a 'top -bn1 | head -5'", tone: "red",    description: "Top processes & load average." },
  { id: "uptime", label: "Uptime",           icon: "Clock",      cmd: "ansible all -i $INV -m shell -a 'uptime'",             tone: "teal",   description: "How long each host has been running." },
  { id: "ports",  label: "Open Ports",       icon: "Network",    cmd: "ansible all -i $INV -m shell -a 'ss -tlnp'",           tone: "purple", description: "Listening TCP sockets." },
  { id: "who",    label: "Logged-in Users",  icon: "Users",      cmd: "ansible all -i $INV -m shell -a 'who'",                tone: "amber",  description: "Active SSH sessions." },
  { id: "facts",  label: "Gather Facts",     icon: "FileSearch", cmd: "ansible all -i $INV -m setup",                         tone: "cyan",   description: "Full Ansible facts collection." },
  { id: "update", label: "Update Packages",  icon: "PackageCheck",cmd: "ansible-playbook -i $INV update_packages.yml",        tone: "green",  description: "apt upgrade dist on every host." },
  { id: "reboot", label: "Reboot Hosts",     icon: "Power",      cmd: "ansible-playbook -i $INV reboot_hosts.yml",            tone: "red",    description: "Graceful reboot with 120s timeout." },
];

export const PLAYBOOKS: { id: string; label: string }[] = [
  { id: "deploy_nginx",    label: "Deploy Nginx" },
  { id: "setup_tailscale", label: "Setup Tailscale" },
  { id: "harden_ssh",      label: "Harden SSH" },
  { id: "install_docker",  label: "Install Docker" },
  { id: "update_packages", label: "Update Packages" },
  { id: "discover_hosts",  label: "Discover Hosts (nmap)" },
  { id: "gather_facts",    label: "Gather Facts" },
  { id: "reboot_hosts",    label: "Reboot Hosts" },
];

export const ALFRED_SYSTEM = `You are Alfred, a calm and competent Ansible butler embedded in a web TUI.

When the user asks you to DO something (run, install, check, ping, restart, etc.) you MUST
include the exact command wrapped in special tags so the UI can execute it on a single click.

Use these tags:
  <CMD>ansible all -i $INV -m shell -a "uptime"</CMD>
  or for a full playbook:
  <PLAYBOOK>
  ---
  - name: ...
    hosts: all
    ...
  </PLAYBOOK>

Rules:
- Always use $INV as the inventory placeholder in CMD tags — the UI substitutes the real path.
- For an ansible connectivity test use: <CMD>ansible all -i $INV -m ping</CMD>
- For shell commands use the shell module: -m shell -a "command here"
- For package installs, generate a PLAYBOOK tag.
- Address the user as 'sir'. One sentence explanation then the tag.
- If just a question (no action needed), answer directly with no tags.
`;
