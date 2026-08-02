import { Component, createEffect, createSignal } from "solid-js";

import { useNotify } from "#web/context/notifications";
import { useWorkspace } from "#web/context/workspace";
import { useSearchParams, revalidate } from "@solidjs/router";
import { SubscriptionSection } from "./subscription-section";
import { UsageSection } from "./usage-section";
import { BillingProcessingDialog } from "./processing-dialog";

const BillingSettingsPage: Component = () => {
  const notify = useNotify();
  const { workspaceID } = useWorkspace();
  const [searchParams, setSearchParams] = useSearchParams();
  const [processingCheckout, setProcessingCheckout] = createSignal(false);

  createEffect(() => {
    const result = searchParams.billing;
    const currentWorkspaceID = workspaceID();

    if (!result || !currentWorkspaceID) return;

    if (result === "success") {
      setProcessingCheckout(true);
    } else if (result === "cancel") {
      notify({ type: "info", text: "Checkout canceled. No billing changes were made." });
    } else if (result === "portal") {
      notify({ type: "info", text: "Billing portal closed. Refreshing your billing details..." });
    }

    if (result !== "success") {
      void revalidate(["billing-subscription", "billing-usage"]);
    }
    setSearchParams({ billing: undefined }, { replace: true });
  });

  return (
    <>
      <SubscriptionSection />
      <UsageSection />
      <BillingProcessingDialog
        opened={processingCheckout()}
        onClose={() => {
          setProcessingCheckout(false);
          void revalidate(["billing-subscription", "billing-usage"]);
        }}
        onConfirmed={() => {
          setProcessingCheckout(false);
          void revalidate(["billing-subscription", "billing-usage"]);
          notify({ type: "success", text: "Your Pro subscription is ready." });
        }}
      />
    </>
  );
};

export default BillingSettingsPage;
