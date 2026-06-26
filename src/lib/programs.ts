// =============================================================================
// Visa program form engine
// Field definitions are derived from the Canadian immigration checklist
// (Express Entry, Provincial Nominee Program, Family Sponsorship, Business).
// Forms are rendered dynamically from this data so new programs/fields can be
// added without changing the UI.
// =============================================================================

export type FieldType =
  | "text"
  | "textarea"
  | "date"
  | "number"
  | "email"
  | "tel"
  | "select"
  | "radio"
  | "checkbox" // boolean yes/no
  | "repeater";

export interface Field {
  name: string;
  label: string;
  type: FieldType;
  required?: boolean;
  options?: string[];
  /** Display-only translated labels aligned 1:1 with `options`. Values stay in
   * `options` (English) so stored data, validation and AI prompts are stable. */
  optionLabels?: string[];
  placeholder?: string;
  help?: string;
  half?: boolean; // render at half width on wide screens
  itemLabel?: string; // repeater: singular label e.g. "Credential"
  fields?: Field[]; // repeater: sub-fields
  showIf?: { field: string; in: string[] }; // simple conditional within same section
}

export interface Section {
  id: string;
  title: string;
  description?: string;
  fields: Field[];
}

export interface Program {
  code: "EE" | "PNP" | "SPONSOR" | "BUSINESS";
  name: string;
  tagline: string;
  blurb: string;
  estMinutes: number;
  icon: string; // emoji used in cards
  sections: Section[];
}

// ---- Reusable field groups --------------------------------------------------

const maritalStatus = [
  "Single",
  "Married",
  "Common-law",
  "Divorced",
  "Separated",
  "Widowed",
];

const credentialTypes = [
  "Diploma",
  "Bachelor's degree",
  "Master's degree",
  "Doctorate",
  "Trade certificate",
  "Other",
];

const ecaOrgs = [
  "World Education Services (WES)",
  "International Credential Assessment Service of Canada (ICAS)",
  "International Qualifications Assessment Service (IQAS)",
  "Comparative Education Service (CES)",
  "Other",
];

const educationRepeater: Field = {
  name: "education",
  label: "Education history",
  type: "repeater",
  itemLabel: "Credential",
  help: "Add each diploma, degree or certificate you have earned.",
  fields: [
    { name: "credentialType", label: "Type of credential", type: "select", options: credentialTypes, required: true, half: true },
    { name: "credentialAwarded", label: "Credential awarded", type: "text", placeholder: "e.g. B.Sc. Computer Science", half: true },
    { name: "institution", label: "Institution name", type: "text", required: true },
    { name: "country", label: "Country", type: "text", required: true, half: true },
    { name: "fieldOfStudy", label: "Field of study", type: "text", half: true },
    { name: "startDate", label: "Start date", type: "date", half: true },
    { name: "endDate", label: "End date", type: "date", half: true },
    { name: "hasEca", label: "Has an Educational Credential Assessment (ECA)?", type: "checkbox" },
    { name: "ecaOrg", label: "ECA organization", type: "select", options: ecaOrgs, half: true, showIf: { field: "hasEca", in: ["true"] } },
    { name: "ecaReportNumber", label: "ECA report number", type: "text", half: true, showIf: { field: "hasEca", in: ["true"] } },
    { name: "ecaIssueDate", label: "ECA issue date", type: "date", half: true, showIf: { field: "hasEca", in: ["true"] } },
    { name: "ecaEquivalency", label: "Canadian equivalency result", type: "text", half: true, showIf: { field: "hasEca", in: ["true"] } },
  ],
};

const languageSection: Section = {
  id: "language",
  title: "Language test results",
  description: "Your official English and (optionally) French test scores.",
  fields: [
    { name: "englishTest", label: "English test type", type: "select", options: ["IELTS General Training", "CELPIP General", "Not taken yet"], required: true, half: true },
    { name: "englishTestDate", label: "English test date", type: "date", half: true },
    { name: "englishReportNumber", label: "English test report number", type: "text", half: true },
    { name: "englishReading", label: "Reading score", type: "text", half: true },
    { name: "englishWriting", label: "Writing score", type: "text", half: true },
    { name: "englishListening", label: "Listening score", type: "text", half: true },
    { name: "englishSpeaking", label: "Speaking score", type: "text", half: true },
    { name: "hasFrench", label: "I have French test results (TEF/TCF Canada)", type: "checkbox" },
    { name: "frenchTest", label: "French test type", type: "select", options: ["TEF Canada", "TCF Canada"], half: true, showIf: { field: "hasFrench", in: ["true"] } },
    { name: "frenchTestDate", label: "French test date", type: "date", half: true, showIf: { field: "hasFrench", in: ["true"] } },
    { name: "frenchCertNumber", label: "French certificate number", type: "text", half: true, showIf: { field: "hasFrench", in: ["true"] } },
    { name: "frenchReading", label: "French — Reading", type: "text", half: true, showIf: { field: "hasFrench", in: ["true"] } },
    { name: "frenchWriting", label: "French — Writing", type: "text", half: true, showIf: { field: "hasFrench", in: ["true"] } },
    { name: "frenchListening", label: "French — Listening", type: "text", half: true, showIf: { field: "hasFrench", in: ["true"] } },
    { name: "frenchSpeaking", label: "French — Speaking", type: "text", half: true, showIf: { field: "hasFrench", in: ["true"] } },
  ],
};

