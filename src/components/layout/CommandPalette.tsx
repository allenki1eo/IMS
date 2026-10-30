"use client";
import { useEffect, useState, useCallback, useMemo, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowRight, Clock, CornerDownLeft, FileText, Landmark, Loader2, PackageCheck, Plus,
  Search, SendHorizonal, ShoppingCart, Star, Truck, Wrench, Factory, FileSearch, BookMarked,
  type LucideIcon,
} from "lucide-react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { usePinnedPages, useRecentPages } from "@/hooks/useNavMemory";
import { NAV_LEAVES, canSee, findLeaf } from "./nav-config";

interface CreateAction {
  label: string;
  href: string;
  icon: LucideIcon;
  permission: string;
  keywords: string;
}

const CREATE_ACTIONS: CreateAction[] = [
  { label: "New goods receipt", href: "/warehouse/grn/new", icon: PackageCheck, permission: "warehouse:grn:create", keywords: "grn receive stock" },
  { label: "New purchase request", href: "/procurement/requests/new", icon: ShoppingCart, permission: "procurement:request:create", keywords: "pr buy" },
  { label: "New work order", href: "/maintenance/work-orders/new", icon: Wrench, permission: "maintenance:workorder:create", keywords: "repair job" },
  { label: "New trip", href: "/transport/trips/new", icon: Truck, permission: "transport:trip:create", keywords: "transport plan" },
  { label: "New production batch", href: "/production/batches/new", icon: Factory, permission: "production:batch:create", keywords: "brew" },
  { label: "New lab test", href: "/qc/tests/new", icon: FileSearch, permission: "qc:test:create", keywords: "qc quality" },
  { label: "New dispatch order", href: "/dispatch/orders/new", icon: SendHorizonal, permission: "dispatch:order:create", keywords: "delivery" },
  { label: "New cashbook entry", href: "/finance/cashbook/new", icon: BookMarked, permission: "finance:cashbook:write", keywords: "expense receipt cash" },
  { label: "New journal entry", href: "/finance/journal-entries/new", icon: Landmark, permission: "finance:journal:create", keywords: "gl posting" },
];

interface Row {
  key: string;
  group: string;
  label: string;
  hint?: string;
  href: string;
  icon: LucideIcon;
}

interface SearchResult {
  group: string;
  label: string;
  sublabel: string;
  href: string;
}

/** 3 = label prefix, 2 = word start, 1 = substring anywhere, 0 = no match. */
function score(query: string, label: string, extra: string): number {
  const l = label.toLowerCase();
  if (l.startsWith(query)) return 3;
  if (l.split(/[\s·()/-]+/).some((w) => w.startsWith(query))) return 2;
  if (l.includes(query) || extra.toLowerCase().includes(query)) return 1;
  return 0;
}

function rank<T>(items: T[], query: string, fields: (t: T) => [string, string]): T[] {
  return items
    .map((item, i) => {
      const [label, extra] = fields(item);
      return { item, s: score(query, label, extra), i };
    })
    .filter((x) => x.s > 0)
    .sort((a, b) => b.s - a.s || a.i - b.i)
    .map((x) => x.item);
}

interface CommandPaletteProps {
  open: boolean;
  onClose: () => void;
}

