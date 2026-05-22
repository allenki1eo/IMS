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
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { useDebounceSearch } from "@/hooks/useDebounceSearch";
import { usePagedData } from "@/hooks/usePagedData";

interface ContractRow {
  id: string;
  contractNumber: string;
  status: string;
  pricePerKg: number;
  currency: string;
  totalWeight: number;
  totalAmount: number;
  contractDate: string;
  buyer: { id: string; name: string };
  _count: { lines: number };
}

const PAGE_SIZE = 20;

export default function ContractsPage() {
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState("ALL");
  const { value: search, setValue: setSearch, debounced } = useDebounceSearch();

  useEffect(() => { setPage(1); }, [debounced, statusFilter]);

  const params = new URLSearchParams({ page: String(page), pageSize: String(PAGE_SIZE) });
  if (debounced) params.set("search", debounced);
  if (statusFilter !== "ALL") params.set("status", statusFilter);

  const { data: contracts, total, loading } = usePagedData<ContractRow>(`/api/cotton/contracts?${params}`);

  const columns = [
    {
      key: "contractNumber",
      header: "Contract #",
      cell: (row: ContractRow) => (
        <Link href={`/cotton/contracts/${row.id}`} className="font-semibold hover:underline text-primary">
          {row.contractNumber}
        </Link>
      ),
    },
    { key: "buyer", header: "Buyer", cell: (row: ContractRow) => <span>{row.buyer.name}</span> },
    { key: "lots", header: "Lots", cell: (row: ContractRow) => <span>{row._count.lines}</span> },
    {
      key: "totalWeight",
      header: "Weight (kg)",
      cell: (row: ContractRow) => <span>{row.totalWeight.toLocaleString(undefined, { maximumFractionDigits: 1 })}</span>,
    },
    {
      key: "totalAmount",
      header: "Amount (USD)",
      cell: (row: ContractRow) => <span>${row.totalAmount.toLocaleString(undefined, { maximumFractionDigits: 2 })}</span>,
    },
    { key: "date", header: "Date", cell: (row: ContractRow) => <span className="text-muted-foreground">{new Date(row.contractDate).toLocaleDateString()}</span> },
    { key: "status", header: "Status", cell: (row: ContractRow) => <StatusBadge status={row.status} /> },
    {
      key: "actions",
      header: "",
      cell: (row: ContractRow) => (
        <Button variant="outline" size="sm" asChild>
          <Link href={`/cotton/contracts/${row.id}`}>View</Link>
        </Button>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="Cotton Contracts"
        description="Manage buyer contracts"
        actions={
          <PermissionGuard require="cotton:contract:create">
            <Button asChild>
              <Link href="/cotton/contracts/new">
                <Plus className="h-4 w-4 mr-2" />
                New Contract
              </Link>
            </Button>
          </PermissionGuard>
        }
      />

      <div className="flex flex-wrap gap-2 mb-4">
        <SearchInput value={search} onChange={setSearch} placeholder="Search contracts..." className="w-full sm:max-w-xs" />
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-[150px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All Statuses</SelectItem>
            <SelectItem value="DRAFT">Draft</SelectItem>
            <SelectItem value="CONFIRMED">Confirmed</SelectItem>
            <SelectItem value="INVOICED">Invoiced</SelectItem>
            <SelectItem value="DELIVERED">Delivered</SelectItem>
            <SelectItem value="CANCELLED">Cancelled</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <DataTable
        columns={columns}
        data={contracts}
        loading={loading}
        page={page}
        pageSize={PAGE_SIZE}
        total={total}
        onPageChange={setPage}
        emptyTitle="No contracts found"
        emptyDescription="Create your first contract to start selling cotton lots."
      />
    </div>
  );
}
