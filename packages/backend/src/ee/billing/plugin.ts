import Stripe from "stripe";
import { BillingPlugin } from "fastify";
import { ObjectId } from "mongodb";
import { createPlugin } from "#lib/plugin";
import { getWorkspaceMembershipsCollection, getWorkspacesCollection } from "#collections";
import { updateSessionWorkspace } from "#lib/session";
import { Context } from "#lib/context";
import { errors } from "#lib/errors";

declare module "fastify" {
  interface BillingPlugin {
    usage: {
      log(workspaceId: string, usage: number): Promise<void>;
      clearLog(workspaceId: string): Promise<void>;
      record(workspaceId: string): Promise<void>;
      get(workspaceId: string): Promise<number>;
      getLogs(): Promise<Record<string, number>>;
    };
    checkout(plan: "team" | "personal"): Promise<string>;
    createCustomer(customerData: { email: string; name: string }): Promise<string>;
    startTrial(customerId: string): Promise<Stripe.Subscription>;
    portal(customerId: string): Promise<string>;
    switchPlan(workspaceId: string, plan: "team" | "personal"): Promise<void>;
    canSwitchPlan(workspaceId: string, plan: "team" | "personal"): Promise<boolean>;
    updateSeats(workspaceId: string, diff: number): Promise<void>;
  }
  interface FastifyInstance {
    billing: BillingPlugin;
  }
}

