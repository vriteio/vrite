import * as z from "zod";

const url = z.preprocess((value) => {
  if (typeof value !== "string") return value;

  return value.replace(/\/+$/, "");
}, z.url());
const cookieDomain = z.preprocess(
  (value) => {
    if (typeof value !== "string") return value;

    return value.trim().toLowerCase().replace(/^\.+/, "") || undefined;
  },
  z
    .string()
    .regex(
      /^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?)(?:\.(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?))*$/
    )
    .optional()
);
const secret = z.string().trim().min(32, "SECRET must contain at least 32 characters");
const configSchema = z.object({
  NODE_ENV: z.string().optional().describe("Node environment"),
  // Hosts
  PUBLIC_API_HOST: z.string().describe("Public host of the API"),
  PUBLIC_APP_HOST: z.string().describe("Public host of the app"),
  PUBLIC_COOKIE_DOMAIN: cookieDomain.describe(
    "Domain to set for cookies in cross-subdomain setups"
  ),
  PUBLIC_SECURE: z
    .stringbool()
    .optional()
    .describe("Whether to use secure connections for public URLs"),
  // Secrets
  SECRET: secret.describe("Secret for signing tokens and encrypting data"),
  // Database
  DATABASE_URL: z.string().describe("PostgreSQL connection URL"),
  QUEUE_REDIS_URL: z.string().describe("Background job Redis connection URL"),
  REDIS_URL: z.string().describe("Redis connection URL"),
  // Search
  TYPESENSE_URL: url.describe("Typesense API URL"),
  TYPESENSE_API_KEY: z.string().min(1).describe("Typesense API key"),
  OPENAI_API_KEY: z.string().min(1).describe("OpenAI-compatible API key"),
  OPENAI_BASE_URL: url
    .default("https://api.openai.com/v1")
    .describe("OpenAI-compatible API base URL"),
  SEARCH_EMBEDDING_MODEL: z
    .string()
    .min(1)
    .default("text-embedding-3-small")
    .describe("OpenAI-compatible embedding model"),
  SEARCH_EMBEDDING_DIMENSIONS: z.coerce
    .number()
    .int()
    .min(1)
    .default(1536)
    .describe("Number of dimensions returned by the embedding model"),
  SEARCH_ASK_MODEL: z
    .string()
    .min(1)
    .default("gpt-5.6-luna")
    .describe("OpenAI-compatible model used by Ask AI"),
  SEARCH_ASK_REASONING_EFFORT: z
    .enum(["none", "minimal", "low", "medium", "high", "xhigh", "max"])
    .default("none")
    .describe("Reasoning effort used by Ask AI"),
  // Email
  SENDER_EMAIL: z.string().describe("Email address to send emails from"),
  SENDER_NAME: z.string().describe("Name to send emails from"),
  // UserCheck
  USER_CHECK: z
    .union([z.stringbool(), z.string()])
    .optional()
    .describe("UserCheck configuration (`true` or API key to enable)"),
  // Resend
  RESEND_API_KEY: z.string().optional().describe("Resend API key"),
  // SMTP
  SMTP_HOST: z.string().optional().describe("SMTP host for sending emails"),
  SMTP_PORT: z.coerce.number().optional().describe("SMTP port for sending emails"),
  SMTP_USERNAME: z.string().optional().describe("SMTP username for sending emails"),
  SMTP_PASSWORD: z.string().optional().describe("SMTP password for sending emails"),
  SMTP_SECURE: z.stringbool().optional().describe("Use secure connection for SMTP"),
  // Google OAuth
  GOOGLE_CLIENT_ID: z.string().min(1).describe("Google OAuth client ID"),
  GOOGLE_CLIENT_SECRET: z.string().min(1).describe("Google OAuth client secret"),
  // GitHub App
  GITHUB_CLIENT_ID: z.string().min(1).describe("GitHub OAuth client ID"),
  GITHUB_CLIENT_SECRET: z.string().min(1).describe("GitHub OAuth client secret"),
  // Passkeys (WebAuthn)
  PASSKEY_RP_ID: z.string().optional().describe("WebAuthn Relying Party ID"),
  PASSKEY_ORIGIN: z.string().optional().describe("WebAuthn expected origin"),
  // Stripe & billing
  INCLUDED_API_CALLS: z.coerce
    .number()
    .int()
    .min(0)
    .describe("Number of API calls included in the Free plan"),
  PRO_INCLUDED_API_CALLS: z.coerce
    .number()
    .int()
    .min(0)
    .describe("Number of API calls included in the Pro plan"),
  VERSION_RETENTION_DAYS: z.coerce
    .number()
    .int()
    .min(1)
    .default(7)
    .describe("Number of days to keep automatic versions by default"),
  PRO_VERSION_RETENTION_DAYS: z.coerce
    .number()
    .int()
    .min(1)
    .default(30)
    .describe("Number of days to keep automatic versions on the Pro plan"),
  STRIPE_SECRET_KEY: z.string().optional().describe("Stripe secret API key"),
  STRIPE_WEBHOOK_SECRET: z.string().optional().describe("Stripe webhook signing secret"),
  STRIPE_PRO_SEAT_PRICE_ID: z
    .string()
    .optional()
    .describe("Stripe Price ID for Pro per-seat charge"),
  STRIPE_PRO_API_CALL_PRICE_ID: z
    .string()
    .optional()
    .describe("Stripe Price ID for tiered Pro API call metering"),
  STRIPE_PRO_API_CALL_METER_EVENT_NAME: z
    .string()
    .optional()
    .describe("Stripe Meter event name for tracking API usage")
});

export { configSchema };
