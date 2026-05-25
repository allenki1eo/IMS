"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Plus } from "lucide-react";
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

interface CustomerRow {
  id: string;
  code: string;
  name: string;
  email?: string | null;
  phone?: string | null;
  contactPerson?: string | null;
  creditLimit?: number | null;
  currency: string;
  status: string;
  _count: { orders: number };
}

const STATUS_FILTERS = [
  { label: "All Status", value: "ALL" },
  { label: "Active", value: "ACTIVE" },
  { label: "Inactive", value: "INACTIVE" },
];

export default function SalesCustomersPage() {
  const [customers, setCustomers] = useState<CustomerRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [status, setStatus] = useState("ALL");
  const { value: search, setValue: setSearch, debounced } = useDebounceSearch();

  const PAGE_SIZE = 20;

  useEffect(() => { setPage(1); }, [debounced, status]);

  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams({ page: String(page), pageSize: String(PAGE_SIZE) });
    if (debounced) params.set("search", debounced);
    if (status !== "ALL") params.set("status", status);
    fetch(`/api/sales/customers?${params}`)
      .then((r) => r.json())
      .then((d) => {
        setCustomers(d.data?.data ?? d.data ?? []);
        setTotal(d.data?.meta?.total ?? d.meta?.total ?? 0);
      })
      .catch(() => toast.error("Failed to load customers"))
      .finally(() => setLoading(false));
  }, [page, debounced, status]);

  const columns = [
    {
      key: "code",
      header: "Code",
      cell: (row: CustomerRow) => (
        <span className="font-mono text-xs bg-muted px-1.5 py-0.5 rounded">{row.code}</span>
      ),
    },
    {
      key: "name",
      header: "Name",
      cell: (row: CustomerRow) => (
        <Link href={`/sales/customers/${row.id}`} className="font-semibold hover:underline">
          {row.name}
        </Link>
      ),
    },
    {
      key: "email",
      header: "Email",
      cell: (row: CustomerRow) => <span className="text-muted-foreground">{row.email ?? "—"}</span>,
    },
    {
      key: "phone",
      header: "Phone",
      cell: (row: CustomerRow) => <span className="text-muted-foreground">{row.phone ?? "—"}</span>,
    },
    {
      key: "orders",
      header: "Orders",
      cell: (row: CustomerRow) => <span className="text-muted-foreground">{row._count?.orders ?? 0}</span>,
    },
    {
      key: "status",
      header: "Status",
      cell: (row: CustomerRow) => <StatusBadge status={row.status} />,
    },
    {
      key: "actions",
      header: "",
      cell: (row: CustomerRow) => (
        <Button variant="outline" size="sm" asChild>
          <Link href={`/sales/customers/${row.id}`}>View</Link>
        </Button>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="Customers"
        description="Manage customer contacts and accounts"
        actions={
          <PermissionGuard require="sales:customer:create">
            <Button asChild>
              <Link href="/sales/customers/new">
                <Plus className="h-4 w-4 mr-2" />
                New Customer
              </Link>
            </Button>
          </PermissionGuard>
        }
      />

      <div className="flex flex-wrap gap-2 mb-4">
        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder="Search by name, code or email..."
          className="w-full sm:max-w-xs"
        />
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger className="w-full sm:w-[160px]">
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
        data={customers}
        loading={loading}
        page={page}
        pageSize={PAGE_SIZE}
        total={total}
        onPageChange={setPage}
        emptyTitle="No customers found"
        emptyDescription="Customers will appear here when synced from your sales system."
      />
    </div>
  );
}
