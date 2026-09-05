import { useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Check, Loader2, X } from "lucide-react";
import { AuthCard } from "@/components/auth/AuthCard";
import { Field } from "@/components/form/Field";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { markPasswordSet } from "@/lib/admin.functions";

const schema = z
  .object({
    password: z
      .string()
      .min(8, "Mínimo de 8 caracteres")
      .regex(/[A-Z]/, "Inclua uma letra maiúscula")
      .regex(/[a-z]/, "Inclua uma letra minúscula")
      .regex(/\d/, "Inclua um número"),
    confirm: z.string(),
  })
  .refine((v) => v.password === v.confirm, { message: "As senhas não conferem", path: ["confirm"] });

const rules = [
  { label: "Pelo menos 8 caracteres", test: (p: string) => p.length >= 8 },
  { label: "Uma letra maiúscula", test: (p: string) => /[A-Z]/.test(p) },
  { label: "Uma letra minúscula", test: (p: string) => /[a-z]/.test(p) },
  { label: "Um número", test: (p: string) => /\d/.test(p) },
];

export function SetPasswordForm({ mode }: { mode: "first-access" | "recovery" }) {
  const navigate = useNavigate();
  const markSet = useServerFn(markPasswordSet);
  const [ready, setReady] = useState<"checking" | "ok" | "missing">("checking");

  useEffect(() => {
    let done = false;
    const finish = (has: boolean) => {
      if (done) return;
      done = true;
      setReady(has ? "ok" : "missing");
    };
    const { data } = supabase.auth.onAuthStateChange((event, session) => {
      if (session && (event === "SIGNED_IN" || event === "PASSWORD_RECOVERY" || event === "INITIAL_SESSION")) finish(true);
    });
    supabase.auth.getSession().then(({ data: d }) => {
      if (d.session) finish(true);
    });
    const t = setTimeout(() => finish(false), 4000);
    return () => {
      clearTimeout(t);
      data.subscription.unsubscribe();
    };
  }, []);

  const form = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
    defaultValues: { password: "", confirm: "" },
  });
  const pwd = form.watch("password");

  const onSubmit = form.handleSubmit(async ({ password }) => {
    const { error } = await supabase.auth.updateUser({ password });
    if (error) {
      toast.error("Não foi possível salvar a senha", { description: error.message });
      return;
    }
    try {
      await markSet();
    } catch {
      /* profile flag is best-effort; the password itself is saved */
    }
    toast.success("Senha definida com sucesso!");
    navigate({ to: "/dashboard", replace: true });
  });

  const title = mode === "first-access" ? "Bem-vindo(a) à Vetorial" : "Nova senha";
  const description =
    mode === "first-access"
      ? "Este é o seu primeiro acesso. Crie uma senha segura para continuar."
      : "Escolha uma nova senha para a sua conta.";

  if (ready === "checking") {
    return (
      <div className="grid min-h-screen place-items-center bg-background">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  if (ready === "missing") {
    return (
      <AuthCard title="Link inválido ou expirado" description="Solicite um novo link ao administrador ou use a opção 'Esqueci minha senha'.">
        <Button className="w-full" onClick={() => navigate({ to: "/" })}>
          Ir para o login
        </Button>
      </AuthCard>
    );
  }

  return (
    <AuthCard title={title} description={description}>
      <form onSubmit={onSubmit} className="space-y-4">
        <Field label="Nova senha" error={form.formState.errors.password?.message}>
          <Input type="password" autoComplete="new-password" {...form.register("password")} />
        </Field>
        <ul className="grid grid-cols-2 gap-1.5 text-xs">
          {rules.map((r) => {
            const ok = r.test(pwd);
            return (
              <li key={r.label} className={ok ? "flex items-center gap-1.5 text-success" : "flex items-center gap-1.5 text-muted-foreground"}>
                {ok ? <Check className="h-3.5 w-3.5" /> : <X className="h-3.5 w-3.5" />}
                {r.label}
              </li>
            );
          })}
        </ul>
        <Field label="Confirmar senha" error={form.formState.errors.confirm?.message}>
          <Input type="password" autoComplete="new-password" {...form.register("confirm")} />
        </Field>
        <Button type="submit" className="h-11 w-full" disabled={form.formState.isSubmitting}>
          {form.formState.isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
          Salvar senha e entrar
        </Button>
      </form>
    </AuthCard>
  );
}
