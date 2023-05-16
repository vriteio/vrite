const errorMessages: Record<string, string> = {
  invalidEmail: "Incorrect email address",
  passwordInvalid: "Invalid password",
  emailNotVerified: "Email not verified",
  totpTokenInvalid: "Invalid 2FA code",
  resourceNotFound: "User not found",
  alreadyExists: "User already exists"
};
const getErrorMessage = (reason: string): string => {
  return errorMessages[reason] || "Error";
};

export { getErrorMessage };
