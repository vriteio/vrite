import { Input, IconButton, Button } from "#web/components/primitives";
import { Component, Show } from "solid-js";
import { Setting } from "../setting";
import { SettingsSection } from "../settings-section";
import clsx from "clsx";

interface BillingSettingsTabProps {
  setTab(tabId: string): void;
}
interface PriceTagProps {
  perSeat?: boolean;
  price: number;
  text?: "soft" | "base";
  class?: string;
}

const PriceTag: Component<PriceTagProps> = (props) => {
  const currencyFormatter = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2
  });

  return (
    <span
      class={clsx(
        ":base: text-base",
        props.text === "soft" && "text-gray-500 dark:text-gray-400",
        props.class
      )}
    >
      {currencyFormatter.format(props.price)}
      <Show when={props.perSeat}>
        <span class="opacity-50 mx-0.5">/</span>seat
      </Show>
      <span class="opacity-50 mx-0.5">/</span>
      mo.
    </span>
  );
};
const BillingSettingsTab: Component<BillingSettingsTabProps> = (props) => {
  return (
    <div class="flex flex-col gap-3">
      <SettingsSection label="Subscription Plan">
        <Setting label="Active plan" description="Your billing period ends in 12 days">
          <Button
            size="large"
            color="primary"
            class="m-0 w-full flex items-center rounded-xl min-h-11 flex-col items-start"
            badge
          >
            <span class="opacity-50 text-xs font-semibold w-full text-start">Select plan</span>
            <div class="w-full flex">
              <span class="flex-1 font-semibold text-start">Basic Plan</span>
              <PriceTag price={0} />
            </div>
          </Button>
        </Setting>
      </SettingsSection>
    </div>
  );
};

export { BillingSettingsTab };
