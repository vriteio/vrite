import { createCollection } from "./create";
import { deleteCollections } from "./delete";
import { listCollections } from "./list";
import { moveCollection } from "./move";
import { updateCollection } from "./update";
import { setCollectionRestricted } from "./set-restricted";
import {
  type RestrictedGroupAssignment,
  type RestrictedMemberAssignment,
  listRestrictedAssignments
} from "./list-restricted-assignments";
import { setRestrictedAssignments } from "./set-restricted-assignments";

const Collections = {
  create: createCollection,
  list: listCollections,
  delete: deleteCollections,
  update: updateCollection,
  setRestricted: setCollectionRestricted,
  listRestrictedAssignments,
  setRestrictedAssignments,
  move: moveCollection
};

export { Collections };
export type { RestrictedGroupAssignment, RestrictedMemberAssignment };