const workHistoryRepeater: Field = {
  name: "workHistory",
  label: "Work history (last 10 years)",
  type: "repeater",
  itemLabel: "Job",
  help: "Add each job you held in the last 10 years.",
  fields: [
    { name: "jobTitle", label: "Job title", type: "text", required: true, half: true },
    { name: "employer", label: "Employer name", type: "text", required: true, half: true },
    { name: "country", label: "Country", type: "text", half: true },
    { name: "city", label: "City", type: "text", half: true },
    { name: "noc", label: "NOC occupation / code", type: "text", help: "National Occupational Classification", half: true },
    { name: "employmentType", label: "Employment type", type: "select", options: ["Full-time", "Part-time"], half: true },
    { name: "hoursPerWeek", label: "Hours per week", type: "number", half: true },
    { name: "salary", label: "Salary (annual)", type: "text", half: true },
    { name: "startDate", label: "Start date", type: "date", half: true },
    { name: "endDate", label: "End date", type: "date", half: true, showIf: { field: "isCurrent", in: ["false", ""] } },
    { name: "isCurrent", label: "This is my current job", type: "checkbox" },
    { name: "duties", label: "Main duties", type: "textarea", placeholder: "Describe your key responsibilities (used for reference letters)." },
  ],
};

const childrenRepeater: Field = {
  name: "children",
  label: "Dependent children",
  type: "repeater",
  itemLabel: "Child",
  fields: [
    { name: "fullName", label: "Full name", type: "text", required: true, half: true },
    { name: "dob", label: "Date of birth", type: "date", half: true },
    { name: "relationship", label: "Relationship", type: "text", half: true },
    { name: "country", label: "Country of residence", type: "text", half: true },
    { name: "custody", label: "Custody information (if applicable)", type: "text" },
  ],
};

const backgroundSection: Section = {
  id: "background",
  title: "Background declarations",
  description: "Answer honestly — these questions affect admissibility. Provide details where applicable.",
  fields: [
    { name: "hasCriminal", label: "Have you ever been convicted of a crime?", type: "checkbox" },
    { name: "criminalDetails", label: "Criminal conviction details", type: "textarea", showIf: { field: "hasCriminal", in: ["true"] } },
    { name: "hasCharges", label: "Do you have any pending charges?", type: "checkbox" },
    { name: "hasMilitary", label: "Have you performed military service?", type: "checkbox" },
    { name: "militaryDetails", label: "Military service details", type: "textarea", showIf: { field: "hasMilitary", in: ["true"] } },
    { name: "heldGovPosition", label: "Have you held a government or security-organization position?", type: "checkbox" },
    { name: "orgMembership", label: "Are/were you a member of any organization (political, social, etc.)?", type: "checkbox" },
    { name: "orgDetails", label: "Organization details", type: "textarea", showIf: { field: "orgMembership", in: ["true"] } },
  ],
};

const immigrationHistorySection: Section = {
  id: "immigration-history",
  title: "Travel & immigration history",
  fields: [
    { name: "prevCanadianVisa", label: "I have held previous Canadian visas/permits", type: "checkbox" },
    { name: "prevCanadianVisaDetails", label: "Details of previous Canadian visas/permits", type: "textarea", showIf: { field: "prevCanadianVisa", in: ["true"] } },
    { name: "prevApplications", label: "Previous immigration applications (any country)", type: "textarea" },
    { name: "refusedCanada", label: "I have been refused a visa/permit by Canada", type: "checkbox" },
    { name: "refusedCanadaDetails", label: "Canada refusal details", type: "textarea", showIf: { field: "refusedCanada", in: ["true"] } },
    { name: "refusedOther", label: "I have been refused by another country", type: "checkbox" },
    { name: "refusedOtherDetails", label: "Other refusal details", type: "textarea", showIf: { field: "refusedOther", in: ["true"] } },
    { name: "deported", label: "I have been deported or removed from any country", type: "checkbox" },
    { name: "deportedDetails", label: "Deportation/removal details", type: "textarea", showIf: { field: "deported", in: ["true"] } },
  ],
};

