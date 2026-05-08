"use client";
import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard, Users, Shield, Building2, GitBranch, Layers,
  UserCircle, CheckCircle, ScrollText, Settings, ChevronDown, ChevronRight,
  Menu, X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { usePermission } from "@/hooks/usePermission";
import { Button } from "@/components/ui/button";

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
