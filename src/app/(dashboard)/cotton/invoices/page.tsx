"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { PageHeader } from "@/components/shared/PageHeader";
import { DataTable } from "@/components/shared/DataTable";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { Button } from "@/components/ui/button";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { usePagedData } from "@/hooks/usePagedData";

interface InvoiceRow {
  id: string;
  invoiceNumber: string;
  status: string;
  totalWeight: number;
  totalAmount: number;
  currency: string;
  createdAt: string;
  contract: {
    id: string;
    contractNumber: string;
    buyer: { id: string; name: string };
  };
}

const PAGE_SIZE = 20;

export default function InvoicesPage() {
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState("ALL");

  const params = new URLSearchParams({ page: String(page), pageSize: String(PAGE_SIZE) });
  if (statusFilter !== "ALL") params.set("status", statusFilter);

  const { data: invoices, total, loading } = usePagedData<InvoiceRow>(`/api/cotton/invoices?${params}`);

  const columns = [
    {
      key: "invoiceNumber",
      header: "Invoice #",
      cell: (row: InvoiceRow) => (
        <Link href={`/cotton/invoices/${row.id}`} className="font-semibold hover:underline text-primary">
          {row.invoiceNumber}
        </Link>
      ),
    },
    { key: "buyer", header: "Buyer", cell: (row: InvoiceRow) => <span>{row.contract.buyer.name}</span> },
    {
      key: "contractNumber",
      header: "Contract #",
      cell: (row: InvoiceRow) => (
        <Link href={`/cotton/contracts/${row.contract.id}`} className="hover:underline text-muted-foreground">
          {row.contract.contractNumber}
        </Link>
      ),
    },
    {
      key: "totalWeight",
      header: "Weight (kg)",
      cell: (row: InvoiceRow) => <span>{row.totalWeight.toLocaleString(undefined, { maximumFractionDigits: 1 })}</span>,
    },
    {
      key: "totalAmount",
      header: "Amount (USD)",
      cell: (row: InvoiceRow) => <span className="font-medium">${row.totalAmount.toLocaleString(undefined, { maximumFractionDigits: 2 })}</span>,
    },
    { key: "date", header: "Date", cell: (row: InvoiceRow) => <span className="text-muted-foreground">{new Date(row.createdAt).toLocaleDateString()}</span> },
    { key: "status", header: "Status", cell: (row: InvoiceRow) => <StatusBadge status={row.status} /> },
    {
      key: "actions",
      header: "",
      cell: (row: InvoiceRow) => (
        <Button variant="outline" size="sm" asChild>
          <Link href={`/cotton/invoices/${row.id}`}>View</Link>
        </Button>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="Cotton Invoices"
        description="Manage cotton sales invoices"
      />

      <div className="flex gap-2 mb-4">
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-[150px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All Statuses</SelectItem>
            <SelectItem value="DRAFT">Draft</SelectItem>
            <SelectItem value="ISSUED">Issued</SelectItem>
            <SelectItem value="PAID">Paid</SelectItem>
            <SelectItem value="CANCELLED">Cancelled</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <DataTable
        columns={columns}
        data={invoices}
        loading={loading}
        page={page}
        pageSize={PAGE_SIZE}
        total={total}
        onPageChange={setPage}
        emptyTitle="No invoices found"
        emptyDescription="Invoices are created from confirmed contracts."
      />
    </div>
  );
}
