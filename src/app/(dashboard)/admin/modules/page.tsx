import { PlaceholderPage } from "@/components/PlaceholderPage";

export default function AdminModulesPage() {
  return (
    <PlaceholderPage
      title="Modules & Config"
      phase="Phase 3"
      description="Bot-wide module on/off toggles (feature_flags) and the safe subset of live-editable settings (dynamic_config) -- secrets stay masked and read-only, per ARCHITECTURE.md §6."
    />
  );
}
