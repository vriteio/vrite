import { ObjectId } from "mongodb";
import * as OTPAuth from "otpauth";
import { FullUser } from "#collections";
import { errors } from "#lib/errors";
import { UnderscoreID } from "#lib/mongo";

const totpConfig = {
  issuer: "Vrite",
  algorithm: "SHA512",
  digits: 6,
  period: 30
};
const verifyTotp = (user: UnderscoreID<FullUser<ObjectId>>, totpToken?: string): void => {
  if (!totpToken) throw errors.unauthorized("totpTokenRequired");

  const totp = new OTPAuth.TOTP({
    ...totpConfig,
    label: user.username,
    secret: user.totpSecret
  });
  const result = totp.validate({ token: totpToken, window: 1 });

  if (typeof result !== "number") {
    throw errors.unauthorized("totpTokenInvalid");
  }
};

export { verifyTotp, totpConfig };
