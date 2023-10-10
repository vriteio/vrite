const errorMessages: Record<string, string> = {
  invalidEmail: "Incorrect email address",
  invalidCredentials: "Invalid credentials",
  emailNotVerified: "Email not verified",
  magicLinkAlreadySent: "Wait 1 min before requesting a new magic link",
  totpTokenInvalid: "Invalid 2FA code",
  resourceNotFound: "User not found",
  alreadyExists: "User already exists"
};
const getErrorMessage = (reason: string): string => {
  return errorMessages[reason] || "Error";
};

export { getErrorMessage };
