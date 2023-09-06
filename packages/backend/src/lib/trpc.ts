import { Context } from "./context";
import { CustomError } from "./errors";
import { initTRPC } from "@trpc/server";
import { OpenApiMeta } from "trpc-openapi";
import { TokenPermission, Permission } from "#database";
import { HostConfig } from "#plugins/host-config";

type Meta = OpenApiMeta & {
  permissions?: { session?: Permission[]; token?: TokenPermission[] };
  requiredConfig?: Array<keyof HostConfig>;
};

const { router, middleware, procedure, mergeRouters } = initTRPC
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

export { router, middleware, procedure, mergeRouters };
export type { Meta };
