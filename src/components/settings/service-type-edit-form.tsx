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
import { updateServiceType } from "@/app/(app)/settings/actions";
import type { FormResult } from "@/app/(app)/fleet/actions";

export function ServiceTypeEditForm({
  serviceTypeId,
  label,
  defaultIntervalKm,
  defaultMaxIntervalDays,
}: {
  serviceTypeId: string;
  label: string;
  defaultIntervalKm: number;
  defaultMaxIntervalDays: number;
}) {
  const [open, setOpen] = useState(false);
  const action = updateServiceType.bind(null, serviceTypeId);
  const [state, formAction, pending] = useActionState<FormResult | null, FormData>(action, null);
  const labelId = useId();
  const intervalId = useId();
  const daysId = useId();

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (state?.ok) setOpen(false);
  }, [state]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon-sm" aria-label={`Edit ${label} default`}>
          <Pencil className="size-3.5" aria-hidden="true" />
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{label} default</DialogTitle>
          <DialogDescription>
            Used to seed the schedule on every newly registered bike. Existing bikes keep whatever
            they&apos;re already set to — edit those from the bike&apos;s own page.
          </DialogDescription>
        </DialogHeader>

        <form action={formAction} className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor={labelId}>Label</Label>
            <Input id={labelId} name="label" defaultValue={label} required disabled={pending} maxLength={60} />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor={intervalId}>Interval (km)</Label>
            <Input
              id={intervalId}
              name="defaultIntervalKm"
              type="number"
              inputMode="numeric"
              defaultValue={defaultIntervalKm}
              required
              disabled={pending}
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor={daysId}>Max interval (days)</Label>
            <Input
              id={daysId}
              name="defaultMaxIntervalDays"
              type="number"
              inputMode="numeric"
              defaultValue={defaultMaxIntervalDays}
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
