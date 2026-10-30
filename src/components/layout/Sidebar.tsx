"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { ChevronDown, ExternalLink, Lock, LogOut, Star, User, X } from "lucide-react";
import { toast } from "sonner";
import { cn, getInitials } from "@/lib/utils";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { usePinnedPages } from "@/hooks/useNavMemory";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { CompanySwitcher } from "@/components/shared/CompanySwitcher";
import {
  NAV_GROUPS, canSee, findLeaf, resolveActiveHref,
  type NavGroup, type NavItem,
} from "./nav-config";

const APP_NAME = process.env.NEXT_PUBLIC_APP_NAME ?? "IMS";

/* ─────────────── Leaf link ─────────────── */

interface LeafProps {
  item: NavItem;
  active: boolean;
  nested?: boolean;
  /** Override the visible label (pinned items use the out-of-context title). */
  label?: string;
  pinned?: boolean;
  onTogglePin?: (href: string) => void;
}

function LeafLink({ item, active, nested, label, pinned, onTogglePin }: LeafProps) {
  const Icon = item.icon;
  const text = label ?? item.label;
  const base = cn(
    "relative flex h-8 items-center gap-2.5 rounded-md px-2.5 text-[13px] transition-colors",
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring",
    active
      ? "bg-sidebar-accent font-medium text-sidebar-accent-foreground"
      : "text-sidebar-foreground/70 hover:bg-sidebar-accent/60 hover:text-sidebar-foreground"
  );
  const indicator = active && (
    <span
      aria-hidden
      className={cn(
        "absolute top-1.5 bottom-1.5 w-0.5 rounded-full bg-sidebar-primary",
        nested ? "-left-[13px]" : "left-0"
      )}
    />
  );

  if (item.external) {
    return (
      <a
        href={item.href}
        target={item.sameTab ? undefined : "_blank"}
        rel={item.sameTab ? undefined : "noopener noreferrer"}
        className={base}
      >
        <Icon className="h-4 w-4 shrink-0" />
        <span className="truncate">{text}</span>
        <ExternalLink className="ml-auto h-3 w-3 shrink-0 opacity-40" aria-label="Opens another app" />
      </a>
    );
  }

  return (
    <div className="group/leaf relative">
      <Link href={item.href!} className={cn(base, onTogglePin && "pr-8")} aria-current={active ? "page" : undefined}>
        {indicator}
        <Icon className={cn("h-4 w-4 shrink-0", active ? "opacity-100" : "opacity-80")} />
        <span className="truncate">{text}</span>
      </Link>
      {onTogglePin && (
        <button
          type="button"
          onClick={() => onTogglePin(item.href!)}
          aria-label={pinned ? `Unpin ${text}` : `Pin ${text}`}
          aria-pressed={pinned}
          className={cn(
            "absolute right-1 top-1/2 flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded",
            "text-sidebar-foreground/40 transition-opacity hover:text-sidebar-foreground",
            "focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring",
            pinned ? "opacity-100" : "opacity-0 group-hover/leaf:opacity-100 [@media(hover:none)]:opacity-50"
          )}
        >
          <Star className={cn("h-3.5 w-3.5", pinned && "fill-current text-warning")} />
        </button>
      )}
    </div>
  );
}

/* ─────────────── Expandable group ─────────────── */

interface MenuProps {
  item: NavItem;
  items: NavItem[];
  activeHref: string | null;
  isPinned: (href: string) => boolean;
  onTogglePin: (href: string) => void;
}

