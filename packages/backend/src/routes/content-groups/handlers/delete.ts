import { z } from "zod";
import { ObjectId } from "mongodb";
import { AuthenticatedContext } from "#lib/middleware";
import {
  getWorkspacesCollection,
  getContentGroupsCollection,
  getContentPiecesCollection,
  getContentsCollection,
  getContentPieceVariantsCollection,
  getContentVariantsCollection
} from "#collections";
import { publishContentGroupEvent } from "#events";
import { errors } from "#lib/errors";
import { zodId } from "#lib/mongo";
import { runGitSyncHook } from "#plugins/git-sync";

const inputSchema = z.object({
  id: zodId()
});
const handler = async (
  ctx: AuthenticatedContext,
  input: z.infer<typeof inputSchema>
): Promise<void> => {
  const workspacesCollection = getWorkspacesCollection(ctx.db);
  const contentGroupsCollection = getContentGroupsCollection(ctx.db);
  const contentPiecesCollection = getContentPiecesCollection(ctx.db);
  const contentsCollection = getContentsCollection(ctx.db);
  const contentPieceVariantsCollection = getContentPieceVariantsCollection(ctx.db);
  const contentVariantsCollection = getContentVariantsCollection(ctx.db);
  const contentGroupId = new ObjectId(input.id);
  const contentGroup = await contentGroupsCollection.findOne({
    _id: contentGroupId,
    workspaceId: ctx.auth.workspaceId
  });

  if (!contentGroup) throw errors.notFound("contentGroup");

  if (contentGroup.ancestors.length > 0) {
    await contentGroupsCollection.updateOne(
      { _id: contentGroup.ancestors[contentGroup.ancestors.length - 1] },
      { $pull: { descendants: contentGroupId } }
    );
  } else {
    await workspacesCollection.updateOne(
      { _id: ctx.auth.workspaceId },
      { $pull: { contentGroups: contentGroupId } }
    );
  }

  const nestedContentGroups = await contentGroupsCollection
    .find({
      ancestors: contentGroupId
    })
    .map(({ _id }) => _id)
    .toArray();
  const deletedContentGroupIds = [contentGroupId, ...nestedContentGroups];
  const contentPieceIds = await contentPiecesCollection
    .find({ contentGroupId: { $in: deletedContentGroupIds } })
    .project({ _id: true })
    .map(({ _id }) => _id)
    .toArray();

  await contentGroupsCollection.deleteMany({
    _id: { $in: deletedContentGroupIds },
    workspaceId: ctx.auth.workspaceId
  });
  await contentPiecesCollection.deleteMany({
    _id: { $in: contentPieceIds },
    workspaceId: ctx.auth.workspaceId
  });
  await contentsCollection.deleteMany({
    contentPieceId: { $in: contentPieceIds }
  });
  await contentPieceVariantsCollection.deleteMany({
    contentPieceId: { $in: contentPieceIds },
    workspaceId: ctx.auth.workspaceId
  });
  await contentVariantsCollection.deleteMany({
    contentPieceId: { $in: contentPieceIds }
  });
  runGitSyncHook(ctx, "contentGroupRemoved", { contentGroup });
  runWebhooks(ctx, "contentGroupAdded", {
    ...contentGroup,
    ancestors: contentGroup.ancestors.map((id) => `${id}`),
    descendants: contentGroup.descendants.map((id) => `${id}`),
    id: `${contentGroup._id}`
  });
  publishContentGroupEvent(ctx, `${ctx.auth.workspaceId}`, {
    action: "delete",
    userId: `${ctx.auth.userId}`,
    data: input
  });
  ctx.fastify.search.deleteContent({
    contentPieceId: contentPieceIds,
    workspaceId: ctx.auth.workspaceId
  });
};

export { inputSchema, handler };
