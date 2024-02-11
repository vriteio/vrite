import { APIUsageCard } from "./api-usage-card";
import { ChangePlanCard } from "./change-plan-card";
import { PriceTag } from "./price-tag";
import { Match, Show, Switch, createMemo, createSignal } from "solid-js";
import { mdiCreditCardEdit, mdiInformation } from "@mdi/js";
import { Button, IconButton, Tooltip } from "@vrite/components";
import dayjs from "dayjs";
import { SettingsSectionComponent } from "#views/settings/view";
import { TitledCard } from "#components/fragments";
import { hasPermission, useAuthenticatedUserData, useClient } from "#context";

const BillingSection: SettingsSectionComponent = (props) => {
  const client = useClient();
  const { subscription } = useAuthenticatedUserData();
  const [loadingPortal, setLoadingPortal] = createSignal(false);
  const [loadingCheckout, setLoadingCheckout] = createSignal("");
  const remainingBillingPeriod = createMemo(() => {
    return dayjs(subscription()?.expiresAt).diff(dayjs(), "days");
  });
  const manageSubscription = async (): Promise<void> => {
    setLoadingPortal(true);

    const { url } = await client.billing.portal.query();

    window.location.href = url;
  };
  const checkout = async (plan: "personal" | "team"): Promise<void> => {
    setLoadingCheckout(plan);

    const { url } = await client.billing.checkout.query({ plan });

    window.location.href = url;
  };

  props.setActionComponent(() => {
    return (
      <Show when={hasPermission("manageBilling")}>
        <Tooltip text="Edit payment details" wrapperClass="flex @md:hidden" class="mt-1" fixed>
          <IconButton
            path={mdiCreditCardEdit}
            class="m-0"
            color="primary"
            onClick={manageSubscription}
            loading={loadingPortal()}
          />
        </Tooltip>
        <Button
          color="primary"
          class="m-0 hidden @md:flex"
          onClick={manageSubscription}
          loading={loadingPortal()}
        >
          Edit payment details
        </Button>
      </Show>
    );
  });

  return (
    <div class="flex justify-center flex-col items-start w-full gap-5">
      <TitledCard icon={mdiInformation} label={subscription()?.plan ? "Active Plan" : "Subscribe"}>
        <Button
          size="large"
          class="m-0 w-full flex items-center rounded-xl min-h-11 flex-col items-start"
          badge={Boolean(subscription()?.plan)}
          hover={!subscription()?.plan}
          color="contrast"
          loading={loadingCheckout() === "team"}
          onClick={() => {
            if (!subscription()?.plan) checkout("team");
          }}
        >
          <Switch>
            <Match when={subscription()?.plan === "personal"}>
              <div class="w-full flex">
                <span class="flex-1 font-semibold text-start">Personal Plan</span>
                <PriceTag price={6} text="soft" />
              </div>
            </Match>
            <Match when={true}>
              <span class="text-gray-500 dark:text-gray-400 text-xs font-semibold w-full text-start">
                Select plan
              </span>
              <div class="w-full flex">
                <span class="flex-1 font-semibold text-start">Team Plan</span>
                <PriceTag price={12} text="soft" perSeat />
              </div>
            </Match>
          </Switch>
        </Button>
        <Show when={!subscription()?.plan}>
          <Button
            size="large"
            class="m-0 w-full flex items-center rounded-xl min-h-11 flex-col items-start"
            badge={Boolean(subscription()?.plan)}
            hover={!subscription()?.plan}
            color="contrast"
            loading={loadingCheckout() === "personal"}
            onClick={() => {
              if (!subscription()?.plan) checkout("personal");
            }}
          >
            <span class="text-gray-500 dark:text-gray-400 text-xs font-semibold w-full text-start">
              Select plan
            </span>
            <div class="w-full flex">
              <span class="flex-1 font-semibold text-start">Personal Plan</span>
              <PriceTag price={6} text="soft" />
            </div>
          </Button>
          <p class="prose text-gray-500 dark:text-gray-400 w-full">
            Each plan includes <b>5,000</b> API requests per month. Additional requests are billed
            at <b>$0.001</b> per request.
          </p>
        </Show>
        <Show when={subscription()?.plan && hasPermission("manageBilling")}>
          <div class="w-full">
            <p class="prose text-gray-500 dark:text-gray-400 w-full mb-0">
              <Show
                when={subscription()?.status === "trialing"}
                fallback={"Your billing period ends in "}
              >
                Your free trial ends in{" "}
              </Show>
              <b>
                {remainingBillingPeriod()} day{remainingBillingPeriod() > 1 ? "s" : ""}
              </b>
              .
              <br />
            </p>

            <Button
              class="inline-flex m-0 px-1 py-0 rounded-md"
              text="soft"
              color="contrast"
              onClick={manageSubscription}
              disabled={loadingPortal()}
            >
              Cancel subscription
            </Button>
          </div>
        </Show>
      </TitledCard>
      <Show when={subscription()?.plan && hasPermission("manageBilling")}>
        <APIUsageCard />
        <ChangePlanCard />
      </Show>
    </div>
  );
};

export { BillingSection };
