import { z } from "zod";
import { Binary } from "mongodb";
import {
  getGitDataCollection,
  getContentsCollection,
  getContentPiecesCollection,
  getContentPieceVariantsCollection,
  getContentVariantsCollection
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
        variantId: zodId().optional(),
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
  const contentVariantsCollection = getContentVariantsCollection(ctx.db);
  const contentPieceVariantsCollection = getContentPieceVariantsCollection(ctx.db);
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
    const contentDataVariantsFilter = {
      $or: conflicts
        .filter((conflict) => conflict.variantId)
        .map((conflict) => {
          return {
            contentPieceId: conflict.contentPieceId,
            variantId: conflict.variantId
          };
        })
    };
    const contentPieces = await contentPiecesCollection
      .find({
        _id: {
          $in: conflicts.map((conflict) => conflict.contentPieceId)
        }
      })
      .toArray();
    const contents = await contentsCollection
      .find({
        contentPieceId: {
          $in: conflicts
            .filter((conflict) => !conflict.variantId)
            .map((conflict) => conflict.contentPieceId)
        }
      })
      .toArray();
    const contentPieceVariants = await contentPieceVariantsCollection
      .find(contentDataVariantsFilter)
      .toArray();
    const contentVariants = await contentVariantsCollection
      .find(contentDataVariantsFilter)
      .toArray();
    const currentContents = await outputContentProcessor.processBatch(
      conflicts
        .map((conflict) => {
          const baseContentPiece = contentPieces.find(
            (contentPiece) => `${contentPiece._id}` === `${conflict.contentPieceId}`
          );

          let contentPiece = baseContentPiece;
          let contentBuffer: Uint8Array | null = null;

          if (conflict.variantId) {
            const contentPieceVariant = contentPieceVariants.find((contentPiece) => {
              return (
                `${contentPiece.contentPieceId}` === `${conflict.contentPieceId}` &&
                `${contentPiece.variantId}` === `${conflict.variantId}`
              );
            });

            if (baseContentPiece && contentPieceVariant) {
              contentPiece = {
                ...baseContentPiece,
                ...contentPieceVariant
              };
            }

            contentBuffer =
              (
                contentVariants.find((content) => {
                  return (
                    `${content.contentPieceId}` === `${conflict.contentPieceId}` &&
                    `${content.variantId}` === `${conflict.variantId}`
                  );
                }) || {}
              ).content?.buffer || null;
          } else {
            contentBuffer =
              (
                contents.find(
                  (content) => `${content.contentPieceId}` === `${conflict.contentPieceId}`
                ) || {}
              ).content?.buffer || null;
          }

          if (!contentPiece || !contentBuffer) return null;

          return {
            buffer: Buffer.from(contentBuffer),
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
              variantId: conflict.variantId ? `${conflict.variantId}` : undefined,
              currentContent: currentContents[index],
              pulledContent: conflict.pulledContent,
              pulledHash: conflict.pulledHash
            };
          })
          .filter(Boolean) as Array<
          Promise<{
            path: string;
            contentPieceId: string;
            variantId?: string;
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
