import { Component, Suspense } from "solid-js";
import { RouteSectionProps } from "@solidjs/router";
import { AnimatedGradientCard } from "#web/components/animated-gradient-card";
import { Dynamic } from "solid-js/web";
import { Skeleton } from "@andesine/components";

const AuthLayout: Component<RouteSectionProps> = (props) => {
  // TODO: add more tips
  const tips = [
    () => (
      <p>
        Edit collaboratively in real time with the explorer on the left and a shared document on the
        right.
      </p>
    ),
    () => (
      <p>
        Invite teammates to a workspace, assign roles, and control access to content, billing, and
        API operations.
      </p>
    ),
    () => (
      <p>Create API keys per workspace and keep an eye on plan usage without leaving the app.</p>
    )
  ];
  const activeTip = tips[Math.floor(Math.random() * tips.length)];

  return (
    <div class="flex flex-row h-full w-full">
      <div class="dots-background absolute mask-edge-fading-16" />
      <div class="flex items-center font-bold text-3xl top-4 left-4 absolute">
        <div class="h-8 w-8 i-andesine:logo bg-gradient-to-tr" />
        ndesine
      </div>
      <div class="flex-1 relative flex justify-center items-center">
        <div class="p-4 lg:p-24 relative">
          <div class="absolute h-full w-full top-0 left-0 mask-edge-fading-4 lg:mask-edge-fading-24 bg-gray-100 dark:bg-gray-850 rounded-2xl" />
          <div class="relative flex flex-col w-80">
            <Suspense
              fallback={
                <div class="flex flex-col w-full">
                  <Skeleton
                    class={[
                      "my-1 h-6 w-2/5",
                      "h-8 my-1 w-3/5",
                      "my-4 h-8 w-full",
                      "mt-1 h-8 w-2/5"
                    ]}
                  />
                </div>
              }
            >
              {props.children}
            </Suspense>
          </div>
        </div>
      </div>
      <div class="hidden lg:block flex-1 p-3 max-w-5/12">
        <AnimatedGradientCard class="h-full w-full rounded-2xl">
          <div class="flex flex-col items-center text-center max-w-xl relative p-4">
            <div class="rounded-md font-medium px-1.5 bg-gray-100 bg-opacity-30 backdrop-blur-md border-white absolute -top-8">
              Did you know?
            </div>
            <div class="relative w-full">
              <div class="text-2xl">
                <Dynamic component={activeTip} />
              </div>
            </div>
          </div>
        </AnimatedGradientCard>
      </div>
    </div>
  );
};

export default AuthLayout;
