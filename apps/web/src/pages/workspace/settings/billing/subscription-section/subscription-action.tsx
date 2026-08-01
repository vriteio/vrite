import { Button } from "@andesine/components";
import { createAsync, query } from "@solidjs/router";
import { createMutation } from "@tanstack/solid-query";
import { Component, createMemo, Show } from "solid-js";

import { useNotify } from "#web/context/notifications";
import { useWorkspace } from "#web/context/workspace";
import { client } from "#web/lib/client";
import { config } from "#web/lib/config";
import { formatUSD } from "#web/lib/format";
import clsx from "clsx";

interface SubscriptionInfo {
  plan: string;
  status: string;
  seats: number;
  expiresAt: string | null;
  customerID: string | null;
}
interface SubscriptionInfoProps {
  subscription: SubscriptionInfo;
  canManageBilling: boolean;
  isPro: boolean;
}

const subscriptionQuery = query(() => client.billing.subscription(), "billing-subscription");
const SubscriptionInfo: Component<SubscriptionInfoProps> = (props) => {
  const daysUntilExpiry = createMemo(() => {
    const expiresAt = props.subscription.expiresAt;

    if (!expiresAt) return null;

    const diff = new Date(expiresAt).getTime() - Date.now();

    return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
  });
  const billingStatus = createMemo(() => {
    const status = props.subscription?.status;

    if (status === "past_due" || status === "unpaid") {
      return {
        icon: "i-lucide:triangle-alert",
        text: "Your latest payment failed. Update your payment method to prevent interruption."
      } as const;
    }

    if (status === "canceled" || status === "inactive") {
      return {
        icon: "i-lucide:arrow-big-down-dash",
        text: "This workspace is on the Free plan. You can upgrade again at any time."
      } as const;
    }

    if (status === "incomplete" || status === "incomplete_expired") {
      return {
        icon: "i-lucide:clock-arrow-right",
        text: "Checkout was not completed. Start a new checkout to activate Pro"
      } as const;
    }

    if (!props.canManageBilling) {
      return {
        icon: "i-lucide:lock",
        text: "Your role can review billing details, but billing changes require additional access"
      };
    }

    if (props.isPro && props.subscription.expiresAt) {
      return {
        icon: "i-lucide:clock",
        text: `Current period ends in ${daysUntilExpiry()} day
                ${daysUntilExpiry() === 1 ? "" : "s"}.`
      };
    }

    return null;
  });

  return (
    <Show when={billingStatus()}>
      {(state) => (
        <div class="flex gap-1.5 text-xs text-gray-400 dark:text-gray-500">
          <div class="border-r border-gray-200 pl-1 pr-1.5 flex justify-center items-start">
            <div class="h-4 w-4 flex justify-center items-center shrink-0">
              <div class={clsx("h-3.5 w-3.5", state().icon)} />
            </div>
          </div>
          <div>{state().text}</div>
        </div>
      )}
    </Show>
  );
};
const SubscriptionAction: Component = () => {
  const notify = useNotify();
  const { hasPermission } = useWorkspace();
  const subscription = createAsync(() => subscriptionQuery());
  const checkoutMutation = createMutation(() => ({
    onSuccess: (url) => {
      window.location.href = url;
    },
    onError: () => {
      notify({ text: "Couldn't start checkout. Please try again.", type: "error" });
    },
    mutationFn: async () => {
      const { url } = await client.billing.checkout();

      return url;
    }
  }));
  const portalMutation = createMutation(() => ({
    onSuccess: (url) => {
      window.location.href = url;
    },
    onError: () => {
      notify({ text: "Couldn't open the billing portal. Please try again.", type: "error" });
    },
    mutationFn: async () => {
      const { url } = await client.billing.portal();

      return url;
    }
  }));
  const canManageBilling = () => hasPermission("billing");

  return (
    <Show when={subscription()}>
      {(subscriptionData) => {
        const isPro = () => subscriptionData().plan === "pro";

        return (
          <div class="flex flex-col gap-2 w-full max-w-64">
            <Button
              color="primary"
              class="flex flex-col items-start rounded-xl px-3 py-2 h-full w-full relative overflow-hidden"
              disabled={
                checkoutMutation.isPending || portalMutation.isPending || !canManageBilling()
              }
              onClick={() => {
                if (canManageBilling()) {
                  if (isPro()) {
                    portalMutation.mutate();
                  } else {
                    checkoutMutation.mutate();
                  }
                }
              }}
            >
              <div
                class="absolute top-0 left-0 h-full w-full bg-repeat bg-[url(/assets/noise.png)] mix-blend-overlay bg-blend-overlay pointer-events-none"
                style={{
                  "background-size": "6rem 6rem"
                }}
              />
              <span class="opacity-50 text-xs font-semibold w-full text-start">
                {checkoutMutation.isPending || portalMutation.isPending
                  ? "Redirecting"
                  : canManageBilling()
                    ? isPro()
                      ? "Manage"
                      : "Upgrade"
                    : "View only"}
              </span>
              <div class="w-full flex">
                <span class="flex-1 font-semibold text-start">
                  {canManageBilling()
                    ? isPro()
                      ? "Manage subscription"
                      : "Pro Plan"
                    : "Current plan"}
                </span>
                <span class="text-base">
                  {formatUSD(config.PRICE_PER_SEAT_USD)}
                  <span class="opacity-50 mx-0.5">/</span>seat
                  <span class="opacity-50 mx-0.5">/</span>
                  mo.
                </span>
              </div>
            </Button>
            <SubscriptionInfo
              subscription={subscriptionData()}
              canManageBilling={canManageBilling()}
              isPro={isPro()}
            />
          </div>
        );
      }}
    </Show>
  );
};

export { SubscriptionAction };
