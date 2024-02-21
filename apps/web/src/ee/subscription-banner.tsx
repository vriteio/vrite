import { mdiAlertCircleOutline } from "@mdi/js";
import { Icon } from "@vrite/components";
import { Component, Match, Show, Switch, createMemo } from "solid-js";
import dayjs from "dayjs";
import { useAuthenticatedUserData, useLocalStorage } from "#context";

const SubscriptionBanner: Component = () => {
  const { subscription } = useAuthenticatedUserData();
  const { setStorage } = useLocalStorage();
  const remainingBillingPeriod = createMemo(() => {
    return dayjs(subscription()?.expiresAt).diff(dayjs(), "days");
  });
  const goToBilling = (): void => {
    setStorage((storage) => ({
      ...storage,
      sidePanelView: "settings",
      sidePanelWidth: storage.sidePanelWidth || 375,
      settingsSection: "billing"
    }));
  };

  return (
    <Show
      when={
        subscription()?.status && !["active", "trialing"].includes(subscription()?.status || "")
      }
    >
      <div class="h-8 bg-gradient-to-tr w-full flex justify-center items-center px-1 text-white z-30">
        <Icon path={mdiAlertCircleOutline} class="h-6 w-6" />
        <Switch>
          <Match when={["canceled", "unpaid"].includes(subscription()?.status || "")}>
            <span class="pl-1 pr-2">This workspace is read-only.</span>
            <button
              class="font-semibold underline inline-flex justify-center items-center"
              onClick={goToBilling}
            >
              Subscribe to continue using Vrite.
            </button>
          </Match>
          <Match when={["past_due"].includes(subscription()?.status || "")}>
            <span class="pl-1 pr-2">There was an issue with your last payment.</span>
            <button
              class="font-semibold underline inline-flex justify-center items-center"
              onClick={goToBilling}
            >
              Verify your payment method to continue using Vrite.
            </button>
          </Match>
          <Match when={subscription()?.status === "trialing" && remainingBillingPeriod() <= 7}>
            <span class="pl-1 pr-2">
              Your trial ends in {remainingBillingPeriod()} day
              {remainingBillingPeriod() > 1 ? "s" : ""}.
            </span>
            <button
              class="font-semibold underline inline-flex justify-center items-center"
              onClick={goToBilling}
            >
              Add your payment method to continue using Vrite.
            </button>
          </Match>
        </Switch>
      </div>
    </Show>
  );
};

export { SubscriptionBanner };
