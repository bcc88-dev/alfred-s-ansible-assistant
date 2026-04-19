import { useEffect, useRef } from "react";
import { Terminal } from "@xterm/xterm";
import { FitAddon } from "@xterm/addon-fit";
import "@xterm/xterm/css/xterm.css";

interface Props {
  /** stream of lines/chunks to write into the terminal */
  feedRef: React.MutableRefObject<((data: string) => void) | null>;
  onUserInput?: (data: string) => void;
  banner?: string;
}

export function XTermPanel({ feedRef, onUserInput, banner }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const termRef = useRef<Terminal | null>(null);

  useEffect(() => {
    if (!ref.current) return;
    const term = new Terminal({
      fontFamily: 'ui-monospace, "JetBrains Mono", Menlo, monospace',
      fontSize: 12,
      theme: {
        background: "#0a0d12",
        foreground: "#d6e0e8",
        cursor: "#39d5ff",
        green: "#4ec994",
        cyan: "#39d5ff",
        yellow: "#f5c46b",
        red: "#f06868",
        magenta: "#bb88ff",
      },
      cursorBlink: true,
      convertEol: true,
      scrollback: 5000,
    });
    const fit = new FitAddon();
    term.loadAddon(fit);
    term.open(ref.current);
    fit.fit();
    termRef.current = term;

    if (banner) term.writeln(banner);

    feedRef.current = (data: string) => term.write(data);

    if (onUserInput) {
      term.onData((d) => onUserInput(d));
    }

    const ro = new ResizeObserver(() => { try { fit.fit(); } catch {} });
    ro.observe(ref.current);
    return () => { ro.disconnect(); term.dispose(); feedRef.current = null; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return <div ref={ref} className="h-full w-full bg-[#0a0d12] scanlines rounded-md overflow-hidden" />;
}
