"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Plus } from "lucide-react";
import { PageHeader } from "@/components/shared/PageHeader";
import { DataTable } from "@/components/shared/DataTable";
import { SearchInput } from "@/components/shared/SearchInput";
import { PermissionGuard } from "@/components/shared/PermissionGuard";
import { Button } from "@/components/ui/button";
import { useDebounceSearch } from "@/hooks/useDebounceSearch";
import { formatDate, formatLiters, formatMoney } from "../_components/fuel-ui";

interface IssueRow {
  id: string;
  reference: string;
  quantityLiters: number;
  pricePerLiter: number | null;
  totalCost: number | null;
  odometerReading: number | null;
  issuedAt: string;
  tank?: { name: string; code: string; fuelType: string } | null;
  vehicle?: { plateNumber: string; make: string; model: string } | null;
  driver?: { employee?: { fullName: string } | null } | null;
}

const PAGE_SIZE = 20;

export default function FuelIssuesPage() {
  const [issues, setIssues] = useState<IssueRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const { value: search, setValue: setSearch, debounced } = useDebounceSearch();

  useEffect(() => { setPage(1); }, [debounced]);

  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams({ page: String(page), pageSize: String(PAGE_SIZE) });
    if (debounced) params.set("search", debounced);

    fetch(`/api/fuel-issues?${params}`)
      .then((res) => res.json())
      .then((json) => {
        setIssues(json.data ?? []);
        setTotal(json.meta?.total ?? 0);
      })
      .catch(() => toast.error("Failed to load fuel issues"))
      .finally(() => setLoading(false));
  }, [page, debounced]);

  const columns = [
    {
      key: "reference",
      header: "Reference",
      cell: (row: IssueRow) => (
        <Link href={`/fuel/issues/${row.id}`} className="font-mono text-xs bg-muted px-1.5 py-0.5 rounded hover:underline">
          {row.reference}
        </Link>
      ),
    },
    {
      key: "vehicle",
      header: "Vehicle",
      cell: (row: IssueRow) => <span className="font-medium">{row.vehicle?.plateNumber ?? "-"}</span>,
    },
    {
      key: "driver",
      header: "Driver",
      cell: (row: IssueRow) => <span className="text-sm text-muted-foreground">{row.driver?.employee?.fullName ?? "-"}</span>,
    },
    {
      key: "tank",
      header: "Tank",
      cell: (row: IssueRow) => <span className="text-sm">{row.tank?.name ?? "-"}</span>,
    },
    {
      key: "quantity",
      header: "Quantity",
      cell: (row: IssueRow) => <span>{formatLiters(row.quantityLiters)}</span>,
    },
    {
      key: "cost",
      header: "Cost",
      cell: (row: IssueRow) => <span className="text-sm text-muted-foreground">{formatMoney(row.totalCost)}</span>,
    },
    {
      key: "issued",
      header: "Issued",
      cell: (row: IssueRow) => <span className="text-sm text-muted-foreground">{formatDate(row.issuedAt)}</span>,
    },
  ];

  return (
    <div>
      <PageHeader
        title="Fuel Issues"
        description="Issue fuel to vehicles and track consumption"
        actions={
          <PermissionGuard require="fuel:issue:create">
            <Button asChild>
              <Link href="/fuel/issues/new">
                <Plus className="h-4 w-4 mr-2" />
                Issue Fuel
              </Link>
            </Button>
          </PermissionGuard>
        }
      />

      <div className="flex gap-3 mb-4 flex-wrap">
        <SearchInput value={search} onChange={setSearch} placeholder="Search reference or vehicle..." className="max-w-xs" />
      </div>

      <DataTable
        columns={columns}
        data={issues}
        loading={loading}
        page={page}
        pageSize={PAGE_SIZE}
        total={total}
        onPageChange={setPage}
        emptyTitle="No fuel issues found"
        emptyDescription="Issue fuel to a vehicle to start tracking consumption."
      />
    </div>
  );
}

