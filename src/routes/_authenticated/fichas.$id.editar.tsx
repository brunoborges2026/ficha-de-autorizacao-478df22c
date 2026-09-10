import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ArrowLeft, Loader2, Lock } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { Stepper } from "@/components/ficha/Stepper";
import { OwnerStep } from "@/components/ficha/steps/OwnerStep";
import { PropertyStep } from "@/components/ficha/steps/PropertyStep";
import { ConditionsStep } from "@/components/ficha/steps/ConditionsStep";
import { Button } from "@/components/ui/button";
import { authorizationQueryOptions, updateAuthorization } from "@/lib/authorizations";
import {
  conditionsDefaults,
  ownerDefaults,
  propertyDefaults,
  type ConditionsData,
  type ConditionsInput,
  type OwnerData,
  type OwnerInput,
  type PropertyData,
  type PropertyInput,
} from "@/lib/schemas";

export const Route = createFileRoute("/_authenticated/fichas/$id/editar")({
  head: () => ({
    meta: [
      { title: "Editar ficha | Vetorial Autorizações" },
      {
        name: "description",
        content: "Edite uma autorização de comercialização ainda não assinada.",
      },
      { name: "robots", content: "noindex" },
      { property: "og:title", content: "Editar ficha | Vetorial Autorizações" },
      {
        property: "og:description",
        content: "Edite uma autorização de comercialização ainda não assinada.",
      },
    ],
  }),
  component: EditFichaPage,
});

function EditFichaPage() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const fichaQ = useQuery(authorizationQueryOptions(id));
  const [step, setStep] = useState(0);
  const [owner, setOwner] = useState<OwnerInput | null>(null);
  const [property, setProperty] = useState<PropertyInput | null>(null);
  const [conditions, setConditions] = useState<ConditionsInput | null>(null);
  const [saving, setSaving] = useState(false);

  const ficha = fichaQ.data;

  useEffect(() => {
    if (!ficha || owner) return;
    setOwner({ ...ownerDefaults, ...(ficha.owner ?? {}) });
    setProperty({ ...propertyDefaults, ...(ficha.property ?? {}) });
    setConditions({ ...conditionsDefaults, ...(ficha.conditions ?? {}) });
  }, [ficha, owner]);

  if (fichaQ.isLoading) {
    return (
      <AppShell title="Editar ficha">
        <div className="grid place-items-center py-24">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      </AppShell>
    );
  }

  if (!ficha) {
    return (
      <AppShell title="Ficha não encontrada">
        <p className="text-sm text-muted-foreground">
          Esta ficha não existe ou você não tem acesso a ela.
        </p>
        <Button asChild className="mt-4">
          <Link to="/dashboard">
            <ArrowLeft className="h-4 w-4" /> Voltar ao dashboard
          </Link>
        </Button>
      </AppShell>
    );
  }

  if (ficha.status === "assinado") {
    return (
      <AppShell title="Ficha já assinada" description="Fichas assinadas não podem ser alteradas.">
        <div className="rounded-lg border border-border bg-card p-6 text-center shadow-sm">
          <Lock className="mx-auto h-10 w-10 text-muted-foreground" />
          <p className="mt-3 text-sm text-muted-foreground">
            Esta autorização já foi assinada digitalmente pelo proprietário e está preservada como
            documento final.
          </p>
          <Button asChild className="mt-4">
            <Link to="/fichas/$id" params={{ id }}>
              Ver ficha assinada
            </Link>
          </Button>
        </div>
      </AppShell>
    );
  }

  const save = async (values: ConditionsData) => {
    setSaving(true);
    try {
      await updateAuthorization(id, {
        owner: owner as unknown as OwnerData,
        property: property as unknown as PropertyData,
        conditions: values,
      });
      await queryClient.invalidateQueries({ queryKey: ["authorization", id] });
      await queryClient.invalidateQueries({ queryKey: ["authorizations"] });
      toast.success("Ficha atualizada!");
      navigate({ to: "/fichas/$id", params: { id } });
    } catch (e) {
      toast.error("Não foi possível salvar as alterações", { description: (e as Error).message });
    } finally {
      setSaving(false);
    }
  };

  return (
    <AppShell
      title="Editar ficha"
      description="O link de assinatura continua o mesmo — basta reenviar após salvar."
      actions={
        <Button variant="ghost" onClick={() => navigate({ to: "/fichas/$id", params: { id } })}>
          Cancelar
        </Button>
      }
    >
      <div className="space-y-6">
        <div className="rounded-lg border border-border bg-card p-5 shadow-sm">
          <Stepper current={step} />
        </div>
        <div className="rounded-lg border border-border bg-card p-5 shadow-sm sm:p-6">
          {!owner || !property || !conditions ? null : step === 0 ? (
            <OwnerStep
              defaultValues={owner}
              onChange={setOwner}
              onNext={(v) => {
                setOwner(v as unknown as OwnerInput);
                setStep(1);
              }}
            />
          ) : step === 1 ? (
            <PropertyStep
              defaultValues={property}
              onChange={setProperty}
              onBack={() => setStep(0)}
              onNext={(v) => {
                setProperty(v as unknown as PropertyInput);
                setStep(2);
              }}
            />
          ) : (
            <ConditionsStep
              defaultValues={conditions}
              onChange={setConditions}
              onBack={() => setStep(1)}
              onSubmit={save}
              submitting={saving}
            />
          )}
        </div>
      </div>
    </AppShell>
  );
}
