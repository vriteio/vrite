import { TRPCError } from "@trpc/server";

type CustomError = TRPCError & {
  causeData: Record<string, any>;
};

const notFound = (resourceType?: string, details: Record<string, string> = {}): CustomError => {
  return Object.assign(
    new TRPCError({
      code: "NOT_FOUND",
      message: "Resource not found"
    }),
    {
      causeData: { code: "resourceNotFound", resourceType, ...details }
    }
  );
};
const serverError = (): CustomError => {
  return Object.assign(
    new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "Processing request failed"
    }),
    {
      causeData: { code: "requestFailed" }
    }
  );
};
const expired = (resourceType?: string): CustomError => {
  return Object.assign(
    new TRPCError({
      code: "BAD_REQUEST",
      message: "Resource expired"
    }),
    {
      causeData: { code: "expired", resourceType }
    }
  );
};
const locked = (resourceType?: string, details: Record<string, string> = {}): CustomError => {
  return Object.assign(
    new TRPCError({
      code: "BAD_REQUEST",
      message: "Resource locked"
    }),
    {
      causeData: {
        code: "locked",
        resourceType,
        ...details
      }
    }
  );
};
const incomplete = (resourceType?: string): CustomError => {
  return Object.assign(
    new TRPCError({
      code: "BAD_REQUEST",
      message: "Resource is incomplete"
    }),
    {
      causeData: {
        code: "incomplete",
        resourceType
      }
    }
  );
};
const unauthorized = (reason?: string): CustomError => {
  return Object.assign(
    new TRPCError({
      code: "UNAUTHORIZED",
      message: "Unauthorized"
    }),
    { causeData: { code: `unauthorized`, reason } }
  );
};
const forbidden = (code?: string): CustomError => {
  return Object.assign(
    new TRPCError({
      code: "FORBIDDEN",
      message: "Forbidden"
    }),
    {
      causeData: { code: code || "lackOfPermissions" }
    }
  );
};
const alreadyExists = (resourceType: string): CustomError => {
  return Object.assign(
    new TRPCError({
      code: "CONFLICT",
      message: "Resource already exists"
    }),
    {
      causeData: {
        code: "alreadyExists",
        resourceType
      }
    }
  );
};
const invalid = (resourceType: string): CustomError => {
  return Object.assign(
    new TRPCError({
      code: "BAD_REQUEST",
      message: "Resource invalid"
    }),
    {
      causeData: {
        code: "invalid",
        resourceType
      }
    }
  );
};
const badRequest = (code?: string): CustomError => {
  return Object.assign(
    new TRPCError({
      code: "BAD_REQUEST",
      message: "Bad request"
    }),
    {
      causeData: {
        code: code || "badRequest"
      }
    }
  );
};
const errors = {
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

export { errors };
export type { CustomError };
