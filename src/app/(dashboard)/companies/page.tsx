"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Building2, Plus } from "lucide-react";
import { PageHeader } from "@/components/shared/PageHeader";
import { LoadingState } from "@/components/shared/LoadingState";
import { PermissionGuard } from "@/components/shared/PermissionGuard";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";

interface Company {
  id: string;
  name: string;
  legalName: string | null;
  registrationNumber: string | null;
  taxNumber: string | null;
  city: string | null;
  country: string | null;
  currency: string;
  isActive: boolean;
}

export default function CompaniesPage() {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/companies")
      .then((r) => r.json())
      .then((d) => {
        if (d.data) setCompanies(d.data);
      })
      .catch(() => toast.error("Failed to load companies"))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <LoadingState />;

  return (
    <div>
      <PageHeader
        title="Companies"
        description="Manage your organisations"
        actions={
          <PermissionGuard require="company:company:create">
            <Link href="/companies/new">
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                New Company
              </Button>
            </Link>
          </PermissionGuard>
        }
      />

      <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
        {companies.map((company) => (
          <Card key={company.id}>
            <CardHeader className="flex flex-row items-center gap-3 pb-2">
              <Building2 className="h-5 w-5 text-muted-foreground" />
              <div className="min-w-0">
                <CardTitle className="text-base truncate">{company.name}</CardTitle>
                {company.legalName && (
                  <p className="text-xs text-muted-foreground truncate">{company.legalName}</p>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
                {company.city && <span>{company.city}</span>}
                {company.country && <span>{company.country}</span>}
                <span className="font-medium text-foreground">{company.currency}</span>
              </div>
              <div className="flex items-center justify-between pt-2">
                <span
                  className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                    company.isActive
                      ? "bg-green-100 text-green-700"
                      : "bg-gray-100 text-gray-700"
                  }`}
                >
                  {company.isActive ? "Active" : "Inactive"}
                </span>
                <PermissionGuard require="company:company:update">
                  <Link href={`/company`}>
                    <Button variant="ghost" size="sm">
                      Manage
                    </Button>
                  </Link>
                </PermissionGuard>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {companies.length === 0 && (
        <p className="text-sm text-muted-foreground text-center py-12">
          No companies found. Create your first company to get started.
        </p>
      )}
    </div>
  );
}
