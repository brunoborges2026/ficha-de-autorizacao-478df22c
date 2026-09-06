import { Controller, useForm, type Control } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { Field } from "@/components/form/Field";
import { CheckboxField, MoneyInput, SectionTitle, SelectField } from "@/components/form/controls";
import { AddressFields } from "@/components/form/AddressFields";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  COBERTURA_VAGA_OPTIONS,
  COZINHA_OPTIONS,
  ESTADO_IMOVEL_OPTIONS,
  PERIODICIDADE_OPTIONS,
  PLANEJADOS_OPTIONS,
  SALAS_OPTIONS,
  TIPO_IMOVEL_OPTIONS,
  propertySchema,
  type PropertyData,
  type PropertyInput,
} from "@/lib/schemas";
import { maskPhone } from "@/lib/format";

const numProps = { type: "number" as const, inputMode: "decimal" as const, min: 0, step: "any" };

export function PropertyStep({
  defaultValues,
  onNext,
  onBack,
  onChange,
}: {
  defaultValues: PropertyInput;
  onNext: (v: PropertyData) => void;
  onBack: () => void;
  onChange?: (v: PropertyInput) => void;
}) {
  const form = useForm<PropertyInput, unknown, PropertyData>({
    resolver: zodResolver(propertySchema),
    defaultValues,
    mode: "onBlur",
  });
  const { errors } = form.formState;
  const control = form.control as Control<PropertyInput>;
  const estado = form.watch("estado");
  const emNomeTerceiro = form.watch("emNomeTerceiro");

  const NumField = ({ name, label, className, suffix }: { name: keyof PropertyInput; label: string; className: string; suffix?: string }) => (
    <Field label={label} error={(errors as Record<string, { message?: string } | undefined>)[name]?.message} className={className}>
      <div className="relative">
        <Input {...numProps} className={suffix ? "pr-10" : undefined} {...form.register(name)} />
        {suffix && (
          <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-xs text-muted-foreground">
            {suffix}
          </span>
        )}
      </div>
    </Field>
  );

  return (
    <form
      onSubmit={form.handleSubmit(onNext)}
      onBlur={() => onChange?.(form.getValues())}
      className="grid grid-cols-12 gap-4"
      noValidate
    >
      <SectionTitle>Identificação do imóvel</SectionTitle>
      <Field label="Código do imóvel" error={errors.codigo?.message} className="col-span-6 md:col-span-3">
        <Input placeholder="Ex.: VT-1024" {...form.register("codigo")} />
      </Field>
      <Field label="Captador" error={errors.captador?.message} className="col-span-6 md:col-span-5">
        <Input {...form.register("captador")} />
      </Field>
      <SelectField control={control} name="tipo" label="Tipo" required options={TIPO_IMOVEL_OPTIONS} error={errors.tipo?.message} className="col-span-6 md:col-span-2" />
      <SelectField control={control} name="estado" label="Estado" required options={ESTADO_IMOVEL_OPTIONS} error={errors.estado?.message} className="col-span-6 md:col-span-2" />
      {estado === "Em construção" && (
        <Field label="Previsão de entrega" error={errors.previsaoEntrega?.message} className="col-span-6 md:col-span-3">
          <Input placeholder="Ex.: dez/2026" {...form.register("previsaoEntrega")} />
        </Field>
      )}
      <Field label="Matrícula" error={errors.matricula?.message} className="col-span-6 md:col-span-3">
        <Input {...form.register("matricula")} />
      </Field>
      <Field label="Nº IPTU" error={errors.numeroIptu?.message} className="col-span-6 md:col-span-3">
        <Input {...form.register("numeroIptu")} />
      </Field>

      <SectionTitle>Endereço do imóvel</SectionTitle>
      <AddressFields form={form} prefix="endereco" errors={errors.endereco} />

      <SectionTitle>Distribuição</SectionTitle>
      <NumField name="dormitorios" label="Dormitórios" className="col-span-4 md:col-span-2" />
      <NumField name="suites" label="Suítes" className="col-span-4 md:col-span-2" />
      <NumField name="banheiros" label="Banheiros sociais" className="col-span-4 md:col-span-2" />
      <NumField name="lavabos" label="Lavabos" className="col-span-4 md:col-span-2" />
      <NumField name="salaEstar" label="Salas de estar" className="col-span-4 md:col-span-2" />
      <NumField name="salaJantar" label="Salas de jantar" className="col-span-4 md:col-span-2" />
      <SelectField control={control} name="salas" label="Salas" allowEmpty options={SALAS_OPTIONS} className="col-span-6 md:col-span-3" />
      <SelectField control={control} name="cozinha" label="Cozinha" allowEmpty options={COZINHA_OPTIONS} className="col-span-6 md:col-span-3" />
      <Field label="Obs. da cozinha" error={errors.cozinhaObs?.message} className="col-span-12 md:col-span-6">
        <Input placeholder="Ex.: com armários, copa..." {...form.register("cozinhaObs")} />
      </Field>
      <CheckboxField control={control} name="areaServico" label="Área de serviço" className="col-span-6 md:col-span-3" />
      <CheckboxField control={control} name="deposito" label="Depósito / Hobby box" className="col-span-6 md:col-span-3" />
      <NumField name="vagas" label="Vagas de garagem" className="col-span-6 md:col-span-2" />
      <SelectField control={control} name="coberturaVaga" label="Cobertura das vagas" allowEmpty options={COBERTURA_VAGA_OPTIONS} className="col-span-6 md:col-span-4" />

      <div className="col-span-12">
        <p className="mb-2 text-[13px] font-medium text-foreground/90">Móveis planejados</p>
        <Controller
          control={control}
          name="planejados"
          render={({ field }) => (
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {PLANEJADOS_OPTIONS.map((opt) => {
                const list = (field.value ?? []) as string[];
                const checked = list.includes(opt);
                return (
                  <label key={opt} className="flex cursor-pointer items-center gap-2 rounded-md border border-border bg-card px-3 py-2 text-sm hover:bg-muted/50">
                    <Checkbox
                      checked={checked}
                      onCheckedChange={(v) => field.onChange(v ? [...list, opt] : list.filter((x) => x !== opt))}
                    />
                    {opt}
                  </label>
                );
              })}
            </div>
          )}
        />
      </div>

      <SectionTitle>Metragens</SectionTitle>
      <NumField name="frente" label="Frente / Testada" suffix="m" className="col-span-6 md:col-span-3" />
      <NumField name="ladoDireito" label="Lado direito" suffix="m" className="col-span-6 md:col-span-3" />
      <NumField name="ladoEsquerdo" label="Lado esquerdo" suffix="m" className="col-span-6 md:col-span-3" />
      <NumField name="fundos" label="Fundos" suffix="m" className="col-span-6 md:col-span-3" />
      <NumField name="areaTerreno" label="Área do terreno" suffix="m²" className="col-span-4" />
      <NumField name="areaConstruida" label="Área construída" suffix="m²" className="col-span-4" />
      <NumField name="areaUtil" label="Área útil" suffix="m²" className="col-span-4" />

      <SectionTitle>Chaves</SectionTitle>
      <Field label="Local das chaves" className="col-span-12 md:col-span-5">
        <Input placeholder="Ex.: Na imobiliária, com o porteiro..." {...form.register("chavesLocal")} />
      </Field>
      <Field label="Nome do contato" className="col-span-7 md:col-span-4">
        <Input {...form.register("chavesNome")} />
      </Field>
      <Field label="Telefone" className="col-span-5 md:col-span-3">
        <Input inputMode="tel" {...form.register("chavesTelefone", { onChange: (e) => form.setValue("chavesTelefone", maskPhone(e.target.value)) })} />
      </Field>

      <SectionTitle>Condomínio, IPTU e documentação</SectionTitle>
      <Field label="Valor do condomínio (mensal)" error={errors.valorCondominio?.message} className="col-span-12 md:col-span-4">
        <Controller control={control} name="valorCondominio" render={({ field }) => <MoneyInput value={field.value} onChange={field.onChange} error={!!errors.valorCondominio} />} />
      </Field>
      <Field label="Valor do IPTU" error={errors.valorIptu?.message} className="col-span-7 md:col-span-4">
        <Controller control={control} name="valorIptu" render={({ field }) => <MoneyInput value={field.value} onChange={field.onChange} error={!!errors.valorIptu} />} />
      </Field>
      <SelectField control={control} name="periodicidadeIptu" label="Periodicidade" options={PERIODICIDADE_OPTIONS} className="col-span-5 md:col-span-4" />
      <CheckboxField control={control} name="documentacaoOk" label="Documentação OK" description="Aceita financiamento" className="col-span-12 md:col-span-4" />
      <CheckboxField control={control} name="averbado" label="Imóvel averbado" className="col-span-12 md:col-span-4" />
      <CheckboxField control={control} name="emNomeTerceiro" label="Em nome de terceiro" className="col-span-12 md:col-span-4" />
      {emNomeTerceiro && (
        <Field label="Nome do terceiro" className="col-span-12 md:col-span-8">
          <Input {...form.register("nomeTerceiro")} />
        </Field>
      )}

      <div className="col-span-12 flex justify-between pt-2">
        <Button type="button" variant="outline" size="lg" onClick={() => { onChange?.(form.getValues()); onBack(); }}>
          <ArrowLeft className="h-4 w-4" /> Voltar
        </Button>
        <Button type="submit" size="lg">
          Próximo: Condições <ArrowRight className="h-4 w-4" />
        </Button>
      </div>
    </form>
  );
}
