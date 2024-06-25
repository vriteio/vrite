import { z } from "zod";
import { ObjectId } from "mongodb";
import { JSONContent } from "@vrite/sdk/api";
import {
  getVersionsCollection,
  getContentVersionsCollection,
  getContentsCollection,
  getContentVariantsCollection
} from "#collections";
import { errors } from "#lib/errors";
import { AuthenticatedContext } from "#lib/middleware";
import { zodId } from "#lib/mongo";
import { bufferToJSON, generateDiffDocument } from "#lib/content-processing";

const inputSchema = z.object({
  id: zodId().describe("ID of the version to generate diff document for"),
  against: z
    .enum(["latest", "previous"])
    .describe("What to diff the version against")
    .default("latest")
});
const outputSchema = z.any();
const handler = async (
  ctx: AuthenticatedContext,
  input: z.infer<typeof inputSchema>
): Promise<z.infer<typeof outputSchema>> => {
  const versionsCollection = getVersionsCollection(ctx.db);
  const contentVersionsCollection = getContentVersionsCollection(ctx.db);
  const contentsCollection = getContentsCollection(ctx.db);
  const contentVariantsCollection = getContentVariantsCollection(ctx.db);
  const version = await versionsCollection.findOne({
    _id: new ObjectId(input.id),
    workspaceId: ctx.auth.workspaceId
  });

  if (!version) throw errors.notFound("version");

  let versionContent: JSONContent | null = null;
  let referenceContent: JSONContent | null = null;

  const contentVersion = await contentVersionsCollection.findOne({
    versionId: version._id
  });

  if (contentVersion) {
    versionContent = bufferToJSON(Buffer.from(contentVersion.content.buffer));
  }

  if (input.against === "latest") {
    if (version.variantId) {
      const { content } =
        (await contentVariantsCollection.findOne({
          contentPieceId: new ObjectId(version.contentPieceId),
          variantId: new ObjectId(version.variantId)
        })) || {};

      referenceContent = content ? bufferToJSON(Buffer.from(content.buffer)) : null;
    } else {
      const { content } =
        (await contentsCollection.findOne({
          contentPieceId: new ObjectId(version.contentPieceId)
        })) || {};

      referenceContent = content ? bufferToJSON(Buffer.from(content.buffer)) : null;
    }
  } else {
    const all = await versionsCollection
      .find({
        contentPieceId: version.contentPieceId,
        workspaceId: ctx.auth.workspaceId,
        variantId: version.variantId,
        date: { $lt: version.date }
      })
      .sort({ date: -1 })
      .limit(1)
      .toArray();
    const [previousVersion] = all;

    if (previousVersion) {
      const { content } =
        (await contentVersionsCollection.findOne({
          versionId: previousVersion._id
        })) || {};

      referenceContent = content ? bufferToJSON(Buffer.from(content.buffer)) : null;
    }
  }

  if (!referenceContent) {
    referenceContent = { type: "doc", content: [] };
  }

  if (!versionContent || !referenceContent) {
    throw errors.notFound("content");
  }

  if (input.against === "latest") {
    return generateDiffDocument(versionContent, referenceContent);
  } else {
    return generateDiffDocument(referenceContent, versionContent);
  }
};

export { inputSchema, outputSchema, handler };
