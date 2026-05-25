"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Package, Boxes } from "lucide-react";
import { PageHeader } from "@/components/shared/PageHeader";
import { LoadingState } from "@/components/shared/LoadingState";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface CategorySummary {
  id: string;
  name: string;
  code: string;
  description: string | null;
  itemCount: number;
  totalStockQty: number;
}

export default function WarehouseReportsPage() {
  const [categories, setCategories] = useState<CategorySummary[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/warehouse/reports/categories")
      .then((r) => r.json())
      .then((d) => setCategories(d.data ?? []))
      .catch(() => toast.error("Failed to load categories"))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <LoadingState />;

  return (
    <div>
      <PageHeader
        title="Warehouse Reports"
        description="Browse stock movement reports by item category"
      />

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 mt-6">
        {categories.map((cat) => (
          <Link key={cat.id} href={`/warehouse/reports/category/${cat.id}`} className="group">
            <Card className="hover:border-primary hover:shadow-sm transition-all h-full">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <Boxes className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors" />
                  <span className="text-xs font-medium text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
                    {cat.itemCount} items
                  </span>
                </div>
                <CardTitle className="text-base mt-2">{cat.name}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Total stock: <span className="font-semibold text-foreground">{cat.totalStockQty.toLocaleString()}</span>
                </p>
                {cat.code && (
                  <p className="text-xs text-muted-foreground mt-1">Code: {cat.code}</p>
                )}
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      {categories.length === 0 && (
        <div className="text-center py-12 text-muted-foreground">
          <Package className="h-8 w-8 mx-auto mb-3 opacity-50" />
          <p>No active categories found.</p>
        </div>
      )}
    </div>
  );
}
