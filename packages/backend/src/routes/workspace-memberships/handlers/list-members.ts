import { z } from "zod";
import { Filter, ObjectId } from "mongodb";
import { AuthenticatedContext } from "#lib/middleware";
import {
  FullWorkspaceMembership,
  getUsersCollection,
  getWorkspaceMembershipsCollection,
  profile,
  workspaceMembership
} from "#collections";
import { UnderscoreID, zodId } from "#lib/mongo";

const inputSchema = z
  .object({
    perPage: z.number().describe("Number of members to return per page").default(20),
    page: z.number().describe("Page number to fetch").default(1),
    lastId: zodId().describe("Last member ID to starting fetching members from").optional()
  })
  .default({});
const outputSchema = z.array(
  workspaceMembership.extend({
    pendingInvite: z.boolean().describe("Whether the member has a pending invite"),
    profile: profile.pick({ fullName: true, username: true, avatar: true }).optional()
  })
);
const handler = async (
  ctx: AuthenticatedContext,
  input: z.infer<typeof inputSchema>
): Promise<z.infer<typeof outputSchema>> => {
  const workspaceMembershipsCollection = getWorkspaceMembershipsCollection(ctx.db);
  const usersCollection = getUsersCollection(ctx.db);
  const filter: Filter<UnderscoreID<FullWorkspaceMembership<ObjectId>>> = {
    workspaceId: ctx.auth.workspaceId
  };
  const cursor = workspaceMembershipsCollection
    .find({
      ...filter,
      ...(input.lastId ? { _id: { $lt: new ObjectId(input.lastId) } } : {})
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

  const users = await usersCollection
    .find({
      _id: {
        $in: workspaceMemberships
          .map((workspaceMembership) => workspaceMembership.userId)
          .filter((value) => value) as ObjectId[]
      }
    })
    .toArray();

  return workspaceMemberships.map((workspaceMembership) => {
    let profile: {
      fullName?: string;
      username: string;
      avatar?: string;
    } | null = null;

    if (workspaceMembership.userId) {
      const user = users.find(({ _id }) => _id.equals(workspaceMembership.userId!)) || null;

      if (user) {
        profile = {
          fullName: user?.fullName,
          username: user?.username,
          avatar: user?.avatar
        };
      }
    }

    return {
      id: `${workspaceMembership._id}`,
      userId: workspaceMembership.userId ? `${workspaceMembership.userId}` : undefined,
      roleId: `${workspaceMembership.roleId}`,
      email: workspaceMembership.email,
      name: workspaceMembership.name,
      pendingInvite: Boolean(workspaceMembership.inviteVerificationCode),
      ...(profile ? { profile } : {})
    };
  });
};

export { inputSchema, outputSchema, handler };
