# Intelligence Layer

## Messy Inputs Handled
- Site supervisors log free-text progress notes with inconsistent terminology
- BOQ quantities entered manually may not sum correctly
- Variation order descriptions lack cost categorisation

## Auto-Structure (v1 Rule-Based, No AI)
| Signal | Rule | Output |
|---|---|---|
| sum(customer_payments) vs sum(progress_claims.approved_amount) | arithmetic | Outstanding receivable |
| sum(actual cost) vs budgeted_amount | arithmetic | Budget variance % |
| site_progress_logs.completion_pct latest per project | max() | Project completion % |
| approved VOs summed | arithmetic | Revised contract value |

## Events to Track
- Project status change · PO approved · Progress claim submitted · Payment received · VO approved · Budget variance > 10%

## Scoring Rules (Rule-Based First)
- **Budget health score:** (budget - actual) / budget × 100; red < 0, amber 0–10%, green > 10%
- **Cash risk score:** outstanding receivables / contract value; red > 30%
- **Delay risk:** today > end_date AND status ≠ completed → flag

## What Gets Ranked
- Projects by overrun risk on dashboard
- Pending approvals by age (oldest first)

## v1 vs Later
**v1:** All scoring is deterministic SQL/server logic.
**Later:** AI summarises site log patterns, flags anomalous cost spikes, drafts progress claim narratives from log entries.