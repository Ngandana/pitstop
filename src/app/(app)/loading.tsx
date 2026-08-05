function SkeletonBlock({ className }: { className: string }) {
  return <div className={`animate-pulse rounded-lg bg-surface-sunken ${className}`} />;
}

/** Mirrors the Today page's final layout — no centred spinner (§6). */
export default function TodayLoading() {
  return (
    <div className="flex flex-col gap-8">
      <header>
        <SkeletonBlock className="h-11 w-40" />
        <SkeletonBlock className="mt-2 h-4 w-48" />
      </header>

      <section>
        <SkeletonBlock className="mb-3 h-4 w-36" />
        <SkeletonBlock className="h-16 w-full" />
      </section>

      <section>
        <SkeletonBlock className="mb-3 h-4 w-32" />
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <SkeletonBlock className="h-32 w-full" />
          <SkeletonBlock className="h-32 w-full" />
        </div>
      </section>
    </div>
  );
}
