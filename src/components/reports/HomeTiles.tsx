"use client";

import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatMoney } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { HomeTile } from "@/modules/reports/home.service";

const MONEY_KEYS = new Set(["spendToday", "cashInToday"]);

function toneClass(tone?: HomeTile["tone"]) {
  switch (tone) {
    case "danger":
      return "border-destructive/40";
    case "warning":
      return "border-amber-500/40";
    case "ok":
      return "border-emerald-500/30";
    default:
      return "";
  }
}

function formatValue(tile: HomeTile, currency = "TZS") {
  if (typeof tile.value === "number" && MONEY_KEYS.has(tile.key)) {
    return formatMoney(tile.value, currency);
  }
  if (typeof tile.value === "number") {
    return tile.value.toLocaleString();
  }
  return tile.value;
}

export function HeroSpendTile({
  tile,
  currency = "TZS",
}: {
  tile: HomeTile;
  currency?: string;
}) {
  return (
    <Link href={tile.href} className="block">
      <Card className={cn("hover:bg-muted/40 transition-colors", toneClass(tile.tone))}>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            {tile.label}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-bold tracking-tight">
            {formatValue(tile, currency)}
          </div>
          {tile.hint ? (
            <p className="mt-1 text-xs text-muted-foreground">{tile.hint}</p>
          ) : null}
        </CardContent>
      </Card>
    </Link>
  );
}

export function RiskTiles({
  tiles,
  currency = "TZS",
}: {
  tiles: HomeTile[];
  currency?: string;
}) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {tiles.map((tile) => (
        <Link key={tile.key} href={tile.href} className="block">
          <Card
            className={cn(
              "h-full hover:bg-muted/40 transition-colors",
              toneClass(tile.tone)
            )}
          >
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-medium text-muted-foreground">
                {tile.label}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatValue(tile, currency)}</div>
              {tile.hint ? (
                <p className="mt-1 text-xs text-muted-foreground">{tile.hint}</p>
              ) : null}
            </CardContent>
          </Card>
        </Link>
      ))}
    </div>
  );
}
