type PasskeyOperation = "register" | "sign-in" | "verify";

interface PasskeyErrorDetails {
  code?: string;
  message?: string;
  status?: number;
}

const PASSKEY_TIMEOUT_THRESHOLD = 55_000;

const getErrorDetails = (error: unknown): PasskeyErrorDetails => {
  if (!error || typeof error !== "object") return {};

  return {
    code: "code" in error && typeof error.code === "string" ? error.code : undefined,
    message: "message" in error && typeof error.message === "string" ? error.message : undefined,
    status: "status" in error && typeof error.status === "number" ? error.status : undefined
  };
};
const getOperationLabel = (operation: PasskeyOperation) => {
  if (operation === "register") return "Passkey setup";
  if (operation === "verify") return "Passkey verification";

  return "Passkey sign-in";
};
const isPasskeySupported = () => {
  return (
    typeof PublicKeyCredential !== "undefined" &&
    typeof navigator !== "undefined" &&
    Boolean(navigator.credentials)
  );
};
const getPasskeyErrorMessage = (error: unknown, operation: PasskeyOperation, elapsedMs = 0) => {
  const { code = "", message = "", status } = getErrorDetails(error);
  const normalizedMessage = message.toLowerCase();
  const operationLabel = getOperationLabel(operation);

  if (!isPasskeySupported()) {
    return "Passkeys aren't supported by this browser or device.";
  }

  if (code === "ERROR_AUTHENTICATOR_PREVIOUSLY_REGISTERED" || code === "PREVIOUSLY_REGISTERED") {
    return "This passkey is already registered.";
  }

  if (
    code.includes("TIMEOUT") ||
    (elapsedMs >= PASSKEY_TIMEOUT_THRESHOLD &&
      /timed? out|timeout|cancel/.test(normalizedMessage)) ||
    code === "CHALLENGE_NOT_FOUND"
  ) {
    return `${operationLabel} timed out. Try again.`;
  }

  if (
    code === "AUTH_CANCELLED" ||
    code === "REGISTRATION_CANCELLED" ||
    code === "ERROR_CEREMONY_ABORTED" ||
    code === "ERROR_PASSTHROUGH_SEE_CAUSE_PROPERTY"
  ) {
    return `${operationLabel} was canceled.`;
  }

  if (
    code === "ERROR_AUTHENTICATOR_MISSING_DISCOVERABLE_CREDENTIAL_SUPPORT" ||
    code === "ERROR_AUTHENTICATOR_MISSING_USER_VERIFICATION_SUPPORT" ||
    code === "ERROR_AUTHENTICATOR_NO_SUPPORTED_PUBKEYCREDPARAMS_ALG" ||
    code === "ERROR_MALFORMED_PUBKEYCREDPARAMS" ||
    code === "ERROR_AUTO_REGISTER_USER_VERIFICATION_FAILURE" ||
    code === "NOT_SUPPORTED"
  ) {
    return "This browser or device can't create the requested passkey.";
  }

  if (status !== undefined && status >= 500) {
    return `${operationLabel} failed due to a server error. Try again.`;
  }

  if (
    code === "FAILED_TO_VERIFY_REGISTRATION" ||
    code === "UNABLE_TO_CREATE_SESSION" ||
    code === "UNKNOWN_ERROR"
  ) {
    return `${operationLabel} failed due to a server error. Try again.`;
  }

  return `${operationLabel} failed. Try again.`;
};

export { getPasskeyErrorMessage, isPasskeySupported };
export type { PasskeyOperation };
