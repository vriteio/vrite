import { ObjectId, Binary } from "mongodb";
import { z } from "zod";
import {
  getGitDataCollection,
  getContentPiecesCollection,
  getContentsCollection
} from "#collections";
import { publishGitDataEvent } from "#events";
import { errors } from "#lib/errors";
import { AuthenticatedContext } from "#lib/middleware";
import { createInputContentProcessor, useGitSyncIntegration } from "#lib/git-sync";

const inputSchema = z.object({
  contentPieceId: z.string(),
  content: z.string(),
  syncedHash: z.string(),
  path: z.string()
});
const handler = async (
  ctx: AuthenticatedContext,
  input: z.infer<typeof inputSchema>
): Promise<void> => {
  const gitDataCollection = getGitDataCollection(ctx.db);
  const contentPiecesCollection = getContentPiecesCollection(ctx.db);
  const contentsCollection = getContentsCollection(ctx.db);
  const gitData = await gitDataCollection.findOne({ workspaceId: ctx.auth.workspaceId });

  if (!gitData) throw errors.notFound("gitData");

  const gitSyncIntegration = useGitSyncIntegration(ctx, gitData);

  if (!gitSyncIntegration) throw errors.serverError();

  const inputContentProcessor = await createInputContentProcessor(
    ctx,
    gitSyncIntegration.getTransformer()
  );
  const { buffer, metadata, hash } = await inputContentProcessor.process(input.content);
  const { date, members, tags, ...restMetadata } = metadata;

  await contentsCollection.updateOne(
    {
      contentPieceId: new ObjectId(input.contentPieceId)
    },
    {
      $set: {
        content: new Binary(buffer)
      }
    }
  );
  await contentPiecesCollection.updateOne(
    {
      _id: new ObjectId(input.contentPieceId)
    },
    {
      $set: {
        ...restMetadata,
        ...(date && { date: new Date(date) }),
        ...(members && { members: members.map((memberId) => new ObjectId(memberId)) }),
        ...(tags && { tags: tags.map((tagId) => new ObjectId(tagId)) })
      }
    }
  );
  await gitDataCollection.updateOne(
    {
      "workspaceId": ctx.auth.workspaceId,
      "records.contentPieceId": new ObjectId(input.contentPieceId)
    },
    {
      $set: {
        "records.$.syncedHash": input.syncedHash,
        "records.$.currentHash": hash
      }
    }
  );
  publishGitDataEvent(ctx, `${ctx.auth.workspaceId}`, {
    action: "update",
    data: {
      records: gitData.records.map((record) => {
        if (`${record.contentPieceId}` === input.contentPieceId) {
          return {
            ...record,
            contentPieceId: `${record.contentPieceId}`,
            variantId: record.variantId ? `${record.variantId}` : undefined,
            syncedHash: input.syncedHash,
            currentHash: hash
          };
        }

        return {
          ...record,
          variantId: record.variantId ? `${record.variantId}` : undefined,
          contentPieceId: `${record.contentPieceId}`
        };
      })
    }
  });
};

export { inputSchema, handler };
