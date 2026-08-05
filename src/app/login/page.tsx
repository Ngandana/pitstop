"use client";

import { useActionState } from "react";
import { Loader2, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { requestMagicLink, type MagicLinkResult } from "./actions";

const initialState: MagicLinkResult | null = null;

export default function LoginPage() {
  const [state, formAction, pending] = useActionState(requestMagicLink, initialState);

  return (
    <main className="flex min-h-dvh items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Pitstop</h1>
          <p className="mt-1 text-sm text-text-secondary">Fleet operations, not guesswork.</p>
        </div>

        <div className="rounded-xl border border-border bg-surface-raised p-6 shadow-md">
          {state?.ok ? (
            <div className="flex flex-col items-center gap-3 py-4 text-center">
              <div className="flex size-11 items-center justify-center rounded-full bg-info-surface text-info">
                <Mail className="size-5" aria-hidden="true" />
              </div>
              <p className="text-sm font-medium text-foreground">Check your email</p>
              <p className="text-sm text-text-secondary">
                If that&apos;s the registered owner address, a sign-in link is on its way.
              </p>
            </div>
          ) : (
            <form action={formAction} className="flex flex-col gap-4">
              <div className="flex flex-col gap-2">
                <Label htmlFor="email">Email address</Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  placeholder="you@example.com"
                  required
                  disabled={pending}
                  aria-describedby={state && !state.ok ? "email-error" : undefined}
                  aria-invalid={state && !state.ok ? true : undefined}
                />
                {state && !state.ok ? (
                  <p id="email-error" className="text-sm text-danger">
                    {state.error}
                  </p>
                ) : null}
              </div>

              <Button type="submit" disabled={pending} className="h-11 w-full">
                {pending ? (
                  <>
                    <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                    Sending link…
                  </>
                ) : (
                  "Send magic link"
                )}
              </Button>

              <p className="text-center text-xs text-text-muted">
                Single-owner tool — no password, no sign-up.
              </p>
            </form>
          )}
        </div>
      </div>
    </main>
  );
}
