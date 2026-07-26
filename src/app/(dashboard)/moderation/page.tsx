import { PlaceholderPage } from "@/components/PlaceholderPage";

export default function ModerationPage() {
  return (
    <PlaceholderPage
      title="Group Administration"
      phase="Phase 5b"
      description="Kick/ban/mute/pin/promote/demote and the four redact modes, each routed through the exact same auth.checkGroupAdminAccess/isOwnerOrSudoBotAdmin functions the slash commands already use -- no separate permission ladder."
    />
  );
}
