import { PlaceholderPage } from "@/components/PlaceholderPage";

export default function SettingsPage() {
  return (
    <PlaceholderPage
      title="Personal Settings"
      phase="Phase 4"
      description="Your timezone (a fixed UTC offset, guessed from Telegram's language_code and always overridable) and date/time formatting -- the backend (store/user_settings.zig) already exists in full from the reminders/timezone work; this is pure UI on top of it."
    />
  );
}
