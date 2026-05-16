"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { Bell, CheckCircle2, Wrench, Package, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface AlertItem {
  id: string;
  label: string;
  count: number;
  href: string;
  icon: React.ReactNode;
  variant: "warning" | "error" | "info";
}

export function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [alerts, setAlerts] = useState<AlertItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const [approvals, workOrders, lowStock] = await Promise.allSettled([
          fetch("/api/approval-requests?status=PENDING&pageSize=1").then((r) => r.json()),
          fetch("/api/work-orders?status=OPEN&pageSize=1").then((r) => r.json()),
          fetch("/api/items?lowStock=true&pageSize=1").then((r) => r.json()),
        ]);

        const items: AlertItem[] = [];

        if (approvals.status === "fulfilled" && approvals.value.meta?.total > 0) {
          items.push({
            id: "approvals",
            label: "Pending approvals",
            count: approvals.value.meta.total,
            href: "/approvals?status=PENDING",
            icon: <CheckCircle2 className="h-4 w-4" />,
            variant: "warning",
          });
        }
        if (workOrders.status === "fulfilled" && workOrders.value.meta?.total > 0) {
          items.push({
            id: "workorders",
            label: "Open work orders",
            count: workOrders.value.meta.total,
            href: "/maintenance/work-orders",
            icon: <Wrench className="h-4 w-4" />,
            variant: "info",
          });
        }
        if (lowStock.status === "fulfilled" && lowStock.value.meta?.total > 0) {
          items.push({
            id: "lowstock",
            label: "Low stock items",
            count: lowStock.value.meta.total,
            href: "/warehouse/stock",
            icon: <Package className="h-4 w-4" />,
            variant: "error",
          });
        }

        setAlerts(items);
      } catch {
        /* silent */
      } finally {
        setLoading(false);
      }
    }

    load();
    const interval = setInterval(load, 60_000);
    return () => clearInterval(interval);
  }, []);

  const totalCount = alerts.reduce((s, a) => s + a.count, 0);

  const variantClass = {
    warning: "bg-amber-100 text-amber-700 border-amber-200",
    error: "bg-red-100 text-red-700 border-red-200",
    info: "bg-blue-100 text-blue-700 border-blue-200",
  };

  const dotClass = {
    warning: "bg-amber-500",
    error: "bg-red-500",
    info: "bg-blue-500",
  };

  return (
    <div className="relative">
      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8 relative"
        onClick={() => setOpen((o) => !o)}
        aria-label="Notifications"
      >
        <Bell className="h-4 w-4" />
        {totalCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-destructive text-[9px] font-bold text-destructive-foreground">
            {totalCount > 9 ? "9+" : totalCount}
          </span>
        )}
      </Button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-10 z-50 w-80 rounded-lg border bg-popover shadow-lg">
            <div className="flex items-center justify-between px-4 py-3 border-b">
              <p className="text-sm font-semibold">Notifications</p>
              <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setOpen(false)}>
                <X className="h-3.5 w-3.5" />
              </Button>
            </div>

            <div className="py-2">
              {loading ? (
                <p className="px-4 py-3 text-sm text-muted-foreground">Loading...</p>
              ) : alerts.length === 0 ? (
                <div className="px-4 py-6 text-center">
                  <Bell className="h-8 w-8 text-muted-foreground/30 mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">All clear — no alerts</p>
                </div>
              ) : (
                alerts.map((alert) => (
                  <Link
                    key={alert.id}
                    href={alert.href}
                    onClick={() => setOpen(false)}
                    className="flex items-center gap-3 px-4 py-3 hover:bg-muted/50 transition-colors"
                  >
                    <div className={cn("flex h-8 w-8 items-center justify-center rounded-full border shrink-0", variantClass[alert.variant])}>
                      {alert.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{alert.label}</p>
                      <p className="text-xs text-muted-foreground">
                        {alert.count} item{alert.count !== 1 ? "s" : ""} need attention
                      </p>
                    </div>
                    <span className={cn("flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold text-white shrink-0", dotClass[alert.variant])}>
                      {alert.count > 9 ? "9+" : alert.count}
                    </span>
                  </Link>
                ))
              )}
            </div>

            {alerts.length > 0 && (
              <div className="border-t px-4 py-2">
                <Link
                  href="/approvals"
                  onClick={() => setOpen(false)}
                  className="text-xs text-primary hover:underline"
                >
                  View all approvals →
                </Link>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
