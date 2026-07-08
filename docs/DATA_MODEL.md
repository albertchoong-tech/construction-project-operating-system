# Data Model

## clients
`id uuid PK · user_id uuid · name text · contact_person text · phone text · email text · address text · created_at timestamptz`

## projects
`id uuid PK · user_id uuid · client_id uuid → clients · project_code text · name text · address text · status text (quotation|active|on_hold|completed|cancelled) · contract_value numeric · start_date date · end_date date · project_manager text · created_at timestamptz`

## quotations
`id uuid PK · user_id uuid · project_id uuid → projects · quotation_no text · issue_date date · total_amount numeric · status text (draft|submitted|approved|rejected|converted) · notes text · created_at timestamptz`

## boq_items
`id uuid PK · user_id uuid · project_id uuid → projects · section text · description text · unit text · quantity numeric · unit_rate numeric · total_amount numeric · created_at timestamptz`

## budgets
`id uuid PK · user_id uuid · project_id uuid → projects · category text · budgeted_amount numeric · actual_amount numeric · created_at timestamptz`

## suppliers
`id uuid PK · user_id uuid · name text · contact_person text · phone text · email text · category text · created_at timestamptz`

## purchase_requests
`id uuid PK · user_id uuid · project_id uuid → projects · pr_no text · requested_by text · request_date date · status text (draft|pending|approved|rejected) · items jsonb · notes text · created_at timestamptz`

## purchase_orders
`id uuid PK · user_id uuid · project_id uuid → projects · pr_id uuid → purchase_requests · supplier_id uuid → suppliers · po_no text · issue_date date · delivery_date date · status text (draft|approved|delivered|invoiced|paid) · total_amount numeric · notes text · created_at timestamptz`

## po_items
`id uuid PK · user_id uuid · po_id uuid → purchase_orders · description text · unit text · quantity numeric · unit_rate numeric · total_amount numeric · created_at timestamptz`

## material_deliveries
`id uuid PK · user_id uuid · project_id uuid → projects · po_id uuid → purchase_orders · delivery_date date · delivery_note_no text · received_by text · items jsonb · notes text · created_at timestamptz`

## site_progress_logs
`id uuid PK · user_id uuid · project_id uuid → projects · log_date date · reported_by text · work_done text · completion_pct numeric · weather text · workers_count int · issues text · photo_urls jsonb · created_at timestamptz`

## inspection_records
`id uuid PK · user_id uuid · project_id uuid → projects · inspection_date date · inspector text · area text · result text (pass|fail|conditional) · remarks text · created_at timestamptz`

## variation_orders
`id uuid PK · user_id uuid · project_id uuid → projects · vo_no text · description text · requested_by text · request_date date · amount numeric · status text (draft|pending|approved|rejected) · approved_by text · approved_date date · created_at timestamptz`

## progress_claims
`id uuid PK · user_id uuid · project_id uuid → projects · claim_no text · claim_date date · period_end date · claimed_amount numeric · approved_amount numeric · status text (draft|submitted|approved|paid) · notes text · created_at timestamptz`

## customer_payments
`id uuid PK · user_id uuid · project_id uuid → projects · claim_id uuid → progress_claims · payment_date date · amount numeric · payment_method text · reference_no text · notes text · created_at timestamptz`

## supplier_payments
`id uuid PK · user_id uuid · project_id uuid → projects · po_id uuid → purchase_orders · payment_date date · amount numeric · payment_method text · reference_no text · notes text · created_at timestamptz`

## approval_records
`id uuid PK · user_id uuid · entity_type text · entity_id uuid · action text (approved|rejected) · actioned_by text · actioned_at timestamptz · remarks text · created_at timestamptz`

## project_documents
`id uuid PK · user_id uuid · project_id uuid → projects · document_type text · file_name text · file_url text · uploaded_by text · created_at timestamptz`

## RLS Notes
All tables: RLS enabled. v1 policies allow anonymous select + write (demo mode). Lock-down sprint replaces with `auth.uid() = user_id` owner policies and role checks.