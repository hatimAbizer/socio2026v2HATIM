"use client";

import { useEffect, useMemo, useState } from "react";
import type { DepartmentOption, SchoolOption, VenueOption } from "./types";

export type DomainScopeMode = "hod" | "dean" | "cfo" | "venue_manager";

type DomainScopeModalProps = {
  isOpen: boolean;
  mode: DomainScopeMode;
  userName: string;
  departments: DepartmentOption[];
  schools: SchoolOption[];
  campuses: string[];
  venues: VenueOption[];
  initialValue: string | null;
  onCancel: () => void;
  onConfirm: (selectedValue: string) => void;
};

type SelectOption = {
  id: string;
  label: string;
};

export default function DomainScopeModal({
  isOpen,
  mode,
  userName,
  departments,
  schools,
  campuses,
  venues,
  initialValue,
  onCancel,
  onConfirm,
}: DomainScopeModalProps) {
  const options = useMemo<SelectOption[]>(() => {
    if (mode === "hod") {
      return departments.map((department) => ({
        id: department.id,
        label: department.school
          ? `${department.department_name} (${department.school})`
          : department.department_name,
      }));
    }

    if (mode === "dean") {
      return schools.map((school) => ({
        id: school.id,
        label: school.name,
      }));
    }

    if (mode === "cfo") {
      return campuses.map((campus) => ({
        id: campus,
        label: campus,
      }));
    }

    return venues.map((venue) => ({
      id: venue.id,
      label: venue.campus ? `${venue.name} (${venue.campus})` : venue.name,
    }));
  }, [mode, departments, schools, campuses, venues]);

  const [selectedValue, setSelectedValue] = useState<string>("");

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    if (initialValue) {
      setSelectedValue(initialValue);
      return;
    }

    setSelectedValue(options[0]?.id || "");
  }, [isOpen, initialValue, options]);

  if (!isOpen) {
    return null;
  }

  const titleByMode: Record<DomainScopeMode, string> = {
    hod: "Assign Department",
    dean: "Assign School",
    cfo: "Assign Campus",
    venue_manager: "Assign Venue",
  };

  const helperByMode: Record<DomainScopeMode, string> = {
    hod: `Select a department for ${userName} before enabling HOD.`,
    dean: `Select a school for ${userName} before enabling Dean.`,
    cfo: `Select a campus for ${userName} before enabling CFO.`,
    venue_manager: `Select a venue for ${userName} before enabling Venue Manager.`,
  };

  const labelByMode: Record<DomainScopeMode, string> = {
    hod: "Department",
    dean: "School",
    cfo: "Campus",
    venue_manager: "Venue",
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/55 p-4">
      <div className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl">
        <h2 className="text-xl font-bold text-slate-900">{titleByMode[mode]}</h2>
        <p className="mt-2 text-sm text-slate-600">{helperByMode[mode]}</p>

        <div className="mt-5">
          <label
            htmlFor="domain-select"
            className="mb-2 block text-xs font-semibold uppercase tracking-wide text-slate-500"
          >
            {labelByMode[mode]}
          </label>
          <select
            id="domain-select"
            value={selectedValue}
            onChange={(event) => setSelectedValue(event.target.value)}
            className="w-full rounded-lg border border-slate-300 px-4 py-2.5 text-sm text-slate-700 shadow-sm focus:border-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-200"
          >
            {options.length === 0 ? (
              <option value="">No options available</option>
            ) : (
              options.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.label}
                </option>
              ))
            )}
          </select>
        </div>

        <div className="mt-6 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => onConfirm(selectedValue)}
            disabled={!selectedValue}
            className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-slate-300"
          >
            Confirm
          </button>
        </div>
      </div>
    </div>
  );
}