function personalSection(opts: { previousNames?: boolean } = {}): Section {
  return {
    id: "personal",
    title: "Personal details",
    description: "Your identity information, exactly as it appears on your passport.",
    fields: [
      { name: "familyName", label: "Family name (surname)", type: "text", required: true, half: true },
      { name: "givenName", label: "Given name(s)", type: "text", required: true, half: true },
      ...(opts.previousNames
        ? [{ name: "previousNames", label: "Previous names (if any)", type: "text" as const }]
        : []),
      { name: "dob", label: "Date of birth", type: "date", required: true, half: true },
      { name: "gender", label: "Gender", type: "select", options: ["Male", "Female", "Another gender", "Prefer not to say"], half: true },
      { name: "birthCity", label: "City of birth", type: "text", half: true },
      { name: "birthCountry", label: "Country of birth", type: "text", half: true },
      { name: "citizenship", label: "Country of citizenship", type: "text", required: true, half: true },
      { name: "additionalCitizenship", label: "Additional citizenship (if any)", type: "text", half: true },
      { name: "maritalStatus", label: "Marital status", type: "select", options: maritalStatus, required: true, half: true },
      { name: "uci", label: "UCI (Unique Client Identifier), if known", type: "text", half: true },
    ],
  };
}

const passportSection: Section = {
  id: "passport",
  title: "Passport",
  fields: [
    { name: "passportNumber", label: "Passport number", type: "text", required: true, half: true },
    { name: "passportCountry", label: "Country of issue", type: "text", required: true, half: true },
    { name: "passportIssue", label: "Issue date", type: "date", half: true },
    { name: "passportExpiry", label: "Expiry date", type: "date", half: true },
  ],
};

const contactSection: Section = {
  id: "contact",
  title: "Contact information",
  fields: [
    { name: "residenceCountry", label: "Current country of residence", type: "text", required: true, half: true },
    { name: "immigrationStatus", label: "Immigration status in current country", type: "text", half: true },
    { name: "address", label: "Residential address", type: "text" },
    { name: "mailingAddress", label: "Mailing address (if different)", type: "text" },
    { name: "city", label: "City", type: "text", half: true },
    { name: "province", label: "Province / State", type: "text", half: true },
    { name: "postalCode", label: "Postal code", type: "text", half: true },
    { name: "country", label: "Country", type: "text", half: true },
    { name: "phone", label: "Telephone number", type: "tel", required: true, half: true },
    { name: "email", label: "Email address", type: "email", required: true, half: true },
  ],
};

const fundsSection: Section = {
  id: "funds",
  title: "Settlement funds",
  description: "Funds available to support your settlement, in Canadian dollars (CAD).",
  fields: [
    { name: "totalFundsCad", label: "Total funds available (CAD)", type: "number", required: true, half: true },
    { name: "familySize", label: "Family size", type: "number", half: true },
    { name: "bankBalances", label: "Bank account balances", type: "textarea" },
    { name: "fixedDeposits", label: "Fixed deposits", type: "text", half: true },
    { name: "investments", label: "Investment accounts", type: "text", half: true },
  ],
};

const documentsSection: Section = {
  id: "documents",
  title: "Supporting documents",
  description:
    "Confirm which documents you can provide. After validation, our team will request secure uploads for each.",
  fields: [
    { name: "docPassport", label: "Passport", type: "checkbox", required: true },
    { name: "docPhoto", label: "Digital photo", type: "checkbox" },
    { name: "docEca", label: "ECA report", type: "checkbox", required: true },
    { name: "docLanguage", label: "Language test results", type: "checkbox", required: true },
    { name: "docReference", label: "Employment reference letters", type: "checkbox" },
    { name: "docPolice", label: "Police certificates", type: "checkbox" },
    { name: "docMedical", label: "Medical exam confirmation", type: "checkbox" },
    { name: "docFunds", label: "Proof of funds", type: "checkbox", required: true },
    { name: "docMarriage", label: "Marriage certificate (if applicable)", type: "checkbox" },
    { name: "docBirth", label: "Children's birth certificates (if applicable)", type: "checkbox" },
    { name: "docNotes", label: "Notes about your documents", type: "textarea" },
  ],
};

// ---- Programs ---------------------------------------------------------------

