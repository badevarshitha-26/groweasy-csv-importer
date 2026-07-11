"use client";

import { useMemo, useState } from "react";
import { formatContact, formatDate } from "@/lib/csv";
import type { CrmLead } from "@/types/crm";

const STATUS_STYLES: Record<string, string> = {
  SALE_DONE: "bg-blue-100 text-blue-800",
  GOOD_LEAD_FOLLOW_UP: "bg-emerald-100 text-emerald-800",
  DID_NOT_CONNECT: "bg-gray-100 text-gray-700",
  BAD_LEAD: "bg-rose-100 text-rose-800",
};

const STATUS_LABEL: Record<string, string> = {
  SALE_DONE: "Sale Done",
  GOOD_LEAD_FOLLOW_UP: "Good Lead",
  DID_NOT_CONNECT: "Not Dialed",
  BAD_LEAD: "Bad Lead",
};

interface Props {
  leads: CrmLead[];
  onImportCsv: () => void;
  onRefresh: () => void;
}

export function ManageLeadsView({ leads, onImportCsv, onRefresh }: Props) {
  const [query, setQuery] = useState("");
  const [visible, setVisible] = useState(25);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return leads;
    return leads.filter((l) => {
      const contact = formatContact(l).toLowerCase();
      return (
        (l.name || "").toLowerCase().includes(q) ||
        (l.email || "").toLowerCase().includes(q) ||
        contact.includes(q) ||
        (l.company || "").toLowerCase().includes(q)
      );
    });
  }, [leads, query]);

  const rows = filtered.slice(0, visible);

  return (
    <div className="animate-fade-up space-y-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-display text-2xl font-semibold tracking-tight text-gray-900">
            Manage Your Leads
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            CRM leads from AI CSV import — assignment sample data included by default
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center overflow-hidden rounded-lg border border-gray-200 bg-white">
            <input
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setVisible(25);
              }}
              placeholder="Search email or phone"
              className="w-48 px-3 py-2 text-sm outline-none sm:w-56"
            />
            <button
              type="button"
              className="border-l border-gray-200 px-3 py-2 text-gray-500 hover:bg-gray-50"
              aria-label="Search"
            >
              ⌕
            </button>
          </div>
          <button
            type="button"
            onClick={onRefresh}
            className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
          >
            Refresh
          </button>
          <button
            type="button"
            onClick={onImportCsv}
            className="rounded-lg bg-brand-orange px-3.5 py-2 text-sm font-medium text-white hover:bg-brand-orangeHover"
          >
            Import CSV
          </button>
        </div>
      </div>

      <div className="table-scroll max-h-[calc(100vh-220px)] overflow-auto rounded-xl border border-gray-200 bg-white shadow-sm">
        <table className="min-w-full border-collapse text-left text-sm">
          <thead>
            <tr>
              {[
                "Lead Name",
                "Email",
                "Contact",
                "Date Created",
                "Company",
                "Status",
                "City",
                "Quality / Source",
                "Actions",
              ].map((h) => (
                <th
                  key={h}
                  className="sticky-th whitespace-nowrap border-b border-gray-200 px-3 py-3 text-xs font-semibold uppercase tracking-wide text-gray-500"
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={9} className="px-3 py-12 text-center text-gray-500">
                  No leads yet. Import a CSV from Lead Sources.
                </td>
              </tr>
            ) : (
              rows.map((lead, i) => (
                <tr key={`${lead.email}-${i}`} className="odd:bg-white even:bg-gray-50/60">
                  <td className="whitespace-nowrap px-3 py-2.5 font-medium text-gray-900">
                    {lead.name || "—"}
                  </td>
                  <td className="whitespace-nowrap px-3 py-2.5 text-gray-700">
                    {lead.email || "—"}
                  </td>
                  <td className="whitespace-nowrap px-3 py-2.5 text-gray-700">
                    {formatContact(lead)}
                  </td>
                  <td className="whitespace-nowrap px-3 py-2.5 text-gray-600">
                    {formatDate(lead.created_at)}
                  </td>
                  <td className="whitespace-nowrap px-3 py-2.5 text-gray-700">
                    {lead.company || "—"}
                  </td>
                  <td className="whitespace-nowrap px-3 py-2.5">
                    {lead.crm_status ? (
                      <span
                        className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${
                          STATUS_STYLES[lead.crm_status] || "bg-gray-100 text-gray-700"
                        }`}
                      >
                        {STATUS_LABEL[lead.crm_status] || lead.crm_status}
                      </span>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td className="whitespace-nowrap px-3 py-2.5 text-gray-700">
                    {lead.city || "—"}
                  </td>
                  <td className="max-w-[180px] truncate px-3 py-2.5 text-gray-600">
                    {lead.data_source || lead.crm_note || "—"}
                  </td>
                  <td className="whitespace-nowrap px-3 py-2.5">
                    <button
                      type="button"
                      className="text-sm font-medium text-brand-teal hover:underline"
                    >
                      More &gt;
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {visible < filtered.length && (
        <div className="flex justify-center">
          <button
            type="button"
            onClick={() => setVisible((v) => v + 25)}
            className="rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Load more
          </button>
        </div>
      )}
    </div>
  );
}
