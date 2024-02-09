import { Context } from "./context";
import { CustomError } from "./errors";
import { HostConfig } from "./host-config";
import { initTRPC } from "@trpc/server";
import { OpenApiMeta } from "trpc-openapi";
import { TokenPermission, Permission } from "#collections";

type Meta = OpenApiMeta & {
  permissions?: { session?: Permission[]; token?: TokenPermission[] };
  requiredConfig?: Array<keyof HostConfig>;
  requiredSubscriptionPlan?: "personal" | "team";
};

const { router, middleware, procedure } = initTRPC
  .meta<Meta>()
  .context<Context>()
  .create({
    errorFormatter(errorData) {
      const error = errorData.error as CustomError;
      const { shape } = errorData;

      return {
        ...shape,
        data: {
          ...shape.data,
          cause: error.causeData
        }
      };
    }
  });

export { router, middleware, procedure };
export type { Meta };
