import { z } from "zod";
import { ObjectId } from "mongodb";
import {
  getVersionsCollection,
  getContentVersionsCollection,
  getContentsCollection,
  getContentVariantsCollection
} from "#collections";
import { errors } from "#lib/errors";
import { AuthenticatedContext } from "#lib/middleware";
import { zodId } from "#lib/mongo";

const inputSchema = z.object({
  id: zodId().describe("ID of the version to restore")
});
const handler = async (
  ctx: AuthenticatedContext,
  input: z.infer<typeof inputSchema>
): Promise<void> => {
  const versionsCollection = getVersionsCollection(ctx.db);
  const contentVersionsCollection = getContentVersionsCollection(ctx.db);
  const contentsCollection = getContentsCollection(ctx.db);
  const contentVariantsCollection = getContentVariantsCollection(ctx.db);
  const version = await versionsCollection.findOne({
    _id: new ObjectId(input.id),
    workspaceId: ctx.auth.workspaceId
  });

  if (!version) throw errors.notFound("version");

  const contentVersion = await contentVersionsCollection.findOne({
    versionId: version._id
  });

  if (version.variantId) {
    await contentVariantsCollection.updateOne(
      {
        contentPieceId: new ObjectId(version.contentPieceId),
        variantId: new ObjectId(version.variantId)
      },
      { $set: { content: contentVersion?.content } }
    );
  } else {
    await contentsCollection.updateOne(
      { contentPieceId: new ObjectId(version.contentPieceId) },
      { $set: { content: contentVersion?.content } }
    );
  }
};

export { inputSchema, handler };
