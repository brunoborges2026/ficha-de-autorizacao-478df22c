import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const emailSchema = z.object({ email: z.string().trim().email("E-mail inválido").max(150) });

/** Whether the system already has at least one user (used to show the first-admin bootstrap). */
export const hasAnyUser = createServerFn({ method: "GET" }).handler(async () => {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { count, error } = await supabaseAdmin
    .from("profiles")
    .select("id", { count: "exact", head: true });
  if (error) throw new Error("Não foi possível verificar o sistema.");
  return { hasUsers: (count ?? 0) > 0 };
});

/** One-time bootstrap: creates the first administrator. Refuses once any user exists. */
export const bootstrapAdmin = createServerFn({ method: "POST" })
  .inputValidator((input) =>
    z
      .object({
        email: z.string().trim().email("E-mail inválido").max(150),
        fullName: z.string().trim().min(2, "Informe o nome").max(120),
        password: z.string().min(8, "Mínimo de 8 caracteres").max(72),
      })
      .parse(input),
  )
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { count } = await supabaseAdmin.from("profiles").select("id", { count: "exact", head: true });
    if ((count ?? 0) > 0) throw new Error("O sistema já possui usuários cadastrados.");

    const { error } = await supabaseAdmin.auth.admin.createUser({
      email: data.email,
      password: data.password,
      email_confirm: true,
      user_metadata: { full_name: data.fullName, role: "admin", must_set_password: false },
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

async function assertAdmin(ctx: { supabase: any; userId: string }) {
  const { data, error } = await ctx.supabase.rpc("has_role", { _user_id: ctx.userId, _role: "admin" });
  if (error || !data) throw new Error("Acesso restrito a administradores.");
}

export const listUsers = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const [{ data: profiles }, { data: roles }, { data: authList }] = await Promise.all([
      supabaseAdmin.from("profiles").select("id, email, full_name, must_set_password, creci, created_at"),
      supabaseAdmin.from("user_roles").select("user_id, role"),
      supabaseAdmin.auth.admin.listUsers({ perPage: 1000 }),
    ]);
    const roleMap = new Map<string, string>();
    roles?.forEach((r) => roleMap.set(r.user_id, r.role));
    const lastSign = new Map<string, string | null>();
    authList?.users.forEach((u) => lastSign.set(u.id, u.last_sign_in_at ?? null));
    return (profiles ?? [])
      .map((p) => ({
        ...p,
        role: (roleMap.get(p.id) ?? "broker") as "admin" | "broker",
        last_sign_in_at: lastSign.get(p.id) ?? null,
      }))
      .sort((a, b) => a.created_at.localeCompare(b.created_at));
  });

export const inviteBroker = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => emailSchema.extend({ origin: z.string().url() }).parse(input))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.auth.admin.inviteUserByEmail(data.email, {
      redirectTo: `${data.origin}/definir-senha`,
      data: { role: "broker", must_set_password: true },
    });
    if (error) {
      if (/already/i.test(error.message)) throw new Error("Este e-mail já está cadastrado.");
      throw new Error(error.message);
    }
    return { ok: true };
  });

export const resetBrokerPassword = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ userId: z.string().uuid(), origin: z.string().url() }).parse(input))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: profile } = await supabaseAdmin.from("profiles").select("email").eq("id", data.userId).single();
    if (!profile) throw new Error("Usuário não encontrado.");
    const { error } = await supabaseAdmin.auth.resetPasswordForEmail(profile.email, {
      redirectTo: `${data.origin}/reset-password`,
    });
    if (error) throw new Error(error.message);
    await supabaseAdmin.from("profiles").update({ must_set_password: true }).eq("id", data.userId);
    return { ok: true, email: profile.email };
  });

export const deleteBroker = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ userId: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    if (data.userId === context.userId) throw new Error("Você não pode excluir a sua própria conta.");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.auth.admin.deleteUser(data.userId);
    if (error) throw new Error(error.message);
    await supabaseAdmin.from("user_roles").delete().eq("user_id", data.userId);
    await supabaseAdmin.from("profiles").delete().eq("id", data.userId);
    return { ok: true };
  });

/** Marks the signed-in user's first-access password as set (and stores their CRECI). */
export const markPasswordSet = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z
      .object({ creci: z.string().trim().min(3, "Informe o seu CRECI").max(40).optional() })
      .parse(input ?? {}),
  )
  .handler(async ({ context, data }) => {
    const { error } = await context.supabase
      .from("profiles")
      .update({ must_set_password: false, ...(data.creci ? { creci: data.creci } : {}) })
      .eq("id", context.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
