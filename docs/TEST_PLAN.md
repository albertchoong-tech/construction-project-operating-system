# Test Plan

## v1 Success Scenario — Full End-to-End

### Step 1: Create Client & Project
- Navigate to `/clients` → Create client "Tan Family" → confirm appears in list
- Navigate to `/projects` → Create project "Tan Residence Renovation" linked to client, contract value RM 350,000 → confirm appears in list with status "active"

### Step 2: Enter BOQ & Budget
- Open project detail → BOQ tab → Add 3 line items (e.g. Earthworks, Structure, Finishes) → confirm totals calculate correctly
- Budget tab → Add categories matching BOQ sections → confirm budgeted amounts saved

### Step 3: Procurement
- Create Purchase Request for "Cement 500 bags" → status shows "draft"
- Approve PR → status moves to "approved"; approval_record created
- Create PO from PR linked to supplier "BuildMat Sdn Bhd" → approve PO
- Record material delivery → PO status moves to "delivered"
- Project detail → Budget card shows actual cost updated

### Step 4: Site Progress
- Create site progress log for today: work done, completion 35%, 12 workers
- Project detail card shows completion % = 35%

### Step 5: Variation Order
- Create VO "Additional waterproofing works" RM 8,500 → approve → revised contract value updates

### Step 6: Progress Claim & Payment
- Create progress claim for current period → system pre-fills RM based on completion %
- Approve claim → status "approved"
- Record customer payment RM 120,000 against claim → outstanding receivable reduces
- Record supplier payment against PO → payable clears

### Step 7: Dashboard Check
- `/dashboard` shows correct: contract value RM 358,500 (incl VO), outstanding receivable, gross margin, completion 35%

## Empty State Tests
- Visit `/projects` with no data → shows "No projects yet" with a Create button (not blank page)
- Visit `/purchase-orders` with no POs → shows empty state message

## Error State Tests
- Submit project form with missing required fields → inline validation messages appear, no DB write
- Simulate network failure on PO approval → error toast shown, status not changed

## Loading State Tests
- All list pages show skeleton loader while data fetches
- Dashboard KPI cards show spinner until aggregation resolves

## Permission Pre-check (before lock-down sprint)
- Confirm Supabase anon key cannot bypass RLS once lock-down policies are applied
- Confirm service role key is absent from browser network tab