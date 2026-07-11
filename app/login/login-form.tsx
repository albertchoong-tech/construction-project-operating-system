"use client";

import { useEffect, useState } from "react";
import { ActionForm, Field, TextInput, Select, inputClass } from "@/components/form";
import { signIn, signUp } from "@/lib/actions/auth";
import { ROLES, ROLE_LABELS } from "@/lib/roles";

const REMEMBER_KEY = "hsh-remembered-email";

/** Password input with a show/hide toggle. The toggle is a 44px touch target
 *  and never submits with the form. */
function PasswordInput({
  name,
  autoComplete,
  placeholder,
  minLength,
}: {
  name: string;
  autoComplete: string;
  placeholder: string;
  minLength?: number;
}) {
  const [visible, setVisible] = useState(false);
  return (
    <div className="relative">
      <input
        name={name}
        type={visible ? "text" : "password"}
        required
        minLength={minLength}
        autoComplete={autoComplete}
        placeholder={placeholder}
        className={`${inputClass} pr-12`}
      />
      <button
        type="button"
        onClick={() => setVisible((v) => !v)}
        aria-label={visible ? "Hide password" : "Show password"}
        aria-pressed={visible}
        title={visible ? "Hide password" : "Show password"}
        className="absolute inset-y-0 right-0 w-12 flex items-center justify-center text-slate-400 hover:text-slate-700 rounded-r-lg"
      >
        {visible ? (
          // eye-slash
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" aria-hidden="true">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88"
            />
          </svg>
        ) : (
          // eye
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" aria-hidden="true">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z"
            />
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        )}
      </button>
    </div>
  );
}

export function LoginForm() {
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [remember, setRemember] = useState(false);

  // Pre-fill the email remembered on this device (password is never stored)
  useEffect(() => {
    try {
      const saved = localStorage.getItem(REMEMBER_KEY);
      if (saved) {
        setEmail(saved);
        setRemember(true);
      }
    } catch {}
  }, []);

  useEffect(() => {
    try {
      if (remember && email) localStorage.setItem(REMEMBER_KEY, email);
      if (!remember) localStorage.removeItem(REMEMBER_KEY);
    } catch {}
  }, [remember, email]);

  return (
    <div>
      <div className="flex rounded-lg bg-slate-100 p-1 mb-6">
        {(["signin", "signup"] as const).map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => setMode(m)}
            className={`flex-1 rounded-md px-3 py-2.5 min-h-11 text-sm font-medium transition-colors ${
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
            <input
              name="email"
              type="email"
              required
              autoComplete="email"
              placeholder="you@company.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={inputClass}
            />
          </Field>
          <Field label="Password" required>
            <PasswordInput name="password" autoComplete="current-password" placeholder="••••••••" />
          </Field>
          <label className="flex items-center gap-3 min-h-11 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={remember}
              onChange={(e) => setRemember(e.target.checked)}
              className="w-5 h-5 rounded border-slate-300 text-slate-900 focus:ring-slate-400 accent-slate-900"
            />
            <span className="text-sm text-slate-700">
              Remember me
              <span className="block text-xs text-slate-400">
                Pre-fills your email on this device — your password is never stored
              </span>
            </span>
          </label>
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
            <PasswordInput
              name="password"
              autoComplete="new-password"
              placeholder="Min. 8 characters"
              minLength={8}
            />
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
