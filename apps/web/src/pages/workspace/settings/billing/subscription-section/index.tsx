import { Skeleton } from "@andesine/components";
import { type Component, For, Suspense } from "solid-js";
import { Setting } from "../../setting";
import { SettingsSection } from "../../settings-section";
import { SubscriptionAction } from "./subscription-action";

const SubscriptionSection: Component = () => (
  <SettingsSection label="Subscription">
    <Setting
      label={
        <div class="inline-flex items-center gap-1 font-semibold">
          <div class="inline-flex items-center">
            <div class="h-4.5 w-4.5 i-andesine:logo bg-gradient-to-tr" />
            ndesine
          </div>
          <div class="w-px h-4 rounded-full bg-gray-300" />
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
                <span class="font-semibold text-gray-700">$1 per 50K</span> additional API calls
              </>
            ]}
          >
            {(item) => (
              <div class="flex gap-1.5">
                <span class="i-lucide:check bg-gradient-to-tr h-4 w-4 flex-shrink-0" />
                <span>{item}</span>
              </div>
            )}
          </For>
        </div>
      }
      fade={false}
    >
      <Suspense fallback={<Skeleton class="h-14 w-full max-w-64 rounded-xl" />}>
        <SubscriptionAction />
      </Suspense>
    </Setting>
  </SettingsSection>
);

export { SubscriptionSection };
