"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { format } from "date-fns";
import { Plus } from "lucide-react";
import { PageHeader } from "@/components/shared/PageHeader";
import { DataTable } from "@/components/shared/DataTable";
import { SearchInput } from "@/components/shared/SearchInput";
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

interface IssueRow {
  id: string;
  reference: string;
  vehicle?: { id: string; plateNumber: string; usageType?: string; nextRefuelAt?: string | null } | null;
  driver?: { id: string; firstName: string; lastName: string } | null;
  tank?: { id: string; name: string } | null;
  quantity: number;
  odometerReading: number | null;
  totalCost: number | null;
  issuedAt: string;
}

interface TankOption { id: string; name: string; }
interface VehicleOption { id: string; plateNumber: string; }

export default function IssuesPage() {
  const [issues, setIssues] = useState<IssueRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [tankFilter, setTankFilter] = useState("ALL");
  const [vehicleFilter, setVehicleFilter] = useState("ALL");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [tanks, setTanks] = useState<TankOption[]>([]);
  const [vehicles, setVehicles] = useState<VehicleOption[]>([]);
  const { value: search, setValue: setSearch, debounced } = useDebounceSearch();

  const PAGE_SIZE = 20;

  useEffect(() => {
    Promise.all([
      fetch("/api/fuel-tanks?pageSize=200").then((r) => r.json()),
      fetch("/api/vehicles?pageSize=200").then((r) => r.json()),
    ])
      .then(([tanksData, vehiclesData]) => {
        setTanks(tanksData.data ?? []);
        setVehicles(vehiclesData.data ?? []);
      })
      .catch(() => {});
  }, []);

  useEffect(() => { setPage(1); }, [debounced, tankFilter, vehicleFilter, fromDate, toDate]);

  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams({ page: String(page), pageSize: String(PAGE_SIZE) });
    if (debounced) params.set("search", debounced);
    if (tankFilter !== "ALL") params.set("tankId", tankFilter);
    if (vehicleFilter !== "ALL") params.set("vehicleId", vehicleFilter);
    if (fromDate) params.set("from", fromDate);
    if (toDate) params.set("to", toDate);
    fetch(`/api/fuel-issues?${params}`)
      .then((r) => r.json())
      .then((d) => {
        setIssues(d.data ?? []);
        setTotal(d.meta?.total ?? 0);
      })
      .catch(() => toast.error("Failed to load fuel issues"))
      .finally(() => setLoading(false));
  }, [page, debounced, tankFilter, vehicleFilter, fromDate, toDate]);

  const columns = [
    {
      key: "reference",
      header: "Reference",
      cell: (row: IssueRow) => (
        <code className="text-xs bg-muted px-1.5 py-0.5 rounded">{row.reference}</code>
      ),
    },
    {
      key: "vehicle",
      header: "Vehicle",
      cell: (row: IssueRow) => (
        <div>
          <span className="font-medium">{row.vehicle?.plateNumber ?? "—"}</span>
          {row.vehicle?.usageType === "PRIVATE" && row.vehicle?.nextRefuelAt && (
            <p className="text-xs text-amber-600">
              Refill by {format(new Date(row.vehicle.nextRefuelAt), "dd MMM yyyy")}
            </p>
          )}
        </div>
      ),
    },
    {
      key: "driver",
      header: "Driver",
      cell: (row: IssueRow) => (
        <span className="text-muted-foreground text-sm">
          {row.driver ? `${row.driver.firstName} ${row.driver.lastName}` : "—"}
        </span>
      ),
    },
    {
      key: "tank",
      header: "Tank",
      cell: (row: IssueRow) => (
        <span className="text-muted-foreground text-sm">{row.tank?.name ?? "—"}</span>
      ),
    },
    {
      key: "quantity",
      header: "Qty (L)",
      cell: (row: IssueRow) => <span>{row.quantity.toLocaleString()}</span>,
    },
    {
      key: "odometer",
      header: "Odometer",
      cell: (row: IssueRow) => (
        <span className="text-muted-foreground">
          {row.odometerReading != null ? `${row.odometerReading.toLocaleString()} km` : "—"}
        </span>
      ),
    },
    {
      key: "totalCost",
      header: "Total Cost",
      cell: (row: IssueRow) => (
        <span className="font-medium">
          {row.totalCost != null
            ? `$${row.totalCost.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
            : "—"}
        </span>
      ),
    },
    {
      key: "issuedAt",
      header: "Date",
      cell: (row: IssueRow) => (
        <span className="text-muted-foreground whitespace-nowrap">
          {format(new Date(row.issuedAt), "dd MMM yyyy")}
        </span>
      ),
    },
    {
      key: "actions",
      header: "Actions",
      cell: (row: IssueRow) => (
        <Button variant="outline" size="sm" asChild>
          <Link href={`/fuel/issues/${row.id}`}>View</Link>
        </Button>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="Fuel Issues"
        description="Track fuel issued to vehicles and drivers"
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
        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder="Search by reference..."
          className="max-w-xs"
        />
        <Select value={tankFilter} onValueChange={setTankFilter}>
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="All Tanks" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All Tanks</SelectItem>
            {tanks.map((t) => (
              <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={vehicleFilter} onValueChange={setVehicleFilter}>
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="All Vehicles" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All Vehicles</SelectItem>
            {vehicles.map((v) => (
              <SelectItem key={v.id} value={v.id}>{v.plateNumber}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <input
          type="date"
          value={fromDate}
          onChange={(e) => setFromDate(e.target.value)}
          className="h-10 border rounded px-2 text-sm"
          title="From date"
        />
        <input
          type="date"
          value={toDate}
          onChange={(e) => setToDate(e.target.value)}
          className="h-10 border rounded px-2 text-sm"
          title="To date"
        />
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
        emptyDescription="Issue fuel to a vehicle to get started."
      />
    </div>
  );
}
