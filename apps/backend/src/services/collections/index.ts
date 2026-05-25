import { createCollection } from "./create";
import { deleteCollections } from "./delete";
import { listCollections } from "./list";
import { moveCollection } from "./move";
import { updateCollection } from "./update";

const Collections = {
  create: createCollection,
  list: listCollections,
  delete: deleteCollections,
  update: updateCollection,
  move: moveCollection
};

export { Collections };
