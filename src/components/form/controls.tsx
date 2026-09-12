import * as React from "react";
import { Controller, type Control, type FieldValues, type Path } from "react-hook-form";
import { Field } from "@/components/form/Field";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyControl = Control<any>;

export function SelectField<T extends FieldValues>({
  control,
  name,
  label,
  options,
  placeholder = "Selecione",
  error,
  required,
  className,
  allowEmpty,
}: {
  control: Control<T>;
  name: Path<T>;
  label: string;
  options: readonly string[];
  placeholder?: string;
  error?: string | undefined;
  required?: boolean;
  className?: string;
  allowEmpty?: boolean;
}) {
  return (
    <Field label={label} error={error} required={required} className={className}>
      <Controller
        control={control as AnyControl}
        name={name}
        render={({ field }) => (
          <Select
            value={field.value ?? ""}
            onValueChange={(v) => field.onChange(v === "__none" ? undefined : v)}
          >
            <SelectTrigger className={cn(error && "border-destructive")}>
              <SelectValue placeholder={placeholder} />
            </SelectTrigger>
            <SelectContent>
              {allowEmpty && <SelectItem value="__none">—</SelectItem>}
              {options.map((o) => (
                <SelectItem key={o} value={o}>
                  {o}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      />
    </Field>
  );
}

export function CheckboxField<T extends FieldValues>({
  control,
  name,
  label,
  description,
  className,
}: {
  control: Control<T>;
  name: Path<T>;
  label: string;
  description?: string;
  className?: string;
}) {
  return (
    <Controller
      control={control as AnyControl}
      name={name}
      render={({ field }) => (
        <label
          className={cn(
            "flex cursor-pointer items-start gap-3 rounded-md border border-border bg-card px-3 py-2.5 text-sm transition-colors hover:bg-muted/50",
            field.value && "border-primary/50 bg-primary/5",
            className,
          )}
        >
          <Checkbox
            checked={!!field.value}
            onCheckedChange={(v) => field.onChange(!!v)}
            className="mt-0.5"
          />
          <span>
            <span className="font-medium text-foreground">{label}</span>
            {description && (
              <span className="block text-xs text-muted-foreground">{description}</span>
            )}
          </span>
        </label>
      )}
    />
  );
}

export function SwitchField<T extends FieldValues>({
  control,
  name,
  label,
  description,
  className,
}: {
  control: Control<T>;
  name: Path<T>;
  label: string;
  description?: string;
  className?: string;
}) {
  return (
    <Controller
      control={control as AnyControl}
      name={name}
      render={({ field }) => (
        <div
          className={cn(
            "flex items-center justify-between gap-4 rounded-md border border-border bg-card px-4 py-3",
            field.value && "border-primary/50 bg-primary/5",
            className,
          )}
        >
          <div>
            <p className="text-sm font-semibold text-foreground">{label}</p>
            {description && <p className="text-xs text-muted-foreground">{description}</p>}
          </div>
          <Switch checked={!!field.value} onCheckedChange={field.onChange} />
        </div>
      )}
    />
  );
}

export function MoneyInput({
  value,
  onChange,
  placeholder = "0,00",
  className,
  error,
}: {
  value: string | number | undefined;
  onChange: (v: string) => void;
  placeholder?: string;
  className?: string;
  error?: boolean;
}) {
  const formatValue = (val: string | number | undefined) => {
    if (val === undefined || val === null || val === "") return "";
    const num = typeof val === "string" ? parseFloat(val) : val;
    if (isNaN(num)) return "";
    return new Intl.NumberFormat("pt-BR", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(num);
  };

  const [displayValue, setDisplayValue] = React.useState(() => formatValue(value));

  React.useEffect(() => {
    setDisplayValue(formatValue(value));
  }, [value]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let digits = e.target.value.replace(/\D/g, "");
    if (!digits) {
      setDisplayValue("");
      onChange("");
      return;
    }
    const num = parseInt(digits, 10) / 100;
    const formatted = new Intl.NumberFormat("pt-BR", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(num);
    setDisplayValue(formatted);
    onChange(num.toString());
  };

  return (
    <div className="relative">
      <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-sm text-muted-foreground">
        R$
      </span>
      <Input
        inputMode="numeric"
        placeholder={placeholder}
        className={cn("pl-9", error && "border-destructive", className)}
        value={displayValue}
        onChange={handleChange}
      />
    </div>
  );
}

export function SectionTitle({ children, hint }: { children: React.ReactNode; hint?: string }) {
  return (
    <div className="col-span-12 mt-2 border-b border-border pb-2 first:mt-0">
      <h3 className="text-sm font-bold uppercase tracking-wide text-secondary">{children}</h3>
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}
