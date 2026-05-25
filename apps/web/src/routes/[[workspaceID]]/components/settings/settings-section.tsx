import { ParentComponent } from "solid-js";

interface SettingsSectionProps {
  label?: string;
}

const SettingsSection: ParentComponent<SettingsSectionProps> = (props) => {
  return (
    <section class="flex flex-col">
      <div class="sticky top-0 z-20 -mx-2 bg-gray-50 px-2 dark:bg-gray-950">
        <div class="flex items-center gap-2 text-xs text-gray-300 dark:text-gray-600">
          {props.label}
          <div class="flex-1 h-px bg-gray-200 dark:bg-gray-700" />
        </div>
      </div>
      {props.children}
    </section>
  );
};

export { SettingsSection };
