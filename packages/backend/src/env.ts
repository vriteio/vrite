import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z.string(),
  SECRET: z.string(),
  PORT: z.number().optional(),
  HOST: z.string().optional(),
  VRITE_CLOUD: z.boolean().optional(),
  COOKIE_DOMAIN: z.string().optional(),
  // MongoDB (Database)
  MONGO_URL: z.string(),
  // Redis (Cache)
  REDIS_URL: z.string(),
  // GitHub OAuth (Authentication)
  GITHUB_CLIENT_ID: z.string().optional(),
  GITHUB_CLIENT_SECRET: z.string().optional(),
  // S3 (Assets storage)
  S3_BUCKET: z.string(),
  S3_ENDPOINT: z.string(),
  S3_REGION: z.string(),
  S3_ACCESS_KEY: z.string(),
  S3_SECRET_KEY: z.string(),
  S3_FORCE_PATH_STYLE: z.boolean().optional(),
  // Email
  SENDER_EMAIL: z.string(),
  SENDER_NAME: z.string(),
  BLOCK_DISPOSABLE_EMAILS: z.boolean().optional(),
  // SMTP (Email)
  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.number().optional(),
  SMTP_USERNAME: z.string().optional(),
  SMTP_PASSWORD: z.string().optional(),
  SMTP_SECURE: z.boolean().optional(),
  // Resend (Email)
  RESEND_API_KEY: z.string().optional(),
  RESEND_AUDIENCE_ID: z.string().optional(),
  // GitHub App (Git sync)
  GITHUB_APP_ID: z.string().optional(),
  GITHUB_APP_PRIVATE_KEY: z.string().optional(),
  GITHUB_APP_CLIENT_ID: z.string().optional(),
  GITHUB_APP_CLIENT_SECRET: z.string().optional(),
  // OpenAI (Q&A search)
  OPENAI_API_KEY: z.string().optional(),
  OPENAI_ORGANIZATION: z.string().optional(),
  // Weaviate (Search)
  WEAVIATE_API_KEY: z.string().optional(),
  WEAVIATE_URL: z.string().optional(),
  // Stripe (Billing)
  STRIPE_SECRET_KEY: z.string().optional(),
  STRIPE_TEAM_PRICE_ID: z.string().optional(),
  STRIPE_PERSONAL_PRICE_ID: z.string().optional(),
  STRIPE_API_PRICE_ID: z.string().optional(),
  STRIPE_WEBHOOK_SECRET: z.string().optional(),
  STRIPE_PERSONAL_API_COUPON_ID: z.string().optional(),
  STRIPE_TEAM_API_COUPON_ID: z.string().optional(),
  // Frontend
  PUBLIC_API_URL: z.string(),
  PUBLIC_COLLAB_URL: z.string(),
  PUBLIC_APP_URL: z.string(),
  PUBLIC_ASSETS_URL: z.string(),
  PUBLIC_POSTHOG_TOKEN: z.string().optional(),
  PUBLIC_DISABLE_ANALYTICS: z.boolean().optional().default(false)
});

declare module "fastify" {
  interface FastifyInstance {
    config: z.infer<typeof envSchema> & Record<string, string>;
  }
}

export { envSchema };
