"use client";
import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard, Users, Shield, Building2, GitBranch, Layers,
  UserCircle, CheckCircle, ScrollText, Settings, ChevronDown, ChevronRight,
  Menu, X, Warehouse, Package, BarChart3, Truck, ClipboardList, Car, MapPin, AlertTriangle,
  Fuel, Receipt, TrendingDown, Wrench, PenTool, ShoppingCart, FileCheck, Handshake,
  Factory, FlaskConical, FileSearch, XCircle, SendHorizonal, Boxes, Landmark,
  BookOpen, ArrowRightLeft, CreditCard,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { usePermission } from "@/hooks/usePermission";
import { Button } from "@/components/ui/button";
import { CompanySwitcher } from "@/components/shared/CompanySwitcher";

interface NavItem {
  label: string;
  href?: string;
  icon: React.ReactNode;
  permission?: string;
  children?: NavItem[];
}

const NAV: NavItem[] = [
  {
    label: "Dashboard",
    href: "/",
    icon: <LayoutDashboard className="h-4 w-4" />,
  },
  {
    label: "Admin",
    icon: <Shield className="h-4 w-4" />,
    permission: "users:user:read",
    children: [
      { label: "Users", href: "/admin/users", icon: <Users className="h-4 w-4" />, permission: "users:user:read" },
      { label: "Roles", href: "/admin/roles", icon: <Shield className="h-4 w-4" />, permission: "roles:role:read" },
      { label: "Permissions", href: "/admin/permissions", icon: <Shield className="h-4 w-4" />, permission: "roles:role:read" },
    ],
  },
  {
    label: "Company",
    icon: <Building2 className="h-4 w-4" />,
    permission: "company:company:read",
    children: [
      { label: "Profile", href: "/company", icon: <Building2 className="h-4 w-4" />, permission: "company:company:read" },
      { label: "Companies", href: "/companies", icon: <Building2 className="h-4 w-4" />, permission: "company:company:read" },
      { label: "Branches", href: "/company/branches", icon: <GitBranch className="h-4 w-4" />, permission: "company:branch:read" },
      { label: "Departments", href: "/company/departments", icon: <Layers className="h-4 w-4" />, permission: "company:department:read" },
    ],
  },
  {
    label: "Employees",
    href: "/employees",
    icon: <UserCircle className="h-4 w-4" />,
    permission: "employees:employee:read",
  },
  {
    label: "Warehouse",
    icon: <Warehouse className="h-4 w-4" />,
    permission: "warehouse:warehouse:read",
    children: [
      { label: "Overview", href: "/warehouse", icon: <BarChart3 className="h-4 w-4" />, permission: "warehouse:stock:read" },
      { label: "Warehouses", href: "/warehouse/warehouses", icon: <Warehouse className="h-4 w-4" />, permission: "warehouse:warehouse:read" },
      { label: "Items", href: "/warehouse/items", icon: <Package className="h-4 w-4" />, permission: "warehouse:item:read" },
      { label: "Stock", href: "/warehouse/stock", icon: <BarChart3 className="h-4 w-4" />, permission: "warehouse:stock:read" },
      { label: "GRN", href: "/warehouse/grn", icon: <ClipboardList className="h-4 w-4" />, permission: "warehouse:grn:read" },
      { label: "Transfers", href: "/warehouse/transfers", icon: <Truck className="h-4 w-4" />, permission: "warehouse:transfer:read" },
      { label: "Adjustments", href: "/warehouse/adjustments", icon: <ClipboardList className="h-4 w-4" />, permission: "warehouse:adjustment:read" },
      { label: "Categories", href: "/warehouse/categories", icon: <Layers className="h-4 w-4" />, permission: "warehouse:category:read" },
      { label: "UOM", href: "/warehouse/uom", icon: <Layers className="h-4 w-4" />, permission: "warehouse:uom:read" },
    ],
  },
  {
    label: "Transport",
    icon: <Truck className="h-4 w-4" />,
    permission: "transport:vehicle:read",
    children: [
      { label: "Overview", href: "/transport", icon: <BarChart3 className="h-4 w-4" />, permission: "transport:trip:read" },
      { label: "Vehicles", href: "/transport/vehicles", icon: <Car className="h-4 w-4" />, permission: "transport:vehicle:read" },
      { label: "Drivers", href: "/transport/drivers", icon: <UserCircle className="h-4 w-4" />, permission: "transport:driver:read" },
      { label: "Assignments", href: "/transport/assignments", icon: <GitBranch className="h-4 w-4" />, permission: "transport:assignment:read" },
      { label: "Trips", href: "/transport/trips", icon: <MapPin className="h-4 w-4" />, permission: "transport:trip:read" },
      { label: "Incidents", href: "/transport/incidents", icon: <AlertTriangle className="h-4 w-4" />, permission: "transport:incident:read" },
    ],
  },
  {
    label: "Fuel",
    icon: <Fuel className="h-4 w-4" />,
    permission: "fuel:tank:read",
    children: [
      { label: "Overview", href: "/fuel", icon: <BarChart3 className="h-4 w-4" />, permission: "fuel:report:read" },
      { label: "Tanks", href: "/fuel/tanks", icon: <Fuel className="h-4 w-4" />, permission: "fuel:tank:read" },
      { label: "Receipts", href: "/fuel/receipts", icon: <Receipt className="h-4 w-4" />, permission: "fuel:receipt:read" },
      { label: "Issues", href: "/fuel/issues", icon: <TrendingDown className="h-4 w-4" />, permission: "fuel:issue:read" },
      { label: "Prices", href: "/fuel/prices", icon: <BarChart3 className="h-4 w-4" />, permission: "fuel:price:read" },
      { label: "Reports", href: "/fuel/reports", icon: <ClipboardList className="h-4 w-4" />, permission: "fuel:report:read" },
    ],
  },
  {
    label: "Maintenance",
    icon: <Wrench className="h-4 w-4" />,
    permission: "maintenance:workorder:read",
    children: [
      { label: "Overview", href: "/maintenance", icon: <BarChart3 className="h-4 w-4" />, permission: "maintenance:workorder:read" },
      { label: "Work Orders", href: "/maintenance/work-orders", icon: <ClipboardList className="h-4 w-4" />, permission: "maintenance:workorder:read" },
      { label: "Schedules", href: "/maintenance/schedules", icon: <PenTool className="h-4 w-4" />, permission: "maintenance:schedule:read" },
      { label: "Spare Parts", href: "/maintenance/parts", icon: <Package className="h-4 w-4" />, permission: "maintenance:part:read" },
      { label: "Parts Receipts", href: "/maintenance/receipts", icon: <Receipt className="h-4 w-4" />, permission: "maintenance:receipt:read" },
    ],
  },
  {
    label: "Procurement",
    icon: <ShoppingCart className="h-4 w-4" />,
    permission: "procurement:request:read",
    children: [
      { label: "Overview", href: "/procurement", icon: <BarChart3 className="h-4 w-4" />, permission: "procurement:report:read" },
      { label: "Suppliers", href: "/procurement/suppliers", icon: <Handshake className="h-4 w-4" />, permission: "procurement:supplier:read" },
      { label: "Requests", href: "/procurement/requests", icon: <FileCheck className="h-4 w-4" />, permission: "procurement:request:read" },
      { label: "Orders", href: "/procurement/orders", icon: <ShoppingCart className="h-4 w-4" />, permission: "procurement:order:read" },
    ],
  },
  {
    label: "Production",
    icon: <Factory className="h-4 w-4" />,
    permission: "production:batch:read",
    children: [
      { label: "Overview", href: "/production", icon: <BarChart3 className="h-4 w-4" />, permission: "production:report:read" },
      { label: "Batches", href: "/production/batches", icon: <ClipboardList className="h-4 w-4" />, permission: "production:batch:read" },
      { label: "Recipes", href: "/production/recipes", icon: <FlaskConical className="h-4 w-4" />, permission: "production:recipe:read" },
      { label: "Lines", href: "/production/lines", icon: <Factory className="h-4 w-4" />, permission: "production:line:read" },
      { label: "Daystore", href: "/production/daystore", icon: <Package className="h-4 w-4" />, permission: "production:batch:read" },
    ],
  },
  {
    label: "Quality Control",
    icon: <FlaskConical className="h-4 w-4" />,
    permission: "qc:test:read",
    children: [
      { label: "Overview", href: "/qc", icon: <BarChart3 className="h-4 w-4" />, permission: "qc:test:read" },
      { label: "Standards", href: "/qc/standards", icon: <FileCheck className="h-4 w-4" />, permission: "qc:standard:read" },
      { label: "Lab Tests", href: "/qc/tests", icon: <FileSearch className="h-4 w-4" />, permission: "qc:test:read" },
      { label: "Non-Conformances", href: "/qc/ncr", icon: <XCircle className="h-4 w-4" />, permission: "qc:ncr:read" },
    ],
  },
  {
    label: "Dispatch",
    icon: <SendHorizonal className="h-4 w-4" />,
    permission: "dispatch:order:read",
    children: [
      { label: "Overview", href: "/dispatch", icon: <BarChart3 className="h-4 w-4" />, permission: "dispatch:order:read" },
      { label: "Products", href: "/dispatch/products", icon: <Package className="h-4 w-4" />, permission: "dispatch:product:read" },
      { label: "Inventory", href: "/dispatch/inventory", icon: <Boxes className="h-4 w-4" />, permission: "dispatch:lot:read" },
      { label: "Dispatch Orders", href: "/dispatch/orders", icon: <SendHorizonal className="h-4 w-4" />, permission: "dispatch:order:read" },
    ],
  },
  {
    label: "Finance",
    icon: <Landmark className="h-4 w-4" />,
    permission: "finance:account:read",
    children: [
      { label: "Overview", href: "/finance", icon: <BarChart3 className="h-4 w-4" />, permission: "finance:report:read" },
      { label: "Chart of Accounts", href: "/finance/accounts", icon: <ScrollText className="h-4 w-4" />, permission: "finance:account:read" },
      { label: "Journal Entries", href: "/finance/journal-entries", icon: <FileCheck className="h-4 w-4" />, permission: "finance:journal:read" },
      { label: "Bank Accounts", href: "/finance/bank-accounts", icon: <Landmark className="h-4 w-4" />, permission: "finance:bank:read" },
      { label: "Payments", href: "/finance/payments", icon: <Receipt className="h-4 w-4" />, permission: "finance:payment:read" },
      { label: "Exchange Rates", href: "/finance/exchange-rates", icon: <TrendingDown className="h-4 w-4" />, permission: "finance:report:read" },
      { label: "Converter", href: "/finance/converter", icon: <ArrowRightLeft className="h-4 w-4" />, permission: "finance:report:read" },
      { label: "Day Book", href: "/finance/day-book", icon: <BookOpen className="h-4 w-4" />, permission: "finance:journal:read" },
      { label: "Outstanding", href: "/finance/outstanding", icon: <CreditCard className="h-4 w-4" />, permission: "finance:payment:read" },
      { label: "Reports", href: "/finance/reports", icon: <BarChart3 className="h-4 w-4" />, permission: "finance:report:read" },
    ],
  },
  {
    label: "Analytics",
    icon: <BarChart3 className="h-4 w-4" />,
    permission: "analytics:dashboard:read",
    children: [
      { label: "Dashboard", href: "/analytics", icon: <BarChart3 className="h-4 w-4" />, permission: "analytics:dashboard:read" },
      { label: "Operations", href: "/analytics/operations", icon: <Factory className="h-4 w-4" />, permission: "analytics:operations:read" },
      { label: "Financial", href: "/analytics/financial", icon: <Landmark className="h-4 w-4" />, permission: "analytics:financial:read" },
    ],
  },
  {
    label: "Reports",
    href: "/reports",
    icon: <ScrollText className="h-4 w-4" />,
    permission: "reports:report:read",
  },
  {
    label: "Approvals",
    href: "/approvals",
    icon: <CheckCircle className="h-4 w-4" />,
    permission: "approvals:request:read",
  },
  {
    label: "Audit Logs",
    href: "/audit-logs",
    icon: <ScrollText className="h-4 w-4" />,
    permission: "audit:log:read",
  },
  {
    label: "Settings",
    href: "/settings",
    icon: <Settings className="h-4 w-4" />,
    permission: "settings:settings:read",
  },
];

