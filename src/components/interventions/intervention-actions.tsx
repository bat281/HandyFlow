"use client";
import { useTransition } from "react";
import { CheckCircle2, Loader2, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import { deleteIntervention, setInterventionStatus } from "@/app/(app)/interventions/actions";
import { Button } from "@/components/ui/button";
import { ConfirmDelete } from "@/components/confirm-delete";
import type { InterventionStatus } from "@/lib/types";

export function StatusToggle({ id, status }: { id: string; status: InterventionStatus }) {
  const [pending, start] = useTransition();
  const next = status === "completed" ? "draft" : "completed";
  return (
    <Button
      variant={status === "completed" ? "outline" : "brand"}
      disabled={pending}
      onClick={() =>
        start(async () => {
          const res = await setInterventionStatus(id, next);
          if (res.message) toast.error(res.message);
          else toast.success(next === "completed" ? "Rapport marqué comme terminé" : "Rapport rouvert pour modification");
        })
      }
    >
      {pending ? <Loader2 className="animate-spin" /> : status === "completed" ? <RotateCcw /> : <CheckCircle2 />}
      {status === "completed" ? "Rouvrir le rapport" : "Terminer le rapport"}
    </Button>
  );
}

export function DeleteInterventionButton({ id }: { id: string }) {
  return (
    <ConfirmDelete
      title="Supprimer cette intervention ?"
      description="L'intervention, son rapport et ses photos seront supprimés définitivement."
      onConfirm={() => deleteIntervention(id)}
    />
  );
}
