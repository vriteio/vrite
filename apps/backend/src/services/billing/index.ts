import { createCheckout } from "./create-checkout";
import { createPortal } from "./create-portal";
import { endSubscription } from "./end-subscription";
import { getSubscription } from "./get-subscription";
import { Metering } from "./metering";

const Billing = {
  createCheckout,
  createPortal,
  endSubscription,
  getSubscription,
  Metering
};

export { Billing };
export type { SubscriptionInfo } from "./get-subscription";