const expressEntry: Program = {
  code: "EE",
  name: "Express Entry",
  tagline: "Federal skilled worker, trades & Canadian experience",
  blurb:
    "For skilled workers such as engineers, programmers, analysts and accountants applying through FSWP, CEC or FSTP.",
  estMinutes: 30,
  icon: "🍁",
  sections: [
    personalSection(),
    passportSection,
    contactSection,
    {
      id: "eligibility",
      title: "Program eligibility",
      description: "Help us determine which federal program fits you best.",
      fields: [
        { name: "targetProgram", label: "Program you believe you qualify for", type: "select", options: ["Federal Skilled Worker (FSWP)", "Canadian Experience Class (CEC)", "Federal Skilled Trades (FSTP)", "Not sure — please advise"], required: true },
        { name: "skilledExperienceYears", label: "Years of skilled work experience", type: "number", half: true },
        { name: "hasCanadianExperience", label: "I have Canadian work experience", type: "checkbox", half: true },
      ],
    },
    { id: "education", title: "Education history", description: "Each credential, with ECA where available.", fields: [educationRepeater] },
    languageSection,
    { id: "work", title: "Work history", description: "Your employment over the last 10 years.", fields: [workHistoryRepeater] },
    {
      id: "canadian-experience",
      title: "Canadian work experience",
      description: "Complete only if you have worked in Canada.",
      fields: [
        { name: "hasCanadaWork", label: "I have worked in Canada", type: "checkbox" },
        { name: "caEmployer", label: "Employer name", type: "text", half: true, showIf: { field: "hasCanadaWork", in: ["true"] } },
        { name: "caOccupation", label: "Occupation", type: "text", half: true, showIf: { field: "hasCanadaWork", in: ["true"] } },
        { name: "caProvince", label: "Province", type: "text", half: true, showIf: { field: "hasCanadaWork", in: ["true"] } },
        { name: "caDates", label: "Dates worked", type: "text", half: true, showIf: { field: "hasCanadaWork", in: ["true"] } },
        { name: "caWorkPermit", label: "Work permit details", type: "text", showIf: { field: "hasCanadaWork", in: ["true"] } },
      ],
    },
    {
      id: "job-offer",
      title: "Job offer & provincial nomination",
      description: "Complete only if applicable.",
      fields: [
        { name: "hasJobOffer", label: "I have a Canadian job offer", type: "checkbox" },
        { name: "joEmployer", label: "Employer name", type: "text", half: true, showIf: { field: "hasJobOffer", in: ["true"] } },
        { name: "joOccupation", label: "Occupation", type: "text", half: true, showIf: { field: "hasJobOffer", in: ["true"] } },
        { name: "joNoc", label: "NOC code", type: "text", half: true, showIf: { field: "hasJobOffer", in: ["true"] } },
        { name: "joProvince", label: "Province", type: "text", half: true, showIf: { field: "hasJobOffer", in: ["true"] } },
        { name: "joLmia", label: "LMIA number (if applicable)", type: "text", half: true, showIf: { field: "hasJobOffer", in: ["true"] } },
        { name: "joStart", label: "Offer start date", type: "date", half: true, showIf: { field: "hasJobOffer", in: ["true"] } },
        { name: "hasNomination", label: "I have a provincial nomination", type: "checkbox" },
        { name: "nomProvince", label: "Nominating province", type: "text", half: true, showIf: { field: "hasNomination", in: ["true"] } },
        { name: "nomCertNumber", label: "Nomination certificate number", type: "text", half: true, showIf: { field: "hasNomination", in: ["true"] } },
        { name: "nomDate", label: "Nomination date", type: "date", half: true, showIf: { field: "hasNomination", in: ["true"] } },
      ],
    },
    {
      id: "family",
      title: "Family information",
      description: "Your spouse/partner and dependent children, if any.",
      fields: [
        { name: "spouseName", label: "Spouse / common-law partner full name", type: "text", half: true },
        { name: "spouseDob", label: "Spouse date of birth", type: "date", half: true },
        { name: "spouseCitizenship", label: "Spouse citizenship", type: "text", half: true },
        { name: "spouseEducation", label: "Spouse highest education", type: "text", half: true },
        { name: "spouseLanguage", label: "Spouse language test results", type: "text" },
        { name: "spouseCanadaWork", label: "Spouse Canadian work experience", type: "text" },
        childrenRepeater,
      ],
    },
    {
      id: "relatives",
      title: "Relatives in Canada",
      fields: [
        { name: "hasRelatives", label: "I have relatives who are Canadian citizens or permanent residents", type: "checkbox" },
        { name: "relRelationship", label: "Relationship", type: "text", half: true, showIf: { field: "hasRelatives", in: ["true"] } },
        { name: "relProvince", label: "Province of residence", type: "text", half: true, showIf: { field: "hasRelatives", in: ["true"] } },
        { name: "relStatus", label: "Status in Canada", type: "text", half: true, showIf: { field: "hasRelatives", in: ["true"] } },
      ],
    },
    fundsSection,
    immigrationHistorySection,
    backgroundSection,
    documentsSection,
  ],
};

