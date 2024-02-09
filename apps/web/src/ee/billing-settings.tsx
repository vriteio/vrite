import { SettingsSectionComponent } from "../views/settings/view";
import { Match, Show, Switch, createMemo, createResource, createSignal } from "solid-js";
import { mdiCog, mdiCreditCardEdit, mdiInformation, mdiPoll } from "@mdi/js";
import { Button, IconButton, Tooltip } from "@vrite/components";
import dayjs from "dayjs";
import { TitledCard } from "#components/fragments";
import { hasPermission, useClient, useConfirmationModal } from "#context";
import { navigateAndReload } from "#lib/utils";

const BillingSection: SettingsSectionComponent = (props) => {
  const client = useClient();
  const { confirmAction } = useConfirmationModal();
  const [loadingPortal, setLoadingPortal] = createSignal(false);
  const [subscription] = createResource(() => {
    return client.billing.subscription.query();
  });
  const alternativePlan = createMemo(() => {
    return subscription()?.plan === "personal" ? "team" : "personal";
  });
  const [usage] = createResource(
    async () => {
      const { usage } = await client.billing.usage.query();

      return usage;
    },
    { initialValue: 0 }
  );
  const [canSwitchPlan] = createResource(async () => {
    const { canSwitch } = await client.billing.canSwitchPlan.query({
      plan: alternativePlan()
    });

    return canSwitch;
  });
  const estimatedUsagePrice = (): number => {
    if (!usage()) return 0;

    return Math.max((usage()! - 10000) * 0.001, 0);
  };
  const currencyFormatter = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2
  });
  const numberFormatter = new Intl.NumberFormat("en-US", {
    style: "decimal"
  });
  const manageSubscription = async (): Promise<void> => {
    setLoadingPortal(true);

    const { url } = await client.billing.portal.query();

    window.location.href = url;
  };
  const switchPlan = async (): Promise<void> => {
    if (!subscription()) return;

    confirmAction({
      header: `Switch to the ${subscription()!.plan === "personal" ? "Team" : "Personal"} plan?`,
      content: (
        <p>
          The new price will be{" "}
          <Show
            when={alternativePlan() === "team"}
            fallback={
              <span class="font-semibold">
                {currencyFormatter.format(6)}
                <span class="opacity-50 mx-0.5">/</span>
                mo.
              </span>
            }
          >
            <span class="font-semibold">
              {currencyFormatter.format(12)}
              <span class="opacity-50 mx-0.5">/</span>seat
              <span class="opacity-50 mx-0.5">/</span>
              mo.
            </span>
          </Show>
        </p>
      ),
      onConfirm: async () => {
        await client.billing.switchPlan.mutate({
          plan: subscription()!.plan === "personal" ? "team" : "personal"
        });
        navigateAndReload(window.location.href);
      }
    });
  };

  props.setActionComponent(() => {
    return (
      <Show when={hasPermission("manageWorkspace")}>
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
      <TitledCard icon={mdiInformation} label="Active plan">
        <Button
          size="large"
          class="m-0 w-full flex items-center rounded-xl min-h-11"
          badge
          hover={false}
          color="contrast"
          loading={subscription.loading}
        >
          <Switch>
            <Match when={subscription()?.plan === "personal"}>
              <span class="flex-1 font-semibold text-start">Personal Plan</span>
              <span class="text-gray-500 dark:text-gray-400 text-base">
                {currencyFormatter.format(6)}
                <span class="opacity-50 mx-0.5">/</span>mo.
              </span>
            </Match>
            <Match when={subscription()?.plan === "team"}>
              <span class="flex-1 font-semibold text-start">Team Plan</span>
              <span class="text-gray-500 dark:text-gray-400 text-base">
                {currencyFormatter.format(12)}
                <span class="opacity-50 mx-0.5">/</span>seat
                <span class="opacity-50 mx-0.5">/</span>
                mo.
              </span>
            </Match>
          </Switch>
        </Button>
        <div class="w-full">
          <Switch>
            <Match when={subscription()?.status === "trialing"}>
              <p class="prose text-gray-500 dark:text-gray-400 w-full mb-0">
                Your free trial ends in <b>{dayjs(subscription()?.expiresAt).to(dayjs())} days</b>.
                <br />
              </p>
            </Match>
          </Switch>
          <Button class="inline-flex m-0 px-1 py-0 rounded-md" text="soft">
            Cancel subscription
          </Button>
        </div>
      </TitledCard>
      <TitledCard icon={mdiPoll} label="API usage">
        <Button
          size="large"
          class="m-0 w-full flex items-start flex-col rounded-xl"
          badge
          hover={false}
          color="contrast"
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
            <span class="text-base text-gray-500 dark:text-gray-400">10,000</span>
          </div>
        </Button>
        <p class="prose text-gray-500 dark:text-gray-400 w-full">
          Your plan includes <b>10,000</b> API requests per month. Additional requests are billed at{" "}
          <b>$0.001</b> per request.
        </p>
      </TitledCard>
      <TitledCard icon={mdiCog} label="Change plan">
        <Button
          size="large"
          class="m-0 w-full flex items-start flex-col rounded-xl"
          color="primary"
          onClick={switchPlan}
          disabled={!canSwitchPlan()}
          loading={subscription.loading || canSwitchPlan.loading}
        >
          <span class="opacity-70 text-xs font-semibold">Change plan</span>
          <span class="font-semibold">
            Switch to the {subscription()?.plan === "personal" ? "Team" : "Personal"} plan
          </span>
        </Button>
        <Show when={!subscription.loading && !canSwitchPlan.loading}>
          <Switch>
            <Match when={alternativePlan() === "team"}>
              <p class="prose text-gray-500 dark:text-gray-400 w-full">
                Upgrade to collaborate with your team. See{" "}
                <a href="https://vrite.io/pricing" target="_blank">
                  pricing
                </a>{" "}
                for more details.
              </p>
            </Match>
            <Match when={!canSwitchPlan()}>
              <p class="prose text-gray-500 dark:text-gray-400 w-full">
                Workspace has to have only <b>a single member</b> to switch to the personal plan.
                See{" "}
                <a href="https://vrite.io/pricing" target="_blank">
                  pricing
                </a>{" "}
                for more details.
              </p>
            </Match>
            <Match when={alternativePlan() === "personal"}>
              <p class="prose text-gray-500 dark:text-gray-400 w-full">
                See{" "}
                <a href="https://vrite.io/pricing" target="_blank">
                  pricing
                </a>{" "}
                for more details.
              </p>
            </Match>
          </Switch>
        </Show>
      </TitledCard>
    </div>
  );
};

export { BillingSection };