function ExpandableMenu({ item, items, activeHref, isPinned, onTogglePin }: MenuProps) {
  const containsActive = items.some((c) => c.href === activeHref);
  const [open, setOpen] = useState(containsActive);
  const Icon = item.icon;

  // Navigating into a section (e.g. via ⌘K) should reveal where you are.
  useEffect(() => {
    if (containsActive) setOpen(true);
  }, [containsActive]);

  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className={cn(
          "flex h-8 w-full items-center gap-2.5 rounded-md px-2.5 text-[13px] transition-colors",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring",
          containsActive
            ? "font-medium text-sidebar-foreground"
            : "text-sidebar-foreground/70 hover:bg-sidebar-accent/60 hover:text-sidebar-foreground"
        )}
      >
        <Icon className="h-4 w-4 shrink-0" />
        <span className="truncate">{item.label}</span>
        {containsActive && !open && (
          <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-sidebar-primary" />
        )}
        <ChevronDown
          className={cn(
            "ml-auto h-3.5 w-3.5 shrink-0 opacity-50 transition-transform duration-200",
            !open && "-rotate-90"
          )}
        />
      </button>
      {open && (
        <div className="ml-[17px] mt-0.5 space-y-px border-l border-sidebar-border pl-3 animate-in fade-in-0 slide-in-from-top-1 duration-150">
          {items.map((child) => (
            <LeafLink
              key={child.href}
              item={child}
              nested
              active={child.href === activeHref}
              pinned={isPinned(child.href!)}
              onTogglePin={onTogglePin}
            />
          ))}
        </div>
      )}
    </div>
  );
}

/* ─────────────── Collapsed (icon rail) ─────────────── */

const FLYOUT_ROW = 32;