function NavLink({ item, depth = 0 }: { item: NavItem; depth?: number }) {
  const pathname = usePathname();
  const hasPermission = usePermission(item.permission ?? "");
  const [open, setOpen] = useState(() => {
    if (!item.children) return false;
    return item.children.some((c) => c.href && pathname.startsWith(c.href));
  });

  if (item.permission && !hasPermission) return null;

  if (item.children) {
    return (
      <div>
        <button
          onClick={() => setOpen((o) => !o)}
          className={cn(
            "w-full flex items-center justify-between gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors",
            "text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
            depth > 0 && "pl-8"
          )}
        >
          <span className="flex items-center gap-2">
            {item.icon}
            {item.label}
          </span>
          {open ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
        </button>
        {open && (
          <div className="mt-0.5 space-y-0.5">
            {item.children.map((child) => (
              <NavLink key={child.href ?? child.label} item={child} depth={depth + 1} />
            ))}
          </div>
        )}
      </div>
    );
  }

  const isActive = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href!);

  return (
    <Link
      href={item.href!}
      className={cn(
        "flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors",
        depth > 0 && "pl-8",
        isActive
          ? "bg-sidebar-primary text-sidebar-primary-foreground"
          : "text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
      )}
    >
      {item.icon}
      {item.label}
    </Link>
  );
}

