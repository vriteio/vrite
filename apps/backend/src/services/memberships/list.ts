import {
  membershipDB,
  toMembershipID,
  rolesDB,
  toRoleID,
  usersDB,
  toUserID,
  UserProfile
} from "#backend/db";
import { toObjectID } from "#backend/lib/mongo";

interface MemberDetails {
  id: string;
  userID: string;
  roleID?: string;
  roleName?: string;
  admin?: boolean;
  profile: UserProfile;
}

const listMembers = async (input: { workspaceID: string }): Promise<MemberDetails[]> => {
  const workspaceOID = toObjectID(input.workspaceID);
  const memberships = await membershipDB.find({ workspaceID: workspaceOID }).toArray();

  const userIDs = memberships.map((m) => m.userID);
  const roleIDs = memberships.filter((m) => m.roleID).map((m) => m.roleID!);

  const [users, roles] = await Promise.all([
    usersDB.find({ _id: { $in: userIDs } }).toArray(),
    roleIDs.length > 0 ? rolesDB.find({ _id: { $in: roleIDs } }).toArray() : Promise.resolve([])
  ]);

  const userMap = new Map(users.map((u) => [u._id.toHexString(), u]));
  const roleMap = new Map(roles.map((r) => [r._id.toHexString(), r]));

  return memberships
    .map((m) => {
      const user = userMap.get(m.userID.toHexString());
      const role = m.roleID ? roleMap.get(m.roleID.toHexString()) : undefined;

      if (!user) return null;

      return {
        id: toMembershipID(m._id),
        userID: toUserID(m.userID),
        roleID: m.roleID ? toRoleID(m.roleID) : undefined,
        roleName: role?.name,
        admin: role?.baseRole === "admin",
        profile: {
          id: toUserID(user?._id),
          name: user?.name || "",
          email: user?.email || "",
          image: user?.image || ""
        }
      } as MemberDetails;
    })
    .filter((m): m is MemberDetails => m !== null);
};

export { listMembers };
export type { MemberDetails };
