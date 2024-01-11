import { z } from "zod";
import {
  getContentPiecesCollection,
  getContentsCollection,
  getGitDataCollection
} from "#collections";
import { publishGitDataEvent } from "#events";
import { errors } from "#lib/errors";
import { AuthenticatedContext } from "#lib/middleware";
import {
  OutputContentProcessorInput,
  createOutputContentProcessor,
  useGitSyncIntegration
} from "#lib/git-sync";

const inputSchema = z.object({
  message: z.string()
});
const outputSchema = z.object({
  status: z.enum(["stale", "success"])
});
const handler = async (
  ctx: AuthenticatedContext,
  input: z.infer<typeof inputSchema>
): Promise<z.infer<typeof outputSchema>> => {
  const contentsCollection = getContentsCollection(ctx.db);
  const contentPiecesCollection = getContentPiecesCollection(ctx.db);
  const gitDataCollection = getGitDataCollection(ctx.db);
  const gitData = await gitDataCollection.findOne({ workspaceId: ctx.auth.workspaceId });

  if (!gitData) throw errors.notFound("gitDate");

  const gitSyncIntegration = useGitSyncIntegration(ctx, gitData);

  if (!gitSyncIntegration) throw errors.serverError();

  const changedRecords = gitSyncIntegration.getRecords().filter((record) => {
    return record.currentHash !== record.syncedHash;
  });
  const outputContentProcessor = await createOutputContentProcessor(
    ctx,
    gitSyncIntegration.getTransformer()
  );
  const additions: Array<{ path: string; contents: OutputContentProcessorInput }> = [];
  const deletions: Array<{ path: string }> = [];

  for await (const record of changedRecords) {
    const { content } =
      (await contentsCollection.findOne({
        contentPieceId: record.contentPieceId
      })) || {};
    const contentPiece = await contentPiecesCollection.findOne({
      _id: record.contentPieceId
    });

    if (record.currentHash === "") {
      deletions.push({
        path: record.path.startsWith("/") ? record.path.slice(1) : record.path
      });

      continue;
    }

    if (content && contentPiece) {
      additions.push({
        path: record.path.startsWith("/") ? record.path.slice(1) : record.path,
        contents: {
          buffer: Buffer.from(content.buffer),
          contentPiece
        }
      });
    }
  }

  const additionsContents: string[] = await outputContentProcessor.processBatch(
    additions.map(({ contents }) => contents)
  );
  const additionsWithContents = additions.map((addition, index) => ({
    path: addition.path,
    contents: additionsContents[index]
  }));
  const { commit, status } = await gitSyncIntegration.commit({
    message: input.message,
    additions: additionsWithContents,
    deletions
  });

  if (!commit) throw errors.serverError();
  if (status === "stale") return { status: "stale" };

  const outputRecords = gitData.records
    .filter((record) => {
      return record.currentHash;
    })
    .map((record) => ({
      ...record,
      syncedHash: record.currentHash
    }));

  await gitDataCollection.updateOne(
    { workspaceId: ctx.auth.workspaceId },
    {
      $set: {
        records: outputRecords,
        lastCommitId: commit.id,
        lastCommitDate: commit.date
      }
    }
  );
  publishGitDataEvent(ctx, `${ctx.auth.workspaceId}`, {
    action: "update",
    data: {
      records: outputRecords.map((record) => ({
        ...record,
        contentPieceId: `${record.contentPieceId}`,
        variantId: record.variantId ? `${record.variantId}` : undefined
      }))
    }
  });

  return { status: "success" };
};

export { inputSchema, outputSchema, handler };
