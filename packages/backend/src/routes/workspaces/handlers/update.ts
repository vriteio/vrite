import { z } from "zod";
import { AuthenticatedContext } from "#lib/middleware";
import { workspace, getWorkspacesCollection } from "#collections";
import { publishWorkspaceEvent } from "#events";
import { errors } from "#lib/errors";

const inputSchema = workspace
  .pick({ id: true, description: true, logo: true, name: true })
  .partial()
  .required({ id: true });
const handler = async (
  ctx: AuthenticatedContext,
  input: z.infer<typeof inputSchema>
): Promise<void> => {
  const workspacesCollection = getWorkspacesCollection(ctx.db);
  const { matchedCount } = await workspacesCollection.updateOne(
    { _id: ctx.auth.workspaceId },
    {
      $set: input
    }
  );

  if (!matchedCount) throw errors.notFound("workspace");

  publishWorkspaceEvent(ctx, `${ctx.auth.workspaceId}`, {
    action: "update",
    data: input
  });
};

export { inputSchema, handler };
