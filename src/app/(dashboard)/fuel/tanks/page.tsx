"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Plus, AlertTriangle, Trash2 } from "lucide-react";
import { ConfirmDeleteDialog } from "@/components/shared/ConfirmDeleteDialog";
import { PageHeader } from "@/components/shared/PageHeader";
import { DataTable } from "@/components/shared/DataTable";
import { SearchInput } from "@/components/shared/SearchInput";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { PermissionGuard } from "@/components/shared/PermissionGuard";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useDebounceSearch } from "@/hooks/useDebounceSearch";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { usePagedData } from "@/hooks/usePagedData";

interface TankRow {
  id: string;
  name: string;
  companyId: string;
  code: string;
  fuelType: string;
  capacity: number;
  currentLevel: number;
  minLevel: number;
  isActive: boolean;
}

const FUEL_TYPE_FILTERS = [
  { label: "All Types", value: "ALL" },
  { label: "Diesel", value: "DIESEL" },
  { label: "Petrol", value: "PETROL" },
  { label: "Petrol 95", value: "PETROL_95" },
  { label: "Petrol 93", value: "PETROL_93" },
  { label: "Electric", value: "ELECTRIC" },
];

function fillPctColor(pct: number): string {
  if (pct > 50) return "text-green-600";
  if (pct > 25) return "text-amber-600";
  return "text-red-600";
}

export default function TanksPage() {
  const [page, setPage] = useState(1);
  const [fuelType, setFuelType] = useState("ALL");
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const { value: search, setValue: setSearch, debounced } = useDebounceSearch();
  const { user } = useCurrentUser();
  const companyMap = Object.fromEntries((user?.companies ?? []).map((c) => [c.id, c.name]));

  const PAGE_SIZE = 20;

  useEffect(() => { setPage(1); }, [debounced, fuelType]);

  const params = new URLSearchParams({ page: String(page), pageSize: String(PAGE_SIZE) });
  if (debounced) params.set("search", debounced);
  if (fuelType !== "ALL") params.set("fuelType", fuelType);
  const url = `/api/fuel-tanks?${params}`;

  const { data: tanks, total, loading, mutate } = usePagedData<TankRow>(url);

  async function handleDelete() {
    if (!deleteId) return;
    const res = await fetch(`/api/fuel-tanks/${deleteId}`, { method: "DELETE" });
    if (res.ok) {
      toast.success("Tank deleted");
      setDeleteId(null);
      mutate();
    } else {
      const d = await res.json().catch(() => ({}));
      toast.error(d.message ?? "Failed to delete tank");
    }
  }

  const columns = [
    {
      key: "name",
      header: "Name",
      cell: (row: TankRow) => (
        <div className="flex items-center gap-2">
          <Link href={`/fuel/tanks/${row.id}`} className="font-semibold hover:underline">
            {row.name}
          </Link>
          {row.currentLevel < row.minLevel && (
            <AlertTriangle className="h-4 w-4 text-amber-500" />
          )}
        </div>
      ),
    },
    {
      key: "companyId",
      header: "Company",
      cell: (row: TankRow) => (
        <span className="text-xs bg-muted px-2 py-0.5 rounded-full font-medium truncate max-w-[120px] block">
          {companyMap[row.companyId] ?? "—"}
        </span>
      ),
    },
    {
      key: "code",
      header: "Code",
      cell: (row: TankRow) => (
        <code className="text-xs bg-muted px-1.5 py-0.5 rounded">{row.code}</code>
      ),
    },
    {
      key: "fuelType",
      header: "Fuel Type",
      cell: (row: TankRow) => <span className="text-sm">{row.fuelType.replace(/_/g, " ")}</span>,
    },
    {
      key: "capacity",
      header: "Capacity (L)",
      cell: (row: TankRow) => <span>{row.capacity.toLocaleString()}</span>,
    },
    {
      key: "currentLevel",
      header: "Current Level (L)",
      cell: (row: TankRow) => <span>{row.currentLevel.toLocaleString()}</span>,
    },
    {
      key: "fillPct",
      header: "Fill %",
      cell: (row: TankRow) => {
        const pct = row.capacity > 0 ? (row.currentLevel / row.capacity) * 100 : 0;
        return (
          <span className={`font-semibold ${fillPctColor(pct)}`}>
            {pct.toFixed(1)}%
          </span>
        );
      },
    },
    {
      key: "minLevel",
      header: "Min Level (L)",
      cell: (row: TankRow) => <span className="text-muted-foreground">{row.minLevel.toLocaleString()}</span>,
    },
    {
      key: "status",
      header: "Status",
      cell: (row: TankRow) => <StatusBadge status={row.isActive} />,
    },
    {
      key: "actions",
      header: "Actions",
      cell: (row: TankRow) => (
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" asChild>
            <Link href={`/fuel/tanks/${row.id}`}>View</Link>
          </Button>
          <Button variant="ghost" size="sm" onClick={() => setDeleteId(row.id)}>
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="Fuel Tanks"
        description="Manage fuel storage tanks and monitor levels"
        actions={
          <PermissionGuard require="fuel:tank:create">
            <Button asChild>
              <Link href="/fuel/tanks/new">
                <Plus className="h-4 w-4 mr-2" />
                Add Tank
              </Link>
            </Button>
          </PermissionGuard>
        }
      />

      <div className="flex flex-wrap gap-2 mb-4">
        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder="Search by name or code..."
          className="w-full sm:max-w-xs"
        />
        <Select value={fuelType} onValueChange={setFuelType}>
          <SelectTrigger className="w-full sm:w-[160px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {FUEL_TYPE_FILTERS.map((f) => (
              <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <DataTable
        columns={columns}
        data={tanks}
        loading={loading}
        page={page}
        pageSize={PAGE_SIZE}
        total={total}
        onPageChange={setPage}
        emptyTitle="No tanks found"
        emptyDescription="Add your first fuel tank to get started."
      />
      <ConfirmDeleteDialog open={!!deleteId} onClose={() => setDeleteId(null)} onConfirm={handleDelete} />
    </div>
  );
}
