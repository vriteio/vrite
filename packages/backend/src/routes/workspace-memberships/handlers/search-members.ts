import { z } from "zod";
import { ObjectId } from "mongodb";
import { AuthenticatedContext } from "#lib/middleware";
import {
  FullWorkspaceMembership,
  contentPieceMember,
  getUsersCollection,
  getWorkspaceMembershipsCollection
} from "#collections";
import { UnderscoreID } from "#lib/mongo";
import { stringToRegex } from "#lib/utils";

const inputSchema = z.object({
  query: z.string().optional()
});
const outputSchema = z.array(contentPieceMember);
const handler = async (
  ctx: AuthenticatedContext,
  input: z.infer<typeof inputSchema>
): Promise<z.infer<typeof outputSchema>> => {
  const workspaceMembershipCollection = getWorkspaceMembershipsCollection(ctx.db);
  const usersCollection = getUsersCollection(ctx.db);
  const allMemberships = await workspaceMembershipCollection
    .find({
      workspaceId: ctx.auth.workspaceId
    })
    .toArray();
  const users = await usersCollection
    .find({
      _id: {
        $in: allMemberships.map(({ userId }) => userId).filter(Boolean) as ObjectId[]
      },
      ...(input.query ? { username: stringToRegex(input.query.toLowerCase()) } : {})
    })
    .limit(10)
    .sort("_id", -1)
    .toArray();
  const memberships = users
    .map((user) => {
      return allMemberships.find(({ userId }) => userId?.equals(user._id));
    })
    .filter(Boolean) as Array<UnderscoreID<FullWorkspaceMembership<ObjectId>>>;

  return memberships.map((membership) => {
    const user = users.find(({ _id }) => _id.equals(membership.userId!))!;

    return {
      id: `${membership._id}`,
      profile: {
        id: `${user._id}`,
        username: user.username,
        fullName: user.fullName,
        email: user.email,
        avatar: user.avatar
      }
    };
  });
};

export { inputSchema, outputSchema, handler };
