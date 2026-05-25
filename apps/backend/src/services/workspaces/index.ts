import { listWorkspaces } from "./list";
import { createWorkspace } from "./create";
import { updateWorkspace } from "./update";
import { deleteWorkspace } from "./delete";
import { switchWorkspace } from "./switch";

const Workspaces = {
  list: listWorkspaces,
  create: createWorkspace,
  update: updateWorkspace,
  delete: deleteWorkspace,
  switch: switchWorkspace
};

export { Workspaces };
