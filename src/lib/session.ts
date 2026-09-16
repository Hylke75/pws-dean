import { createClient } from "@/lib/supabase/server";
import type { Profile } from "@/lib/types";

export async function getSession() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { user: null, profile: null as Profile | null };

  const { data: profile } = await supabase
    .from("pws_profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  return { user, profile: (profile as Profile) ?? null };
}
