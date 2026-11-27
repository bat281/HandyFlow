"use client";
import { useRef } from "react";
import Link from "next/link";
import { LogOut, Settings, UserRound } from "lucide-react";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { t } from "@/lib/i18n";

export function UserMenu({ name, email, companyName }: { name: string; email: string; companyName: string }) {
  const logoutRef = useRef<HTMLFormElement>(null);
  const initials = (name || email).split(/[\s@.]+/).filter(Boolean).slice(0, 2).map((s) => s[0]?.toUpperCase()).join("");
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className="flex items-center gap-2 rounded-full outline-none focus-visible:ring-[3px] focus-visible:ring-ring/40"
        aria-label="Menu du compte"
      >
        <span className="grid size-9 place-items-center rounded-full bg-accent text-sm font-semibold text-accent-foreground">{initials}</span>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuLabel>
          <div className="font-medium">{name || email}</div>
          <div className="text-xs text-muted-foreground">{companyName}</div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href="/parametres#profil"><UserRound /> {t.nav.profile}</Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href="/parametres"><Settings /> {t.nav.settings}</Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={() => logoutRef.current?.requestSubmit()}>
          <LogOut /> {t.nav.logout}
        </DropdownMenuItem>
      </DropdownMenuContent>
      {/* Outside the menu so it is not unmounted when the menu closes. */}
      <form ref={logoutRef} action="/auth/deconnexion" method="post" hidden />
    </DropdownMenu>
  );
}
