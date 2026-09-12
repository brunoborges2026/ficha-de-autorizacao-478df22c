const fs = require('fs');
const file = 'src/components/form/controls.tsx';
let code = fs.readFileSync(file, 'utf8');

const newMoneyInput = `export function MoneyInput({
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
    let digits = e.target.value.replace(/\\D/g, "");
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
}`;

code = code.replace(/export function MoneyInput.*?<\/div>\s*\);\s*}/s, newMoneyInput);

if (!code.includes('import React')) {
  code = 'import * as React from "react";\n' + code;
}

fs.writeFileSync(file, code);
