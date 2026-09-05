import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { AuthCard } from "@/components/auth/AuthCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field } from "@/components/form/Field";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/hooks/use-auth";
import { bootstrapAdmin, hasAnyUser } from "@/lib/admin.functions";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Entrar | Vetorial Autorizações" },
      { name: "description", content: "Acesso de corretores e administradores da Vetorial Imóveis e Arquitetura." },
      { property: "og:title", content: "Entrar | Vetorial Autorizações" },
      { property: "og:description", content: "Acesso de corretores e administradores da Vetorial Imóveis e Arquitetura." },
    ],
  }),
  component: LoginPage,
});

const loginSchema = z.object({
  email: z.string().trim().email("E-mail inválido"),
  password: z.string().min(1, "Informe a senha"),
});
const bootstrapSchema = z
  .object({
    fullName: z.string().trim().min(2, "Informe seu nome"),
    email: z.string().trim().email("E-mail inválido"),
    password: z.string().min(8, "Mínimo de 8 caracteres"),
    confirm: z.string(),
  })
  .refine((v) => v.password === v.confirm, { message: "As senhas não conferem", path: ["confirm"] });

function LoginPage() {
  const navigate = useNavigate();
  const { session, loading } = useSession();
  const [mode, setMode] = useState<"login" | "forgot">("login");
  const usersQ = useQuery({ queryKey: ["has-any-user"], queryFn: () => hasAnyUser() });

  useEffect(() => {
    if (!loading && session) navigate({ to: "/dashboard", replace: true });
  }, [loading, session, navigate]);

  if (loading || usersQ.isLoading) {
    return (
      <div className="grid min-h-screen place-items-center bg-background">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  if (usersQ.data && !usersQ.data.hasUsers) return <BootstrapForm onDone={() => usersQ.refetch()} />;
  if (mode === "forgot") return <ForgotForm onBack={() => setMode("login")} />;
  return <LoginForm onForgot={() => setMode("forgot")} />;
}

function LoginForm({ onForgot }: { onForgot: () => void }) {
  const navigate = useNavigate();
  const form = useForm<z.infer<typeof loginSchema>>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });

  const onSubmit = form.handleSubmit(async (values) => {
    const { error } = await supabase.auth.signInWithPassword(values);
    if (error) {
      toast.error("Não foi possível entrar", { description: "Verifique seu e-mail e senha." });
      return;
    }
    navigate({ to: "/dashboard", replace: true });
  });

  return (
    <AuthCard title="Entrar" description="Acesse com o e-mail cadastrado pelo administrador.">
      <form onSubmit={onSubmit} className="space-y-4">
        <Field label="E-mail" error={form.formState.errors.email?.message}>
          <Input type="email" autoComplete="email" placeholder="voce@vetorial.com" {...form.register("email")} />
        </Field>
        <Field label="Senha" error={form.formState.errors.password?.message}>
          <Input type="password" autoComplete="current-password" placeholder="••••••••" {...form.register("password")} />
        </Field>
        <Button type="submit" className="h-11 w-full text-base" disabled={form.formState.isSubmitting}>
          {form.formState.isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
          Entrar
        </Button>
        <button type="button" onClick={onForgot} className="w-full text-center text-sm text-primary hover:underline">
          Esqueci minha senha
        </button>
      </form>
    </AuthCard>
  );
}

function ForgotForm({ onBack }: { onBack: () => void }) {
  const [sent, setSent] = useState(false);
  const form = useForm<{ email: string }>({
    resolver: zodResolver(z.object({ email: z.string().trim().email("E-mail inválido") })),
    defaultValues: { email: "" },
  });
  const onSubmit = form.handleSubmit(async ({ email }) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    if (error) {
      toast.error("Não foi possível enviar o e-mail", { description: error.message });
      return;
    }
    setSent(true);
  });
  return (
    <AuthCard
      title="Recuperar senha"
      description="Enviaremos um link para você definir uma nova senha."
      footer={
        <button type="button" onClick={onBack} className="text-primary hover:underline">
          Voltar para o login
        </button>
      }
    >
      {sent ? (
        <p className="rounded-md border border-success/30 bg-success/10 p-4 text-sm text-foreground">
          Se este e-mail estiver cadastrado, você receberá um link em instantes. Verifique também a caixa de spam.
        </p>
      ) : (
        <form onSubmit={onSubmit} className="space-y-4">
          <Field label="E-mail" error={form.formState.errors.email?.message}>
            <Input type="email" autoComplete="email" {...form.register("email")} />
          </Field>
          <Button type="submit" className="h-11 w-full" disabled={form.formState.isSubmitting}>
            Enviar link
          </Button>
        </form>
      )}
    </AuthCard>
  );
}

function BootstrapForm({ onDone }: { onDone: () => void }) {
  const navigate = useNavigate();
  const bootstrap = useServerFn(bootstrapAdmin);
  const form = useForm<z.infer<typeof bootstrapSchema>>({
    resolver: zodResolver(bootstrapSchema),
    defaultValues: { fullName: "", email: "", password: "", confirm: "" },
  });
  const onSubmit = form.handleSubmit(async (values) => {
    try {
      await bootstrap({ data: { email: values.email, fullName: values.fullName, password: values.password } });
      const { error } = await supabase.auth.signInWithPassword({ email: values.email, password: values.password });
      if (error) throw error;
      toast.success("Conta de administrador criada!");
      onDone();
      navigate({ to: "/dashboard", replace: true });
    } catch (e) {
      toast.error("Não foi possível criar a conta", { description: (e as Error).message });
    }
  });
  return (
    <AuthCard
      title="Configuração inicial"
      description="Nenhum usuário encontrado. Crie a conta do primeiro administrador para começar."
    >
      <form onSubmit={onSubmit} className="space-y-4">
        <Field label="Nome completo" error={form.formState.errors.fullName?.message}>
          <Input autoComplete="name" {...form.register("fullName")} />
        </Field>
        <Field label="E-mail" error={form.formState.errors.email?.message}>
          <Input type="email" autoComplete="email" {...form.register("email")} />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Senha" error={form.formState.errors.password?.message}>
            <Input type="password" autoComplete="new-password" {...form.register("password")} />
          </Field>
          <Field label="Confirmar senha" error={form.formState.errors.confirm?.message}>
            <Input type="password" autoComplete="new-password" {...form.register("confirm")} />
          </Field>
        </div>
        <Button type="submit" className="h-11 w-full" disabled={form.formState.isSubmitting}>
          {form.formState.isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
          Criar administrador
        </Button>
      </form>
    </AuthCard>
  );
}
