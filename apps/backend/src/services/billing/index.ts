import { createCheckout } from "./create-checkout";
import { createPortal } from "./create-portal";
import { endSubscription } from "./end-subscription";
import { getSubscription } from "./get-subscription";
import { Metering } from "./metering";
import { updateSeats } from "./update-seats";

const Billing = {
  createCheckout,
  createPortal,
  endSubscription,
  getSubscription,
  updateSeats,
  Metering
};

export { Billing };
export type { SubscriptionInfo } from "./get-subscription";
