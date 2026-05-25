import {
  FullWorkspace,
  FullRole,
  usersDB,
  workspacesDB,
  rolesDB,
  membershipDB,
  workspaceID
} from "#backend/db";
import { toObjectID, UnderscoreID } from "#backend/lib/mongo";
import { ObjectId } from "mongodb";
import { status } from "elysia";

const createWorkspace = async (input: {
  adminUserID: string;
}): Promise<{
  workspaceID: string;
}> => {
  const user = await usersDB.findOne({
    _id: toObjectID(input.adminUserID)
  });

  if (!user) throw status("Not Found");

  const workspace: UnderscoreID<FullWorkspace<ObjectId>> = {
    _id: new ObjectId(),
    name: `${user.username}`,
    settings: { prettierConfig: "{}" }
  };
  const baseRoles: Array<UnderscoreID<FullRole<ObjectId>>> = [
    {
      _id: new ObjectId(),
      workspaceID: workspace._id,
      name: "Editor",
      permissions: [] //["editing", "organization"]
    }
  ];

  await workspacesDB.insertOne(workspace);
  await rolesDB.insertMany(baseRoles);
  await membershipDB.insertOne({
    _id: new ObjectId(),
    userID: user._id,
    workspaceID: workspace._id,
    admin: true
  });

  return { workspaceID: workspaceID(workspace._id) };
};

export { createWorkspace };
