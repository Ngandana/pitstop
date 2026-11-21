export default function NotInvitedPage() {
  return (
    <main className="flex min-h-dvh items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm rounded-xl border border-border bg-surface-raised p-6 text-center shadow-md">
        <h1 className="text-xl font-bold text-foreground">You haven&apos;t been invited yet</h1>
        <p className="mt-2 text-sm text-text-secondary">
          RideStack is invite-only while it&apos;s in testing. Ask the person who shared it with you to add
          your email address, then sign in again.
        </p>
        <form action="/auth/signout" method="post" className="mt-5">
          <button
            type="submit"
            className="h-11 w-full cursor-pointer rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground"
          >
            Sign out
          </button>
        </form>
      </div>
    </main>
  );
}
