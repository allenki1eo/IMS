"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Plus, Upload } from "lucide-react";
import { format, differenceInDays } from "date-fns";
import { PageHeader } from "@/components/shared/PageHeader";
import { DataTable } from "@/components/shared/DataTable";
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

interface DriverRow {
  id: string;
  isAvailable: boolean;
  status: string;
  licenseNumber: string | null;
  licenseClass: string | null;
  licenseExpiry: string | null;
  medicalExpiry: string | null;
  employee?: {
    firstName: string;
    lastName: string;
    employeeNo: string;
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
  const [drivers, setDrivers] = useState<DriverRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [availabilityFilter, setAvailabilityFilter] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [importOpen, setImportOpen] = useState(false);
  const { value: search, setValue: setSearch, debounced } = useDebounceSearch();

  useEffect(() => { setPage(1); }, [debounced, availabilityFilter, statusFilter]);

  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams({ page: String(page), pageSize: String(PAGE_SIZE) });
    if (debounced) params.set("search", debounced);
    if (availabilityFilter === "AVAILABLE") params.set("isAvailable", "true");
    if (availabilityFilter === "UNAVAILABLE") params.set("isAvailable", "false");
    if (statusFilter !== "ALL") params.set("status", statusFilter);

    fetch(`/api/drivers?${params}`)
      .then((r) => r.json())
      .then((d) => {
        setDrivers(d.data ?? []);
        setTotal(d.meta?.total ?? 0);
      })
      .catch(() => toast.error("Failed to load drivers"))
      .finally(() => setLoading(false));
  }, [page, debounced, availabilityFilter, statusFilter]);

  const columns = [
    {
      key: "name",
      header: "Employee Name",
      cell: (row: DriverRow) => {
        const emp = row.employee;
        return (
          <span className="font-medium">
            {emp ? `${emp.firstName} ${emp.lastName}` : "—"}
          </span>
        );
      },
    },
    {
      key: "employeeNo",
      header: "Employee No",
      cell: (row: DriverRow) => (
        <code className="text-xs bg-muted px-1.5 py-0.5 rounded">
          {row.employee?.employeeNo ?? "—"}
        </code>
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
        <Button variant="outline" size="sm" asChild>
          <Link href={`/transport/drivers/${row.id}`}>View</Link>
        </Button>
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

      <DataTable
        columns={columns}
        data={drivers}
        loading={loading}
        page={page}
        pageSize={PAGE_SIZE}
        total={total}
        onPageChange={setPage}
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
        templateHeaders={["employeeId", "licenseNumber", "licenseClass", "licenseExpiry"]}
        templateFilename="drivers-import-template"
        instructions={[
          "employeeId is required (the employee's database ID)",
          "licenseExpiry format: YYYY-MM-DD",
          "The employee must already exist in the system",
        ]}
      />
    </div>
  );
}
