import { Button, Skeleton } from "@andesine/components";
import { Component, Show, For, createEffect, createMemo } from "solid-js";
import { Setting } from "../../setting";
import { SettingsSection } from "../../settings-section";
import { UsageChart } from "./usage-chart";
import { client } from "#web/lib/client";
import { useNotify } from "#web/context/notifications";
import clsx from "clsx";
import { createMutation, createQuery, useQueryClient } from "@tanstack/solid-query";
import { useSearchParams } from "@solidjs/router";
import { useWorkspace } from "#web/context/workspace";

interface BillingSettingsTabProps {
  setTab(tabId: string): void;
  canManageBilling?: boolean;
  opened?: boolean;
  clientReady?: boolean;
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

const formatNumber = (n: number): string => {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}K`;

  return `${n}`;
};
const BillingSettingsTab: Component<BillingSettingsTabProps> = (props) => {
  const notify = useNotify();
  const queryClient = useQueryClient();
  const { workspaceID } = useWorkspace();
  const [searchParams, setSearchParams] = useSearchParams();
  const checkoutMutation = createMutation(() => ({
    mutationFn: async () => {
      const { url } = await client.billing.checkout();

      return url;
    }
  }));
  const portalMutation = createMutation(() => ({
    mutationFn: async () => {
      const { url } = await client.billing.portal();

      return url;
    }
  }));
  const subscription = createQuery(() => ({
    queryKey: ["billing", workspaceID(), "subscription"],
    enabled: Boolean(props.clientReady && workspaceID()),
    queryFn: () => client.billing.subscription()
  }));
  const usage = createQuery(() => ({
    queryKey: ["billing", workspaceID(), "usage"],
    enabled: Boolean(props.clientReady && workspaceID()),
    queryFn: () => client.billing.usage()
  }));
  const isPro = () => subscription.data?.plan === "pro";
  const billingStatus = createMemo(() => {
    const status = subscription.data?.status;

    if (status === "trialing") {
      return { tone: "primary", title: "Trial active", text: "Your Pro trial is active." } as const;
    }
    if (status === "past_due" || status === "unpaid") {
      return {
        tone: "danger",
        title: "Payment required",
        text: "Your latest payment failed. Update your payment method to prevent interruption."
      } as const;
    }
    if (status === "canceled" || status === "inactive") {
      return {
        tone: "muted",
        title: "Subscription canceled",
        text: "This workspace is on the Free plan. You can upgrade again at any time."
      } as const;
    }
    if (status === "incomplete" || status === "incomplete_expired") {
      return {
        tone: "danger",
        title: "Subscription incomplete",
        text: "Checkout was not completed. Start a new checkout to activate Pro."
      } as const;
    }

    return null;
  });
  const daysUntilExpiry = () => {
    const expiresAt = subscription.data?.expiresAt;

    if (!expiresAt) return null;

    const diff = new Date(expiresAt).getTime() - Date.now();

    return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
  };

  const handleUpgrade = async () => {
    try {
      window.location.href = await checkoutMutation.mutateAsync();
    } catch {
      notify({ text: "Failed to start checkout", type: "error" });
    }
  };
  const handleManage = async () => {
    try {
      window.location.href = await portalMutation.mutateAsync();
    } catch {
      notify({ text: "Failed to open billing portal", type: "error" });
    }
  };
  const canManageBilling = () => props.canManageBilling ?? true;
  const retryLoad = () => {
    queryClient.invalidateQueries({ queryKey: ["billing"] });
  };

  createEffect(() => {
    const result = searchParams.billing;

    if (!result) return;

    if (result === "success") {
      notify({ type: "success", text: "Checkout completed. Refreshing your subscription..." });
    } else if (result === "cancel") {
      notify({ type: "success", text: "Checkout canceled" });
    }

    queryClient.invalidateQueries({ queryKey: ["billing", workspaceID()] });
    setSearchParams({ billing: undefined }, { replace: true });
  });

  return (
    <div class="flex h-full min-w-0 flex-col gap-3">
      <SettingsSection label="Subscription">
        <Show
          when={!subscription.isPending}
          fallback={
            <Setting
              label="Andesine Pro"
              description="Upgrade for unlimited team members, priority support, and higher API limits"
            >
              <Skeleton class="h-16 w-full max-w-64 rounded-xl" />
            </Setting>
          }
        >
          <Show
            when={!subscription.error && subscription.data}
            fallback={
              <div class="flex flex-col gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300">
                <span>Failed to load billing details.</span>
                <div class="flex gap-2">
                  <Button size="small" variant="outlined" onClick={retryLoad}>
                    Retry
                  </Button>
                </div>
              </div>
            }
          >
            <Show when={billingStatus()}>
              {(state) => (
                <div
                  class={clsx(
                    "flex flex-col gap-0.5 rounded-xl border p-3 text-sm",
                    state().tone === "danger" &&
                      "border-red-200 bg-red-50 text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300",
                    state().tone === "primary" &&
                      "border-primary-200 bg-primary-50 text-primary-700 dark:border-primary-900 dark:bg-primary-950/40 dark:text-primary-300",
                    state().tone === "muted" &&
                      "border-gray-200 bg-gray-50 text-gray-600 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-300"
                  )}
                >
                  <span class="font-semibold">{state().title}</span>
                  <span>{state().text}</span>
                </div>
              )}
            </Show>
            <Setting
              label={
                <div class="inline-flex items-center gap-1 font-semibold">
                  <div class="inline-flex items-center">
                    <div class="h-4.5 w-4.5 i-andesine:logo bg-gradient-to-tr" />
                    ndesine
                  </div>
                  <div class="w-px h-4 rounded-full bg-gray-300 dark:bg-gray-600" />
                  <div class="bg-gradient-to-tr text-transparent bg-clip-text">Pro</div>
                </div>
              }
              description={
                <div class="flex flex-col gap-1">
                  <For
                    each={[
                      "Unlimited team members",
                      "Priority support",
                      <>
                        <span class="font-semibold text-gray-700">500K API calls</span> included
                      </>,
                      <>
                        <span class="font-semibold text-gray-700">$1 per 50K</span> additional API
                        calls
                      </>
                    ]}
                  >
                    {(item) => {
                      return (
                        <div class="flex gap-1.5">
                          <span class="i-lucide:check bg-gradient-to-tr h-4 w-4 flex-shrink-0" />
                          <span>{item}</span>
                        </div>
                      );
                    }}
                  </For>
                </div>
              }
            >
              <div class="flex flex-col gap-2 w-full max-w-64">
                <Button
                  color="primary"
                  class="flex flex-col items-start rounded-xl px-3 py-2"
                  disabled={
                    checkoutMutation.isPending || portalMutation.isPending || !canManageBilling()
                  }
                  onClick={() => {
                    if (canManageBilling()) {
                      if (isPro()) {
                        handleManage();
                      } else {
                        handleUpgrade();
                      }
                    }
                  }}
                >
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
                    <PriceTag price={12} perSeat />
                  </div>
                </Button>
                <Show when={!canManageBilling()}>
                  <span class="text-xs text-gray-400 dark:text-gray-500">
                    Your role can review billing details, but billing changes require additional
                    access.
                  </span>
                </Show>
                <Show when={isPro() && subscription.data?.expiresAt}>
                  <span class="text-xs text-gray-400 dark:text-gray-500">
                    Current period ends in {daysUntilExpiry()} day
                    {daysUntilExpiry() === 1 ? "" : "s"}.
                  </span>
                </Show>
              </div>
            </Setting>
          </Show>
        </Show>
      </SettingsSection>
      <SettingsSection label="API Usage">
        <Setting
          label="Monthly API calls"
          description="Requests made during the current billing period"
        />
        <Show
          when={!usage.isPending}
          fallback={
            <div class="flex flex-col gap-2">
              <Skeleton class="h-5 w-40" />
              <Skeleton class="h-32 w-full rounded-xl" />
            </div>
          }
        >
          <Show
            when={!usage.error && usage.data}
            fallback={
              <div class="flex items-center justify-between gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300">
                <span>Failed to load API usage.</span>
                <Button size="small" variant="outlined" onClick={retryLoad}>
                  Retry
                </Button>
              </div>
            }
          >
            {(usageData) => {
              const now = new Date();
              const currentDay = now.getDate();
              const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();

              return (
                <div class="flex flex-col gap-2">
                  <div class="flex items-end gap-2">
                    <div class="text-lg font-semibold">{formatNumber(usageData().totalUsage)}</div>
                    <div class="pb-0.5 text-xs text-gray-400 dark:text-gray-500">
                      of {formatNumber(usageData().limit)} limit
                    </div>
                  </div>
                  <UsageChart
                    daily={usageData().dailyUsage}
                    currentDay={currentDay}
                    limit={usageData().limit}
                    daysInMonth={daysInMonth}
                    year={usageData().startDate.getFullYear()}
                    month={usageData().startDate.getMonth() + 1}
                  />
                  <Show when={usageData().totalUsage >= usageData().limit}>
                    <div class="bg-amber-50 dark:bg-amber-900 dark:bg-opacity-20 rounded-lg p-3 text-sm text-amber-600 dark:text-amber-400">
                      <Show
                        when={isPro()}
                        fallback="You've reached the Free plan API limit. Upgrade to Pro for higher limits."
                      >
                        You've exceeded the included 500K requests. Additional usage will be billed
                        at $1 per 50K requests.
                      </Show>
                    </div>
                  </Show>
                </div>
              );
            }}
          </Show>
        </Show>
      </SettingsSection>
    </div>
  );
};

export { BillingSettingsTab };
