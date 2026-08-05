import { type ParentComponent } from "solid-js";

interface SettingsSectionProps {
  label?: string;
}

const SettingsSection: ParentComponent<SettingsSectionProps> = (props) => (
  <section class="relative flex min-w-0 flex-col pb-3 last:pb-0">
    <div class="sticky top-0 z-30 -mx-2 bg-gray-50 px-2 pb-1 dark:bg-gray-950">
      <div class="flex min-h-4 items-center gap-2 text-xs text-gray-400 dark:text-gray-500">
        {props.label}
        <div class="flex-1 h-px bg-gray-200 dark:bg-gray-700" />
      </div>
    </div>
    {props.children}
  </section>
);

export { SettingsSection };
