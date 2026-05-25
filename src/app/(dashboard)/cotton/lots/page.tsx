"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Plus, Camera } from "lucide-react";
import { PageHeader } from "@/components/shared/PageHeader";
import { DataTable } from "@/components/shared/DataTable";
import { SearchInput } from "@/components/shared/SearchInput";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { PermissionGuard } from "@/components/shared/PermissionGuard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { OcrImportModal } from "@/components/cotton/OcrImportModal";
import { useDebounceSearch } from "@/hooks/useDebounceSearch";
import { usePagedData } from "@/hooks/usePagedData";

interface Season {
  id: string;
  name: string;
  isActive?: boolean;
}

interface LotRow {
  id: string;
  lotNumber: string;
  status: string;
  totalWeight: number;
  baleCount: number;
  season: { id: string; name: string };
  _count: { bales: number };
}

const PAGE_SIZE = 20;

export default function LotsPage() {
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [seasonFilter, setSeasonFilter] = useState("ALL");
  const [seasons, setSeasons] = useState<Season[]>([]);
  const [addOpen, setAddOpen] = useState(false);
  const [ocrOpen, setOcrOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const { value: search, setValue: setSearch, debounced } = useDebounceSearch();
  const [form, setForm] = useState({ lotNumber: "", seasonId: "", description: "" });

  useEffect(() => {
    fetch("/api/cotton/seasons")
      .then((r) => r.json())
      .then((d) => {
        if (d.success) {
          setSeasons(d.data);
          const active = d.data.find((s: Season) => s.isActive);
          if (active) setForm((f) => ({ ...f, seasonId: active.id }));
        }
      });
  }, []);

  useEffect(() => { setPage(1); }, [debounced, statusFilter, seasonFilter]);

  const params = new URLSearchParams({ page: String(page), pageSize: String(PAGE_SIZE) });
  if (debounced) params.set("search", debounced);
  if (statusFilter !== "ALL") params.set("status", statusFilter);
  if (seasonFilter !== "ALL") params.set("seasonId", seasonFilter);

  const { data: lots, total, loading, mutate } = usePagedData<LotRow>(`/api/cotton/lots?${params}`);

  async function handleCreate() {
    if (!form.lotNumber || !form.seasonId) {
      toast.error("Lot number and season are required");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/cotton/lots", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lotNumber: form.lotNumber, seasonId: form.seasonId, description: form.description || null }),
      });
      const d = await res.json();
      if (d.success) {
        toast.success("Lot created");
        setAddOpen(false);
        setForm((f) => ({ ...f, lotNumber: "", description: "" }));
        mutate();
      } else {
        toast.error(d.error ?? "Failed to create lot");
      }
    } finally {
      setSaving(false);
    }
  }

  const statusColors: Record<string, string> = {
    OPEN: "bg-blue-100 text-blue-800",
    ASSIGNED: "bg-yellow-100 text-yellow-800",
    INVOICED: "bg-orange-100 text-orange-800",
    DELIVERED: "bg-green-100 text-green-800",
    CANCELLED: "bg-gray-100 text-gray-500",
  };

  const columns = [
    {
      key: "lotNumber",
      header: "Lot Number",
      cell: (row: LotRow) => (
        <Link href={`/cotton/lots/${row.id}`} className="font-semibold hover:underline text-primary">
          {row.lotNumber}
        </Link>
      ),
    },
    { key: "season", header: "Season", cell: (row: LotRow) => <span className="text-muted-foreground">{row.season.name}</span> },
    { key: "baleCount", header: "Bales", cell: (row: LotRow) => <span>{row.baleCount}</span> },
    {
      key: "totalWeight",
      header: "Weight (kg)",
      cell: (row: LotRow) => <span>{row.totalWeight.toLocaleString(undefined, { maximumFractionDigits: 1 })}</span>,
    },
    {
      key: "status",
      header: "Status",
      cell: (row: LotRow) => (
        <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${statusColors[row.status] ?? "bg-gray-100 text-gray-600"}`}>
          {row.status}
        </span>
      ),
    },
    {
      key: "actions",
      header: "",
      cell: (row: LotRow) => (
        <Button variant="outline" size="sm" asChild>
          <Link href={`/cotton/lots/${row.id}`}>View</Link>
        </Button>
      ),
    },
  ];

  const activeSeason = seasons.find((s) => s.isActive);

  return (
    <div>
      <PageHeader
        title="Cotton Lots"
        description="Manage cotton lot groupings"
        actions={
          <PermissionGuard require="cotton:lot:create">
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setOcrOpen(true)}>
                <Camera className="h-4 w-4 mr-2" />
                Import via OCR
              </Button>
              <Button onClick={() => setAddOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                New Lot
              </Button>
            </div>
          </PermissionGuard>
        }
      />

      <div className="flex flex-wrap gap-2 mb-4">
        <SearchInput value={search} onChange={setSearch} placeholder="Search lots..." className="w-full sm:max-w-xs" />
        <Select value={seasonFilter} onValueChange={setSeasonFilter}>
          <SelectTrigger className="w-full sm:w-[160px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All Seasons</SelectItem>
            {seasons.map((s) => (
              <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-[150px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All Statuses</SelectItem>
            <SelectItem value="OPEN">Open</SelectItem>
            <SelectItem value="ASSIGNED">Assigned</SelectItem>
            <SelectItem value="INVOICED">Invoiced</SelectItem>
            <SelectItem value="DELIVERED">Delivered</SelectItem>
            <SelectItem value="CANCELLED">Cancelled</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <DataTable
        columns={columns}
        data={lots}
        loading={loading}
        page={page}
        pageSize={PAGE_SIZE}
        total={total}
        onPageChange={setPage}
        emptyTitle="No lots found"
        emptyDescription="Create lots manually or import via OCR from a tally sheet photo."
      />

      {/* New Lot Dialog */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>New Cotton Lot</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label>Season *</Label>
              <Select value={form.seasonId} onValueChange={(v) => setForm({ ...form, seasonId: v })}>
                <SelectTrigger><SelectValue placeholder="Select season" /></SelectTrigger>
                <SelectContent>
                  {seasons.map((s) => (
                    <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Lot Number *</Label>
              <Input value={form.lotNumber} onChange={(e) => setForm({ ...form, lotNumber: e.target.value })} placeholder="e.g. LOT-2024-001" />
            </div>
            <div>
              <Label>Description (optional)</Label>
              <Input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Notes about this lot" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddOpen(false)}>Cancel</Button>
            <Button onClick={handleCreate} disabled={saving}>{saving ? "Creating..." : "Create Lot"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* OCR Modal */}
      <OcrImportModal
        open={ocrOpen}
        onClose={() => setOcrOpen(false)}
        onSuccess={() => { setOcrOpen(false); mutate(); }}
        seasons={seasons}
        defaultSeasonId={activeSeason?.id}
      />
    </div>
  );
}
