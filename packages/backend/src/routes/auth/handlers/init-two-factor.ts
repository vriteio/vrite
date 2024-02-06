import { totpConfig } from "../utils";
import { z } from "zod";
import { nanoid } from "nanoid";
import * as OTPAuth from "otpauth";
import { AuthenticatedContext } from "#lib/middleware";
import { getUsersCollection } from "#collections";
import { errors } from "#lib/errors";

const outputSchema = z.object({
  totp: z.string()
});
const handler = async (ctx: AuthenticatedContext): Promise<z.infer<typeof outputSchema>> => {
  const usersCollection = getUsersCollection(ctx.db);
  const user = await usersCollection.findOne({
    _id: ctx.auth.userId
  });

  if (!user) throw errors.notFound("user");

  const totpSecret = nanoid();

  await usersCollection.updateOne({ _id: user._id }, { $set: { totpSecret } });

  const totp = new OTPAuth.TOTP({
    ...totpConfig,
    label: user.username,
    secret: totpSecret
  });

  return { totp: totp.toString() };
};

export { outputSchema, handler };
