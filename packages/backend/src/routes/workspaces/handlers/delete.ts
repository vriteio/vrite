import { outputSchema } from "./get";
import { inputSchema } from "./update";
import { AuthenticatedContext } from "#lib/middleware";
import { publishWorkspaceEvent } from "#events";
import { deleteWorkspace } from "#lib/workspace";

const handler = async (ctx: AuthenticatedContext): Promise<void> => {
  await deleteWorkspace(ctx.auth.workspaceId, ctx.fastify);
  publishWorkspaceEvent(ctx, `${ctx.auth.workspaceId}`, {
    action: "delete",
    data: {
      id: `${ctx.auth.workspaceId}`
    }
  });
};

export { inputSchema, outputSchema, handler };
