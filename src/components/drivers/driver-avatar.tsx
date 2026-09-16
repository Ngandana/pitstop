import { cn } from "@/lib/utils";

/** Shared between the driver list (small) and driver detail page (larger). */
export function DriverAvatar({
  photoUrl,
  name,
  size = "size-10",
}: {
  photoUrl: string | null;
  name: string;
  size?: string;
}) {
  if (photoUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element -- short-lived signed URL, not an optimizable static asset
      <img src={photoUrl} alt="" className={cn(size, "shrink-0 rounded-full object-cover")} />
    );
  }
  const initials = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
  return (
    <div
      className={cn(
        size,
        "flex shrink-0 items-center justify-center rounded-full bg-surface-sunken text-xs font-semibold text-text-secondary",
      )}
      aria-hidden="true"
    >
      {initials || "?"}
    </div>
  );
}
