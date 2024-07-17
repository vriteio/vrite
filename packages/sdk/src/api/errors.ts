interface UnauthorizedError {
  message: string;
  code: "UNAUTHORIZED";
}
interface BadRequestError {
  message: string;
  code: "BAD_REQUEST";
  issues: Array<{
    code: string;
    path: string[];
    message: string;

    expected?: string;
    received?: string;
    validation?: string;
  }>;
}

type APIError = UnauthorizedError | BadRequestError;

export type { UnauthorizedError, BadRequestError, APIError };
