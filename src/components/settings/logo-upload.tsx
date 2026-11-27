"use client";
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ImageUp, Loader2, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { setCompanyLogo } from "@/app/(app)/parametres/actions";
import { Button } from "@/components/ui/button";

const ACCEPTED = ["image/png", "image/jpeg", "image/webp"];

export function LogoUpload({ companyId, logoUrl }: { companyId: string; logoUrl: string | null }) {
  const ref = useRef<HTMLInputElement>(null);
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function onFile(file: File | undefined) {
    if (!file) return;
    if (!ACCEPTED.includes(file.type) || file.size > 2 * 1024 * 1024) {
      toast.error("Logo PNG, JPEG ou WebP de 2 Mo maximum.");
      return;
    }
    setBusy(true);
    const ext = file.type.split("/")[1].replace("jpeg", "jpg");
    const path = `${companyId}/logo-${crypto.randomUUID()}.${ext}`;
    const { error } = await createClient().storage.from("company-assets").upload(path, file, { contentType: file.type });
    if (error) {
      toast.error("Échec de l'envoi du logo.");
    } else {
      const res = await setCompanyLogo(path);
      if (res.message) toast.error(res.message);
      else toast.success("Logo mis à jour");
      router.refresh();
    }
    setBusy(false);
    if (ref.current) ref.current.value = "";
  }

  return (
    <div className="flex flex-wrap items-center gap-4">
      <div className="grid h-20 w-40 place-items-center overflow-hidden rounded-lg border bg-muted">
        {logoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={logoUrl} alt="Logo de l'entreprise" className="max-h-full max-w-full object-contain p-2" />
        ) : (
          <span className="text-xs text-muted-foreground">Aucun logo</span>
        )}
      </div>
      <div className="flex gap-2">
        <input ref={ref} type="file" accept={ACCEPTED.join(",")} hidden onChange={(e) => onFile(e.target.files?.[0])} />
        <Button type="button" variant="outline" disabled={busy} onClick={() => ref.current?.click()}>
          {busy ? <Loader2 className="animate-spin" /> : <ImageUp />} {logoUrl ? "Remplacer" : "Ajouter un logo"}
        </Button>
        {logoUrl && (
          <Button type="button" variant="ghost" disabled={busy} aria-label="Retirer le logo"
            onClick={async () => { setBusy(true); const r = await setCompanyLogo(null); if (r.message) toast.error(r.message); router.refresh(); setBusy(false); }}>
            <Trash2 />
          </Button>
        )}
      </div>
    </div>
  );
}
