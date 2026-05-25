import { membershipDB, workspacesDB, toWorkspaceID } from "#backend/db";
import { toObjectID } from "#backend/lib/mongo";

const listWorkspaces = async (input: { userIDs: string[] }) => {
  const userIDs = input.userIDs.map((id) => toObjectID(id));
  const memberships = await membershipDB.find({ userID: { $in: userIDs } }).toArray();

  if (memberships.length === 0) return [];

  const workspaceIDs = [...new Set(memberships.map((m) => toWorkspaceID(m.workspaceID)))].map(
    (id) => {
      return toObjectID(id);
    }
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
    .filter(
      (
        workspace
      ): workspace is {
        id: string;
        name: string;
        userID: string;
      } => workspace !== null
    );
};

export { listWorkspaces };
