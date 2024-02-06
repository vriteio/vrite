import { z } from "zod";
import { ObjectId } from "mongodb";
import { AuthenticatedContext } from "#lib/middleware";
import { getExtensionsCollection, getContentPiecesCollection } from "#collections";
import { publishContentPieceEvent } from "#events";
import { errors } from "#lib/errors";
import { zodId } from "#lib/mongo";

const inputSchema = z.object({
  contentPieceId: zodId(),
  extensionId: zodId().optional(),
  data: z.any()
});
const handler = async (
  ctx: AuthenticatedContext,
  input: z.infer<typeof inputSchema>
): Promise<void> => {
  const extensionId = input.extensionId || ctx.req.headers["x-vrite-extension-id"];
  const extensionsCollection = getExtensionsCollection(ctx.db);
  const contentPiecesCollection = getContentPiecesCollection(ctx.db);

  if (!extensionId || typeof extensionId !== "string") throw errors.invalid("extensionId");

  const extension = await extensionsCollection.findOne({
    _id: new ObjectId(extensionId),
    workspaceId: ctx.auth.workspaceId
  });

  if (!extension) throw errors.notFound("extension");

  const contentPiece = await contentPiecesCollection.findOne({
    _id: new ObjectId(input.contentPieceId),
    workspaceId: ctx.auth.workspaceId
  });

  if (!contentPiece) throw errors.notFound("content piece");

  await contentPiecesCollection.updateOne(
    {
      _id: new ObjectId(input.contentPieceId)
    },
    {
      $set: {
        [`customData.__extensions__.${extension.name}`]: input.data
      }
    }
  );
  publishContentPieceEvent(ctx, `${contentPiece.contentGroupId}`, {
    action: "update",
    userId: `${ctx.auth.userId}`,
    data: {
      id: `${contentPiece._id}`,
      customData: {
        ...contentPiece.customData,
        __extensions__: {
          ...(contentPiece.customData?.__extensions__ || {}),
          [extension.name]: input.data
        }
      }
    }
  });
};

export { inputSchema, handler };
