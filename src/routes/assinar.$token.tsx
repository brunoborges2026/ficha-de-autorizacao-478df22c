import { useEffect, useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { CheckCircle2, Download, FileSignature, Loader2, MapPin, ShieldCheck } from "lucide-react";
import { Logo } from "@/components/brand/Logo";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import { DocSection, FichaDocument, type FichaData } from "@/components/ficha/FichaDocument";
import { SelfieCapture } from "@/components/ficha/SelfieCapture";
import { SignaturePad } from "@/components/ficha/SignaturePad";
import { getAuthorizationByToken, submitSignature, uploadSignedPdf } from "@/lib/signing.functions";
import { generateFichaPdfDataUrl } from "@/lib/generate-pdf";
import { COMPANY } from "@/lib/schemas";
import { shortAddress } from "@/lib/format";

export const Route = createFileRoute("/assinar/$token")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Assinar autorização de comercialização | Vetorial" },
      {
        name: "description",
        content:
          "Confira os dados da autorização de comercialização do seu imóvel e assine digitalmente com selfie e validação de metadados.",
      },
      { name: "robots", content: "noindex, nofollow" },
      { property: "og:title", content: "Assinar autorização de comercialização | Vetorial" },
      {
        property: "og:description",
        content: "Assinatura digital da autorização de comercialização do seu imóvel na Vetorial.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: SignPage,
});

function useGeolocation(enabled: boolean) {
  const [coords, setCoords] = useState<{ latitude: number; longitude: number } | null>(null);
  const [denied, setDenied] = useState(false);

  useEffect(() => {
    if (!enabled || !navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => setCoords({ latitude: pos.coords.latitude, longitude: pos.coords.longitude }),
      () => setDenied(true),
      { enableHighAccuracy: true, timeout: 15000 },
    );
  }, [enabled]);

  return { coords, denied };
}

