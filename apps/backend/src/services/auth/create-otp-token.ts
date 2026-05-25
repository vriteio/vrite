import { config } from "#backend/lib/config";
import { encrypt } from "#backend/lib/utils";

interface OTPTokenData {
  email: string;
  type: "sign-in" | "email-verification" | "change-email";
  otp: string;
  expiresAt: string;
}

const createOTPToken = (input: {
  email: string;
  type: "sign-in" | "email-verification" | "change-email";
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

export { createOTPToken };
export type { OTPTokenData };
