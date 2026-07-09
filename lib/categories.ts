/** Update 1 — inspection issue / root-cause categories */
export const ISSUE_CATEGORIES = [
  "Workmanship Defect",
  "Wrong Specification / Material",
  "Client Change Request",
  "Design / Drawing Error",
  "Material Delivery Delay",
  "Weather / Force Majeure",
  "Site Coordination / Scheduling Issue",
  "Safety Incident / Near Miss",
  "Others",
] as const;

/** Update 6 — document centre categories */
export const DOCUMENT_CATEGORIES = [
  "Contract",
  "Quotation",
  "Drawing",
  "Variation Order",
  "Progress Claim",
  "Site Photo",
  "Inspection Photo",
  "Invoice / Receipt",
  "Meeting Minute",
  "Other",
] as const;

/** Update 4 — project cost centres */
export const COST_CATEGORIES = [
  { key: "material", label: "Material" },
  { key: "labour", label: "Labour" },
  { key: "subcontractor", label: "Subcontractor" },
  { key: "plant_equipment", label: "Plant & Equipment" },
  { key: "transport", label: "Transport" },
  { key: "permit_statutory", label: "Permit / Statutory" },
  { key: "site_office", label: "Site Office / Utilities" },
  { key: "miscellaneous", label: "Miscellaneous" },
] as const;

export type CostCategoryKey = (typeof COST_CATEGORIES)[number]["key"];

export function costCategoryLabel(key: string | null | undefined): string {
  return COST_CATEGORIES.find((c) => c.key === key)?.label ?? "Material";
}

/** Entities an uploaded document can be linked to (besides the project itself) */
export const DOCUMENT_ENTITY_TYPES: { key: string; label: string }[] = [
  { key: "variation_order", label: "Variation Order" },
  { key: "progress_claim", label: "Progress Claim" },
  { key: "inspection_record", label: "Inspection" },
  { key: "site_progress_log", label: "Site Progress Log" },
];
