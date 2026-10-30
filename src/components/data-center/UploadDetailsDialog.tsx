"use client";
import { useEffect, useState } from "react";
import { Archive, CloudUpload, Download, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { formatDateTime } from "@/lib/utils";
import { categoryLabel, formatBytes, periodLabel } from "@/modules/data-center/data-center.types";
import { downloadUrl, type Upload } from "./types";

type Detail = Upload & {
  history: { id: string; version: number; status: Upload["status"]; fileName: string; sizeBytes: number; uploadedByName: string; createdAt: string }[];
};

const STATUS_VARIANT = { CURRENT: "success", SUPERSEDED: "secondary", ARCHIVED: "outline" } as const;
const STATUS_LABEL = { CURRENT: "Current", SUPERSEDED: "Superseded", ARCHIVED: "Archived" } as const;

interface Props {
  uploadId: string | null;
  onOpenChange: (open: boolean) => void;
  canUpload: boolean;
  canArchive: boolean;
  onNewVersion: (requirementId: string, periodKey: string) => void;
  onChanged: () => void;
}

export function UploadDetailsDialog({ uploadId, onOpenChange, canUpload, canArchive, onNewVersion, onChanged }: Props) {
  const [detail, setDetail] = useState<Detail | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [archiving, setArchiving] = useState(false);

  useEffect(() => {
    if (!uploadId) return;
    setDetail(null);
    fetch(`/api/data-center/uploads/${uploadId}`)
      .then((r) => r.json())
      .then((d) => setDetail(d.data ?? null))
      .catch(() => toast.error("Could not load file details"));
  }, [uploadId]);

  const archive = async () => {
    if (!detail) return;
    setArchiving(true);
    try {
      const res = await fetch(`/api/data-center/uploads/${detail.id}/archive`, { method: "POST" });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || "Could not archive");
      toast.success(body.data?.restored ? "Archived — the previous version is current again" : "File archived");
      setConfirming(false);
      onOpenChange(false);
      onChanged();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not archive");
    } finally {
      setArchiving(false);
    }
  };

  return (
    <>
      <Dialog open={!!uploadId} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="pr-6">{detail?.title ?? "File details"}</DialogTitle>
            <DialogDescription>
              {detail ? `${periodLabel(detail.periodKey)} · ${categoryLabel(detail.category)}` : "Loading…"}
            </DialogDescription>
          </DialogHeader>

          {!detail ? (
            <div className="flex justify-center py-10"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
          ) : (
            <div className="space-y-5">
              <dl className="grid grid-cols-[110px_1fr] gap-x-4 gap-y-2 text-sm">
                <dt className="text-muted-foreground">File</dt>
                <dd className="min-w-0 break-all">{detail.fileName} <span className="text-muted-foreground">· {formatBytes(detail.sizeBytes)}</span></dd>
                <dt className="text-muted-foreground">Status</dt>
                <dd><Badge variant={STATUS_VARIANT[detail.status]} dot>{STATUS_LABEL[detail.status]}</Badge>{detail.requirement && <span className="ml-2 text-muted-foreground">v{detail.version}</span>}</dd>
                {detail.requirement && (<><dt className="text-muted-foreground">Requirement</dt><dd>{detail.requirement.name}</dd></>)}
                {detail.departmentName && (<><dt className="text-muted-foreground">Department</dt><dd>{detail.departmentName}</dd></>)}
                <dt className="text-muted-foreground">Uploaded</dt>
                <dd>{detail.uploadedByName} · {formatDateTime(detail.createdAt)}</dd>
                <dt className="text-muted-foreground">Checksum</dt>
                <dd className="font-mono text-xs text-muted-foreground" title={`SHA-256 ${detail.sha256}`}>{detail.sha256.slice(0, 16)}…</dd>
                {detail.description && (<><dt className="text-muted-foreground">Notes</dt><dd className="whitespace-pre-wrap">{detail.description}</dd></>)}
              </dl>

              {detail.history.length > 1 && (
                <div>
                  <p className="mb-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">Version history</p>
                  <ol className="divide-y rounded-lg border text-sm">
                    {detail.history.map((h) => (
                      <li key={h.id} className="flex items-center gap-3 px-3 py-2">
                        <span className="w-7 shrink-0 font-mono text-xs text-muted-foreground">v{h.version}</span>
                        <div className="min-w-0 flex-1">
                          <p className="truncate">{h.fileName}</p>
                          <p className="text-xs text-muted-foreground">{h.uploadedByName} · {formatDateTime(h.createdAt)}</p>
                        </div>
                        <Badge variant={STATUS_VARIANT[h.status]}>{STATUS_LABEL[h.status]}</Badge>
                        <Button asChild variant="ghost" size="icon" className="h-8 w-8">
                          <a href={downloadUrl(h.id)} aria-label={`Download version ${h.version}`}><Download /></a>
                        </Button>
                      </li>
                    ))}
                  </ol>
                </div>
              )}
            </div>
          )}

          <DialogFooter className="gap-2 sm:justify-between">
            <div>
              {detail && canArchive && detail.status !== "ARCHIVED" && (
                <Button variant="ghost" className="text-destructive hover:text-destructive" onClick={() => setConfirming(true)}>
                  <Archive /> Archive
                </Button>
              )}
            </div>
            <div className="flex gap-2">
              {detail?.requirementId && canUpload && (
                <Button variant="outline" onClick={() => { onOpenChange(false); onNewVersion(detail.requirementId!, detail.periodKey); }}>
                  <CloudUpload /> New version
                </Button>
              )}
              {detail && (
                <Button asChild>
                  <a href={downloadUrl(detail.id)}><Download /> Download</a>
                </Button>
              )}
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={confirming}
        onOpenChange={setConfirming}
        title="Archive this file?"
        description={
          detail?.status === "CURRENT" && detail.history.some((h) => h.status === "SUPERSEDED")
            ? "It will be hidden from the checklist, and the previous version becomes current again. The file stays in the audit history."
            : "It will be hidden from the checklist and lists. The file stays in the audit history."
        }
        confirmLabel="Archive"
        onConfirm={archive}
        loading={archiving}
        variant="destructive"
      />
    </>
  );
}
