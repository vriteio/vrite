import { ParentComponent } from "solid-js";

interface SettingsSectionProps {
  label: string;
}

const SettingsSection: ParentComponent<SettingsSectionProps> = (props) => {
  return (
    <div class="flex flex-col gap-3">
      <div>
        <div class="text-xs text-gray-300 dark:text-gray-600 flex items-center gap-2">
          {props.label}
          <div class="flex-1 h-px bg-gray-200 dark:bg-gray-700" />
        </div>
      </div>
      <div class="flex flex-col gap-4">{props.children}</div>
    </div>
  );
};

export { SettingsSection };
