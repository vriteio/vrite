import { revalidate, useSearchParams } from "@solidjs/router";
import { Component, createEffect } from "solid-js";

import { useNotify } from "#web/context/notifications";
import { useWorkspace } from "#web/context/workspace";
import { SettingsTab } from "../../settings-tab";
import { SubscriptionSection } from "./subscription-section";
import { UsageSection } from "./usage-section";

const BillingTab: Component = () => {
  const notify = useNotify();
  const { workspaceID } = useWorkspace();
  const [searchParams, setSearchParams] = useSearchParams();

  createEffect(() => {
    const result = searchParams.billing;
    const currentWorkspaceID = workspaceID();

    if (!result || !currentWorkspaceID) return;

    if (result === "success") {
      notify({ type: "success", text: "Checkout completed. Refreshing your subscription..." });
    } else if (result === "cancel") {
      notify({ type: "success", text: "Checkout canceled" });
    }

    revalidate(["billing-subscription", "billing-usage"]);
    setSearchParams({ billing: undefined }, { replace: true });
  });

  return (
    <SettingsTab>
      <div class="flex h-full min-w-0 flex-col gap-3">
        <SubscriptionSection />
        <UsageSection />
      </div>
    </SettingsTab>
  );
};

export { BillingTab };
