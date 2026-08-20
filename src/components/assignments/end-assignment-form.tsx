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
import { endAssignment } from "@/app/(app)/assignments/actions";
import type { FormResult } from "@/app/(app)/fleet/actions";

export function EndAssignmentForm({
  assignmentId,
  minOdometerKm,
}: {
  assignmentId: string;
  minOdometerKm: number;
}) {
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useActionState<FormResult | null, FormData>(
    endAssignment,
    null,
  );
  const odometerId = useId();
  const reasonId = useId();

  useEffect(() => {
    // Close the dialog once the action succeeds — a one-time reaction to
    // the result, not a cascading update.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (state?.ok) setOpen(false);
  }, [state]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="h-11 self-start">
          End assignment
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>End this assignment</DialogTitle>
          <DialogDescription>
            This marks the assignment as ended and sets the bike back to{" "}
            <strong>unassigned</strong>. It won&apos;t delete anything — the assignment stays in
            history.
          </DialogDescription>
        </DialogHeader>

        <form action={formAction} className="flex flex-col gap-4">
          <input type="hidden" name="assignmentId" value={assignmentId} />

          <div className="flex flex-col gap-2">
            <Label htmlFor={odometerId}>End odometer (km)</Label>
            <Input
              id={odometerId}
              name="endOdometerKm"
              type="number"
              inputMode="numeric"
              min={minOdometerKm}
              required
              disabled={pending}
            />
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor={reasonId}>Reason</Label>
            <Textarea
              id={reasonId}
              name="endReason"
              required
              disabled={pending}
              placeholder="e.g. driver left, bike returned"
            />
          </div>

          {state && !state.ok ? <p className="text-sm text-danger">{state.error}</p> : null}

          <DialogFooter>
            <Button type="submit" disabled={pending} className="h-11">
              {pending ? (
                <>
                  <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                  Ending…
                </>
              ) : (
                "End assignment"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
