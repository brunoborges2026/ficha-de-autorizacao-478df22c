import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { KeyRound, Loader2, ShieldAlert, Trash2, UserPlus } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field } from "@/components/form/Field";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useAuth } from "@/hooks/use-auth";
import { deleteBroker, inviteBroker, listUsers, resetBrokerPassword } from "@/lib/admin.functions";
import { formatDateTimeBR } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/admin/usuarios")({
  head: () => ({
    meta: [
      { title: "Usuários | Vetorial Autorizações" },
      { name: "description", content: "Convide corretores, redefina senhas e gerencie acessos." },
      { name: "robots", content: "noindex" },
      { property: "og:title", content: "Usuários | Vetorial Autorizações" },
      {
        property: "og:description",
        content: "Convide corretores, redefina senhas e gerencie acessos.",
      },
    ],
  }),
  component: UsuariosPage,
});

function UsuariosPage() {
  const { isAdmin, loading } = useAuth();
  const queryClient = useQueryClient();
  const listFn = useServerFn(listUsers);
  const inviteFn = useServerFn(inviteBroker);
  const resetFn = useServerFn(resetBrokerPassword);
  const deleteFn = useServerFn(deleteBroker);
  const [toDelete, setToDelete] = useState<{ id: string; email: string } | null>(null);

  const usersQ = useQuery({ queryKey: ["users"], enabled: isAdmin, queryFn: () => listFn() });

  const form = useForm<{ email: string }>({
    resolver: zodResolver(z.object({ email: z.string().trim().email("E-mail inválido") })),
    defaultValues: { email: "" },
  });

  const invite = useMutation({
    mutationFn: (email: string) => inviteFn({ data: { email, origin: window.location.origin } }),
    onSuccess: () => {
      toast.success("Convite enviado!", {
        description: "O corretor definirá a senha no primeiro acesso.",
      });
      form.reset();
      queryClient.invalidateQueries({ queryKey: ["users"] });
    },
    onError: (e: Error) => toast.error("Não foi possível convidar", { description: e.message }),
  });

  const reset = useMutation({
    mutationFn: (userId: string) => resetFn({ data: { userId, origin: window.location.origin } }),
    onSuccess: (r) => toast.success("E-mail de redefinição enviado", { description: r.email }),
    onError: (e: Error) => toast.error("Não foi possível redefinir", { description: e.message }),
  });

  const remove = useMutation({
    mutationFn: (userId: string) => deleteFn({ data: { userId } }),
    onSuccess: () => {
      toast.success("Usuário excluído");
      setToDelete(null);
      queryClient.invalidateQueries({ queryKey: ["users"] });
    },
    onError: (e: Error) => toast.error("Não foi possível excluir", { description: e.message }),
  });

  if (loading) {
    return (
      <AppShell title="Usuários">
        <div className="grid place-items-center py-24">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      </AppShell>
    );
  }

  if (!isAdmin) {
    return (
      <AppShell title="Acesso restrito">
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-6">
          <ShieldAlert className="h-8 w-8 text-destructive" />
          <p className="mt-3 text-sm text-foreground">
            Somente administradores podem gerenciar usuários.
          </p>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell title="Usuários" description="Convide corretores e gerencie os acessos ao sistema.">
      <div className="rounded-lg border border-border bg-card p-5 shadow-sm">
        <h2 className="text-base font-bold text-secondary">Convidar corretor</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Informe apenas o e-mail. Ele receberá um convite e definirá a própria senha no primeiro
          acesso.
        </p>
        <form
          onSubmit={form.handleSubmit((v) => invite.mutate(v.email))}
          className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-end"
        >
          <Field
            label="E-mail do corretor"
            error={form.formState.errors.email?.message}
            className="flex-1"
          >
            <Input type="email" placeholder="corretor@vetorial.com" {...form.register("email")} />
          </Field>
          <Button type="submit" className="h-10" disabled={invite.isPending}>
            {invite.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <UserPlus className="h-4 w-4" />
            )}
            Enviar convite
          </Button>
        </form>
      </div>

      <section className="mt-6 rounded-lg border border-border bg-card shadow-sm">
        <header className="border-b border-border px-5 py-4">
          <h2 className="text-base font-bold text-secondary">Usuários cadastrados</h2>
        </header>
        {usersQ.isLoading ? (
          <div className="grid place-items-center py-16">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Usuário</TableHead>
                  <TableHead>Perfil</TableHead>
                  <TableHead>Último acesso</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(usersQ.data ?? []).map((u) => (
                  <TableRow key={u.id}>
                    <TableCell className="font-medium">
                      {u.full_name || u.email.split("@")[0]}
                      <span className="block text-xs text-muted-foreground">{u.email}</span>
                    </TableCell>
                    <TableCell>
                      <span className="rounded-full border border-border px-2.5 py-0.5 text-xs font-semibold">
                        {u.role === "admin" ? "Administrador" : "Corretor"}
                      </span>
                      {u.must_set_password && (
                        <span className="mt-1 block text-xs text-warning-foreground">
                          Aguardando 1º acesso
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-sm text-muted-foreground">
                      {u.last_sign_in_at ? formatDateTimeBR(u.last_sign_in_at) : "—"}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          title="Enviar redefinição de senha"
                          onClick={() => reset.mutate(u.id)}
                          disabled={reset.isPending}
                        >
                          <KeyRound className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          title="Excluir usuário"
                          className="text-destructive hover:text-destructive"
                          onClick={() => setToDelete({ id: u.id, email: u.email })}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </section>

      <AlertDialog open={!!toDelete} onOpenChange={(o) => !o && setToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir usuário?</AlertDialogTitle>
            <AlertDialogDescription>
              {toDelete?.email} perderá o acesso ao sistema. As fichas já criadas por ele continuam
              registradas.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={(e) => {
                e.preventDefault();
                if (toDelete) remove.mutate(toDelete.id);
              }}
            >
              {remove.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null} Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppShell>
  );
}
