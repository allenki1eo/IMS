"use client";
import { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import { Sidebar } from "./Sidebar";
import { Navbar } from "./Navbar";
import { resolveActiveHref } from "./nav-config";
import { recordRecentPage } from "@/hooks/useNavMemory";

export function DashboardShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    try {
      const saved = localStorage.getItem("sidebar-collapsed");
      if (saved) setCollapsed(saved === "true");
    } catch {
      /* storage unavailable — default to expanded */
    }
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem("sidebar-collapsed", String(collapsed));
    } catch {
      /* best-effort preference */
    }
  }, [collapsed]);

  // Close the mobile drawer after navigating, and remember the page for ⌘K.
  useEffect(() => {
    setSidebarOpen(false);
    const href = resolveActiveHref(pathname);
    if (href && href !== "/") recordRecentPage(href);
  }, [pathname]);

  useEffect(() => {
    if (!sidebarOpen) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setSidebarOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [sidebarOpen]);

  return (
    <div data-shell className="flex h-screen overflow-hidden bg-background">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-[60] focus:rounded-md focus:bg-primary focus:px-3 focus:py-2 focus:text-sm focus:text-primary-foreground"
      >
        Skip to content
      </a>
      <Sidebar
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        collapsed={collapsed}
      />
      <div className="flex flex-1 flex-col overflow-hidden min-w-0">
        <Navbar
          onMenuToggle={() => setSidebarOpen((o) => !o)}
          onCollapseToggle={() => setCollapsed((c) => !c)}
          collapsed={collapsed}
        />
        <main id="main-content" tabIndex={-1} className="flex-1 overflow-y-auto bg-background focus:outline-none">
          <div className="p-4 sm:p-6 lg:px-8 max-w-7xl mx-auto">{children}</div>
        </main>
      </div>
    </div>
  );
}
