"use server";

import { revalidatePath } from "next/cache";
import { appendAudit, DEMO_READONLY_ERROR, resolveActor } from "./_shared";
import { DOCUMENTS_BUCKET } from "@/lib/data/documents";

export type ActionResult = { error?: string; ok?: boolean };

const MAX_BYTES = 25 * 1024 * 1024; // matches the DB size cap

function friendly(message: string): string {
  if (message.includes("row-level security") || message.toLowerCase().includes("unauthorized")) {
    return "You don't have permission to upload documents here.";
  }
  if (message.includes("size")) return "File is too large (25 MB max).";
  return "Something went wrong with the upload. Please try again.";
}

function safeName(name: string): string {
  return name.replace(/[^a-zA-Z0-9._-]+/g, "_").slice(0, 120) || "file";
}

export async function uploadDocumentAction(orgSlug: string, subscriptionId: string, formData: FormData): Promise<ActionResult> {
  const actor = await resolveActor(orgSlug);
  if (!actor) return { error: "Not authorized" };
  if (actor.isReadOnly) return { error: DEMO_READONLY_ERROR };
  if (actor.role !== "OWNER" && actor.role !== "ADMIN") return { error: "Only owners and admins can upload documents." };
  const { supabase, orgId, memberId } = actor;

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) return { error: "Choose a file to upload." };
  if (file.size > MAX_BYTES) return { error: "File must be 25 MB or smaller." };

  // Confirm the subscription is in this org (RLS also enforces this).
  const { data: sub } = await supabase
    .from("subscriptions")
    .select("id")
    .eq("organization_id", orgId)
    .eq("id", subscriptionId)
    .maybeSingle();
  if (!sub) return { error: "Subscription not found." };

  // Path must start with the org id — the storage RLS keys off the first segment.
  const path = `${orgId}/${subscriptionId}/${crypto.randomUUID()}-${safeName(file.name)}`;
  const { error: upErr } = await supabase.storage.from(DOCUMENTS_BUCKET).upload(path, file, {
    contentType: file.type || "application/octet-stream",
    upsert: false,
  });
  if (upErr) return { error: friendly(upErr.message) };

  const { error: rowErr } = await supabase.from("subscription_documents").insert({
    organization_id: orgId,
    subscription_id: subscriptionId,
    storage_path: path,
    original_filename: file.name,
    mime_type: file.type || "application/octet-stream",
    size_bytes: file.size,
    uploaded_by_member_id: memberId,
  });
  if (rowErr) {
    // Roll back the uploaded object so we don't orphan it.
    await supabase.storage.from(DOCUMENTS_BUCKET).remove([path]);
    return { error: friendly(rowErr.message) };
  }

  await appendAudit(supabase, orgId, "document.uploaded", "subscription", subscriptionId, null, { filename: file.name }, {});
  revalidatePath(`/app/${orgSlug}/subscriptions/${subscriptionId}`);
  return { ok: true };
}

export async function deleteDocumentAction(orgSlug: string, documentId: string): Promise<ActionResult> {
  const actor = await resolveActor(orgSlug);
  if (!actor) return { error: "Not authorized" };
  if (actor.isReadOnly) return { error: DEMO_READONLY_ERROR };
  if (actor.role !== "OWNER" && actor.role !== "ADMIN") return { error: "Only owners and admins can delete documents." };
  const { supabase, orgId } = actor;

  const { data: doc } = await supabase
    .from("subscription_documents")
    .select("id, storage_path, subscription_id, original_filename")
    .eq("organization_id", orgId)
    .eq("id", documentId)
    .maybeSingle();
  if (!doc) return { error: "Document not found." };

  const { error } = await supabase.from("subscription_documents").delete().eq("organization_id", orgId).eq("id", documentId);
  if (error) return { error: friendly(error.message) };
  await supabase.storage.from(DOCUMENTS_BUCKET).remove([doc.storage_path]);

  await appendAudit(supabase, orgId, "document.deleted", "subscription", doc.subscription_id, { filename: doc.original_filename }, null, {});
  revalidatePath(`/app/${orgSlug}/subscriptions/${doc.subscription_id}`);
  return { ok: true };
}
