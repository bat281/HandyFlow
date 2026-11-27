import { cn } from "@/lib/utils";

export function Logo({ className, inverted = false }: { className?: string; inverted?: boolean }) {
  return (
    <span className={cn("inline-flex items-center gap-2 font-semibold tracking-tight", className)}>
      <span className={cn("grid size-8 place-items-center rounded-lg", inverted ? "bg-white/10 text-white" : "bg-primary text-primary-foreground")}>
        <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <path d="M5 4v16M19 4v16M5 12h14" />
        </svg>
      </span>
      <span className={inverted ? "text-white" : "text-primary"}>HandyFlow</span>
    </span>
  );
}
