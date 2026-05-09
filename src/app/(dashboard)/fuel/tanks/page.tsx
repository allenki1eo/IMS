"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Plus, AlertTriangle } from "lucide-react";
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

interface TankRow {
  id: string;
  name: string;
  code: string;
  fuelType: string;
  capacity: number;
  currentLevel: number;
  minLevel: number;
  status: string;
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
  const [tanks, setTanks] = useState<TankRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [fuelType, setFuelType] = useState("ALL");
  const { value: search, setValue: setSearch, debounced } = useDebounceSearch();

  const PAGE_SIZE = 20;

  useEffect(() => { setPage(1); }, [debounced, fuelType]);

  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams({ page: String(page), pageSize: String(PAGE_SIZE) });
    if (debounced) params.set("search", debounced);
    if (fuelType !== "ALL") params.set("fuelType", fuelType);
    fetch(`/api/fuel-tanks?${params}`)
      .then((r) => r.json())
      .then((d) => {
        setTanks(d.data ?? []);
        setTotal(d.meta?.total ?? 0);
      })
      .catch(() => toast.error("Failed to load tanks"))
      .finally(() => setLoading(false));
  }, [page, debounced, fuelType]);

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
      cell: (row: TankRow) => <StatusBadge status={row.status} />,
    },
    {
      key: "actions",
      header: "Actions",
      cell: (row: TankRow) => (
        <Button variant="outline" size="sm" asChild>
          <Link href={`/fuel/tanks/${row.id}`}>View</Link>
        </Button>
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

      <div className="flex gap-3 mb-4 flex-wrap">
        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder="Search by name or code..."
          className="max-w-sm"
        />
        <Select value={fuelType} onValueChange={setFuelType}>
          <SelectTrigger className="w-[160px]">
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
    </div>
  );
}
