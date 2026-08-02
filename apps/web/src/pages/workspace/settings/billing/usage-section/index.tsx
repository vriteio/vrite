import { Skeleton, Tooltip } from "@andesine/components";
import { createAsync, query } from "@solidjs/router";
import { Component, Show, Suspense } from "solid-js";
import { client } from "#web/lib/client";
import { Setting } from "../../setting";
import { SettingsSection } from "../../settings-section";
import { UsageChart } from "./usage-chart";
import { formatNumber } from "#web/lib/format";

const subscriptionQuery = query(() => client.billing.subscription(), "billing-subscription");
const usageQuery = query(() => client.billing.usage(), "billing-usage");
const formatUTCDate = (date: Date): string => {
  return new Intl.DateTimeFormat("en-US", {
    day: "numeric",
    month: "short",
    timeZone: "UTC",
    year: "numeric"
  }).format(date);
};

const UsageSection: Component = () => {
  const usage = createAsync(() => usageQuery());
  const subscription = createAsync(() => subscriptionQuery());
  const isPro = () => subscription.latest?.plan === "pro";
  const limitExceeded = () => !isPro() && (usage()?.totalUsage || 0) >= (usage()?.limit || 0);

  return (
    <SettingsSection label="API Usage">
      <Suspense
        fallback={
          <>
            <Setting
              label="Monthly API calls"
              description="Requests made during the current billing period"
              fade={false}
            >
              <Skeleton class="h-4 w-24 rounded-md" />
            </Setting>
            <Skeleton class="h-44 w-full rounded-xl" />
          </>
        }
      >
        <Show when={usage()}>
          {(usageData) => (
            <>
              <Setting
                label="Monthly API calls"
                description={`Requests made this UTC month. Allowance resets ${formatUTCDate(
                  usageData().resetDate
                )} at 00:00 UTC`}
                fade={false}
              >
                <div class="flex items-end gap-0.5">
                  <Tooltip
                    content={
                      <div class="max-w-48 leading-tight whitespace-pre-wrap">
                        {limitExceeded()
                          ? "You've reached the Free plan API limit. Upgrade to Andesine Pro to continue using the API."
                          : formatNumber(usageData().totalUsage)}
                      </div>
                    }
                  >
                    <div class="flex gap-1">
                      <Show when={limitExceeded()}>
                        <div class="i-lucide:triangle-alert h-4 w-4 bg-gradient-to-tr" />
                      </Show>
                      <span class="text-base font-medium leading-none cursor-pointer">
                        {formatNumber(usageData().totalUsage, { compact: true })}
                      </span>
                    </div>
                  </Tooltip>
                  <Show when={!isPro()}>
                    <span class="text-xs text-gray-400 dark:text-gray-500 leading-none">
                      <span class="opacity-50">/</span>{" "}
                      {formatNumber(usageData().limit, { compact: true })} limit
                    </span>
                  </Show>
                </div>
              </Setting>
              <div class="flex flex-col gap-4">
                <UsageChart
                  daily={usageData().dailyUsage}
                  currentDay={usageData().endDate.getUTCDate()}
                  limit={usageData().limit}
                  daysInMonth={new Date(usageData().resetDate.getTime() - 1).getUTCDate()}
                  year={usageData().startDate.getUTCFullYear()}
                  month={usageData().startDate.getUTCMonth() + 1}
                />
              </div>
            </>
          )}
        </Show>
      </Suspense>
    </SettingsSection>
  );
};

export { UsageSection };
