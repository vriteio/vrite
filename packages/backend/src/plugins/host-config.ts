import { publicPlugin } from "../lib/plugin";
import { z } from "zod";

const hostConfig = z.object({
  githubOAuth: z.boolean(),
  githubApp: z.boolean(),
  sendgrid: z.boolean(),
  smtp: z.boolean(),
  search: z.boolean(),
  aiSearch: z.boolean(),
  extensions: z.boolean()
});

interface HostConfig extends z.infer<typeof hostConfig> {}

declare module "fastify" {
  interface FastifyInstance {
    hostConfig: HostConfig;
  }
}

const hostConfigPlugin = publicPlugin(async (fastify) => {
  const hostConfig: HostConfig = {
    githubOAuth: Boolean(fastify.config.GITHUB_CLIENT_ID && fastify.config.GITHUB_CLIENT_SECRET),
    githubApp: Boolean(
      fastify.config.GITHUB_APP_ID &&
        fastify.config.GITHUB_APP_PRIVATE_KEY &&
        fastify.config.GITHUB_APP_CLIENT_ID &&
        fastify.config.GITHUB_APP_CLIENT_SECRET
    ),
    sendgrid: Boolean(fastify.config.SENDGRID_API_KEY),
    smtp: Boolean(
      fastify.config.SMTP_HOST &&
        fastify.config.SMTP_PORT &&
        fastify.config.SMTP_USERNAME &&
        fastify.config.SMTP_PASSWORD
    ),
    search: Boolean(fastify.config.WEAVIATE_API_KEY && fastify.config.WEAVIATE_URL),
    aiSearch: Boolean(
      fastify.config.OPENAI_API_KEY &&
        fastify.config.OPENAI_ORGANIZATION &&
        fastify.config.WEAVIATE_API_KEY &&
        fastify.config.WEAVIATE_URL
    ),
    // Disable when self-hosting, until extension platform is ready
    extensions: Boolean(fastify.config.VRITE_CLOUD || false)
  };

  fastify.decorate("hostConfig", hostConfig);
});

export { hostConfigPlugin, hostConfig };
export type { HostConfig };
