/**
 * Single source of truth for app navigation.
 *
 * The sidebar, the ⌘K command palette, breadcrumbs, and pinned/recent pages all
 * derive from this file. Add a page here once and it shows up everywhere.
 */
import {
  LayoutDashboard, Users, Shield, Building2, GitBranch, Layers,
  UserCircle, CheckCircle, ScrollText, Settings,
  Warehouse, Package, BarChart3, Truck, ClipboardList, Car, MapPin, AlertTriangle,
  Fuel, Receipt, TrendingDown, Wrench, PenTool, ShoppingCart, FileCheck, Handshake,
  Factory, FlaskConical, FileSearch, XCircle, SendHorizonal, Boxes, Landmark,
  BookOpen, ArrowRightLeft, CreditCard, TrendingUp, FileText, Key, Tag, MessageSquare,
  Leaf, BookMarked, LineChart, ListPlus, Droplets, TestTube, Beaker, Microscope,
  Wand2, Wallet, FolderUp,
  type LucideIcon,
} from "lucide-react";
import type { AuthUser } from "@/types/auth";
import { hasPermission } from "@/lib/permissions";

export interface NavItem {
  label: string;
  href?: string;
  external?: boolean;
  /** Full navigation in this tab (SSO launch). Skips target=_blank. */
  sameTab?: boolean;
  /** Only active on an exact pathname match (not for nested routes). */
  exact?: boolean;
  icon: LucideIcon;
  permission?: string;
  children?: NavItem[];
  /** Extra search terms for the command palette. */
  keywords?: string;
}

export interface NavGroup {
  label: string;
  items: NavItem[];
}

