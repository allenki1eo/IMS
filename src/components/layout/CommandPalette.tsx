"use client";
import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Search, LayoutDashboard, Users, Warehouse, Truck, Fuel, Wrench, ShoppingCart, Factory, FlaskConical, SendHorizonal, Landmark, BarChart3, Shield, Building2, UserCircle, CheckCircle, ScrollText, Settings } from "lucide-react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

interface CommandItem {
  label: string;
  href: string;
  icon: React.ReactNode;
  group: string;
}

const COMMANDS: CommandItem[] = [
  { label: "Dashboard", href: "/", icon: <LayoutDashboard className="h-4 w-4" />, group: "Main" },
  { label: "Employees", href: "/employees", icon: <UserCircle className="h-4 w-4" />, group: "Main" },
  { label: "Approvals", href: "/approvals", icon: <CheckCircle className="h-4 w-4" />, group: "Main" },
  { label: "Users", href: "/admin/users", icon: <Users className="h-4 w-4" />, group: "Admin" },
  { label: "Roles", href: "/admin/roles", icon: <Shield className="h-4 w-4" />, group: "Admin" },
  { label: "Company Profile", href: "/company", icon: <Building2 className="h-4 w-4" />, group: "Admin" },
  { label: "Audit Logs", href: "/audit-logs", icon: <ScrollText className="h-4 w-4" />, group: "Admin" },
  { label: "Settings", href: "/settings", icon: <Settings className="h-4 w-4" />, group: "Admin" },
  { label: "Warehouse Overview", href: "/warehouse", icon: <Warehouse className="h-4 w-4" />, group: "Operations" },
  { label: "Items", href: "/warehouse/items", icon: <Warehouse className="h-4 w-4" />, group: "Operations" },
  { label: "Stock", href: "/warehouse/stock", icon: <Warehouse className="h-4 w-4" />, group: "Operations" },
  { label: "GRN", href: "/warehouse/grn", icon: <Warehouse className="h-4 w-4" />, group: "Operations" },
  { label: "Transport Overview", href: "/transport", icon: <Truck className="h-4 w-4" />, group: "Operations" },
  { label: "Vehicles", href: "/transport/vehicles", icon: <Truck className="h-4 w-4" />, group: "Operations" },
  { label: "Drivers", href: "/transport/drivers", icon: <Truck className="h-4 w-4" />, group: "Operations" },
  { label: "Trips", href: "/transport/trips", icon: <Truck className="h-4 w-4" />, group: "Operations" },
  { label: "Fuel Tanks", href: "/fuel/tanks", icon: <Fuel className="h-4 w-4" />, group: "Operations" },
  { label: "Fuel Issues", href: "/fuel/issues", icon: <Fuel className="h-4 w-4" />, group: "Operations" },
  { label: "Work Orders", href: "/maintenance/work-orders", icon: <Wrench className="h-4 w-4" />, group: "Operations" },
  { label: "Spare Parts", href: "/maintenance/parts", icon: <Wrench className="h-4 w-4" />, group: "Operations" },
  { label: "Suppliers", href: "/procurement/suppliers", icon: <ShoppingCart className="h-4 w-4" />, group: "Operations" },
  { label: "Purchase Requests", href: "/procurement/requests", icon: <ShoppingCart className="h-4 w-4" />, group: "Operations" },
  { label: "Purchase Orders", href: "/procurement/orders", icon: <ShoppingCart className="h-4 w-4" />, group: "Operations" },
  { label: "Production Batches", href: "/production/batches", icon: <Factory className="h-4 w-4" />, group: "Operations" },
  { label: "Recipes", href: "/production/recipes", icon: <Factory className="h-4 w-4" />, group: "Operations" },
  { label: "QC Standards", href: "/qc/standards", icon: <FlaskConical className="h-4 w-4" />, group: "Operations" },
  { label: "Lab Tests", href: "/qc/tests", icon: <FlaskConical className="h-4 w-4" />, group: "Operations" },
  { label: "Non-Conformances", href: "/qc/ncr", icon: <FlaskConical className="h-4 w-4" />, group: "Operations" },
  { label: "Dispatch Orders", href: "/dispatch/orders", icon: <SendHorizonal className="h-4 w-4" />, group: "Operations" },
  { label: "FG Inventory", href: "/dispatch/inventory", icon: <SendHorizonal className="h-4 w-4" />, group: "Operations" },
  { label: "Finance Overview", href: "/finance", icon: <Landmark className="h-4 w-4" />, group: "Finance" },
  { label: "Chart of Accounts", href: "/finance/accounts", icon: <Landmark className="h-4 w-4" />, group: "Finance" },
  { label: "Journal Entries", href: "/finance/journal-entries", icon: <Landmark className="h-4 w-4" />, group: "Finance" },
  { label: "Bank Accounts", href: "/finance/bank-accounts", icon: <Landmark className="h-4 w-4" />, group: "Finance" },
  { label: "Payments", href: "/finance/payments", icon: <Landmark className="h-4 w-4" />, group: "Finance" },
  { label: "Analytics", href: "/analytics", icon: <BarChart3 className="h-4 w-4" />, group: "Finance" },
  { label: "Reports", href: "/reports", icon: <BarChart3 className="h-4 w-4" />, group: "Finance" },
];

