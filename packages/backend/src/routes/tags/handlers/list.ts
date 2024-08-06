import { z } from "zod";
import { Filter, ObjectId } from "mongodb";
import { AuthenticatedContext } from "#lib/middleware";
import { FullTag, getTagsCollection, tag } from "#collections";
import { UnderscoreID } from "#lib/mongo";

const inputSchema = z.object({
  perPage: z.number().describe("The number of tags to return per page").default(20),
  page: z.number().describe("The page number to fetch").default(1)
});
const outputSchema = z.array(tag);
const handler = async (
  ctx: AuthenticatedContext,
  input: z.infer<typeof inputSchema>
): Promise<z.infer<typeof outputSchema>> => {
  const tagsCollection = getTagsCollection(ctx.db);
  const filter: Filter<UnderscoreID<FullTag<ObjectId>>> = {
    workspaceId: ctx.auth.workspaceId
  };
  const cursor = tagsCollection.find(filter).sort({ _id: -1 });

  if (input.perPage) {
    cursor.skip((input.page - 1) * input.perPage);
  }

  let tags: Array<UnderscoreID<FullTag<ObjectId>>> = [];

  if (input.perPage) {
    tags = await cursor.limit(input.perPage).toArray();
  } else {
    tags = await cursor.toArray();
  }

  let totalCount = 0;

  if (input.perPage) {
    totalCount += (input.page - 1) * input.perPage + tags.length;

    if (tags.length === input.perPage) {
      totalCount += await tagsCollection.countDocuments(filter, { skip: totalCount });
    }
  } else {
    totalCount = tags.length;
  }

  ctx.res.headers({
    "x-pagination-total": totalCount,
    "x-pagination-pages": Math.ceil(totalCount / (input.perPage || 1)),
    "x-pagination-per-page": input.perPage,
    "x-pagination-page": input.page
  });

  return tags.map((tag) => {
    return { ...tag, id: `${tag._id}` };
  });
};

export { inputSchema, outputSchema, handler };
