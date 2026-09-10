import { Controller, useForm, type Control } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowLeft, FileCheck2, Loader2 } from "lucide-react";
import { Field } from "@/components/form/Field";
import { MoneyInput, SectionTitle, SwitchField } from "@/components/form/controls";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { conditionsSchema, type ConditionsData, type ConditionsInput } from "@/lib/schemas";

export function ConditionsStep({
  defaultValues,
  onSubmit,
  onBack,
  onChange,
  submitting,
}: {
  defaultValues: ConditionsInput;
  onSubmit: (v: ConditionsData) => void;
  onBack: () => void;
  onChange?: (v: ConditionsInput) => void;
  submitting?: boolean;
}) {
  const form = useForm<ConditionsInput, unknown, ConditionsData>({
    resolver: zodResolver(conditionsSchema),
    defaultValues,
  });
  const { errors } = form.formState;
  const control = form.control as Control<ConditionsInput>;
  const venda = form.watch("autorizaVenda");
  const locacao = form.watch("autorizaLocacao");
  const permuta = form.watch("aceitaPermuta");

  return (
    <form
      onSubmit={form.handleSubmit(onSubmit)}
      onBlur={() => onChange?.(form.getValues())}
      className="grid grid-cols-12 gap-4"
      noValidate
    >
      <SectionTitle>Modalidades autorizadas</SectionTitle>
      <SwitchField
        control={control}
        name="autorizaVenda"
        label="Venda"
        description="Autorizar a venda do imóvel"
        className="col-span-12 md:col-span-6"
      />
      <SwitchField
        control={control}
        name="autorizaLocacao"
        label="Locação"
        description="Autorizar a locação do imóvel"
        className="col-span-12 md:col-span-6"
      />
      {errors.autorizaVenda && (
        <p className="col-span-12 -mt-2 text-xs font-medium text-destructive">
          {errors.autorizaVenda.message}
        </p>
      )}
      <Field
        label="Valor de venda"
        required={!!venda}
        error={errors.valorVenda?.message}
        className="col-span-12 md:col-span-6"
      >
        <Controller
          control={control}
          name="valorVenda"
          render={({ field }) => (
            <MoneyInput
              value={field.value}
              onChange={field.onChange}
              error={!!errors.valorVenda}
              className={!venda ? "opacity-50" : ""}
            />
          )}
        />
      </Field>
      <Field
        label="Valor de locação (mensal)"
        required={!!locacao}
        error={errors.valorLocacao?.message}
        className="col-span-12 md:col-span-6"
      >
        <Controller
          control={control}
          name="valorLocacao"
          render={({ field }) => (
            <MoneyInput
              value={field.value}
              onChange={field.onChange}
              error={!!errors.valorLocacao}
              className={!locacao ? "opacity-50" : ""}
            />
          )}
        />
      </Field>

      <SectionTitle>Condições</SectionTitle>
      <SwitchField
        control={control}
        name="administracao"
        label="Administração Vetorial"
        description="A Vetorial administra a locação"
        className="col-span-12 md:col-span-4"
      />
      <SwitchField
        control={control}
        name="exclusividade"
        label="Exclusividade"
        description="Comercialização exclusiva"
        className="col-span-12 md:col-span-4"
      />
      <SwitchField
        control={control}
        name="aceitaPermuta"
        label="Aceita permuta"
        description="Troca por outro bem"
        className="col-span-12 md:col-span-4"
      />
      {permuta && (
        <Field label="Qual permuta aceita?" className="col-span-12">
          <Input
            placeholder="Ex.: apartamento de menor valor, veículo..."
            {...form.register("permutaDescricao")}
          />
        </Field>
      )}

      <SectionTitle hint="Padrão da Vetorial já preenchido — ajuste se necessário.">
        Honorários
      </SectionTitle>
      <Field
        label="Honorários — Venda"
        required
        error={errors.honorariosVenda?.message}
        className="col-span-12 md:col-span-6"
      >
        <Textarea rows={2} {...form.register("honorariosVenda")} />
      </Field>
      <Field
        label="Honorários — Locação"
        required
        error={errors.honorariosLocacao?.message}
        className="col-span-12 md:col-span-6"
      >
        <Textarea rows={2} {...form.register("honorariosLocacao")} />
      </Field>
      <Field label="Observações" error={errors.observacoes?.message} className="col-span-12">
        <Textarea
          rows={4}
          placeholder="Informações adicionais relevantes para a comercialização"
          {...form.register("observacoes")}
        />
      </Field>

      <div className="col-span-12 flex flex-col-reverse gap-3 pt-2 sm:flex-row sm:justify-between">
        <Button
          type="button"
          variant="outline"
          size="lg"
          onClick={() => {
            onChange?.(form.getValues());
            onBack();
          }}
          disabled={submitting}
        >
          <ArrowLeft className="h-4 w-4" /> Voltar
        </Button>
        <Button
          type="submit"
          size="lg"
          variant="secondary"
          className="bg-secondary text-secondary-foreground hover:bg-secondary/90"
          disabled={submitting}
        >
          {submitting ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <FileCheck2 className="h-4 w-4" />
          )}
          Gerar Ficha
        </Button>
      </div>
    </form>
  );
}
