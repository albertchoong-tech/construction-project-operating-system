"use client";

import { useState } from "react";
import { ActionForm, Field, TextInput, Select } from "@/components/form";
import { signIn, signUp } from "@/lib/actions/auth";
import { ROLES, ROLE_LABELS } from "@/lib/roles";

export function LoginForm() {
  const [mode, setMode] = useState<"signin" | "signup">("signin");

  return (
    <div>
      <div className="flex rounded-lg bg-slate-100 p-1 mb-6">
        {(["signin", "signup"] as const).map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => setMode(m)}
            className={`flex-1 rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
              mode === m ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"
            }`}
          >
            {m === "signin" ? "Sign In" : "Create Account"}
          </button>
        ))}
      </div>

      {mode === "signin" ? (
        <ActionForm action={signIn} submitLabel="Sign In">
          <Field label="Email" required>
            <TextInput name="email" type="email" required autoComplete="email" placeholder="you@company.com" />
          </Field>
          <Field label="Password" required>
            <TextInput name="password" type="password" required autoComplete="current-password" placeholder="••••••••" />
          </Field>
        </ActionForm>
      ) : (
        <ActionForm action={signUp} submitLabel="Create Account">
          <Field label="Full name" required>
            <TextInput name="full_name" required placeholder="Your name" />
          </Field>
          <Field label="Email" required>
            <TextInput name="email" type="email" required autoComplete="email" placeholder="you@company.com" />
          </Field>
          <Field label="Password" required>
            <TextInput name="password" type="password" required minLength={8} autoComplete="new-password" placeholder="Min. 8 characters" />
          </Field>
          <Field label="Role" required>
            <Select name="role" defaultValue="project_manager">
              {ROLES.map((r) => (
                <option key={r} value={r}>
                  {ROLE_LABELS[r]}
                </option>
              ))}
            </Select>
          </Field>
        </ActionForm>
      )}
    </div>
  );
}
