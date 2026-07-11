"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { homeFor, isValidRole } from "@/lib/roles";
import type { ActionResult } from "@/components/form";

export async function signIn(
  _prev: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const email = ((formData.get("email") as string) || "").trim();
  const password = (formData.get("password") as string) || "";
  if (!email || !password) return { error: "Email and password are required." };

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) return { error: error.message };

  // Role and activation come from profiles (Directors manage them on /team)
  const { data: profile } = await supabase
    .from("profiles")
    .select("role, active")
    .eq("id", data.user.id)
    .maybeSingle();

  if (profile && profile.active === false) {
    await supabase.auth.signOut();
    return { error: "This account has been deactivated. Contact your Director." };
  }

  revalidatePath("/", "layout");
  const role = profile?.role;
  redirect(isValidRole(role) ? homeFor(role) : "/projects");
}

export async function signUp(
  _prev: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const email = ((formData.get("email") as string) || "").trim();
  const password = (formData.get("password") as string) || "";
  const full_name = ((formData.get("full_name") as string) || "").trim();

  if (!email || !password) return { error: "Email and password are required." };
  if (password.length < 8) return { error: "Password must be at least 8 characters." };
  if (!full_name) return { error: "Your name is required." };

  const supabase = await createClient();
  // New accounts always start as Site Supervisor; a Director assigns the real
  // role on /team. (The DB trigger enforces this regardless of what's sent.)
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { full_name } },
  });
  if (error) return { error: error.message };

  if (!data.session) {
    return {
      error:
        "Account created — check your email to confirm your address, then sign in.",
    };
  }

  revalidatePath("/", "layout");
  redirect(homeFor("site_supervisor"));
}

export async function signOut(): Promise<void> {
  const supabase = await createClient();
  await supabase.auth.signOut();
  revalidatePath("/", "layout");
  redirect("/login");
}