const pnp: Program = {
  code: "PNP",
  name: "Provincial Nominee Program",
  tagline: "Nomination by a Canadian province",
  blurb:
    "For applicants nominated by a province such as Ontario, BC, Alberta, Saskatchewan or Manitoba.",
  estMinutes: 30,
  icon: "🏞️",
  sections: [
    personalSection({ previousNames: true }),
    passportSection,
    contactSection,
    {
      id: "family",
      title: "Family information",
      fields: [
        { name: "spouseName", label: "Spouse / common-law partner full name", type: "text", half: true },
        { name: "spouseDob", label: "Spouse date of birth", type: "date", half: true },
        { name: "spouseCitizenship", label: "Spouse citizenship", type: "text", half: true },
        { name: "spouseOccupation", label: "Spouse occupation", type: "text", half: true },
        { name: "spouseEducation", label: "Spouse education", type: "text" },
        childrenRepeater,
      ],
    },
    { id: "education", title: "Education", fields: [educationRepeater] },
    languageSection,
    { id: "work", title: "Employment history", fields: [workHistoryRepeater] },
    {
      id: "current-employment",
      title: "Current employment",
      fields: [
        { name: "currentEmployer", label: "Current employer", type: "text", half: true },
        { name: "currentPosition", label: "Position", type: "text", half: true },
        { name: "currentStatus", label: "Employment status", type: "select", options: ["Full-time", "Part-time", "Self-employed", "Unemployed"], half: true },
        { name: "supervisorInfo", label: "Supervisor information", type: "text", half: true },
      ],
    },
    {
      id: "intended-occupation",
      title: "Intended occupation in Canada",
      fields: [
        { name: "occupation", label: "Occupation", type: "text", required: true, half: true },
        { name: "nocCode", label: "NOC code", type: "text", half: true },
        { name: "industry", label: "Industry", type: "text", half: true },
        { name: "relevantExperience", label: "Relevant experience", type: "textarea" },
      ],
    },
    {
      id: "province-connection",
      title: "Connection to the province",
      fields: [
        { name: "province", label: "Province you are applying to", type: "select", options: ["Ontario (OINP)", "British Columbia (BC PNP)", "Alberta (AAIP)", "Saskatchewan (SINP)", "Manitoba (MPNP)", "Other"], required: true },
        { name: "prevWork", label: "Previous work in the province", type: "text" },
        { name: "prevStudy", label: "Previous study in the province", type: "text" },
        { name: "familyInProvince", label: "Family members living in the province", type: "text" },
        { name: "prevVisits", label: "Previous visits to the province", type: "text" },
      ],
    },
    {
      id: "job-offer",
      title: "Job offer information",
      description: "Complete only if you have an offer from a provincial employer.",
      fields: [
        { name: "hasJobOffer", label: "I have a job offer in the province", type: "checkbox" },
        { name: "joEmployer", label: "Employer name", type: "text", half: true, showIf: { field: "hasJobOffer", in: ["true"] } },
        { name: "joAddress", label: "Employer address", type: "text", showIf: { field: "hasJobOffer", in: ["true"] } },
        { name: "joOccupation", label: "Occupation", type: "text", half: true, showIf: { field: "hasJobOffer", in: ["true"] } },
        { name: "joWage", label: "Wage / salary", type: "text", half: true, showIf: { field: "hasJobOffer", in: ["true"] } },
        { name: "joHours", label: "Hours per week", type: "number", half: true, showIf: { field: "hasJobOffer", in: ["true"] } },
        { name: "joPermanent", label: "Permanent / full-time position", type: "checkbox", showIf: { field: "hasJobOffer", in: ["true"] } },
      ],
    },
    {
      id: "financial",
      title: "Financial information",
      fields: [
        { name: "settlementFunds", label: "Available settlement funds (CAD)", type: "number", half: true },
        { name: "bankBalances", label: "Bank account balances", type: "text", half: true },
        { name: "investments", label: "Investments", type: "text", half: true },
        { name: "assetsLiabilities", label: "Assets and liabilities", type: "textarea" },
      ],
    },
    immigrationHistorySection,
    backgroundSection,
    {
      id: "settlement-plan",
      title: "Settlement plan",
      fields: [
        { name: "whyProvince", label: "Why did you choose this province?", type: "textarea" },
        { name: "whereLive", label: "Where do you plan to live?", type: "text" },
        { name: "employmentPlans", label: "Employment plans", type: "textarea" },
        { name: "housingPlans", label: "Housing plans", type: "text" },
        { name: "supportNetwork", label: "Family / support network", type: "text" },
      ],
    },
    documentsSection,
  ],
};

