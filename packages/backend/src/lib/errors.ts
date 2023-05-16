import { TRPCError } from "@trpc/server";
import { TRPC_ERROR_CODE_KEY } from "@trpc/server/rpc";

class CustomError extends TRPCError {
  public causeData: Record<string, any> = {};

  public constructor(options: {
    code: TRPC_ERROR_CODE_KEY;
    message: string;
    cause: Record<string, any>;
  }) {
    super(options);
    this.causeData = options.cause;
  }
}

const notFound = (resourceType?: string, details: Record<string, string> = {}): CustomError => {
  return new CustomError({
    code: "NOT_FOUND",
    message: "Resource not found",
    cause: {
      code: "resourceNotFound",
      resourceType,
      ...details
    }
  });
};
const serverError = (): CustomError => {
  return new CustomError({
    code: "INTERNAL_SERVER_ERROR",
    message: "Processing request failed",
    cause: {
      code: "requestFailed"
    }
  });
};
const expired = (resourceType?: string): CustomError => {
  return new CustomError({
    code: "BAD_REQUEST",
    message: "Resource expired",
    cause: {
      code: "expired",
      resourceType
    }
  });
};
const locked = (resourceType?: string, details: Record<string, string> = {}): CustomError => {
  return new CustomError({
    code: "BAD_REQUEST",
    message: "Resource locked",
    cause: {
      code: "locked",
      resourceType,
      ...details
    }
  });
};
const incomplete = (resourceType?: string): CustomError => {
  return new CustomError({
    code: "BAD_REQUEST",
    message: "Resource is incomplete",
    cause: {
      code: "incomplete",
      resourceType
    }
  });
};
const unauthorized = (reason?: string): CustomError => {
  return new CustomError({
    code: "UNAUTHORIZED",
    message: "Unauthorized",
    cause: { code: `unauthorized`, reason }
  });
};
const forbidden = (code?: string): CustomError => {
  return new CustomError({
    code: "FORBIDDEN",
    message: "Forbidden",
    cause: { code: code || "lackOfPermissions" }
  });
};
const alreadyExists = (resourceType: string): CustomError => {
  return new CustomError({
    code: "CONFLICT",
    message: "Resource already exists",
    cause: {
      code: "alreadyExists",
      resourceType
    }
  });
};
const invalid = (resourceType: string): CustomError => {
  return new CustomError({
    code: "BAD_REQUEST",
    message: "Resource invalid",
    cause: {
      code: "invalid",
      resourceType
    }
  });
};
const badRequest = (code?: string): CustomError => {
  return new CustomError({
    code: "BAD_REQUEST",
    message: "Bad request",
    cause: {
      code: code || "badRequest"
    }
  });
};

export {
  CustomError,
  notFound,
  serverError,
  expired,
  locked,
  incomplete,
  unauthorized,
  forbidden,
  alreadyExists,
  invalid,
  badRequest
};