export function CommandPalette({ open, onClose }: CommandPaletteProps) {
  const router = useRouter();
  const { user } = useCurrentUser();
  const { pinned } = usePinnedPages();
  const recent = useRecentPages();
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const [results, setResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);
  const q = query.trim().toLowerCase();

  const pages = useMemo(() => NAV_LEAVES.filter((l) => !l.external && canSee(user, l)), [user]);
  const actions = useMemo(() => CREATE_ACTIONS.filter((a) => canSee(user, a)), [user]);

  // Rows for pages + actions; record search hits are appended below.
  const rows = useMemo<Row[]>(() => {
    const toRow = (group: string) => (l: (typeof pages)[number]): Row => ({
      key: `${group}:${l.href}`, group, label: l.title, hint: l.section, href: l.href, icon: l.icon,
    });

    if (!q) {
      const visible = new Set(pages.map((p) => p.href));
      const pinnedRows = pinned.filter((h) => visible.has(h)).map((h) => toRow("Pinned")(findLeaf(h)!));
      const pinnedSet = new Set(pinned);
      const recentRows = recent
        .filter((h) => visible.has(h) && !pinnedSet.has(h))
        .map((h) => toRow("Recent")(findLeaf(h)!));
      const actionRows = actions.slice(0, 4).map<Row>((a) => ({
        key: `act:${a.href}`, group: "Create", label: a.label, href: a.href, icon: a.icon,
      }));
      // First run (nothing pinned or visited yet): offer the first few pages.
      const fallback = pinnedRows.length + recentRows.length === 0 ? pages.slice(0, 6).map(toRow("Go to")) : [];
      return [...pinnedRows, ...recentRows, ...fallback, ...actionRows];
    }

    const pageRows = rank(pages, q, (p) => [p.title, `${p.section} ${p.keywords ?? ""}`]).slice(0, 8).map(toRow("Pages"));
    const actionRows = rank(actions, q, (a) => [a.label, a.keywords]).slice(0, 4).map<Row>((a) => ({
      key: `act:${a.href}`, group: "Create", label: a.label, href: a.href, icon: a.icon,
    }));
    return [...pageRows, ...actionRows];
  }, [q, pages, actions, pinned, recent]);

  const recordRows = useMemo<Row[]>(
    () => results.map((r) => ({ key: `rec:${r.href}`, group: r.group, label: r.label, hint: r.sublabel, href: r.href, icon: FileText })),
    [results]
  );
  const allRows = useMemo(() => [...rows, ...recordRows], [rows, recordRows]);

  // Debounced global record search
  useEffect(() => {
    if (q.length < 2) {
      setResults([]);
      setSearching(false);
      return;
    }
    setSearching(true);
    const controller = new AbortController();
    const timer = setTimeout(() => {
      fetch(`/api/search?q=${encodeURIComponent(q)}`, { signal: controller.signal })
        .then((r) => r.json())
        .then((d) => {
          setResults(Array.isArray(d.data) ? d.data : []);
          setSearching(false);
        })
        .catch((err) => {
          if (err?.name !== "AbortError") setSearching(false);
        });
    }, 250);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [q]);

  useEffect(() => setActiveIndex(0), [q, results.length]);

  // Reset when reopened so the palette always starts fresh.
  useEffect(() => {
    if (!open) {
      setQuery("");
      setResults([]);
    }
  }, [open]);

  useEffect(() => {
    listRef.current
      ?.querySelector<HTMLElement>(`[data-index="${activeIndex}"]`)
      ?.scrollIntoView({ block: "nearest" });
  }, [activeIndex]);

  const navigate = useCallback((href: string) => {
    router.push(href);
    onClose();
  }, [router, onClose]);

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((i) => (allRows.length ? (i + 1) % allRows.length : 0));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((i) => (allRows.length ? (i - 1 + allRows.length) % allRows.length : 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      const target = allRows[activeIndex];
      if (target) navigate(target.href);
    }
  };

  // Group consecutive rows by heading while keeping one flat index for keyboard nav.
  const sections: { group: string; rows: { row: Row; index: number }[] }[] = [];
  allRows.forEach((row, index) => {
    const last = sections[sections.length - 1];
    if (last && last.group === row.group) last.rows.push({ row, index });
    else sections.push({ group: row.group, rows: [{ row, index }] });
  });

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent
        onKeyDown={onKeyDown}
        className={cn(
          "top-[12vh] max-w-xl translate-y-0 gap-0 overflow-hidden p-0 shadow-2xl sm:top-[15vh]",
          "data-[state=closed]:slide-out-to-top-2 data-[state=open]:slide-in-from-top-2",
          // The palette has its own ESC hint; hide the dialog's corner close button.
          "[&>button:last-child]:hidden"
        )}
      >
        <DialogTitle className="sr-only">Search and navigate</DialogTitle>
        <div className="flex items-center gap-3 border-b px-4">
          <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
          <input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search pages, actions, and records…"
            aria-label="Search"
            role="combobox"
            aria-expanded
            aria-controls="command-list"
            aria-activedescendant={allRows[activeIndex] ? `cmd-${activeIndex}` : undefined}
            className="h-12 flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
          />
          {searching && <Loader2 className="h-4 w-4 shrink-0 animate-spin text-muted-foreground" />}
          <kbd className="rounded border px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground">ESC</kbd>
        </div>

        <div ref={listRef} id="command-list" role="listbox" className="max-h-[min(60vh,420px)] overflow-y-auto p-1.5">
          {sections.map(({ group, rows: groupRows }) => (
            <div key={group} role="group" aria-label={group} className="pb-1">
              <p className="flex items-center gap-1.5 px-2.5 pb-1 pt-2 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                {group === "Pinned" && <Star className="h-3 w-3" />}
                {group === "Recent" && <Clock className="h-3 w-3" />}
                {group === "Create" && <Plus className="h-3 w-3" />}
                {group}
              </p>
              {groupRows.map(({ row, index }) => {
                const Icon = row.icon;
                const active = index === activeIndex;
                return (
                  <button
                    key={row.key}
                    id={`cmd-${index}`}
                    data-index={index}
                    role="option"
                    aria-selected={active}
                    onClick={() => navigate(row.href)}
                    onMouseMove={() => !active && setActiveIndex(index)}
                    className={cn(
                      "flex h-9 w-full items-center gap-3 rounded-md px-2.5 text-left text-sm transition-colors",
                      active ? "bg-accent text-accent-foreground" : "text-foreground/90"
                    )}
                  >
                    <Icon className={cn("h-4 w-4 shrink-0", active ? "text-foreground" : "text-muted-foreground")} />
                    <span className="min-w-0 flex-1 truncate">{row.label}</span>
                    {row.hint && (
                      <span className="max-w-[40%] shrink-0 truncate text-xs text-muted-foreground">{row.hint}</span>
                    )}
                    {active && <ArrowRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />}
                  </button>
                );
              })}
            </div>
          ))}

          {allRows.length === 0 && (
            <div className="px-4 py-10 text-center">
              <p className="text-sm font-medium">{searching ? "Searching…" : "No matches"}</p>
              {!searching && (
                <p className="mt-1 text-xs text-muted-foreground">
                  Nothing found for &ldquo;{query}&rdquo;. Try a page name, code, or reference number.
                </p>
              )}
            </div>
          )}
        </div>

        <div className="hidden items-center gap-4 border-t bg-muted/40 px-4 py-2 text-[11px] text-muted-foreground sm:flex">
          <span className="flex items-center gap-1">
            <kbd className="rounded border bg-background px-1 font-mono">↑</kbd>
            <kbd className="rounded border bg-background px-1 font-mono">↓</kbd>
            navigate
          </span>
          <span className="flex items-center gap-1">
            <kbd className="flex items-center rounded border bg-background px-1"><CornerDownLeft className="h-2.5 w-2.5" /></kbd>
            open
          </span>
          <span className="ml-auto flex items-center gap-1">
            <Star className="h-3 w-3" /> Pin pages from the sidebar
          </span>
        </div>
      </DialogContent>
    </Dialog>
  );
}
