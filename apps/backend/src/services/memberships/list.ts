import { toMembershipID, toRoleID, toUUID, toUserID } from "#backend/lib/primitives";
import { db } from "#backend/lib/adapters";
import { type Membership, memberships, roles, type UserProfile, users } from "#backend/db";
import { withAuthorization } from "#backend/lib/policy";
import { eq } from "drizzle-orm";

interface MemberDetails extends Membership {
  roleName?: string;
  admin?: boolean;
  profile: UserProfile;
}

const listMembersOperation = async (input: {
  workspaceID: string;
}): Promise<{ members: MemberDetails[] }> => {
  const rows = await db
    .select({
      id: memberships.id,
      userID: memberships.userID,
      roleID: memberships.roleID,
      roleName: roles.name,
      baseRole: roles.baseRole,
      userName: users.name,
      userEmail: users.email,
      userImage: users.image
    })
    .from(memberships)
    .innerJoin(users, eq(users.id, memberships.userID))
    .innerJoin(roles, eq(roles.id, memberships.roleID))
    .where(eq(memberships.workspaceID, toUUID(input.workspaceID)));

  return {
    members: rows.map((row) => ({
      id: toMembershipID(row.id),
      userID: toUserID(row.userID),
      roleID: toRoleID(row.roleID),
      roleName: row.roleName,
      admin: row.baseRole === "admin",
      profile: {
        id: toUserID(row.userID),
        name: row.userName,
        email: row.userEmail,
        ...(row.userImage && { image: row.userImage })
      }
    }))
  };
};
const listMembers = withAuthorization<
  Record<never, never>,
  undefined,
  { members: MemberDetails[] }
>({ permissions: { session: ["workspace"], key: ["read:memberships"] } }, async ({ workspaceID }) =>
  listMembersOperation({ workspaceID })
);

export { listMembers };
export type { MemberDetails };
