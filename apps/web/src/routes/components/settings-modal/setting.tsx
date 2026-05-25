import { ParentComponent } from "solid-js";

interface SettingProps {
  label: string;
  description: string;
}

const Setting: ParentComponent<SettingProps> = (props) => {
  return (
    <div class="flex gap-24 justify-center items-start">
      <div class="flex flex-col flex-1 max-w-72">
        <span class="flex-1 font-semibold leading-tight">{props.label}</span>
        <span class="text-gray-400 dark:text-gray-500 text-sm leading-tight">
          {props.description}
        </span>
      </div>
      <div class="flex-1 flex justify-end">{props.children}</div>
    </div>
  );
};

export { Setting };
