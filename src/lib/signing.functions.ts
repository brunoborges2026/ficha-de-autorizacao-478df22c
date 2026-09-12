import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { z } from "zod";
import type { SupabaseClient } from "@supabase/supabase-js";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { Database } from "@/integrations/supabase/types";
import type { AuthorizationRecord, SignatureRecord } from "./format";

const tokenSchema = z.string().regex(/^[a-f0-9]{24,64}$/, "Token inválido");
const BUCKET = "signatures";
const URL_TTL = 60 * 60; // 1h

function dataUrlToBytes(dataUrl: string, allowed: string[]) {
  const match = /^data:(image\/(?:png|jpeg|jpg)|application\/pdf);base64,(.+)$/.exec(dataUrl);
  if (!match || !allowed.includes(match[1]!)) throw new Error("Arquivo inválido.");
  const bytes = Uint8Array.from(atob(match[2]!), (c) => c.charCodeAt(0));
  return { bytes, mime: match[1]! };
}

async function sha256Hex(input: string) {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(input));
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function clientIp(request: Request | undefined) {
  const h = request?.headers;
  return (
    h?.get("cf-connecting-ip") ||
    h?.get("x-real-ip") ||
    h?.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    null
  );
}

type PublicAuthorization = Omit<AuthorizationRecord, "broker_id"> & {
  broker_name: string | null;
  broker_creci: string | null;
};
export type PublicSignature = Omit<SignatureRecord, "selfie_path" | "signature_path"> & {
  selfie_url: string | null;
  signature_url: string | null;
  pdf_url: string | null;
};

async function signedUrls(
  admin: SupabaseClient<Database>,
  sig: SignatureRecord | null,
): Promise<PublicSignature | null> {
  if (!sig) return null;
  const paths = [sig.selfie_path, sig.signature_path, sig.pdf_path].filter(Boolean) as string[];
  const { data } = await admin.storage.from(BUCKET).createSignedUrls(paths, URL_TTL);
  const map = new Map<string, string>();
  (data ?? []).forEach((d) => d.path && d.signedUrl && map.set(d.path, d.signedUrl));
  const { selfie_path, signature_path, ...rest } = sig;
  return {
    ...rest,
    selfie_url: map.get(selfie_path) ?? null,
    signature_url: map.get(signature_path) ?? null,
    pdf_url: sig.pdf_path ? (map.get(sig.pdf_path) ?? null) : null,
  };
}

/** Public: loads a ficha by its secret link token (no auth; the token is the credential). */
export const getAuthorizationByToken = createServerFn({ method: "GET" })
  .inputValidator((input) => z.object({ token: tokenSchema }).parse(input))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: auth, error } = await supabaseAdmin
      .from("authorizations")
      .select(
        "id, token, status, owner, property, conditions, property_code, created_at, updated_at, broker_id",
      )
      .eq("token", data.token)
      .maybeSingle();
    if (error) throw new Error("Não foi possível carregar a ficha.");
    if (!auth) return { authorization: null, signature: null };

    const [{ data: broker }, { data: sig }] = await Promise.all([
      supabaseAdmin
        .from("profiles")
        .select("full_name, email, creci")
        .eq("id", auth.broker_id)
        .maybeSingle(),
      supabaseAdmin.from("signatures").select("*").eq("authorization_id", auth.id).maybeSingle(),
    ]);

    const { broker_id: _b, ...rest } = auth;
    const authorization: PublicAuthorization = {
      ...(rest as unknown as Omit<AuthorizationRecord, "broker_id">),
      broker_name: broker?.full_name ?? "",
      broker_creci: broker?.creci ?? null,
    };
    return {
      authorization,
      signature: await signedUrls(supabaseAdmin, sig as SignatureRecord | null),
    };
  });

/** Public: records the owner's signature (selfie + drawn signature + metadata) and flips status. */
export const submitSignature = createServerFn({ method: "POST" })
  .inputValidator((input) =>
    z
      .object({
        token: tokenSchema,
        selfie: z.string().min(100).max(6_000_000),
        signature: z.string().min(100).max(2_000_000),
        latitude: z.number().min(-90).max(90).nullable(),
        longitude: z.number().min(-180).max(180).nullable(),
        accepted: z.literal(true),
        userAgent: z.string().max(1000).optional(),
      })
      .parse(input),
  )
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const request = getRequest();

    const { data: auth } = await supabaseAdmin
      .from("authorizations")
      .select("id, status, owner, property, conditions")
      .eq("token", data.token)
      .maybeSingle();
    if (!auth) throw new Error("Ficha não encontrada.");
    if (auth.status === "assinado") throw new Error("Esta ficha já foi assinada.");

    const selfie = dataUrlToBytes(data.selfie, ["image/jpeg", "image/jpg", "image/png"]);
    const signature = dataUrlToBytes(data.signature, ["image/png"]);

    const signedAt = new Date().toISOString();
    const ip = clientIp(request);
    const userAgent = request?.headers.get("user-agent") ?? data.userAgent ?? null;

    const selfieHash = await sha256Hex(data.selfie);
    const signatureHash = await sha256Hex(data.signature);
    const validationHash = await sha256Hex(
      JSON.stringify({
        authorizationId: auth.id,
        owner: auth.owner,
        property: auth.property,
        conditions: auth.conditions,
        signedAt,
        ip,
        userAgent,
        latitude: data.latitude,
        longitude: data.longitude,
        selfieHash,
        signatureHash,
      }),
    );

    const base = `${auth.id}`;
    const selfiePath = `${base}/selfie.${selfie.mime === "image/png" ? "png" : "jpg"}`;
    const signaturePath = `${base}/assinatura.png`;

    const up1 = await supabaseAdmin.storage
      .from(BUCKET)
      .upload(selfiePath, selfie.bytes, { contentType: selfie.mime, upsert: true });
    if (up1.error) throw new Error("Falha ao salvar a selfie.");
    const up2 = await supabaseAdmin.storage
      .from(BUCKET)
      .upload(signaturePath, signature.bytes, { contentType: "image/png", upsert: true });
    if (up2.error) throw new Error("Falha ao salvar a assinatura.");

    const { error: sigErr } = await supabaseAdmin.from("signatures").insert({
      authorization_id: auth.id,
      selfie_path: selfiePath,
      signature_path: signaturePath,
      signed_at: signedAt,
      ip,
      user_agent: userAgent,
      latitude: data.latitude,
      longitude: data.longitude,
      validation_hash: validationHash,
    });
    if (sigErr) throw new Error("Falha ao registrar a assinatura.");

    await supabaseAdmin.from("authorizations").update({ status: "assinado" }).eq("id", auth.id);

    return {
      signedAt,
      ip,
      userAgent,
      latitude: data.latitude,
      longitude: data.longitude,
      validationHash,
    };
  });

