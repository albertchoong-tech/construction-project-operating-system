import { Select } from "@/components/form";

export type DrawingChoice = {
  id: string;
  drawing_no: string;
  revision_no: string;
  title: string;
  status: string;
};

/** Drawing reference picker for a single project.
 *
 *  Includes superseded revisions as well as current ones — an update may
 *  legitimately reference the revision that was in force at the time, and
 *  dropping them would silently clear an existing reference on edit. */
export function DrawingSelect({
  drawings,
  defaultValue,
}: {
  drawings: DrawingChoice[];
  defaultValue?: string | null;
}) {
  return (
    <Select name="drawing_id" defaultValue={defaultValue ?? ""}>
      <option value="">
        {drawings.length ? "— None —" : "No drawings for this project"}
      </option>
      {drawings.map((d) => (
        <option key={d.id} value={d.id}>
          {d.drawing_no} Rev {d.revision_no} — {d.title}
          {d.status === "superseded" ? " (superseded)" : ""}
        </option>
      ))}
    </Select>
  );
}
