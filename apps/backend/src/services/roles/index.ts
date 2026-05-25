import { listRoles } from "./list";
import { createRole } from "./create";
import { updateRole } from "./update";
import { deleteRole } from "./delete";

const Roles = {
  list: listRoles,
  create: createRole,
  update: updateRole,
  delete: deleteRole
};

export { Roles };
