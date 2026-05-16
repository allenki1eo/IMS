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
import { formatNumber, LINE_TYPES } from "../_components/production-ui";

interface LineRow {
  id: string;
  code: string;
  name: string;
  lineType: string;
  location?: string | null;
  capacityPerDay?: number | null;
  uom: string;
  status: string;
  _count?: { batches: number };
}

const PAGE_SIZE = 20;

export default function ProductionLinesPage() {
  const [lines, setLines] = useState<LineRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [status, setStatus] = useState("ALL");
  const [lineType, setLineType] = useState("ALL");
  const { value: search, setValue: setSearch, debounced } = useDebounceSearch();

  useEffect(() => { setPage(1); }, [debounced, status, lineType]);

  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams({ page: String(page), pageSize: String(PAGE_SIZE) });
    if (debounced) params.set("search", debounced);
    if (status !== "ALL") params.set("status", status);
    if (lineType !== "ALL") params.set("lineType", lineType);
    fetch(`/api/production/lines?${params}`)
      .then((r) => r.json())
      .then((d) => {
        setLines(d.data ?? []);
        setTotal(d.meta?.total ?? 0);
      })
      .catch(() => toast.error("Failed to load production lines"))
      .finally(() => setLoading(false));
  }, [page, debounced, status, lineType]);

  const columns = [
    { key: "name", header: "Line", cell: (row: LineRow) => <Link href={`/production/lines/${row.id}`} className="font-semibold hover:underline">{row.name}</Link> },
    { key: "code", header: "Code", cell: (row: LineRow) => <code className="text-xs bg-muted px-1.5 py-0.5 rounded">{row.code}</code> },
    { key: "lineType", header: "Type", cell: (row: LineRow) => <span>{row.lineType.replace(/_/g, " ")}</span> },
    { key: "location", header: "Location", cell: (row: LineRow) => <span className="text-muted-foreground">{row.location ?? "-"}</span> },
    { key: "capacity", header: "Capacity / Day", cell: (row: LineRow) => <span>{row.capacityPerDay == null ? "-" : `${formatNumber(row.capacityPerDay)} ${row.uom}`}</span> },
    { key: "batches", header: "Batches", cell: (row: LineRow) => <span>{row._count?.batches ?? 0}</span> },
    { key: "status", header: "Status", cell: (row: LineRow) => <StatusBadge status={row.status} /> },
    { key: "actions", header: "Actions", cell: (row: LineRow) => <Button variant="outline" size="sm" asChild><Link href={`/production/lines/${row.id}`}>View</Link></Button> },
  ];

  return (
    <div>
      <PageHeader
        title="Production Lines"
        description="Manage brewing, packaging, and processing capacity"
        actions={
          <PermissionGuard require="production:line:create">
            <Button asChild><Link href="/production/lines/new"><Plus className="h-4 w-4 mr-2" />New Line</Link></Button>
          </PermissionGuard>
        }
      />

      <div className="flex flex-wrap gap-2 mb-4 flex-wrap">
        <SearchInput value={search} onChange={setSearch} placeholder="Search lines..." className="w-full sm:max-w-xs" />
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger className="w-full sm:w-[150px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All Statuses</SelectItem>
            <SelectItem value="ACTIVE">Active</SelectItem>
            <SelectItem value="INACTIVE">Inactive</SelectItem>
          </SelectContent>
        </Select>
        <Select value={lineType} onValueChange={setLineType}>
          <SelectTrigger className="w-full sm:w-[160px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All Types</SelectItem>
            {LINE_TYPES.map((type) => <SelectItem key={type.value} value={type.value}>{type.label}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <DataTable columns={columns} data={lines} loading={loading} page={page} pageSize={PAGE_SIZE} total={total} onPageChange={setPage} emptyTitle="No production lines found" emptyDescription="Create a line to start planning batches." />
    </div>
  );
}

