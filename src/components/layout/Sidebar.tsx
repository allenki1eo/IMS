"use client";
import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard, Users, Shield, Building2, GitBranch, Layers,
  UserCircle, CheckCircle, ScrollText, Settings, ChevronDown,
  X, Warehouse, Package, BarChart3, Truck, ClipboardList, Car, MapPin, AlertTriangle,
  Fuel, Receipt, TrendingDown, Wrench, PenTool, ShoppingCart, FileCheck, Handshake,
  Factory, FlaskConical, FileSearch, XCircle, SendHorizonal, Boxes, Landmark,
  BookOpen, ArrowRightLeft, CreditCard, LogOut, User, Lock,
  TrendingUp, ShoppingBag, UserCheck, Target, FileText, ExternalLink, Key, Tag,
  Leaf, BookMarked, LineChart, ListPlus, Droplets, TestTube, Beaker, Microscope,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { usePermission } from "@/hooks/usePermission";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { getInitials } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { CompanySwitcher } from "@/components/shared/CompanySwitcher";

interface NavItem {
  label: string;
  href?: string;
  external?: boolean;
  exact?: boolean;
  icon: React.ReactNode;
  permission?: string;
  children?: NavItem[];
}

interface NavGroup {
  label: string;
  items: NavItem[];
}

