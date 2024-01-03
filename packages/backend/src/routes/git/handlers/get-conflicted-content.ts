import { ObjectId } from "mongodb";
import { z } from "zod";
import {
  getGitDataCollection,
  getContentsCollection,
  getContentPiecesCollection
} from "#collections";
import { errors } from "#lib/errors";
import { AuthenticatedContext } from "#lib/middleware";
import { zodId } from "#lib/mongo";
import { createOutputContentProcessor, useGitSyncIntegration } from "#lib/git-sync";

const inputSchema = z.object({
  contentPieceId: zodId()
});
const outputSchema = z.object({
  content: z.string()
});
const handler = async (
  ctx: AuthenticatedContext,
  input: z.infer<typeof inputSchema>
): Promise<z.infer<typeof outputSchema>> => {
  const gitDataCollection = getGitDataCollection(ctx.db);
  const contentsCollection = getContentsCollection(ctx.db);
  const contentPiecesCollection = getContentPiecesCollection(ctx.db);
  const gitData = await gitDataCollection.findOne({ workspaceId: ctx.auth.workspaceId });

  if (!gitData) throw errors.notFound("gitData");

  const gitSyncIntegration = useGitSyncIntegration(ctx, gitData);

  if (!gitSyncIntegration) throw errors.serverError();

  const outputContentProcessor = await createOutputContentProcessor(
    ctx,
    gitSyncIntegration.getTransformer()
  );
  const contentPiece = await contentPiecesCollection.findOne({
    _id: new ObjectId(input.contentPieceId)
  });

  if (!contentPiece) throw errors.notFound("contentPiece");

  const { content } =
    (await contentsCollection.findOne({
      contentPieceId: new ObjectId(input.contentPieceId)
    })) || {};

  if (!content) throw errors.notFound("content");

  return {
    content: await outputContentProcessor.process({
      buffer: Buffer.from(content.buffer),
      contentPiece
    })
  };
};

export { inputSchema, outputSchema, handler };
