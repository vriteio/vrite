import { betterAuth } from "better-auth";
import { drizzleAdapter } from "@better-auth/drizzle-adapter";
import { emailOTP, multiSession } from "better-auth/plugins";
import { passkey } from "@better-auth/passkey";
import { schema } from "#backend/db";
import { toUUID, toWorkspaceID } from "#backend/lib/id";
import { db } from "#backend/lib/postgres";
import { config } from "./config";
import { sendEmail } from "./email";
import { Workspaces } from "#backend/services";
import { incrementWithExpiry, redis } from "./redis";
import { Auth } from "#backend/services/auth";
import { add } from "date-fns";
import { APIError } from "better-auth/api";
import { RATE_LIMITS } from "./rate-limit";

const OTP_EXPIRY_SECONDS = 300;

const auth = betterAuth({
  appName: "Andesine",
  baseURL: config.PUBLIC_API_URL,
  secret: config.SECRET,
  basePath: "/auth",
  disabledPaths: [
    // Email + password (authentication is entirely passwordless, so these are unsupported)
    "/sign-up/email",
    "/sign-in/email",
    "/request-password-reset",
    "/reset-password/:token",
    "/reset-password",
    "/email-otp/request-password-reset",
    "/forget-password/email-otp",
    "/email-otp/reset-password",
    // Password management (to be implemented in the future)
    "/verify-password",
    "/change-password",
    // Account email changes (to be implemented in the future)
    "/change-email",
    "/email-otp/request-email-change",
    "/email-otp/change-email"
  ],
  logger: { level: config.NODE_ENV === "production" ? "error" : "debug" },
  rateLimit: {
    enabled: true,
    storage: "secondary-storage",
    ...RATE_LIMITS.authentication,
    customRules: {
      "/sign-in/*": RATE_LIMITS.signIn,
      "/email-otp/*": RATE_LIMITS.otp
    }
  },
  database: drizzleAdapter(db, {
    provider: "pg",
    schema,
    usePlural: true,
    transaction: true
  }),
  trustedOrigins: [config.PUBLIC_APP_URL, config.PUBLIC_API_URL],
  advanced: {
    database: {
      generateId: "uuid"
    },
    ipAddress: {
      ipAddressHeaders: ["x-client-ip"]
    },
    ...(config.PUBLIC_COOKIE_DOMAIN && {
      crossSubDomainCookies: {
        enabled: true,
        domain: config.PUBLIC_COOKIE_DOMAIN
      }
    })
  },
  secondaryStorage: {
    get: async (key) => {
      return await redis.get(`auth:${key}`);
    },
    set: async (key, value, ttl) => {
      if (ttl) {
        await redis.set(`auth:${key}`, value, { EX: ttl });
      } else {
        await redis.set(`auth:${key}`, value);
      }
    },
    delete: async (key) => {
      await redis.del(`auth:${key}`);
    },
    increment: async (key, ttl) => {
      const result = await incrementWithExpiry(`auth:${key}`, ttl);

      return result.count;
    }
  },
  session: {
    storeSessionInDatabase: true
  },
  verification: {
    storeInDatabase: true
  },
  socialProviders: {
    google: {
      clientId: config.GOOGLE_CLIENT_ID,
      clientSecret: config.GOOGLE_CLIENT_SECRET
    },
    github: {
      clientId: config.GITHUB_CLIENT_ID,
      clientSecret: config.GITHUB_CLIENT_SECRET
    }
  },
  user: {
    additionalFields: {
      currentWorkspaceID: {
        type: "string",
        required: false,
        transform: {
          input: (value) => {
            if (!value) return null;

            return toUUID(value as string) as unknown as string;
          },
          output: (value) => {
            if (!value) return null;

            return toWorkspaceID(value as string);
          }
        }
      }
    }
  },
  databaseHooks: {
    user: {
      create: {
        before: async (user) => {
          // Ensure the name is at most 320 chars
          const name = (user.name || user.email.split("@")[0]).slice(0, 320);

          return {
            data: {
              ...user,
              name
            }
          };
        },
        after: async (user, context) => {
          try {
            const defaultWorkspaceName = `${user.name} (Personal Workspace)`;
            const workspaceName =
              defaultWorkspaceName.length > 50 ? "Personal Workspace" : defaultWorkspaceName;
            const workspace = await Workspaces.create({
              name: workspaceName,
              userID: user.id
            });

            // Update the user's currentWorkspaceID to the newly created workspace before returning the user object
            await context?.context.internalAdapter.updateUser(user.id, {
              currentWorkspaceID: toUUID(workspace.id)
            });
          } catch (error) {
            console.error("Failed to provision workspace", {
              userID: user.id,
              error
            });
          }
        }
      }
    }
  },
  emailVerification: { autoSignInAfterVerification: true },
  plugins: [
    emailOTP({
      async sendVerificationOTP({ email, otp, type }, ctx) {
        if (type === "forget-password" || type === "change-email") {
          throw APIError.fromStatus("BAD_REQUEST", { message: "Unsupported OTP type" });
        }

        const headers = ctx?.headers || ctx?.request?.headers;
        const sessionVerification = headers?.get("x-session-verification") === "true";
        const sessionVerificationCallback = headers?.get("x-session-verification-callback");
        const otpToken = Auth.createOTPToken({
          email,
          otp,
          type,
          expiresAt: add(new Date(), { seconds: OTP_EXPIRY_SECONDS })
        });

        if (sessionVerification) {
          const query = new URLSearchParams({
            mode: "sign-in",
            token: otpToken,
            addAccount: "true",
            redirectTo: sessionVerificationCallback || "/"
          });

          // Avoid await to prevent timing attacks
          void sendEmail(email, "session-verification", {
            code: otp,
            link: `${config.PUBLIC_APP_URL}/auth/email?${query}`
          });

          return;
        }

        // Avoid await to prevent timing attacks
        await sendEmail(email, "verification-otp", {
          code: otp,
          type,
          link: `${config.PUBLIC_APP_URL}/auth/email?mode=${type === "email-verification" ? "sign-in" : "sign-up"}&token=${otpToken}`
        });
      },
      storeOTP: "hashed",
      otpLength: 6,
      expiresIn: OTP_EXPIRY_SECONDS,
      disableSignUp: false,
      rateLimit: RATE_LIMITS.otp
    }),
    passkey({
      rpName: "Andesine",
      rpID: config.PASSKEY_RP_ID,
      origin: config.PASSKEY_ORIGIN
    }),
    multiSession()
  ]
});

export { auth };
export type { auth as Auth };
