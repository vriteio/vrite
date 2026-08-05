import clsx from "clsx";
import { type Component, Index } from "solid-js";

interface SkeletonProps {
  wrapperClass?: string;
  class?: string | string[];
}

const Skeleton: Component<SkeletonProps> = (props) => {
  if (Array.isArray(props.class)) {
    return (
      <Index each={props.class}>
        {(cssClass) => (
          <div
            class={clsx(":base: bg-gray-200 dark:bg-gray-700 rounded-lg animate-pulse", cssClass())}
          />
        )}
      </Index>
    );
  }

  return (
    <div
      class={clsx(":base: bg-gray-200 dark:bg-gray-700 rounded-lg animate-pulse", props.class)}
    />
  );
};

export { Skeleton };
