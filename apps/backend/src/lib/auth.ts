import { betterAuth } from "better-auth";
import { mongodbAdapter } from "@better-auth/mongo-adapter";
import { emailOTP, multiSession } from "better-auth/plugins";
import { passkey } from "@better-auth/passkey";
import { db, mongoClient, toObjectID } from "./mongo";
import { config } from "./config";
import { sendEmail } from "./email";
import { Workspaces } from "#backend/services";
import { redis } from "./redis";
import { Auth } from "#backend/services/auth";
import { add } from "date-fns";
import { toUserID, toWorkspaceID } from "#backend/db";
import { ObjectId } from "mongodb";

const auth = betterAuth({
  appName: "Andesine",
  baseURL: config.PUBLIC_API_URL,
  secret: config.SECRET,
  basePath: "/auth",
  logger: { level: config.NODE_ENV === "production" ? "error" : "debug" },
  database: mongodbAdapter(db, { client: mongoClient, transaction: false }),
  trustedOrigins: [
    ...(config.PUBLIC_COOKIE_DOMAIN
      ? [`${config.PUBLIC_SECURE ? "https://" : "http://"}${config.PUBLIC_COOKIE_DOMAIN}`]
      : []),
    config.PUBLIC_APP_URL,
    config.PUBLIC_API_URL
  ],
  ...(config.PUBLIC_COOKIE_DOMAIN && {
    advanced: {
      crossSubDomainCookies: {
        enabled: true,
        domain: config.PUBLIC_COOKIE_DOMAIN
      }
    }
  }),
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
    }
  },
  socialProviders: {
    ...(config.GOOGLE_CLIENT_ID &&
      config.GOOGLE_CLIENT_SECRET && {
        google: {
          clientId: config.GOOGLE_CLIENT_ID,
          clientSecret: config.GOOGLE_CLIENT_SECRET
        }
      }),
    ...(config.GITHUB_CLIENT_ID &&
      config.GITHUB_CLIENT_SECRET && {
        github: {
          clientId: config.GITHUB_CLIENT_ID,
          clientSecret: config.GITHUB_CLIENT_SECRET
        }
      })
  },
  user: {
    modelName: "users",
    additionalFields: {
      currentWorkspaceID: {
        type: "string",
        required: false,
        transform: {
          input: (value) => {
            if (!value) return null;

            return toObjectID(value as string) as unknown as string;
          },
          output: (value) => {
            if (!value) return null;

            return toWorkspaceID(value as unknown as ObjectId);
          }
        }
      }
    }
  },
  databaseHooks: {
    user: {
      create: {
        before: async (user) => {
          const userID = toUserID(new ObjectId());
          const name = user.name || user.email.split("@")[0];
          const workspace = await Workspaces.create({
            name: `${name} (Personal Workspace)`,
            userID
          });

          return {
            data: {
              ...user,
              name,
              id: `${toObjectID(userID)}`,
              currentWorkspaceID: workspace.id
            }
          };
        }
      }
    }
  },
  emailVerification: { autoSignInAfterVerification: true },
  plugins: [
    emailOTP({
      async sendVerificationOTP({ email, otp, type }) {
        if (type !== "forget-password" && type !== "change-email") {
          const otpToken = Auth.createOTPToken({
            email,
            otp,
            type,
            expiresAt: add(new Date(), { seconds: 300 })
          });

          sendEmail(email, "verification-otp", {
            code: otp,
            type,
            link: `${config.PUBLIC_APP_URL}/auth/email?mode=${type === "email-verification" ? "sign-in" : "sign-up"}&token=${otpToken}`
          });
        }
      },
      storeOTP: "hashed",
      otpLength: 6,
      expiresIn: 600,
      disableSignUp: false
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
