import * as z from "zod";

const configSchema = z.object({
  NODE_ENV: z.string().optional().describe("Node environment"),
  // Hosts
  PUBLIC_API_HOST: z.string().describe("Public host of the API"),
  PUBLIC_APP_HOST: z.string().describe("Public host of the app"),
  PUBLIC_COOKIE_DOMAIN: z.string().optional().describe("Domain to set for cookies in cross-subdomain setups"),
  PUBLIC_SECURE: z
    .stringbool()
    .optional()
    .describe("Whether to use secure connections for public URLs"),
  // Secrets
  SECRET: z.string().describe("Secret for signing tokens and encrypting data"),
  // Database
  MONGO_URL: z.string().describe("MongoDB connection URL"),
  REDIS_URL: z.string().describe("Redis connection URL"),
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
  GOOGLE_CLIENT_ID: z.string().optional().describe("Google OAuth client ID"),
  GOOGLE_CLIENT_SECRET: z.string().optional().describe("Google OAuth client secret"),
  // GitHub App
  GITHUB_CLIENT_ID: z.string().optional().describe("GitHub OAuth client ID"),
  GITHUB_CLIENT_SECRET: z.string().optional().describe("GitHub OAuth client secret"),
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
  STRIPE_SECRET_KEY: z.string().optional().describe("Stripe secret API key"),
  STRIPE_WEBHOOK_SECRET: z.string().optional().describe("Stripe webhook signing secret"),
  STRIPE_PRO_SEAT_PRICE_ID: z
    .string()
    .optional()
    .describe("Stripe Price ID for Pro per-seat charge"),
  STRIPE_PRO_API_CALL_PRICE_ID: z
    .string()
    .optional()
    .describe("Stripe Price ID for Pro extra API calls metered charge"),
  STRIPE_PRO_API_CALL_METER_EVENT_NAME: z
    .string()
    .optional()
    .describe("Stripe Meter event name for tracking API usage"),
  STRIPE_PRO_API_CALL_METER_MAX_REPORTING_INTERVAL: z.coerce
    .number()
    .int()
    .min(1)
    .describe("Maximum reporting interval in seconds for Stripe API calls meter events")
});
const baseConfig = configSchema.parse({ ...process.env });
const HTTP_PROTOCOL = baseConfig.PUBLIC_SECURE ? "https" : "http";
const config = {
  ...baseConfig,
  PUBLIC_API_URL: `${HTTP_PROTOCOL}://${baseConfig.PUBLIC_API_HOST}`,
  PUBLIC_APP_URL: `${HTTP_PROTOCOL}://${baseConfig.PUBLIC_APP_HOST}`
};

export { config };
