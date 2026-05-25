import { createCheckout } from "./create-checkout";
import { createPortal } from "./create-portal";
import { getSubscription } from "./get-subscription";
import { Metering } from "./metering";

const Billing = {
  createCheckout,
  createPortal,
  getSubscription,
  Metering
};

export { Billing };
export type { SubscriptionInfo } from "./get-subscription";
