import { Component, createEffect } from "solid-js";

import { SettingsPage } from "../settings-page";
import { useNotify } from "#web/context/notifications";
import { useWorkspace } from "#web/context/workspace";
import { useSearchParams, revalidate } from "@solidjs/router";
import { SubscriptionSection } from "./subscription-section";
import { UsageSection } from "./usage-section";

const BillingSettingsPage: Component = () => {
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
    <SettingsPage title="Billing">
      <SubscriptionSection />
      <UsageSection />
    </SettingsPage>
  );
};

export default BillingSettingsPage;