export const NAV_GROUPS: NavGroup[] = [
  {
    label: "Main Menu",
    items: [
      { label: "Dashboard", href: "/", exact: true, icon: LayoutDashboard, keywords: "home" },
      { label: "HR", href: "/api/sso/launch?app=hr", external: true, sameTab: true, icon: UserCircle, permission: "employees:employee:read", keywords: "atwork people payroll" },
      { label: "Approvals", href: "/approvals", icon: CheckCircle, permission: "approvals:request:read" },
    ],
  },
  {
    label: "Operations",
    items: [
      {
        label: "Warehouse",
        icon: Warehouse,
        permission: "warehouse:warehouse:read",
        children: [
          { label: "Overview", href: "/warehouse", icon: BarChart3, permission: "warehouse:stock:read" },
          { label: "Warehouses", href: "/warehouse/warehouses", icon: Warehouse, permission: "warehouse:warehouse:read" },
          { label: "Items", href: "/warehouse/items", icon: Package, permission: "warehouse:item:read", keywords: "item master sku" },
          { label: "Stock", href: "/warehouse/stock", icon: BarChart3, permission: "warehouse:stock:read", keywords: "balance inventory" },
          { label: "Goods Receipt (GRN)", href: "/warehouse/grn", icon: ClipboardList, permission: "warehouse:grn:read", keywords: "receive" },
          { label: "Store Issues", href: "/warehouse/store-issues", icon: ClipboardList, permission: "warehouse:issue:read" },
          { label: "Daily Store Report", href: "/warehouse/reports/daily-store", icon: BarChart3, permission: "warehouse:stock:read" },
          { label: "Transfers", href: "/warehouse/transfers", icon: Truck, permission: "warehouse:transfer:read" },
          { label: "Adjustments", href: "/warehouse/adjustments", icon: ClipboardList, permission: "warehouse:adjustment:read" },
          { label: "Categories", href: "/warehouse/categories", icon: Layers, permission: "warehouse:category:read" },
          { label: "Units (UOM)", href: "/warehouse/uom", icon: Layers, permission: "warehouse:uom:read" },
          { label: "Reports", href: "/warehouse/reports", icon: ClipboardList, permission: "warehouse:stock:read" },
        ],
      },
      {
        label: "Transport",
        icon: Truck,
        permission: "transport:vehicle:read",
        children: [
          { label: "Overview", href: "/transport", icon: BarChart3, permission: "transport:trip:read" },
          { label: "Vehicles", href: "/transport/vehicles", icon: Car, permission: "transport:vehicle:read", keywords: "fleet truck" },
          { label: "Drivers", href: "/transport/drivers", icon: UserCircle, permission: "transport:driver:read" },
          { label: "Assignments", href: "/transport/assignments", icon: GitBranch, permission: "transport:assignment:read" },
          { label: "Trips", href: "/transport/trips", icon: MapPin, permission: "transport:trip:read" },
          { label: "Incidents", href: "/transport/incidents", icon: AlertTriangle, permission: "transport:incident:read" },
          { label: "Daily Movement", href: "/transport/daily-movement", icon: FileText, permission: "transport:daily-movement:read" },
        ],
      },
      {
        label: "Fuel",
        icon: Fuel,
        permission: "fuel:tank:read",
        children: [
          { label: "Overview", href: "/fuel", icon: BarChart3, permission: "fuel:report:read" },
          { label: "Tanks", href: "/fuel/tanks", icon: Fuel, permission: "fuel:tank:read" },
          { label: "Receipts", href: "/fuel/receipts", icon: Receipt, permission: "fuel:receipt:read" },
          { label: "Issues", href: "/fuel/issues", icon: TrendingDown, permission: "fuel:issue:read" },
          { label: "Prices", href: "/fuel/prices", icon: BarChart3, permission: "fuel:price:read" },
          { label: "Reports", href: "/fuel/reports", icon: ClipboardList, permission: "fuel:report:read", keywords: "consumption" },
        ],
      },
      {
        label: "Maintenance",
        icon: Wrench,
        permission: "maintenance:workorder:read",
        children: [
          { label: "Overview", href: "/maintenance", icon: BarChart3, permission: "maintenance:workorder:read" },
          { label: "Work Orders", href: "/maintenance/work-orders", icon: ClipboardList, permission: "maintenance:workorder:read", keywords: "repair job" },
          { label: "Plant Assets", href: "/maintenance/plant-assets", icon: Factory, permission: "maintenance:workorder:read", keywords: "still tank filler boiler" },
          { label: "Schedules", href: "/maintenance/schedules", icon: PenTool, permission: "maintenance:schedule:read", keywords: "preventive service" },
          { label: "Spare Parts", href: "/maintenance/parts", icon: Package, permission: "maintenance:part:read" },
          { label: "Parts Receipts", href: "/maintenance/receipts", icon: Receipt, permission: "maintenance:receipt:read" },
        ],
      },
      {
        label: "Procurement",
        icon: ShoppingCart,
        permission: "procurement:request:read",
        children: [
          { label: "Overview", href: "/procurement", icon: BarChart3, permission: "procurement:report:read" },
          { label: "Suppliers", href: "/procurement/suppliers", icon: Handshake, permission: "procurement:supplier:read", keywords: "vendor" },
          { label: "Requests", href: "/procurement/requests", icon: FileCheck, permission: "procurement:request:read", keywords: "purchase request pr" },
          { label: "Orders", href: "/procurement/orders", icon: ShoppingCart, permission: "procurement:order:read", keywords: "purchase order po lpo" },
        ],
      },
      {
        label: "Production",
        icon: Factory,
        permission: "production:batch:read",
        children: [
          { label: "Overview", href: "/production", icon: BarChart3, permission: "production:report:read" },
          { label: "Batches", href: "/production/batches", icon: ClipboardList, permission: "production:batch:read" },
          { label: "Recipes", href: "/production/recipes", icon: FlaskConical, permission: "production:recipe:read", keywords: "bom bill of materials" },
          { label: "Lines", href: "/production/lines", icon: Factory, permission: "production:line:read" },
          { label: "Daystore", href: "/production/daystore", icon: Package, permission: "production:batch:read" },
          { label: "Daily Report", href: "/production/daily-report", icon: FileText, permission: "production:report:read" },
          { label: "Brew Sessions", href: "/production/brewing/sessions", icon: FlaskConical, permission: "brewing:session:read", keywords: "brewhouse wort" },
          { label: "Material Usage", href: "/production/brewing/material-usage", icon: Package, permission: "brewing:material:read" },
          { label: "CIP Records", href: "/production/brewing/cip", icon: Droplets, permission: "brewing:cip:read", keywords: "cleaning" },
        ],
      },
      {
        label: "Quality Control",
        icon: FlaskConical,
        permission: "qc:test:read",
        children: [
          { label: "Overview", href: "/qc", icon: BarChart3, permission: "qc:test:read" },
          { label: "Standards", href: "/qc/standards", icon: FileCheck, permission: "qc:standard:read" },
          { label: "Lab Tests", href: "/qc/tests", icon: FileSearch, permission: "qc:test:read" },
          { label: "Non-Conformances", href: "/qc/ncr", icon: XCircle, permission: "qc:ncr:read", keywords: "ncr" },
          { label: "Unitank Analysis", href: "/qc/lab/unitank", icon: TestTube, permission: "lab:unitank:read" },
          { label: "BBT Analysis", href: "/qc/lab/bbt", icon: Beaker, permission: "lab:bbt:read", keywords: "bright beer tank" },
          { label: "Micro Reports", href: "/qc/lab/micro", icon: Microscope, permission: "lab:micro:read", keywords: "microbiology" },
          { label: "Product Specs", href: "/qc/lab/specs", icon: ClipboardList, permission: "lab:spec:read" },
        ],
      },
      {
        label: "Dispatch",
        icon: SendHorizonal,
        permission: "dispatch:order:read",
        children: [
          { label: "Overview", href: "/dispatch", icon: BarChart3, permission: "dispatch:order:read" },
          { label: "Products", href: "/dispatch/products", icon: Package, permission: "dispatch:product:read", keywords: "finished goods fg" },
          { label: "Inventory", href: "/dispatch/inventory", icon: Boxes, permission: "dispatch:lot:read", keywords: "fg lots" },
          { label: "Dispatch Orders", href: "/dispatch/orders", icon: SendHorizonal, permission: "dispatch:order:read", keywords: "delivery" },
        ],
      },
      {
        label: "TRA Stamps",
        icon: Tag,
        permission: "tra-stamps:stamp:read",
        children: [
          { label: "Overview", href: "/tra-stamps", icon: BarChart3, permission: "tra-stamps:stamp:read" },
          { label: "Stamp Batches", href: "/tra-stamps/batches", icon: Package, permission: "tra-stamps:stamp:read", keywords: "excise" },
          { label: "Activations", href: "/tra-stamps/activations", icon: CheckCircle, permission: "tra-stamps:stamp:read" },
        ],
      },
      {
        label: "Cotton",
        icon: Leaf,
        permission: "cotton:lot:read",
        children: [
          { label: "Overview", href: "/cotton", icon: BarChart3, permission: "cotton:lot:read" },
          { label: "Seasons", href: "/cotton/seasons", icon: Tag, permission: "cotton:season:read" },
          { label: "Bales", href: "/cotton/bales", icon: Package, permission: "cotton:bale:read" },
          { label: "Lots", href: "/cotton/lots", icon: Layers, permission: "cotton:lot:read" },
          { label: "Buyers", href: "/cotton/buyers", icon: Handshake, permission: "cotton:buyer:read" },
          { label: "Contracts", href: "/cotton/contracts", icon: FileCheck, permission: "cotton:contract:read" },
          { label: "Invoices", href: "/cotton/invoices", icon: Receipt, permission: "cotton:invoice:read" },
        ],
      },
    ],
  },
  {
    label: "Sales",
    items: [
      { label: "Sales", href: "/api/sso/launch?app=sales", external: true, sameTab: true, icon: TrendingUp, keywords: "customers invoices" },
    ],
  },
  {
    label: "Finance",
    items: [
      {
        label: "Finance",
        icon: Landmark,
        permission: "finance:account:read",
        children: [
          { label: "Overview", href: "/finance", icon: BarChart3, permission: "finance:report:read" },
          { label: "Cashbook", href: "/finance/cashbook", icon: BookMarked, permission: "finance:cashbook:read", keywords: "petty cash" },
          { label: "Batch Entry", href: "/finance/cashbook/batch", icon: ListPlus, permission: "finance:cashbook:write" },
          { label: "Expense Summary", href: "/finance/cashbook/expense-summary", icon: FileText, permission: "finance:cashbook:read" },
          { label: "Daily Summary", href: "/finance/cashbook/summary", icon: FileText, permission: "finance:cashbook:read" },
          { label: "Director View", href: "/finance/cashbook/director", icon: LineChart, permission: "finance:cashbook:director" },
          { label: "Chart of Accounts", href: "/finance/accounts", icon: ScrollText, permission: "finance:account:read", keywords: "coa ledger" },
          { label: "Bank Accounts", href: "/finance/bank-accounts", icon: Landmark, permission: "finance:bank:read" },
          { label: "Currency Converter", href: "/finance/converter", icon: ArrowRightLeft, permission: "finance:report:read", keywords: "exchange rate fx" },
          { label: "Day Book", href: "/finance/day-book", icon: BookOpen, permission: "finance:journal:read" },
          { label: "Outstanding", href: "/finance/outstanding", icon: CreditCard, permission: "finance:payment:read", keywords: "receivable payable aging" },
          { label: "Reports", href: "/finance/reports", icon: BarChart3, permission: "finance:report:read", keywords: "trial balance p&l balance sheet" },
          { label: "Tally Sync", href: "/finance/tally", icon: ArrowRightLeft, permission: "finance:tally:read" },
        ],
      },
      {
        label: "Analytics",
        icon: BarChart3,
        permission: "analytics:dashboard:read",
        children: [
          { label: "Director home", href: "/analytics", icon: BarChart3, permission: "analytics:dashboard:read" },
          { label: "Ops home", href: "/analytics/operations", icon: Factory, permission: "analytics:operations:read" },
          { label: "Financial", href: "/analytics/financial", icon: Landmark, permission: "analytics:financial:read" },
        ],
      },
      { label: "Reports", href: "/reports", icon: ScrollText, permission: "reports:report:read" },
      { label: "Data Center", href: "/data-center", icon: FolderUp, permission: "data:upload:read", keywords: "upload files budget statutory returns licences documents" },
    ],
  },
  {
    label: "System",
    items: [
      {
        label: "Admin",
        icon: Shield,
        permission: "users:user:read",
        children: [
          { label: "Users", href: "/admin/users", icon: Users, permission: "users:user:read" },
          { label: "Roles", href: "/admin/roles", icon: Shield, permission: "roles:role:read" },
          { label: "Permissions", href: "/admin/permissions", icon: Shield, permission: "roles:role:read" },
        ],
      },
      {
        label: "Company",
        icon: Building2,
        permission: "company:company:read",
        children: [
          { label: "Profile", href: "/company", icon: Building2, permission: "company:company:read" },
          { label: "Companies", href: "/companies", icon: Building2, permission: "company:company:read" },
          { label: "Branches", href: "/company/branches", icon: GitBranch, permission: "company:branch:read" },
          { label: "Departments", href: "/company/departments", icon: Layers, permission: "company:department:read" },
        ],
      },
      { label: "Audit Logs", href: "/audit-logs", icon: ScrollText, permission: "audit:log:read" },
      {
        label: "Settings",
        icon: Settings,
        permission: "settings:settings:read",
        children: [
          { label: "Configuration", href: "/settings", icon: Settings, permission: "settings:settings:read" },
          { label: "Finance SMS", href: "/settings/finance-sms", icon: MessageSquare, permission: "settings:settings:read" },
          { label: "Manage Keys", href: "/settings/keys", icon: Key, permission: "settings:settings:update" },
        ],
      },
    ],
  },
];