const NAV_GROUPS: NavGroup[] = [
  {
    label: "Main Menu",
    items: [
      { label: "Dashboard", href: "/", icon: <LayoutDashboard className="h-4 w-4" /> },
      { label: "HR", href: "https://atwork.eastafricanspirit.co.tz", external: true, icon: <UserCircle className="h-4 w-4" />, permission: "employees:employee:read" },
      { label: "Approvals", href: "/approvals", icon: <CheckCircle className="h-4 w-4" />, permission: "approvals:request:read" },
    ],
  },
  {
    label: "Operations",
    items: [
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
          { label: "Store Issues", href: "/warehouse/store-issues", icon: <ClipboardList className="h-4 w-4" />, permission: "warehouse:issue:read" },
          { label: "Daily Store Report", href: "/warehouse/reports/daily-store", icon: <BarChart3 className="h-4 w-4" />, permission: "warehouse:stock:read" },
          { label: "Transfers", href: "/warehouse/transfers", icon: <Truck className="h-4 w-4" />, permission: "warehouse:transfer:read" },
          { label: "Adjustments", href: "/warehouse/adjustments", icon: <ClipboardList className="h-4 w-4" />, permission: "warehouse:adjustment:read" },
          { label: "Categories", href: "/warehouse/categories", icon: <Layers className="h-4 w-4" />, permission: "warehouse:category:read" },
          { label: "UOM", href: "/warehouse/uom", icon: <Layers className="h-4 w-4" />, permission: "warehouse:uom:read" },
          { label: "Reports", href: "/warehouse/reports", icon: <ClipboardList className="h-4 w-4" />, permission: "warehouse:stock:read" },
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
          { label: "Daily Movement", href: "/transport/daily-movement", icon: <FileText className="h-4 w-4" />, permission: "transport:daily-movement:read" },
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
          { label: "Daily Report", href: "/production/daily-report", icon: <FileText className="h-4 w-4" />, permission: "production:report:read" },
          { label: "Brew Sessions", href: "/production/brewing/sessions", icon: <FlaskConical className="h-4 w-4" />, permission: "brewing:session:read" },
          { label: "Material Usage", href: "/production/brewing/material-usage", icon: <Package className="h-4 w-4" />, permission: "brewing:material:read" },
          { label: "CIP Records", href: "/production/brewing/cip", icon: <Droplets className="h-4 w-4" />, permission: "brewing:cip:read" },
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
          { label: "Unitank Analysis", href: "/qc/lab/unitank", icon: <TestTube className="h-4 w-4" />, permission: "lab:unitank:read" },
          { label: "BBT Analysis", href: "/qc/lab/bbt", icon: <Beaker className="h-4 w-4" />, permission: "lab:bbt:read" },
          { label: "Micro Reports", href: "/qc/lab/micro", icon: <Microscope className="h-4 w-4" />, permission: "lab:micro:read" },
          { label: "Product Specs", href: "/qc/lab/specs", icon: <ClipboardList className="h-4 w-4" />, permission: "lab:spec:read" },
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
        label: "TRA Stamps",
        icon: <Tag className="h-4 w-4" />,
        permission: "tra-stamps:stamp:read",
        children: [
          { label: "Overview", href: "/tra-stamps", icon: <BarChart3 className="h-4 w-4" />, permission: "tra-stamps:stamp:read" },
          { label: "Stamp Batches", href: "/tra-stamps/batches", icon: <Package className="h-4 w-4" />, permission: "tra-stamps:stamp:read" },
          { label: "Activations", href: "/tra-stamps/activations", icon: <CheckCircle className="h-4 w-4" />, permission: "tra-stamps:stamp:read" },
        ],
      },
      {
        label: "Cotton",
        icon: <Leaf className="h-4 w-4" />,
        permission: "cotton:lot:read",
        children: [
          { label: "Overview", href: "/cotton", icon: <BarChart3 className="h-4 w-4" />, permission: "cotton:lot:read" },
          { label: "Seasons", href: "/cotton/seasons", icon: <Tag className="h-4 w-4" />, permission: "cotton:season:read" },
          { label: "Bales", href: "/cotton/bales", icon: <Package className="h-4 w-4" />, permission: "cotton:bale:read" },
          { label: "Lots", href: "/cotton/lots", icon: <Layers className="h-4 w-4" />, permission: "cotton:lot:read" },
          { label: "Buyers", href: "/cotton/buyers", icon: <Handshake className="h-4 w-4" />, permission: "cotton:buyer:read" },
          { label: "Contracts", href: "/cotton/contracts", icon: <FileCheck className="h-4 w-4" />, permission: "cotton:contract:read" },
          { label: "Invoices", href: "/cotton/invoices", icon: <Receipt className="h-4 w-4" />, permission: "cotton:invoice:read" },
        ],
      },
    ],
  },
  {
    label: "Sales",
    items: [
      { label: "Sales", href: "https://sales.eastafricanspirit.co.tz", external: true, icon: <TrendingUp className="h-4 w-4" /> },
    ],
  },
  {
    label: "Finance",
    items: [
      {
        label: "Finance",
        icon: <Landmark className="h-4 w-4" />,
        permission: "finance:account:read",
        children: [
          { label: "Overview", href: "/finance", icon: <BarChart3 className="h-4 w-4" />, permission: "finance:report:read" },
          { label: "Cashbook", href: "/finance/cashbook", icon: <BookMarked className="h-4 w-4" />, permission: "finance:cashbook:read" },
          { label: "Batch Entry", href: "/finance/cashbook/batch", icon: <ListPlus className="h-4 w-4" />, permission: "finance:cashbook:write" },
          { label: "Expense Summary", href: "/finance/cashbook/expense-summary", icon: <FileText className="h-4 w-4" />, permission: "finance:cashbook:read" },
          { label: "Daily Summary", href: "/finance/cashbook/summary", icon: <FileText className="h-4 w-4" />, permission: "finance:cashbook:read" },
          { label: "Director View", href: "/finance/cashbook/director", icon: <LineChart className="h-4 w-4" />, permission: "finance:cashbook:director" },
          { label: "Chart of Accounts", href: "/finance/accounts", icon: <ScrollText className="h-4 w-4" />, permission: "finance:account:read" },
          { label: "Bank Accounts", href: "/finance/bank-accounts", icon: <Landmark className="h-4 w-4" />, permission: "finance:bank:read" },
          { label: "Currency Converter", href: "/finance/converter", icon: <ArrowRightLeft className="h-4 w-4" />, permission: "finance:report:read" },
          { label: "Day Book", href: "/finance/day-book", icon: <BookOpen className="h-4 w-4" />, permission: "finance:journal:read" },
          { label: "Outstanding", href: "/finance/outstanding", icon: <CreditCard className="h-4 w-4" />, permission: "finance:payment:read" },
          { label: "Reports", href: "/finance/reports", icon: <BarChart3 className="h-4 w-4" />, permission: "finance:report:read" },
          { label: "Tally Sync", href: "/finance/tally", icon: <ArrowRightLeft className="h-4 w-4" />, permission: "finance:tally:read" },
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
      { label: "Reports", href: "/reports", icon: <ScrollText className="h-4 w-4" />, permission: "reports:report:read" },
    ],
  },
  {
    label: "System",
    items: [
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
      { label: "Audit Logs", href: "/audit-logs", icon: <ScrollText className="h-4 w-4" />, permission: "audit:log:read" },
      {
        label: "Settings",
        icon: <Settings className="h-4 w-4" />,
        permission: "settings:settings:read",
        children: [
          { label: "Configuration", href: "/settings", exact: true, icon: <Settings className="h-4 w-4" />, permission: "settings:settings:read" },
          { label: "Manage Keys", href: "/settings/keys", icon: <Key className="h-4 w-4" />, permission: "settings:settings:update" },
        ],
      },
    ],
  },
];

function NavLink({ item, depth = 0, collapsed }: { item: NavItem; depth?: number; collapsed?: boolean }) {
  const pathname = usePathname();
  const hasPermission = usePermission(item.permission ?? "");
  const [open, setOpen] = useState(() => {
    if (!item.children) return false;
    return item.children.some((c) => c.href && pathname.startsWith(c.href));
  });
  const [flyoutOpen, setFlyoutOpen] = useState(false);

  if (item.permission && !hasPermission) return null;

  if (item.children) {
    if (collapsed) {
      return (
        <div
          className="relative"
          onMouseEnter={() => setFlyoutOpen(true)}
          onMouseLeave={() => setFlyoutOpen(false)}
        >
          <button
            className="w-full flex items-center justify-center p-2 rounded-md text-sidebar-foreground/60 hover:bg-sidebar-accent hover:text-sidebar-foreground transition-colors"
            title={item.label}
          >
            {item.icon}
          </button>
          {flyoutOpen && (
            <div className="absolute left-full top-0 ml-2 w-52 bg-popover border border-border rounded-lg shadow-lg py-1.5 z-50">
              <div className="px-3 py-1 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground border-b border-border mb-1">
                {item.label}
              </div>
              {item.children.map((child) => (
                <NavLink key={child.href ?? child.label} item={child} depth={0} />
              ))}
            </div>
          )}
        </div>
      );
    }

    const isGroupActive = item.children.some((c) => c.href && pathname.startsWith(c.href));

    return (
      <div>
        <button
          onClick={() => setOpen((o) => !o)}
          className={cn(
            "w-full flex items-center justify-between gap-2 px-3 py-2 rounded-md text-sm transition-colors",
            depth > 0 && "pl-8",
            isGroupActive
              ? "text-sidebar-foreground font-medium"
              : "text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent"
          )}
        >
          <span className="flex items-center gap-2.5">
            {item.icon}
            {item.label}
          </span>
          <ChevronDown className={cn("h-3.5 w-3.5 transition-transform duration-200", open && "rotate-180")} />
        </button>
        {open && (
          <div className="mt-0.5 ml-3 pl-3 border-l border-sidebar-border space-y-0.5">
            {item.children.map((child) => (
              <NavLink key={child.href ?? child.label} item={child} depth={depth + 1} />
            ))}
          </div>
        )}
      </div>
    );
  }

  const isActive = !item.external && (
    item.href === "/" ? pathname === "/" :
    item.href ? (item.exact ? pathname === item.href : pathname.startsWith(item.href)) :
    false
  );

  if (item.external) {
    if (collapsed) {
      return (
        <a
          href={item.href}
          target="_blank"
          rel="noopener noreferrer"
          title={item.label}
          className="flex items-center justify-center p-2 rounded-md transition-colors text-sidebar-foreground/60 hover:bg-sidebar-accent hover:text-sidebar-foreground"
        >
          {item.icon}
        </a>
      );
    }
    return (
      <a
        href={item.href}
        target="_blank"
        rel="noopener noreferrer"
        className={cn(
          "flex items-center gap-2.5 px-3 py-2 rounded-md text-sm transition-colors",
          depth > 0 && "pl-2",
          "text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent"
        )}
      >
        {item.icon}
        {item.label}
        <ExternalLink className="h-3 w-3 ml-auto opacity-50" />
      </a>
    );
  }

  if (collapsed) {
    return (
      <Link
        href={item.href!}
        title={item.label}
        className={cn(
          "flex items-center justify-center p-2 rounded-md transition-colors",
          isActive
            ? "bg-sidebar-primary text-sidebar-primary-foreground"
            : "text-sidebar-foreground/60 hover:bg-sidebar-accent hover:text-sidebar-foreground"
        )}
      >
        {item.icon}
      </Link>
    );
  }

  return (
    <Link
      href={item.href!}
      className={cn(
        "flex items-center gap-2.5 px-3 py-2 rounded-md text-sm transition-colors",
        depth > 0 && "pl-2",
        isActive
          ? "bg-sidebar-primary text-sidebar-primary-foreground font-medium"
          : "text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent"
      )}
    >
      {item.icon}
      {item.label}
    </Link>
  );
}

function UserCard({ collapsed }: { collapsed: boolean }) {
  const { user, invalidate } = useCurrentUser();
  const router = useRouter();

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      invalidate();
      router.push("/login");
    } catch {
      toast.error("Failed to logout");
    }
  };

  if (!user) return null;

  if (collapsed) {
    return (
      <div className="px-2 py-3 border-t border-sidebar-border">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="w-full flex justify-center">
              <Avatar className="h-8 w-8">
                <AvatarFallback className="text-xs bg-sidebar-primary text-sidebar-primary-foreground">
                  {getInitials(user.fullName)}
                </AvatarFallback>
              </Avatar>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent side="right" align="end" className="w-52">
            <DropdownMenuLabel className="font-normal">
              <p className="text-sm font-medium">{user.fullName}</p>
              <p className="text-xs text-muted-foreground">{user.email}</p>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => router.push("/profile")}>
              <User className="mr-2 h-4 w-4" /> Profile
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => router.push("/profile/security")}>
              <Lock className="mr-2 h-4 w-4" /> Security
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleLogout} className="text-destructive focus:text-destructive">
              <LogOut className="mr-2 h-4 w-4" /> Sign Out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    );
  }

  return (
    <div className="px-3 py-3 border-t border-sidebar-border">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button className="w-full flex items-center gap-3 px-2 py-2 rounded-md hover:bg-sidebar-accent transition-colors text-left">
            <Avatar className="h-8 w-8 shrink-0">
              <AvatarFallback className="text-xs bg-sidebar-primary text-sidebar-primary-foreground">
                {getInitials(user.fullName)}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-sidebar-foreground truncate">{user.fullName}</p>
              <p className="text-xs text-sidebar-foreground/50 truncate">{user.roles?.[0] ?? user.email}</p>
            </div>
            <ChevronDown className="h-3.5 w-3.5 text-sidebar-foreground/40 shrink-0" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent side="top" align="start" className="w-56 mb-1">
          <DropdownMenuLabel className="font-normal">
            <p className="text-sm font-medium">{user.fullName}</p>
            <p className="text-xs text-muted-foreground">{user.email}</p>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => router.push("/profile")}>
            <User className="mr-2 h-4 w-4" /> Profile
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => router.push("/profile/security")}>
            <Lock className="mr-2 h-4 w-4" /> Security
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={handleLogout} className="text-destructive focus:text-destructive">
            <LogOut className="mr-2 h-4 w-4" /> Sign Out
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

