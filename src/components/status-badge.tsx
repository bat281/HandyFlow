import { Badge } from "@/components/ui/badge";
import { t } from "@/lib/i18n";
import type { InterventionStatus } from "@/lib/types";

export function InterventionStatusBadge({ status }: { status: InterventionStatus }) {
  return status === "completed" ? (
    <Badge variant="success">{t.status.intervention.completed}</Badge>
  ) : (
    <Badge variant="warning">{t.status.intervention.draft}</Badge>
  );
}