/** Public: stores the PDF rendered in the owner's browser right after signing. */
export const uploadSignedPdf = createServerFn({ method: "POST" })
  .inputValidator((input) =>
    z.object({ token: tokenSchema, pdf: z.string().min(100).max(15_000_000) }).parse(input),
  )
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: auth } = await supabaseAdmin
      .from("authorizations")
      .select("id, status")
      .eq("token", data.token)
      .maybeSingle();
    if (!auth || auth.status !== "assinado") throw new Error("Ficha não assinada.");
    const { data: sig } = await supabaseAdmin
      .from("signatures")
      .select("id, pdf_path")
      .eq("authorization_id", auth.id)
      .maybeSingle();
    if (!sig) throw new Error("Assinatura não encontrada.");
    if (sig.pdf_path) {
      const { data: u } = await supabaseAdmin.storage
        .from(BUCKET)
        .createSignedUrl(sig.pdf_path, URL_TTL);
      return { pdfUrl: u?.signedUrl ?? null };
    }
    const pdf = dataUrlToBytes(data.pdf, ["application/pdf"]);
    const pdfPath = `${auth.id}/autorizacao-assinada.pdf`;
    const up = await supabaseAdmin.storage
      .from(BUCKET)
      .upload(pdfPath, pdf.bytes, { contentType: "application/pdf", upsert: true });
    if (up.error) throw new Error("Falha ao salvar o PDF.");
    await supabaseAdmin.from("signatures").update({ pdf_path: pdfPath }).eq("id", sig.id);
    const { data: u } = await supabaseAdmin.storage.from(BUCKET).createSignedUrl(pdfPath, URL_TTL);
    return { pdfUrl: u?.signedUrl ?? null };
  });

/** Broker/admin: signed URLs for a ficha's files. RLS decides whether the caller can see it. */
export const getSignatureFiles = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ authorizationId: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { data: sig, error } = await context.supabase
      .from("signatures")
      .select("*")
      .eq("authorization_id", data.authorizationId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!sig) return null;

    let clientToUse: SupabaseClient<Database> = context.supabase;
    try {
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      // Accessing a property triggers the proxy to throw if the key is missing in the environment
      const _s = supabaseAdmin.storage;
      clientToUse = supabaseAdmin;
    } catch (e) {
      console.warn("Falling back to authenticated client because admin client is unavailable.");
    }

    return signedUrls(clientToUse, sig as SignatureRecord);
  });

/** Broker/admin: persists the PDF generated for an already signed ficha in Supabase Storage. */
export const saveSignedPdfForAuthorization = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z
      .object({ authorizationId: z.string().uuid(), pdf: z.string().min(100).max(15_000_000) })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { data: auth, error: authErr } = await context.supabase
      .from("authorizations")
      .select("id, status")
      .eq("id", data.authorizationId)
      .maybeSingle();
    if (authErr || !auth || auth.status !== "assinado") throw new Error("Ficha não assinada.");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: sig } = await supabaseAdmin
      .from("signatures")
      .select("id, pdf_path")
      .eq("authorization_id", auth.id)
      .maybeSingle();
    if (!sig) throw new Error("Registro de assinatura não encontrado.");

    const pdf = dataUrlToBytes(data.pdf, ["application/pdf"]);
    const pdfPath = `${auth.id}/autorizacao-assinada.pdf`;
    const up = await supabaseAdmin.storage
      .from(BUCKET)
      .upload(pdfPath, pdf.bytes, { contentType: "application/pdf", upsert: true });
    if (up.error) throw new Error("Falha ao salvar o PDF: " + up.error.message);

    await supabaseAdmin.from("signatures").update({ pdf_path: pdfPath }).eq("id", sig.id);
    const { data: u } = await supabaseAdmin.storage.from(BUCKET).createSignedUrl(pdfPath, URL_TTL);
    return { pdfUrl: u?.signedUrl ?? null };
  });
