"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ClipboardList, LayoutDashboard, Plus, Settings, Users } from "lucide-react";
import { cn } from "@/lib/utils";
import { t } from "@/lib/i18n";

export const NAV: { href: string; label: string; short?: string; icon: typeof LayoutDashboard }[] = [
  { href: "/tableau-de-bord", label: t.nav.dashboard, short: t.nav.home, icon: LayoutDashboard },
  { href: "/interventions", label: t.nav.interventions, icon: ClipboardList },
  { href: "/clients", label: t.nav.customers, icon: Users },
  { href: "/parametres", label: t.nav.settings, icon: Settings },
];

function useActive() {
  const pathname = usePathname();
  return (href: string) => pathname === href || pathname.startsWith(`${href}/`);
}

export function SidebarNav() {
  const isActive = useActive();
  return (
    <nav className="grid gap-1" aria-label="Navigation principale">
      {NAV.map(({ href, label, icon: Icon }) => (
        <Link
          key={href}
          href={href}
          aria-current={isActive(href) ? "page" : undefined}
          className={cn(
            "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-sidebar-foreground/75 transition-colors hover:bg-white/5 hover:text-white",
            isActive(href) && "bg-white/10 text-white",
          )}
        >
          <Icon className="size-4" />
          {label}
        </Link>
      ))}
    </nav>
  );
}

/** Mobile bottom bar with a central "new intervention" action. */
export function BottomNav() {
  const isActive = useActive();
  const [a, b, c, d] = NAV;
  const item = ({ href, label, short, icon: Icon }: (typeof NAV)[number] & { short?: string }) => (
    <Link
      key={href}
      href={href}
      aria-current={isActive(href) ? "page" : undefined}
      className={cn("flex min-w-0 flex-1 flex-col items-center gap-1 py-2 text-[11px] font-medium text-muted-foreground", isActive(href) && "text-primary")}
    >
      <Icon className="size-5" />
      <span className="max-w-full truncate">{short ?? label}</span>
    </Link>
  );
  return (
    <nav
      aria-label="Navigation principale"
      className="fixed inset-x-0 bottom-0 z-40 flex items-end border-t bg-card/95 px-2 pb-[env(safe-area-inset-bottom)] backdrop-blur lg:hidden"
    >
      {item(a)}
      {item(b)}
      <div className="flex flex-1 justify-center">
        <Link
          href="/interventions/nouvelle"
          aria-label={t.nav.newIntervention}
          className="-mt-5 grid size-14 place-items-center rounded-full bg-brand text-white shadow-lg ring-4 ring-background"
        >
          <Plus className="size-6" />
        </Link>
      </div>
      {item(c)}
      {item(d)}
    </nav>
  );
}
