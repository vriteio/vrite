import { config } from "#backend/lib/config";
import { decrypt, encrypt } from "./crypto";
import { ORPCError } from "@orpc/server";
import * as z from "zod";

const otpTokenDataType = z.object({
  email: z.email(),
  type: z.enum(["sign-in", "email-verification"]),
  otp: z.string().length(6),
  expiresAt: z.iso.datetime()
});

const createOTPToken = (input: {
  email: string;
  type: "sign-in" | "email-verification";
  otp: string;
  expiresAt: Date;
}) => {
  return encrypt(
    JSON.stringify({
      ...input,
      expiresAt: input.expiresAt.toISOString()
    }),
    config.SECRET
  );
};
const verifyOTPToken = (input: { token: string }) => {
  try {
    const data = decrypt(input.token, config.SECRET);
    const parsed = otpTokenDataType.parse(JSON.parse(data));
    const expiresAt = new Date(parsed.expiresAt);

    if (expiresAt < new Date()) {
      throw new ORPCError("UNAUTHORIZED", { message: "OTP token has expired" });
    }

    return { email: parsed.email, otp: parsed.otp };
  } catch (error) {
    if (error instanceof ORPCError) throw error;

    throw new ORPCError("UNAUTHORIZED", { message: "Invalid OTP token" });
  }
};

export { createOTPToken, verifyOTPToken };
