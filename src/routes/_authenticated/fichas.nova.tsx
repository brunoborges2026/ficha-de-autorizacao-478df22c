import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { CheckCircle2, Copy, MessageCircle } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { Stepper } from "@/components/ficha/Stepper";
import { OwnerStep } from "@/components/ficha/steps/OwnerStep";
import { PropertyStep } from "@/components/ficha/steps/PropertyStep";
import { ConditionsStep } from "@/components/ficha/steps/ConditionsStep";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/hooks/use-auth";
import { createAuthorization, signingUrl } from "@/lib/authorizations";
import { buildWhatsappMessage, shortAddress, whatsappLink } from "@/lib/format";
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

export const Route = createFileRoute("/_authenticated/fichas/nova")({
  head: () => ({
    meta: [
      { title: "Nova ficha | Vetorial Autorizações" },
      { name: "description", content: "Crie uma autorização de comercialização em três etapas." },
      { name: "robots", content: "noindex" },
      { property: "og:title", content: "Nova ficha | Vetorial Autorizações" },
      { property: "og:description", content: "Crie uma autorização de comercialização em três etapas." },
    ],
  }),
  component: NovaFichaPage,
});

const DRAFT_KEY = "vetorial:ficha-draft";

type Draft = { step: number; owner: OwnerInput; property: PropertyInput; conditions: ConditionsInput };

function loadDraft(): Draft | null {
  try {
    const raw = localStorage.getItem(DRAFT_KEY);
    return raw ? (JSON.parse(raw) as Draft) : null;
  } catch {
    return null;
  }
}

function NovaFichaPage() {
  const navigate = useNavigate();
  const { displayName, creci, isAdmin } = useAuth();
  const [ready, setReady] = useState(false);
  const [step, setStep] = useState(0);
  const [owner, setOwner] = useState<OwnerInput>(ownerDefaults);
  const [property, setProperty] = useState<PropertyInput>(propertyDefaults);
  const [conditions, setConditions] = useState<ConditionsInput>(conditionsDefaults);
  const [submitting, setSubmitting] = useState(false);
  const [created, setCreated] = useState<{ id: string; token: string } | null>(null);

  useEffect(() => {
    const draft = loadDraft();
    if (draft) {
      setOwner({ ...ownerDefaults, ...draft.owner });
      setProperty({ ...propertyDefaults, ...draft.property });
      setConditions({ ...conditionsDefaults, ...draft.conditions });
      setStep(Math.min(draft.step ?? 0, 2));
    }
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready || created) return;
    localStorage.setItem(DRAFT_KEY, JSON.stringify({ step, owner, property, conditions }));
  }, [ready, created, step, owner, property, conditions]);

  useEffect(() => {
    if (ready && displayName && !property.captador) setProperty((p) => ({ ...p, captador: displayName }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, displayName]);

  const submit = async (values: ConditionsData) => {
    setSubmitting(true);
    try {
      const row = await createAuthorization({
        owner: owner as unknown as OwnerData,
        property: property as unknown as PropertyData,
        conditions: values,
      });
      localStorage.removeItem(DRAFT_KEY);
      setCreated(row);
      toast.success("Ficha gerada com sucesso!");
    } catch (e) {
      toast.error("Não foi possível gerar a ficha", { description: (e as Error).message });
    } finally {
      setSubmitting(false);
    }
  };

  if (created) {
    const link = signingUrl(created.token);
    const message = buildWhatsappMessage({
      ownerName: (owner.nome as string) ?? "",
      brokerName: displayName,
      brokerCreci: creci,
      propertyAddress: shortAddress(property.endereco),
      link,
    });
    return (
      <AppShell title="Ficha gerada" description="Envie o link para o proprietário assinar.">
        <div className="mx-auto max-w-2xl space-y-6">
          <div className="rounded-lg border border-success/30 bg-success/5 p-6 text-center shadow-sm">
            <CheckCircle2 className="mx-auto h-12 w-12 text-success" />
            <h2 className="mt-3 text-xl font-bold text-foreground">Autorização criada!</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Status <strong>Pendente</strong> até o proprietário assinar digitalmente.
            </p>
          </div>

          <div className="rounded-lg border border-border bg-card p-5 shadow-sm">
            <p className="text-[13px] font-medium text-foreground/90">Link único de assinatura</p>
            <div className="mt-2 flex flex-col gap-2 sm:flex-row">
              <Input readOnly value={link} className="font-mono text-xs" />
              <Button
                type="button"
                variant="outline"
                onClick={async () => {
                  await navigator.clipboard.writeText(link);
                  toast.success("Link copiado!");
                }}
              >
                <Copy className="h-4 w-4" /> Copiar
              </Button>
            </div>

            <Button
              asChild
              size="lg"
              className="mt-4 h-12 w-full bg-success text-success-foreground shadow-sm hover:bg-success/90"
            >
              <a href={whatsappLink((owner.telefone as string) ?? "", message)} target="_blank" rel="noreferrer">
                <MessageCircle className="h-5 w-5" /> Enviar link via WhatsApp
              </a>
            </Button>

            <div className="mt-4 flex flex-col gap-2 sm:flex-row">
              <Button asChild variant="outline" className="flex-1">
                <Link to="/fichas/$id" params={{ id: created.id }}>
                  Ver detalhes
                </Link>
              </Button>
              <Button
                variant="ghost"
                className="flex-1"
                onClick={() => {
                  setCreated(null);
                  setOwner(ownerDefaults);
                  setProperty({ ...propertyDefaults, captador: displayName });
                  setConditions(conditionsDefaults);
                  setStep(0);
                }}
              >
                Criar outra ficha
              </Button>
            </div>
          </div>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell
      title="Nova ficha de autorização"
      description="Preencha as três etapas. O rascunho é salvo automaticamente neste dispositivo."
      actions={
        <Button variant="ghost" onClick={() => navigate({ to: "/dashboard" })}>
          Cancelar
        </Button>
      }
    >
      <div className="space-y-6">
        <div className="rounded-lg border border-border bg-card p-5 shadow-sm">
          <Stepper current={step} />
        </div>
        <div className="rounded-lg border border-border bg-card p-5 shadow-sm sm:p-6">
          {!ready ? null : step === 0 ? (
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
              onSubmit={submit}
              submitting={submitting}
            />
          )}
        </div>
      </div>
    </AppShell>
  );
}
