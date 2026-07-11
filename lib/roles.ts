export const ROLES = [
  "director",
  "project_manager",
  "quantity_surveyor",
  "purchasing_officer",
  "finance",
  "site_supervisor",
] as const;

export type Role = (typeof ROLES)[number];

export const ROLE_LABELS: Record<Role, string> = {
  director: "Director",
  project_manager: "Project Manager",
  quantity_surveyor: "Quantity Surveyor",
  purchasing_officer: "Purchasing Officer",
  finance: "Finance",
  site_supervisor: "Site Supervisor",
};

/** Which roles may open each module (first URL segment). Writes are further
 *  restricted by RLS; this gates navigation and routing. */
export const MODULE_ACCESS: Record<string, Role[]> = {
  "": ["director", "site_supervisor", "finance"], // role-specific dashboards
  projects: ["director", "project_manager", "quantity_surveyor", "site_supervisor", "finance"],
  clients: ["director", "project_manager", "quantity_surveyor"],
  suppliers: ["director", "purchasing_officer", "project_manager"],
  "purchase-requests": ["director", "purchasing_officer", "project_manager"],
  "purchase-orders": ["director", "purchasing_officer", "finance"],
  "site-progress": ["director", "project_manager", "site_supervisor"],
  inspections: ["director", "project_manager", "site_supervisor"],
  "variation-orders": ["director", "quantity_surveyor"],
  "progress-claims": ["director", "quantity_surveyor", "finance"],
  payments: ["director", "finance"],
  "labour-costs": ["director", "finance"],
  team: ["director"],
};

export function isValidRole(value: unknown): value is Role {
  return typeof value === "string" && (ROLES as readonly string[]).includes(value);
}

export function canAccessModule(role: Role, segment: string): boolean {
  const allowed = MODULE_ACCESS[segment];
  return allowed ? allowed.includes(role) : true;
}

/** Landing page per role (role dashboard where one exists, first permitted module otherwise). */
export function homeFor(role: Role): string {
  if (MODULE_ACCESS[""].includes(role)) return "/";
  for (const [segment, roles] of Object.entries(MODULE_ACCESS)) {
    if (segment && roles.includes(role)) return `/${segment}`;
  }
  return "/projects";
}
