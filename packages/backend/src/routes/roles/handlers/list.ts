import { z } from "zod";
import { Filter, ObjectId } from "mongodb";
import { AuthenticatedContext } from "#lib/middleware";
import { role, baseRoleType, getRolesCollection, FullRole } from "#collections";
import { UnderscoreID, zodId } from "#lib/mongo";

const inputSchema = z
  .object({
    perPage: z.number().describe("Number of roles per page").default(20),
    page: z.number().describe("Page number to fetch").default(1),
    lastId: zodId().describe("Last role ID to start fetching roles from").optional()
  })
  .default({});
const outputSchema = z.array(
  role.extend({ baseType: baseRoleType.describe("Type of the base role").optional() })
);
const handler = async (
  ctx: AuthenticatedContext,
  input: z.infer<typeof inputSchema>
): Promise<z.infer<typeof outputSchema>> => {
  const rolesCollection = getRolesCollection(ctx.db);
  const filter: Filter<UnderscoreID<FullRole<ObjectId>>> = {
    workspaceId: ctx.auth.workspaceId
  };
  const cursor = rolesCollection
    .find({
      ...filter,
      ...(input.lastId && { _id: { $lt: new ObjectId(input.lastId) } })
    })
    .sort({ _id: -1 });

  if (!input.lastId && input.perPage) {
    cursor.skip((input.page - 1) * input.perPage);
  }

  let roles: Array<UnderscoreID<FullRole<ObjectId>>> = [];

  if (input.perPage) {
    roles = await cursor.limit(input.perPage).toArray();
  } else {
    roles = await cursor.toArray();
  }

  let totalCount = 0;

  if (input.perPage) {
    totalCount += (input.page - 1) * input.perPage + roles.length;

    if (roles.length === input.perPage) {
      totalCount += await rolesCollection.countDocuments(filter, { skip: totalCount });
    }
  } else {
    totalCount = roles.length;
  }

  ctx.res.headers({
    "x-pagination-total": totalCount,
    "x-pagination-pages": Math.ceil(totalCount / (input.perPage || 1)),
    "x-pagination-per-page": input.perPage,
    "x-pagination-page": input.page
  });

  return roles.map(({ _id, workspaceId, ...role }) => ({
    id: `${_id}`,
    ...role
  }));
};

export { inputSchema, outputSchema, handler };
