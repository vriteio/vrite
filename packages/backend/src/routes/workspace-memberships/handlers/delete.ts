import { removeMemberFromWorkspace } from "../utils";
import { z } from "zod";
import { ObjectId } from "mongodb";
import { AuthenticatedContext } from "#lib/middleware";
import { UnderscoreID, zodId } from "#lib/mongo";
import { FullWorkspaceMembership } from "#collections";

declare module "fastify" {
  interface RouteCallbacks {
    "workspaceMemberships.delete": {
      ctx: AuthenticatedContext;
      data: {
        workspaceMembership: UnderscoreID<FullWorkspaceMembership<ObjectId>>;
      };
    };
  }
}

const inputSchema = z.object({ id: zodId() });
const handler = async (
  ctx: AuthenticatedContext,
  input: z.infer<typeof inputSchema>
): Promise<void> => {
  const affectedWorkspaceMembership = await removeMemberFromWorkspace(ctx, input.id);

  ctx.fastify.routeCallbacks.run("workspaceMemberships.leave", ctx, {
    workspaceMembership: affectedWorkspaceMembership
  });
};

export { inputSchema, handler };
