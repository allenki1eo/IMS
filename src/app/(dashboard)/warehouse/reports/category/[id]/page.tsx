"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { ArrowLeft, Package } from "lucide-react";
import { PageHeader } from "@/components/shared/PageHeader";
import { DataTable } from "@/components/shared/DataTable";
import { LoadingState } from "@/components/shared/LoadingState";
import { Button } from "@/components/ui/button";

interface ItemSummary {
  id: string;
  code: string;
  name: string;
  description: string | null;
  itemType: string;
  category?: { id: string; name: string } | null;
  uom?: { id: string; name: string; symbol: string } | null;
  totalStockQty: number;
}

const ITEM_TYPE_LABELS: Record<string, string> = {
  RAW_MATERIAL: "Raw Material",
  FINISHED_GOOD: "Finished Good",
  CONSUMABLE: "Consumable",
  SPARE_PART: "Spare Part",
  PACKAGING: "Packaging",
};

export default function CategoryItemsReportPage() {
  const { id } = useParams<{ id: string }>();
  const [items, setItems] = useState<ItemSummary[]>([]);
  const [categoryName, setCategoryName] = useState("Category");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch(`/api/warehouse/reports/items?categoryId=${id}`).then((r) => r.json()),
      fetch(`/api/item-categories/${id}`).then((r) => r.json()),
    ])
      .then(([itemsJson, catJson]) => {
        setItems(itemsJson.data ?? []);
        setCategoryName(catJson.data?.name ?? catJson.name ?? "Category");
      })
      .catch(() => toast.error("Failed to load items"))
      .finally(() => setLoading(false));
  }, [id]);

  const columns = [
    {
      key: "code",
      header: "Code",
      cell: (row: ItemSummary) => (
        <code className="text-xs bg-muted px-1.5 py-0.5 rounded">{row.code}</code>
      ),
    },
    {
      key: "name",
      header: "Item",
      cell: (row: ItemSummary) => (
        <Link
          href={`/warehouse/reports/items/${row.id}`}
          className="font-medium hover:underline"
        >
          {row.name}
        </Link>
      ),
    },
    {
      key: "itemType",
      header: "Type",
      cell: (row: ItemSummary) => (
        <span className="text-sm text-muted-foreground">
          {ITEM_TYPE_LABELS[row.itemType] ?? row.itemType}
        </span>
      ),
    },
    {
      key: "totalStockQty",
      header: "Stock Qty",
      cell: (row: ItemSummary) => (
        <span className="font-semibold">
          {row.totalStockQty.toLocaleString()} {row.uom?.symbol ?? ""}
        </span>
      ),
    },
    {
      key: "uom",
      header: "UOM",
      cell: (row: ItemSummary) => (
        <span className="text-sm text-muted-foreground">{row.uom?.symbol ?? "—"}</span>
      ),
    },
  ];

  if (loading) return <LoadingState />;

  return (
    <div>
      <PageHeader
        title={categoryName}
        description="Items in this category with current stock levels"
        actions={
          <Button variant="outline" asChild>
            <Link href="/warehouse/reports">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Categories
            </Link>
          </Button>
        }
      />

      <DataTable
        columns={columns}
        data={items}
        loading={false}
        emptyTitle="No items found"
        emptyDescription="This category has no active items."
      />
    </div>
  );
}
