import { NextResponse } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";
import sharp from "sharp";
import { createClient } from "@/lib/supabase/server";
import { InterventionReport, type ReportPhoto } from "@/lib/pdf/intervention-report";
import type { Company, Customer, Intervention, InterventionPhoto } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Normalises any stored image to a compact JPEG that react-pdf can embed. */
async function toJpeg(blob: Blob, maxWidth: number): Promise<Buffer | null> {
  try {
    const input = Buffer.from(await blob.arrayBuffer());
    return await sharp(input).rotate().resize({ width: maxWidth, withoutEnlargement: true }).flatten({ background: "#ffffff" }).jpeg({ quality: 78 }).toBuffer();
  } catch {
    return null;
  }
}

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) return NextResponse.json({ error: "Identifiant invalide" }, { status: 400 });

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  // RLS guarantees the intervention belongs to one of the user's companies.
  const { data: intervention } = await supabase
    .from("interventions")
    .select("*, customers(*)")
    .eq("id", id)
    .maybeSingle<Intervention & { customers: Customer }>();
  if (!intervention) return NextResponse.json({ error: "Intervention introuvable" }, { status: 404 });

  const [{ data: company }, { data: photoRows }] = await Promise.all([
    supabase.from("companies").select("*").eq("id", intervention.company_id).single<Company>(),
    supabase.from("intervention_photos").select("storage_path, caption, position").eq("intervention_id", id).order("position").returns<InterventionPhoto[]>(),
  ]);
  if (!company) return NextResponse.json({ error: "Entreprise introuvable" }, { status: 404 });

  const photos: ReportPhoto[] = [];
  for (const p of photoRows ?? []) {
    const { data } = await supabase.storage.from("intervention-photos").download(p.storage_path);
    const jpeg = data ? await toJpeg(data, 1200) : null;
    if (jpeg) photos.push({ data: jpeg, caption: p.caption });
  }

  let logo: Buffer | null = null;
  if (company.logo_path) {
    const { data } = await supabase.storage.from("company-assets").download(company.logo_path);
    if (data) {
      try {
        logo = await sharp(Buffer.from(await data.arrayBuffer())).resize({ width: 600, withoutEnlargement: true }).png().toBuffer();
      } catch {
        logo = null;
      }
    }
  }

  const { customers: customer, ...rest } = intervention;
  try {
    const pdf = await renderToBuffer(
      <InterventionReport company={company} customer={customer} intervention={rest as Intervention} photos={photos} logo={logo} />,
    );
    const download = new URL(request.url).searchParams.has("download");
    const slug = (intervention.report_number ?? `brouillon-${intervention.intervention_date}`).replace(/[^\w.-]+/g, "-");
    return new NextResponse(new Uint8Array(pdf), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `${download ? "attachment" : "inline"}; filename="rapport-${slug}.pdf"`,
        "Cache-Control": "private, no-store",
      },
    });
  } catch (err) {
    console.error("PDF generation failed", err);
    return NextResponse.json({ error: "La génération du PDF a échoué." }, { status: 500 });
  }
}
