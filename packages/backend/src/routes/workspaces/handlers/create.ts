import { z } from "zod";
import { AuthenticatedContext } from "#lib/middleware";
import { getUsersCollection, workspace } from "#collections";
import { createWorkspace } from "#lib/workspace";
import { errors } from "#lib/errors";

const inputSchema = workspace.pick({ description: true, logo: true, name: true });
const outputSchema = z.object({
  workspaceId: z.string()
});
const handler = async (
  ctx: AuthenticatedContext,
  input: z.infer<typeof inputSchema>
): Promise<z.infer<typeof outputSchema>> => {
  const usersCollection = getUsersCollection(ctx.db);
  const user = await usersCollection.findOne({
    _id: ctx.auth.userId
  });

  if (!user) throw errors.notFound("user");

  const workspaceId = await createWorkspace(user, ctx.fastify, input);

  return { workspaceId: `${workspaceId}` };
};

export { inputSchema, outputSchema, handler };
