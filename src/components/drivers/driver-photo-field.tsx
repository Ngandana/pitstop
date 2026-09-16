"use client";

import { useId, useRef, useState } from "react";
import { Camera, Loader2, X } from "lucide-react";
import imageCompression from "browser-image-compression";
import { cn } from "@/lib/utils";

const COMPRESSION_OPTIONS = {
  maxSizeMB: 0.3,
  maxWidthOrHeight: 1000,
  useWebWorker: true,
  fileType: "image/jpeg" as const,
};

/**
 * A single optional photo, submitted through the driver form's native
 * server action rather than a manual fetch (unlike HandoverPhotoCapture,
 * which has six required photos and a hand-rolled submit). Client-side
 * compression still has to happen before the browser sends the file, so
 * the compressed Blob is written back onto the real <input> via a
 * DataTransfer — the trick that lets a native <form action={...}> pick up
 * a File the user never actually selected through the file picker.
 */
export function DriverPhotoField({ existingPhotoUrl }: { existingPhotoUrl?: string | null }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(existingPhotoUrl ?? null);
  const [busy, setBusy] = useState(false);
  const [removed, setRemoved] = useState(false);
  const fieldId = useId();

  async function handleFile(file: File) {
    setBusy(true);
    try {
      const compressed = await imageCompression(file, COMPRESSION_OPTIONS);
      if (inputRef.current) {
        const dataTransfer = new DataTransfer();
        dataTransfer.items.add(new File([compressed], "driver.jpg", { type: "image/jpeg" }));
        inputRef.current.files = dataTransfer.files;
      }
      setPreviewUrl(URL.createObjectURL(compressed));
      setRemoved(false);
    } finally {
      setBusy(false);
    }
  }

  const hasPhoto = previewUrl && !removed;

  return (
    <div className="flex flex-col gap-2">
      <span className="text-sm font-medium text-foreground">
        Photo <span className="font-normal text-text-muted">(optional)</span>
      </span>
      <div className="flex items-center gap-4">
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={busy}
          aria-label={hasPhoto ? "Replace photo" : "Add photo"}
          className={cn(
            "relative flex size-20 shrink-0 items-center justify-center overflow-hidden rounded-full border-2 border-dashed transition-colors duration-150 disabled:cursor-not-allowed disabled:opacity-50",
            hasPhoto ? "border-success/40" : "border-border hover:border-accent/40",
          )}
        >
          {hasPhoto ? (
            // eslint-disable-next-line @next/next/no-img-element -- transient preview / short-lived signed URL, not an optimizable asset
            <img src={previewUrl} alt="" className="absolute inset-0 size-full object-cover" />
          ) : (
            <Camera className="size-6 text-text-muted" aria-hidden="true" />
          )}
          {busy ? (
            <div className="absolute inset-0 flex items-center justify-center bg-background/80">
              <Loader2 className="size-5 animate-spin text-accent" aria-hidden="true" />
            </div>
          ) : null}
        </button>

        <div className="flex flex-col items-start gap-1">
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={busy}
            className="text-sm font-medium text-accent transition-colors duration-150 hover:underline disabled:opacity-50"
          >
            {hasPhoto ? "Replace photo" : "Add photo"}
          </button>
          {hasPhoto ? (
            <button
              type="button"
              onClick={() => {
                setRemoved(true);
                setPreviewUrl(null);
                if (inputRef.current) inputRef.current.value = "";
              }}
              className="inline-flex items-center gap-1 text-sm text-danger transition-colors duration-150 hover:underline"
            >
              <X className="size-3.5" aria-hidden="true" />
              Remove photo
            </button>
          ) : null}
        </div>
      </div>

      <input
        ref={inputRef}
        id={fieldId}
        name="photo"
        type="file"
        accept="image/*"
        className="sr-only"
        aria-label="Driver photo"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) void handleFile(file);
        }}
      />
      {/* Tells the server action to delete the stored photo when the owner
          removed it without picking a replacement. Absent otherwise, so a
          plain edit that never touches the photo leaves it untouched. */}
      {removed ? <input type="hidden" name="removePhoto" value="true" /> : null}
    </div>
  );
}
