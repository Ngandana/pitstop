"use client";

import { useActionState, useEffect, useId, useState } from "react";
import { Loader2, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { updateServiceSchedule } from "@/app/(app)/fleet/servicing-actions";
import type { FormResult } from "@/app/(app)/fleet/actions";

export function ScheduleEditForm({
  scheduleId,
  bikeId,
  label,
  intervalKm,
  maxIntervalDays,
}: {
  scheduleId: string;
  bikeId: string;
  label: string;
  intervalKm: number;
  maxIntervalDays: number;
}) {
  const [open, setOpen] = useState(false);
  const action = updateServiceSchedule.bind(null, scheduleId, bikeId);
  const [state, formAction, pending] = useActionState<FormResult | null, FormData>(action, null);
  const intervalId = useId();
  const daysId = useId();

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (state?.ok) setOpen(false);
  }, [state]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button
          type="button"
          aria-label={`Edit ${label} interval`}
          className="cursor-pointer text-text-muted transition-colors duration-150 hover:text-foreground"
        >
          <Pencil className="size-3.5" aria-hidden="true" />
        </button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{label} interval</DialogTitle>
          <DialogDescription>
            Overrides the default for this bike only — other bikes keep the org-wide default.
          </DialogDescription>
        </DialogHeader>

        <form action={formAction} className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor={intervalId}>Interval (km)</Label>
            <Input
              id={intervalId}
              name="intervalKm"
              type="number"
              inputMode="numeric"
              defaultValue={intervalKm}
              required
              disabled={pending}
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor={daysId}>Max interval (days)</Label>
            <Input
              id={daysId}
              name="maxIntervalDays"
              type="number"
              inputMode="numeric"
              defaultValue={maxIntervalDays}
              required
              disabled={pending}
            />
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
                "Save"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
