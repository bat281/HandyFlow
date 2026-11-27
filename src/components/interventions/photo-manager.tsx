"use client";
import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Camera, ImagePlus, Loader2, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { addInterventionPhotos, deleteInterventionPhoto, updatePhotoCaption } from "@/app/(app)/interventions/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export type PhotoView = { id: string; url: string | null; caption: string | null };

const MAX_BYTES = 10 * 1024 * 1024;
const ACCEPTED = ["image/jpeg", "image/png", "image/webp"];

export function PhotoManager({ companyId, interventionId, photos }: { companyId: string; interventionId: string; photos: PhotoView[] }) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const cameraRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(0);
  const [pending, start] = useTransition();

  async function onFiles(list: FileList | null) {
    const files = Array.from(list ?? []);
    if (!files.length) return;
    const valid = files.filter((f) => ACCEPTED.includes(f.type) && f.size <= MAX_BYTES);
    if (valid.length < files.length) toast.warning("Certains fichiers ont été ignorés (images JPEG, PNG ou WebP de 10 Mo maximum).");
    if (!valid.length) return;

    setUploading(valid.length);
    const supabase = createClient();
    const uploaded: string[] = [];
    for (const file of valid) {
      const ext = (file.name.split(".").pop() || "jpg").toLowerCase().replace(/[^a-z0-9]/g, "") || "jpg";
      const path = `${companyId}/${interventionId}/${crypto.randomUUID()}.${ext}`;
      const { error } = await supabase.storage.from("intervention-photos").upload(path, file, { contentType: file.type, upsert: false });
      if (error) toast.error(`Échec de l'envoi de ${file.name}`);
      else uploaded.push(path);
      setUploading((n) => n - 1);
    }
    if (uploaded.length) {
      const res = await addInterventionPhotos(interventionId, uploaded);
      if (res.message) toast.error(res.message);
      else toast.success(uploaded.length > 1 ? `${uploaded.length} photos ajoutées` : "Photo ajoutée");
      router.refresh();
    }
    if (inputRef.current) inputRef.current.value = "";
    if (cameraRef.current) cameraRef.current.value = "";
  }

  const busy = uploading > 0;
  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap gap-2">
        <input ref={inputRef} type="file" accept={ACCEPTED.join(",")} multiple hidden onChange={(e) => onFiles(e.target.files)} />
        <input ref={cameraRef} type="file" accept="image/*" capture="environment" hidden onChange={(e) => onFiles(e.target.files)} />
        <Button type="button" variant="outline" disabled={busy} onClick={() => inputRef.current?.click()}>
          {busy ? <Loader2 className="animate-spin" /> : <ImagePlus />} {busy ? `Envoi (${uploading})…` : "Ajouter des photos"}
        </Button>
        <Button type="button" variant="outline" disabled={busy} onClick={() => cameraRef.current?.click()} className="sm:hidden">
          <Camera /> Prendre une photo
        </Button>
      </div>
      {photos.length === 0 ? (
        <p className="text-sm text-muted-foreground">Aucune photo. Les photos ajoutées apparaissent sur le rapport PDF.</p>
      ) : (
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {photos.map((p) => (
            <li key={p.id} className="group overflow-hidden rounded-lg border bg-muted">
              <div className="relative aspect-[4/3]">
                {p.url ? (
                  // Signed URLs from private storage: next/image optimisation is not needed here.
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={p.url} alt={p.caption ?? "Photo de l'intervention"} className="size-full object-cover" loading="lazy" />
                ) : (
                  <div className="grid size-full place-items-center text-xs text-muted-foreground">Indisponible</div>
                )}
                <Button
                  type="button"
                  size="icon"
                  variant="secondary"
                  aria-label="Supprimer la photo"
                  disabled={pending}
                  className="absolute top-2 right-2 size-8 opacity-90"
                  onClick={() =>
                    start(async () => {
                      const res = await deleteInterventionPhoto(p.id);
                      if (res.message) toast.error(res.message);
                      router.refresh();
                    })
                  }
                >
                  <Trash2 />
                </Button>
              </div>
              <Input
                defaultValue={p.caption ?? ""}
                placeholder="Légende…"
                aria-label="Légende de la photo"
                maxLength={200}
                className="h-9 rounded-none border-0 border-t bg-card text-sm shadow-none"
                onBlur={async (e) => {
                  if ((e.target.value || null) === (p.caption || null)) return;
                  const res = await updatePhotoCaption(p.id, e.target.value);
                  if (res.message) toast.error(res.message);
                }}
              />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
