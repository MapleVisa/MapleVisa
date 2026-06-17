export type AppStatus =
  | "DRAFT"
  | "SUBMITTED"
  | "UNDER_REVIEW"
  | "NEEDS_INFO"
  | "VALIDATED"
  | "WITH_LAWYER"
  | "IN_PROCESSING"
  | "APPROVED"
  | "REJECTED"
  | "WITHDRAWN";

export const STATUS_META: Record<
  AppStatus,
  { label: string; color: string; description: string }
> = {
  DRAFT: {
    label: "Draft",
    color: "bg-ink-100 text-ink-700",
    description: "Not yet submitted. You can keep editing.",
  },
  SUBMITTED: {
    label: "Submitted",
    color: "bg-blue-100 text-blue-700",
    description: "Received. Awaiting review by our case team.",
  },
  UNDER_REVIEW: {
    label: "Under review",
    color: "bg-amber-100 text-amber-700",
    description: "A case officer is reviewing your application.",
  },
  NEEDS_INFO: {
    label: "Needs more info",
    color: "bg-orange-100 text-orange-700",
    description: "We need additional information from you.",
  },
  VALIDATED: {
    label: "Validated",
    color: "bg-emerald-100 text-emerald-700",
    description: "Your application passed validation.",
  },
  WITH_LAWYER: {
    label: "With lawyer",
    color: "bg-violet-100 text-violet-700",
    description: "Assigned to an immigration lawyer for processing.",
  },
  IN_PROCESSING: {
    label: "In processing",
    color: "bg-indigo-100 text-indigo-700",
    description: "Your case is being processed with the authorities.",
  },
  APPROVED: {
    label: "Approved",
    color: "bg-green-100 text-green-700",
    description: "Congratulations — your case has been approved.",
  },
  REJECTED: {
    label: "Closed / Rejected",
    color: "bg-red-100 text-red-700",
    description: "This application was closed.",
  },
  WITHDRAWN: {
    label: "Withdrawn",
    color: "bg-ink-100 text-ink-500",
    description: "You withdrew this application.",
  },
};

// Statuses an applicant can no longer act on.
const TERMINAL: AppStatus[] = ["APPROVED", "REJECTED", "WITHDRAWN"];

// An applicant may withdraw any submitted application that hasn't reached a
// terminal state. Drafts are deleted instead, not withdrawn.
export function canWithdraw(status: string): boolean {
  return status !== "DRAFT" && !TERMINAL.includes(status as AppStatus);
}

// Ordered pipeline for the progress tracker shown to applicants.
export const PIPELINE: AppStatus[] = [
  "SUBMITTED",
  "UNDER_REVIEW",
  "VALIDATED",
  "WITH_LAWYER",
  "IN_PROCESSING",
  "APPROVED",
];
