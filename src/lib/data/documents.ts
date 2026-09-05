import { createClient } from "@/lib/supabase/server";

export const DOCUMENTS_BUCKET = "subscription-documents";

export interface DocumentRow {
  id: string;
  filename: string;
  mimeType: string;
  sizeBytes: number;
  createdAt: string;
  downloadUrl: string | null;
}

/** Documents for a subscription, each with a short-lived signed download URL. */
export async function listDocuments(organizationId: string, subscriptionId: string): Promise<DocumentRow[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("subscription_documents")
    .select("id, original_filename, mime_type, size_bytes, storage_path, created_at")
    .eq("organization_id", organizationId)
    .eq("subscription_id", subscriptionId)
    .order("created_at", { ascending: false });

  const rows = (data ?? []) as {
    id: string;
    original_filename: string;
    mime_type: string;
    size_bytes: number | string;
    storage_path: string;
    created_at: string;
  }[];

  const out: DocumentRow[] = [];
  for (const d of rows) {
    const { data: signed } = await supabase.storage.from(DOCUMENTS_BUCKET).createSignedUrl(d.storage_path, 300);
    out.push({
      id: d.id,
      filename: d.original_filename,
      mimeType: d.mime_type,
      sizeBytes: Number(d.size_bytes),
      createdAt: d.created_at,
      downloadUrl: signed?.signedUrl ?? null,
    });
  }
  return out;
}
