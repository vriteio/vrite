import { z } from "zod";
import { ObjectId } from "mongodb";
import { AuthenticatedContext } from "#lib/middleware";
import {
  getUsersCollection,
  getWorkspaceMembershipsCollection,
  workspaceMembership
} from "#collections";
import { zodId } from "#lib/mongo";

const inputSchema = z
  .object({
    perPage: z.number().default(20),
    page: z.number().default(1),
    lastId: zodId().optional()
  })
  .default({});
const outputSchema = z.array(
  workspaceMembership.extend({
    pendingInvite: z.boolean(),
    profile: z
      .object({
        fullName: z.string(),
        username: z.string(),
        avatar: z.string()
      })
      .partial()
      .optional()
  })
);
const handler = async (
  ctx: AuthenticatedContext,
  input: z.infer<typeof inputSchema>
): Promise<z.infer<typeof outputSchema>> => {
  const workspaceMembershipsCollection = getWorkspaceMembershipsCollection(ctx.db);
  const usersCollection = getUsersCollection(ctx.db);
  const cursor = workspaceMembershipsCollection
    .find({
      workspaceId: ctx.auth.workspaceId,
      ...(input.lastId ? { _id: { $lt: new ObjectId(input.lastId) } } : {})
    })
    .sort("_id", -1);

  if (!input.lastId) {
    cursor.skip((input.page - 1) * input.perPage);
  }

  const workspaceMemberships = await cursor.limit(input.perPage).toArray();
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
      username?: string;
      avatar?: string;
    } | null = null;

    if (workspaceMembership.userId) {
      const user = users.find(({ _id }) => _id.equals(workspaceMembership.userId!)) || null;

      profile = {
        fullName: user?.fullName,
        username: user?.username,
        avatar: user?.avatar
      };
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
