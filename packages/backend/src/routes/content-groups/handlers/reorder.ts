import { z } from "zod";
import { ObjectId } from "mongodb";
import { AuthenticatedContext } from "#lib/middleware";
import { contentGroup, getContentGroupsCollection, getWorkspacesCollection } from "#collections";
import { publishContentGroupEvent } from "#events";
import { errors } from "#lib/errors";

const inputSchema = contentGroup
  .pick({
    id: true
  })
  .extend({
    index: z.number().describe("The new index of the content group")
  });
const handler = async (
  ctx: AuthenticatedContext,
  input: z.infer<typeof inputSchema>
): Promise<void> => {
  const contentGroupsCollection = getContentGroupsCollection(ctx.db);
  const workspacesCollection = getWorkspacesCollection(ctx.db);
  const contentGroup = await contentGroupsCollection.findOne({
    _id: new ObjectId(input.id),
    workspaceId: ctx.auth.workspaceId
  });

  if (!contentGroup) throw errors.notFound("contentGroup");

  if (contentGroup.ancestors.length > 0) {
    const ancestor = await contentGroupsCollection.findOne({
      _id: contentGroup.ancestors[contentGroup.ancestors.length - 1],
      workspaceId: ctx.auth.workspaceId
    });

    if (!ancestor) throw errors.notFound("contentGroup");

    const newDescendants = [...ancestor.descendants];

    newDescendants.splice(
      newDescendants.findIndex((newDescendantId) => {
        return newDescendantId.equals(contentGroup._id);
      }),
      1
    );
    newDescendants.splice(input.index, 0, contentGroup._id);
    await contentGroupsCollection.updateOne(
      { _id: ancestor._id },
      { $set: { descendants: newDescendants } }
    );
  } else {
    const workspace = await workspacesCollection.findOne({
      _id: ctx.auth.workspaceId
    });

    if (!workspace) throw errors.notFound("workspace");

    const newContentGroups = [...workspace.contentGroups];

    newContentGroups.splice(
      newContentGroups.findIndex((newContentGroupId) => {
        return newContentGroupId.equals(contentGroup._id);
      }),
      1
    );
    newContentGroups.splice(input.index, 0, contentGroup._id);
    await workspacesCollection.updateOne(
      { _id: ctx.auth.workspaceId },
      { $set: { contentGroups: newContentGroups } }
    );
  }

  publishContentGroupEvent(ctx, `${ctx.auth.workspaceId}`, {
    action: "reorder",
    userId: `${ctx.auth.userId}`,
    data: input
  });
};

export { inputSchema, handler };
