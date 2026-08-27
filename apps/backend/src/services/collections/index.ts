import { getRootCollection } from "./root";
import { createCollection } from "./create";
import { deleteCollections } from "./delete";
import { listCollections } from "./list";
import { moveCollection } from "./move";
import { updateCollection } from "./update";
import { setCollectionRestricted } from "./set-restricted";

const Collections = {
  create: createCollection,
  list: listCollections,
  delete: deleteCollections,
  update: updateCollection,
  setRestricted: setCollectionRestricted,
  move: moveCollection,
  getRoot: getRootCollection
};

export { Collections };
