"use client";
import Link from "next/link";
import { cn } from "@/lib/utils";

export interface KanbanColumn<T> {
  id: string;
  label: string;
  color?: string;
  headerClass?: string;
}

export interface KanbanCard<T> {
  id: string;
  column: string;
  title: string;
  subtitle?: string;
  meta?: React.ReactNode;
  badge?: React.ReactNode;
  href?: string;
}

interface KanbanBoardProps<T> {
  columns: KanbanColumn<T>[];
  cards: KanbanCard<T>[];
  loading?: boolean;
  emptyLabel?: string;
}

export function KanbanBoard<T>({ columns, cards, loading, emptyLabel = "No items" }: KanbanBoardProps<T>) {
  return (
    <div className="flex gap-4 overflow-x-auto pb-4">
      {columns.map((col) => {
        const colCards = cards.filter((c) => c.column === col.id);
        return (
          <div key={col.id} className="flex-shrink-0 w-72">
            {/* Column header */}
            <div className={cn("flex items-center justify-between rounded-t-lg px-3 py-2 border border-b-0", col.headerClass ?? "bg-muted/60")}>
              <div className="flex items-center gap-2">
                {col.color && <span className="h-2 w-2 rounded-full" style={{ backgroundColor: col.color }} />}
                <span className="text-xs font-semibold uppercase tracking-wider">{col.label}</span>
              </div>
              <span className="text-xs font-medium text-muted-foreground tabular-nums bg-background border rounded-full px-2 py-0.5">
                {colCards.length}
              </span>
            </div>

            {/* Cards */}
            <div className="rounded-b-lg border bg-muted/20 min-h-32 p-2 space-y-2">
              {loading ? (
                Array.from({ length: 2 }).map((_, i) => (
                  <div key={i} className="h-20 rounded-lg border bg-background animate-pulse" />
                ))
              ) : colCards.length === 0 ? (
                <div className="flex items-center justify-center py-8 text-xs text-muted-foreground">
                  {emptyLabel}
                </div>
              ) : (
                colCards.map((card) => {
                  const inner = (
                    <div className={cn(
                      "rounded-lg border bg-background p-3 space-y-2 text-left w-full",
                      card.href && "hover:border-foreground/20 hover:shadow-sm transition-all cursor-pointer"
                    )}>
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-sm font-medium leading-snug line-clamp-2">{card.title}</p>
                        {card.badge}
                      </div>
                      {card.subtitle && (
                        <p className="text-xs text-muted-foreground line-clamp-1">{card.subtitle}</p>
                      )}
                      {card.meta && (
                        <div className="text-xs text-muted-foreground">{card.meta}</div>
                      )}
                    </div>
                  );

                  return card.href ? (
                    <Link key={card.id} href={card.href}>{inner}</Link>
                  ) : (
                    <div key={card.id}>{inner}</div>
                  );
                })
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
