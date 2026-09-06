import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

export const WIZARD_STEPS = [
  { title: "Proprietário", hint: "Dados pessoais e contato" },
  { title: "Imóvel", hint: "Descrição completa" },
  { title: "Condições", hint: "Valores e honorários" },
] as const;

export function Stepper({ current }: { current: number }) {
  return (
    <ol className="grid grid-cols-3 gap-2">
      {WIZARD_STEPS.map((s, i) => {
        const done = i < current;
        const active = i === current;
        return (
          <li key={s.title} className="flex flex-col gap-2">
            <div className="flex items-center gap-2">
              <span
                className={cn(
                  "grid h-8 w-8 shrink-0 place-items-center rounded-full border-2 text-sm font-bold transition-colors",
                  done && "border-primary bg-primary text-primary-foreground",
                  active && "border-primary bg-card text-primary shadow-elegant",
                  !done && !active && "border-border bg-card text-muted-foreground",
                )}
              >
                {done ? <Check className="h-4 w-4" /> : i + 1}
              </span>
              <div className="hidden min-w-0 sm:block">
                <p className={cn("truncate text-sm font-semibold", active ? "text-foreground" : "text-muted-foreground")}>
                  {s.title}
                </p>
                <p className="truncate text-xs text-muted-foreground">{s.hint}</p>
              </div>
            </div>
            <div className={cn("h-1 rounded-full", done || active ? "bg-primary" : "bg-border")} />
            <p className={cn("text-xs font-semibold sm:hidden", active ? "text-foreground" : "text-muted-foreground")}>
              {s.title}
            </p>
          </li>
        );
      })}
    </ol>
  );
}
