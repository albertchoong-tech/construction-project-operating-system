"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getSessionProfile } from "@/lib/auth";
import { isValidRole } from "@/lib/roles";
import type { ActionResult } from "@/components/form";

async function requireDirectorSession() {
  const profile = await getSessionProfile();
  if (!profile || profile.role !== "director")
    return { error: "Only a Director can manage the team." } as const;
  return { profile } as const;
}

/** Active directors excluding the given user — guards the "last director" rules. */
async function otherActiveDirectors(excludeUserId: string): Promise<number> {
  const supabase = await createClient();
  const { count } = await supabase
    .from("profiles")
    .select("id", { count: "exact", head: true })
    .eq("role", "director")
    .eq("active", true)
    .neq("id", excludeUserId);
  return count ?? 0;
}

export async function updateUserRole(
  userId: string,
  role: string,
): Promise<{ error?: string } | void> {
  const auth = await requireDirectorSession();
  if ("error" in auth) return auth;
  if (!isValidRole(role)) return { error: "Invalid role." };

  const supabase = await createClient();
  const { data: target } = await supabase
    .from("profiles")
    .select("role, active")
    .eq("id", userId)
    .single();
  if (!target) return { error: "User not found." };

  if (
    target.role === "director" &&
    role !== "director" &&
    (await otherActiveDirectors(userId)) === 0
  ) {
    return { error: "Cannot demote the last active Director." };
  }

  const { error } = await supabase.from("profiles").update({ role }).eq("id", userId);
  if (error) return { error: error.message };
  revalidatePath("/team");
}

export async function setUserActive(
  userId: string,
  active: boolean,
): Promise<{ error?: string } | void> {
  const auth = await requireDirectorSession();
  if ("error" in auth) return auth;

  if (!active) {
    if (userId === auth.profile.userId)
      return { error: "You cannot deactivate your own account." };
    const supabase = await createClient();
    const { data: target } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", userId)
      .single();
    if (target?.role === "director" && (await otherActiveDirectors(userId)) === 0)
      return { error: "Cannot deactivate the last active Director." };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("profiles").update({ active }).eq("id", userId);
  if (error) return { error: error.message };
  revalidatePath("/team");
}

export async function addMembership(
  _prev: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const auth = await requireDirectorSession();
  if ("error" in auth) return auth;

  const user_id = (formData.get("user_id") as string) || "";
  const project_id = (formData.get("project_id") as string) || "";
  if (!user_id || !project_id) return { error: "Pick a team member and a project." };

  const supabase = await createClient();
  const { error } = await supabase
    .from("project_members")
    .insert({ user_id, project_id });
  if (error) {
    if (error.code === "23505") return { error: "Already assigned to that project." };
    return { error: error.message };
  }
  revalidatePath("/team");
  return { ok: true };
}

export async function removeMembership(id: string): Promise<{ error?: string } | void> {
  const auth = await requireDirectorSession();
  if ("error" in auth) return auth;

  const supabase = await createClient();
  const { error } = await supabase.from("project_members").delete().eq("id", id);
  if (error) return { error: error.message };
  revalidatePath("/team");
}
