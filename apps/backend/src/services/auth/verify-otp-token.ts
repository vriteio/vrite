import { config } from "#backend/lib/config";
import { decrypt } from "#backend/lib/utils";
import { ORPCError } from "@orpc/server";
import { OTPTokenData } from "./create-otp-token";

const verifyOTPToken = async (input: { token: string }) => {
  try {
    const data = decrypt(input.token, config.SECRET);
    const parsed = JSON.parse(data) as OTPTokenData;
    const expiresAt = new Date(parsed.expiresAt);

    if (expiresAt < new Date()) {
      throw new ORPCError("UNAUTHORIZED", { message: "OTP token has expired" });
    }

    return { email: parsed.email, otp: parsed.otp };
  } catch (error) {
    if (error instanceof ORPCError) {
      throw error;
    }

    throw new ORPCError("UNAUTHORIZED", { message: "Invalid OTP token" });
  }
};

export { verifyOTPToken };