interface CommandPaletteProps {
  open: boolean;
  onClose: () => void;
}

export function CommandPalette({ open, onClose }: CommandPaletteProps) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);

  const filtered = query.trim()
    ? COMMANDS.filter((c) => c.label.toLowerCase().includes(query.toLowerCase()) || c.group.toLowerCase().includes(query.toLowerCase()))
    : COMMANDS.slice(0, 8);

  const navigate = useCallback((href: string) => {
    router.push(href);
    onClose();
    setQuery("");
  }, [router, onClose]);

  useEffect(() => {
    setActiveIndex(0);
  }, [query]);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (!open) return;
      if (e.key === "ArrowDown") { e.preventDefault(); setActiveIndex((i) => Math.min(i + 1, filtered.length - 1)); }
      if (e.key === "ArrowUp") { e.preventDefault(); setActiveIndex((i) => Math.max(i - 1, 0)); }
      if (e.key === "Enter" && filtered[activeIndex]) navigate(filtered[activeIndex].href);
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [open, filtered, activeIndex, navigate]);

  const grouped = filtered.reduce<Record<string, CommandItem[]>>((acc, item) => {
    if (!acc[item.group]) acc[item.group] = [];
    acc[item.group].push(item);
    return acc;
  }, {});

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="p-0 gap-0 max-w-lg overflow-hidden">
        <div className="flex items-center gap-3 border-b px-4 py-3">
          <Search className="h-4 w-4 text-muted-foreground shrink-0" />
          <input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search pages, modules, records..."
            className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
          />
          <kbd className="text-xs text-muted-foreground border rounded px-1.5 py-0.5 font-mono">ESC</kbd>
        </div>
        <div className="max-h-80 overflow-y-auto py-2">
          {Object.entries(grouped).map(([group, items]) => (
            <div key={group}>
              <div className="px-4 py-1.5 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                {group}
              </div>
              {items.map((item) => {
                const globalIdx = filtered.indexOf(item);
                return (
                  <button
                    key={item.href}
                    onClick={() => navigate(item.href)}
                    className={cn(
                      "w-full flex items-center gap-3 px-4 py-2 text-sm text-left transition-colors",
                      globalIdx === activeIndex ? "bg-accent text-accent-foreground" : "hover:bg-accent/50"
                    )}
                  >
                    <span className="text-muted-foreground">{item.icon}</span>
                    {item.label}
                  </button>
                );
              })}
            </div>
          ))}
          {filtered.length === 0 && (
            <p className="px-4 py-8 text-center text-sm text-muted-foreground">No results for &ldquo;{query}&rdquo;</p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
