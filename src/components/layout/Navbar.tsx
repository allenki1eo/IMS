"use client";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { useTheme } from "next-themes";
import { Menu, PanelLeftClose, PanelLeftOpen, Search, Sun, Moon, Inbox } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SyncStatusIndicator } from "./SyncStatusIndicator";
import { CommandPalette } from "./CommandPalette";
import { NotificationBell } from "./NotificationBell";
import { cn } from "@/lib/utils";

const SEGMENT_LABELS: Record<string, string> = {
  "": "Dashboard",
  admin: "Admin",
  users: "Users",
  roles: "Roles",
  permissions: "Permissions",
  company: "Company",
  companies: "Companies",
  branches: "Branches",
  departments: "Departments",
  employees: "Employees",
  warehouse: "Warehouse",
  warehouses: "Warehouses",
  items: "Items",
  stock: "Stock",
  grn: "GRN",
  transfers: "Transfers",
  adjustments: "Adjustments",
  categories: "Categories",
  uom: "UOM",
  transport: "Transport",
  vehicles: "Vehicles",
  drivers: "Drivers",
  assignments: "Assignments",
  trips: "Trips",
  incidents: "Incidents",
  fuel: "Fuel",
  tanks: "Tanks",
  receipts: "Receipts",
  issues: "Issues",
  prices: "Prices",
  reports: "Reports",
  maintenance: "Maintenance",
  "work-orders": "Work Orders",
  schedules: "Schedules",
  parts: "Spare Parts",
  procurement: "Procurement",
  suppliers: "Suppliers",
  requests: "Requests",
  orders: "Orders",
  production: "Production",
  batches: "Batches",
  recipes: "Recipes",
  lines: "Lines",
  daystore: "Daystore",
  qc: "Quality Control",
  standards: "Standards",
  tests: "Lab Tests",
  ncr: "Non-Conformances",
  dispatch: "Dispatch",
  inventory: "Inventory",
  products: "Products",
  finance: "Finance",
  accounts: "Chart of Accounts",
  "journal-entries": "Journal Entries",
  "bank-accounts": "Bank Accounts",
  payments: "Payments",
  "exchange-rates": "Exchange Rates",
  converter: "Converter",
  "day-book": "Day Book",
  outstanding: "Outstanding",
  analytics: "Analytics",
  operations: "Operations",
  financial: "Financial",
  approvals: "Approvals",
  workflows: "Workflows",
  "audit-logs": "Audit Logs",
  settings: "Settings",
  profile: "Profile",
  security: "Security",
  create: "New",
};

function useBreadcrumbs() {
  const pathname = usePathname();
  const segments = pathname.split("/").filter(Boolean);

  if (segments.length === 0) return [{ label: "Dashboard", href: "/" }];

  const crumbs = [{ label: "Dashboard", href: "/" }];
  let path = "";

  for (const seg of segments) {
    path += `/${seg}`;
    const label = SEGMENT_LABELS[seg];
    if (label && !/^[0-9a-f-]{20,}$/.test(seg)) {
      crumbs.push({ label, href: path });
    } else if (/^[0-9a-f-]{20,}$/.test(seg)) {
      crumbs.push({ label: "Detail", href: path });
    }
  }

  return crumbs.slice(-3);
}

interface NavbarProps {
  onMenuToggle: () => void;
  onCollapseToggle: () => void;
  collapsed: boolean;
}

export function Navbar({ onMenuToggle, onCollapseToggle, collapsed }: NavbarProps) {
  const [cmdOpen, setCmdOpen] = useState(false);
  const { theme, setTheme } = useTheme();
  const breadcrumbs = useBreadcrumbs();

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setCmdOpen((o) => !o);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  return (
    <>
      <header className="h-14 border-b bg-background flex items-center justify-between px-4 gap-4 sticky top-0 z-30">
        {/* Left: toggle + breadcrumb */}
        <div className="flex items-center gap-2 min-w-0">
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden h-8 w-8 shrink-0"
            onClick={onMenuToggle}
          >
            <Menu className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="hidden lg:flex h-8 w-8 shrink-0"
            onClick={onCollapseToggle}
            title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {collapsed ? (
              <PanelLeftOpen className="h-4 w-4" />
            ) : (
              <PanelLeftClose className="h-4 w-4" />
            )}
          </Button>

          {/* Breadcrumb */}
          <nav className="hidden sm:flex items-center gap-1 text-sm min-w-0">
            {breadcrumbs.map((crumb, i) => (
              <span key={crumb.href} className="flex items-center gap-1 min-w-0">
                {i > 0 && <span className="text-muted-foreground/40 shrink-0">/</span>}
                <span
                  className={cn(
                    "truncate",
                    i === breadcrumbs.length - 1
                      ? "text-foreground font-medium"
                      : "text-muted-foreground"
                  )}
                >
                  {crumb.label}
                </span>
              </span>
            ))}
          </nav>
        </div>

        {/* Right: search + icons */}
        <div className="flex items-center gap-2 shrink-0">
          {/* Search */}
          <button
            onClick={() => setCmdOpen(true)}
            className="hidden md:flex items-center gap-2 h-8 px-3 rounded-md border border-input bg-muted/40 text-sm text-muted-foreground hover:bg-muted transition-colors"
          >
            <Search className="h-3.5 w-3.5" />
            <span>Search...</span>
            <span className="ml-2 flex items-center gap-0.5">
              <kbd className="text-[10px] border rounded px-1 py-0.5 font-mono bg-background">⌘</kbd>
              <kbd className="text-[10px] border rounded px-1 py-0.5 font-mono bg-background">K</kbd>
            </span>
          </button>

          {/* Mobile search icon */}
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden h-8 w-8"
            onClick={() => setCmdOpen(true)}
          >
            <Search className="h-4 w-4" />
          </Button>

          {/* Sync status */}
          <SyncStatusIndicator />

          {/* Dark mode toggle */}
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            title={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
          >
            {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </Button>

          {/* Notifications */}
          <NotificationBell />

          {/* Messages */}
          <Button variant="ghost" size="icon" className="h-8 w-8">
            <Inbox className="h-4 w-4" />
          </Button>
        </div>
      </header>

      <CommandPalette open={cmdOpen} onClose={() => setCmdOpen(false)} />
    </>
  );
}
