/* eslint-disable jsx-a11y/alt-text -- react-pdf <Image> has no alt attribute */
import { Document, Font, Image, Page, StyleSheet, Text, View } from "@react-pdf/renderer";
import { formatAddress, formatDate, formatDuration, fullName } from "@/lib/format";
import type { Company, Customer, Intervention } from "@/lib/types";

export type ReportPhoto = { data: Buffer; caption: string | null };

export type ReportData = {
  company: Company;
  customer: Customer;
  intervention: Intervention;
  photos: ReportPhoto[];
  logo: Buffer | null;
};

// No automatic hyphenation: it splits Swiss place names ("Lau-sanne").
Font.registerHyphenationCallback((word) => [word]);

const NAVY = "#14213d";
const GREY = "#64748b";
const LINE = "#e2e8f0";

const s = StyleSheet.create({
  page: { paddingTop: 36, paddingBottom: 64, paddingHorizontal: 40, fontSize: 9.5, fontFamily: "Helvetica", color: "#1e293b" },
  // lineHeight is set per paragraph: on <Page> it breaks the page-number render prop.
  body: {},
  para: { lineHeight: 1.45 },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 24 },
  logo: { maxWidth: 150, maxHeight: 60, objectFit: "contain" },
  companyName: { fontSize: 14, fontFamily: "Helvetica-Bold", color: NAVY },
  companyBlock: { textAlign: "right", color: GREY, fontSize: 8.5, lineHeight: 1.4 },
  titleRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-end", paddingBottom: 8, borderBottomWidth: 2, marginBottom: 16 },
  title: { fontSize: 18, fontFamily: "Helvetica-Bold", color: NAVY, lineHeight: 1.2, marginBottom: 2 },
  draft: { fontSize: 9, fontFamily: "Helvetica-Bold", color: "#b45309", borderWidth: 1, borderColor: "#f59e0b", paddingHorizontal: 6, paddingVertical: 2, borderRadius: 3 },
  grid: { flexDirection: "row", gap: 16, marginBottom: 18 },
  box: { flex: 1, backgroundColor: "#f8fafc", borderRadius: 4, padding: 10, gap: 1.5 },
  label: { fontSize: 7.5, color: GREY, textTransform: "uppercase", letterSpacing: 0.6, marginBottom: 3 },
  strong: { fontFamily: "Helvetica-Bold" },
  metaRow: { flexDirection: "row", marginBottom: 3 },
  metaKey: { width: 80, color: GREY },
  metaVal: { flex: 1 },
  section: { marginBottom: 16 },
  sectionTitle: { fontSize: 10.5, fontFamily: "Helvetica-Bold", color: NAVY, marginBottom: 6, paddingBottom: 3, borderBottomWidth: 0.5, borderBottomColor: LINE },
  muted: { color: GREY, fontStyle: "italic" },
  tableHead: { flexDirection: "row", backgroundColor: "#f1f5f9", paddingVertical: 4, paddingHorizontal: 6, fontFamily: "Helvetica-Bold", fontSize: 8.5 },
  tableRow: { flexDirection: "row", paddingVertical: 4, paddingHorizontal: 6, borderBottomWidth: 0.5, borderBottomColor: LINE },
  colName: { flex: 1 },
  colQty: { width: 90, textAlign: "right" },
  photos: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  photo: { width: "48.5%", marginBottom: 4 },
  photoImg: { width: "100%", height: 180, objectFit: "cover", borderRadius: 3 },
  caption: { fontSize: 8, color: GREY, marginTop: 3 },
  signatures: { flexDirection: "row", gap: 24, marginTop: 24 },
  sigBox: { flex: 1, borderTopWidth: 0.5, borderTopColor: GREY, paddingTop: 4, color: GREY, fontSize: 8 },
  footerLine: { position: "absolute", bottom: 46, left: 40, right: 40, borderTopWidth: 0.5, borderTopColor: LINE },
  footerText: { position: "absolute", bottom: 22, left: 40, width: 420, fontSize: 7.5, color: GREY, lineHeight: 1.3 },
  pageNumber: { position: "absolute", bottom: 22, right: 40, width: 80, textAlign: "right", fontSize: 7.5, color: GREY },
});

function Meta({ k, v }: { k: string; v: string }) {
  return (
    <View style={s.metaRow}>
      <Text style={s.metaKey}>{k}</Text>
      <Text style={s.metaVal}>{v || "—"}</Text>
    </View>
  );
}

