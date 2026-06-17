"use client";

import { useState, useEffect, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Building2, ChevronDown, Check, Loader2 } from "lucide-react";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";

export function CompanySwitcher() {
  const { user } = useCurrentUser();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [activeCompanyId, setActiveCompanyId] = useState<string | null>(null);
  const [activeCompanyName, setActiveCompanyName] = useState<string | null>(null);
  const [switchingTo, setSwitchingTo] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/company")
      .then((r) => r.json())
      .then((d) => {
        if (d.data?.id) {
          setActiveCompanyId(d.data.id);
          setActiveCompanyName(d.data.name);
        }
      })
      .catch(() => {});
  }, []);

  const companies = user?.companies ?? [];
  // Optimistic display: show the company we're switching to immediately
  const activeCompany = companies.find((c) => c.id === (switchingTo ?? activeCompanyId));
  const displayName = activeCompany?.name ?? activeCompanyName ?? "…";
  const isLoading = isPending || switchingTo !== null;

  async function switchCompany(companyId: string, companyName: string) {
    if (companyId === activeCompanyId) return;

    // Optimistic update — show new company name immediately
    setSwitchingTo(companyId);
    setActiveCompanyName(companyName);

    try {
      const res = await fetch("/api/company/switch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ companyId }),
      });
      const json = await res.json();

      if (res.ok) {
        setActiveCompanyId(companyId);
        setSwitchingTo(null);
        toast.success(`Switched to ${json.data?.name ?? companyName}`);
        // router.refresh() re-fetches server components without a full page reload
        startTransition(() => {
          router.refresh();
        });
      } else {
        // Rollback optimistic update on failure
        setSwitchingTo(null);
        setActiveCompanyName(null);
        toast.error(json.error ?? "Failed to switch company");
      }
    } catch {
      setSwitchingTo(null);
      setActiveCompanyName(null);
      toast.error("Network error");
    }
  }

  const canSwitch = user?.permissions?.includes("company:company:switch") ||
    user?.permissions?.includes("*") || user?.isSystemUser;

  // Always show a static label if user can't switch or only has one company
  if (!canSwitch || companies.length <= 1) {
    return (
      <div className="px-3 py-2">
        <div className="w-full flex items-center gap-2 rounded-md border border-sidebar-border bg-muted/40 px-3 py-2 text-sm text-sidebar-foreground">
          <Building2 className="h-4 w-4 shrink-0 text-muted-foreground" />
          <span className="truncate font-medium">{displayName}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="px-3 py-2">
      <DropdownMenu>
        <DropdownMenuTrigger
          disabled={isLoading}
          className="w-full flex items-center justify-between gap-2 rounded-md border border-sidebar-border bg-background px-3 py-2 text-sm font-medium text-sidebar-foreground hover:bg-sidebar-accent transition-colors disabled:opacity-70"
        >
          <span className="flex items-center gap-2 truncate">
            {isLoading ? (
              <Loader2 className="h-4 w-4 shrink-0 animate-spin" />
            ) : (
              <Building2 className="h-4 w-4 shrink-0" />
            )}
            <span className="truncate">{displayName}</span>
          </span>
          <ChevronDown className="h-3 w-3 shrink-0 opacity-60" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-56">
          {companies.map((company) => (
            <DropdownMenuItem
              key={company.id}
              onClick={() => switchCompany(company.id, company.name)}
              className="flex items-center justify-between cursor-pointer"
            >
              <span className="truncate">{company.name}</span>
              {company.id === (switchingTo ?? activeCompanyId) && (
                <Check className="h-4 w-4 text-primary shrink-0 ml-2" />
              )}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
