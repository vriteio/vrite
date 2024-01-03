import { z } from "zod";
import {
  getGitDataCollection,
  getContentsCollection,
  getContentPiecesCollection
} from "#collections";
import { errors } from "#lib/errors";
import { AuthenticatedContext } from "#lib/middleware";
import { zodId } from "#lib/mongo";
import {
  createOutputContentProcessor,
  useGitSyncIntegration,
  OutputContentProcessorInput,
  processPulledRecords
} from "#lib/git-sync";

const inputSchema = z.object({
  force: z.boolean().optional()
});
const outputSchema = z.object({
  status: z.enum(["pulled", "conflict"]),
  conflicted: z
    .array(
      z.object({
        path: z.string(),
        contentPieceId: zodId(),
        currentContent: z.string(),
        pulledContent: z.string(),
        pulledHash: z.string()
      })
    )
    .optional()
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

  const { lastCommit, changedRecordsByDirectory } = await gitSyncIntegration.pull();
  const transformer = gitSyncIntegration.getTransformer();
  const { applyPull, conflicts } = await processPulledRecords({
    changedRecordsByDirectory,
    lastCommit,
    gitData,
    ctx,
    transformer
  });

  if (conflicts.length && !input.force) {
    const outputContentProcessor = await createOutputContentProcessor(ctx, transformer);
    const contentPieceIds = conflicts.map((conflict) => conflict.contentPieceId);
    const contentPieces = await contentPiecesCollection
      .find({ _id: { $in: contentPieceIds } })
      .toArray();
    const contents = await contentsCollection
      .find({ contentPieceId: { $in: contentPieceIds } })
      .toArray();
    const currentContents = await outputContentProcessor.processBatch(
      conflicts
        .map((conflict) => {
          const contentPiece = contentPieces.find(
            (contentPiece) => `${contentPiece._id}` === `${conflict.contentPieceId}`
          );
          const { content } =
            contents.find(
              (content) => `${content.contentPieceId}` === `${conflict.contentPieceId}`
            ) || {};

          if (!contentPiece || !content) return null;

          return {
            buffer: Buffer.from(content.buffer),
            contentPiece
          };
        })
        .filter(Boolean) as OutputContentProcessorInput[]
    );

    return {
      status: "conflict",
      conflicted: await Promise.all(
        conflicts
          .map(async (conflict, index) => {
            return {
              path: conflict.path,
              contentPieceId: `${conflict.contentPieceId}`,
              currentContent: currentContents[index],
              pulledContent: conflict.pulledContent,
              pulledHash: conflict.pulledHash
            };
          })
          .filter(Boolean) as Array<
          Promise<{
            path: string;
            contentPieceId: string;
            currentContent: string;
            pulledContent: string;
            pulledHash: string;
          }>
        >
      )
    };
  }

  await applyPull();

  return { status: "pulled" };
};

export { inputSchema, outputSchema, handler };
