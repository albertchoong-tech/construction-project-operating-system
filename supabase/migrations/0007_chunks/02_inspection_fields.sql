-- CHUNK 02 — Inspection follow-up fields. Safe to re-run.

alter table inspection_records add column if not exists corrective_action text;
alter table inspection_records add column if not exists responsible_party text;
alter table inspection_records add column if not exists follow_up_date date;
