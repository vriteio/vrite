import { membershipDB, toUserID, workspacesDB, toWorkspaceID } from "#backend/db";
import { toUUID } from "#backend/lib/mongo";

const listAllWorkspaces = async (userIDs: string[]) => {
  const ids = userIDs.map((id) => toUUID(id));
  const memberships = await membershipDB.find({ userID: { $in: ids } }).toArray();

  if (memberships.length === 0) return [];

  const workspaceIDs = [...new Set(memberships.map((m) => m.workspaceID.toString()))].map(
    (id) => toUUID(id)
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
        userID: toUserID(m.userID)
      };
    })
    .filter(Boolean);
};

export { listAllWorkspaces };