const sponsor: Program = {
  code: "SPONSOR",
  name: "Family Sponsorship",
  tagline: "Sponsor a spouse, partner, child, parent or grandparent",
  blurb:
    "For Canadian citizens or permanent residents sponsoring a close family member.",
  estMinutes: 35,
  icon: "👨‍👩‍👧",
  sections: [
    {
      id: "sponsorship-type",
      title: "Who are you sponsoring?",
      fields: [
        { name: "sponsorshipType", label: "Relationship to the person being sponsored", type: "radio", options: ["Spouse / common-law partner", "Dependent child", "Parent / grandparent"], required: true },
      ],
    },
    {
      id: "sponsor-info",
      title: "Sponsor information",
      description: "Details about you, the sponsor.",
      fields: [
        { name: "sponsorFullName", label: "Full legal name", type: "text", required: true, half: true },
        { name: "sponsorDob", label: "Date of birth", type: "date", half: true },
        { name: "sponsorBirthPlace", label: "Place of birth", type: "text", half: true },
        { name: "sponsorGender", label: "Gender", type: "select", options: ["Male", "Female", "Another gender", "Prefer not to say"], half: true },
        { name: "sponsorMarital", label: "Marital status", type: "select", options: maritalStatus, half: true },
        { name: "sponsorStatus", label: "Canadian status", type: "select", options: ["Canadian citizen", "Permanent resident"], required: true, half: true },
        { name: "sponsorUci", label: "UCI (if known)", type: "text", half: true },
        { name: "sponsorAddress", label: "Residential address", type: "text" },
        { name: "sponsorPhone", label: "Telephone number", type: "tel", half: true },
        { name: "sponsorEmail", label: "Email address", type: "email", half: true },
        { name: "sponsorEmployer", label: "Current employer", type: "text", half: true },
        { name: "sponsorOccupation", label: "Occupation", type: "text", half: true },
        { name: "sponsorIncome", label: "Annual income (CAD)", type: "number", half: true },
        { name: "sponsorSocialAssistance", label: "I have received social assistance", type: "checkbox", half: true },
        { name: "prevSponsorship", label: "Previous sponsorship applications / undertakings", type: "textarea" },
      ],
    },
    {
      id: "pa-personal",
      title: "Principal applicant (person being sponsored)",
      fields: [
        { name: "paFullName", label: "Full legal name", type: "text", required: true, half: true },
        { name: "paPreviousNames", label: "Previous names used", type: "text", half: true },
        { name: "paDob", label: "Date of birth", type: "date", half: true },
        { name: "paBirthPlace", label: "Place of birth", type: "text", half: true },
        { name: "paCitizenship", label: "Citizenship", type: "text", half: true },
        { name: "paResidence", label: "Current country of residence", type: "text", half: true },
        { name: "paMarital", label: "Marital status", type: "select", options: maritalStatus, half: true },
        { name: "paPassportNumber", label: "Passport number", type: "text", half: true },
        { name: "paPassportCountry", label: "Passport country of issue", type: "text", half: true },
        { name: "paPassportExpiry", label: "Passport expiry date", type: "date", half: true },
        { name: "paAddress", label: "Address", type: "text" },
        { name: "paPhone", label: "Phone number", type: "tel", half: true },
        { name: "paEmail", label: "Email address", type: "email", half: true },
      ],
    },
    {
      id: "relationship",
      title: "Relationship information",
      description: "Mainly required for spouse / common-law partner sponsorship.",
      fields: [
        { name: "relStart", label: "Date relationship began", type: "date", half: true },
        { name: "marriageDate", label: "Date of marriage (if married)", type: "date", half: true },
        { name: "cohabitationDate", label: "Date cohabitation began (if common-law)", type: "date", half: true },
        { name: "howMet", label: "Details of how you met", type: "textarea" },
        { name: "relHistory", label: "History of the relationship", type: "textarea" },
        { name: "weddingDetails", label: "Engagement / wedding details", type: "textarea" },
        { name: "communicationHistory", label: "Communication history", type: "text" },
        { name: "travelTogether", label: "Travel history together", type: "text" },
      ],
    },
    {
      id: "relationship-evidence",
      title: "Evidence of relationship",
      description: "Tick the supporting evidence you can provide.",
      fields: [
        { name: "evMarriageCert", label: "Marriage certificate", type: "checkbox" },
        { name: "evPhotos", label: "Photos together", type: "checkbox" },
        { name: "evTravel", label: "Travel records", type: "checkbox" },
        { name: "evJointBank", label: "Joint bank accounts", type: "checkbox" },
        { name: "evJointLease", label: "Joint leases or mortgages", type: "checkbox" },
        { name: "evInsurance", label: "Insurance policies naming each other", type: "checkbox" },
        { name: "evCorrespondence", label: "Correspondence and messages", type: "checkbox" },
        { name: "evAffidavits", label: "Affidavits / letters from friends and family", type: "checkbox" },
      ],
    },
    {
      id: "children",
      title: "Children & family members",
      fields: [childrenRepeater],
    },
    {
      id: "address-history",
      title: "Address & personal history",
      description: "Last 10 years, with no gaps in the timeline.",
      fields: [
        {
          name: "addressHistory",
          label: "Address history",
          type: "repeater",
          itemLabel: "Address",
          fields: [
            { name: "address", label: "Complete address", type: "text", required: true },
            { name: "city", label: "City", type: "text", half: true },
            { name: "country", label: "Country", type: "text", half: true },
            { name: "fromDate", label: "From", type: "date", half: true },
            { name: "toDate", label: "To", type: "date", half: true },
          ],
        },
        {
          name: "personalHistory",
          label: "Personal history (employment, education, unemployment, travel)",
          type: "repeater",
          itemLabel: "Activity",
          fields: [
            { name: "activity", label: "Activity", type: "select", options: ["Employment", "Education", "Unemployment", "Military service", "Travel"], half: true },
            { name: "description", label: "Description", type: "text", half: true },
            { name: "fromDate", label: "From", type: "date", half: true },
            { name: "toDate", label: "To", type: "date", half: true },
          ],
        },
      ],
    },
    immigrationHistorySection,
    backgroundSection,
    {
      id: "documents",
      title: "Supporting documents",
      fields: [
        { name: "docPassports", label: "Passports", type: "checkbox", required: true },
        { name: "docBirth", label: "Birth certificates", type: "checkbox" },
        { name: "docMarriage", label: "Marriage certificate (if applicable)", type: "checkbox" },
        { name: "docDivorce", label: "Divorce certificates (if applicable)", type: "checkbox" },
        { name: "docPolice", label: "Police certificates", type: "checkbox" },
        { name: "docPhotos", label: "Digital photos", type: "checkbox" },
        { name: "docRelationship", label: "Proof of relationship", type: "checkbox", required: true },
        { name: "docMedical", label: "Medical examination results", type: "checkbox" },
        { name: "docNotes", label: "Notes about your documents", type: "textarea" },
      ],
    },
  ],
};

