import { redirect } from "next/navigation";
import { getSessionProfile } from "@/lib/auth";
import { homeFor } from "@/lib/roles";
import { LoginForm } from "./login-form";

export const dynamic = "force-dynamic";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ deactivated?: string }>;
}) {
  const [profile, { deactivated }] = await Promise.all([getSessionProfile(), searchParams]);
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
        {deactivated && (
          <p role="alert" className="mb-4 text-sm text-amber-200 bg-amber-950/60 border border-amber-800 rounded-xl px-4 py-3 text-center">
            Your account has been deactivated. Contact your Director if you believe this is a
            mistake.
          </p>
        )}
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
