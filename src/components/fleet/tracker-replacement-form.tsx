"use client";

import { useActionState, useEffect, useId, useState } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { recordTrackerReplacement, type FormResult } from "@/app/(app)/fleet/actions";

/**
 * Re-baselining after a tracker swap. Deliberately asks for the bike's own
 * dashboard reading rather than an "offset" — the owner can read the former
 * off the bike in seconds, whereas the latter is an implementation detail
 * they'd have to work out by hand.
 */
export function TrackerReplacementForm({
  bikeId,
  currentOffsetKm,
}: {
  bikeId: string;
  currentOffsetKm: number;
}) {
  const action = recordTrackerReplacement.bind(null, bikeId);
  const [state, formAction, pending] = useActionState<FormResult | null, FormData>(action, null);
  // Controlled for the same reason as ManualOdometerForm: React 19 clears
  // uncontrolled fields after every action, so a failed save would wipe the
  // value the owner just walked out to the bike to read.
  const [trueKm, setTrueKm] = useState("");
  const trueKmId = useId();

  useEffect(() => {
    if (state?.ok) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setTrueKm("");
    }
  }, [state]);

  return (
    <form action={formAction} className="flex flex-col gap-3">
      <p className="text-sm text-text-secondary">
        Fitted a new tracker? It starts counting from zero, so tell Pitstop what the bike&apos;s own
        odometer reads and it will keep the real total from here on.
      </p>

      <div className="flex flex-col gap-2">
        <Label htmlFor={trueKmId}>Odometer on the bike right now (km)</Label>
        <Input
          id={trueKmId}
          name="trueKm"
          type="number"
          inputMode="numeric"
          required
          disabled={pending}
          value={trueKm}
          onChange={(e) => setTrueKm(e.target.value)}
        />
      </div>

      {currentOffsetKm !== 0 ? (
        <p className="text-sm text-text-secondary tabular-nums">
          Current adjustment: {currentOffsetKm > 0 ? "+" : ""}
          {currentOffsetKm.toLocaleString("en-ZA")} km on top of what the tracker reports.
        </p>
      ) : null}

      {state && !state.ok ? <p className="text-sm text-danger">{state.error}</p> : null}
      {state?.ok ? (
        <p className="text-sm text-success">
          Re-baselined. Tonight&apos;s sync will carry on from this reading.
        </p>
      ) : null}

      <Button type="submit" disabled={pending} className="h-11 self-start" variant="outline">
        {pending ? (
          <>
            <Loader2 className="size-4 animate-spin" aria-hidden="true" />
            Saving…
          </>
        ) : (
          "Re-baseline odometer"
        )}
      </Button>
    </form>
  );
}
