"use client";

import { useRef, useState, type Dispatch, type SetStateAction } from "react";
import { Camera, Check, Loader2 } from "lucide-react";
import imageCompression from "browser-image-compression";
import { cn } from "@/lib/utils";
import { HANDOVER_PHOTO_ANGLES } from "@/lib/validation/assignments";

type Angle = (typeof HANDOVER_PHOTO_ANGLES)[number];

const ANGLE_LABELS: Record<Angle, string> = {
  front: "Front",
  rear: "Rear",
  left: "Left side",
  right: "Right side",
  odometer: "Odometer",
  damage: "Existing damage",
};

const COMPRESSION_OPTIONS = {
  maxSizeMB: 0.3,
  maxWidthOrHeight: 1600,
  useWebWorker: true,
  fileType: "image/jpeg" as const,
};

export type PhotoState = Partial<Record<Angle, File>>;

export function HandoverPhotoCapture({
  photos,
  onPhotosChange,
}: {
  photos: PhotoState;
  onPhotosChange: Dispatch<SetStateAction<PhotoState>>;
}) {
  // A set, not a single value — capturing two photos back to back (or a
  // gallery multi-pick) fires concurrent compressions, and a single
  // `Angle | null` would let the last one to start clobber the others'
  // busy indicator.
  const [compressing, setCompressing] = useState<Set<Angle>>(new Set());

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
      {HANDOVER_PHOTO_ANGLES.map((angle) => (
        <PhotoTile
          key={angle}
          angle={angle}
          file={photos[angle]}
          busy={compressing.has(angle)}
          onCapture={async (rawFile) => {
            setCompressing((prev) => new Set(prev).add(angle));
            try {
              const compressed = await imageCompression(rawFile, COMPRESSION_OPTIONS);
              // Functional update — concurrent captures for other angles
              // must not be clobbered by a stale `photos` closure here.
              onPhotosChange((prev) => ({ ...prev, [angle]: compressed }));
            } finally {
              setCompressing((prev) => {
                const next = new Set(prev);
                next.delete(angle);
                return next;
              });
            }
          }}
        />
      ))}
    </div>
  );
}

function PhotoTile({
  angle,
  file,
  busy,
  onCapture,
}: {
  angle: Angle;
  file: File | undefined;
  busy: boolean;
  onCapture: (file: File) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const previewUrl = file ? URL.createObjectURL(file) : null;

  return (
    <div>
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={busy}
        aria-label={file ? `Retake ${ANGLE_LABELS[angle]} photo` : `Capture ${ANGLE_LABELS[angle]} photo`}
        className={cn(
          "relative flex aspect-square w-full cursor-pointer flex-col items-center justify-center gap-1.5 overflow-hidden rounded-lg border-2 border-dashed transition-colors duration-150 disabled:cursor-not-allowed disabled:opacity-50",
          file ? "border-success/40 bg-success-surface" : "border-border bg-surface-sunken hover:border-accent/40",
        )}
      >
        {previewUrl ? (
          // eslint-disable-next-line @next/next/no-img-element -- transient object URL preview, not an optimizable asset
          <img src={previewUrl} alt="" className="absolute inset-0 size-full object-cover" />
        ) : null}

        {busy ? (
          <div className="relative z-10 flex flex-col items-center gap-1.5 rounded-md bg-background/80 px-2 py-1.5">
            <Loader2 className="size-5 animate-spin text-accent" aria-hidden="true" />
            <span className="text-xs font-medium text-foreground">Compressing…</span>
          </div>
        ) : file ? (
          <div className="relative z-10 flex items-center gap-1 rounded-full bg-background/90 px-2 py-1">
            <Check className="size-3.5 text-success" aria-hidden="true" />
            <span className="text-xs font-medium text-foreground">Retake</span>
          </div>
        ) : (
          <>
            <Camera className="size-6 text-text-muted" aria-hidden="true" />
            <span className="text-xs font-medium text-text-secondary">{ANGLE_LABELS[angle]}</span>
          </>
        )}
      </button>

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="sr-only"
        onChange={(e) => {
          const rawFile = e.target.files?.[0];
          if (rawFile) onCapture(rawFile);
          e.target.value = "";
        }}
      />
      <p className="mt-1 text-center text-xs text-text-secondary">{ANGLE_LABELS[angle]}</p>
    </div>
  );
}
