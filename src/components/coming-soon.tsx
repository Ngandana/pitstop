import type { LucideIcon } from "lucide-react";

/**
 * Honest placeholder for screens not yet built — distinct from a real
 * empty state (§6 bans "shrugging illustrations" for empty *data*, this
 * is about unbuilt *screens*, which is different: there's truly nothing
 * to show yet, and pretending otherwise would be worse).
 */
export function ComingSoon({
  icon: Icon,
  title,
  description,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
}) {
  return (
    <div>
      <h1 className="text-hero text-foreground">{title}</h1>
      <div className="mt-8 flex flex-col items-center gap-3 rounded-xl border border-dashed border-border py-16 text-center">
        <Icon className="size-8 text-text-muted" aria-hidden="true" />
        <p className="max-w-sm text-sm text-text-secondary">{description}</p>
      </div>
    </div>
  );
}
