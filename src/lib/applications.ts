import { getProgram, type Section } from "./programs";

export function generateReference() {
  const year = new Date().getFullYear();
  const rand = Math.random().toString(36).slice(2, 7).toUpperCase();
  return `MV-${year}-${rand}`;
}

// Returns the list of required field names (incl. nested repeater handling note)
// that are still empty for a given application's data, grouped by section.
export function validateApplication(
  program: string,
  data: Record<string, any>
): { sectionId: string; sectionTitle: string; missing: string[] }[] {
  const prog = getProgram(program);
  if (!prog) return [];
  const issues: { sectionId: string; sectionTitle: string; missing: string[] }[] = [];

  for (const section of prog.sections) {
    const missing = missingInSection(section, data);
    if (missing.length) {
      issues.push({ sectionId: section.id, sectionTitle: section.title, missing });
    }
  }
  return issues;
}

function isEmpty(v: any) {
  return v === undefined || v === null || v === "" || (Array.isArray(v) && v.length === 0);
}

function missingInSection(section: Section, data: Record<string, any>): string[] {
  const missing: string[] = [];
  for (const field of section.fields) {
    if (field.type === "repeater") {
      // required repeaters: at least one item; per-item required handled lightly
      if (field.required && isEmpty(data[field.name])) {
        missing.push(field.label);
      }
      continue;
    }
    // conditional fields only required if condition met
    if (field.showIf) {
      const dep = String(data[field.showIf.field] ?? "");
      if (!field.showIf.in.includes(dep)) continue;
    }
    if (field.required && isEmpty(data[field.name])) {
      missing.push(field.label);
    }
  }
  return missing;
}
