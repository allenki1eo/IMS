"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Plus } from "lucide-react";
import { PageHeader } from "@/components/shared/PageHeader";
import { DataTable } from "@/components/shared/DataTable";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { SearchInput } from "@/components/shared/SearchInput";
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

interface EmployeeRow {
  id: string;
  employeeNumber: string;
  firstName: string;
  lastName: string;
  position: string | null;
  status: string;
  isDriver: boolean;
  department?: { id: string; name: string } | null;
}

const STATUS_FILTERS = [
  { label: "All", value: "ALL" },
  { label: "Active", value: "ACTIVE" },
  { label: "Inactive", value: "INACTIVE" },
  { label: "On Leave", value: "ON_LEAVE" },
  { label: "Terminated", value: "TERMINATED" },
];

export default function EmployeesPage() {
  const [employees, setEmployees] = useState<EmployeeRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [statusFilter, setStatusFilter] = useState("ALL");
  const { value: search, setValue: setSearch, debounced } = useDebounceSearch();

  const PAGE_SIZE = 20;

  useEffect(() => { setPage(1); }, [debounced, statusFilter]);

  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams({ page: String(page), pageSize: String(PAGE_SIZE) });
    if (debounced) params.set("search", debounced);
    if (statusFilter !== "ALL") params.set("status", statusFilter);
    fetch(`/api/employees?${params}`)
      .then((r) => r.json())
      .then((d) => {
        setEmployees(d.data ?? []);
        setTotal(d.meta?.total ?? 0);
      })
      .catch(() => toast.error("Failed to load employees"))
      .finally(() => setLoading(false));
  }, [page, debounced, statusFilter]);

  const columns = [
    {
      key: "employeeNumber",
      header: "Employee #",
      cell: (row: EmployeeRow) => (
        <code className="text-xs bg-muted px-1.5 py-0.5 rounded">{row.employeeNumber}</code>
      ),
    },
    {
      key: "fullName",
      header: "Full Name",
      cell: (row: EmployeeRow) => (
        <span className="font-semibold">{row.firstName} {row.lastName}</span>
      ),
    },
    {
      key: "position",
      header: "Position",
      cell: (row: EmployeeRow) => (
        <span className="text-muted-foreground text-sm">{row.position ?? "—"}</span>
      ),
    },
    {
      key: "department",
      header: "Department",
      cell: (row: EmployeeRow) => (
        <span className="text-muted-foreground text-sm">{row.department?.name ?? "—"}</span>
      ),
    },
    {
      key: "status",
      header: "Status",
      cell: (row: EmployeeRow) => <StatusBadge status={row.status} />,
    },
    {
      key: "isDriver",
      header: "Driver",
      cell: (row: EmployeeRow) =>
        row.isDriver ? <Badge variant="secondary">Driver</Badge> : null,
    },
    {
      key: "actions",
      header: "Actions",
      cell: (row: EmployeeRow) => (
        <Button variant="outline" size="sm" asChild>
          <Link href={`/employees/${row.id}`}>View</Link>
        </Button>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="Employees"
        description="Manage company employees"
        actions={
          <PermissionGuard require="employees:employee:create">
            <Button asChild>
              <Link href="/employees/new">
                <Plus className="h-4 w-4 mr-2" />
                Add Employee
              </Link>
            </Button>
          </PermissionGuard>
        }
      />

      <div className="flex gap-3 mb-4 flex-wrap">
        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder="Search by name or employee number..."
          className="max-w-sm"
        />
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[140px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {STATUS_FILTERS.map((f) => (
              <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <DataTable
        columns={columns}
        data={employees}
        loading={loading}
        page={page}
        pageSize={PAGE_SIZE}
        total={total}
        onPageChange={setPage}
        emptyTitle="No employees found"
        emptyDescription="Add your first employee to get started."
      />
    </div>
  );
}
