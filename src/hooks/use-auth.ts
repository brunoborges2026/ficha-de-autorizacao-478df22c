import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

export type AppRole = "admin" | "broker";

export function useSession() {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const { data } = supabase.auth.onAuthStateChange((_e, s) => {
      setSession(s);
      setLoading(false);
    });
    supabase.auth.getSession().then(({ data: d }) => {
      setSession(d.session);
      setLoading(false);
    });
    return () => data.subscription.unsubscribe();
  }, []);

  return { session, user: session?.user ?? null, loading };
}

export const profileQueryOptions = (userId: string | undefined) => ({
  queryKey: ["profile", userId],
  enabled: !!userId,
  queryFn: async () => {
    const [{ data: profile }, { data: roles }] = await Promise.all([
      supabase.from("profiles").select("*").eq("id", userId!).maybeSingle(),
      supabase.from("user_roles").select("role").eq("user_id", userId!),
    ]);
    const role: AppRole = roles?.some((r) => r.role === "admin") ? "admin" : "broker";
    return { profile, role };
  },
});

export function useAuth() {
  const { session, user, loading } = useSession();
  const q = useQuery(profileQueryOptions(user?.id));
  return {
    session,
    user,
    loading: loading || (!!user && q.isLoading),
    profile: q.data?.profile ?? null,
    role: q.data?.role ?? null,
    isAdmin: q.data?.role === "admin",
    creci: (q.data?.profile as { creci?: string | null } | null)?.creci ?? null,
    /** Real registered name — null until the broker fills it in on first access. */
    fullName: q.data?.profile?.full_name ?? null,
    displayName: q.data?.profile?.full_name || user?.email?.split("@")[0] || "",
  };
}

export function useSignOut() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  return async () => {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    navigate({ to: "/", replace: true });
  };
}
