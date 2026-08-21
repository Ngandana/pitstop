"use client";

import { useActionState, useEffect, useId, useState } from "react";
import { Loader2, Wrench } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { logService } from "@/app/(app)/fleet/servicing-actions";
import type { FormResult } from "@/app/(app)/fleet/actions";

function todaySAST(): string {
  const sast = new Date(Date.now() + 2 * 60 * 60 * 1000);
  return sast.toISOString().slice(0, 10);
}

export function LogServiceForm({
  bikeId,
  serviceTypes,
}: {
  bikeId: string;
  serviceTypes: { serviceTypeId: string; label: string }[];
}) {
  const [open, setOpen] = useState(false);
  const action = logService.bind(null, bikeId);
  const [state, formAction, pending] = useActionState<FormResult | null, FormData>(action, null);

  // Controlled for the same reason as ManualOdometerForm — React 19 clears
  // uncontrolled fields after every action, and a rejected reading must
  // survive so the owner can tick "override" and resubmit it.
  const [odometerValue, setOdometerValue] = useState("");
  const [override, setOverride] = useState(false);

  const typeId = useId();
  const odoId = useId();
  const dateId = useId();
  const costId = useId();
  const workshopId = useId();
  const notesId = useId();
  const overrideId = useId();

  const wasRejected = state && !state.ok;

  useEffect(() => {
    // One-time reaction to the action's result, not a cascading update —
    // closes the dialog and clears the form only on success.
    if (state?.ok) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setOpen(false);
      setOdometerValue("");
      setOverride(false);
    }
  }, [state]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="h-11">
          <Wrench className="size-4" aria-hidden="true" />
          Log service
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Log a service</DialogTitle>
          <DialogDescription>
            A completed service only — this resets that item&apos;s due date and moves the km
            baseline forward.
          </DialogDescription>
        </DialogHeader>

        <form action={formAction} className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor={typeId}>Service</Label>
            <select
              id={typeId}
              name="serviceTypeId"
              required
              disabled={pending}
              className="h-10 rounded-lg border border-border bg-background px-3 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              {serviceTypes.map((t) => (
                <option key={t.serviceTypeId} value={t.serviceTypeId}>
                  {t.label}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor={odoId}>Odometer (km)</Label>
              <Input
                id={odoId}
                name="odometerKm"
                type="number"
                inputMode="numeric"
                required
                disabled={pending}
                value={odometerValue}
                onChange={(e) => setOdometerValue(e.target.value)}
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor={dateId}>Date</Label>
              <Input id={dateId} name="performedAt" type="date" defaultValue={todaySAST()} required disabled={pending} />
            </div>
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
              I&apos;m sure this is correct — log it anyway
            </label>
          ) : null}

          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor={costId}>
                Cost (R) <span className="font-normal text-text-muted">(optional)</span>
              </Label>
              <Input id={costId} name="costRands" type="number" inputMode="decimal" step="0.01" disabled={pending} />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor={workshopId}>
                Workshop <span className="font-normal text-text-muted">(optional)</span>
              </Label>
              <Input id={workshopId} name="workshopName" disabled={pending} />
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor={notesId}>
              Notes <span className="font-normal text-text-muted">(optional)</span>
            </Label>
            <Textarea id={notesId} name="notes" disabled={pending} rows={2} />
          </div>

          {state && !state.ok ? <p className="text-sm text-danger">{state.error}</p> : null}

          <DialogFooter>
            <Button type="submit" disabled={pending} className="h-11">
              {pending ? (
                <>
                  <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                  Saving…
                </>
              ) : (
                "Log service"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
