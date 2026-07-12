export type Client = {
  id: string;
  name: string;
  contact_person: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  created_at: string;
};

export type Project = {
  id: string;
  client_id: string | null;
  project_code: string | null;
  name: string;
  address: string | null;
  status: "quotation" | "active" | "on_hold" | "completed" | "cancelled";
  contract_value: number;
  start_date: string | null;
  end_date: string | null;
  project_manager: string | null;
  completion_pct: number;
  created_at: string;
  clients?: Client | null;
};

export type Quotation = {
  id: string;
  project_id: string | null;
  client_id: string | null;
  quotation_no: string | null;
  title: string | null;
  issue_date: string | null;
  valid_until: string | null;
  total_amount: number;
  status: "draft" | "submitted" | "approved" | "rejected" | "converted";
  notes: string | null;
  created_at: string;
  clients?: Client | null;
  projects?: Project | null;
};

export type QuotationItem = {
  id: string;
  quotation_id: string;
  section: string | null;
  description: string;
  unit: string | null;
  quantity: number;
  unit_rate: number;
  total_amount: number;
  created_at: string;
};

export type BoqItem = {
  id: string;
  project_id: string;
  section: string | null;
  description: string;
  unit: string | null;
  quantity: number;
  unit_rate: number;
  total_amount: number;
  created_at: string;
};

export type Budget = {
  id: string;
  project_id: string;
  category: string;
  budgeted_amount: number;
  actual_amount: number;
  created_at: string;
};

export type Supplier = {
  id: string;
  name: string;
  contact_person: string | null;
  phone: string | null;
  email: string | null;
  category: string | null;
  created_at: string;
};

export type PRItem = {
  description: string;
  unit: string;
  qty: number;
  est_rate: number;
};

export type PurchaseRequest = {
  id: string;
  project_id: string;
  pr_no: string | null;
  requested_by: string | null;
  request_date: string | null;
  status: "draft" | "pending" | "approved" | "rejected";
  items: PRItem[];
  notes: string | null;
  created_at: string;
  projects?: Project | null;
};

export type PurchaseOrder = {
  id: string;
  project_id: string;
  pr_id: string | null;
  supplier_id: string | null;
  po_no: string | null;
  issue_date: string | null;
  delivery_date: string | null;
  status: "draft" | "approved" | "delivered" | "invoiced" | "paid" | "cancelled";
  cost_category: string | null;
  total_amount: number;
  notes: string | null;
  created_at: string;
  projects?: Project | null;
  suppliers?: Supplier | null;
};

export type MaterialDelivery = {
  id: string;
  project_id: string;
  po_id: string | null;
  delivery_date: string | null;
  delivery_note_no: string | null;
  received_by: string | null;
  items: unknown[];
  notes: string | null;
  created_at: string;
};

export type SiteProgressLog = {
  id: string;
  project_id: string;
  log_date: string;
  reported_by: string | null;
  work_done: string | null;
  completion_pct: number;
  weather: string | null;
  workers_count: number;
  issues: string | null;
  photo_urls: string[];
  created_at: string;
  projects?: Project | null;
};

export type InspectionRecord = {
  id: string;
  project_id: string;
  inspection_date: string | null;
  inspector: string | null;
  area: string | null;
  result: "pass" | "fail" | "conditional" | null;
  issue_category: string | null;
  issue_detail: string | null;
  remarks: string | null;
  created_at: string;
};

export type LabourCost = {
  id: string;
  project_id: string;
  worker_name: string;
  work_date: string | null;
  period: string | null;
  basic_wages: number;
  overtime: number;
  allowance: number;
  epf: number;
  socso: number;
  eis: number;
  pcb: number;
  other_cost: number;
  remarks: string | null;
  total_cost: number;
  created_at: string;
  projects?: Project | null;
};

export type VariationOrder = {
  id: string;
  project_id: string;
  vo_no: string | null;
  description: string;
  requested_by: string | null;
  request_date: string | null;
  amount: number;
  status: "draft" | "pending" | "approved" | "rejected" | "cancelled";
  approved_by: string | null;
  approved_date: string | null;
  created_at: string;
  projects?: Project | null;
};

export type ProgressClaim = {
  id: string;
  project_id: string;
  claim_no: string | null;
  claim_date: string | null;
  period_end: string | null;
  claimed_amount: number;
  approved_amount: number;
  status: "draft" | "submitted" | "approved" | "paid" | "cancelled";
  notes: string | null;
  created_at: string;
  projects?: Project | null;
};

export type CustomerPayment = {
  id: string;
  project_id: string;
  claim_id: string | null;
  payment_date: string | null;
  amount: number;
  payment_method: string | null;
  reference_no: string | null;
  notes: string | null;
  created_at: string;
  progress_claims?: ProgressClaim | null;
};

export type SupplierPayment = {
  id: string;
  project_id: string;
  po_id: string | null;
  payment_date: string | null;
  amount: number;
  payment_method: string | null;
  reference_no: string | null;
  notes: string | null;
  created_at: string;
  purchase_orders?: PurchaseOrder | null;
};

export type ApprovalRecord = {
  id: string;
  entity_type: string;
  entity_id: string;
  action: string;
  actioned_by: string | null;
  actioned_at: string | null;
  remarks: string | null;
  created_at: string;
};

export type ProjectDocument = {
  id: string;
  project_id: string;
  document_type: string | null;
  file_name: string | null;
  file_url: string | null;
  uploaded_by: string | null;
  entity_type: string | null;
  entity_id: string | null;
  created_at: string;
};
