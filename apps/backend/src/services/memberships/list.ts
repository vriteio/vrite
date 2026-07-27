import {
  membershipDB,
  toMembershipID,
  rolesDB,
  toRoleID,
  usersDB,
  toUserID,
  UserProfile,
  Membership
} from "#backend/db";
import { toUUID } from "#backend/lib/mongo";

interface MemberDetails extends Membership {
  roleName?: string;
  admin?: boolean;
  profile: UserProfile;
}

const listMembers = async (input: { workspaceID: string }): Promise<MemberDetails[]> => {
  const workspaceUUID = toUUID(input.workspaceID);
  const memberships = await membershipDB.find({ workspaceID: workspaceUUID }).toArray();

  const userIDs = memberships.map((m) => m.userID);
  const roleIDs = memberships.filter((m) => m.roleID).map((m) => m.roleID!);

  const [users, roles] = await Promise.all([
    usersDB.find({ _id: { $in: userIDs } }).toArray(),
    roleIDs.length > 0 ? rolesDB.find({ _id: { $in: roleIDs } }).toArray() : Promise.resolve([])
  ]);
  const userMap = new Map(users.map((user) => [toUserID(user._id), user]));
  const roleMap = new Map(roles.map((role) => [toRoleID(role._id), role]));

  return memberships
    .map((membership) => {
      const user = userMap.get(toUserID(membership.userID));
      const role = membership.roleID ? roleMap.get(toRoleID(membership.roleID)) : undefined;

      if (!user) return null;

      return {
        id: toMembershipID(membership._id),
        userID: toUserID(membership.userID),
        roleID: membership.roleID ? toRoleID(membership.roleID) : undefined,
        roleName: role?.name,
        admin: role?.baseRole === "admin",
        profile: {
          id: toUserID(user._id),
          name: user.name || "",
          email: user.email || "",
          image: user.image || ""
        }
      } as MemberDetails;
    })
    .filter((m): m is MemberDetails => m !== null);
};

export { listMembers };
export type { MemberDetails };