function RailItem({ item, items, activeHref }: { item: NavItem; items?: NavItem[]; activeHref: string | null }) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<{ top?: number; bottom?: number; left: number }>({ left: 0 });
  const anchorRef = useRef<HTMLDivElement>(null);
  const Icon = item.icon;

  // The rail scrolls and the sidebar is transformed, so the flyout is portalled
  // to <body> with fixed coordinates; otherwise it is clipped to the rail.
  const show = () => {
    const rect = anchorRef.current?.getBoundingClientRect();
    if (rect) {
      const height = 40 + (items?.length ?? 0) * FLYOUT_ROW;
      const fitsBelow = rect.top + height < window.innerHeight - 8;
      setPos(fitsBelow
        ? { top: rect.top, left: rect.right }
        : { bottom: Math.max(8, window.innerHeight - rect.bottom), left: rect.right });
    }
    setOpen(true);
  };

  useEffect(() => {
    if (!open) return;
    const close = () => setOpen(false);
    window.addEventListener("resize", close);
    window.addEventListener("scroll", close, true);
    return () => {
      window.removeEventListener("resize", close);
      window.removeEventListener("scroll", close, true);
    };
  }, [open]);
  const active = items ? items.some((c) => c.href === activeHref) : item.href === activeHref;
  const cls = cn(
    "relative flex h-9 w-full items-center justify-center rounded-md transition-colors",
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring",
    active
      ? "bg-sidebar-accent text-sidebar-accent-foreground"
      : "text-sidebar-foreground/60 hover:bg-sidebar-accent/60 hover:text-sidebar-foreground"
  );

  if (!items) {
    return item.external ? (
      <a href={item.href} target={item.sameTab ? undefined : "_blank"} rel="noopener noreferrer" title={item.label} className={cls}>
        <Icon className="h-4 w-4" />
      </a>
    ) : (
      <Link href={item.href!} title={item.label} aria-label={item.label} aria-current={active ? "page" : undefined} className={cls}>
        <Icon className="h-4 w-4" />
      </Link>
    );
  }

  return (
    <div
      ref={anchorRef}
      className="relative"
      onMouseEnter={show}
      onMouseLeave={() => setOpen(false)}
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node)) setOpen(false);
      }}
      onKeyDown={(e) => e.key === "Escape" && setOpen(false)}
    >
      <button
        type="button"
        className={cls}
        aria-label={item.label}
        aria-expanded={open}
        aria-haspopup="menu"
        onClick={() => (open ? setOpen(false) : show())}
      >
        <Icon className="h-4 w-4" />
        {active && <span aria-hidden className="absolute right-1 top-1 h-1.5 w-1.5 rounded-full bg-sidebar-primary" />}
      </button>
      {open && createPortal(
        // pl-2 bridges the gap so the pointer can travel into the flyout.
        // React events bubble through portals, so hover/blur still reach the anchor.
        <div className="fixed z-50 pl-2" style={pos}>
          <div className="w-56 rounded-lg border bg-popover p-1 text-popover-foreground shadow-lg animate-in fade-in-0 zoom-in-95 slide-in-from-left-1 duration-100">
            <p className="px-2 pb-1 pt-1.5 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
              {item.label}
            </p>
            {items.map((child) => {
              const ChildIcon = child.icon;
              const childActive = child.href === activeHref;
              return (
                <Link
                  key={child.href}
                  href={child.href!}
                  onClick={() => setOpen(false)}
                  aria-current={childActive ? "page" : undefined}
                  className={cn(
                    "flex h-8 items-center gap-2.5 rounded-md px-2 text-[13px] transition-colors focus-visible:outline-none focus-visible:bg-accent",
                    childActive ? "bg-accent font-medium" : "text-muted-foreground hover:bg-accent hover:text-foreground"
                  )}
                >
                  <ChildIcon className="h-4 w-4 shrink-0" />
                  {child.label}
                </Link>
              );
            })}
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}

/* ─────────────── User card ─────────────── */

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

  const avatar = (
    <Avatar className="h-8 w-8 shrink-0">
      <AvatarFallback className="bg-sidebar-primary text-xs font-medium text-sidebar-primary-foreground">
        {getInitials(user.fullName)}
      </AvatarFallback>
    </Avatar>
  );

  return (
    <div className={cn("shrink-0 border-t border-sidebar-border", collapsed ? "px-2 py-3" : "p-2")}>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          {collapsed ? (
            <button className="flex w-full justify-center rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring" aria-label="Account menu">
              {avatar}
            </button>
          ) : (
            <button className="flex w-full items-center gap-3 rounded-md p-2 text-left transition-colors hover:bg-sidebar-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring">
              {avatar}
              <div className="min-w-0 flex-1">
                <p className="truncate text-[13px] font-medium text-sidebar-foreground">{user.fullName}</p>
                <p className="truncate text-xs text-sidebar-foreground/50">
                  {formatRole(user.roles?.[0]) ?? user.email}
                </p>
              </div>
              <ChevronDown className="h-3.5 w-3.5 shrink-0 text-sidebar-foreground/40" />
            </button>
          )}
        </DropdownMenuTrigger>
        <DropdownMenuContent side={collapsed ? "right" : "top"} align={collapsed ? "end" : "start"} className="mb-1 w-56">
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

/** SUPER_ADMIN → "Super Admin" */
function formatRole(role?: string) {
  if (!role) return undefined;
  return role.toLowerCase().split("_").map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
}

/* ─────────────── Sidebar ─────────────── */

interface VisibleItem {
  item: NavItem;
  items?: NavItem[];
}

interface SidebarProps {
  open: boolean;
  onClose: () => void;
  collapsed?: boolean;
}

export function Sidebar({ open, onClose, collapsed = false }: SidebarProps) {
  const pathname = usePathname();
  const { user } = useCurrentUser();
  const { pinned, isPinned, togglePin } = usePinnedPages();
  const activeHref = resolveActiveHref(pathname, { sidebarOnly: true });

  // Drop anything the user can't open, and any section left empty by that.
  const groups = useMemo(() => {
    return NAV_GROUPS.map((group: NavGroup) => ({
      label: group.label,
      items: group.items.flatMap<VisibleItem>((item) => {
        if (!canSee(user, item)) return [];
        if (!item.children) return [{ item }];
        const items = item.children.filter((c) => canSee(user, c));
        return items.length ? [{ item, items }] : [];
      }),
    })).filter((g) => g.items.length > 0);
  }, [user]);

  const pinnedLeaves = useMemo(
    () => pinned.map(findLeaf).filter((l): l is NonNullable<typeof l> => !!l && canSee(user, l)),
    [pinned, user]
  );

  return (
    <>
      {open && (
        <div
          className="fixed inset-0 z-40 bg-black/50 backdrop-blur-[2px] lg:hidden animate-in fade-in-0"
          onClick={onClose}
          aria-hidden
        />
      )}

      <aside
        data-sidebar
        aria-label="Main navigation"
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex flex-col border-r border-sidebar-border bg-sidebar transition-[transform,width] duration-200 ease-out lg:static lg:translate-x-0",
          open ? "translate-x-0 shadow-xl lg:shadow-none" : "-translate-x-full",
          collapsed ? "lg:w-14 w-64" : "w-64 lg:w-60"
        )}
      >
        {/* Brand */}
        <div className={cn("flex h-14 shrink-0 items-center border-b border-sidebar-border", collapsed ? "lg:justify-center lg:px-2 px-4" : "px-4")}>
          <Link href="/" className="flex min-w-0 items-center gap-2.5 rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring">
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-sidebar-primary text-xs font-bold text-sidebar-primary-foreground shadow-sm">
              {APP_NAME.charAt(0)}
            </span>
            <span className={cn("truncate text-sm font-semibold tracking-tight text-sidebar-foreground", collapsed && "lg:hidden")}>
              {APP_NAME}
            </span>
          </Link>
          <button
            onClick={onClose}
            aria-label="Close navigation"
            className="ml-auto flex h-8 w-8 items-center justify-center rounded-md text-sidebar-foreground/50 hover:bg-sidebar-accent hover:text-sidebar-foreground lg:hidden"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className={cn(collapsed && "lg:hidden")}>
          <CompanySwitcher />
        </div>

        <ScrollArea className="flex-1">
          {/* Icon rail — desktop collapsed mode only */}
          {collapsed && (
            <nav className="hidden space-y-1 px-2 py-3 lg:block">
              {groups.map((group, gi) => (
                <div key={group.label} className={cn("space-y-1", gi > 0 && "border-t border-sidebar-border pt-2")}>
                  {group.items.map(({ item, items }) => (
                    <RailItem key={item.href ?? item.label} item={item} items={items} activeHref={activeHref} />
                  ))}
                </div>
              ))}
            </nav>
          )}

          {/* Full menu */}
          <nav className={cn("space-y-5 px-3 py-3", collapsed && "lg:hidden")}>
            {pinnedLeaves.length > 0 && (
              <div>
                <SectionLabel>Pinned</SectionLabel>
                <div className="space-y-px">
                  {pinnedLeaves.map((leaf) => (
                    <LeafLink
                      key={leaf.href}
                      item={leaf}
                      label={leaf.title}
                      active={leaf.href === activeHref}
                      pinned
                      onTogglePin={togglePin}
                    />
                  ))}
                </div>
              </div>
            )}

            {groups.map((group) => (
              <div key={group.label}>
                <SectionLabel>{group.label}</SectionLabel>
                <div className="space-y-px">
                  {group.items.map(({ item, items }) =>
                    items ? (
                      <ExpandableMenu
                        key={item.label}
                        item={item}
                        items={items}
                        activeHref={activeHref}
                        isPinned={isPinned}
                        onTogglePin={togglePin}
                      />
                    ) : (
                      <LeafLink
                        key={item.href}
                        item={item}
                        active={item.href === activeHref}
                        pinned={!item.external && isPinned(item.href!)}
                        onTogglePin={item.external ? undefined : togglePin}
                      />
                    )
                  )}
                </div>
              </div>
            ))}
          </nav>
        </ScrollArea>

        {/* The mobile drawer is always full-width, even if the desktop rail is collapsed. */}
        <UserCard collapsed={collapsed && !open} />
      </aside>
    </>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="mb-1 px-2.5 text-[11px] font-medium uppercase tracking-wider text-sidebar-foreground/40">
      {children}
    </p>
  );
}
