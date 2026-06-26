"use client";

import { useCallbackRef } from "./useCallbackRef";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import type { Section } from "@/lib/programs";
import FormField from "./FormField";
import { useT, fmt } from "@/i18n/IntlProvider";
import CopilotDrawer from "./ai/CopilotDrawer";

type Data = Record<string, any>;

export default function FormWizard({
  applicationId,
  program,
  sections,
  reference,
  initialData,
  initialStep,
  reviewNote,
}: {
  applicationId: string;
  program: string;
  sections: Section[];
  reference: string;
  initialData: Data;
  initialStep: number;
  reviewNote?: string | null;
}) {
  const router = useRouter();
  const tr = useT();

  const [data, setData] = useState<Data>(initialData || {});
  const [step, setStep] = useState(Math.min(initialStep || 0, sections.length - 1));
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved">("idle");
  const [submitting, setSubmitting] = useState(false);
  const [issues, setIssues] = useState<
    { sectionId: string; sectionTitle: string; missing: string[] }[]
  >([]);
  const [error, setError] = useState("");

  const dataRef = useRef(data);
  dataRef.current = data;

  // Debounced autosave whenever data/step changes (after first render).
  const firstRender = useRef(true);
  const saveTimer = useRef<ReturnType<typeof setTimeout>>();

  const save = useCallbackRef(async () => {
    setSaveState("saving");
    await fetch(`/api/applications/${applicationId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ data: dataRef.current, currentStep: step }),
    }).catch(() => {});
    setSaveState("saved");
  });

  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    clearTimeout(saveTimer.current);
    setSaveState("saving");
    saveTimer.current = setTimeout(() => save(), 800);
    return () => clearTimeout(saveTimer.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, step]);

  const current = sections[step];

  function setField(name: string, value: any) {
    setData((d) => ({ ...d, [name]: value }));
  }

  function applyCopilotValues(values: Record<string, any>) {
    setData((d) => ({ ...d, ...values }));
  }

  // crude per-section completion: every required & visible field has a value
  const completion = useMemo(() => {
    return sections.map((s) => {
      const required = s.fields.filter((f) => f.required);
      if (required.length === 0) {
        // section optional → "touched" if any field filled
        const touched = s.fields.some((f) => notEmpty(data[f.name]));
        return touched ? "done" : "empty";
      }
      const allFilled = required.every((f) => {
        if (f.showIf) {
          const dep = String(data[f.showIf.field] ?? "");
          if (!f.showIf.in.includes(dep)) return true;
        }
        if (f.type === "checkbox") return data[f.name] === true || data[f.name] === "true";
        return notEmpty(data[f.name]);
      });
      return allFilled ? "done" : "partial";
    });
  }, [sections, data]);

  async function goTo(next: number) {
    clearTimeout(saveTimer.current);
    await save();
    setStep(next);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function submit() {
    setSubmitting(true);
    setError("");
    setIssues([]);
    clearTimeout(saveTimer.current);
    await save();
    const res = await fetch(`/api/applications/${applicationId}/submit`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ data }),
    });
    const json = await res.json().catch(() => ({}));
    setSubmitting(false);
    if (res.status === 422) {
      setIssues(json.issues || []);
      setError(tr.wizard.error);
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }
    if (!res.ok) {
      setError(json.error || "Could not submit. Please try again.");
      return;
    }
    router.push(`/apply/${applicationId}?submitted=1`);
    router.refresh();
  }

  const isLast = step === sections.length - 1;

  return (
    <>
    <div className="grid gap-6 lg:grid-cols-[260px_1fr]">
      {/* Sidebar */}
      <aside className="lg:sticky lg:top-20 lg:self-start">
        <div className="card p-4">
          <p className="px-2 text-xs font-semibold uppercase tracking-wide text-ink-400">
            {tr.wizard.sections}
          </p>
          <nav className="mt-2 space-y-1">
            {sections.map((s, i) => {
              const state = completion[i];
              const active = i === step;
              return (
                <button
                  key={s.id}
                  onClick={() => goTo(i)}
                  className={`flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm transition ${
                    active ? "bg-brand-50 font-semibold text-brand-700" : "text-ink-600 hover:bg-ink-50"
                  }`}
                >
                  <span
                    className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] ${
                      state === "done"
                        ? "bg-emerald-500 text-white"
                        : active
                        ? "bg-brand-600 text-white"
                        : "border border-ink-300 text-ink-400"
                    }`}
                  >
                    {state === "done" ? "✓" : i + 1}
                  </span>
                  <span className="truncate">{s.title}</span>
                </button>
              );
            })}
          </nav>
        </div>
        <p className="mt-3 px-1 text-xs text-ink-400">
          {saveState === "saving" ? tr.wizard.saving : saveState === "saved" ? tr.wizard.allSaved : tr.wizard.savedDraft}
        </p>
      </aside>

      {/* Main */}
      <div>
        {reviewNote && (
          <div className="mb-5 rounded-xl border border-orange-200 bg-orange-50 p-4 text-sm text-orange-800">
            <p className="font-semibold">{tr.wizard.reviewNoteTitle}</p>
            <p className="mt-1">{reviewNote}</p>
          </div>
        )}

        {error && (
          <div className="mb-5 rounded-xl border border-brand-200 bg-brand-50 p-4 text-sm text-brand-700">
            {error}
          </div>
        )}

        {issues.length > 0 && (
          <div className="mb-5 rounded-xl border border-amber-200 bg-amber-50 p-4">
            <p className="text-sm font-semibold text-amber-800">{tr.wizard.incomplete}</p>
            <ul className="mt-2 space-y-1 text-sm text-amber-700">
              {issues.map((iss) => {
                const idx = sections.findIndex((s) => s.id === iss.sectionId);
                return (
                  <li key={iss.sectionId}>
                    {idx >= 0 ? (
                      // A form section: clickable to jump straight to it.
                      <button onClick={() => goTo(idx)} className="font-medium underline">
                        {iss.sectionTitle}
                      </button>
                    ) : (
                      // Non-form issue (e.g. required documents, handled in the
                      // Documents panel below) — show as plain label.
                      <span className="font-medium">{iss.sectionTitle}</span>
                    )}
                    : {iss.missing.join(", ")}
                  </li>
                );
              })}
            </ul>
          </div>
        )}

        <div className="card p-6 sm:p-8">
          <div className="flex items-baseline justify-between">
            <p className="text-xs font-semibold uppercase tracking-wide text-brand-600">
              {fmt(tr.wizard.stepOf, { a: step + 1, b: sections.length })}
            </p>
            <p className="text-xs text-ink-400">{tr.dashboard.ref} {reference}</p>
          </div>
          <h2 className="mt-2 text-xl font-bold text-ink-900">{current.title}</h2>
          {current.description && (
            <p className="mt-1 text-sm text-ink-500">{current.description}</p>
          )}

          <div className="mt-6 grid grid-cols-1 gap-5 sm:grid-cols-2">
            {current.fields.map((field) => (
              <div key={field.name} className={field.half ? "" : "sm:col-span-2"}>
                <FormField field={field} scope={data} onChange={setField} />
              </div>
            ))}
          </div>
        </div>

        {/* Footer nav */}
        <div className="mt-6 flex items-center justify-between">
          <button
            onClick={() => goTo(Math.max(0, step - 1))}
            disabled={step === 0}
            className="btn-secondary"
          >
            ← {tr.common.back}
          </button>

          {isLast ? (
            <button onClick={submit} disabled={submitting} className="btn-primary px-6">
              {submitting ? tr.wizard.submitting : tr.wizard.submitApplication}
            </button>
          ) : (
            <button onClick={() => goTo(step + 1)} className="btn-primary px-6">
              {tr.wizard.saveContinue}
            </button>
          )}
        </div>
      </div>
    </div>

    <CopilotDrawer
      program={program}
      applicationId={applicationId}
      sectionId={current.id}
      sectionTitle={current.title}
      onApply={applyCopilotValues}
    />
    </>
  );
}

function notEmpty(v: any) {
  return !(v === undefined || v === null || v === "" || (Array.isArray(v) && v.length === 0));
}
