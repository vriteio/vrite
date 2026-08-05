import { type FastifyPluginAsync } from "fastify";
import { handleStripeWebhook } from "./stripe";

const webhooksPlugin: FastifyPluginAsync = async (app) => {
  app.removeContentTypeParser("application/json");
  app.addContentTypeParser("application/json", { parseAs: "buffer" }, (_request, body, done) => {
    done(null, body);
  });
  app.post<{ Body: Buffer }>("/webhooks/stripe", async (request, reply) => {
    return handleStripeWebhook(request, reply);
  });
};

export { webhooksPlugin };
