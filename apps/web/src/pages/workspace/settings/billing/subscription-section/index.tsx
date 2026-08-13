import { Skeleton } from "@andesine/components";
import { createAsync } from "@solidjs/router";
import { type Component, For, Suspense } from "solid-js";
import { config } from "#web/lib/api";
import { subscriptionQuery, usageQuery } from "#web/lib/data";
import { formatNumber, formatUSD } from "#web/lib/primitives";
import { Setting } from "../../setting";
import { SettingsSection } from "../../settings-section";
import { SubscriptionAction } from "./subscription-action";
import clsx from "clsx";

const SubscriptionSection: Component = () => {
  const subscription = createAsync(() => subscriptionQuery());
  const usage = createAsync(() => usageQuery());
  const isPro = () => subscription.latest?.plan === "pro";
  const descriptionItems = () => {
    const subscriptionData = subscription.latest;

    if (subscriptionData?.plan === "pro") {
      return [
        <>
          <span class="font-medium text-gray-700">
            {formatUSD(subscriptionData.seats * config.PRICE_PER_SEAT_USD)}
            <span class="opacity-50 mx-0.5">/</span>
            mo.
          </span>{" "}
          base price
        </>,
        <>
          <span class="font-medium text-gray-700">
            {subscriptionData.seats} member {subscriptionData.seats === 1 ? "seat" : "seats"}
          </span>{" "}
          active
        </>,
        <>
          <span class="font-medium text-gray-700">
            {formatNumber(usage.latest?.totalUsage ?? 0)} API calls
          </span>{" "}
          this month
        </>
      ];
    }

    return [
      "Unlimited team members",
      "Priority support",
      <>
        <span class="font-medium text-gray-700">500K API calls</span> included
      </>,
      <>
        <span class="font-medium text-gray-700">$1 per 50K</span> additional API calls
      </>
    ];
  };

  return (
    <SettingsSection label="Subscription">
      <Setting
        label={
          <div class="flex items-center gap-1 font-semibold">
            <div class="inline-flex items-center">
              <div class="h-4.5 w-4.5 i-andesine:logo bg-gradient-to-tr" />
              ndesine
            </div>
            <div class="w-px h-4 rounded-full bg-gray-300" />
            <div class="bg-gradient-to-tr text-transparent bg-clip-text">Pro</div>
          </div>
        }
        description={
          <div class="flex flex-col gap-1 mt-2">
            <For each={descriptionItems()}>
              {(item) => (
                <div class="flex gap-1.5">
                  <span
                    class={clsx(
                      "bg-gradient-to-tr h-4 w-4 flex-shrink-0",
                      isPro() ? "i-lucide:circle-dot-dashed" : "i-lucide:check"
                    )}
                  />
                  <span>{item}</span>
                </div>
              )}
            </For>
          </div>
        }
        fade={false}
      >
        <Suspense fallback={<Skeleton class="h-14 w-full max-w-64 rounded-xl" />}>
          <SubscriptionAction />
        </Suspense>
      </Setting>
    </SettingsSection>
  );
};

export { SubscriptionSection };
