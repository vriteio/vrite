import { z } from "zod";
import { Filter, ObjectId } from "mongodb";
import {
  FullVersion,
  getContentVersionsCollection,
  getVersionsCollection,
  version,
  versionMember
} from "#collections";
import { AuthenticatedContext } from "#lib/middleware";
import { UnderscoreID, zodId } from "#lib/mongo";
import { fetchEntryMembers } from "#lib/utils";
import { DocJSON, bufferToJSON } from "#lib/content-processing";

const inputSchema = z.object({
  contentPieceId: zodId(),
  variantId: zodId().optional(),
  perPage: z.number().describe("Number of content pieces per page").default(20),
  page: z.number().describe("Page number to fetch").default(1),
  lastId: zodId().describe("Last token ID to starting fetching tokens from").optional(),
  content: z.boolean().describe("Whether to fetch the JSON content").default(false)
});
const outputSchema = z.array(
  version.omit({ members: true }).extend({
    members: z.array(versionMember),
    content: z.record(z.string(), z.any()).describe("JSON content of the version").optional()
  })
);
const handler = async (
  ctx: AuthenticatedContext,
  input: z.infer<typeof inputSchema>
): Promise<z.infer<typeof outputSchema>> => {
  const versionsCollection = getVersionsCollection(ctx.db);
  const filter: Filter<UnderscoreID<FullVersion<ObjectId>>> = {
    workspaceId: ctx.auth.workspaceId,
    contentPieceId: new ObjectId(input.contentPieceId),
    ...(input.variantId ? { variantId: new ObjectId(input.variantId) } : {})
  };
  const cursor = versionsCollection
    .find({
      ...filter,
      ...(input.lastId ? { _id: { $lt: new ObjectId(input.lastId) } } : {})
    })
    .sort({ date: -1 });
  const contents = new Map<string, DocJSON>();

  if (!input.lastId && input.perPage) {
    cursor.skip((input.page - 1) * input.perPage);
  }

  let versions: Array<UnderscoreID<FullVersion<ObjectId>>> = [];

  if (input.perPage) {
    versions = await cursor.limit(input.perPage).toArray();
  } else {
    versions = await cursor.toArray();
  }

  let totalCount = 0;

  if (input.perPage) {
    totalCount += (input.page - 1) * input.perPage + versions.length;

    if (versions.length === input.perPage) {
      totalCount += await versionsCollection.countDocuments(filter, { skip: totalCount });
    }
  } else {
    totalCount = versions.length;
  }

  ctx.res.headers({
    "x-pagination-total": totalCount,
    "x-pagination-pages": Math.ceil(totalCount / (input.perPage || 1)),
    "x-pagination-per-page": input.perPage,
    "x-pagination-page": input.page
  });

  if (input.content) {
    const versionContentsCollection = getContentVersionsCollection(ctx.db);
    const versionIds = versions.map((version) => version._id);
    const versionContents = await versionContentsCollection
      .find({
        versionId: { $in: versionIds }
      })
      .toArray();

    versionContents.forEach(({ versionId, content }) => {
      if (content) {
        contents.set(`${versionId}`, bufferToJSON(Buffer.from(content.buffer)));
      }
    });
  }

  return await Promise.all(
    versions.map(async (version) => {
      const members = await fetchEntryMembers(ctx.db, version);
      const content = contents.get(`${version._id}`);

      return {
        id: `${version._id}`,
        contentPieceId: `${version.contentPieceId}`,
        date: version.date.toISOString(),
        members,
        label: version.label,
        ...(version.variantId && { variantId: `${version.variantId}` }),
        ...(input.content && content ? { content } : {})
      };
    })
  );
};

export { inputSchema, outputSchema, handler };
