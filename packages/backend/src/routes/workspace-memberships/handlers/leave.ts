import { removeMemberFromWorkspace } from "../utils";
import { ObjectId } from "mongodb";
import { AuthenticatedContext } from "#lib/middleware";
import { UnderscoreID } from "#lib/mongo";
import { FullWorkspaceMembership } from "#collections";

declare module "fastify" {
  interface RouteCallbacks {
    "workspaceMemberships.leave": {
      ctx: AuthenticatedContext;
      data: {
        workspaceMembership: UnderscoreID<FullWorkspaceMembership<ObjectId>>;
      };
    };
  }
}

const handler = async (ctx: AuthenticatedContext): Promise<void> => {
  const affectedWorkspaceMembership = await removeMemberFromWorkspace(ctx);

  ctx.fastify.routeCallbacks.run("workspaceMemberships.leave", ctx, {
    workspaceMembership: affectedWorkspaceMembership
  });
};

export { handler };
