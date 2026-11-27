"use client";
import { useState } from "react";
import { Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { Material } from "@/lib/types";

type Row = { key: number; name: string; quantity: string; unit: string };
let seq = 0;
const toRow = (m?: Partial<Material>): Row => ({
  key: ++seq,
  name: m?.name ?? "",
  quantity: m?.quantity == null ? "" : String(m.quantity),
  unit: m?.unit ?? "",
});

export function MaterialsEditor({ initial, error }: { initial: Material[]; error?: string[] }) {
  const [rows, setRows] = useState<Row[]>(() => (initial.length ? initial.map(toRow) : []));
  const update = (key: number, patch: Partial<Row>) => setRows((r) => r.map((x) => (x.key === key ? { ...x, ...patch } : x)));
  const json = JSON.stringify(rows.map(({ name, quantity, unit }) => ({ name, quantity, unit })));

  return (
    <div className="grid gap-2">
      <input type="hidden" name="materials_json" value={json} />
      {rows.length > 0 && (
        <div className="hidden grid-cols-[1fr_6rem_6rem_2.5rem] gap-2 px-1 text-xs font-medium text-muted-foreground sm:grid">
          <span>Désignation</span><span>Quantité</span><span>Unité</span><span />
        </div>
      )}
      {rows.map((row, idx) => (
        <div key={row.key} className="grid grid-cols-[1fr_2.5rem] gap-2 rounded-lg border bg-muted/40 p-2 sm:grid-cols-[1fr_6rem_6rem_2.5rem] sm:border-0 sm:bg-transparent sm:p-0">
          <Input aria-label={`Matériau ${idx + 1}`} placeholder="ex. Raccord laiton 1/2&quot;" value={row.name} onChange={(e) => update(row.key, { name: e.target.value })} className="col-span-1" />
          <Button type="button" variant="ghost" size="icon" aria-label="Retirer" onClick={() => setRows((r) => r.filter((x) => x.key !== row.key))} className="sm:order-last">
            <X />
          </Button>
          <div className="col-span-2 grid grid-cols-2 gap-2 sm:col-span-2 sm:contents">
            <Input aria-label="Quantité" placeholder="Qté" inputMode="decimal" value={row.quantity} onChange={(e) => update(row.key, { quantity: e.target.value })} />
            <Input aria-label="Unité" placeholder="pce, m, kg…" value={row.unit} onChange={(e) => update(row.key, { unit: e.target.value })} />
          </div>
        </div>
      ))}
      {error?.[0] && <p className="text-sm text-destructive" role="alert">{error[0]}</p>}
      <Button type="button" variant="outline" className="w-fit" onClick={() => setRows((r) => [...r, toRow()])}>
        <Plus /> Ajouter un matériau
      </Button>
    </div>
  );
}
