import Link from "next/link";
import { Plus } from "lucide-react";
import { getSession } from "@/lib/session";
import { fullName } from "@/lib/format";
import { t } from "@/lib/i18n";
import { Logo } from "@/components/logo";
import { Button } from "@/components/ui/button";
import { BottomNav, SidebarNav } from "@/components/layout/nav-links";
import { UserMenu } from "@/components/layout/user-menu";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const { user, profile, company } = await getSession();
  const name = profile ? fullName(profile) : "";
  return (
    <div className="min-h-dvh lg:grid lg:grid-cols-[15rem_1fr]">
      <aside className="sticky top-0 hidden h-dvh flex-col gap-6 bg-sidebar p-4 lg:flex">
        <Link href="/tableau-de-bord" className="px-2 pt-1"><Logo inverted /></Link>
        <Button asChild variant="brand" className="w-full justify-start">
          <Link href="/interventions/nouvelle"><Plus /> {t.nav.newIntervention}</Link>
        </Button>
        <SidebarNav />
        <div className="mt-auto truncate px-2 text-xs text-sidebar-foreground/60">{company.name}</div>
      </aside>
      <div className="flex min-w-0 flex-col">
        <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b bg-card/90 px-4 backdrop-blur lg:px-8">
          <Link href="/tableau-de-bord" className="lg:hidden"><Logo /></Link>
          <span className="hidden truncate text-sm text-muted-foreground lg:block">{company.name}</span>
          <UserMenu name={name} email={user.email ?? ""} companyName={company.name} />
        </header>
        <main className="mx-auto w-full max-w-6xl flex-1 px-4 pt-6 pb-28 lg:px-8 lg:pb-12">{children}</main>
      </div>
      <BottomNav />
    </div>
  );
}

// Note: no loading.tsx at this level on purpose. A route-group Suspense boundary
// remounted client forms when a server action revalidated the page, silently
// dropping the action result. Skeletons live on read-only pages instead.
