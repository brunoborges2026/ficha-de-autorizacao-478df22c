import { supabase } from "@/integrations/supabase/client";
import type { ConditionsData, OwnerData, PropertyData } from "./schemas";
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
      owner: input.owner as unknown as Record<string, unknown>,
      property: input.property as unknown as Record<string, unknown>,
      conditions: input.conditions as unknown as Record<string, unknown>,
    })
    .select("id, token")
    .single();
  if (error) throw new Error(error.message);
  return data;
}