const billingStub = {
  async checkout() {
    return "";
  },
  async createCustomer() {
    return "";
  },
  async startTrial() {
    return {} as Stripe.Subscription;
  },
  async portal() {
    return "";
  },
  async canSwitchPlan() {
    return true;
  },
  async switchPlan() {
    return;
  },
  async updateSeats() {
    return;
  },
  usage: {
    async log() {
      return;
    },
    async clearLog() {
      return;
    },
    async record() {
      return;
    },
    async get() {
      return 0;
    },
    async getLogs() {
      return {};
    }
  }
} as BillingPlugin;
const billingPlugin = createPlugin(async (fastify) => {
  const stripe = new Stripe(fastify.config.STRIPE_SECRET_KEY || "");
  const getPriceId = (plan: "team" | "personal"): string => {
    if (plan === "team") {
      return fastify.config.STRIPE_TEAM_PRICE_ID || "";
    }

    return fastify.config.STRIPE_PERSONAL_PRICE_ID || "";
  };
  const getSubscription = async (subscriptionId: string): Promise<Stripe.Subscription> => {
    return await stripe.subscriptions.retrieve(subscriptionId);
  };
  const enableAccess = async (
    ctx: Context,
    data: {
      customer: string | Stripe.Customer | Stripe.DeletedCustomer;
      subscription: string | Stripe.Subscription;
    }
  ): Promise<void> => {
    const workspacesCollection = getWorkspacesCollection(fastify.mongo.db!);
    const customerId = typeof data.customer === "string" ? data.customer : data.customer.id;
    const workspace = await workspacesCollection.findOne({ customerId });

    let { subscription } = data;

    if (typeof subscription === "string") {
      subscription = await getSubscription(subscription);
    }

    if (!workspace || !subscription) return;

    await workspacesCollection.updateOne(
      { _id: workspace._id },
      {
        $set: {
          subscriptionData: JSON.stringify(subscription),
          subscriptionPlan: subscription.items.data.reduce((plan, item) => {
            return item.price.id === fastify.config.STRIPE_TEAM_PRICE_ID ? "team" : "personal";
          }, "personal"),
          subscriptionStatus: subscription.status,
          subscriptionExpiresAt: new Date(subscription.current_period_end * 1000).toISOString()
        }
      }
    );
    updateSessionWorkspace(ctx, `${workspace._id}`);
  };
  const revokeAccess = async (
    ctx: Context,
    data: { customer: string | Stripe.Customer | Stripe.DeletedCustomer }
  ): Promise<void> => {
    const workspacesCollection = getWorkspacesCollection(fastify.mongo.db!);
    const customerId = typeof data.customer === "string" ? data.customer : data.customer.id;
    const workspace = await workspacesCollection.findOne({ customerId });

    if (!workspace) return;

    await workspacesCollection.updateOne(
      { _id: workspace._id },
      {
        $set: {
          subscriptionStatus: "canceled",
          subscriptionExpiresAt: new Date().toISOString()
        },
        $unset: {
          subscriptionData: true,
          subscriptionPlan: true
        }
      }
    );
    updateSessionWorkspace(ctx, `${workspace._id}`);
  };

  if (!fastify.hostConfig.billing) {
    fastify.decorate("billing", billingStub);

    return;
  }

  fastify.decorate("billing", {
    async checkout(plan) {
      const session = await stripe.checkout.sessions.create({
        line_items: [
          {
            price: getPriceId(plan),
            quantity: 1
          },
          { price: fastify.config.STRIPE_API_PRICE_ID || "" }
        ],
        mode: "subscription",
        customer: "cus_PWdbDx6fOqCYlo",
        customer_update: { address: "auto", name: "auto", shipping: "auto" },
        success_url: `${fastify.config.PUBLIC_APP_URL}?success=true`,
        cancel_url: `${fastify.config.PUBLIC_APP_URL}?canceled=true`,
        automatic_tax: { enabled: true }
      });

      return session.url;
    },
    async createCustomer(customerData) {
      const customer = await stripe.customers.create(customerData);

      return customer.id;
    },
    async startTrial(customerId) {
      return await stripe.subscriptions.create({
        customer: customerId,
        trial_period_days: 30,
        trial_settings: { end_behavior: { missing_payment_method: "cancel" } },
        items: [
          { price: fastify.config.STRIPE_PERSONAL_PRICE_ID || "", quantity: 1 },
          { price: fastify.config.STRIPE_API_PRICE_ID || "" }
        ]
      });
    },
    async portal(workspaceId) {
      const workspacesCollection = getWorkspacesCollection(fastify.mongo.db!);
      const workspace = await workspacesCollection.findOne({ _id: new ObjectId(workspaceId) });

      if (!workspace || !workspace.customerId) return null;

      const session = await stripe.billingPortal.sessions.create({
        customer: workspace?.customerId,
        return_url: fastify.config.PUBLIC_APP_URL
      });

      return session.url;
    },
    async canSwitchPlan(workspaceId, plan) {
      const workspaceMembershipsCollection = getWorkspaceMembershipsCollection(fastify.mongo.db!);
      const membershipsCount = await workspaceMembershipsCollection.countDocuments({
        workspaceId: new ObjectId(workspaceId)
      });

      if (plan === "personal" && membershipsCount > 1) {
        return false;
      }

      return true;
    },
    async switchPlan(workspaceId, plan) {
      const workspacesCollection = getWorkspacesCollection(fastify.mongo.db!);
      const workspaceMembershipsCollection = getWorkspaceMembershipsCollection(fastify.mongo.db!);
      const workspace = await workspacesCollection.findOne({ _id: new ObjectId(workspaceId) });

      if (!workspace || !workspace.subscriptionData || !workspace.subscriptionPlan) {
        throw errors.serverError();
      }

      const subscription = JSON.parse(workspace.subscriptionData) as Stripe.Subscription;
      const subscriptionItem = subscription.items.data.find((item) => {
        return item.price.id !== fastify.config.STRIPE_API_PRICE_ID;
      });

      if (!subscriptionItem) {
        throw errors.serverError();
      }

      if (plan === workspace.subscriptionPlan) {
        return;
      }

      const membershipsCount = await workspaceMembershipsCollection.countDocuments({
        workspaceId: workspace._id
      });

      if (plan === "personal" && membershipsCount > 1) {
        throw errors.badRequest("notAllowed");
      }

      const updatedSubscription = await stripe.subscriptions.update(subscription.id, {
        items: [{ id: subscriptionItem.id, price: getPriceId(plan), quantity: 1 }]
      });

      await workspacesCollection.updateOne(
        { _id: workspace._id },
        {
          $set: {
            subscriptionData: JSON.stringify(updatedSubscription),
            subscriptionPlan: plan
          }
        }
      );
    },
    async updateSeats(workspaceId: string, diff: number) {
      const workspacesCollection = getWorkspacesCollection(fastify.mongo.db!);
      const workspace = await workspacesCollection.findOne({ _id: new ObjectId(workspaceId) });

      if (!workspace || !workspace.subscriptionData || !workspace.subscriptionPlan) {
        throw errors.serverError();
      }

      const subscription = JSON.parse(workspace.subscriptionData) as Stripe.Subscription;
      const plan = workspace.subscriptionPlan as "team" | "personal";

      if (plan === "personal") {
        throw errors.badRequest("notAllowed");
      }

      const subscriptionItem = subscription.items.data.find((item) => {
        return item.price.id === fastify.config.STRIPE_TEAM_PRICE_ID;
      });

      if (!subscriptionItem) {
        throw errors.serverError();
      }

      const updatedSubscription = await stripe.subscriptions.update(subscription.id, {
        items: [
          {
            id: subscriptionItem.id,
            quantity: (subscriptionItem.quantity || 1) + diff
          }
        ]
      });

      await workspacesCollection.updateOne(
        { _id: workspace._id },
        {
          $set: {
            subscriptionData: JSON.stringify(updatedSubscription)
          }
        }
      );
    },
    usage: {
      async log(workspaceId, usage) {
        await fastify.redis.hincrby(`usage`, workspaceId, usage);
      },
      async clearLog(workspaceId) {
        await fastify.redis.hdel(`usage`, workspaceId);
      },
      async record(workspaceId) {
        const workspacesCollection = getWorkspacesCollection(fastify.mongo.db!);
        const workspace = await workspacesCollection.findOne({ _id: new ObjectId(workspaceId) });
        const loggedUsage = parseInt((await fastify.redis.hget("usage", workspaceId)) || "0");

        if (loggedUsage && !isNaN(loggedUsage)) {
          await fastify.redis.hdel("usage", workspaceId);
        }

        if (!workspace) return;

        const subscription = JSON.parse(workspace.subscriptionData || "{}") as Stripe.Subscription;
        const subscriptionAPIUsageItem = subscription.items.data.find((item) => {
          return item.price.id === fastify.config.STRIPE_API_PRICE_ID;
        });

        if (subscriptionAPIUsageItem) {
          await stripe.subscriptionItems.createUsageRecord(subscriptionAPIUsageItem.id, {
            quantity: loggedUsage,
            action: "increment"
          });
        }
      },
      async get(workspaceId) {
        const workspacesCollection = getWorkspacesCollection(fastify.mongo.db!);
        const workspace = await workspacesCollection.findOne({ _id: new ObjectId(workspaceId) });
        const loggedUsage = parseInt((await fastify.redis.hget("usage", workspaceId)) || "0");

        let usage = 0;

        if (!workspace) return usage;

        if (loggedUsage && !isNaN(loggedUsage)) {
          usage += loggedUsage;
        }

        const subscription = JSON.parse(workspace.subscriptionData || "{}") as Stripe.Subscription;
        const subscriptionAPIUsageItem = subscription.items.data.find((item) => {
          return item.price.id === fastify.config.STRIPE_API_PRICE_ID;
        });

        if (subscriptionAPIUsageItem) {
          const usageRecordSummaries = await stripe.subscriptionItems.listUsageRecordSummaries(
            subscriptionAPIUsageItem.id,
            {
              limit: 1
            }
          );

          if (usageRecordSummaries.data.length > 0) {
            usage += usageRecordSummaries.data[0].total_usage;
          }
        }

        return usage;
      },
      async getLogs() {
        const hash = await fastify.redis.hgetall("usage");

        return Object.fromEntries(
          Object.entries(hash).map(([key, value]) => [key, parseInt(value)])
        );
      }
    }
  } as BillingPlugin);
  fastify.addContentTypeParser(
    "application/json",
    { parseAs: "buffer" },
    function (_req, body, done) {
      try {
        done(null, body);
      } catch (error) {
        done(error as Error | null, undefined);
      }
    }
  );
  fastify.get("/billing/webhook", async (req, res) => {
    const signature = req.headers["stripe-signature"] || "";
    const ctx: Context = {
      db: fastify.mongo.db!,
      fastify,
      req,
      res
    };

    let event: Stripe.Event | null = null;

    try {
      event = stripe.webhooks.constructEvent(
        req.body as string,
        signature,
        fastify.config.STRIPE_WEBHOOK_SECRET || ""
      );
    } catch (error) {
      const message = "Webhook signature verification failed.";

      fastify.log.error(message, error);

      return res.status(400).send(message);
    }

    switch (event.type) {
      case "checkout.session.completed":
      case "invoice.paid":
        if (event.data.object.customer && event.data.object.subscription) {
          enableAccess(ctx, {
            customer: event.data.object.customer,
            subscription: event.data.object.subscription
          });
        }

        break;
      case "customer.subscription.deleted":
        revokeAccess(ctx, { customer: event.data.object.customer });
        break;
      default:
        break;
    }
  });
  fastify.routeCallbacks.register(
    ["workspaceMemberships.delete", "workspaceMemberships.leave"],
    (ctx) => {
      fastify.billing.updateSeats(`${ctx.auth.workspaceId}`, -1);
    }
  );
  fastify.routeCallbacks.register("workspaceMemberships.sendInvite", (ctx) => {
    fastify.billing.updateSeats(`${ctx.auth.workspaceId}`, 1);
  });
});

export { billingPlugin };