interface SidebarProps {
  open: boolean;
  onClose: () => void;
  collapsed?: boolean;
}

export function Sidebar({ open, onClose, collapsed = false }: SidebarProps) {
  return (
    <>
      {open && (
        <div className="fixed inset-0 z-40 bg-black/40 lg:hidden" onClick={onClose} />
      )}

      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex flex-col bg-sidebar border-r border-sidebar-border transition-all duration-200 lg:static lg:translate-x-0",
          open ? "translate-x-0" : "-translate-x-full",
          collapsed ? "w-14" : "w-60"
        )}
      >
        {/* Logo */}
        <div
          className={cn(
            "flex h-14 items-center border-b border-sidebar-border shrink-0",
            collapsed ? "justify-center px-2" : "justify-between px-4"
          )}
        >
          {!collapsed && (
            <div className="flex items-center gap-2">
              <div className="h-7 w-7 rounded-md bg-sidebar-primary flex items-center justify-center">
                <span className="text-sidebar-primary-foreground text-xs font-bold">
                  {(process.env.NEXT_PUBLIC_APP_NAME ?? "ERP").charAt(0)}
                </span>
              </div>
              <span className="text-sidebar-foreground font-semibold text-sm">
                {process.env.NEXT_PUBLIC_APP_NAME ?? "IMS"}
              </span>
            </div>
          )}
          {collapsed && (
            <div className="h-7 w-7 rounded-md bg-sidebar-primary flex items-center justify-center">
              <span className="text-sidebar-primary-foreground text-xs font-bold">
                {(process.env.NEXT_PUBLIC_APP_NAME ?? "ERP").charAt(0)}
              </span>
            </div>
          )}
          <button
            onClick={onClose}
            className="lg:hidden text-sidebar-foreground/40 hover:text-sidebar-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Company indicator */}
        {!collapsed && <CompanySwitcher />}

        {/* Nav */}
        <ScrollArea className="flex-1">
          <nav className={cn("py-3", collapsed ? "px-2 space-y-1" : "px-3 space-y-4")}>
            {NAV_GROUPS.map((group) => (
              <div key={group.label}>
                {!collapsed && (
                  <p className="px-3 mb-1 text-[10px] font-semibold uppercase tracking-widest text-sidebar-foreground/40">
                    {group.label}
                  </p>
                )}
                <div className="space-y-0.5">
                  {group.items.map((item) => (
                    <NavLink key={item.href ?? item.label} item={item} collapsed={collapsed} />
                  ))}
                </div>
              </div>
            ))}
          </nav>
        </ScrollArea>

        {/* User card */}
        <UserCard collapsed={collapsed} />
      </aside>
    </>
  );
}
