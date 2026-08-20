import { Button } from "@andesine/components";
import { createAsync, revalidate } from "@solidjs/router";
import { createMutation } from "@tanstack/solid-query";
import { type Component, createMemo, Show } from "solid-js";

import { useNotify } from "#web/context/notifications";
import { useWorkspace } from "#web/context/workspace";
import { client } from "#web/lib/api";
import { config } from "#web/lib/api";
import { formatUSD } from "#web/lib/primitives";
import clsx from "clsx";
import { subscriptionQuery } from "#web/lib/data";

interface SubscriptionInfo {
  plan: string;
  status: string;
  seats: number;
  expiresAt: string | null;
  customerID: string | null;
  cancelAtPeriodEnd: boolean;
}
interface SubscriptionInfoProps {
  subscription: SubscriptionInfo;
  canManageBilling: boolean;
  isPro: boolean;
}

const SubscriptionInfo: Component<SubscriptionInfoProps> = (props) => {
  const periodDate = createMemo(() => {
    const expiresAt = props.subscription.expiresAt;

    if (!expiresAt) return null;

    return new Intl.DateTimeFormat("en-US", {
      day: "numeric",
      month: "short",
      timeZone: "UTC",
      year: "numeric"
    }).format(new Date(expiresAt));
  });
  const billingStatus = createMemo(() => {
    const status = props.subscription?.status;
    const expiresAt = props.subscription.expiresAt;
    const hasRemainingPaidPeriod =
      (status === "active" || status === "canceled") &&
      expiresAt &&
      new Date(expiresAt).getTime() > Date.now();

    if (status === "past_due" || status === "unpaid") {
      return {
        icon: "i-lucide:triangle-alert",
        text: "Your latest payment failed. Update your payment method to prevent interruption."
      } as const;
    }

    if (hasRemainingPaidPeriod && periodDate()) {
      return {
        icon: "i-lucide:calendar-x",
        text: `Your Pro subscription was canceled. You can use Andesine Pro until ${periodDate()} (UTC).`
      } as const;
    }

    if (status === "canceled" || status === "inactive") {
      return {
        icon: "i-lucide:arrow-big-down-dash",
        text: periodDate()
          ? `The subscription ended on ${periodDate()} (UTC). This workspace is now on the Free plan.`
          : "This workspace is on the Free plan. You can upgrade again at any time."
      } as const;
    }

    if (status === "incomplete") {
      return {
        icon: "i-lucide:clock-arrow-right",
        text: "Subscription setup is still processing. Billing will update after Stripe confirms it."
      } as const;
    }

    if (status === "incomplete_expired") {
      return {
        icon: "i-lucide:clock-arrow-right",
        text: "The previous Checkout expired. Start a new Checkout to activate Pro."
      } as const;
    }

    if (props.isPro && props.subscription.cancelAtPeriodEnd && periodDate()) {
      return {
        icon: "i-lucide:calendar-x",
        text: `Your Pro subscription is scheduled to cancel on ${periodDate()} (UTC).`
      } as const;
    }

    if (props.isPro && periodDate()) {
      return {
        icon: "i-lucide:clock",
        text:
          status === "trialing"
            ? `Your trial ends on ${periodDate()} (UTC).`
            : `Your subscription renews on ${periodDate()} (UTC).`
      };
    }

    if (!props.canManageBilling) {
      return {
        icon: "i-lucide:lock",
        text: "Your role can review billing details, but billing changes require additional access"
      };
    }

    return null;
  });

  return (
    <Show when={billingStatus()}>
      {(state) => (
        <div class="flex gap-1.5 text-xs text-gray-400 max-w-72">
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
  const checkoutMutation = createMutation(() => ({
    onSuccess: (url) => {
      window.location.href = url;
    },
    onError: (error) => {
      const code =
        error && typeof error === "object" && "code" in error && typeof error.code === "string"
          ? error.code
          : "";

      if (code === "SUBSCRIPTION_MANAGE_IN_PORTAL") {
        portalMutation.mutate();
        return;
      }
      if (code === "SUBSCRIPTION_SETUP_PENDING") {
        void revalidate(subscriptionQuery.key);
        notify({
          text: "Subscription setup is still processing. Refresh billing status in a moment.",
          type: "info"
        });
        return;
      }

      notify({ text: "Couldn't start checkout. Please try again.", type: "error" });
    },
    mutationFn: async () => {
      const { url } = await client.billing.checkout();

      return url;
    }
  }));
  const canManageBilling = () => hasPermission("billing");

  return (
    <Show when={subscription()}>
      {(subscriptionData) => {
        const isPro = () => subscriptionData().plan === "pro";
        const setupPending = () => subscriptionData().status === "incomplete";
        const isRedirecting = () => checkoutMutation.isPending || portalMutation.isPending;
        const showUpgradePrice = () => {
          return canManageBilling() && !isPro() && !setupPending() && !isRedirecting();
        };
        const buttonLabel = () => {
          if (isRedirecting()) return "Redirecting...";
          if (setupPending()) return "Setup pending...";
          if (!canManageBilling()) return "Current plan";

          return "Manage subscription";
        };

        return (
          <div class="flex flex-col gap-2 w-full md:max-w-64">
            <Button
              color="primary"
              class="flex flex-col items-start rounded-xl px-3 py-2 h-full w-full relative overflow-hidden"
              disabled={
                checkoutMutation.isPending ||
                portalMutation.isPending ||
                setupPending() ||
                !canManageBilling()
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
                {canManageBilling() && !setupPending() && !isPro() ? "Upgrade" : "Andesine Pro"}
              </span>
              <div class="w-full text-start">
                <Show
                  when={showUpgradePrice()}
                  fallback={<span class="font-semibold">{buttonLabel()}</span>}
                >
                  <span class="text-base">
                    {formatUSD(config.PRICE_PER_SEAT_USD)}
                    <span class="opacity-50 mx-0.5">/</span>seat
                    <span class="opacity-50 mx-0.5">/</span>
                    mo.
                  </span>
                </Show>
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
