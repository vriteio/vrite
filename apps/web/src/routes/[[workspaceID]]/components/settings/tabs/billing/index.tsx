import { Button, Spinner } from "@andesine/components";
import { Component, Show, For, createMemo, createResource, createSignal } from "solid-js";
import { Setting } from "../../setting";
import { SettingsSection } from "../../settings-section";
import { UsageChart } from "./usage-chart";
import { client } from "#web/lib/client";
import { useNotify } from "#web/context/notifications";
import clsx from "clsx";
import { action, useAction, useSubmission } from "@solidjs/router";

interface BillingSettingsTabProps {
  setTab(tabId: string): void;
  canManageBilling?: boolean;
  opened?: boolean;
}
interface PriceTagProps {
  perSeat?: boolean;
  price: number;
  text?: "soft" | "base";
  class?: string;
}
const startBillingCheckoutAction = action(async () => {
  const { url } = await client.billing.checkout();

  return url;
});
const openBillingPortalAction = action(async () => {
  const { url } = await client.billing.portal();

  return url;
});
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
  const startBillingCheckout = useAction(startBillingCheckoutAction);
  const openBillingPortal = useAction(openBillingPortalAction);
  const checkoutSubmission = useSubmission(startBillingCheckoutAction);
  const portalSubmission = useSubmission(openBillingPortalAction);
  const [refreshKey, setRefreshKey] = createSignal(0);

  const [subscription] = createResource(refreshKey, () => {
    return client.billing.subscription();
  });
  const [usage] = createResource(refreshKey, () => {
    return client.billing.usage();
  });
  const loading = createMemo(() => {
    return (
      checkoutSubmission.pending ||
      portalSubmission.pending ||
      subscription.loading ||
      usage.loading
    );
  });
  const loadError = createMemo(() => {
    return subscription.error || usage.error;
  });
  const isPro = () => subscription()?.plan === "pro";
  const daysUntilExpiry = () => {
    const expiresAt = subscription()?.expiresAt;

    if (!expiresAt) return null;

    const diff = new Date(expiresAt).getTime() - Date.now();

    return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
  };

  const handleUpgrade = async () => {
    try {
      window.location.href = await startBillingCheckout();
    } catch {
      notify({ text: "Failed to start checkout", type: "error" });
    }
  };
  const handleManage = async () => {
    try {
      window.location.href = await openBillingPortal();
    } catch {
      notify({ text: "Failed to open billing portal", type: "error" });
    }
  };
  const canManageBilling = () => props.canManageBilling ?? false;
  const retryLoad = () => {
    setRefreshKey((current) => current + 1);
  };

  return (
    <div class="flex h-full min-w-0 flex-col gap-3 overflow-x-hidden">
      <SettingsSection label="Subscription">
        <Show
          when={!loading()}
          fallback={
            <div class="flex justify-center py-4">
              <Spinner />
            </div>
          }
        >
          <Show
            when={!loadError() && subscription() && usage()}
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
                  disabled={loading() || !canManageBilling()}
                  onClick={() => {
                    if (canManageBilling()) {
                      void (isPro() ? handleManage() : handleUpgrade());
                    }
                  }}
                >
                  <span class="opacity-50 text-xs font-semibold w-full text-start">
                    {loading()
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
                <Show when={isPro() && subscription()?.expiresAt}>
                  <span class="text-xs text-gray-400 dark:text-gray-500">
                    Current period ends in {daysUntilExpiry()} day
                    {daysUntilExpiry() === 1 ? "" : "s"}.
                  </span>
                </Show>
              </div>
            </Setting>
            <SettingsSection label="API Usage">
              <Show when={usage()}>
                {(usageData) => {
                  const now = new Date();
                  const currentDay = now.getDate();
                  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();

                  return (
                    <>
                      <div class="flex items-end gap-3">
                        <div class="flex flex-col gap-1">
                          <div class="text-xs text-gray-400 dark:text-gray-500">Current usage</div>
                          <div class="flex items-end gap-2">
                            <div class="text-lg font-semibold">
                              {formatNumber(usageData().totalUsage)}
                            </div>
                            <div class="pb-0.5 text-xs text-gray-400 dark:text-gray-500">
                              of {formatNumber(usageData().limit)} limit
                            </div>
                          </div>
                        </div>
                      </div>

                      <div class="mt-1">
                        <UsageChart
                          daily={usageData().dailyUsage}
                          currentDay={currentDay}
                          limit={usageData().limit}
                          daysInMonth={daysInMonth}
                          year={usageData().startDate.getFullYear()}
                          month={usageData().startDate.getMonth() + 1}
                        />
                      </div>

                      <Show when={usageData().totalUsage >= usageData().limit}>
                        <div class="bg-amber-50 dark:bg-amber-900 dark:bg-opacity-20 rounded-lg p-3 text-sm text-amber-600 dark:text-amber-400">
                          <Show
                            when={isPro()}
                            fallback="You've reached the Free plan API limit. Upgrade to Pro for higher limits."
                          >
                            You've exceeded the included 500K requests. Additional usage will be
                            billed at $1 per 50K requests.
                          </Show>
                        </div>
                      </Show>
                    </>
                  );
                }}
              </Show>
            </SettingsSection>
          </Show>
        </Show>
      </SettingsSection>
    </div>
  );
};

export { BillingSettingsTab };
