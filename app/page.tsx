import { redirect } from "next/navigation";
import { getSessionProfile } from "@/lib/auth";
import { homeFor } from "@/lib/roles";
import { DirectorDashboard } from "./director-dashboard";
import { SupervisorDashboard } from "./supervisor-dashboard";
import { FinanceDashboard } from "./finance-dashboard";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const profile = await getSessionProfile();
  if (!profile) redirect("/login");

  switch (profile.role) {
    case "director":
      return <DirectorDashboard />;
    case "site_supervisor":
      return <SupervisorDashboard name={profile.fullName} />;
    case "finance":
      return <FinanceDashboard />;
    default:
      redirect(homeFor(profile.role));
  }
}
