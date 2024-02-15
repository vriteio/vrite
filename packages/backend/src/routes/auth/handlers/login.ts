import { verifyTotp } from "../utils";
import { z } from "zod";
import { getUsersCollection } from "#collections";
import { errors } from "#lib/errors";
import { verifyValue } from "#lib/hash";
import { createSession } from "#lib/session";
import { Context } from "#lib/context";

const inputSchema = z.object({
  email: z.string().email().max(320).describe("Email address"),
  password: z.string().min(8).max(128).describe("Password"),
  totpToken: z.string().optional().describe("TOTP token (if 2FA is enabled)")
});
const handler = async (ctx: Context, input: z.infer<typeof inputSchema>): Promise<void> => {
  const users = getUsersCollection(ctx.db);
  const user = await users.findOne({ email: input.email });

  if (!user || !user.hash) {
    throw errors.unauthorized("invalidCredentials");
  }

  const correctPassword = await verifyValue(input.password, user.salt, user.hash);

  if (!correctPassword) {
    throw errors.unauthorized("invalidCredentials");
  }

  if (user.emailVerificationCode) {
    throw errors.unauthorized("emailNotVerified");
  }

  if (user.totpSecret) {
    verifyTotp(user, input.totpToken);
  }

  await createSession(ctx, `${user._id}`);
};

export { inputSchema, handler };
