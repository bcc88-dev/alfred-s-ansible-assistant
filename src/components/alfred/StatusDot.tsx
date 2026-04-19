import { cn } from "@/lib/utils";
import { Status } from "@/lib/alfred-types";

const tone: Record<Status, string> = {
  up: "bg-status-up shadow-[0_0_8px_hsl(var(--status-up))]",
  warn: "bg-status-warn shadow-[0_0_8px_hsl(var(--status-warn))]",
  down: "bg-status-down shadow-[0_0_8px_hsl(var(--status-down))]",
  unknown: "bg-status-unknown",
};

export function StatusDot({ status, className }: { status: Status; className?: string }) {
  return (
    <span
      className={cn(
        "inline-block h-2.5 w-2.5 rounded-full",
        tone[status],
        status !== "unknown" && "pulse-dot",
        className,
      )}
      aria-label={`status: ${status}`}
    />
  );
}
