"use client";

import { useActionState } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { FormResult } from "@/app/(app)/fleet/actions";

type BikeDefaults = {
  registration?: string;
  make?: string;
  model?: string;
  engineCc?: number | null;
  year?: number | null;
  colour?: string | null;
  vin?: string | null;
  purchaseDate?: string | null;
  purchasePriceRands?: number | null;
  cartrackVehicleId?: string | null;
};

export function BikeForm({
  action,
  defaults,
  mode,
  submitLabel,
}: {
  action: (prev: FormResult | null, formData: FormData) => Promise<FormResult>;
  defaults?: BikeDefaults;
  mode: "create" | "edit";
  submitLabel: string;
}) {
  const [state, formAction, pending] = useActionState<FormResult | null, FormData>(action, null);
  const fieldError = (name: string) =>
    state && !state.ok ? state.fieldErrors?.[name] : undefined;

  return (
    <form action={formAction} className="flex flex-col gap-6" noValidate>
      {state && !state.ok && !Object.keys(state.fieldErrors ?? {}).length ? (
        <p className="rounded-lg border border-danger/30 bg-danger-surface px-4 py-3 text-sm text-danger">
          {state.error}
        </p>
      ) : null}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Field label="Registration" error={fieldError("registration")}>
          <Input
            name="registration"
            defaultValue={defaults?.registration}
            required
            disabled={pending}
            aria-invalid={!!fieldError("registration")}
            placeholder="CA 123-456"
          />
        </Field>
        <Field label="Make" error={fieldError("make")}>
          <Input
            name="make"
            defaultValue={defaults?.make}
            required
            disabled={pending}
            aria-invalid={!!fieldError("make")}
            placeholder="Bajaj"
          />
        </Field>
        <Field label="Model" error={fieldError("model")}>
          <Input
            name="model"
            defaultValue={defaults?.model}
            required
            disabled={pending}
            aria-invalid={!!fieldError("model")}
            placeholder="Boxer 150"
          />
        </Field>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Field label="Engine (cc)" error={fieldError("engineCc")} optional>
          <Input
            name="engineCc"
            type="number"
            inputMode="numeric"
            defaultValue={defaults?.engineCc ?? undefined}
            disabled={pending}
            aria-invalid={!!fieldError("engineCc")}
            placeholder="150"
          />
        </Field>
        <Field label="Year" error={fieldError("year")} optional>
          <Input
            name="year"
            type="number"
            inputMode="numeric"
            defaultValue={defaults?.year ?? undefined}
            disabled={pending}
            aria-invalid={!!fieldError("year")}
            placeholder="2023"
          />
        </Field>
        <Field label="Colour" error={fieldError("colour")} optional>
          <Input
            name="colour"
            defaultValue={defaults?.colour ?? undefined}
            disabled={pending}
            aria-invalid={!!fieldError("colour")}
            placeholder="Red"
          />
        </Field>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Field label="VIN" error={fieldError("vin")} optional>
          <Input
            name="vin"
            defaultValue={defaults?.vin ?? undefined}
            disabled={pending}
            aria-invalid={!!fieldError("vin")}
          />
        </Field>
        <Field label="Purchase date" error={fieldError("purchaseDate")} optional>
          <Input
            name="purchaseDate"
            type="date"
            defaultValue={defaults?.purchaseDate ?? undefined}
            disabled={pending}
            aria-invalid={!!fieldError("purchaseDate")}
          />
        </Field>
        <Field label="Purchase price (R)" error={fieldError("purchasePriceRands")} optional>
          <Input
            name="purchasePriceRands"
            type="number"
            inputMode="decimal"
            step="0.01"
            defaultValue={defaults?.purchasePriceRands ?? undefined}
            disabled={pending}
            aria-invalid={!!fieldError("purchasePriceRands")}
            placeholder="28500"
          />
        </Field>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="Cartrack vehicle ID" error={fieldError("cartrackVehicleId")} optional>
          <Input
            name="cartrackVehicleId"
            defaultValue={defaults?.cartrackVehicleId ?? undefined}
            disabled={pending}
            aria-invalid={!!fieldError("cartrackVehicleId")}
          />
        </Field>
        {mode === "create" ? (
          <Field label="Current odometer (km)" error={fieldError("initialOdometerKm")}>
            <Input
              name="initialOdometerKm"
              type="number"
              inputMode="numeric"
              required
              disabled={pending}
              aria-invalid={!!fieldError("initialOdometerKm")}
              placeholder="0"
            />
          </Field>
        ) : null}
      </div>

      <div>
        <Button type="submit" disabled={pending} className="h-11">
          {pending ? (
            <>
              <Loader2 className="size-4 animate-spin" aria-hidden="true" />
              Saving…
            </>
          ) : (
            submitLabel
          )}
        </Button>
      </div>
    </form>
  );
}

function Field({
  label,
  error,
  optional,
  children,
}: {
  label: string;
  error?: string;
  optional?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-2">
      <Label>
        {label}
        {optional ? <span className="ml-1 font-normal text-text-muted">(optional)</span> : null}
      </Label>
      {children}
      {error ? <p className="text-sm text-danger">{error}</p> : null}
    </div>
  );
}
