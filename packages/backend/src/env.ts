import { optional, z } from "zod";

const envSchema = z.object({
  SECRET: z.string(),
  PORT: z.number(),
  HOST: z.string(),
  CALLBACK_DOMAIN: z.string(),
  TOP_DOMAIN: z.string(),
  VRITE_CLOUD: z.boolean().optional(),
  // MongoDB (Database)
  MONGO_URL: z.string(),
  DATABASE: z.string(),
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
  // Email
  SENDER_EMAIL: z.string(),
  SENDER_NAME: z.string(),
  // SMTP (Email)
  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.number().optional(),
  SMTP_USERNAME: z.string().optional(),
  SMTP_PASSWORD: z.string().optional(),
  SMTP_SECURE: z.boolean().optional(),
  // SendGrid (Email)
  SENDGRID_API_KEY: z.string().optional(),
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
  // Frontend
  PUBLIC_API_HOST: z.string(),
  PUBLIC_COLLAB_HOST: z.string(),
  PUBLIC_APP_HOST: z.string(),
  PUBLIC_ASSETS_HOST: z.string(),
  PUBLIC_APP_TYPE: z.string()
});

declare module "fastify" {
  interface FastifyInstance {
    config: z.infer<typeof envSchema> & Record<string, string>;
  }
}

export { envSchema };
