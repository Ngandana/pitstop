import { Settings } from "lucide-react";
import { ComingSoon } from "@/components/coming-soon";

export default function SettingsPage() {
  return (
    <ComingSoon
      icon={Settings}
      title="Settings"
      description="Service interval defaults, rent policy defaults, and notification preferences land alongside their respective milestones."
    />
  );
}
