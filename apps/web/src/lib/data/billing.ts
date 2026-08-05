import { query } from "@solidjs/router";
import { client } from "#web/lib/api";

const subscriptionQuery = query(() => client.billing.subscription(), "billing-subscription");
const usageQuery = query(() => client.billing.usage(), "billing-usage");

export { subscriptionQuery, usageQuery };
