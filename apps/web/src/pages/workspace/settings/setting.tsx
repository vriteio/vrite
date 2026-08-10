import clsx from "clsx";
import { type JSX, type ParentComponent, Show } from "solid-js";

interface SettingProps {
  label: JSX.Element;
  description: JSX.Element;
  fade?: boolean;
  hover?: boolean;
}

const Setting: ParentComponent<SettingProps> = (props) => (
  <div
    class={clsx("-mx-2 px-2 py-2 group/setting", props.fade !== false && "mask-edge-fading-b-4")}
  >
    <Show when={props.hover}>
      <div class="absolute h-full w-full top-0 left-0 media-mouse:group-hover/setting:bg-gradient-to-r from-gray-500/5 to-transparent -z-1 rounded-lg" />
    </Show>
    <div class="flex flex-col items-start gap-3 sm:gap-4 lg:flex-row lg:items-start lg:justify-center lg:gap-24">
      <div class="flex w-full min-w-0 flex-col lg:max-w-72 lg:flex-1">
        <span class="flex-1 font-medium leading-tight">{props.label}</span>
        <span class="text-sm leading-tight text-gray-400">{props.description}</span>
      </div>
      <div class="flex w-full min-w-0 lg:flex-1 lg:justify-end">{props.children}</div>
    </div>
  </div>
);

export { Setting };