function SignPage() {
  const { token } = Route.useParams();
  const loadFicha = useServerFn(getAuthorizationByToken);
  const sign = useServerFn(submitSignature);
  const savePdf = useServerFn(uploadSignedPdf);

  const query = useQuery({
    queryKey: ["public-authorization", token],
    queryFn: () => loadFicha({ data: { token } }),
    retry: false,
  });

  const [selfie, setSelfie] = useState<string | null>(null);
  const [signature, setSignature] = useState<string | null>(null);
  const [accepted, setAccepted] = useState(false);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const authorization = query.data?.authorization ?? null;
  const existingSignature = query.data?.signature ?? null;
  const alreadySigned = authorization?.status === "assinado";
  const { coords, denied } = useGeolocation(!!authorization && !alreadySigned);

  const ficha = useMemo<FichaData | null>(
    () =>
      authorization
        ? ({
            owner: authorization.owner,
            property: authorization.property,
            conditions: authorization.conditions,
            created_at: authorization.created_at,
            broker_name: authorization.broker_name,
            broker_creci: authorization.broker_creci,
          } as unknown as FichaData)
        : null,
    [authorization],
  );

  useEffect(() => {
    if (existingSignature?.pdf_url) setPdfUrl(existingSignature.pdf_url);
  }, [existingSignature?.pdf_url]);

  const submit = useMutation({
    mutationFn: async () => {
      if (!ficha || !selfie || !signature) throw new Error("Complete a selfie e a assinatura.");
      const meta = await sign({
        data: {
          token,
          selfie,
          signature,
          latitude: coords?.latitude ?? null,
          longitude: coords?.longitude ?? null,
          accepted: true,
          userAgent: navigator.userAgent,
        },
      });
      const dataUrl = await generateFichaPdfDataUrl({
        owner: ficha.owner,
        property: ficha.property,
        conditions: ficha.conditions,
        createdAt: ficha.created_at,
        brokerName: ficha.broker_name ?? null,
        brokerCreci: ficha.broker_creci ?? null,
        selfieDataUrl: selfie,
        signatureDataUrl: signature,
        meta,
      });
      const { pdfUrl: url } = await savePdf({ data: { token, pdf: dataUrl } });
      return url;
    },
    onSuccess: (url) => {
      setPdfUrl(url ?? null);
      setDone(true);
      void query.refetch();
      toast.success("Documento assinado com sucesso!");
    },
    onError: (e: Error) => toast.error(e.message || "Não foi possível concluir a assinatura."),
  });

  if (query.isLoading) {
    return (
      <Shell>
        <div className="space-y-4">
          <Skeleton className="h-10 w-3/4" />
          <Skeleton className="h-64 w-full" />
        </div>
      </Shell>
    );
  }

  if (!authorization || !ficha) {
    return (
      <Shell>
        <div className="rounded-lg border border-border bg-card p-8 text-center shadow-sm">
          <h1 className="text-lg font-bold text-secondary">Link inválido ou expirado</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Não encontramos esta autorização. Solicite um novo link ao seu corretor.
          </p>
        </div>
      </Shell>
    );
  }

  const finished = done || alreadySigned;

  return (
    <Shell>
      <div className="space-y-5">
        {!finished && (
          <header className="rounded-lg border border-border bg-card p-5 shadow-sm">
            <h1 className="text-lg font-bold text-secondary">
              Olá, {ficha.owner.nome.split(" ")[0]}! Confira e assine sua autorização
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Leia os dados abaixo, tire uma selfie segurando seu documento e assine na tela.
              Precisamos da sua câmera e da sua localização apenas para validar a assinatura.
            </p>
            <p className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
              <MapPin className="h-3.5 w-3.5" />
              {coords
                ? "Localização confirmada."
                : denied
                  ? "Localização não autorizada — a assinatura continua válida."
                  : "Aguardando permissão de localização…"}
            </p>
          </header>
        )}

        <FichaDocument data={ficha} signature={finished ? existingSignature : null} />

        {finished ? (
          <div className="rounded-lg border border-success/30 bg-success/5 p-6 text-center shadow-sm">
            <CheckCircle2 className="mx-auto h-10 w-10 text-success" />
            <h1 className="mt-3 text-lg font-bold text-secondary">Documento assinado</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              A autorização do imóvel {shortAddress(ficha.property.endereco)} foi assinada
              digitalmente e enviada à {COMPANY.name}.
            </p>
            {pdfUrl && (
              <Button asChild className="mt-4">
                <a href={pdfUrl} target="_blank" rel="noreferrer">
                  <Download className="mr-2 h-4 w-4" /> Baixar PDF assinado
                </a>
              </Button>
            )}
          </div>
        ) : (
          <div className="space-y-6 rounded-lg border border-border bg-card p-5 shadow-sm sm:p-6">
            <DocSection number="4" title="Selfie com documento">
              <SelfieCapture value={selfie} onChange={setSelfie} />
            </DocSection>

            <DocSection number="5" title="Assinatura digital">
              <SignaturePad onChange={setSignature} />
            </DocSection>

            <label className="flex cursor-pointer items-start gap-3 rounded-md border border-border bg-muted/40 p-4">
              <Checkbox
                checked={accepted}
                onCheckedChange={(v) => setAccepted(v === true)}
                className="mt-0.5"
              />
              <span className="text-sm text-foreground">
                Li e concordo com os termos desta autorização e confirmo a veracidade das
                informações prestadas.
              </span>
            </label>

            <Button
              className="w-full bg-secondary text-secondary-foreground hover:bg-secondary/90"
              size="lg"
              disabled={!selfie || !signature || !accepted || submit.isPending}
              onClick={() => submit.mutate()}
            >
              {submit.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Registrando assinatura…
                </>
              ) : (
                <>
                  <FileSignature className="mr-2 h-4 w-4" /> Assinar e enviar documento
                </>
              )}
            </Button>

            <p className="flex items-center justify-center gap-2 text-center text-xs text-muted-foreground">
              <ShieldCheck className="h-3.5 w-3.5" />
              Registramos data/hora de Brasília, IP, dispositivo, localização e um hash SHA-256 de
              validação.
            </p>
          </div>
        )}
      </div>
    </Shell>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background">
      <div className="border-b border-border bg-card">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-4">
          <Logo className="h-9" />
          <span className="text-xs text-muted-foreground">CRECI {COMPANY.creci}</span>
        </div>
      </div>
      <main className="mx-auto max-w-3xl px-4 py-6">{children}</main>
    </div>
  );
}
