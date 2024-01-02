import { outputSchema } from "./get";
import { z } from "zod";
import { ObjectId } from "mongodb";
import { AuthenticatedContext } from "#lib/middleware";
import { getContentGroupsCollection, getWorkspacesCollection } from "#collections";
import { publishContentGroupEvent } from "#events";
import { errors } from "#lib/errors";
import { zodId } from "#lib/mongo";
import { runGitSyncHook } from "#plugins/git-sync";

const inputSchema = z.object({
  id: zodId(),
  ancestor: zodId().or(z.null())
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

  let ancestors: ObjectId[] = [];

  if (!contentGroup) throw errors.notFound("contentGroup");

  // Remove from current ancestor
  if (contentGroup.ancestors.length > 0) {
    const { matchedCount } = await contentGroupsCollection.updateOne(
      {
        _id: contentGroup.ancestors[contentGroup.ancestors.length - 1],
        workspaceId: ctx.auth.workspaceId
      },
      { $pull: { descendants: contentGroup._id } }
    );

    if (!matchedCount) throw errors.notFound("contentGroup");
  } else {
    const { matchedCount } = await workspacesCollection.updateOne(
      {
        _id: ctx.auth.workspaceId
      },
      {
        $pull: { contentGroups: contentGroup._id }
      }
    );

    if (!matchedCount) throw errors.notFound("contentGroup");
  }

  if (input.ancestor) {
    const ancestor = await contentGroupsCollection.findOne({
      _id: new ObjectId(input.ancestor),
      workspaceId: ctx.auth.workspaceId
    });

    if (!ancestor) throw errors.notFound("contentGroup");

    ancestors = [...ancestor.ancestors, ancestor._id];
    await contentGroupsCollection.updateOne(
      { _id: ancestor._id },
      { $push: { descendants: contentGroup._id } }
    );
    await contentGroupsCollection.updateOne({ _id: contentGroup._id }, { $set: { ancestors } });
  } else {
    ancestors = [];
    await workspacesCollection.updateOne(
      { _id: ctx.auth.workspaceId },
      { $push: { contentGroups: contentGroup._id } }
    );
    await contentGroupsCollection.updateOne({ _id: contentGroup._id }, { $set: { ancestors } });
  }

  // Update descendants' ancestors
  const descendants = await contentGroupsCollection
    .find({
      ancestors: contentGroup._id
    })
    .toArray();
  const writeOperations = descendants.map((descendant) => {
    const descendantAncestors = [
      ...ancestors,
      ...descendant.ancestors.slice(
        descendant.ancestors.findIndex((_id) => contentGroup._id.equals(_id))
      )
    ];

    return {
      updateOne: {
        filter: { _id: descendant._id },
        update: { $set: { ancestors: descendantAncestors } }
      }
    };
  });

  if (writeOperations.length > 0) {
    await contentGroupsCollection.bulkWrite(writeOperations);
  }

  runGitSyncHook(ctx, "contentGroupMoved", {
    ancestor: input.ancestor,
    contentGroup
  });
  publishContentGroupEvent(ctx, `${ctx.auth.workspaceId}`, {
    action: "move",
    userId: `${ctx.auth.userId}`,
    data: {
      id: input.id,
      ancestors: ancestors.map((id) => `${id}`),
      descendants: contentGroup.descendants.map((id) => `${id}`),
      name: contentGroup.name
    }
  });
  runWebhooks(ctx, "contentGroupMoved", {
    id: input.id,
    ancestors: ancestors.map((id) => `${id}`),
    descendants: contentGroup.descendants.map((id) => `${id}`),
    name: contentGroup.name
  });
};

export { inputSchema, outputSchema, handler };