/**
 * Pages reachable from ⌘K and breadcrumbs that deliberately aren't in the
 * sidebar (sub-flows or pages linked from overviews).
 */
const EXTRA_PAGES: (NavItem & { href: string; section: string })[] = [
  { label: "Employees", href: "/employees", section: "HR", icon: UserCircle, permission: "employees:employee:read" },
  { label: "CoA Setup Wizard", href: "/finance/accounts/setup", section: "Finance", icon: Wand2, permission: "finance:account:create" },
  { label: "Journal Entries", href: "/finance/journal-entries", section: "Finance", icon: BookOpen, permission: "finance:journal:read" },
  { label: "Payments", href: "/finance/payments", section: "Finance", icon: Wallet, permission: "finance:payment:read" },
];

/** A navigable leaf page, flattened with its section for display. */
export interface NavLeaf extends NavItem {
  href: string;
  /** Parent menu label (e.g. "Warehouse") or the group label for top-level items. */
  section: string;
  /** Human title that reads well out of context, e.g. "Warehouse · Overview". */
  title: string;
  /** False for palette-only pages that have no sidebar entry. */
  inSidebar: boolean;
}

function toLeaf(item: NavItem & { href: string }, section: string, parent?: NavItem, inSidebar = true): NavLeaf {
  // "Overview" / "Reports" are meaningless out of context — prefix the module.
  const ambiguous = parent && ["Overview", "Reports", "Profile", "Configuration"].includes(item.label);
  return { ...item, section, inSidebar, title: ambiguous ? `${parent!.label} · ${item.label}` : item.label };
}

