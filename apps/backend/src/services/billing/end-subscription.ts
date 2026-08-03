import { endStripeSubscription } from "#backend/lib/adapters";

const endSubscription = async (input: {
  idempotencyKey: string;
  subscriptionID: string;
}): Promise<void> => {
  await endStripeSubscription(input);
};

export { endSubscription };
