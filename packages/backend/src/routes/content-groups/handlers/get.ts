import { z } from "zod";
import { ObjectId } from "mongodb";
import { AuthenticatedContext } from "#lib/middleware";
import { contentGroup, getContentGroupsCollection } from "#collections";
import { errors } from "#lib/errors";

const inputSchema = contentGroup.pick({ id: true });
const outputSchema = contentGroup;
const handler = async (
  ctx: AuthenticatedContext,
  input: z.infer<typeof inputSchema>
): Promise<z.infer<typeof outputSchema>> => {
  const contentGroupsCollection = getContentGroupsCollection(ctx.db);
  const contentGroup = await contentGroupsCollection.findOne({
    _id: new ObjectId(input.id),
    workspaceId: ctx.auth.workspaceId
  });

  if (!contentGroup) throw errors.notFound("contentGroup");

  return {
    id: `${contentGroup._id}`,
    ancestors: contentGroup.ancestors.map((id) => `${id}`),
    descendants: contentGroup.descendants.map((id) => `${id}`),
    name: contentGroup.name
  };
};

export { inputSchema, outputSchema, handler };
