import { Wallet } from "lucide-react";
import { ComingSoon } from "@/components/coming-soon";

export default function LedgerPage() {
  return (
    <ComingSoon
      icon={Wallet}
      title="Ledger"
      description="Rent charged vs collected, maintenance spend, and net per bike land in Milestone 5."
    />
  );
}
