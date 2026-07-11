import type { CrmLead, ImportResult } from "@/types/crm";

const LEADS_KEY = "groweasy_manage_leads";
const LAST_IMPORT_KEY = "groweasy_last_import";

/** Assignment sample CRM records (exact fields from GrowEasy brief). */
export const SAMPLE_CRM_LEADS: CrmLead[] = [
  {
    created_at: "2026-05-13 14:20:48",
    name: "John Doe",
    email: "john.doe@example.com",
    country_code: "+91",
    mobile_without_country_code: "9876543210",
    company: "GrowEasy",
    city: "Mumbai",
    state: "Maharashtra",
    country: "India",
    lead_owner: "test@gmail.com",
    crm_status: "GOOD_LEAD_FOLLOW_UP",
    crm_note: "Client is asking to reschedule demo",
    data_source: "",
    possession_time: null,
    description: null,
  },
  {
    created_at: "2026-05-13 14:25:30",
    name: "Sarah Johnson",
    email: "sarah.johnson@example.com",
    country_code: "+91",
    mobile_without_country_code: "9876543211",
    company: "Tech Solutions",
    city: "Bangalore",
    state: "Karnataka",
    country: "India",
    lead_owner: "test@gmail.com",
    crm_status: "DID_NOT_CONNECT",
    crm_note: "Person was busy, will try again next week",
    data_source: "",
    possession_time: null,
    description: null,
  },
  {
    created_at: "2026-05-13 14:30:15",
    name: "Rajesh Patel",
    email: "rajesh.patel@example.com",
    country_code: "+91",
    mobile_without_country_code: "9876543212",
    company: "Startup Inc",
    city: "Delhi",
    state: "Delhi",
    country: "India",
    lead_owner: "test@gmail.com",
    crm_status: "BAD_LEAD",
    crm_note: "Not interested in our services",
    data_source: "",
    possession_time: null,
    description: null,
  },
  {
    created_at: "2026-05-13 14:35:22",
    name: "Priya Singh",
    email: "priya.singh@example.com",
    country_code: "+91",
    mobile_without_country_code: "9876543213",
    company: "Enterprise Corp",
    city: "Pune",
    state: "Maharashtra",
    country: "India",
    lead_owner: "test@gmail.com",
    crm_status: "SALE_DONE",
    crm_note: "Deal closed, onboarding in progress",
    data_source: "",
    possession_time: null,
    description: null,
  },
];

export function loadLeads(): CrmLead[] {
  if (typeof window === "undefined") return SAMPLE_CRM_LEADS;
  try {
    const raw = localStorage.getItem(LEADS_KEY);
    if (!raw) {
      localStorage.setItem(LEADS_KEY, JSON.stringify(SAMPLE_CRM_LEADS));
      return SAMPLE_CRM_LEADS;
    }
    const parsed = JSON.parse(raw) as CrmLead[];
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : SAMPLE_CRM_LEADS;
  } catch {
    return SAMPLE_CRM_LEADS;
  }
}

export function saveImportedLeads(imported: CrmLead[]): CrmLead[] {
  const existing = loadLeads();
  // Newest imports first; avoid exact email+mobile duplicates
  const keyOf = (l: CrmLead) =>
    `${(l.email || "").toLowerCase()}|${l.mobile_without_country_code || ""}`;
  const seen = new Set(imported.map(keyOf));
  const merged = [
    ...imported,
    ...existing.filter((l) => !seen.has(keyOf(l))),
  ];
  localStorage.setItem(LEADS_KEY, JSON.stringify(merged));
  return merged;
}

export function saveLastImport(result: ImportResult): void {
  localStorage.setItem(LAST_IMPORT_KEY, JSON.stringify(result));
}

export function loadLastImport(): ImportResult | null {
  try {
    const raw = localStorage.getItem(LAST_IMPORT_KEY);
    return raw ? (JSON.parse(raw) as ImportResult) : null;
  } catch {
    return null;
  }
}
