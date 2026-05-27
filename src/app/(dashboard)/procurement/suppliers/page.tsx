"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Plus, Upload, Trash2 } from "lucide-react";
import { ConfirmDeleteDialog } from "@/components/shared/ConfirmDeleteDialog";
import { PageHeader } from "@/components/shared/PageHeader";
import { DataTable } from "@/components/shared/DataTable";
import { SearchInput } from "@/components/shared/SearchInput";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { PermissionGuard } from "@/components/shared/PermissionGuard";
import { ImportModal } from "@/components/shared/ImportModal";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useDebounceSearch } from "@/hooks/useDebounceSearch";
import { usePagedData } from "@/hooks/usePagedData";

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
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState("ALL");
  const [importOpen, setImportOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const { value: search, setValue: setSearch, debounced } = useDebounceSearch();

  useEffect(() => { setPage(1); }, [debounced, status]);

  const params = new URLSearchParams({ page: String(page), pageSize: String(PAGE_SIZE) });
  if (debounced) params.set("search", debounced);
  if (status !== "ALL") params.set("status", status);
  const url = `/api/procurement/suppliers?${params}`;

  const { data: suppliers, total, loading, mutate } = usePagedData<SupplierRow>(url);

  async function handleDelete() {
    if (!deleteId) return;
    const res = await fetch(`/api/procurement/suppliers/${deleteId}`, { method: "DELETE" });
    if (res.ok) {
      toast.success("Supplier deleted");
      setDeleteId(null);
      mutate();
    } else {
      const d = await res.json().catch(() => ({}));
      toast.error(d.message ?? "Failed to delete supplier");
    }
  }

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
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" asChild>
            <Link href={`/procurement/suppliers/${row.id}`}>View</Link>
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
        title="Suppliers"
        description="Manage procurement supplier records"
        actions={
          <PermissionGuard require="procurement:supplier:create">
            <div className="flex items-center gap-2">
              <Button variant="outline" onClick={() => setImportOpen(true)}>
                <Upload className="h-4 w-4 mr-2" />
                Import CSV
              </Button>
              <Button asChild>
                <Link href="/procurement/suppliers/new"><Plus className="h-4 w-4 mr-2" />New Supplier</Link>
              </Button>
            </div>
          </PermissionGuard>
        }
      />

      <div className="flex flex-wrap gap-2 mb-4">
        <SearchInput value={search} onChange={setSearch} placeholder="Search suppliers..." className="w-full sm:max-w-xs" />
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger className="w-full sm:w-[150px]"><SelectValue /></SelectTrigger>
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

      <ImportModal
        open={importOpen}
        onClose={() => setImportOpen(false)}
        onSuccess={() => {
          setImportOpen(false);
          mutate();
        }}
        title="Import Suppliers"
        apiEndpoint="/api/procurement/suppliers/import"
        templateHeaders={["name", "contactPerson", "email", "phone", "address", "taxNumber"]}
        templateFilename="suppliers-import-template"
        instructions={[
          "name is required",
          "A supplier code will be auto-generated from the name if not provided",
          "email, phone, address, taxNumber are all optional",
        ]}
      />
      <ConfirmDeleteDialog open={!!deleteId} onClose={() => setDeleteId(null)} onConfirm={handleDelete} />
    </div>
  );
}

