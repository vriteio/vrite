import { mdiPoll } from "@mdi/js";
import { Button } from "@vrite/components";
import { Component, Show, createResource } from "solid-js";
import { CollapsibleSection } from "#components/fragments";
import { useAuthenticatedUserData, useClient } from "#context";

const APIUsageCard: Component = () => {
  const { subscription } = useAuthenticatedUserData();
  const client = useClient();
  const [usage] = createResource(
    async () => {
      const { usage } = await client.billing.usage.query();

      return usage;
    },
    { initialValue: 0 }
  );
  const numberFormatter = new Intl.NumberFormat("en-US", {
    style: "decimal"
  });
  const currencyFormatter = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2
  });
  const estimatedUsagePrice = (): number => {
    if (!usage()) return 0;

    return Math.max((usage()! - (subscription()?.plan === "team" ? 10000 : 5000)) * 0.001, 0);
  };

  return (
    <CollapsibleSection icon={mdiPoll} label="API usage">
      <Button
        size="large"
        class="m-0 w-full flex items-start flex-col rounded-xl"
        badge
        hover={false}
        loading={usage.loading}
      >
        <span class="text-gray-500 dark:text-gray-400 text-xs font-semibold">Current usage</span>
        <div class="flex w-full">
          <Show
            when={estimatedUsagePrice() > 0}
            fallback={<span class="font-semibold flex-1">Included</span>}
          >
            <span class="font-semibold flex-1">
              <span class="opacity-50 mr-0.5">+</span>
              {currencyFormatter.format(estimatedUsagePrice())}
            </span>
          </Show>
          <span class="text-base text-gray-500 dark:text-gray-400">
            {numberFormatter.format(usage())}
          </span>
          <span class="opacity-50 mx-0.5">/</span>
          <span class="text-base text-gray-500 dark:text-gray-400">
            {numberFormatter.format(subscription()?.plan === "team" ? 10000 : 5000)}
          </span>
        </div>
      </Button>
      <p class="prose text-gray-500 dark:text-gray-400 w-full">
        Your plan includes{" "}
        <b>{numberFormatter.format(subscription()?.plan === "team" ? 10000 : 5000)}</b> API requests
        per month. Additional requests are billed at <b>$0.001</b> per request.
      </p>
    </CollapsibleSection>
  );
};

export { APIUsageCard };
