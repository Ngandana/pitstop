"use client";

import { useActionState, useId } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { updateRentPolicy } from "@/app/(app)/settings/actions";
import type { FormResult } from "@/app/(app)/fleet/actions";

export function RentPolicyForm({
  defaultWeeklyRentRands,
  defaultDepositRands,
}: {
  defaultWeeklyRentRands: number | null;
  defaultDepositRands: number | null;
}) {
  const [state, formAction, pending] = useActionState<FormResult | null, FormData>(updateRentPolicy, null);
  const weeklyId = useId();
  const depositId = useId();

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-2">
          <Label htmlFor={weeklyId}>Weekly rent (R)</Label>
          <Input
            id={weeklyId}
            name="weeklyRentRands"
            type="number"
            inputMode="decimal"
            step="0.01"
            defaultValue={defaultWeeklyRentRands ?? ""}
            placeholder="e.g. 850"
            disabled={pending}
          />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor={depositId}>Deposit (R)</Label>
          <Input
            id={depositId}
            name="depositRands"
            type="number"
            inputMode="decimal"
            step="0.01"
            defaultValue={defaultDepositRands ?? ""}
            placeholder="e.g. 1000"
            disabled={pending}
          />
        </div>
      </div>
      <p className="text-xs text-text-muted">
        Pre-fills a new handover on <span className="font-medium">/assignments/new</span> — never
        required, and each assignment can still override it.
      </p>

      {state && !state.ok ? <p className="text-sm text-danger">{state.error}</p> : null}
      {state?.ok ? <p className="text-sm text-success">Saved.</p> : null}

      <div>
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
      </div>
    </form>
  );
}
