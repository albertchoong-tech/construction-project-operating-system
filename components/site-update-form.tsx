"use client";

import { useState } from "react";
import { ActionForm, Field, TextInput, TextArea, Select } from "@/components/form";
import { PhotoField } from "@/components/photo-field";
import { VideoField } from "@/components/video-field";
import { IssueCategoryField } from "@/components/issue-category-field";
import { addProgressLog, addInspection } from "@/lib/actions/site";
import { today } from "@/lib/format";

type ProjectOption = { id: string; name: string; project_code: string | null };
type DrawingOption = {
  id: string;
  project_id: string;
  drawing_no: string;
  revision_no: string;
  title: string;
};
type Mode = "progress" | "inspection";

/**
 * One mobile-first entry point for the site team. This is a presentation layer
 * only: a Progress Update is routed to addProgressLog (site_progress_logs) and
 * a Site Inspection to addInspection (inspection_records). The two domain
 * models, their audit trail and their side-effects stay exactly as they were.
 */
export function SiteUpdateForm({
  projects,
  drawings,
  reporterName,
}: {
  projects: ProjectOption[];
  drawings: DrawingOption[];
  reporterName: string;
}) {
  const [mode, setMode] = useState<Mode>("progress");
  const [projectId, setProjectId] = useState(projects[0]?.id ?? "");
  const [videoBusy, setVideoBusy] = useState(false);

  // Only offer drawings belonging to the chosen project.
  const projectDrawings = drawings.filter((d) => d.project_id === projectId);

  const seg = (m: Mode, label: string, hint: string) => (
    <button
      key={m}
      type="button"
      onClick={() => setMode(m)}
      aria-pressed={mode === m}
      // Explicit label so it is distinct from the "Save Progress Update" submit.
      aria-label={label}
      className={`flex-1 rounded-lg px-3 py-3 text-left transition-colors min-h-11 ${
        mode === m
          ? "bg-slate-900 text-white shadow-sm"
          : "bg-white text-slate-700 border border-slate-300 hover:bg-slate-50"
      }`}
    >
      <span className="block text-sm font-semibold">{label}</span>
      <span className={`block text-xs ${mode === m ? "text-slate-300" : "text-slate-500"}`}>
        {hint}
      </span>
    </button>
  );

  /** Fields common to both kinds of update. */
  const common = (
    <>
      <Field label="Project" required>
        <Select
          name="project_id"
          required
          value={projectId}
          onChange={(e) => setProjectId(e.target.value)}
        >
          <option value="">— Select project —</option>
          {projects.map((p) => (
            <option key={p.id} value={p.id}>
              {p.project_code ? `${p.project_code} · ` : ""}
              {p.name}
            </option>
          ))}
        </Select>
      </Field>

      {projectId && (
        <a
          href={`/projects/${projectId}?tab=drawings`}
          className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-slate-300 bg-white px-3.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
        >
          📐 View Plans &amp; Drawings
        </a>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label={mode === "progress" ? "Update date" : "Inspection date"}>
          <TextInput
            name={mode === "progress" ? "log_date" : "inspection_date"}
            type="date"
            defaultValue={today()}
          />
        </Field>
        <Field label="Recorded by">
          <TextInput
            name={mode === "progress" ? "reported_by" : "inspector"}
            defaultValue={reporterName}
          />
        </Field>
        <Field label="Area / location" className="sm:col-span-2">
          <TextInput name="area" placeholder="e.g. Level 2 — east wing" />
        </Field>
        <Field label="Drawing reference" className="sm:col-span-2">
          <Select name="drawing_id" defaultValue="" disabled={!projectDrawings.length}>
            <option value="">
              {projectDrawings.length
                ? "— None —"
                : "No current drawings for this project"}
            </option>
            {projectDrawings.map((d) => (
              <option key={d.id} value={d.id}>
                {d.drawing_no} Rev {d.revision_no} — {d.title}
              </option>
            ))}
          </Select>
        </Field>
      </div>
    </>
  );

  const media = (
    <>
      <PhotoField label="Photos" />
      <div>
        <p className="mb-1 text-sm font-medium text-slate-700">Videos</p>
        <VideoField projectId={projectId} onBusyChange={setVideoBusy} />
      </div>
    </>
  );

  return (
    <div className="space-y-4">
      <div className="flex gap-2" role="group" aria-label="Update type">
        {seg("progress", "Progress Update", "Work done, completion %")}
        {seg("inspection", "Site Inspection", "Quality / defect check")}
      </div>

      {videoBusy && (
        <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
          A video is still uploading — wait for it to finish before saving.
        </p>
      )}

      {mode === "progress" ? (
        <ActionForm action={addProgressLog} submitLabel="Save Progress Update" draftKey="site-update-progress">
          {common}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Completion %" required>
              <TextInput
                name="completion_pct"
                type="number"
                step="0.1"
                min="0"
                max="100"
                required
                placeholder="0"
              />
            </Field>
            <Field label="Workers on site">
              <TextInput name="workers_count" type="number" min="0" placeholder="0" />
            </Field>
            <Field label="Weather">
              <TextInput name="weather" placeholder="e.g. Fine / Rain pm" />
            </Field>
          </div>
          <Field label="Work completed" required>
            <TextArea name="work_done" required placeholder="What was completed today…" />
          </Field>
          <Field label="Delays / issues">
            <TextArea name="issues" placeholder="Anything blocking progress…" />
          </Field>
          {media}
        </ActionForm>
      ) : (
        <ActionForm action={addInspection} submitLabel="Save Site Inspection" draftKey="site-update-inspection">
          {common}
          <Field label="Inspection result" required>
            <Select name="result" required defaultValue="pass">
              <option value="pass">Pass</option>
              <option value="conditional">Conditional</option>
              <option value="fail">Fail</option>
            </Select>
          </Field>
          <IssueCategoryField />
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Corrective action required">
              <TextInput name="corrective_action" placeholder="e.g. Re-skim and re-inspect" />
            </Field>
            <Field label="Responsible party">
              <TextInput name="responsible_party" placeholder="e.g. Plastering subcontractor" />
            </Field>
            <Field label="Follow-up date">
              <TextInput name="follow_up_date" type="date" />
            </Field>
          </div>
          <Field label="Remarks">
            <TextArea name="remarks" placeholder="Observations, context…" />
          </Field>
          {media}
        </ActionForm>
      )}
    </div>
  );
}