function flatten(): NavLeaf[] {
  const out: NavLeaf[] = [];
  for (const group of NAV_GROUPS) {
    for (const item of group.items) {
      if (item.children) {
        for (const child of item.children) {
          if (child.href) out.push(toLeaf(child as NavItem & { href: string }, item.label, item));
        }
      } else if (item.href) {
        out.push(toLeaf(item as NavItem & { href: string }, group.label));
      }
    }
  }
  for (const { section, ...extra } of EXTRA_PAGES) out.push(toLeaf(extra, section, undefined, false));
  return out;
}

/** Every navigable page in the app, in sidebar order. */
export const NAV_LEAVES: NavLeaf[] = flatten();

const LEAF_BY_HREF = new Map(NAV_LEAVES.map((l) => [l.href, l]));

export function findLeaf(href: string): NavLeaf | undefined {
  return LEAF_BY_HREF.get(href);
}

export function canSee(user: AuthUser | null | undefined, item: Pick<NavItem, "permission">): boolean {
  if (!item.permission) return true;
  return !!user && hasPermission(user, item.permission);
}

function matches(pathname: string, item: Pick<NavItem, "href" | "exact" | "external">): boolean {
  if (!item.href || item.external) return false;
  if (item.href === "/" || item.exact) return pathname === item.href;
  return pathname === item.href || pathname.startsWith(item.href + "/");
}

/**
 * The single nav href that best represents `pathname` — the longest matching
 * prefix — so `/warehouse/items/123` highlights "Items", not also "Overview".
 */
export function resolveActiveHref(pathname: string, { sidebarOnly = false } = {}): string | null {
  let best: string | null = null;
  for (const leaf of NAV_LEAVES) {
    if (sidebarOnly && !leaf.inSidebar) continue;
    if (matches(pathname, leaf) && (!best || leaf.href.length > best.length)) best = leaf.href;
  }
  return best;
}
