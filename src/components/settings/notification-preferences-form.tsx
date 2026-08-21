"use client";

import { useActionState, useId } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { updateNotificationPreferences } from "@/app/(app)/settings/actions";
import type { FormResult } from "@/app/(app)/fleet/actions";

export function NotificationPreferencesForm({
  loginEmail,
  notificationEmail,
  emailRemindersEnabled,
}: {
  loginEmail: string;
  notificationEmail: string | null;
  emailRemindersEnabled: boolean;
}) {
  const [state, formAction, pending] = useActionState<FormResult | null, FormData>(
    updateNotificationPreferences,
    null,
  );
  const emailId = useId();
  const enabledId = useId();

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <Label htmlFor={emailId}>Notification email</Label>
        <Input
          id={emailId}
          name="notificationEmail"
          type="email"
          defaultValue={notificationEmail ?? ""}
          placeholder={loginEmail}
          disabled={pending}
        />
        <p className="text-xs text-text-muted">
          Where reminder emails are sent. Leave blank to use your login email ({loginEmail}).
        </p>
      </div>

      <div className="flex items-start gap-2.5">
        <Checkbox
          id={enabledId}
          name="emailRemindersEnabled"
          defaultChecked={emailRemindersEnabled}
          disabled={pending}
        />
        <div className="flex flex-col gap-0.5">
          <Label htmlFor={enabledId} className="cursor-pointer">
            Send email reminders
          </Label>
          <p className="text-xs text-text-muted">
            Uncheck to pause all outgoing reminder emails. Today still shows everything that needs
            attention either way.
          </p>
        </div>
      </div>

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
