import { Logo } from "@/components/logo";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid min-h-dvh lg:grid-cols-[1fr_1.1fr]">
      <div className="flex flex-col px-4 py-8 sm:px-10">
        <Logo />
        <main className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center py-10">{children}</main>
        <p className="text-xs text-muted-foreground">Vos données sont hébergées de manière sécurisée et isolées par entreprise.</p>
      </div>
      <aside className="relative hidden overflow-hidden bg-sidebar p-12 text-sidebar-foreground lg:flex lg:flex-col lg:justify-end">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_20%,oklch(0.55_0.17_258/0.35),transparent_55%)]" />
        <div className="relative max-w-md space-y-4">
          <p className="text-3xl font-semibold leading-tight text-white">Du chantier au rapport en quelques minutes.</p>
          <p className="text-sidebar-foreground/80">
            Clients, interventions, photos et rapports PDF professionnels, pensés pour les artisans de Suisse romande.
          </p>
        </div>
      </aside>
    </div>
  );
}
