"use client";

import { useActionState, useEffect, useId, useState } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { recordManualOdometerReading, type FormResult } from "@/app/(app)/fleet/actions";

export function ManualOdometerForm({ bikeId }: { bikeId: string }) {
  const action = recordManualOdometerReading.bind(null, bikeId);
  const [state, formAction, pending] = useActionState<FormResult | null, FormData>(action, null);
  // Controlled, deliberately: React 19 clears a <form>'s uncontrolled
  // fields after every action runs, success or failure. Left
  // uncontrolled, a rejected reading would vanish from the input at the
  // exact moment the user needs it — to tick "override" and resubmit the
  // same value — forcing them to retype it. Caught by live testing, not
  // by inspection: the retry silently hit the browser's native "required"
  // validation on an now-empty field instead of the server at all.
  const [readingValue, setReadingValue] = useState("");
  const [override, setOverride] = useState(false);
  const readingId = useId();
  const overrideId = useId();

  const wasRejected = state && !state.ok;

  useEffect(() => {
    // Only clear on a successful save — a rejection must keep the value.
    if (state?.ok) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setReadingValue("");
      setOverride(false);
    }
  }, [state]);

  return (
    <form action={formAction} className="flex flex-col gap-3">
      <div className="flex flex-col gap-2">
        <Label htmlFor={readingId}>Odometer reading (km)</Label>
        <Input
          id={readingId}
          name="readingKm"
          type="number"
          inputMode="numeric"
          required
          disabled={pending}
          value={readingValue}
          onChange={(e) => setReadingValue(e.target.value)}
        />
      </div>

      {wasRejected ? (
        <label htmlFor={overrideId} className="flex items-start gap-2 text-sm text-text-secondary">
          <input
            id={overrideId}
            name="override"
            type="checkbox"
            checked={override}
            onChange={(e) => setOverride(e.target.checked)}
            className="mt-0.5 size-4 rounded border-border accent-accent"
            disabled={pending}
          />
          I&apos;m sure this is correct — save it anyway
        </label>
      ) : null}

      {state && !state.ok ? <p className="text-sm text-danger">{state.error}</p> : null}

      <Button type="submit" disabled={pending} className="h-11 self-start" variant="outline">
        {pending ? (
          <>
            <Loader2 className="size-4 animate-spin" aria-hidden="true" />
            Saving…
          </>
        ) : (
          "Log reading"
        )}
      </Button>
    </form>
  );
}
