import { membershipDB, workspacesDB, toWorkspaceID } from "#backend/db";
import { ObjectId } from "mongodb";

const listAllWorkspaces = async (userIDs: string[]) => {
  const objectIDs = userIDs.map((id) => new ObjectId(id));
  const memberships = await membershipDB.find({ userID: { $in: objectIDs } }).toArray();

  if (memberships.length === 0) return [];

  const workspaceIDs = [...new Set(memberships.map((m) => m.workspaceID.toString()))].map(
    (id) => new ObjectId(id)
  );
  const workspaces = await workspacesDB.find({ _id: { $in: workspaceIDs } }).toArray();
  const workspaceMap = new Map(workspaces.map((ws) => [ws._id.toString(), ws]));

  return memberships
    .map((m) => {
      const ws = workspaceMap.get(m.workspaceID.toString());

      if (!ws) return null;

      return {
        id: toWorkspaceID(ws._id),
        name: ws.name,
        userID: m.userID.toString()
      };
    })
    .filter(Boolean);
};

export { listAllWorkspaces };
