"use client";

import { useId, useRef, useState, useTransition } from "react";
import { Camera, Loader2, Plus } from "lucide-react";
import imageCompression from "browser-image-compression";
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
import { recordPayment } from "@/app/(app)/drivers/money-actions";
import type { FormResult } from "@/app/(app)/fleet/actions";

const METHODS: { value: string; label: string }[] = [
  { value: "cash", label: "Cash" },
  { value: "eft", label: "EFT" },
  { value: "payshap", label: "PayShap" },
  { value: "capitec_pay", label: "Capitec Pay" },
  { value: "instant_eft", label: "Instant EFT" },
  { value: "other", label: "Other" },
];

function todaySAST(): string {
  const sast = new Date(Date.now() + 2 * 60 * 60 * 1000);
  return sast.toISOString().slice(0, 10);
}

export function PaymentForm({
  driverId,
  assignments,
}: {
  driverId: string;
  assignments: { id: string; bikeRegistration: string; isOpen: boolean }[];
}) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [result, setResult] = useState<FormResult | null>(null);
  const [proof, setProof] = useState<File | null>(null);
  const [compressing, setCompressing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const amountId = useId();
  const methodId = useId();
  const referenceId = useId();
  const paidAtId = useId();
  const assignmentId = useId();

  async function handlePhotoSelect(rawFile: File) {
    setCompressing(true);
    try {
      const compressed = await imageCompression(rawFile, {
        maxSizeMB: 0.3,
        maxWidthOrHeight: 1600,
        useWebWorker: true,
        fileType: "image/jpeg",
      });
      setProof(compressed);
    } finally {
      setCompressing(false);
    }
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    if (proof) formData.set("proof", proof, "proof.jpg");

    startTransition(async () => {
      const outcome = await recordPayment(formData);
      setResult(outcome);
      if (outcome.ok) {
        setOpen(false);
        setProof(null);
      }
    });
  }

  if (assignments.length === 0) {
    return null;
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="h-11">
          <Plus className="size-4" aria-hidden="true" />
          Record payment
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Record a payment</DialogTitle>
          <DialogDescription>A fact that happened — corrections are voids with a reason, not edits.</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <input type="hidden" name="driverId" value={driverId} />

          <div className="flex flex-col gap-2">
            <Label htmlFor={assignmentId}>Bike / assignment</Label>
            <select
              id={assignmentId}
              name="assignmentId"
              required
              disabled={pending}
              className="h-10 rounded-lg border border-border bg-background px-3 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              {assignments.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.bikeRegistration}
                  {a.isOpen ? " (current)" : " (ended)"}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor={amountId}>Amount (R)</Label>
              <Input
                id={amountId}
                name="amountRands"
                type="number"
                inputMode="decimal"
                step="0.01"
                required
                disabled={pending}
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor={methodId}>Method</Label>
              <select
                id={methodId}
                name="method"
                required
                disabled={pending}
                className="h-10 rounded-lg border border-border bg-background px-3 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                {METHODS.map((m) => (
                  <option key={m.value} value={m.value}>
                    {m.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor={referenceId}>
                Reference <span className="font-normal text-text-muted">(optional)</span>
              </Label>
              <Input id={referenceId} name="reference" disabled={pending} />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor={paidAtId}>Date</Label>
              <Input id={paidAtId} name="paidAt" type="date" defaultValue={todaySAST()} required disabled={pending} />
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <Label>
              Proof of payment <span className="font-normal text-text-muted">(optional)</span>
            </Label>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={pending || compressing}
              className="flex h-11 cursor-pointer items-center justify-center gap-2 rounded-lg border-2 border-dashed border-border text-sm text-text-secondary transition-colors duration-150 hover:border-accent/40 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {compressing ? (
                <>
                  <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                  Compressing…
                </>
              ) : proof ? (
                "Photo attached — tap to replace"
              ) : (
                <>
                  <Camera className="size-4" aria-hidden="true" />
                  Attach a screenshot or photo
                </>
              )}
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="sr-only"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handlePhotoSelect(file);
                e.target.value = "";
              }}
            />
          </div>

          {result && !result.ok ? <p className="text-sm text-danger">{result.error}</p> : null}

          <DialogFooter>
            <Button type="submit" disabled={pending || compressing} className="h-11">
              {pending ? (
                <>
                  <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                  Saving…
                </>
              ) : (
                "Record payment"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
