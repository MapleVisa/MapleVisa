"use client";

import type { Field } from "@/lib/programs";
import { useT, fmt } from "@/i18n/IntlProvider";
import PrettySelect from "./PrettySelect";

type Scope = Record<string, any>;

// Display label for an option value (values stay English; labels may be translated).
function optionLabel(field: Field, value: string) {
  const i = field.options?.indexOf(value) ?? -1;
  return (i >= 0 && field.optionLabels?.[i]) || value;
}

function visible(field: Field, scope: Scope) {
  if (!field.showIf) return true;
  const dep = String(scope[field.showIf.field] ?? "");
  return field.showIf.in.includes(dep);
}

export default function FormField({
  field,
  scope,
  onChange,
}: {
  field: Field;
  scope: Scope;
  onChange: (name: string, value: any) => void;
}) {
  const t = useT();
  if (!visible(field, scope)) return null;

  if (field.type === "repeater") {
    return <Repeater field={field} value={scope[field.name] || []} onChange={(v) => onChange(field.name, v)} />;
  }

  const value = scope[field.name] ?? "";
  const id = `f_${field.name}_${Math.random().toString(36).slice(2, 6)}`;

  if (field.type === "checkbox") {
    const checked = scope[field.name] === true || scope[field.name] === "true";
    return (
      <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-ink-200 bg-white px-4 py-3 transition hover:bg-ink-50">
        <input
          type="checkbox"
          checked={checked}
          onChange={(e) => onChange(field.name, e.target.checked)}
          className="mt-0.5 h-4 w-4 rounded border-ink-300 text-brand-600 focus:ring-brand-500"
        />
        <span className="text-sm text-ink-700">
          {field.label}
          {field.required && <span className="text-brand-600"> *</span>}
        </span>
      </label>
    );
  }

  return (
    <div>
      <label className="label" htmlFor={id}>
        {field.label}
        {field.required && <span className="text-brand-600"> *</span>}
      </label>

      {field.type === "textarea" ? (
        <textarea
          id={id}
          className="input min-h-[96px]"
          value={value}
          placeholder={field.placeholder}
          onChange={(e) => onChange(field.name, e.target.value)}
        />
      ) : field.type === "select" ? (
        <PrettySelect
          value={value}
          onChange={(v) => onChange(field.name, v)}
          placeholder={t.common.select}
          options={(field.options ?? []).map((o, i) => ({
            value: o,
            label: field.optionLabels?.[i] ?? o,
          }))}
        />
      ) : field.type === "radio" ? (
        <div className="space-y-2">
          {field.options?.map((o, i) => (
            <label
              key={o}
              className={`flex cursor-pointer items-center gap-3 rounded-lg border px-4 py-2.5 text-sm transition ${
                value === o
                  ? "border-brand-500 bg-brand-50 text-ink-900"
                  : "border-ink-200 text-ink-700 hover:bg-ink-50"
              }`}
            >
              <input
                type="radio"
                name={field.name}
                value={o}
                checked={value === o}
                onChange={() => onChange(field.name, o)}
                className="h-4 w-4 text-brand-600 focus:ring-brand-500"
              />
              {field.optionLabels?.[i] ?? o}
            </label>
          ))}
        </div>
      ) : (
        <input
          id={id}
          type={field.type === "number" ? "number" : field.type === "date" ? "date" : field.type === "email" ? "email" : field.type === "tel" ? "tel" : "text"}
          className="input"
          value={value}
          placeholder={field.placeholder}
          onChange={(e) => onChange(field.name, e.target.value)}
        />
      )}

      {field.help && <p className="mt-1 text-xs text-ink-400">{field.help}</p>}
    </div>
  );
}

function Repeater({
  field,
  value,
  onChange,
}: {
  field: Field;
  value: Scope[];
  onChange: (v: Scope[]) => void;
}) {
  const t = useT();
  const items = Array.isArray(value) ? value : [];

  function addItem() {
    onChange([...items, {}]);
  }
  function removeItem(i: number) {
    onChange(items.filter((_, idx) => idx !== i));
  }
  function updateItem(i: number, name: string, val: any) {
    const next = items.map((it, idx) => (idx === i ? { ...it, [name]: val } : it));
    onChange(next);
  }

  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <span className="label mb-0">
          {field.label}
          {field.required && <span className="text-brand-600"> *</span>}
        </span>
      </div>
      {field.help && <p className="-mt-1 mb-3 text-xs text-ink-400">{field.help}</p>}

      <div className="space-y-4">
        {items.length === 0 && (
          <p className="rounded-lg border border-dashed border-ink-300 bg-ink-50 px-4 py-6 text-center text-sm text-ink-400">
            {t.form.noneAdded}
          </p>
        )}
        {items.map((item, i) => (
          <div key={i} className="rounded-xl border border-ink-200 bg-ink-50/50 p-4">
            <div className="mb-3 flex items-center justify-between">
              <span className="text-sm font-semibold text-ink-700">
                {field.itemLabel ?? t.form.item} {i + 1}
              </span>
              <button
                type="button"
                onClick={() => removeItem(i)}
                className="text-xs font-semibold text-brand-600 hover:underline"
              >
                {t.form.remove}
              </button>
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {field.fields?.map((sub) => (
                <div key={sub.name} className={sub.half ? "" : "sm:col-span-2"}>
                  <FormField
                    field={sub}
                    scope={item}
                    onChange={(name, val) => updateItem(i, name, val)}
                  />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      <button
        type="button"
        onClick={addItem}
        className="btn-secondary mt-4 w-full border-dashed"
      >
        + {fmt(t.form.addItem, { item: field.itemLabel ?? t.form.item })}
      </button>
    </div>
  );
}
