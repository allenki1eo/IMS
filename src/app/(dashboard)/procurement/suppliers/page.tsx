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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useDebounceSearch } from "@/hooks/useDebounceSearch";

interface SupplierRow {
  id: string;
  code: string;
  name: string;
  contactPerson?: string | null;
  email?: string | null;
  phone?: string | null;
  status: string;
  _count?: { purchaseOrders: number };
}

const PAGE_SIZE = 20;

export default function SuppliersPage() {
  const [suppliers, setSuppliers] = useState<SupplierRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [status, setStatus] = useState("ALL");
  const { value: search, setValue: setSearch, debounced } = useDebounceSearch();

  useEffect(() => { setPage(1); }, [debounced, status]);

  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams({ page: String(page), pageSize: String(PAGE_SIZE) });
    if (debounced) params.set("search", debounced);
    if (status !== "ALL") params.set("status", status);
    fetch(`/api/procurement/suppliers?${params}`)
      .then((r) => r.json())
      .then((d) => {
        setSuppliers(d.data ?? []);
        setTotal(d.meta?.total ?? 0);
      })
      .catch(() => toast.error("Failed to load suppliers"))
      .finally(() => setLoading(false));
  }, [page, debounced, status]);

  const columns = [
    {
      key: "name",
      header: "Supplier",
      cell: (row: SupplierRow) => (
        <div>
          <Link href={`/procurement/suppliers/${row.id}`} className="font-semibold hover:underline">{row.name}</Link>
          <div className="text-xs text-muted-foreground">{row.contactPerson ?? "No contact person"}</div>
        </div>
      ),
    },
    { key: "code", header: "Code", cell: (row: SupplierRow) => <code className="text-xs bg-muted px-1.5 py-0.5 rounded">{row.code}</code> },
    { key: "email", header: "Email", cell: (row: SupplierRow) => <span className="text-muted-foreground">{row.email ?? "-"}</span> },
    { key: "phone", header: "Phone", cell: (row: SupplierRow) => <span className="text-muted-foreground">{row.phone ?? "-"}</span> },
    { key: "orders", header: "Orders", cell: (row: SupplierRow) => <span>{row._count?.purchaseOrders ?? 0}</span> },
    { key: "status", header: "Status", cell: (row: SupplierRow) => <StatusBadge status={row.status} /> },
    {
      key: "actions",
      header: "Actions",
      cell: (row: SupplierRow) => (
        <Button variant="outline" size="sm" asChild>
          <Link href={`/procurement/suppliers/${row.id}`}>View</Link>
        </Button>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="Suppliers"
        description="Manage procurement supplier records"
        actions={
          <PermissionGuard require="procurement:supplier:create">
            <Button asChild>
              <Link href="/procurement/suppliers/new"><Plus className="h-4 w-4 mr-2" />New Supplier</Link>
            </Button>
          </PermissionGuard>
        }
      />

      <div className="flex gap-3 mb-4 flex-wrap">
        <SearchInput value={search} onChange={setSearch} placeholder="Search suppliers..." className="max-w-sm" />
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger className="w-[150px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All Statuses</SelectItem>
            <SelectItem value="ACTIVE">Active</SelectItem>
            <SelectItem value="INACTIVE">Inactive</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <DataTable
        columns={columns}
        data={suppliers}
        loading={loading}
        page={page}
        pageSize={PAGE_SIZE}
        total={total}
        onPageChange={setPage}
        emptyTitle="No suppliers found"
        emptyDescription="Create your first supplier to start issuing purchase orders."
      />
    </div>
  );
}

