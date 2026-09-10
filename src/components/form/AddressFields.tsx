import { useState } from "react";
import type { Control, FieldErrors, UseFormReturn } from "react-hook-form";
import { Loader2 } from "lucide-react";
import { Field } from "@/components/form/Field";
import { SelectField } from "@/components/form/controls";
import { Input } from "@/components/ui/input";
import { UF_OPTIONS, type Address } from "@/lib/schemas";
import { maskCEP, onlyDigits } from "@/lib/format";

/** 12-col grid of address inputs with ViaCEP auto-fill. `prefix` is the nested object path (e.g. "endereco"). */
export function AddressFields({
  form,
  prefix,
  errors,
}: {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  form: UseFormReturn<any>;
  prefix: string;
  errors?: FieldErrors<Address> | undefined;
}) {
  const [loading, setLoading] = useState(false);
  const p = (k: keyof Address) => `${prefix}.${k}`;

  async function lookup(cep: string) {
    const digits = onlyDigits(cep);
    if (digits.length !== 8) return;
    setLoading(true);
    try {
      const res = await fetch(`https://viacep.com.br/ws/${digits}/json/`);
      const data = await res.json();
      if (!data.erro) {
        if (data.logradouro)
          form.setValue(p("logradouro"), data.logradouro, { shouldValidate: true });
        if (data.bairro) form.setValue(p("bairro"), data.bairro, { shouldValidate: true });
        if (data.localidade) form.setValue(p("cidade"), data.localidade, { shouldValidate: true });
        if (data.uf) form.setValue(p("uf"), data.uf, { shouldValidate: true });
        form.setFocus(p("numero"));
      }
    } catch {
      /* offline lookup failure is fine; user types manually */
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <Field label="CEP" required error={errors?.cep?.message} className="col-span-6 md:col-span-3">
        <div className="relative">
          <Input
            inputMode="numeric"
            placeholder="00000-000"
            {...form.register(p("cep"), {
              onChange: (e) => {
                const v = maskCEP(e.target.value);
                form.setValue(p("cep"), v);
                if (onlyDigits(v).length === 8) lookup(v);
              },
            })}
          />
          {loading && (
            <Loader2 className="absolute right-3 top-2.5 h-4 w-4 animate-spin text-primary" />
          )}
        </div>
      </Field>
      <Field
        label="Logradouro"
        required
        error={errors?.logradouro?.message}
        className="col-span-12 md:col-span-7"
      >
        <Input placeholder="Rua, Avenida..." {...form.register(p("logradouro"))} />
      </Field>
      <Field
        label="Nº"
        required
        error={errors?.numero?.message}
        className="col-span-6 md:col-span-2"
      >
        <Input {...form.register(p("numero"))} />
      </Field>
      <Field
        label="Complemento"
        error={errors?.complemento?.message}
        className="col-span-12 md:col-span-4"
      >
        <Input placeholder="Apto, bloco, casa..." {...form.register(p("complemento"))} />
      </Field>
      <Field
        label="Bairro"
        required
        error={errors?.bairro?.message}
        className="col-span-12 md:col-span-3"
      >
        <Input {...form.register(p("bairro"))} />
      </Field>
      <Field
        label="Cidade"
        required
        error={errors?.cidade?.message}
        className="col-span-8 md:col-span-3"
      >
        <Input {...form.register(p("cidade"))} />
      </Field>
      <SelectField
        control={form.control as Control}
        name={p("uf")}
        label="UF"
        required
        options={UF_OPTIONS}
        error={errors?.uf?.message}
        className="col-span-4 md:col-span-2"
      />
    </>
  );
}
