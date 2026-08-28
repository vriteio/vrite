import { withAuthorization } from "#backend/lib/policy";
import { toWorkspaceID } from "#backend/lib/primitives";
import { saveGroup, type SaveGroupInput, type SaveGroupResult } from "./update";

type CreateGroupInput = Omit<SaveGroupInput, "workspaceID">;

const createGroup = withAuthorization<CreateGroupInput, undefined, SaveGroupResult>(
  { permissions: { session: ["workspace"] }, plan: "pro" },
  async ({ input, workspaceID }) => {
    return saveGroup({ ...input, workspaceID: toWorkspaceID(workspaceID) });
  }
);

export { createGroup };
