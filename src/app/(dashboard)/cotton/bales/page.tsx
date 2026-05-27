"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Plus } from "lucide-react";
import { PageHeader } from "@/components/shared/PageHeader";
import { DataTable } from "@/components/shared/DataTable";
import { SearchInput } from "@/components/shared/SearchInput";
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
import { useDebounceSearch } from "@/hooks/useDebounceSearch";
import { usePagedData } from "@/hooks/usePagedData";

interface Season {
  id: string;
  name: string;
}

interface BaleRow {
  id: string;
  baleNumber: string;
  weight: number;
  grade: string;
  ginnery?: string | null;
  lotId?: string | null;
  season: { id: string; name: string };
  lot?: { id: string; lotNumber: string } | null;
}

const PAGE_SIZE = 20;

export default function BalesPage() {
  const [page, setPage] = useState(1);
  const [seasonFilter, setSeasonFilter] = useState("ALL");
  const [seasons, setSeasons] = useState<Season[]>([]);
  const [addOpen, setAddOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const { value: search, setValue: setSearch, debounced } = useDebounceSearch();
  const [form, setForm] = useState({
    baleNumber: "",
    weight: "",
    grade: "A",
    ginnery: "",
    seasonId: "",
  });

  useEffect(() => {
    fetch("/api/cotton/seasons")
      .then((r) => r.json())
      .then((d) => {
        if (d.success) {
          setSeasons(d.data);
          const active = d.data.find((s: Season & { isActive: boolean }) => s.isActive);
          if (active) setForm((f) => ({ ...f, seasonId: active.id }));
        }
      });
  }, []);

  useEffect(() => { setPage(1); }, [debounced, seasonFilter]);

  const params = new URLSearchParams({ page: String(page), pageSize: String(PAGE_SIZE) });
  if (debounced) params.set("search", debounced);
  if (seasonFilter !== "ALL") params.set("seasonId", seasonFilter);

  const { data: bales, total, loading, mutate } = usePagedData<BaleRow>(`/api/cotton/bales?${params}`);

  async function handleCreate() {
    if (!form.baleNumber || !form.weight || !form.seasonId) {
      toast.error("Bale number, weight, and season are required");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/cotton/bales", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          baleNumber: form.baleNumber,
          weight: parseFloat(form.weight),
          grade: form.grade,
          ginnery: form.ginnery || null,
          seasonId: form.seasonId,
        }),
      });
      const d = await res.json();
      if (d.success) {
        toast.success("Bale created");
        setAddOpen(false);
        setForm((f) => ({ ...f, baleNumber: "", weight: "", ginnery: "" }));
        mutate();
      } else {
        toast.error(d.error ?? "Failed to create bale");
      }
    } finally {
      setSaving(false);
    }
  }

  const columns = [
    {
      key: "baleNumber",
      header: "Bale Number",
      cell: (row: BaleRow) => <code className="text-xs bg-muted px-1.5 py-0.5 rounded">{row.baleNumber}</code>,
    },
    {
      key: "weight",
      header: "Weight (kg)",
      cell: (row: BaleRow) => <span>{row.weight.toLocaleString(undefined, { maximumFractionDigits: 2 })}</span>,
    },
    { key: "grade", header: "Grade", cell: (row: BaleRow) => <span>{row.grade}</span> },
    { key: "ginnery", header: "Ginnery", cell: (row: BaleRow) => <span className="text-muted-foreground">{row.ginnery ?? "-"}</span> },
    {
      key: "season",
      header: "Season",
      cell: (row: BaleRow) => <span className="text-muted-foreground">{row.season.name}</span>,
    },
    {
      key: "lot",
      header: "Lot",
      cell: (row: BaleRow) =>
        row.lot ? (
          <code className="text-xs bg-muted px-1.5 py-0.5 rounded">{row.lot.lotNumber}</code>
        ) : (
          <span className="text-muted-foreground text-xs">Unassigned</span>
        ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="Cotton Bales"
        description="Track individual cotton bales"
        actions={
          <PermissionGuard require="cotton:bale:create">
            <Button onClick={() => setAddOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add Bale
            </Button>
          </PermissionGuard>
        }
      />

      <div className="flex flex-wrap gap-2 mb-4">
        <SearchInput value={search} onChange={setSearch} placeholder="Search bales..." className="w-full sm:max-w-xs" />
        <Select value={seasonFilter} onValueChange={setSeasonFilter}>
          <SelectTrigger className="w-full sm:w-[160px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All Seasons</SelectItem>
            {seasons.map((s) => (
              <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <DataTable
        columns={columns}
        data={bales}
        loading={loading}
        page={page}
        pageSize={PAGE_SIZE}
        total={total}
        onPageChange={setPage}
        emptyTitle="No bales found"
        emptyDescription="Add individual bales or import via OCR from the Lots page."
      />

      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Add Cotton Bale</DialogTitle></DialogHeader>
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
              <Label>Bale Number *</Label>
              <Input value={form.baleNumber} onChange={(e) => setForm({ ...form, baleNumber: e.target.value })} placeholder="e.g. BALE-001" />
            </div>
            <div>
              <Label>Weight (kg) *</Label>
              <Input type="number" step="0.01" value={form.weight} onChange={(e) => setForm({ ...form, weight: e.target.value })} placeholder="185.5" />
            </div>
            <div>
              <Label>Grade</Label>
              <Select value={form.grade} onValueChange={(v) => setForm({ ...form, grade: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="A">A</SelectItem>
                  <SelectItem value="B">B</SelectItem>
                  <SelectItem value="C">C</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Ginnery (optional)</Label>
              <Input value={form.ginnery} onChange={(e) => setForm({ ...form, ginnery: e.target.value })} placeholder="Ginnery name" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddOpen(false)}>Cancel</Button>
            <Button onClick={handleCreate} disabled={saving}>{saving ? "Saving..." : "Add Bale"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
