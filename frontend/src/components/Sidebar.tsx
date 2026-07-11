"use client";

interface NavItemProps {
  label: string;
  active?: boolean;
  onClick?: () => void;
}

function NavItem({ label, active, onClick }: NavItemProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm transition ${
        active
          ? "bg-[#3d4f4c] text-[#7dceb8] font-medium"
          : "text-gray-300 hover:bg-brand-sidebarHover hover:text-white"
      }`}
    >
      <span
        className={`h-1.5 w-1.5 rounded-full ${active ? "bg-[#7dceb8]" : "bg-gray-500"}`}
      />
      {label}
    </button>
  );
}

export type AppPage = "lead-sources" | "manage-leads";

interface Props {
  activePage: AppPage;
  onNavigate: (page: AppPage) => void;
}

export function Sidebar({ activePage, onNavigate }: Props) {
  return (
    <aside className="flex h-full w-[240px] shrink-0 flex-col bg-brand-sidebar text-white">
      <div className="border-b border-white/10 px-5 py-5">
        <div className="font-display text-xl font-semibold tracking-tight">
          Grow<span className="text-brand-orange">Easy</span>
        </div>
        <div className="mt-4 flex items-center gap-3 rounded-lg bg-white/5 px-3 py-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-orange/90 text-sm font-semibold text-white">
            VK
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-medium">VK Test</p>
            <p className="text-[11px] uppercase tracking-wide text-gray-400">Owner</p>
          </div>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-4">
        <p className="mb-2 px-3 text-[10px] font-semibold uppercase tracking-[0.14em] text-gray-500">
          Main
        </p>
        <div className="space-y-0.5">
          <NavItem label="Dashboard" />
          <NavItem label="Generate Leads" />
          <NavItem
            label="Manage Leads"
            active={activePage === "manage-leads"}
            onClick={() => onNavigate("manage-leads")}
          />
          <NavItem label="Engage Leads" />
        </div>

        <p className="mb-2 mt-6 px-3 text-[10px] font-semibold uppercase tracking-[0.14em] text-gray-500">
          Control Center
        </p>
        <div className="space-y-0.5">
          <NavItem label="Team Members" />
          <NavItem
            label="Lead Sources"
            active={activePage === "lead-sources"}
            onClick={() => onNavigate("lead-sources")}
          />
          <NavItem label="Ad Accounts" />
          <NavItem label="WhatsApp Account" />
          <NavItem label="Tele Calling" />
          <NavItem label="CRM Fields" />
          <NavItem label="API Center" />
        </div>
      </nav>
    </aside>
  );
}