export function InterventionReport({ company, customer, intervention: i, photos, logo }: ReportData) {
  const accent = company.document_accent_color || NAVY;
  const companyAddress = formatAddress(company);
  const location = formatAddress({ address_line: i.location_address, postal_code: i.location_postal_code, city: i.location_city });
  const photoRows: ReportPhoto[][] = [];
  for (let k = 0; k < photos.length; k += 2) photoRows.push(photos.slice(k, k + 2));
  const footerLeft = [company.name, companyAddress, company.vat_number].filter(Boolean).join(" · ");

  return (
    <Document title={`Rapport d'intervention ${i.report_number ?? ""}`.trim()} author={company.name} creator="HandyFlow" language="fr-CH">
      <Page size="A4" style={s.page}>
        <View style={s.header} fixed>
          <View>
            {logo ? <Image src={logo} style={s.logo} /> : <Text style={[s.companyName, { color: accent }]}>{company.name}</Text>}
          </View>
          <View style={s.companyBlock}>
            {logo && <Text style={[s.strong, { color: "#1e293b" }]}>{company.name}</Text>}
            {company.address_line && <Text>{company.address_line}</Text>}
            {(company.postal_code || company.city) && <Text>{[company.postal_code, company.city].filter(Boolean).join(" ")}</Text>}
            {company.phone && <Text>{company.phone}</Text>}
            {company.email && <Text>{company.email}</Text>}
            {company.vat_number && <Text>{company.vat_number}</Text>}
          </View>
        </View>

        <View style={s.body}>
        <View style={[s.titleRow, { borderBottomColor: accent }]}>
          <View style={{ flexGrow: 1 }}>
            <Text style={[s.title, { color: accent }]}>Rapport d&apos;intervention</Text>
            <Text style={{ color: GREY }}>{i.report_number ? `N° ${i.report_number}` : "Non numéroté"}</Text>
          </View>
          {i.status === "draft" && <Text style={s.draft}>BROUILLON</Text>}
        </View>

        <View style={s.grid}>
          <View style={s.box}>
            <Text style={s.label}>Client</Text>
            <Text style={s.strong}>{fullName(customer)}</Text>
            {customer.company_name && <Text>{customer.company_name}</Text>}
            {customer.address_line && <Text>{customer.address_line}</Text>}
            {(customer.postal_code || customer.city) && <Text>{[customer.postal_code, customer.city].filter(Boolean).join(" ")}</Text>}
            {customer.phone && <Text style={{ color: GREY }}>{customer.phone}</Text>}
            {customer.email && <Text style={{ color: GREY }}>{customer.email}</Text>}
          </View>
          <View style={s.box}>
            <Text style={s.label}>Intervention</Text>
            <Meta k="Date" v={formatDate(i.intervention_date)} />
            <Meta k="Type de travaux" v={i.work_type} />
            <Meta k="Lieu" v={location} />
            <Meta k="Temps passé" v={i.duration_minutes != null ? formatDuration(i.duration_minutes) : ""} />
          </View>
        </View>

        <View style={s.section}>
          <Text style={[s.sectionTitle, { color: accent }]}>Travaux effectués</Text>
          {i.description ? <Text style={s.para}>{i.description}</Text> : <Text style={s.muted}>Non renseigné.</Text>}
        </View>

        <View style={s.section} wrap={false}>
          <Text style={[s.sectionTitle, { color: accent }]}>Matériel utilisé</Text>
          {i.materials.length ? (
            <View>
              <View style={s.tableHead}>
                <Text style={s.colName}>Désignation</Text>
                <Text style={s.colQty}>Quantité</Text>
              </View>
              {i.materials.map((m, idx) => (
                <View key={idx} style={s.tableRow}>
                  <Text style={s.colName}>{m.name}</Text>
                  <Text style={s.colQty}>{m.quantity != null ? `${m.quantity}${m.unit ? ` ${m.unit}` : ""}` : "—"}</Text>
                </View>
              ))}
            </View>
          ) : (
            <Text style={s.muted}>Aucun matériel indiqué.</Text>
          )}
        </View>

        {i.observations && (
          <View style={s.section}>
            <Text style={[s.sectionTitle, { color: accent }]}>Observations et recommandations</Text>
            <Text style={s.para}>{i.observations}</Text>
          </View>
        )}

        {photoRows.map((row, r) => (
          // Rows never split; the section title stays with the first row.
          <View key={r} wrap={false} style={{ marginBottom: 6 }}>
            {r === 0 && <Text style={[s.sectionTitle, { color: accent }]}>Photos</Text>}
            <View style={s.photos}>
              {row.map((p, idx) => (
                <View key={idx} style={s.photo}>
                  <Image src={p.data} style={s.photoImg} />
                  {p.caption && <Text style={s.caption}>{p.caption}</Text>}
                </View>
              ))}
            </View>
          </View>
        ))}

        <View style={s.signatures} wrap={false}>
          <Text style={s.sigBox}>Signature de l&apos;intervenant</Text>
          <Text style={s.sigBox}>Signature du client</Text>
        </View>
        </View>

        <View style={s.footerLine} fixed />
        <Text style={s.footerText} fixed>{company.document_footer ? `${footerLeft}\n${company.document_footer}` : footerLeft}</Text>
        <Text style={s.pageNumber} fixed render={({ pageNumber, totalPages }) => `Page ${pageNumber} / ${totalPages}`} />
      </Page>
    </Document>
  );
}
