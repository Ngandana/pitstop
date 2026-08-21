"use client";

import { useActionState, useEffect, useId, useState } from "react";
import { Loader2 } from "lucide-react";
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
import { waiveRentCharge } from "@/app/(app)/drivers/money-actions";
import type { FormResult } from "@/app/(app)/fleet/actions";
import { formatCents } from "@/lib/format";

export function WaiveChargeForm({
  chargeId,
  driverId,
  amountCents,
  currentlyWaivedCents,
}: {
  chargeId: string;
  driverId: string;
  amountCents: number;
  currentlyWaivedCents: number;
}) {
  const [open, setOpen] = useState(false);
  const action = waiveRentCharge.bind(null, driverId);
  const [state, formAction, pending] = useActionState<FormResult | null, FormData>(action, null);
  const amountId = useId();
  const reasonId = useId();

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (state?.ok) setOpen(false);
  }, [state]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button
          type="button"
          className="text-xs font-medium text-text-muted underline-offset-2 transition-colors duration-150 hover:text-foreground hover:underline"
        >
          Waive
        </button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Waive this charge</DialogTitle>
          <DialogDescription>
            Charge amount is {formatCents(amountCents)}. Use this when the bike was off road through
            no fault of the driver — I decide, nothing auto-waives.
          </DialogDescription>
        </DialogHeader>

        <form action={formAction} className="flex flex-col gap-4">
          <input type="hidden" name="chargeId" value={chargeId} />

          <div className="flex flex-col gap-2">
            <Label htmlFor={amountId}>Amount to waive (R)</Label>
            <Input
              id={amountId}
              name="waivedRands"
              type="number"
              inputMode="decimal"
              step="0.01"
              defaultValue={currentlyWaivedCents / 100}
              required
              disabled={pending}
            />
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor={reasonId}>Reason</Label>
            <Textarea id={reasonId} name="waiveReason" required disabled={pending} rows={2} />
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
                "Waive"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
