import { FastifyPluginAsync } from "fastify";
import { handleStripeWebhook } from "./stripe";

const webhooksPlugin: FastifyPluginAsync = async (app) => {
  app.post("/webhooks/stripe", async (request, reply) => {
    return handleStripeWebhook(request, reply);
  });
};

export { webhooksPlugin };
