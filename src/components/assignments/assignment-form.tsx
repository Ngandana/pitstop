"use client";

import { useState, useTransition } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { HandoverPhotoCapture, type PhotoState } from "./handover-photo-capture";
import { HANDOVER_PHOTO_ANGLES } from "@/lib/validation/assignments";
import { createAssignment } from "@/app/(app)/assignments/actions";
import type { FormResult } from "@/app/(app)/fleet/actions";

const WEEKDAYS = [
  { value: 0, label: "Sunday" },
  { value: 1, label: "Monday" },
  { value: 2, label: "Tuesday" },
  { value: 3, label: "Wednesday" },
  { value: 4, label: "Thursday" },
  { value: 5, label: "Friday" },
  { value: 6, label: "Saturday" },
];

export function AssignmentForm({
  bikes,
  drivers,
  defaultBikeId,
  defaultDriverId,
}: {
  bikes: { id: string; registration: string; make: string; model: string }[];
  drivers: { id: string; fullName: string }[];
  defaultBikeId?: string;
  defaultDriverId?: string;
}) {
  const [pending, startTransition] = useTransition();
  const [result, setResult] = useState<FormResult | null>(null);
  const [photos, setPhotos] = useState<PhotoState>({});

  const allPhotosCaptured = HANDOVER_PHOTO_ANGLES.every((angle) => photos[angle]);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!allPhotosCaptured) {
      setResult({ ok: false, error: "All six condition photos are required." });
      return;
    }

    const formData = new FormData(e.currentTarget);
    for (const angle of HANDOVER_PHOTO_ANGLES) {
      const file = photos[angle];
      if (file) formData.set(`photo_${angle}`, file, `${angle}.jpg`);
    }

    startTransition(async () => {
      const outcome = await createAssignment(formData);
      // A successful action calls redirect(), which throws internally and
      // never returns — so reaching here at all means it didn't redirect,
      // i.e. it's an error result.
      setResult(outcome);
    });
  }

  if (bikes.length === 0 || drivers.length === 0) {
    return (
      <p className="rounded-lg border border-border bg-surface-sunken px-4 py-3 text-sm text-text-secondary">
        {bikes.length === 0
          ? "Every bike already has an active assignment."
          : "Every driver already has an active assignment."}{" "}
        End one first, or register a new bike/driver.
      </p>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-6" noValidate>
      {result && !result.ok ? (
        <p className="rounded-lg border border-danger/30 bg-danger-surface px-4 py-3 text-sm text-danger">
          {result.error}
        </p>
      ) : null}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-2">
          <Label htmlFor="bikeId">Bike</Label>
          <select
            id="bikeId"
            name="bikeId"
            required
            disabled={pending}
            defaultValue={defaultBikeId ?? ""}
            className="h-10 rounded-lg border border-border bg-background px-3 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <option value="" disabled>
              Choose a bike
            </option>
            {bikes.map((b) => (
              <option key={b.id} value={b.id}>
                {b.registration} — {b.make} {b.model}
              </option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="driverId">Driver</Label>
          <select
            id="driverId"
            name="driverId"
            required
            disabled={pending}
            defaultValue={defaultDriverId ?? ""}
            className="h-10 rounded-lg border border-border bg-background px-3 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <option value="" disabled>
              Choose a driver
            </option>
            {drivers.map((d) => (
              <option key={d.id} value={d.id}>
                {d.fullName}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="flex flex-col gap-2">
          <Label htmlFor="weeklyRentRands">Weekly rent (R)</Label>
          <Input
            id="weeklyRentRands"
            name="weeklyRentRands"
            type="number"
            inputMode="decimal"
            step="0.01"
            required
            disabled={pending}
            placeholder="850"
          />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="depositRands">Deposit (R)</Label>
          <Input
            id="depositRands"
            name="depositRands"
            type="number"
            inputMode="decimal"
            step="0.01"
            defaultValue={0}
            disabled={pending}
          />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="startOdometerKm">Starting odometer (km)</Label>
          <Input
            id="startOdometerKm"
            name="startOdometerKm"
            type="number"
            inputMode="numeric"
            required
            disabled={pending}
          />
        </div>
      </div>

      <div className="flex flex-col gap-2 sm:max-w-xs">
        <Label htmlFor="rentDueWeekday">Rent due day</Label>
        <select
          id="rentDueWeekday"
          name="rentDueWeekday"
          defaultValue={3}
          disabled={pending}
          className="h-10 rounded-lg border border-border bg-background px-3 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          {WEEKDAYS.map((w) => (
            <option key={w.value} value={w.value}>
              {w.label}
            </option>
          ))}
        </select>
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="notes">Notes (optional)</Label>
        <Textarea id="notes" name="notes" disabled={pending} rows={3} />
      </div>

      <div>
        <Label className="mb-2 block">Condition photos</Label>
        <p className="mb-3 text-sm text-text-secondary">
          Front, rear, both sides, the odometer, and any existing damage — this is what settles a
          dispute later.
        </p>
        <HandoverPhotoCapture photos={photos} onPhotosChange={setPhotos} />
      </div>

      <div>
        <Button type="submit" disabled={pending} className="h-11">
          {pending ? (
            <>
              <Loader2 className="size-4 animate-spin" aria-hidden="true" />
              Saving…
            </>
          ) : (
            "Hand over bike"
          )}
        </Button>
      </div>
    </form>
  );
}
