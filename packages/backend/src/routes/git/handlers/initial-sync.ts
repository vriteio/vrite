import { Binary, ObjectId } from "mongodb";
import { convert as convertToSlug } from "url-slug";
import { LexoRank } from "lexorank";
import {
  getGitDataCollection,
  getContentGroupsCollection,
  getContentPiecesCollection,
  getContentsCollection,
  getWorkspacesCollection,
  FullContentPiece,
  FullContentGroup,
  FullContents,
  GitDirectory,
  GitRecord
} from "#collections";
import { publishGitDataEvent, publishContentGroupEvent } from "#events";
import { errors } from "#lib/errors";
import { AuthenticatedContext } from "#lib/middleware";
import { UnderscoreID } from "#lib/mongo";
import {
  CommonGitProviderDirectory,
  createInputContentProcessor,
  useGitProvider
} from "#lib/git-sync";

const handler = async (ctx: AuthenticatedContext): Promise<void> => {
  const gitDataCollection = getGitDataCollection(ctx.db);
  const contentGroupsCollection = getContentGroupsCollection(ctx.db);
  const contentPiecesCollection = getContentPiecesCollection(ctx.db);
  const contentsCollection = getContentsCollection(ctx.db);
  const workspaceCollection = getWorkspacesCollection(ctx.db);
  const gitData = await gitDataCollection.findOne({ workspaceId: ctx.auth.workspaceId });
  const gitProvider = useGitProvider(ctx, gitData);

  if (!gitData || !gitProvider) throw errors.serverError();

  const newContentGroups: UnderscoreID<FullContentGroup<ObjectId>>[] = [];
  const newContentPieces: UnderscoreID<FullContentPiece<ObjectId>>[] = [];
  const newContents: UnderscoreID<FullContents<ObjectId>>[] = [];
  const newRecords: Array<GitRecord<ObjectId>> = [];
  const newDirectories: Array<GitDirectory<ObjectId>> = [];
  const { directory, lastCommit } = await gitProvider.initialSync();
  const inputContentProcessor = await createInputContentProcessor(
    ctx,
    gitProvider.data.transformer
  );
  const gitDirectoryToContentGroup = async (
    gitDirectory: CommonGitProviderDirectory,
    ancestors: ObjectId[] = []
  ): Promise<UnderscoreID<FullContentGroup<ObjectId>>> => {
    const contentGroupId = new ObjectId();
    const contentGroup = {
      _id: contentGroupId,
      ancestors,
      descendants: [] as ObjectId[],
      name: gitDirectory.name,
      workspaceId: ctx.auth.workspaceId
    };

    let order = LexoRank.min();

    newContentGroups.push(contentGroup);
    newDirectories.push({
      contentGroupId,
      path: gitDirectory.path
    });

    const processedContentEntries = await inputContentProcessor.processBatch(
      gitDirectory.records.map((record) => record.content)
    );

    gitDirectory.records.forEach((record, index) => {
      const filename = record.path.split("/").pop() || "";
      const processedContentEntry = processedContentEntries[index];
      const { members, tags, date, ...inputMetadata } = processedContentEntry.metadata;
      const contentPiece: UnderscoreID<FullContentPiece<ObjectId>> = {
        _id: new ObjectId(),
        workspaceId: ctx.auth.workspaceId,
        order: `${order}`,
        members: [],
        slug: convertToSlug(filename),
        tags: [],
        title: filename,
        contentGroupId,
        filename,
        ...inputMetadata,
        ...(date && { date: new Date(date) }),
        ...(members && { members: members.map((memberId) => new ObjectId(memberId)) }),
        ...(tags && { tags: tags.map((tagId) => new ObjectId(tagId)) })
      };
      const content: UnderscoreID<FullContents<ObjectId>> = {
        _id: new ObjectId(),
        contentPieceId: contentPiece._id,
        content: new Binary(processedContentEntry.buffer)
      };

      newContentPieces.push(contentPiece);
      newContents.push(content);
      newRecords.push({
        contentPieceId: contentPiece._id,
        currentHash: record.hash,
        syncedHash: record.hash,
        path: record.path
      });
      order = order.genNext();
    });

    for await (const directory of gitDirectory.directories) {
      const descendantContentGroup = await gitDirectoryToContentGroup(directory, [
        ...ancestors,
        contentGroupId
      ]);

      contentGroup.descendants.push(descendantContentGroup._id);
    }

    return contentGroup;
  };
  const topContentGroup = await gitDirectoryToContentGroup(directory);

  if (newContentGroups.length) {
    await contentGroupsCollection.insertMany(newContentGroups);
  }

  if (newContentPieces.length) {
    await contentPiecesCollection.insertMany(newContentPieces);
  }

  if (newContents.length) {
    await contentsCollection.insertMany(newContents);
  }

  await gitDataCollection.updateOne(
    { workspaceId: ctx.auth.workspaceId },
    {
      $set: {
        records: newRecords,
        directories: newDirectories,
        contentGroupId: topContentGroup._id,
        lastCommitDate: lastCommit.date,
        lastCommitId: lastCommit.id
      }
    }
  );
  await workspaceCollection.updateOne(
    { _id: ctx.auth.workspaceId },
    {
      $push: { contentGroups: topContentGroup._id }
    }
  );
  publishGitDataEvent(ctx, `${ctx.auth.workspaceId}`, {
    action: "update",
    data: {
      records: newRecords.map((record) => ({
        ...record,
        contentPieceId: `${record.contentPieceId}`
      })),
      directories: newDirectories.map((directory) => ({
        ...directory,
        contentGroupId: `${directory.contentGroupId}`
      })),
      lastCommitDate: lastCommit.date,
      lastCommitId: lastCommit.id
    }
  });
  publishContentGroupEvent(ctx, `${ctx.auth.workspaceId}`, {
    action: "create",
    userId: `${ctx.auth.userId}`,
    data: {
      ...topContentGroup,
      ancestors: topContentGroup.ancestors.map((ancestor) => `${ancestor}`),
      descendants: topContentGroup.descendants.map((descendant) => `${descendant}`),
      id: `${topContentGroup._id}`
    }
  });

  const bulkUpsertEntries: Array<{
    contentPiece: UnderscoreID<FullContentPiece<ObjectId>>;
    contentGroup?: UnderscoreID<FullContentGroup<ObjectId>>;
    content: Buffer;
    variantId?: string | ObjectId;
  }> = [];

  newContentPieces.forEach((contentPiece) => {
    const { content } =
      newContents.find(({ contentPieceId }) => {
        return contentPieceId.equals(contentPiece._id);
      }) || {};
    const contentGroup = newContentGroups.find(({ _id }) => {
      return _id.equals(contentPiece.contentGroupId);
    });

    if (content) {
      bulkUpsertEntries.push({
        contentPiece,
        contentGroup,
        content: Buffer.from(content.buffer),
        variantId: "base"
      });
    }
  });
  ctx.fastify.search.content.bulkUpsert({
    entries: bulkUpsertEntries,
    workspaceId: ctx.auth.workspaceId
  });
};

export { handler };
