"use client";

import { useActionState, useId, useState } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { updateBikeStatus, type FormResult } from "@/app/(app)/fleet/actions";
import type { bikeStatusEnum } from "@/db/schema";

type BikeStatus = (typeof bikeStatusEnum.enumValues)[number];

const STATUS_OPTIONS: { value: BikeStatus; label: string }[] = [
  { value: "unassigned", label: "Unassigned" },
  { value: "active", label: "Active" },
  { value: "in_service", label: "In service" },
  { value: "off_road", label: "Off road" },
  { value: "stolen", label: "Stolen" },
  { value: "written_off", label: "Written off" },
  { value: "sold", label: "Sold" },
];

const REASON_REQUIRED: BikeStatus[] = ["off_road", "stolen", "written_off"];

export function StatusChangeForm({ bikeId, currentStatus }: { bikeId: string; currentStatus: BikeStatus }) {
  const action = updateBikeStatus.bind(null, bikeId);
  const [state, formAction, pending] = useActionState<FormResult | null, FormData>(action, null);
  const [status, setStatus] = useState<BikeStatus>(currentStatus);
  const selectId = useId();
  const reasonId = useId();
  const reasonRequired = REASON_REQUIRED.includes(status);

  return (
    <form action={formAction} className="flex flex-col gap-3">
      <div className="flex flex-col gap-2">
        <Label htmlFor={selectId}>Status</Label>
        <select
          id={selectId}
          name="status"
          value={status}
          onChange={(e) => setStatus(e.target.value as BikeStatus)}
          disabled={pending}
          className="h-10 rounded-lg border border-border bg-background px-3 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          {STATUS_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor={reasonId}>
          Reason
          {!reasonRequired ? <span className="ml-1 font-normal text-text-muted">(optional)</span> : null}
        </Label>
        <Textarea
          id={reasonId}
          name="reason"
          disabled={pending}
          required={reasonRequired}
          placeholder={reasonRequired ? "Required for this status" : "e.g. routine handover"}
        />
      </div>

      {state && !state.ok ? <p className="text-sm text-danger">{state.error}</p> : null}

      <Button type="submit" disabled={pending || status === currentStatus} className="h-11 self-start">
        {pending ? (
          <>
            <Loader2 className="size-4 animate-spin" aria-hidden="true" />
            Updating…
          </>
        ) : (
          "Update status"
        )}
      </Button>
    </form>
  );
}
