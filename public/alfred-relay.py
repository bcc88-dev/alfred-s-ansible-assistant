#!/usr/bin/env python3
"""
alfred-relay.py — local WebSocket bridge for Alfred Web TUI.
Runs on your Ansible control node and executes commands the browser sends.

Install:
    pip install websockets

Run:
    python3 alfred-relay.py            # listens on ws://0.0.0.0:8765
    python3 alfred-relay.py --port 8765 --host 0.0.0.0

Protocol (JSON messages over a single WS connection):
    client -> { "kind": "cmd"|"playbook"|"ping"|"ssh",
                "data": "<command string OR playbook YAML OR host>",
                "hosts": [{name, ip, user, port, connection}],
                "inventoryPath": "/etc/ansible/hosts.ini" }
    server -> { "type": "open" }
              { "type": "stdout"|"stderr", "data": "..." }
              { "type": "exit", "code": 0 }
              { "type": "error", "message": "..." }

Security:
    By default this listens on localhost only. To expose it, place it behind
    Tailscale (recommended) or an authenticating reverse proxy. Do NOT expose
    raw on the public internet.
"""
import argparse, asyncio, json, os, shlex, subprocess, tempfile, sys

try:
    import websockets
except ImportError:
    sys.exit("Please install: pip install websockets")

SHARED_INV = "/tmp/alfred_inv.ini"

def write_ini(hosts):
    lines = ["[selected]"]
    for h in hosts:
        if h.get("connection") == "local":
            lines.append(f"{h['name']} ansible_connection=local")
        else:
            lines.append(
                f"{h['name']} ansible_host={h['ip']} ansible_user={h.get('user','root')}"
                f" ansible_port={h.get('port',22)}"
                f" ansible_ssh_common_args='-o StrictHostKeyChecking=no -o ConnectTimeout=5'"
            )
    lines += ["", "[all:children]", "selected", ""]
    with open(SHARED_INV, "w") as f:
        f.write("\n".join(lines))
    return SHARED_INV

async def stream_proc(ws, argv, cwd=None):
    proc = await asyncio.create_subprocess_exec(
        *argv, stdout=asyncio.subprocess.PIPE, stderr=asyncio.subprocess.STDOUT, cwd=cwd
    )
    assert proc.stdout
    while True:
        chunk = await proc.stdout.read(1024)
        if not chunk: break
        await ws.send(json.dumps({"type": "stdout", "data": chunk.decode(errors="replace")}))
    rc = await proc.wait()
    await ws.send(json.dumps({"type": "exit", "code": rc}))

async def handle(ws):
    await ws.send(json.dumps({"type": "open"}))
    try:
        async for raw in ws:
            try:
                msg = json.loads(raw)
            except Exception as e:
                await ws.send(json.dumps({"type": "error", "message": f"bad json: {e}"}))
                continue
            kind = msg.get("kind")
            data = msg.get("data", "")
            hosts = msg.get("hosts", [])
            inv = write_ini(hosts) if hosts else SHARED_INV

            try:
                if kind == "ping":
                    for h in hosts:
                        ip = h["ip"]
                        if h.get("connection") == "local" or ip in ("127.0.0.1", "localhost"):
                            await ws.send(json.dumps({"type": "stdout", "data": f"● {h['name']} (localhost) — reachable\n"}))
                            continue
                        try:
                            r = subprocess.run(["ping", "-c", "3", "-W", "2", ip],
                                               capture_output=True, text=True, timeout=12)
                            ok = r.returncode == 0
                            await ws.send(json.dumps({"type": "stdout",
                                "data": f"{'●' if ok else '○'} {h['name']} ({ip}) — {'reachable' if ok else 'UNREACHABLE'}\n"}))
                        except Exception as e:
                            await ws.send(json.dumps({"type": "stdout", "data": f"○ {h['name']} ({ip}) — {e}\n"}))
                    await ws.send(json.dumps({"type": "exit", "code": 0}))

                elif kind == "cmd":
                    argv = shlex.split(data.replace("$INV", inv))
                    await stream_proc(ws, argv)

                elif kind == "playbook":
                    # data may be a builtin name or full YAML
                    if data.lstrip().startswith("---") or "\nhosts:" in data or " hosts:" in data:
                        with tempfile.NamedTemporaryFile("w", suffix=".yml", delete=False) as f:
                            f.write(data); path = f.name
                    else:
                        path = f"{data}.yml"
                    await stream_proc(ws, ["ansible-playbook", "-i", inv, path])

                else:
                    await ws.send(json.dumps({"type": "error", "message": f"unknown kind: {kind}"}))
            except FileNotFoundError as e:
                await ws.send(json.dumps({"type": "error", "message": f"not found: {e}"}))
            except Exception as e:
                await ws.send(json.dumps({"type": "error", "message": str(e)}))
    except websockets.ConnectionClosed:
        pass

async def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--host", default="127.0.0.1")
    ap.add_argument("--port", type=int, default=8765)
    args = ap.parse_args()
    print(f"⬡ alfred-relay listening on ws://{args.host}:{args.port}")
    async with websockets.serve(handle, args.host, args.port, max_size=2**22):
        await asyncio.Future()

if __name__ == "__main__":
    asyncio.run(main())
