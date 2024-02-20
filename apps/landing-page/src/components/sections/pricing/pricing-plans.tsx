import { PricingCard } from "./pricing-card";
import { mdiAccount, mdiAccountMultiple, mdiAccountGroup, mdiServer } from "@mdi/js";
import { For, type Component } from "solid-js";
import { Button, Card, Icon } from "@vrite/components";
import clsx from "clsx";
import { Observed } from "#components/fragments";
import { openSourceIcon } from "#icons/open-source";

const PricingPlans: Component = () => {
  const plans = [
    {
      name: "Personal",
      icon: mdiAccount,
      description: "For individuals and small teams",
      price: { price: 6 },
      action: "Try for free",
      link: "https://app.vrite.io/auth?plan=personal",
      features: [
        "Single member",
        "Unlimited content pieces",
        "Semantic search with Q&A",
        <span class="relative">
          <span class="font-bold">5,000</span> API requests included
          <span class="font-bold absolute -top-1 -right-4">*</span>
        </span>,
        "Git sync with GitHub",
        "Vrite extensions"
      ]
    },
    {
      name: "Team",
      icon: mdiAccountMultiple,
      description: "For small to medium-sized teams",
      price: { price: 12, perSeat: true },
      action: "Try for free",
      link: "https://app.vrite.io/auth?plan=team",
      features: [
        "All features from Personal",
        "Unlimited members",
        "Priority support",
        <span class="relative">
          <span class="font-bold">10,000</span> API requests included
          <span class="font-bold absolute -top-1 -right-4">*</span>
        </span>
      ]
    },
    {
      name: "Enterprise",
      icon: mdiAccountGroup,
      description: "For large organizations",
      price: "Custom",
      time: "As required",
      action: "Contact us",
      link: "mailto:hello@vrite.io",
      features: ["All features from Team", "Tailor-made extensions", "Technical onboarding"]
    }
  ];
  const otherOptions = [
    {
      title: "Self-host",
      description: (
        <>
          Install Vrite on your own server and have full control over your data and infrastructure.
        </>
      ),
      icon: mdiServer,
      action: "Check out the docs",
      link: "https://docs.vrite.io/self-hosting/docker"
    },
    {
      title: "FOSS Project?",
      description: (
        <>
          If you're running a free, open-source project and need a documentation platform, we can
          help.
        </>
      ),
      icon: openSourceIcon,
      action: "Contact us",
      link: "mailto:hello@vrite.io",
      highlight: false
    }
  ];

  return (
    <div class="relative flex flex-col gap-8">
      <div class="grid-background-2 !-top-[25%] !-left-[25%] !h-[150%] !w-[150%]"></div>
      <div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 w-full">
        <For each={plans}>
          {(plan, index) => {
            return (
              <Observed
                class={clsx(
                  "transition-all duration-500 ease-out flex-1",
                  index() === 1 && "delay-125",
                  index() === 2 && "delay-250"
                )}
                outOfViewClass="opacity-0 translate-y-4"
              >
                <PricingCard
                  icon={plan.icon}
                  title={plan.name}
                  price={plan.price}
                  containerClass="z-1 pricing-card"
                  action={plan.action}
                  features={plan.features}
                  link={plan.link}
                ></PricingCard>
              </Observed>
            );
          }}
        </For>
      </div>
      <Observed
        class="transition-all duration-500 ease-out flex-1"
        outOfViewClass="opacity-0 translate-y-4"
      >
        <p class="text-lg md:text-xl text-gray-500 dark:text-gray-400">
          <span class="font-bold">*</span> Additional API requests are billed at{" "}
          <span class="font-bold">$0.001</span> per request.
        </p>
      </Observed>
      <div class="flex flex-col md:flex-row gap-4">
        <For each={otherOptions}>
          {(option, index) => (
            <Observed
              class={clsx(
                "transition-all duration-500 ease-out flex-1",
                index() === 1 && "delay-125"
              )}
              outOfViewClass="opacity-0 translate-y-4"
            >
              <a class="block" href={option.link}>
                <Card
                  class={clsx(
                    "m-0 p-4 md:p-8 border-0 rounded-3xl h-full group",
                    "bg-gray-100 dark:bg-gray-900 !hover:bg-gray-200 !dark:hover:bg-gray-700"
                  )}
                >
                  <div class="flex items-center">
                    <Icon path={option.icon} class="h-8 w-8" />
                    <h3 class="font-bold pl-3 text-xl md:text-3xl">{option.title}</h3>
                  </div>
                  <p
                    class={clsx(
                      "mt-2 text-lg md:text-2xl text-start",
                      option.highlight ? "opacity-80" : "text-gray-500 dark:text-gray-400"
                    )}
                  >
                    {option.description}
                  </p>
                  <Button
                    color="contrast"
                    class="m-0 mt-2 group-hover:bg-gray-100 dark:group-hover:bg-gray-900"
                  >
                    {option.action}
                  </Button>
                </Card>
              </a>
            </Observed>
          )}
        </For>
      </div>
    </div>
  );
};

export { PricingPlans };
