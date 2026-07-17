import clsx from "clsx";
import { JSX, ParentComponent } from "solid-js";

interface SettingProps {
  label: JSX.Element;
  description: JSX.Element;
  fade?: boolean;
}

const Setting: ParentComponent<SettingProps> = (props) => {
  return (
    <div
      class={clsx(
        "sticky top-5 z-20 -mx-2 bg-gray-50 px-2 py-2 dark:bg-gray-950",
        props.fade !== false && "mask-edge-fading-b-4"
      )}
    >
      <div class="flex flex-col items-start gap-3 sm:gap-4 lg:flex-row lg:items-start lg:justify-center lg:gap-24">
        <div class="flex w-full min-w-0 flex-col lg:max-w-72 lg:flex-1">
          <span class="flex-1 font-medium leading-tight">{props.label}</span>
          <span class="text-sm leading-tight text-gray-400 dark:text-gray-500">
            {props.description}
          </span>
        </div>
        <div class="flex w-full min-w-0 lg:flex-1 lg:justify-end">{props.children}</div>
      </div>
    </div>
  );
};

export { Setting };
