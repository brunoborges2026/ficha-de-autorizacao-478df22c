import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  ArrowLeft,
  Copy,
  Download,
  Loader2,
  MessageCircle,
  Pencil,
  RefreshCw,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/layout/AppShell";
import { FichaDocument } from "@/components/ficha/FichaDocument";
import { StatusBadge } from "@/components/ficha/StatusBadge";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import {
  authorizationQueryOptions,
  brokerProfileQueryOptions,
  deleteAuthorization,
  signingUrl,
} from "@/lib/authorizations";
import { buildWhatsappMessage, shortAddress, whatsappLink } from "@/lib/format";
import { getSignatureFiles, saveSignedPdfForAuthorization } from "@/lib/signing.functions";
import { downloadFichaPdf } from "@/lib/generate-pdf";

export const Route = createFileRoute("/_authenticated/fichas/$id")({
  head: () => ({
    meta: [
      { title: "Detalhes da ficha | Vetorial Autorizações" },
      {
        name: "description",
        content: "Dados completos da autorização de comercialização e certificado de assinatura.",
      },
      { name: "robots", content: "noindex" },
      { property: "og:title", content: "Detalhes da ficha | Vetorial Autorizações" },
      {
        property: "og:description",
        content: "Dados completos da autorização de comercialização e certificado de assinatura.",
      },
    ],
  }),
  component: FichaDetailPage,
});

function FichaDetailPage() {
  const { id } = Route.useParams();
  const { displayName, fullName, creci, isAdmin } = useAuth();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [deleting, setDeleting] = useState(false);
  const [generatingPdf, setGeneratingPdf] = useState(false);
  const fichaQ = useQuery(authorizationQueryOptions(id));
  const filesFn = useServerFn(getSignatureFiles);
  const savePdfFn = useServerFn(saveSignedPdfForAuthorization);
  const filesQ = useQuery({
    queryKey: ["signature-files", id],
    enabled: fichaQ.data?.status === "assinado",
    queryFn: () => filesFn({ data: { authorizationId: id } }),
  });

  const ficha = fichaQ.data;
  const brokerQ = useQuery(brokerProfileQueryOptions(ficha?.broker_id));
  const brokerName = brokerQ.data?.full_name || fullName || displayName;
  const brokerCreci = brokerQ.data?.creci || creci;


  const handleGenerateAndDownloadPdf = async () => {
    if (!ficha) return;
    setGeneratingPdf(true);
    const toastId = toast.loading("Gerando PDF com certificado de assinatura...");
    try {
      const sigData = filesQ.data;
      const { dataUrl } = await downloadFichaPdf({
        owner: ficha.owner,
        property: ficha.property,
        conditions: ficha.conditions,
        createdAt: ficha.created_at,
        brokerName,
        brokerCreci,
        selfieDataUrl: sigData?.selfie_url ?? null,
        signatureDataUrl: sigData?.signature_url ?? null,
        meta: sigData
          ? {
              signedAt: sigData.signed_at,
              ip: sigData.ip ?? null,
              userAgent: sigData.user_agent ?? null,
              latitude: sigData.latitude ?? null,
              longitude: sigData.longitude ?? null,
              validationHash: sigData.validation_hash,
            }
          : null,
      });

      // Tenta persistir no Supabase Storage para próximas consultas
      try {
        await savePdfFn({ data: { authorizationId: id, pdf: dataUrl } });
        void queryClient.invalidateQueries({ queryKey: ["signature-files", id] });
      } catch (err) {
        console.warn("PDF baixado localmente (cache no storage não foi gravado):", err);
      }

      toast.success("PDF gerado e baixado com sucesso!", { id: toastId });
    } catch (e) {
      toast.error("Não foi possível gerar o PDF", {
        id: toastId,
        description: (e as Error).message || "Tente novamente em instantes.",
      });
    } finally {
      setGeneratingPdf(false);
    }
  };

  if (fichaQ.isLoading) {
    return (
      <AppShell title="Ficha">
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

  const link = signingUrl(ficha.token);
  const pdfUrl = filesQ.data?.pdf_url ?? null;

  return (
    <AppShell
      title={ficha.owner?.nome ?? "Ficha"}
      description={shortAddress(ficha.property?.endereco)}
      actions={
        <div className="flex flex-wrap items-center justify-end gap-2">
          <StatusBadge status={ficha.status} />
          {ficha.status === "pendente" ? (
            <>
              <Button asChild variant="outline">
                <Link to="/fichas/$id/editar" params={{ id }}>
                  <Pencil className="h-4 w-4" /> Editar
                </Link>
              </Button>
              <Button
                variant="outline"
                onClick={async () => {
                  await navigator.clipboard.writeText(link);
                  toast.success("Link copiado!");
                }}
              >
                <Copy className="h-4 w-4" /> Copiar link
              </Button>
              <Button asChild className="bg-success text-success-foreground hover:bg-success/90">
                <a
                  href={whatsappLink(
                    ficha.owner?.telefone ?? "",
                    buildWhatsappMessage({
                      ownerName: ficha.owner?.nome ?? "",
                      brokerName: displayName,
                      brokerCreci: creci,
                      propertyAddress: shortAddress(ficha.property?.endereco),
                      link,
                    }),
                  )}
                  target="_blank"
                  rel="noreferrer"
                >
                  <MessageCircle className="h-4 w-4" /> Reenviar link
                </a>
              </Button>
            </>
          ) : pdfUrl ? (
            <div className="flex items-center gap-2">
              <Button asChild>
                <a href={pdfUrl} target="_blank" rel="noreferrer">
                  <Download className="h-4 w-4 mr-1" /> Baixar PDF
                </a>
              </Button>
              <Button
                variant="outline"
                size="icon"
                disabled={generatingPdf}
                onClick={handleGenerateAndDownloadPdf}
                title="Regerar e baixar novo PDF"
              >
                {generatingPdf ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <RefreshCw className="h-4 w-4" />
                )}
              </Button>
            </div>
          ) : (
            <Button
              variant="default"
              disabled={generatingPdf || filesQ.isLoading}
              onClick={handleGenerateAndDownloadPdf}
            >
              {generatingPdf || filesQ.isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-1" />
                  {generatingPdf ? "Gerando PDF..." : "Carregando..."}
                </>
              ) : (
                <>
                  <Download className="h-4 w-4 mr-1" /> Gerar e Baixar PDF
                </>
              )}
            </Button>
          )}
          {isAdmin && (
            <Button
              variant="outline"
              className="text-destructive hover:bg-destructive/10"
              disabled={deleting}
              onClick={async () => {
                if (!confirm("Excluir esta ficha definitivamente?")) return;
                setDeleting(true);
                try {
                  await deleteAuthorization(id);
                  await queryClient.invalidateQueries({ queryKey: ["authorizations"] });
                  toast.success("Ficha excluída.");
                  navigate({ to: "/dashboard" });
                } catch (e) {
                  toast.error("Não foi possível excluir", { description: (e as Error).message });
                } finally {
                  setDeleting(false);
                }
              }}
            >
              {deleting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Trash2 className="h-4 w-4" />
              )}{" "}
              Excluir
            </Button>
          )}
        </div>
      }
    >
      <FichaDocument
        data={{
          owner: ficha.owner,
          property: ficha.property,
          conditions: ficha.conditions,
          created_at: ficha.created_at,
        }}
        signature={filesQ.data ?? null}
      />
      <div className="mt-4">
        <Button asChild variant="ghost">
          <Link to="/dashboard">
            <ArrowLeft className="h-4 w-4" /> Voltar ao dashboard
          </Link>
        </Button>
      </div>
    </AppShell>
  );
}
