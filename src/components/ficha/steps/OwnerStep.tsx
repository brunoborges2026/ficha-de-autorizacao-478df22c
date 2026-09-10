import { useForm, type Control } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowRight } from "lucide-react";
import { Field } from "@/components/form/Field";
import { SelectField, SectionTitle } from "@/components/form/controls";
import { AddressFields } from "@/components/form/AddressFields";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ESTADO_CIVIL_OPTIONS, ownerSchema, type OwnerData, type OwnerInput } from "@/lib/schemas";
import { maskCPF, maskPhone } from "@/lib/format";

export function OwnerStep({
  defaultValues,
  onNext,
  onChange,
}: {
  defaultValues: OwnerInput;
  onNext: (v: OwnerData) => void;
  onChange?: (v: OwnerInput) => void;
}) {
  const form = useForm<OwnerInput, unknown, OwnerData>({
    resolver: zodResolver(ownerSchema),
    defaultValues,
    mode: "onBlur",
  });
  const { errors } = form.formState;

  return (
    <form
      onSubmit={form.handleSubmit(onNext)}
      onBlur={() => onChange?.(form.getValues())}
      className="grid grid-cols-12 gap-4"
      noValidate
    >
      <SectionTitle>Identificação</SectionTitle>
      <Field
        label="Nome completo"
        required
        error={errors.nome?.message}
        className="col-span-12 md:col-span-8"
      >
        <Input
          autoComplete="off"
          placeholder="Nome como consta no documento"
          {...form.register("nome")}
        />
      </Field>
      <Field
        label="Data de nascimento"
        required
        error={errors.dataNascimento?.message}
        className="col-span-12 md:col-span-4"
      >
        <Input type="date" {...form.register("dataNascimento")} />
      </Field>
      <Field label="RG" required error={errors.rg?.message} className="col-span-6 md:col-span-3">
        <Input placeholder="00.000.000-0" {...form.register("rg")} />
      </Field>
      <Field label="CPF" required error={errors.cpf?.message} className="col-span-6 md:col-span-3">
        <Input
          inputMode="numeric"
          placeholder="000.000.000-00"
          {...form.register("cpf", {
            onChange: (e) => form.setValue("cpf", maskCPF(e.target.value)),
          })}
        />
      </Field>
      <SelectField
        control={form.control as Control<OwnerInput>}
        name="estadoCivil"
        label="Estado civil"
        required
        options={ESTADO_CIVIL_OPTIONS}
        error={errors.estadoCivil?.message}
        className="col-span-12 md:col-span-3"
      />
      <Field
        label="Nacionalidade"
        required
        error={errors.nacionalidade?.message}
        className="col-span-6 md:col-span-3"
      >
        <Input {...form.register("nacionalidade")} />
      </Field>
      <Field
        label="Profissão"
        required
        error={errors.profissao?.message}
        className="col-span-6 md:col-span-4"
      >
        <Input {...form.register("profissao")} />
      </Field>
      <Field
        label="E-mail"
        required
        error={errors.email?.message}
        className="col-span-12 md:col-span-4"
      >
        <Input type="email" placeholder="email@exemplo.com" {...form.register("email")} />
      </Field>
      <Field
        label="Telefone / WhatsApp"
        required
        error={errors.telefone?.message}
        className="col-span-12 md:col-span-4"
        hint="Usado para enviar o link de assinatura"
      >
        <Input
          inputMode="tel"
          placeholder="(12) 99999-9999"
          {...form.register("telefone", {
            onChange: (e) => form.setValue("telefone", maskPhone(e.target.value)),
          })}
        />
      </Field>

      <SectionTitle>Endereço residencial</SectionTitle>
      <AddressFields form={form} prefix="endereco" errors={errors.endereco} />

      <div className="col-span-12 flex justify-end pt-2">
        <Button type="submit" size="lg">
          Próximo: Imóvel <ArrowRight className="h-4 w-4" />
        </Button>
      </div>
    </form>
  );
}
