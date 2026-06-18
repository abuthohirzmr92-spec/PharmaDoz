"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { Image, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/cn";
import { AppButton } from "@/components/ui/app-button";
import { AppBadge } from "@/components/ui/app-badge";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface AvatarUploadProps {
  /** Existing avatar URL from server (Supabase Storage / database). */
  imageUrl?: string | null;
  /** User name for initials fallback. */
  name?: string;
  /** Called when user selects or removes a file. */
  onChange?: (file: File | null) => void;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getInitials(name?: string): string {
  if (!name?.trim()) return "?";
  const parts = name.trim().split(/\s+/);
  const first = parts[0];
  if (!first) return "?";
  if (parts.length === 1) return first.charAt(0).toUpperCase();
  const last = parts[parts.length - 1];
  if (!last) return first.charAt(0).toUpperCase();
  return (first.charAt(0) + last.charAt(0)).toUpperCase();
}

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function AvatarUpload({ imageUrl, name, onChange }: AvatarUploadProps) {
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const displayImage = avatarPreview ?? imageUrl ?? null;
  const initials = getInitials(name);
  const hasImage = Boolean(displayImage);

  // Revoke object URL on unmount to prevent memory leaks
  useEffect(() => {
    return () => {
      if (avatarPreview) URL.revokeObjectURL(avatarPreview);
    };
  }, [avatarPreview]);

  // -----------------------------------------------------------------------
  // Validation
  // -----------------------------------------------------------------------

  const validateFile = useCallback((file: File): boolean => {
    if (!file.type.startsWith("image/")) {
      toast.error("Hanya file gambar yang diperbolehkan (PDF, ZIP, DOC ditolak).");
      return false;
    }
    if (file.size > MAX_FILE_SIZE) {
      toast.error("Ukuran file maksimum 5 MB.");
      return false;
    }
    return true;
  }, []);

  // -----------------------------------------------------------------------
  // Handlers
  // -----------------------------------------------------------------------

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      if (!validateFile(file)) {
        // Reset input so the same file can be re-selected after a rejection
        if (fileInputRef.current) fileInputRef.current.value = "";
        return;
      }

      const previewUrl = URL.createObjectURL(file);
      // Revoke previous preview to avoid memory leaks
      if (avatarPreview) URL.revokeObjectURL(avatarPreview);

      setAvatarPreview(previewUrl);
      onChange?.(file);
    },
    [avatarPreview, onChange, validateFile],
  );

  const handleRemove = useCallback(() => {
    if (avatarPreview) URL.revokeObjectURL(avatarPreview);
    setAvatarPreview(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
    onChange?.(null);
  }, [avatarPreview, onChange]);

  const handleChangePhoto = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  // -----------------------------------------------------------------------
  // Render
  // -----------------------------------------------------------------------

  return (
    <div className="flex flex-col items-center gap-2 shrink-0">
      {/* Avatar circle / image */}
      {hasImage ? (
        <img
          src={displayImage!}
          alt={name ?? "Avatar"}
          className="h-14 w-14 rounded-full object-cover ring-2 ring-white shadow-sm dark:ring-neutral-800"
        />
      ) : (
        <div
          className={cn(
            "flex h-14 w-14 items-center justify-center rounded-full text-lg font-bold",
            "bg-gradient-to-br from-brand-100 to-brand-200 text-brand-600",
            "dark:from-brand-900 dark:to-brand-800 dark:text-brand-400",
          )}
        >
          {initials}
        </div>
      )}

      {/* Action buttons */}
      <div className="flex items-center gap-1">
        <AppButton variant="ghost" size="sm" onClick={handleChangePhoto}>
          <Image className="h-3.5 w-3.5" />
          Ganti Foto
        </AppButton>
        {hasImage && (
          <AppButton variant="ghost" size="sm" onClick={handleRemove}>
            <Trash2 className="h-3.5 w-3.5" />
            Hapus
          </AppButton>
        )}
      </div>

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFileChange}
      />
    </div>
  );
}
