import { createClient } from "@/lib/supabase/server";
import { isValidRole, type Role } from "@/lib/roles";

export type SessionProfile = {
  userId: string;
  email: string;
  fullName: string;
  role: Role;
};

/** Current session's profile, or null when signed out. */
export async function getSessionProfile(): Promise<SessionProfile | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, role")
    .eq("id", user.id)
    .single();

  const role = profile?.role ?? user.user_metadata?.role;
  return {
    userId: user.id,
    email: user.email ?? "",
    fullName: profile?.full_name || user.user_metadata?.full_name || user.email || "User",
    role: isValidRole(role) ? role : "project_manager",
  };
}

/** Approvals are director-only (AGENTIC_LAYER high-risk actions). Returns the
 *  approver's display name, or an error for the UI. */
export async function requireDirector(): Promise<
  { approver: string } | { error: string }
> {
  const profile = await getSessionProfile();
  if (!profile) return { error: "Sign in to perform approvals." };
  if (profile.role !== "director")
    return { error: "Only a Director can approve or reject." };
  return { approver: profile.fullName || profile.email };
}
