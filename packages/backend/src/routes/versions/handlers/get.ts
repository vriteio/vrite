import { z } from "zod";
import { ObjectId } from "mongodb";
import {
  version,
  versionMember,
  getVersionsCollection,
  getContentVersionsCollection
} from "#collections";
import { errors } from "#lib/errors";
import { AuthenticatedContext } from "#lib/middleware";
import { zodId } from "#lib/mongo";
import { fetchEntryMembers } from "#lib/utils";
import { DocJSON, bufferToJSON } from "#lib/content-processing";

const inputSchema = z.object({
  id: zodId().describe("ID of the version"),
  content: z.boolean().describe("Whether to fetch the JSON content").default(false)
});
const outputSchema = version.omit({ members: true }).extend({
  members: z.array(versionMember),
  content: z.record(z.string(), z.any()).describe("JSON content of the version").optional()
});
const handler = async (
  ctx: AuthenticatedContext,
  input: z.infer<typeof inputSchema>
): Promise<z.infer<typeof outputSchema>> => {
  const versionsCollection = getVersionsCollection(ctx.db);
  const version = await versionsCollection.findOne({
    _id: new ObjectId(input.id),
    workspaceId: ctx.auth.workspaceId
  });

  if (!version) throw errors.notFound("version");

  let content: DocJSON | null = null;

  if (input.content) {
    const contentVersionsCollection = getContentVersionsCollection(ctx.db);

    if (!content) {
      const retrievedContent = await contentVersionsCollection.findOne({
        versionId: new ObjectId(input.id)
      });

      if (retrievedContent && retrievedContent.content) {
        content = bufferToJSON(Buffer.from(retrievedContent.content.buffer));
      } else {
        content = { type: "doc", content: [] };
      }
    }
  }

  const members = await fetchEntryMembers(ctx.db, version);

  return {
    id: `${version._id}`,
    contentPieceId: `${version.contentPieceId}`,
    date: version.date.toISOString(),
    members,
    label: version.label,
    ...(content ? { content } : {}),
    ...(version.variantId && { variantId: `${version.variantId}` })
  };
};

export { inputSchema, outputSchema, handler };
