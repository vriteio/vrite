import { z } from "zod";
import { Filter, ObjectId } from "mongodb";
import { AuthenticatedContext } from "#lib/middleware";
import { FullExtension, extension, getExtensionsCollection } from "#collections";
import { UnderscoreID } from "#lib/mongo";

const inputSchema = z
  .object({
    perPage: z.number().describe("Number of extensions per page").default(20),
    page: z.number().describe("Page number to fetch").default(1)
  })
  .default({});
const outputSchema = z.array(extension);
const handler = async (
  ctx: AuthenticatedContext,
  input: z.infer<typeof inputSchema>
): Promise<z.infer<typeof outputSchema>> => {
  const extensionsCollection = getExtensionsCollection(ctx.db);
  const filter: Filter<UnderscoreID<FullExtension<ObjectId>>> = {
    workspaceId: ctx.auth.workspaceId
  };
  const cursor = extensionsCollection.find(filter).sort({ _id: -1 });

  if (input.perPage) {
    cursor.skip((input.page - 1) * input.perPage);
  }

  let extensions: Array<UnderscoreID<FullExtension<ObjectId>>> = [];

  if (input.perPage) {
    extensions = await cursor.limit(input.perPage).toArray();
  } else {
    extensions = await cursor.toArray();
  }

  let totalCount = 0;

  if (input.perPage) {
    totalCount += (input.page - 1) * input.perPage + extensions.length;

    if (extensions.length === input.perPage) {
      totalCount += await extensionsCollection.countDocuments(filter, { skip: totalCount });
    }
  } else {
    totalCount = extensions.length;
  }

  ctx.res.headers({
    "x-pagination-total": totalCount,
    "x-pagination-pages": Math.ceil(totalCount / (input.perPage || 1)),
    "x-pagination-per-page": input.perPage,
    "x-pagination-page": input.page
  });

  return extensions.map(({ _id, workspaceId, ...extension }) => ({
    ...extension,
    id: `${_id}`
  }));
};

export { inputSchema, outputSchema, handler };
