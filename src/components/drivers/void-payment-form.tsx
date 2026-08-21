"use client";

import { useActionState, useEffect, useId, useState } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
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
import { voidPayment } from "@/app/(app)/drivers/money-actions";
import type { FormResult } from "@/app/(app)/fleet/actions";
import { formatCents } from "@/lib/format";

export function VoidPaymentForm({
  paymentId,
  driverId,
  amountCents,
}: {
  paymentId: string;
  driverId: string;
  amountCents: number;
}) {
  const [open, setOpen] = useState(false);
  const action = voidPayment.bind(null, driverId);
  const [state, formAction, pending] = useActionState<FormResult | null, FormData>(action, null);
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
          className="cursor-pointer text-xs font-medium text-text-muted underline-offset-2 transition-colors duration-150 hover:text-danger hover:underline"
        >
          Void
        </button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Void this payment</DialogTitle>
          <DialogDescription>
            {formatCents(amountCents)} will stop counting toward this driver&apos;s balance. The
            payment record stays — it&apos;s marked voided, not deleted.
          </DialogDescription>
        </DialogHeader>

        <form action={formAction} className="flex flex-col gap-4">
          <input type="hidden" name="paymentId" value={paymentId} />

          <div className="flex flex-col gap-2">
            <Label htmlFor={reasonId}>Reason</Label>
            <Textarea id={reasonId} name="voidReason" required disabled={pending} rows={2} />
          </div>

          {state && !state.ok ? <p className="text-sm text-danger">{state.error}</p> : null}

          <DialogFooter>
            <Button type="submit" variant="destructive" disabled={pending} className="h-11">
              {pending ? (
                <>
                  <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                  Voiding…
                </>
              ) : (
                "Void payment"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
