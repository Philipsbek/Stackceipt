"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Download, FileText, Loader2, Trash2, Upload } from "lucide-react";
import { uploadDocumentAction, deleteDocumentAction } from "@/lib/actions/documents";
import { Button } from "@/components/ui/button";

export interface DocumentItem {
  id: string;
  filename: string;
  sizeBytes: number;
  createdAt: string;
  downloadUrl: string | null;
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function DocumentUploader({ orgSlug, subscriptionId }: { orgSlug: string; subscriptionId: string }) {
  const router = useRouter();
  const [busy, setBusy] = React.useState(false);
  const inputRef = React.useRef<HTMLInputElement>(null);

  async function onChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setBusy(true);
    const fd = new FormData();
    fd.set("file", file);
    const result = await uploadDocumentAction(orgSlug, subscriptionId, fd);
    setBusy(false);
    if (inputRef.current) inputRef.current.value = "";
    if (result.error) {
      toast.error(result.error);
      return;
    }
    toast.success("Document uploaded");
    router.refresh();
  }

  return (
    <>
      <input ref={inputRef} type="file" hidden onChange={onChange} />
      <Button size="sm" variant="outline" onClick={() => inputRef.current?.click()} disabled={busy}>
        {busy ? <Loader2 className="size-4 animate-spin" /> : <Upload className="size-4" />} Upload document
      </Button>
    </>
  );
}

function DeleteDocumentButton({ orgSlug, id }: { orgSlug: string; id: string }) {
  const router = useRouter();
  const [busy, setBusy] = React.useState(false);
  async function del() {
    setBusy(true);
    const result = await deleteDocumentAction(orgSlug, id);
    setBusy(false);
    if (result.error) {
      toast.error(result.error);
      return;
    }
    toast.success("Document removed");
    router.refresh();
  }
  return (
    <Button variant="ghost" size="icon" className="size-8 text-muted-foreground hover:text-destructive" aria-label="Delete document" onClick={del} disabled={busy}>
      {busy ? <Loader2 className="size-4 animate-spin" /> : <Trash2 className="size-4" />}
    </Button>
  );
}

export function DocumentList({ orgSlug, documents, canManage }: { orgSlug: string; documents: DocumentItem[]; canManage: boolean }) {
  if (documents.length === 0) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <FileText className="size-4" /> No documents uploaded.
      </div>
    );
  }
  return (
    <ul className="divide-y divide-border">
      {documents.map((d) => (
        <li key={d.id} className="flex items-center justify-between gap-3 py-2.5">
          <div className="flex min-w-0 items-center gap-2.5">
            <FileText className="size-4 shrink-0 text-muted-foreground" />
            <div className="min-w-0">
              <div className="truncate text-sm font-medium">{d.filename}</div>
              <div className="text-xs text-muted-foreground">{formatSize(d.sizeBytes)}</div>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-1">
            {d.downloadUrl ? (
              <Button asChild variant="ghost" size="icon" className="size-8" aria-label={`Download ${d.filename}`}>
                <a href={d.downloadUrl} target="_blank" rel="noopener noreferrer"><Download className="size-4" /></a>
              </Button>
            ) : null}
            {canManage ? <DeleteDocumentButton orgSlug={orgSlug} id={d.id} /> : null}
          </div>
        </li>
      ))}
    </ul>
  );
}
