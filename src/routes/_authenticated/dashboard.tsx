import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo } from "react";
import { CheckCircle2, Clock, Copy, FileText, Loader2, MessageCircle, Plus } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/layout/AppShell";
import { StatusBadge } from "@/components/ficha/StatusBadge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { authorizationsQueryOptions, signingUrl } from "@/lib/authorizations";
import { buildWhatsappMessage, formatDateTimeBR, shortAddress, whatsappLink } from "@/lib/format";
import { useAuth } from "@/hooks/use-auth";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({
    meta: [
      { title: "Dashboard | Vetorial Autorizações" },
      { name: "description", content: "Acompanhe fichas de autorização pendentes e assinadas." },
      { name: "robots", content: "noindex" },
      { property: "og:title", content: "Dashboard | Vetorial Autorizações" },
      { property: "og:description", content: "Acompanhe fichas de autorização pendentes e assinadas." },
    ],
  }),
  component: DashboardPage,
});

function MetricCard({
  label,
  value,
  icon: Icon,
  tone,
}: {
  label: string;
  value: number;
  icon: typeof FileText;
  tone: "neutral" | "warning" | "success";
}) {
  return (
    <div className="rounded-lg border border-border bg-card p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-muted-foreground">{label}</p>
        <span
          className={cn(
            "grid h-9 w-9 place-items-center rounded-md",
            tone === "neutral" && "bg-secondary/10 text-secondary",
            tone === "warning" && "bg-warning/15 text-warning-foreground",
            tone === "success" && "bg-success/10 text-success",
          )}
        >
          <Icon className="h-4 w-4" />
        </span>
      </div>
      <p className="mt-3 text-3xl font-bold text-foreground">{value}</p>
    </div>
  );
}

function DashboardPage() {
  const { isAdmin, displayName, creci } = useAuth();
  const queryClient = useQueryClient();
  const { data, isLoading } = useQuery(authorizationsQueryOptions());

  useEffect(() => {
    const channel = supabase
      .channel("authorizations-dashboard")
      .on("postgres_changes", { event: "*", schema: "public", table: "authorizations" }, () => {
        queryClient.invalidateQueries({ queryKey: ["authorizations"] });
      })
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [queryClient]);

  const metrics = useMemo(() => {
    const list = data ?? [];
    return {
      total: list.length,
      pendentes: list.filter((a) => a.status === "pendente").length,
      assinadas: list.filter((a) => a.status === "assinado").length,
    };
  }, [data]);

  const copyLink = async (token: string) => {
    await navigator.clipboard.writeText(signingUrl(token));
    toast.success("Link copiado!");
  };

  return (
    <AppShell
      title={isAdmin ? "Dashboard geral" : "Meu dashboard"}
      description={isAdmin ? "Todas as fichas de autorização da equipe." : "Suas fichas de autorização."}
      actions={
        <Button asChild>
          <Link to="/fichas/nova">
            <Plus className="h-4 w-4" /> Nova Ficha
          </Link>
        </Button>
      }
    >
      <div className="grid gap-4 sm:grid-cols-3">
        <MetricCard label="Total de fichas" value={metrics.total} icon={FileText} tone="neutral" />
        <MetricCard label="Pendentes" value={metrics.pendentes} icon={Clock} tone="warning" />
        <MetricCard label="Assinadas" value={metrics.assinadas} icon={CheckCircle2} tone="success" />
      </div>

      <section className="mt-6 rounded-lg border border-border bg-card shadow-sm">
        <header className="border-b border-border px-5 py-4">
          <h2 className="text-base font-bold text-secondary">Fichas recentes</h2>
        </header>

        {isLoading ? (
          <div className="grid place-items-center py-16">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : (data?.length ?? 0) === 0 ? (
          <div className="px-5 py-16 text-center">
            <p className="text-sm text-muted-foreground">Nenhuma ficha criada ainda.</p>
            <Button asChild className="mt-4">
              <Link to="/fichas/nova">
                <Plus className="h-4 w-4" /> Criar a primeira ficha
              </Link>
            </Button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Proprietário</TableHead>
                  <TableHead>Imóvel</TableHead>
                  <TableHead>Criada em</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(data ?? []).map((a) => (
                  <TableRow key={a.id}>
                    <TableCell className="font-medium">
                      {a.owner?.nome ?? "—"}
                      <span className="block text-xs text-muted-foreground">{a.owner?.telefone}</span>
                    </TableCell>
                    <TableCell className="max-w-[260px] truncate text-sm text-muted-foreground">
                      {shortAddress(a.property?.endereco)}
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-sm text-muted-foreground">
                      {formatDateTimeBR(a.created_at)}
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={a.status} />
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center justify-end gap-1">
                        <Button asChild variant="outline" size="sm">
                          <Link to="/fichas/$id" params={{ id: a.id }}>
                            Detalhes
                          </Link>
                        </Button>
                        {a.status === "pendente" && (
                          <>
                            <Button variant="ghost" size="icon" title="Copiar link" onClick={() => copyLink(a.token)}>
                              <Copy className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              title="Reenviar por WhatsApp"
                              className="text-success hover:text-success"
                              asChild
                            >
                              <a
                                href={whatsappLink(
                                  a.owner?.telefone ?? "",
                                  buildWhatsappMessage({
                                    ownerName: a.owner?.nome ?? "",
                                    brokerName: displayName,
                                    brokerCreci: creci,
                                    propertyAddress: shortAddress(a.property?.endereco),
                                    link: signingUrl(a.token),
                                  }),
                                )}
                                target="_blank"
                                rel="noreferrer"
                              >
                                <MessageCircle className="h-4 w-4" />
                              </a>
                            </Button>
                          </>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </section>
    </AppShell>
  );
}
