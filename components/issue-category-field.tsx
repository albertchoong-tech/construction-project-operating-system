"use client";

import { useState } from "react";
import { inputClass } from "@/components/form";
import { ISSUE_CATEGORIES } from "@/lib/categories";

/** Issue category dropdown; selecting "Others" reveals a required "Please specify" input. */
export function IssueCategoryField({ defaultValue = "" }: { defaultValue?: string }) {
  const [category, setCategory] = useState(defaultValue);

  return (
    <>
      <label className="block">
        <span className="block text-sm font-medium text-slate-700 mb-1">
          Issue category / root cause
        </span>
        <select
          name="issue_category"
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className={inputClass}
        >
          <option value="">— None / not applicable —</option>
          {ISSUE_CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </label>
      {category === "Others" && (
        <label className="block">
          <span className="block text-sm font-medium text-slate-700 mb-1">
            Please specify<span className="text-rose-500 ml-0.5">*</span>
          </span>
          <input
            name="issue_detail"
            required
            placeholder="Describe the issue category"
            className={inputClass}
          />
        </label>
      )}
    </>
  );
}
