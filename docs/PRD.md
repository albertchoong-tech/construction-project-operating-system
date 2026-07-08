# HSH ProjectOS — Product Requirements Document

## Problem
Residential construction teams manage projects across Excel spreadsheets, WhatsApp threads, and paper forms. There is no single source of truth for project status, financials, procurement, or approvals — causing cost overruns, missed claims, and slow decisions.

## Target Users
- **Director** — full dashboard and approval access
- **Project Manager** — projects, budgets, progress, resources
- **Quantity Surveyor** — BOQ, quotations, variation orders, claims
- **Purchasing Officer** — purchase requests, orders, suppliers
- **Finance** — receipts, payments, cash flow, profitability
- **Site Supervisor** — daily progress, photos, inspections

## Core Objects
Projects · Clients · Quotations · Contracts · Budgets · BOQ Line Items · Purchase Requests · Purchase Orders · Suppliers · Material Deliveries · Subcontractors · Site Progress Logs · Inspection Records · Variation Orders · Progress Claims · Customer Payments · Supplier Payments · Project Documents · Approval Records

## MVP Must-Haves (v1)
- [ ] Project master with client, contract value, status, and dates
- [ ] Quotation creation and conversion to project
- [ ] Budget and BOQ entry per project
- [ ] Purchase request → purchase order workflow with approval
- [ ] Material delivery recording against POs
- [ ] Daily site progress log (work done, photos, issues)
- [ ] Variation order creation and approval
- [ ] Progress claim generation and status tracking
- [ ] Customer receipt recording
- [ ] Supplier payment recording
- [ ] Project dashboard: budget vs actual, cash position, completion %, pending approvals
- [ ] Role-based UI — each user sees only their relevant modules

## Non-Goals (v1)
Accounting integration · e-Invoice · Payroll · HR · Warehouse inventory · Mobile app · OCR · AI forecasting · Customer/Supplier portals · Advanced BI

## Success Criteria
A Project Manager can open a new residential project, attach a BOQ, raise a purchase order, approve it, log a week of site progress, generate a progress claim, record the client payment, and see the updated profit & loss — all inside the system, without touching Excel or WhatsApp.