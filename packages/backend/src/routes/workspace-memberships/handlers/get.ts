import { z } from "zod";
import { ObjectId } from "mongodb";
import { AuthenticatedContext } from "#lib/middleware";
import {
  getUsersCollection,
  getWorkspaceMembershipsCollection,
  workspaceMembership
} from "#collections";
import { zodId } from "#lib/mongo";
import { errors } from "#lib/errors";

const inputSchema = z.object({ userId: zodId() }).or(z.void());
const outputSchema = workspaceMembership;
const handler = async (
  ctx: AuthenticatedContext,
  input: z.infer<typeof inputSchema>
): Promise<z.infer<typeof outputSchema>> => {
  const workspaceMembershipCollection = getWorkspaceMembershipsCollection(ctx.db);
  const usersCollection = getUsersCollection(ctx.db);
  const workspaceMembership = await workspaceMembershipCollection.findOne({
    workspaceId: ctx.auth.workspaceId,
    userId: new ObjectId(input?.userId || ctx.auth.userId)
  });

  if (!workspaceMembership) throw errors.notFound("membership");

  const user = await usersCollection.findOne({ _id: workspaceMembership.userId });

  if (!user) throw errors.notFound("user");

  return {
    id: `${workspaceMembership._id}`,
    userId: `${workspaceMembership.userId}`,
    roleId: `${workspaceMembership.roleId}`
  };
};

export { inputSchema, outputSchema, handler };
