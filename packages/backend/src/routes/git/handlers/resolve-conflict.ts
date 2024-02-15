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
import { createInputContentProcessor, useGitProvider } from "#lib/git-sync";

const inputSchema = z.object({
  contentPieceId: z.string().describe("ID of the content piece"),
  content: z.string().describe("Content to update"),
  hash: z.string().describe("New hash of the content"),
  path: z.string().describe("Path of the record, relative to the base directory")
});
const handler = async (
  ctx: AuthenticatedContext,
  input: z.infer<typeof inputSchema>
): Promise<void> => {
  const gitDataCollection = getGitDataCollection(ctx.db);
  const contentPiecesCollection = getContentPiecesCollection(ctx.db);
  const contentsCollection = getContentsCollection(ctx.db);
  const gitData = await gitDataCollection.findOne({ workspaceId: ctx.auth.workspaceId });
  const gitProvider = useGitProvider(ctx, gitData);

  if (!gitData || !gitProvider) throw errors.serverError();

  const isRemoved = input.content.trim() === "";

  let currentHash = "";

  if (isRemoved) {
    await contentsCollection.deleteOne({
      contentPieceId: new ObjectId(input.contentPieceId)
    });
    await contentPiecesCollection.deleteOne({
      _id: new ObjectId(input.contentPieceId)
    });
  } else {
    const inputContentProcessor = await createInputContentProcessor(
      ctx,
      gitProvider.data.transformer
    );
    const { buffer, metadata, hash } = await inputContentProcessor.process(input.content.trim());
    const { date, members, tags, ...restMetadata } = metadata;

    currentHash = hash;
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
  }

  if (!currentHash && !input.hash) {
    await gitDataCollection.updateOne(
      {
        workspaceId: ctx.auth.workspaceId
      },
      {
        $pull: {
          "records.contentPieceId": new ObjectId(input.contentPieceId)
        }
      }
    );
  } else {
    await gitDataCollection.updateOne(
      {
        "workspaceId": ctx.auth.workspaceId,
        "records.contentPieceId": new ObjectId(input.contentPieceId)
      },
      {
        $set: {
          "records.$.syncedHash": input.hash,
          "records.$.currentHash": currentHash
        }
      }
    );
  }

  publishGitDataEvent(ctx, `${ctx.auth.workspaceId}`, {
    action: "update",
    data: {
      records: gitData.records
        .map((record) => {
          if (`${record.contentPieceId}` === input.contentPieceId) {
            return {
              ...record,
              contentPieceId: `${record.contentPieceId}`,
              syncedHash: input.hash,
              currentHash
            };
          }

          return {
            ...record,
            contentPieceId: `${record.contentPieceId}`
          };
        })
        .filter((record) => {
          return record.syncedHash || record.currentHash;
        })
    }
  });
};

export { inputSchema, handler };
