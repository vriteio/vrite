import { z } from "zod";
import { AuthenticatedContext } from "#lib/middleware";
import { getGitDataCollection, getTransformersCollection, transformer } from "#collections";

const outputSchema = z.array(
  transformer.extend({
    inUse: z.boolean().optional().describe("Whether the transformer is in use with Git sync"),
    extension: z
      .boolean()
      .optional()
      .describe("Whether the transformer is associated with an extension")
  })
);
const handler = async (ctx: AuthenticatedContext): Promise<z.infer<typeof outputSchema>> => {
  const gitDataCollection = getGitDataCollection(ctx.db);
  const transformersCollection = getTransformersCollection(ctx.db);
  const gitData = await gitDataCollection.findOne({
    workspaceId: ctx.auth.workspaceId
  });
  const transformers = await transformersCollection
    .find({
      workspaceId: ctx.auth.workspaceId
    })
    .sort("_id", -1)
    .toArray();

  return transformers.map(({ _id, workspaceId, extensionId, ...transformerData }) => {
    return {
      id: `${_id}`,
      workspaceId: `${workspaceId}`,
      inUse: gitData?.github?.transformer === `${_id}`,
      ...(extensionId && { extension: true }),
      ...transformerData
    };
  });
};

export { outputSchema, handler };
