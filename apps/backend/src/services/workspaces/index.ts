import { beginWorkspaceDeletion } from "./begin-deletion";
import { cancelWorkspaceDeletion } from "./cancel-deletion";
import { listWorkspaces } from "./list";
import { createWorkspace } from "./create";
import { updateWorkspace } from "./update";
import { deleteWorkspace } from "./delete";
import { switchWorkspace } from "./switch";

const Workspaces = {
  beginDeletion: beginWorkspaceDeletion,
  cancelDeletion: cancelWorkspaceDeletion,
  list: listWorkspaces,
  create: createWorkspace,
  update: updateWorkspace,
  delete: deleteWorkspace,
  switch: switchWorkspace
};

export { Workspaces };
