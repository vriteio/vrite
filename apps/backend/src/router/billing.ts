import { authorized } from "#backend/lib/middleware";
import { base } from "#backend/lib/orpc";
import { Billing } from "#backend/services/billing";
import { config } from "#backend/lib/config";
import * as z from "zod";

const billingUrlType = z.object({
  url: z.string().url().describe("Billing URL to redirect the user to")
});
const subscriptionInfoType = z.object({
  plan: z.string().describe("Current billing plan identifier"),
  status: z.string().describe("Current billing subscription status"),
  seats: z.number().int().min(0).describe("Number of billable seats in the workspace"),
  expiresAt: z.iso.datetime().nullable().describe("End of the current billing period"),
  customerID: z.string().nullable().describe("Stripe customer ID for the workspace")
});
const billingUsageType = z.object({
  dailyUsage: z.array(
    z.object({
      day: z.number().int().min(1).max(31).describe("Day of the month"),
      count: z.number().int().min(0).describe("Number of API requests on that day")
    })
  ),
  totalUsage: z.number().int().min(0).describe("Total API requests in the current billing period"),
  startDate: z.date().describe("Start of the billing usage window"),
  endDate: z.date().describe("End of the billing usage window"),
  limit: z.number().int().min(0).describe("Included API request limit for the current plan")
});

const billingRouter = base.router({
  subscription: base
    .meta({
      required: {
        session: ["read:billing"]
      }
    })
    .use(authorized)
    .output(subscriptionInfoType)
    .handler(async ({ context }) => {
      return Billing.getSubscription({
        workspaceID: context.auth.workspaceID
      });
    }),
  usage: base
    .meta({
      required: {
        session: ["read:billing"]
      }
    })
    .use(authorized)
    .output(billingUsageType)
    .handler(async ({ context }) => {
      const subscription = await Billing.getSubscription({
        workspaceID: context.auth.workspaceID
      });

      return Billing.Metering.getUsage({
        workspaceID: context.auth.workspaceID,
        plan: subscription.plan
      });
    }),
  checkout: base
    .meta({
      required: {
        session: ["billing"]
      }
    })
    .use(authorized)
    .output(billingUrlType)
    .handler(async ({ context }) => {
      return Billing.createCheckout({
        workspaceID: context.auth.workspaceID,
        successURL: `${config.PUBLIC_APP_URL}/${context.auth.workspaceID}/?settings=billing&billing=success`,
        cancelURL: `${config.PUBLIC_APP_URL}/${context.auth.workspaceID}/?settings=billing&billing=cancel`
      });
    }),
  portal: base
    .meta({
      required: {
        session: ["billing"]
      }
    })
    .use(authorized)
    .output(billingUrlType)
    .handler(async ({ context }) => {
      return Billing.createPortal({
        workspaceID: context.auth.workspaceID,
        returnURL: `${config.PUBLIC_APP_URL}/${context.auth.workspaceID}/?settings=billing&billing=portal`
      });
    })
});

export { billingRouter };
