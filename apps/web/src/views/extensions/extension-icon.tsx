import { ExtensionSpec } from "@vrite/sdk/extensions";
import clsx from "clsx";
import { Component, Show } from "solid-js";

interface ExtensionIconProps {
  class?: string;
  spec: ExtensionSpec;
}

const ExtensionIcon: Component<ExtensionIconProps> = (props) => {
  return (
    <>
      <Show when={props.spec.icon}>
        <img
          src={props.spec.icon}
          class={clsx("w-8 h-8 mr-2 rounded-lg", props.spec.iconDark && "dark:hidden")}
        />
      </Show>
      <Show when={props.spec.iconDark}>
        <img
          src={props.spec.iconDark}
          class={clsx("w-8 h-8 mr-2 rounded-lg", props.spec.icon && "hidden dark:block")}
        />
      </Show>
    </>
  );
};

export { ExtensionIcon };
