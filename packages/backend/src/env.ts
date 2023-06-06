import { z } from "zod";
import zodToJsonSchema from "zod-to-json-schema";

const envSchema = z.object({
  MONGO_URL: z.string(),
  REDIS_URL: z.string(),
  DATABASE: z.string(),
  SECRET: z.string(),
  PORT: z.number(),
  HOST: z.string(),
  SENDGRID_API_KEY: z.string(),
  EMAIL: z.string(),
  SENDER_NAME: z.string(),
  CALLBACK_DOMAIN: z.string(),
  TOP_DOMAIN: z.string(),
  GITHUB_CLIENT_ID: z.string(),
  GITHUB_CLIENT_SECRET: z.string(),
  S3_BUCKET: z.string(),
  S3_ENDPOINT: z.string(),
  S3_REGION: z.string(),
  S3_ACCESS_KEY: z.string(),
  S3_SECRET_KEY: z.string(),
  SENDGRID_EMAIL_VERIFICATION_TEMPLATE_ID: z.string(),
  SENDGRID_MAGIC_LINK_TEMPLATE_ID: z.string(),
  SENDGRID_PASSWORD_CHANGE_VERIFICATION_TEMPLATE_ID: z.string(),
  SENDGRID_WORKSPACE_INVITE_TEMPLATE_ID: z.string(),
  SENDGRID_EMAIL_CHANGE_VERIFICATION_TEMPLATE_ID: z.string()
});

declare module "fastify" {
  interface FastifyInstance {
    config: z.infer<typeof envSchema> & Record<string, string>;
  }
}

export { envSchema };
