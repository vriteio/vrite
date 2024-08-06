import { z } from "zod";
import { Filter, ObjectId } from "mongodb";
import { AuthenticatedContext } from "#lib/middleware";
import {
  workspace,
  getWorkspaceMembershipsCollection,
  getWorkspacesCollection,
  getRolesCollection,
  role,
  FullWorkspaceMembership
} from "#collections";
import { UnderscoreID, zodId } from "#lib/mongo";

const inputSchema = z
  .object({
    perPage: z.number().describe("Number of workspaces to return per page").default(20),
    page: z.number().describe("Page number to fetch").default(1),
    lastId: zodId().describe("Last workspace ID to starting fetching workspaces from").optional()
  })
  .default({});
const outputSchema = z.array(
  z.object({
    id: zodId().describe("Workspace member ID"),
    workspace: workspace.omit({ contentGroups: true }),
    role: role.pick({ name: true, id: true }).optional()
  })
);
const handler = async (
  ctx: AuthenticatedContext,
  input: z.infer<typeof inputSchema>
): Promise<z.infer<typeof outputSchema>> => {
  const workspaceMembershipsCollection = getWorkspaceMembershipsCollection(ctx.db);
  const workspacesCollection = getWorkspacesCollection(ctx.db);
  const rolesCollection = getRolesCollection(ctx.db);
  const filter: Filter<UnderscoreID<FullWorkspaceMembership<ObjectId>>> = {
    userId: ctx.auth.userId
  };
  const cursor = workspaceMembershipsCollection
    .find({
      ...filter,
      ...(input.lastId && { _id: { $lt: new ObjectId(input.lastId) } })
    })
    .sort("_id", -1);

  if (!input.lastId && input.perPage) {
    cursor.skip((input.page - 1) * input.perPage);
  }

  let workspaceMemberships: Array<UnderscoreID<FullWorkspaceMembership<ObjectId>>> = [];

  if (input.perPage) {
    workspaceMemberships = await cursor.limit(input.perPage).toArray();
  } else {
    workspaceMemberships = await cursor.toArray();
  }

  let totalCount = 0;

  if (input.perPage) {
    totalCount += (input.page - 1) * input.perPage + workspaceMemberships.length;

    if (workspaceMemberships.length === input.perPage) {
      totalCount += await workspaceMembershipsCollection.countDocuments(filter, {
        skip: totalCount
      });
    }
  } else {
    totalCount = workspaceMemberships.length;
  }

  ctx.res.headers({
    "x-pagination-total": totalCount,
    "x-pagination-pages": Math.ceil(totalCount / (input.perPage || 1)),
    "x-pagination-per-page": input.perPage,
    "x-pagination-page": input.page
  });

  const workspaces = await workspacesCollection
    .find({
      _id: {
        $in: workspaceMemberships.map(({ workspaceId }) => workspaceId)
      }
    })
    .toArray();
  const roles = await rolesCollection
    .find({
      _id: {
        $in: workspaceMemberships.map(({ roleId }) => roleId)
      }
    })
    .toArray();

  return workspaceMemberships.map(({ _id, workspaceId, roleId }) => {
    const workspace = workspaces.find(({ _id }) => {
      return _id.equals(workspaceId);
    });
    const role = roles.find(({ _id }) => {
      return _id.equals(roleId);
    });
    const roleData = {
      id: `${role?._id || ""}`,
      name: `${role?.name || ""}`
    };

    return {
      id: `${_id}`,
      workspace: {
        id: `${workspace?._id || ""}`,
        name: `${workspace?.name || ""}`,
        description: `${workspace?.description || ""}`,
        logo: `${workspace?.logo || ""}`
      },
      ...(role ? { role: roleData } : {})
    };
  });
};

export { inputSchema, outputSchema, handler };
