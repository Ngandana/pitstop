"use client";

import { useActionState } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { FormResult } from "@/app/(app)/fleet/actions";

type DriverDefaults = {
  fullName?: string;
  phoneE164?: string;
  licenceNumber?: string | null;
  licenceExpiresOn?: string | null;
  notes?: string | null;
};

export function DriverForm({
  action,
  defaults,
  submitLabel,
}: {
  action: (prev: FormResult | null, formData: FormData) => Promise<FormResult>;
  defaults?: DriverDefaults;
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

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="Full name" error={fieldError("fullName")}>
          <Input
            name="fullName"
            defaultValue={defaults?.fullName}
            required
            disabled={pending}
            aria-invalid={!!fieldError("fullName")}
            placeholder="Sipho Ndlovu"
          />
        </Field>
        <Field label="Phone number" error={fieldError("phoneE164")}>
          <Input
            name="phoneE164"
            type="tel"
            defaultValue={defaults?.phoneE164}
            required
            disabled={pending}
            aria-invalid={!!fieldError("phoneE164")}
            placeholder="+27821234567"
          />
        </Field>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="Licence number" error={fieldError("licenceNumber")} optional>
          <Input
            name="licenceNumber"
            defaultValue={defaults?.licenceNumber ?? undefined}
            disabled={pending}
            aria-invalid={!!fieldError("licenceNumber")}
          />
        </Field>
        <Field label="Licence expiry" error={fieldError("licenceExpiresOn")} optional>
          <Input
            name="licenceExpiresOn"
            type="date"
            defaultValue={defaults?.licenceExpiresOn ?? undefined}
            disabled={pending}
            aria-invalid={!!fieldError("licenceExpiresOn")}
          />
        </Field>
      </div>

      <Field label="Notes" error={fieldError("notes")} optional>
        <Textarea
          name="notes"
          defaultValue={defaults?.notes ?? undefined}
          disabled={pending}
          aria-invalid={!!fieldError("notes")}
          rows={3}
        />
      </Field>

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
