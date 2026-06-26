// Document categories applicants can upload. Labels are shown via a select;
// kept in English keys for storage, displayed as-is (AI + staff are language-agnostic).
export const DOCUMENT_CATEGORIES = [
  "Passport",
  "National ID",
  "Digital photo",
  "ECA report",
  "Language test results",
  "Employment reference letter",
  "Police certificate",
  "Medical exam confirmation",
  "Proof of funds",
  "Marriage certificate",
  "Divorce certificate",
  "Birth certificate",
  "Diploma / Transcript",
  "Business registration",
  "Tax return",
  "Other",
];

// =============================================================================
// Required-document checklist
// For each program we list the document categories an applicant must provide.
// For each category we list the key pieces of information the AI must find
// across ALL files uploaded for that category; completeness = how many were
// found. The applicant can upload multiple files per category and the AI
// assesses them together.
// =============================================================================

export interface DocRequirement {
  category: string; // must match a DOCUMENT_CATEGORIES value
  /** What the applicant should make sure is visible/included. */
  help: string;
  /** Key info the documents in this category must contain (drives completeness). */
  requiredInfo: string[];
}

const CATEGORY_REQUIREMENTS: Record<string, DocRequirement> = {
  Passport: {
    category: "Passport",
    help: "Upload the photo page showing all printed details and the machine-readable zone (the two lines of <<< at the bottom). Add extra pages if needed.",
    requiredInfo: [
      "Full name",
      "Passport number",
      "Issuing country",
      "Date of birth",
      "Expiry date",
      "Machine-readable zone (MRZ)",
    ],
  },
  "ECA report": {
    category: "ECA report",
    help: "Your Educational Credential Assessment from WES, ICAS, IQAS, CES or another approved organization, including the Canadian equivalency page.",
    requiredInfo: [
      "Issuing organization (WES/ICAS/IQAS/CES)",
      "Reference number",
      "Applicant name",
      "Canadian equivalency statement",
    ],
  },
  "Language test results": {
    category: "Language test results",
    help: "Your official IELTS, CELPIP, TEF or TCF result, showing all four skill scores and the report number.",
    requiredInfo: [
      "Test name (IELTS/CELPIP/TEF/TCF)",
      "Test report form number",
      "Listening score",
      "Reading score",
      "Writing score",
      "Speaking score",
      "Test date",
    ],
  },
  "Proof of funds": {
    category: "Proof of funds",
    help: "Recent official bank statement(s) or a bank letter showing your name and available balance. You can upload several statements together.",
    requiredInfo: [
      "Bank name",
      "Account holder name",
      "Account balance",
      "Statement date",
      "Currency",
    ],
  },
  "Marriage certificate": {
    category: "Marriage certificate",
    help: "Your official marriage certificate (or proof of common-law relationship) showing both names, the date and the registry details.",
    requiredInfo: [
      "Names of both spouses/partners",
      "Marriage or relationship date",
      "Issuing registry / authority",
      "Certificate number",
    ],
  },
};

const REQUIRED_DOCS_BY_PROGRAM: Record<string, string[]> = {
  EE: ["Passport", "ECA report", "Language test results", "Proof of funds"],
  PNP: ["Passport", "ECA report", "Language test results", "Proof of funds"],
  BUSINESS: ["Passport", "Proof of funds"],
  SPONSOR: ["Passport", "Marriage certificate"],
};

export function requiredDocsForProgram(code: string): DocRequirement[] {
  return (REQUIRED_DOCS_BY_PROGRAM[code] || [])
    .map((c) => CATEGORY_REQUIREMENTS[c])
    .filter(Boolean);
}

// Status thresholds (percent of required info found across a category's files).
export type DocCheckStatus = "green" | "yellow" | "red";
export function statusForCompleteness(pct: number): DocCheckStatus {
  if (pct >= 80) return "green";
  if (pct >= 50) return "yellow";
  return "red";
}
// An application may be submitted only when every required category is >= 50%.
export const MIN_SUBMIT_COMPLETENESS = 50;
