import { z } from "zod";
import { ObjectId } from "mongodb";
import { AuthenticatedContext } from "#lib/middleware";
import { role, baseRoleType, getRolesCollection } from "#collections";
import { zodId } from "#lib/mongo";

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
  const cursor = rolesCollection
    .find({
      workspaceId: ctx.auth.workspaceId,
      ...(input.lastId && { _id: { $lt: new ObjectId(input.lastId) } })
    })
    .sort({ _id: -1 });

  if (!input.lastId) {
    cursor.skip((input.page - 1) * input.perPage);
  }

  const roles = await cursor.limit(input.perPage).toArray();

  return roles.map(({ _id, workspaceId, ...role }) => ({
    id: `${_id}`,
    ...role
  }));
};

export { inputSchema, outputSchema, handler };
