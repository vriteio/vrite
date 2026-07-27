import { Skeleton, Tooltip } from "@andesine/components";
import { createAsync, query } from "@solidjs/router";
import { Component, Show, Suspense } from "solid-js";
import { client } from "#web/lib/client";
import { Setting } from "../../../setting";
import { SettingsSection } from "../../../settings-section";
import { UsageChart } from "./usage-chart";
import { formatNumber } from "#web/lib/format";

const subscriptionQuery = query(() => client.billing.subscription(), "billing-subscription");
const usageQuery = query(() => client.billing.usage(), "billing-usage");

const UsageSection: Component = () => {
  const usage = createAsync(() => usageQuery());
  const subscription = createAsync(() => subscriptionQuery());
  const now = new Date();
  const currentDay = now.getDate();
  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
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
                description="Requests made during the current billing period"
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
                  currentDay={currentDay}
                  limit={usageData().limit}
                  daysInMonth={daysInMonth}
                  year={usageData().startDate.getFullYear()}
                  month={usageData().startDate.getMonth() + 1}
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
