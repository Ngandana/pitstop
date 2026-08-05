import { Bike } from "lucide-react";
import { ComingSoon } from "@/components/coming-soon";

export default function FleetPage() {
  return (
    <ComingSoon
      icon={Bike}
      title="Fleet"
      description="Bike registration, assignment history, and per-bike detail land in Milestone 2."
    />
  );
}
