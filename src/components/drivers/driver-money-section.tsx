import { ImageIcon } from "lucide-react";
import { formatCents, formatDate } from "@/lib/format";
import { WaiveChargeForm } from "./waive-charge-form";
import { VoidPaymentForm } from "./void-payment-form";

const METHOD_LABELS: Record<string, string> = {
  cash: "Cash",
  eft: "EFT",
  payshap: "PayShap",
  capitec_pay: "Capitec Pay",
  instant_eft: "Instant EFT",
  other: "Other",
};

type Charge = {
  id: string;
  periodStart: string;
  periodEnd: string;
  amountCents: number;
  waivedCents: number;
  waiveReason: string | null;
};

type Payment = {
  id: string;
  amountCents: number;
  method: string;
  reference: string | null;
  paidAt: Date;
  voidedAt: Date | null;
  voidReason: string | null;
  proofUrl: string | null;
};

export function DriverMoneySection({
  driverId,
  charges,
  paymentsList,
}: {
  driverId: string;
  charges: Charge[];
  paymentsList: Payment[];
}) {
  return (
    <div className="flex flex-col gap-6">
      <section className="rounded-xl border border-border bg-surface-raised p-5">
        <h2 className="mb-3 text-sm font-semibold text-foreground">Rent charges</h2>
        {charges.length === 0 ? (
          <p className="text-sm text-text-secondary">No charges generated yet.</p>
        ) : (
          <ul className="flex flex-col divide-y divide-border">
            {charges.map((c) => (
              <li key={c.id} className="flex flex-wrap items-center justify-between gap-2 py-3">
                <div>
                  <p className="text-sm text-foreground">
                    {formatDate(c.periodStart)} &ndash; {formatDate(c.periodEnd)}
                  </p>
                  {c.waivedCents > 0 ? (
                    <p className="text-xs text-text-secondary">
                      {formatCents(c.waivedCents)} waived
                      {c.waiveReason ? ` · ${c.waiveReason}` : ""}
                    </p>
                  ) : null}
                </div>
                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <p className="font-medium text-foreground tabular-nums">{formatCents(c.amountCents)}</p>
                    {c.waivedCents > 0 ? (
                      <p className="text-xs text-text-secondary tabular-nums">
                        net {formatCents(c.amountCents - c.waivedCents)}
                      </p>
                    ) : null}
                  </div>
                  <WaiveChargeForm
                    chargeId={c.id}
                    driverId={driverId}
                    amountCents={c.amountCents}
                    currentlyWaivedCents={c.waivedCents}
                  />
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="rounded-xl border border-border bg-surface-raised p-5">
        <h2 className="mb-3 text-sm font-semibold text-foreground">Payment history</h2>
        {paymentsList.length === 0 ? (
          <p className="text-sm text-text-secondary">No payments recorded yet.</p>
        ) : (
          <ul className="flex flex-col divide-y divide-border">
            {paymentsList.map((p) => (
              <li key={p.id} className="flex flex-wrap items-center justify-between gap-2 py-3">
                <div>
                  <p className={`text-sm ${p.voidedAt ? "text-text-muted line-through" : "text-foreground"}`}>
                    {formatDate(p.paidAt)} &middot; {METHOD_LABELS[p.method] ?? p.method}
                    {p.reference ? ` · ${p.reference}` : ""}
                  </p>
                  {p.voidedAt ? (
                    <p className="text-xs text-danger">Voided{p.voidReason ? ` · ${p.voidReason}` : ""}</p>
                  ) : null}
                </div>
                <div className="flex items-center gap-3">
                  {p.proofUrl ? (
                    <a
                      href={p.proofUrl}
                      target="_blank"
                      rel="noreferrer"
                      aria-label="View proof of payment"
                      className="text-text-muted transition-colors duration-150 hover:text-foreground"
                    >
                      <ImageIcon className="size-4" aria-hidden="true" />
                    </a>
                  ) : null}
                  <p
                    className={`font-medium tabular-nums ${p.voidedAt ? "text-text-muted line-through" : "text-foreground"}`}
                  >
                    {formatCents(p.amountCents)}
                  </p>
                  {!p.voidedAt ? (
                    <VoidPaymentForm paymentId={p.id} driverId={driverId} amountCents={p.amountCents} />
                  ) : null}
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
