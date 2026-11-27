"use client";
import { deleteCustomer } from "@/app/(app)/clients/actions";
import { ConfirmDelete } from "@/components/confirm-delete";

export function DeleteCustomerButton({ id, name }: { id: string; name: string }) {
  return (
    <ConfirmDelete
      title={`Supprimer ${name} ?`}
      description="Cette action est définitive. Les clients ayant des interventions ne peuvent pas être supprimés."
      onConfirm={() => deleteCustomer(id)}
    />
  );
}
