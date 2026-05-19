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
import { BATCH_STATUSES, formatDate, qty } from "../_components/production-ui";

interface BatchRow {
  id: string;
  reference: string;
  productName: string;
  plannedQty: number;
  actualQty?: number | null;
  uom: string;
  status: string;
  plannedStart?: string | null;
  line?: { name: string } | null;
  recipe?: { code: string; name: string } | null;
  _count?: { materials: number };
}

const PAGE_SIZE = 20;

export default function ProductionBatchesPage() {
  const [batches, setBatches] = useState<BatchRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [status, setStatus] = useState("ALL");
  const { value: search, setValue: setSearch, debounced } = useDebounceSearch();

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const fromQuery = params.get("status");
    if (fromQuery) setStatus(fromQuery);
  }, []);

  useEffect(() => { setPage(1); }, [debounced, status]);
  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams({ page: String(page), pageSize: String(PAGE_SIZE) });
    if (debounced) params.set("search", debounced);
    if (status !== "ALL") params.set("status", status);
    fetch(`/api/production/batches?${params}`)
      .then((r) => r.json())
      .then((d) => {
        setBatches(d.data ?? []);
        setTotal(d.meta?.total ?? 0);
      })
      .catch(() => toast.error("Failed to load production batches"))
      .finally(() => setLoading(false));
  }, [page, debounced, status]);

  const columns = [
    { key: "reference", header: "Reference", cell: (row: BatchRow) => <Link href={`/production/batches/${row.id}`} className="font-semibold hover:underline">{row.reference}</Link> },
    { key: "product", header: "Product", cell: (row: BatchRow) => <span>{row.productName}</span> },
    { key: "line", header: "Line", cell: (row: BatchRow) => <span className="text-muted-foreground">{row.line?.name ?? "-"}</span> },
    { key: "recipe", header: "Recipe", cell: (row: BatchRow) => <span>{row.recipe?.code ?? "-"}</span> },
    { key: "status", header: "Status", cell: (row: BatchRow) => <StatusBadge status={row.status} /> },
    { key: "planned", header: "Planned Qty", cell: (row: BatchRow) => <span>{qty(row.plannedQty, row.uom)}</span> },
    { key: "start", header: "Planned Start", cell: (row: BatchRow) => <span className="text-muted-foreground">{formatDate(row.plannedStart)}</span> },
    { key: "actions", header: "Actions", cell: (row: BatchRow) => <Button variant="outline" size="sm" asChild><Link href={`/production/batches/${row.id}`}>View</Link></Button> },
  ];

  return (
    <div>
      <PageHeader title="Production Batches" description="Plan and track brewing and production batches" actions={<PermissionGuard require="production:batch:create"><Button asChild><Link href="/production/batches/new"><Plus className="h-4 w-4 mr-2" />New Batch</Link></Button></PermissionGuard>} />
      <div className="flex flex-wrap gap-2 mb-4 flex-wrap">
        <SearchInput value={search} onChange={setSearch} placeholder="Search batches..." className="w-full sm:max-w-xs" />
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All Statuses</SelectItem>
            {BATCH_STATUSES.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
      <DataTable columns={columns} data={batches} loading={loading} page={page} pageSize={PAGE_SIZE} total={total} onPageChange={setPage} emptyTitle="No production batches found" emptyDescription="Plan your first production batch to begin." />
    </div>
  );
}

