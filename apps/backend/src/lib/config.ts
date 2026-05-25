import { Static, t } from "elysia";

const configSchema = t.Object(
  {
    // Secrets
    COOKIE_SECRET: t.String({ description: "Secret for signing cookies" }),
    // Database
    MONGO_URL: t.String({ description: "MongoDB connection URL" }),
    REDIS_URL: t.String({ description: "Redis connection URL" }),
    // Email
    SENDER_EMAIL: t.String({ description: "Email address to send emails from" }),
    SENDER_NAME: t.String({ description: "Name to send emails from" }),
    // UserCheck
    USER_CHECK: t.Optional(
      t.Union([t.Boolean(), t.String()], {
        description: "UserCheck configuration (`true` or API key to enable)"
      })
    ),
    // Resend
    RESEND_API_KEY: t.Optional(t.String({ description: "Resend API key" })),
    RESEND_AUDIENCE_ID: t.Optional(t.String({ description: "Resend audience ID for newsletter" })),
    // SMTP
    SMTP_HOST: t.Optional(t.String({ description: "SMTP host for sending emails" })),
    SMTP_PORT: t.Optional(t.Number({ description: "SMTP port for sending emails" })),
    SMTP_USERNAME: t.Optional(t.String({ description: "SMTP username for sending emails" })),
    SMTP_PASSWORD: t.Optional(t.String({ description: "SMTP password for sending emails" })),
    SMTP_SECURE: t.Optional(t.Boolean({ description: "Use secure connection for SMTP" })),
    // Google OAuth
    GOOGLE_CLIENT_ID: t.Optional(t.String({ description: "Google OAuth client ID" })),
    GOOGLE_CLIENT_SECRET: t.Optional(t.String({ description: "Google OAuth client secret" })),
    // GitHub App
    GITHUB_CLIENT_ID: t.Optional(t.String({ description: "GitHub OAuth client ID" })),
    GITHUB_CLIENT_SECRET: t.Optional(t.String({ description: "GitHub OAuth client secret" }))
  },
  { additionalProperties: true }
);
const config = { ...process.env } as unknown as Static<typeof configSchema>;

export { config };
