# Agentic Layer

## Risk Levels & Actions

### Low Risk — Auto-execute (no approval needed)
- Tag a project's budget health status (green/amber/red) based on actuals
- Calculate project completion % from latest site progress log
- Generate draft progress claim amounts from BOQ completion entries
- Flag overdue purchase orders (delivery_date passed, status ≠ delivered)

### Medium Risk — Light approval (user confirms before saving)
- Create a draft variation order from a site supervisor's issue log entry
- Update PO status to "Delivered" after matching delivery note recorded
- Mark a progress claim as "Submitted" and notify approver

### High Risk — Explicit approval required
- Approve or reject a purchase order (triggers supplier commitment)
- Approve a variation order (changes contract value)
- Approve a progress claim (triggers billing)

### Critical — Human only, never automated
- Delete a project or any financial record
- Issue a credit note or payment reversal
- Any action with legal or contractual consequence

## Named Tools (v1)
`calculate_project_financials(project_id)` · `draft_progress_claim(project_id, period_end)` · `flag_overdue_pos()` · `update_approval_record(entity_type, entity_id, action, remarks)`

## Audit Log Fields
`entity_type · entity_id · action · performed_by · timestamp · input_snapshot · output_snapshot · approval_id`

## v1 vs Later
**v1:** All actions are user-triggered; system only calculates and drafts.
**Later:** Scheduled agent runs `flag_overdue_pos()` nightly; email digest to Project Manager.