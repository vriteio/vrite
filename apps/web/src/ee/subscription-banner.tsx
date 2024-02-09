import { mdiAlertCircle } from "@mdi/js";
import { Icon } from "@vrite/components";
import { Component } from "solid-js";

const SubscriptionBanner: Component = () => {
  return (
    <div class="h-8 bg-gradient-to-tr w-full flex justify-center items-center px-1 text-white z-30">
      <Icon path={mdiAlertCircle} class="h-6 w-6" />
      <span class="pl-1 pr-2">Your subscription has expired.</span>
      <button class="underline">Renew</button>
    </div>
  );
};

export { SubscriptionBanner };
