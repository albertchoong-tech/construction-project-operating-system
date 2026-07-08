import { redirect } from "next/navigation";
import { getSessionProfile } from "@/lib/auth";
import { homeFor } from "@/lib/roles";
import { LoginForm } from "./login-form";

export const dynamic = "force-dynamic";

export default async function LoginPage() {
  const profile = await getSessionProfile();
  if (profile) redirect(homeFor(profile.role));

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-900 p-6">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-white tracking-tight">HSH ProjectOS</h1>
          <p className="text-sm text-slate-400 mt-1">
            Construction Project Operating System
          </p>
        </div>
        <div className="bg-white rounded-2xl shadow-xl p-8">
          <LoginForm />
        </div>
        <p className="text-xs text-slate-500 text-center mt-6">
          Access is role-based — Directors approve, QS raises claims, Finance records
          payments, Supervisors log site progress.
        </p>
      </div>
    </div>
  );
}
