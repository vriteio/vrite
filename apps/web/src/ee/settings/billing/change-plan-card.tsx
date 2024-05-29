import { PriceTag } from "./price-tag";
import { mdiCog } from "@mdi/js";
import { Component, Match, Show, Switch, createMemo, createResource } from "solid-js";
import { Button } from "#components/primitives";
import { CollapsibleSection } from "#components/fragments";
import { useAuthenticatedUserData, useClient, useConfirmationModal } from "#context";
import { navigateAndReload } from "#lib/utils";

const ChangePlanCard: Component = () => {
  const client = useClient();
  const { confirmAction } = useConfirmationModal();
  const { subscription } = useAuthenticatedUserData();
  const alternativePlan = createMemo(() => {
    return subscription()?.plan === "personal" ? "team" : "personal";
  });
  const [canSwitchPlan] = createResource(async () => {
    const { canSwitch } = await client.billing.canSwitchPlan.query({
      plan: alternativePlan()
    });

    return canSwitch;
  });
  const switchPlan = async (): Promise<void> => {
    if (!subscription()) return;

    confirmAction({
      header: `Switch to the ${subscription()!.plan === "personal" ? "Team" : "Personal"} plan?`,
      content: (
        <p>
          The new price will be{" "}
          <Show
            when={alternativePlan() === "team"}
            fallback={<PriceTag price={6} class="font-semibold" />}
          >
            <PriceTag price={12} class="font-semibold" perSeat />
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

  return (
    <CollapsibleSection icon={mdiCog} label="Change plan">
      <Button
        size="large"
        class="m-0 w-full flex items-start flex-col rounded-xl"
        color="primary"
        onClick={switchPlan}
        disabled={!canSwitchPlan()}
        loading={canSwitchPlan.loading}
      >
        <span class="opacity-70 text-xs font-semibold">Change plan</span>
        <span class="font-semibold">
          Switch to the {subscription()?.plan === "personal" ? "Team" : "Personal"} plan
        </span>
      </Button>
      <Show when={!canSwitchPlan.loading}>
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
              Workspace has to have only <b>a single member</b> to switch to the personal plan. See{" "}
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
    </CollapsibleSection>
  );
};

export { ChangePlanCard };
