import { z } from "zod";
import { ObjectId } from "mongodb";
import { AuthenticatedContext } from "#lib/middleware";
import { getTransformersCollection, getGitDataCollection, transformer } from "#collections";
import { publishTransformerEvent } from "#events";
import { errors } from "#lib/errors";

const inputSchema = transformer.pick({ id: true });
const handler = async (
  ctx: AuthenticatedContext,
  input: z.infer<typeof inputSchema>
): Promise<void> => {
  const transformersCollection = getTransformersCollection(ctx.db);
  const gitDataCollection = getGitDataCollection(ctx.db);
  const gitData = await gitDataCollection.findOne({
    workspaceId: ctx.auth.workspaceId
  });

  if (gitData?.github?.transformer === input.id) {
    throw errors.badRequest("notAllowed");
  }

  const { deletedCount } = await transformersCollection.deleteOne({
    _id: new ObjectId(input.id),
    workspaceId: ctx.auth.workspaceId
  });

  if (!deletedCount) throw errors.notFound("transformer");

  publishTransformerEvent(ctx, `${ctx.auth.workspaceId}`, { action: "delete", data: input });
};

export { inputSchema, handler };
