import { Component, createSignal, For } from "solid-js";
import { RouteSectionProps } from "@solidjs/router";
import { AnimatedGradientCard } from "#web/components/fragments";
import clsx from "clsx";
import { Dynamic } from "solid-js/web";

const AuthLayout: Component<RouteSectionProps> = (props) => {
  const [activeTipIndex, setActiveTipIndex] = createSignal(0);
  const tips = [
    () => (
      <p>
        You can use Git Sync to push & pull content from a GitHub repo, in any format - thanks to
        custom input/output transformers.
      </p>
    ),
    () => (
      <p>
        You can use Git Sync to push & pull content from a GitHub repo, in any format - thanks to
        custom input/output transformers.
      </p>
    ),
    () => (
      <p>
        You can use Git Sync to push & pull content from a GitHub repo, in any format - thanks to
        custom input/output transformers.
      </p>
    )
  ];

  return (
    <div class="flex flex-row-reverse h-full w-full">
      <div class="dots-background absolute mask-edge-fading-16" />
      <div class="hidden lg:block flex-1 p-3 max-w-5/12">
        <AnimatedGradientCard class="h-full w-full rounded-2xl">
          <div class="flex flex-col items-center text-center max-w-xl relative p-4">
            <div class="border rounded-lg font-semibold px-2 bg-white bg-opacity-30 border-white shadow-md shadow-white shadow-opacity-20 absolute -top-8">
              Did you know?
            </div>
            <div class="text-2xl">
              <Dynamic component={tips[activeTipIndex()]} />
            </div>
          </div>
          <div class="flex justify-center items-center gap-2 absolute bottom-12">
            <For each={tips}>
              {(_, index) => {
                const active = () => index() === activeTipIndex();

                return (
                  <button
                    class={clsx(
                      "h-8 transition-all duration-350 ease-out flex justify-center items-center",
                      active() ? "w-16" : "w-8 opacity-20 @hover:opacity-50"
                    )}
                    onClick={() => setActiveTipIndex(index())}
                  >
                    <div class={clsx("w-full bg-white rounded-full h-2")}></div>
                  </button>
                );
              }}
            </For>
          </div>
        </AnimatedGradientCard>
      </div>
      <div class="flex-1 relative flex justify-center items-center">
        <div class="p-4 lg:p-24 relative">
          <div class="absolute h-full w-full top-0 left-0 mask-edge-fading-4 lg:mask-edge-fading-24 bg-gray-100 dark:bg-gray-850 rounded-2xl" />
          <div class="relative flex flex-col w-80">{props.children}</div>
        </div>
      </div>
      <div class="flex items-center font-bold text-3xl top-4 left-4 absolute">
        <div class="h-8 w-8 i-andesine:logo bg-gradient-to-tr" />
        ndesine
      </div>
    </div>
  );
};

export default AuthLayout;
