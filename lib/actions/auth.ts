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

  revalidatePath("/", "layout");
  const role = data.user?.user_metadata?.role;
  redirect(isValidRole(role) ? homeFor(role) : "/projects");
}

export async function signUp(
  _prev: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const email = ((formData.get("email") as string) || "").trim();
  const password = (formData.get("password") as string) || "";
  const full_name = ((formData.get("full_name") as string) || "").trim();
  const role = (formData.get("role") as string) || "";

  if (!email || !password) return { error: "Email and password are required." };
  if (password.length < 8) return { error: "Password must be at least 8 characters." };
  if (!full_name) return { error: "Your name is required." };
  if (!isValidRole(role)) return { error: "Pick a role." };

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { full_name, role } },
  });
  if (error) return { error: error.message };

  if (!data.session) {
    return {
      error:
        "Account created — check your email to confirm your address, then sign in.",
    };
  }

  revalidatePath("/", "layout");
  redirect(homeFor(role));
}

export async function signOut(): Promise<void> {
  const supabase = await createClient();
  await supabase.auth.signOut();
  revalidatePath("/", "layout");
  redirect("/login");
}
