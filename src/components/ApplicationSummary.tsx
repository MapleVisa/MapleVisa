import { type Field } from "@/lib/programs";
import { localizeProgram } from "@/lib/i18n/programs";
import { getDictionary, getLocale } from "@/i18n";
import type { Dictionary } from "@/i18n/dictionaries/en";

function optionLabel(field: Field, value: string) {
  const i = field.options?.indexOf(value) ?? -1;
  return (i >= 0 && field.optionLabels?.[i]) || value;
}

function display(field: Field, value: any, t: Dictionary): string {
  if (value === undefined || value === null || value === "") return "—";
  if (field.type === "checkbox") return value === true || value === "true" ? t.common.yes : t.common.no;
  if ((field.type === "select" || field.type === "radio") && typeof value === "string") {
    return optionLabel(field, value);
  }
  return String(value);
}

function fieldVisible(field: Field, scope: Record<string, any>) {
  if (!field.showIf) return true;
  const dep = String(scope[field.showIf.field] ?? "");
  return field.showIf.in.includes(dep);
}

export default async function ApplicationSummary({
  program,
  data,
}: {
  program: string;
  data: Record<string, any>;
}) {
  const locale = await getLocale();
  const [prog, t] = await Promise.all([localizeProgram(program, locale), getDictionary(locale)]);
  if (!prog) return null;

  return (
    <div className="space-y-6">
      {prog.sections.map((section) => (
        <div key={section.id} className="card p-6">
          <h3 className="text-base font-bold text-ink-900">{section.title}</h3>
          <dl className="mt-4 grid grid-cols-1 gap-x-8 gap-y-3 sm:grid-cols-2">
            {section.fields.map((field) => {
              if (!fieldVisible(field, data)) return null;

              if (field.type === "repeater") {
                const items: Record<string, any>[] = Array.isArray(data[field.name])
                  ? data[field.name]
                  : [];
                return (
                  <div key={field.name} className="sm:col-span-2">
                    <dt className="text-xs font-semibold uppercase tracking-wide text-ink-400">
                      {field.label}
                    </dt>
                    {items.length === 0 ? (
                      <dd className="mt-1 text-sm text-ink-400">{t.common.none}</dd>
                    ) : (
                      <dd className="mt-2 space-y-3">
                        {items.map((item, i) => (
                          <div key={i} className="rounded-lg border border-ink-200 bg-ink-50/50 p-3">
                            <p className="mb-1 text-xs font-semibold text-ink-500">
                              {field.itemLabel ?? t.form.item} {i + 1}
                            </p>
                            <div className="grid grid-cols-1 gap-x-6 gap-y-1 sm:grid-cols-2">
                              {field.fields?.map((sub) =>
                                fieldVisible(sub, item) ? (
                                  <div key={sub.name} className="text-sm">
                                    <span className="text-ink-400">{sub.label}: </span>
                                    <span className="text-ink-800">{display(sub, item[sub.name], t)}</span>
                                  </div>
                                ) : null
                              )}
                            </div>
                          </div>
                        ))}
                      </dd>
                    )}
                  </div>
                );
              }

              return (
                <div key={field.name} className={field.type === "textarea" ? "sm:col-span-2" : ""}>
                  <dt className="text-xs font-medium text-ink-400">{field.label}</dt>
                  <dd className="mt-0.5 text-sm text-ink-800">{display(field, data[field.name], t)}</dd>
                </div>
              );
            })}
          </dl>
        </div>
      ))}
    </div>
  );
}
