"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTheme } from "next-themes";
import { ChevronRight, Menu, PanelLeftClose, PanelLeftOpen, Search, Sun, Moon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SyncStatusIndicator } from "./SyncStatusIndicator";
import { CommandPalette } from "./CommandPalette";
import { NotificationBell } from "./NotificationBell";
import { findLeaf } from "./nav-config";
import { cn } from "@/lib/utils";

/** Labels for path segments that aren't pages in the nav config. */
const SEGMENT_LABELS: Record<string, string> = {
  admin: "Admin",
  grn: "GRN",
  uom: "UOM",
  qc: "Quality Control",
  ncr: "Non-Conformances",
  lab: "Lab",
  brewing: "Brewing",
  "tra-stamps": "TRA Stamps",
  "journal-entries": "Journal Entries",
  "audit-logs": "Audit Logs",
  create: "New",
  new: "New",
  edit: "Edit",
  setup: "Setup",
};

const MODULE_ROOT_LABEL: Record<string, string> = {
  "/finance": "Finance",
  "/analytics": "Analytics",
};

/** cuid, uuid, or other opaque record id — never a human route segment. */
function isRecordId(seg: string) {
  return (
    /^c[a-z0-9]{20,}$/.test(seg) ||
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(seg) ||
    (/\d/.test(seg) && /^[a-z0-9_-]{16,}$/i.test(seg))
  );
}

function titleCase(seg: string) {
  return seg.split("-").map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
}

interface Crumb {
  label: string;
  href: string;
  linkable: boolean;
}

function useBreadcrumbs(): Crumb[] {
  const pathname = usePathname();
  const segments = pathname.split("/").filter(Boolean);
  if (segments.length === 0) return [{ label: "Dashboard", href: "/", linkable: false }];

  const crumbs: Crumb[] = [];
  let path = "";
  for (const seg of segments) {
    path += `/${seg}`;
    if (isRecordId(seg)) {
      crumbs.push({ label: "Detail", href: path, linkable: true });
      continue;
    }
    const leaf = findLeaf(path);
    // A module's "Overview" leaf reads better as the module name in a trail.
    const label =
      MODULE_ROOT_LABEL[path] ??
      (leaf && leaf.label !== "Overview" ? leaf.label : leaf?.section) ??
      SEGMENT_LABELS[seg] ??
      titleCase(seg);
    crumbs.push({ label, href: path, linkable: !!leaf });
  }
  // The current page is never a link.
  crumbs[crumbs.length - 1].linkable = false;
  return crumbs;
}

interface NavbarProps {
  onMenuToggle: () => void;
  onCollapseToggle: () => void;
  collapsed: boolean;
}

export function Navbar({ onMenuToggle, onCollapseToggle, collapsed }: NavbarProps) {
  const [cmdOpen, setCmdOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const { resolvedTheme, setTheme } = useTheme();
  const breadcrumbs = useBreadcrumbs();
  const visibleCrumbs = breadcrumbs.slice(-3);
  const current = breadcrumbs[breadcrumbs.length - 1];
  const isDark = mounted && resolvedTheme === "dark";

  // Theme is only known on the client; render a neutral icon until mounted
  // to avoid a hydration mismatch.
  useEffect(() => setMounted(true), []);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setCmdOpen((o) => !o);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  return (
    <>
      <header
        data-navbar
        className="sticky top-0 z-30 flex h-14 shrink-0 items-center justify-between gap-4 border-b bg-background/80 px-3 backdrop-blur supports-[backdrop-filter]:bg-background/70 sm:px-4"
      >
        {/* Left: toggle + breadcrumb */}
        <div className="flex min-w-0 items-center gap-1.5">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 shrink-0 lg:hidden"
            onClick={onMenuToggle}
            aria-label="Open navigation"
          >
            <Menu className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="hidden h-8 w-8 shrink-0 text-muted-foreground lg:flex"
            onClick={onCollapseToggle}
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {collapsed ? <PanelLeftOpen className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}
          </Button>
          <span aria-hidden className="mx-1 hidden h-4 w-px bg-border lg:block" />

          {/* Mobile: just the current page */}
          <p className="truncate text-sm font-medium sm:hidden">{current.label}</p>

          {/* Desktop: trail */}
          <nav aria-label="Breadcrumb" className="hidden min-w-0 sm:block">
            <ol className="flex min-w-0 items-center gap-1 text-sm">
              {breadcrumbs.length > visibleCrumbs.length && (
                <li className="flex items-center gap-1 text-muted-foreground/60">
                  <Link href="/" className="rounded px-1 hover:text-foreground">…</Link>
                  <ChevronRight className="h-3.5 w-3.5 shrink-0" />
                </li>
              )}
              {visibleCrumbs.map((crumb, i) => {
                const last = i === visibleCrumbs.length - 1;
                return (
                  <li key={crumb.href} className="flex min-w-0 items-center gap-1">
                    {i > 0 && (
                      <ChevronRight aria-hidden className="h-3.5 w-3.5 shrink-0 text-muted-foreground/50" />
                    )}
                      {crumb.linkable ? (
                        <Link
                          href={crumb.href}
                          className="block truncate rounded px-1 text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                        >
                          {crumb.label}
                        </Link>
                      ) : (
                        <span
                          className={cn("block truncate px-1", last ? "font-medium text-foreground" : "text-muted-foreground")}
                          aria-current={last ? "page" : undefined}
                        >
                          {crumb.label}
                        </span>
                      )}
                  </li>
                );
              })}
            </ol>
          </nav>
        </div>

        {/* Right: search + icons */}
        <div className="flex shrink-0 items-center gap-1 sm:gap-1.5">
          <button
            onClick={() => setCmdOpen(true)}
            className="hidden h-8 w-56 items-center gap-2 rounded-md border border-input bg-muted/40 pl-2.5 pr-1.5 text-sm text-muted-foreground transition-colors hover:border-foreground/20 hover:bg-muted md:flex lg:w-64"
          >
            <Search className="h-3.5 w-3.5" />
            <span>Search or jump to…</span>
            <kbd className="ml-auto rounded border bg-background px-1.5 py-0.5 font-mono text-[10px] leading-none">
              ⌘K
            </kbd>
          </button>

          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 md:hidden"
            onClick={() => setCmdOpen(true)}
            aria-label="Search"
          >
            <Search className="h-4 w-4" />
          </Button>

          <SyncStatusIndicator />

          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => setTheme(isDark ? "light" : "dark")}
            aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
            title={isDark ? "Switch to light mode" : "Switch to dark mode"}
          >
            {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </Button>

          <NotificationBell />
        </div>
      </header>

      <CommandPalette open={cmdOpen} onClose={() => setCmdOpen(false)} />
    </>
  );
}
