"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Plus, Trash2 } from "lucide-react";
import { ConfirmDeleteDialog } from "@/components/shared/ConfirmDeleteDialog";
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
import { usePagedData } from "@/hooks/usePagedData";

interface StandardRow {
  id: string;
  code: string;
  name: string;
  lineFamily?: string;
  item?: { name: string } | null;
  _count?: { parameters: number };
  isActive: boolean;
}

interface QcTemplate {
  code: string;
  name: string;
  description: string;
  lineFamily?: "BREWING" | "SPIRITS";
}

const PAGE_SIZE = 20;

export default function QcStandardsPage() {
  const [page, setPage] = useState(1);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [templates, setTemplates] = useState<QcTemplate[]>([]);
  const [templateCode, setTemplateCode] = useState("");
  const [installing, setInstalling] = useState(false);
  const [lineFamily, setLineFamily] = useState("ALL");
  const { value: search, setValue: setSearch, debounced } = useDebounceSearch();

  const params = new URLSearchParams({ page: String(page), pageSize: String(PAGE_SIZE) });
  if (debounced) params.set("search", debounced);
  if (lineFamily !== "ALL") params.set("lineFamily", lineFamily);
  const { data: standards, total, loading, mutate } = usePagedData<StandardRow>(`/api/qc/standards?${params}`);

  useEffect(() => {
    fetch("/api/qc/brewery/templates")
      .then((res) => res.json())
      .then((json) => setTemplates(json.data?.standardTemplates ?? []))
      .catch(() => {});
  }, []);

  async function handleDelete() {
    if (!deleteId) return;
    const res = await fetch(`/api/qc/standards/${deleteId}`, { method: "DELETE" });
    if (res.ok) {
      toast.success("Quality standard deleted");
      setDeleteId(null);
      mutate();
    } else {
      const d = await res.json().catch(() => ({}));
      toast.error(d.message ?? "Failed to delete quality standard");
    }
  }

  async function handleInstallTemplate() {
    if (!templateCode) {
      toast.error("Select a QC template first");
      return;
    }

    setInstalling(true);
    try {
      const res = await fetch("/api/qc/brewery/templates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ templateCode }),
      });
      const json = await res.json();
      if (!res.ok) {
        toast.error(json.error ?? "Failed to install template");
        return;
      }
      const family = templates.find((t) => t.code === templateCode)?.lineFamily ?? "BREWING";
      toast.success(`${family === "SPIRITS" ? "Spirits" : "Brewery"} QC template installed`);
      setTemplateCode("");
      mutate();
    } catch {
      toast.error("Network error");
    } finally {
      setInstalling(false);
    }
  }

  const columns = [
    {
      key: "code",
      header: "Code",
      cell: (row: StandardRow) => (
        <Link href={`/qc/standards/${row.id}`} className="hover:underline">
          <code className="text-xs bg-muted px-1.5 py-0.5 rounded">{row.code}</code>
        </Link>
      ),
    },
    {
      key: "name",
      header: "Name",
      cell: (row: StandardRow) => (
        <Link href={`/qc/standards/${row.id}`} className="font-medium hover:underline">
          {row.name}
        </Link>
      ),
    },
    {
      key: "lineFamily",
      header: "Family",
      cell: (row: StandardRow) => (
        <span className="text-muted-foreground">{row.lineFamily ?? "BREWING"}</span>
      ),
    },
    {
      key: "item",
      header: "Linked Item",
      cell: (row: StandardRow) => (
        <span className="text-muted-foreground">{row.item?.name ?? "—"}</span>
      ),
    },
    {
      key: "parameters",
      header: "Parameters",
      cell: (row: StandardRow) => (
        <span className="text-muted-foreground">{row._count?.parameters ?? 0}</span>
      ),
    },
    {
      key: "isActive",
      header: "Status",
      cell: (row: StandardRow) => <StatusBadge status={row.isActive} />,
    },
    {
      key: "actions",
      header: "Actions",
      cell: (row: StandardRow) => (
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" asChild>
            <Link href={`/qc/standards/${row.id}`}>View</Link>
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
        title="Quality Standards"
        description="Manage quality standards and test parameters (brewery + spirits)"
        actions={
          <PermissionGuard require="qc:standard:create">
            <Button asChild>
              <Link href="/qc/standards/new">
                <Plus className="h-4 w-4 mr-2" />
                Add Standard
              </Link>
            </Button>
          </PermissionGuard>
        }
      />

      <div className="flex flex-wrap gap-2 mb-4">
        <SearchInput
          value={search}
          onChange={(v) => { setSearch(v); setPage(1); }}
          placeholder="Search by code or name..."
          className="w-full sm:max-w-xs"
        />
        <Select value={lineFamily} onValueChange={(v) => { setLineFamily(v); setPage(1); }}>
          <SelectTrigger className="w-full sm:w-[160px]">
            <SelectValue placeholder="Line family" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All families</SelectItem>
            <SelectItem value="BREWING">Brewing</SelectItem>
            <SelectItem value="SPIRITS">Spirits</SelectItem>
          </SelectContent>
        </Select>
        <PermissionGuard require="qc:standard:create">
          <Select value={templateCode || "__none"} onValueChange={(value) => setTemplateCode(value === "__none" ? "" : value)}>
            <SelectTrigger className="w-full sm:w-[320px]">
              <SelectValue placeholder="Install brewery or spirits template" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__none">Select QC template</SelectItem>
              {templates.map((template) => (
                <SelectItem key={template.code} value={template.code}>
                  [{template.lineFamily ?? "BREWING"}] {template.code} - {template.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button type="button" variant="outline" onClick={handleInstallTemplate} disabled={installing}>
            Install Template
          </Button>
        </PermissionGuard>
      </div>

      <DataTable
        columns={columns}
        data={standards}
        loading={loading}
        page={page}
        pageSize={PAGE_SIZE}
        total={total}
        onPageChange={setPage}
        emptyTitle="No quality standards found"
        emptyDescription="Create a standard and add ≥1 parameter before setting Active, or install a brewery/spirits template above. Empty Active list usually means standards exist but are still inactive."
      />
      <ConfirmDeleteDialog open={!!deleteId} onClose={() => setDeleteId(null)} onConfirm={handleDelete} />
    </div>
  );
}
