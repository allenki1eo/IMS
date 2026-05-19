"use client";

import { useState, useEffect } from "react";
import { Building2, ChevronDown, Check } from "lucide-react";
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
  const [activeCompanyId, setActiveCompanyId] = useState<string | null>(null);
  const [activeCompanyName, setActiveCompanyName] = useState<string | null>(null);

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
  const activeCompany = companies.find((c) => c.id === activeCompanyId);
  const displayName = activeCompany?.name ?? activeCompanyName ?? "Loading…";

  async function switchCompany(companyId: string) {
    try {
      const res = await fetch("/api/company/switch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ companyId }),
      });
      const json = await res.json();
      if (res.ok) {
        setActiveCompanyId(companyId);
        setActiveCompanyName(json.data.name);
        toast.success(`Switched to ${json.data.name}`);
        window.location.reload();
      } else {
        toast.error(json.error ?? "Failed to switch company");
      }
    } catch {
      toast.error("Network error");
    }
  }

  // Single company — show as non-interactive label so user always knows the context
  if (companies.length <= 1) {
    return (
      <div className="px-3 py-2">
        <div className="w-full flex items-center gap-2 rounded-md border border-sidebar-border bg-muted/40 px-3 py-2 text-sm text-sidebar-foreground">
          <Building2 className="h-4 w-4 shrink-0 text-muted-foreground" />
          <span className="truncate font-medium">{displayName}</span>
        </div>
      </div>
    );
  }

  // Multiple companies — show switchable dropdown
  return (
    <div className="px-3 py-2">
      <DropdownMenu>
        <DropdownMenuTrigger className="w-full flex items-center justify-between gap-2 rounded-md border border-sidebar-border bg-background px-3 py-2 text-sm font-medium text-sidebar-foreground hover:bg-sidebar-accent transition-colors">
          <span className="flex items-center gap-2 truncate">
            <Building2 className="h-4 w-4 shrink-0" />
            <span className="truncate">{displayName}</span>
          </span>
          <ChevronDown className="h-3 w-3 shrink-0 opacity-60" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-56">
          {companies.map((company) => (
            <DropdownMenuItem
              key={company.id}
              onClick={() => switchCompany(company.id)}
              className="flex items-center justify-between cursor-pointer"
            >
              <span className="truncate">{company.name}</span>
              {company.id === activeCompanyId && (
                <Check className="h-4 w-4 text-primary shrink-0 ml-2" />
              )}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
