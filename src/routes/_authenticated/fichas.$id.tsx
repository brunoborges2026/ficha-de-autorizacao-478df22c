import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { ArrowLeft, Copy, Download, Loader2, MessageCircle, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/layout/AppShell";
import { FichaDocument } from "@/components/ficha/FichaDocument";
import { StatusBadge } from "@/components/ficha/StatusBadge";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import { authorizationQueryOptions, deleteAuthorization, signingUrl } from "@/lib/authorizations";
import { buildWhatsappMessage, shortAddress, whatsappLink } from "@/lib/format";
import { getSignatureFiles } from "@/lib/signing.functions";

export const Route = createFileRoute("/_authenticated/fichas/$id")({
  head: () => ({
    meta: [
      { title: "Detalhes da ficha | Vetorial Autorizações" },
      { name: "description", content: "Dados completos da autorização de comercialização e certificado de assinatura." },
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
  const { displayName, creci, isAdmin } = useAuth();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [deleting, setDeleting] = useState(false);
  const fichaQ = useQuery(authorizationQueryOptions(id));
  const filesFn = useServerFn(getSignatureFiles);
  const filesQ = useQuery({
    queryKey: ["signature-files", id],
    enabled: fichaQ.data?.status === "assinado",
    queryFn: () => filesFn({ data: { authorizationId: id } }),
  });

  if (fichaQ.isLoading) {
    return (
      <AppShell title="Ficha">
        <div className="grid place-items-center py-24">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      </AppShell>
    );
  }

  const ficha = fichaQ.data;
  if (!ficha) {
    return (
      <AppShell title="Ficha não encontrada">
        <p className="text-sm text-muted-foreground">Esta ficha não existe ou você não tem acesso a ela.</p>
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
            <Button asChild>
              <a href={pdfUrl} target="_blank" rel="noreferrer">
                <Download className="h-4 w-4" /> Baixar PDF
              </a>
            </Button>
          ) : (
            <Button disabled variant="outline">
              {filesQ.isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : null} PDF indisponível
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
              {deleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />} Excluir
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
