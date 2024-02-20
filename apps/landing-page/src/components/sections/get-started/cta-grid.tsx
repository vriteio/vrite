import { mdiPlayCircle, mdiBookOpen } from "@mdi/js";
import { For, type Component } from "solid-js";
import clsx from "clsx";
import { Card, Icon } from "#components/primitives";
import { Observed } from "#components/fragments";

const CTAGrid: Component = () => {
  const actions = [
    {
      title: "Get Started",
      description: (
        <>
          Create, manage and publish your next docs, technical blogs, and knowledge bases with
          Vrite.
        </>
      ),
      icon: mdiPlayCircle,
      highlight: true,
      link: "https://app.vrite.io"
    },
    {
      title: "Documentation",
      description: <>Learn how to use, self-host and integrate Vrite into your current workflow.</>,
      icon: mdiBookOpen,
      link: "https://docs.vrite.io"
    }
  ];

  return (
    <div class="flex flex-col lg:flex-row gap-4">
      <For each={actions}>
        {(action, index) => {
          return (
            <Observed
              class={clsx("transition-all duration-500 ease-out", index() === 1 && "delay-125")}
              outOfViewClass="opacity-0 translate-y-4"
            >
              <a class="block max-w-120" href={action.link}>
                <Card
                  class={clsx(
                    "m-0 p-4 md:p-8 border-0 rounded-3xl h-full",
                    action.highlight && "hover:bg-gradient-to-bl",
                    !action.highlight &&
                      "bg-gray-100 dark:bg-gray-900 !hover:bg-gray-200 !dark:hover:bg-gray-700"
                  )}
                  color={action.highlight ? "primary" : "base"}
                >
                  <div class="flex items-center">
                    <Icon path={action.icon} class="h-8 w-8" />
                    <h3 class="font-bold pl-3 text-xl md:text-3xl">{action.title}</h3>
                  </div>
                  <p class="mt-2 text-lg md:text-2xl opacity-80 text-start">{action.description}</p>
                </Card>
              </a>
            </Observed>
          );
        }}
      </For>
    </div>
  );
};

export { CTAGrid };
