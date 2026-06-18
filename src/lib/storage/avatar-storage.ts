/**
 * Avatar Storage Service
 *
 * Pure helpers for Supabase Storage avatar operations.
 * No UI, no toast, no side-effects beyond storage.
 *
 * Bucket: "avatars"
 * Path pattern: {userId}/{timestamp}.{ext}
 *
 * Bucket must be created manually before using these helpers.
 * See PHASE 3 P0.6 STEP 2 for the SQL migration script.
 */

import { supabase } from "@/lib/supabase/client";

const BUCKET = "avatars";

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Upload an avatar file to Supabase Storage.
 *
 * Returns the public URL of the uploaded file.
 * Throws on failure.
 */
export async function uploadAvatar(
  userId: string,
  file: File,
): Promise<string> {
  if (!supabase) throw new Error("Supabase client tidak tersedia.");

  const ext = file.name.split(".").pop()?.toLowerCase() ?? "png";
  const timestamp = Date.now();
  const filePath = `${userId}/${timestamp}.${ext}`;

  const { error: uploadErr } = await supabase.storage
    .from(BUCKET)
    .upload(filePath, file, {
      upsert: false,
      contentType: file.type,
    });

  if (uploadErr) throw uploadErr;

  const {
    data: { publicUrl },
  } = supabase.storage.from(BUCKET).getPublicUrl(filePath);

  return publicUrl;
}

/**
 * Remove an existing avatar file from Supabase Storage.
 *
 * Pass the old avatar URL. If empty/null or not a valid avatars bucket
 * URL, the call is silently skipped (no-op).
 */
export async function removeAvatar(avatarUrl?: string | null): Promise<void> {
  if (!avatarUrl) return;
  if (!supabase) return;

  const filePath = extractPathFromUrl(avatarUrl);
  if (!filePath) return; // not a valid avatars URL — skip

  // Don't throw — best-effort cleanup
  try {
    await supabase.storage.from(BUCKET).remove([filePath]);
  } catch {
    // Silently ignore cleanup failures — the old file becomes orphaned
    // which is acceptable (storage waste, not data corruption).
  }
}

/**
 * Return the public URL for a given avatar storage path.
 */
export function getAvatarPublicUrl(filePath: string): string {
  if (!supabase) return "";

  const {
    data: { publicUrl },
  } = supabase.storage.from(BUCKET).getPublicUrl(filePath);

  return publicUrl;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Extract the bucket-relative path from a Supabase Storage public URL.
 *
 * URL format:
 *   https://<project>.supabase.co/storage/v1/object/public/avatars/<path>
 *
 * Returns the <path> portion, or null if the URL doesn't match.
 */
function extractPathFromUrl(url: string): string | null {
  try {
    const parsed = new URL(url);
    // Expected pathname: /storage/v1/object/public/avatars/<filePath>
    const prefix = `/storage/v1/object/public/${BUCKET}/`;
    if (parsed.pathname.startsWith(prefix)) {
      return parsed.pathname.slice(prefix.length);
    }
    return null;
  } catch {
    return null;
  }
}
