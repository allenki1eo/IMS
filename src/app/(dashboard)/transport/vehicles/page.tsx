"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Plus, Upload, Trash2 } from "lucide-react";
import { format, differenceInDays } from "date-fns";
import { PageHeader } from "@/components/shared/PageHeader";
import { DataTable } from "@/components/shared/DataTable";
import { SearchInput } from "@/components/shared/SearchInput";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { PermissionGuard } from "@/components/shared/PermissionGuard";
import { ImportModal } from "@/components/shared/ImportModal";
import { ConfirmDeleteDialog } from "@/components/shared/ConfirmDeleteDialog";
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
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { usePagedData } from "@/hooks/usePagedData";

interface VehicleRow {
  id: string;
  plateNumber: string;
  companyId: string;
  make: string;
  model: string;
  vehicleType: string;
  usageType: string;
  capacity: number | null;
  status: string;
  insuranceExpiry: string | null;
}

const PAGE_SIZE = 20;

const VEHICLE_TYPES = [
  { value: "ALL", label: "All Types" },
  { value: "TRUCK", label: "Truck" },
  { value: "VAN", label: "Van" },
  { value: "CAR", label: "Car" },
  { value: "MOTORCYCLE", label: "Motorcycle" },
  { value: "TRAILER", label: "Trailer" },
];

const STATUSES = [
  { value: "ALL", label: "All Status" },
  { value: "ACTIVE", label: "Active" },
  { value: "INACTIVE", label: "Inactive" },
  { value: "IN_REPAIR", label: "In Repair" },
  { value: "RETIRED", label: "Retired" },
];

function ExpiryCell({ date }: { date: string | null }) {
  if (!date) return <span className="text-muted-foreground text-sm">—</span>;
  const days = differenceInDays(new Date(date), new Date());
  const formatted = format(new Date(date), "dd MMM yyyy");
  if (days <= 30) {
    return (
      <span className={`text-sm font-medium ${days < 0 ? "text-red-600" : "text-amber-600"}`}>
        {formatted}
        <span className="ml-1 text-xs">({days < 0 ? "Expired" : `${days}d`})</span>
      </span>
    );
  }
  return <span className="text-sm text-muted-foreground">{formatted}</span>;
}

export default function VehiclesPage() {
  const [page, setPage] = useState(1);
  const [typeFilter, setTypeFilter] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [importOpen, setImportOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const { value: search, setValue: setSearch, debounced } = useDebounceSearch();
  const { user } = useCurrentUser();
  const companyMap = Object.fromEntries((user?.companies ?? []).map((c) => [c.id, c.name]));

  useEffect(() => { setPage(1); }, [debounced, typeFilter, statusFilter]);

  const params = new URLSearchParams({ page: String(page), pageSize: String(PAGE_SIZE) });
  if (debounced) params.set("search", debounced);
  if (typeFilter !== "ALL") params.set("vehicleType", typeFilter);
  if (statusFilter !== "ALL") params.set("status", statusFilter);
  const url = `/api/vehicles?${params}`;
  const { data: vehicles, total, loading, mutate } = usePagedData<VehicleRow>(url);

  async function handleDelete() {
    if (!deleteId) return;
    const res = await fetch(`/api/vehicles/${deleteId}`, { method: "DELETE" });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      toast.error(data.error ?? "Failed to delete vehicle");
      return;
    }
    toast.success("Vehicle deleted");
    setDeleteId(null);
    mutate();
  }

  const columns = [
    {
      key: "plateNumber",
      header: "Plate",
      cell: (row: VehicleRow) => (
        <code className="text-xs bg-muted px-1.5 py-0.5 rounded font-semibold">{row.plateNumber}</code>
      ),
    },
    {
      key: "companyId",
      header: "Company",
      cell: (row: VehicleRow) => (
        <span className="text-xs bg-muted px-2 py-0.5 rounded-full font-medium truncate max-w-[120px] block">
          {companyMap[row.companyId] ?? "—"}
        </span>
      ),
    },
    {
      key: "makeModel",
      header: "Make & Model",
      cell: (row: VehicleRow) => (
        <span className="font-medium">{row.make} {row.model}</span>
      ),
    },
    {
      key: "vehicleType",
      header: "Type",
      cell: (row: VehicleRow) => (
        <Badge variant="secondary">{row.vehicleType}</Badge>
      ),
    },
    {
      key: "usageType",
      header: "Usage",
      cell: (row: VehicleRow) => (
        <Badge variant={row.usageType === "PRIVATE" ? "default" : "outline"}>{row.usageType}</Badge>
      ),
    },
    {
      key: "capacity",
      header: "Capacity (t)",
      cell: (row: VehicleRow) => (
        <span className="text-sm text-muted-foreground">
          {row.capacity != null ? row.capacity : "—"}
        </span>
      ),
    },
    {
      key: "status",
      header: "Status",
      cell: (row: VehicleRow) => <StatusBadge status={row.status} />,
    },
    {
      key: "insuranceExpiry",
      header: "Insurance Expiry",
      cell: (row: VehicleRow) => <ExpiryCell date={row.insuranceExpiry} />,
    },
    {
      key: "actions",
      header: "Actions",
      cell: (row: VehicleRow) => (
        <div className="flex gap-1">
          <Button variant="outline" size="sm" asChild>
            <Link href={`/transport/vehicles/${row.id}`}>View</Link>
          </Button>
          <PermissionGuard require="transport:vehicle:delete">
            <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive" onClick={() => setDeleteId(row.id)}>
              <Trash2 className="h-4 w-4" />
            </Button>
          </PermissionGuard>
        </div>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="Vehicles"
        description="Manage fleet vehicles and their details"
        actions={
          <PermissionGuard require="transport:vehicle:create">
            <div className="flex items-center gap-2">
              <Button variant="outline" onClick={() => setImportOpen(true)}>
                <Upload className="h-4 w-4 mr-2" />
                Import CSV
              </Button>
              <Button asChild>
                <Link href="/transport/vehicles/new">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Vehicle
                </Link>
              </Button>
            </div>
          </PermissionGuard>
        }
      />

      <div className="flex flex-wrap gap-2 mb-4 flex-wrap">
        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder="Search plate, make, model..."
          className="max-w-xs"
        />
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-full sm:w-[150px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {VEHICLE_TYPES.map((t) => (
              <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-[140px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {STATUSES.map((s) => (
              <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <DataTable
        columns={columns}
        data={vehicles}
        loading={loading}
        page={page}
        pageSize={PAGE_SIZE}
        total={total}
        onPageChange={setPage}
        emptyTitle="No vehicles found"
        emptyDescription="Add your first vehicle to the fleet."
      />

      <ImportModal
        open={importOpen}
        onClose={() => setImportOpen(false)}
        onSuccess={() => {
          setImportOpen(false);
          setPage(1);
        }}
        title="Import Vehicles"
        apiEndpoint="/api/vehicles/import"
        templateHeaders={["plateNumber", "make", "model", "year", "vehicleType", "color", "chassisNumber", "engineNumber", "fuelType", "capacity"]}
        templateFilename="vehicles-import-template"
        instructions={[
          "plateNumber, make, and model are required",
          "vehicleType: TRUCK, VAN, CAR, MOTORCYCLE, TRAILER (default: TRUCK)",
          "fuelType: DIESEL, PETROL, ELECTRIC, HYBRID (default: DIESEL)",
          "year and capacity are optional numbers",
        ]}
      />

      <ConfirmDeleteDialog
        open={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={handleDelete}
        title="Delete Vehicle"
        description="Are you sure you want to delete this vehicle? This action cannot be undone."
      />
    </div>
  );
}
