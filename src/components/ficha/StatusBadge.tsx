import { CheckCircle2, Clock } from "lucide-react";
import { cn } from "@/lib/utils";

export function StatusBadge({
  status,
  className,
}: {
  status: "pendente" | "assinado";
  className?: string;
}) {
  const signed = status === "assinado";
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-semibold",
        signed
          ? "border-success/30 bg-success/10 text-success"
          : "border-warning/40 bg-warning/15 text-warning-foreground",
        className,
      )}
    >
      {signed ? <CheckCircle2 className="h-3.5 w-3.5" /> : <Clock className="h-3.5 w-3.5" />}
      {signed ? "Assinado" : "Pendente"}
    </span>
  );
}
