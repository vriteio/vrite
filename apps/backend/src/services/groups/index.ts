import { createGroup } from "./create";
import { deleteGroup } from "./delete";
import { type GroupDetails, listGroups } from "./list";
import { updateGroup } from "./update";

const Groups = {
  create: createGroup,
  delete: deleteGroup,
  list: listGroups,
  update: updateGroup
};

export { Groups };
export type { GroupDetails };