interface SidebarProps {
  open: boolean;
  onClose: () => void;
}

export function Sidebar({ open, onClose }: SidebarProps) {
  return (
    <>
      {/* Mobile overlay */}
      {open && (
        <div
          className="fixed inset-0 z-40 bg-black/60 lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex w-60 flex-col bg-sidebar transition-transform duration-200 lg:static lg:translate-x-0",
          open ? "translate-x-0" : "-translate-x-full"
        )}
      >
        {/* Logo area */}
        <div className="flex h-14 items-center justify-between px-4 border-b border-sidebar-border">
          <span className="text-sidebar-foreground font-bold text-lg tracking-tight">
            {process.env.NEXT_PUBLIC_APP_NAME ?? "ERP"}
          </span>
          <button onClick={onClose} className="lg:hidden text-sidebar-foreground/60 hover:text-sidebar-foreground">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Company Switcher */}
        <CompanySwitcher />

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-0.5">
          {NAV.map((item) => (
            <NavLink key={item.href ?? item.label} item={item} />
          ))}
        </nav>

        {/* Footer */}
        <div className="px-4 py-3 border-t border-sidebar-border">
          <p className="text-xs text-sidebar-foreground/40">
            v{process.env.NEXT_PUBLIC_APP_VERSION ?? "1.0.0"}
          </p>
        </div>
      </aside>
    </>
  );
}
