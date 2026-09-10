import { supabase } from "@/integrations/supabase/client";
import type { ConditionsData, OwnerData, PropertyData } from "./schemas";
import type { Json } from "@/integrations/supabase/types";
import type { AuthorizationRecord } from "./format";

/** 32 hex chars — matches the token format accepted by the public signing functions. */
export const newToken = () =>
  Array.from(crypto.getRandomValues(new Uint8Array(16)))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");

export const signingUrl = (token: string) =>
  `${typeof window === "undefined" ? "" : window.location.origin}/assinar/${token}`;

const parse = (row: unknown): AuthorizationRecord => row as AuthorizationRecord;

export const authorizationsQueryOptions = () => ({
  queryKey: ["authorizations"],
  queryFn: async (): Promise<AuthorizationRecord[]> => {
    const { data, error } = await supabase
      .from("authorizations")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return (data ?? []).map(parse);
  },
});

export const authorizationQueryOptions = (id: string) => ({
  queryKey: ["authorization", id],
  queryFn: async (): Promise<AuthorizationRecord | null> => {
    const { data, error } = await supabase.from("authorizations").select("*").eq("id", id).maybeSingle();
    if (error) throw new Error(error.message);
    return data ? parse(data) : null;
  },
});

export async function createAuthorization(input: {
  owner: OwnerData;
  property: PropertyData;
  conditions: ConditionsData;
}) {
  const { data: userData } = await supabase.auth.getUser();
  const brokerId = userData.user?.id;
  if (!brokerId) throw new Error("Sessão expirada. Entre novamente.");

  const token = newToken();
  const { data, error } = await supabase
    .from("authorizations")
    .insert({
      broker_id: brokerId,
      token,
      status: "pendente",
      property_code: input.property.codigo || null,
      owner: input.owner as unknown as Json,
      property: input.property as unknown as Json,
      conditions: input.conditions as unknown as Json,
    })
    .select("id, token")
    .single();
  if (error) throw new Error(error.message);
  return data;
}

/** Brokers may only update a ficha while it is still pending (enforced by RLS too). */
export async function updateAuthorization(
  id: string,
  input: { owner: OwnerData; property: PropertyData; conditions: ConditionsData },
) {
  const { error } = await supabase
    .from("authorizations")
    .update({
      property_code: input.property.codigo || null,
      owner: input.owner as unknown as Json,
      property: input.property as unknown as Json,
      conditions: input.conditions as unknown as Json,
    })
    .eq("id", id);
  if (error) throw new Error(error.message);
}

/** Only admins can delete fichas (enforced by RLS). */
export async function deleteAuthorization(id: string) {
  const { error, count } = await supabase
    .from("authorizations")
    .delete({ count: "exact" })
    .eq("id", id);
  if (error) throw new Error(error.message);
  if (!count) throw new Error("Apenas administradores podem excluir fichas.");
}