const business: Program = {
  code: "BUSINESS",
  name: "Business / Start-Up Visa",
  tagline: "Entrepreneur, investor & start-up founders",
  blurb:
    "For entrepreneurs and innovators — including Canada's Start-Up Visa for technology founders.",
  estMinutes: 40,
  icon: "💼",
  sections: [
    personalSection(),
    passportSection,
    contactSection,
    {
      id: "family",
      title: "Family information",
      fields: [
        { name: "spouseName", label: "Spouse / common-law partner full name", type: "text", half: true },
        { name: "spouseDob", label: "Spouse date of birth", type: "date", half: true },
        { name: "spouseCitizenship", label: "Spouse citizenship", type: "text", half: true },
        { name: "spouseOccupation", label: "Spouse occupation", type: "text", half: true },
        childrenRepeater,
      ],
    },
    { id: "education", title: "Education", fields: [educationRepeater] },
    languageSection,
    {
      id: "business-history",
      title: "Business ownership history",
      fields: [
        {
          name: "businesses",
          label: "Businesses owned",
          type: "repeater",
          itemLabel: "Business",
          fields: [
            { name: "name", label: "Business name", type: "text", required: true, half: true },
            { name: "industry", label: "Industry", type: "text", half: true },
            { name: "country", label: "Country", type: "text", half: true },
            { name: "ownership", label: "Ownership percentage", type: "number", half: true },
            { name: "startDate", label: "Start date", type: "date", half: true },
            { name: "endDate", label: "End date", type: "date", half: true },
            { name: "employees", label: "Number of employees", type: "number", half: true },
            { name: "revenue", label: "Annual revenue", type: "text", half: true },
            { name: "netProfit", label: "Net profit", type: "text", half: true },
            { name: "registration", label: "Business registration details", type: "text" },
          ],
        },
      ],
    },
    {
      id: "management",
      title: "Senior management experience",
      description: "Complete if applying based on executive experience.",
      fields: [
        { name: "mgmtCompany", label: "Company name", type: "text", half: true },
        { name: "mgmtPosition", label: "Position held", type: "text", half: true },
        { name: "mgmtReports", label: "Number of employees supervised", type: "number", half: true },
        { name: "mgmtBudget", label: "Budget responsibility", type: "text", half: true },
        { name: "mgmtDates", label: "Employment dates", type: "text", half: true },
        { name: "mgmtAuthority", label: "Decision-making authority", type: "textarea" },
      ],
    },
    {
      id: "net-worth",
      title: "Net worth information",
      description: "Provide a summary of your assets and liabilities.",
      fields: [
        { name: "assetsCash", label: "Cash and bank accounts", type: "text", half: true },
        { name: "assetsInvestments", label: "Investments / stocks / bonds", type: "text", half: true },
        { name: "assetsBusiness", label: "Businesses owned (value)", type: "text", half: true },
        { name: "assetsRealEstate", label: "Real estate", type: "text", half: true },
        { name: "assetsOther", label: "Other valuable assets", type: "text", half: true },
        { name: "liabMortgages", label: "Mortgages", type: "text", half: true },
        { name: "liabLoans", label: "Loans", type: "text", half: true },
        { name: "liabOther", label: "Credit card / business debts", type: "text", half: true },
        { name: "netWorthTotal", label: "Estimated total net worth (CAD)", type: "number", half: true },
      ],
    },
    {
      id: "source-of-funds",
      title: "Source of funds",
      description: "Explain how your wealth was acquired.",
      fields: [
        { name: "fundSources", label: "Sources of wealth", type: "checkbox" },
        { name: "sourceEmployment", label: "Employment income", type: "checkbox", half: true },
        { name: "sourceBusiness", label: "Business income / sale of a business", type: "checkbox", half: true },
        { name: "sourceInvestments", label: "Investments", type: "checkbox", half: true },
        { name: "sourceInheritance", label: "Inheritance / gifts", type: "checkbox", half: true },
        { name: "sourceProperty", label: "Property sales", type: "checkbox", half: true },
        { name: "sourceExplanation", label: "Explanation of source of funds", type: "textarea" },
      ],
    },
    {
      id: "proposed-business",
      title: "Proposed business in Canada",
      fields: [
        { name: "bizName", label: "Business name (if known)", type: "text", half: true },
        { name: "bizIndustry", label: "Industry", type: "text", half: true },
        { name: "bizProducts", label: "Products or services", type: "textarea" },
        { name: "bizMarket", label: "Target market", type: "text", half: true },
        { name: "bizLocation", label: "Business location", type: "text", half: true },
        { name: "bizEmployees", label: "Number of employees expected", type: "number", half: true },
        { name: "bizInvestment", label: "Amount to be invested (CAD)", type: "number", half: true },
        { name: "bizOwnership", label: "Ownership percentage", type: "number", half: true },
      ],
    },
    {
      id: "startup",
      title: "Start-Up Visa details",
      description: "Complete only if applying through the Start-Up Visa stream.",
      fields: [
        { name: "isStartup", label: "I am applying through the Start-Up Visa stream", type: "checkbox" },
        { name: "innovativeIdea", label: "Innovative business idea", type: "textarea", showIf: { field: "isStartup", in: ["true"] } },
        { name: "designatedOrg", label: "Designated organization support", type: "text", showIf: { field: "isStartup", in: ["true"] } },
        { name: "commitmentCert", label: "Commitment certificate obtained", type: "checkbox", showIf: { field: "isStartup", in: ["true"] } },
      ],
    },
    immigrationHistorySection,
    backgroundSection,
    {
      id: "documents",
      title: "Supporting documents",
      fields: [
        { name: "docPassport", label: "Passports", type: "checkbox", required: true },
        { name: "docBizReg", label: "Business registration documents", type: "checkbox" },
        { name: "docCorpTax", label: "Corporate tax returns", type: "checkbox" },
        { name: "docPersonalTax", label: "Personal tax returns", type: "checkbox" },
        { name: "docFinancials", label: "Audited financial statements", type: "checkbox" },
        { name: "docBank", label: "Bank statements (proof of funds)", type: "checkbox", required: true },
        { name: "docProperty", label: "Property ownership records", type: "checkbox" },
        { name: "docNetWorth", label: "Net worth verification report", type: "checkbox" },
        { name: "docPolice", label: "Police certificates", type: "checkbox" },
        { name: "docNotes", label: "Notes about your documents", type: "textarea" },
      ],
    },
  ],
};

export const PROGRAMS: Program[] = [expressEntry, pnp, sponsor, business];

export function getProgram(code: string): Program | undefined {
  return PROGRAMS.find((p) => p.code === code);
}

export const PROGRAM_NAMES: Record<string, string> = Object.fromEntries(
  PROGRAMS.map((p) => [p.code, p.name])
);
