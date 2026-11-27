import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

export function FormField({
  id, label, error, hint, optional, className, children,
}: {
  id: string;
  label: string;
  error?: string[] | string;
  hint?: string;
  optional?: boolean;
  className?: string;
  children: React.ReactNode;
}) {
  const msg = Array.isArray(error) ? error[0] : error;
  return (
    <div className={cn("grid gap-2", className)}>
      <Label htmlFor={id}>
        {label}
        {optional && <span className="font-normal text-muted-foreground">(facultatif)</span>}
      </Label>
      {children}
      {msg ? (
        <p id={`${id}-error`} className="text-sm text-destructive" role="alert">{msg}</p>
      ) : hint ? (
        <p className="text-xs text-muted-foreground">{hint}</p>
      ) : null}
    </div>
  );
}
