"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Plus, Upload, Trash2 } from "lucide-react";
import { format, differenceInDays } from "date-fns";
import { PageHeader } from "@/components/shared/PageHeader";
import { DataTable } from "@/components/shared/DataTable";
import { BulkActionBar } from "@/components/shared/BulkActionBar";
import { SearchInput } from "@/components/shared/SearchInput";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { PermissionGuard } from "@/components/shared/PermissionGuard";
import { ImportModal } from "@/components/shared/ImportModal";
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
import { ConfirmDeleteDialog } from "@/components/shared/ConfirmDeleteDialog";
import { usePagedData } from "@/hooks/usePagedData";

interface DriverRow {
  id: string;
  isAvailable: boolean;
  status: string;
  firstName: string | null;
  lastName: string | null;
  phone: string | null;
  licenseNumber: string | null;
  licenseClass: string | null;
  licenseExpiry: string | null;
  medicalExpiry: string | null;
  employee?: {
    fullName: string;
    employeeNumber: string;
  } | null;
}

const PAGE_SIZE = 20;

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

export default function DriversPage() {
  const [page, setPage] = useState(1);
  const [availabilityFilter, setAvailabilityFilter] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [importOpen, setImportOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [bulkLoading, setBulkLoading] = useState(false);
  const { value: search, setValue: setSearch, debounced } = useDebounceSearch();

  useEffect(() => { setPage(1); }, [debounced, availabilityFilter, statusFilter]);

  const params = new URLSearchParams({ page: String(page), pageSize: String(PAGE_SIZE) });
  if (debounced) params.set("search", debounced);
  if (availabilityFilter === "AVAILABLE") params.set("isAvailable", "true");
  if (availabilityFilter === "UNAVAILABLE") params.set("isAvailable", "false");
  if (statusFilter !== "ALL") params.set("status", statusFilter);
  const url = `/api/drivers?${params}`;
  const { data: drivers, total, loading, mutate } = usePagedData<DriverRow>(url);

  async function handleBulkAction(status: "ACTIVE" | "INACTIVE") {
    setBulkLoading(true);
    try {
      const res = await fetch("/api/drivers/bulk", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: selectedIds, status }),
      });
      const json = await res.json();
      if (!res.ok) { toast.error(json.error ?? "Bulk action failed"); return; }
      toast.success(`${json.data?.updated ?? selectedIds.length} driver(s) set to ${status.toLowerCase()}`);
      setSelectedIds([]);
      mutate();
    } catch {
      toast.error("Network error");
    } finally {
      setBulkLoading(false);
    }
  }

  async function handleDelete() {
    if (!deleteId) return;
    const res = await fetch(`/api/drivers/${deleteId}`, { method: "DELETE" });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      toast.error(data.error ?? "Failed to delete driver");
      return;
    }
    toast.success("Driver deleted");
    setDeleteId(null);
    mutate();
  }

  const columns = [
    {
      key: "name",
      header: "Driver Name",
      cell: (row: DriverRow) => {
        const name = row.employee?.fullName ??
          ([row.firstName, row.lastName].filter(Boolean).join(" ") || "—");
        return <span className="font-medium">{name}</span>;
      },
    },
    {
      key: "employeeNo",
      header: "Employee No",
      cell: (row: DriverRow) => (
        row.employee ? (
          <code className="text-xs bg-muted px-1.5 py-0.5 rounded">
            {row.employee.employeeNumber}
          </code>
        ) : (
          <span className="text-muted-foreground text-sm">—</span>
        )
      ),
    },
    {
      key: "licenseNumber",
      header: "License No",
      cell: (row: DriverRow) => (
        <span className="text-sm font-mono">{row.licenseNumber ?? "—"}</span>
      ),
    },
    {
      key: "licenseClass",
      header: "Class",
      cell: (row: DriverRow) => (
        <Badge variant="secondary">{row.licenseClass ?? "—"}</Badge>
      ),
    },
    {
      key: "licenseExpiry",
      header: "License Expiry",
      cell: (row: DriverRow) => <ExpiryCell date={row.licenseExpiry} />,
    },
    {
      key: "medicalExpiry",
      header: "Medical Expiry",
      cell: (row: DriverRow) => <ExpiryCell date={row.medicalExpiry} />,
    },
    {
      key: "isAvailable",
      header: "Available",
      cell: (row: DriverRow) => (
        <Badge variant={row.isAvailable ? "success" : "destructive"}>
          {row.isAvailable ? "Yes" : "No"}
        </Badge>
      ),
    },
    {
      key: "status",
      header: "Status",
      cell: (row: DriverRow) => <StatusBadge status={row.status} />,
    },
    {
      key: "actions",
      header: "Actions",
      cell: (row: DriverRow) => (
        <div className="flex gap-1">
          <Button variant="outline" size="sm" asChild>
            <Link href={`/transport/drivers/${row.id}`}>View</Link>
          </Button>
          <PermissionGuard require="transport:driver:delete">
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
        title="Drivers"
        description="Manage fleet drivers and their license details"
        actions={
          <PermissionGuard require="transport:driver:create">
            <div className="flex items-center gap-2">
              <Button variant="outline" onClick={() => setImportOpen(true)}>
                <Upload className="h-4 w-4 mr-2" />
                Import CSV
              </Button>
              <Button asChild>
                <Link href="/transport/drivers/new">
                  <Plus className="h-4 w-4 mr-2" />
                  Register Driver
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
          placeholder="Search name, license..."
          className="max-w-xs"
        />
        <Select value={availabilityFilter} onValueChange={setAvailabilityFilter}>
          <SelectTrigger className="w-full sm:w-[160px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All Availability</SelectItem>
            <SelectItem value="AVAILABLE">Available</SelectItem>
            <SelectItem value="UNAVAILABLE">Unavailable</SelectItem>
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-[140px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All Status</SelectItem>
            <SelectItem value="ACTIVE">Active</SelectItem>
            <SelectItem value="INACTIVE">Inactive</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <BulkActionBar
        selected={selectedIds}
        onClear={() => setSelectedIds([])}
        actions={[
          { label: "Set Active", onClick: () => handleBulkAction("ACTIVE"), loading: bulkLoading },
          { label: "Set Inactive", variant: "destructive", onClick: () => handleBulkAction("INACTIVE"), loading: bulkLoading },
        ]}
      />

      <DataTable
        columns={columns}
        data={drivers}
        loading={loading}
        page={page}
        pageSize={PAGE_SIZE}
        total={total}
        onPageChange={setPage}
        selectable
        onSelectionChange={setSelectedIds}
        emptyTitle="No drivers found"
        emptyDescription="Register your first driver to get started."
      />

      <ImportModal
        open={importOpen}
        onClose={() => setImportOpen(false)}
        onSuccess={() => {
          setImportOpen(false);
          setPage(1);
        }}
        title="Import Drivers"
        apiEndpoint="/api/drivers/import"
        templateHeaders={[
          "firstName",
          "lastName",
          "phone",
          "email",
          "licenseNumber",
          "licenseClass",
          "licenseExpiry",
          "medicalExpiry",
          "notes",
        ]}
        templateFilename="drivers-import-template"
        instructions={[
          "firstName is required for every row",
          "licenseExpiry and medicalExpiry format: YYYY-MM-DD",
          "licenseClass options: A, B, C, D, EC, EC+E",
          "All other columns are optional",
        ]}
      />

      <ConfirmDeleteDialog
        open={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={handleDelete}
        title="Delete Driver"
        description="Are you sure you want to delete this driver? This action cannot be undone."
      />
    </div>
  );
}
