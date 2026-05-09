"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Plus } from "lucide-react";
import { PageHeader } from "@/components/shared/PageHeader";
import { DataTable } from "@/components/shared/DataTable";
import { SearchInput } from "@/components/shared/SearchInput";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { PermissionGuard } from "@/components/shared/PermissionGuard";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useDebounceSearch } from "@/hooks/useDebounceSearch";
import { FUEL_TYPES, FuelLevelBadge, formatLiters } from "../_components/fuel-ui";

interface TankRow {
  id: string;
  name: string;
  code: string;
  fuelType: string;
  capacity: number;
  currentLevel: number;
  minLevel: number;
  isActive: boolean;
  _count?: { receipts: number; issues: number };
}

export default function FuelTanksPage() {
  const [tanks, setTanks] = useState<TankRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [fuelType, setFuelType] = useState("ALL");
  const [status, setStatus] = useState("ALL");
  const { value: search, setValue: setSearch, debounced } = useDebounceSearch();

  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams();
    if (debounced) params.set("search", debounced);
    if (fuelType !== "ALL") params.set("fuelType", fuelType);
    if (status !== "ALL") params.set("isActive", status);

    fetch(`/api/fuel-tanks?${params}`)
      .then((res) => res.json())
      .then((json) => setTanks(json.data ?? []))
      .catch(() => toast.error("Failed to load fuel tanks"))
      .finally(() => setLoading(false));
  }, [debounced, fuelType, status]);

  const columns = [
    {
      key: "code",
      header: "Code",
      cell: (row: TankRow) => <code className="text-xs bg-muted px-1.5 py-0.5 rounded">{row.code}</code>,
    },
    {
      key: "name",
      header: "Tank",
      cell: (row: TankRow) => <span className="font-medium">{row.name}</span>,
    },
    {
      key: "fuelType",
      header: "Fuel Type",
      cell: (row: TankRow) => <Badge variant="secondary">{row.fuelType}</Badge>,
    },
    {
      key: "level",
      header: "Current Level",
      cell: (row: TankRow) => (
        <FuelLevelBadge currentLevel={row.currentLevel} capacity={row.capacity} minLevel={row.minLevel} />
      ),
    },
    {
      key: "capacity",
      header: "Capacity",
      cell: (row: TankRow) => <span className="text-sm text-muted-foreground">{formatLiters(row.capacity)}</span>,
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
        description="Manage tank capacity, active status, and current fuel levels"
        actions={
          <PermissionGuard require="fuel:tank:create">
            <Button asChild>
              <Link href="/fuel/tanks/new">
                <Plus className="h-4 w-4 mr-2" />
                New Tank
              </Link>
            </Button>
          </PermissionGuard>
        }
      />

      <div className="flex gap-3 mb-4 flex-wrap">
        <SearchInput value={search} onChange={setSearch} placeholder="Search tank or code..." className="max-w-xs" />
        <Select value={fuelType} onValueChange={setFuelType}>
          <SelectTrigger className="w-[150px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All Fuel</SelectItem>
            {FUEL_TYPES.map((type) => (
              <SelectItem key={type.value} value={type.value}>{type.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger className="w-[140px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All Status</SelectItem>
            <SelectItem value="true">Active</SelectItem>
            <SelectItem value="false">Inactive</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <DataTable
        columns={columns}
        data={tanks}
        loading={loading}
        emptyTitle="No fuel tanks found"
        emptyDescription="Create a tank before recording receipts or fuel issues."
      />
    </div>
  );
}

