import { getPublishedContentTree } from "./get-content-tree";
import { publishCollection } from "./publish";
import { setCollectionPublishing } from "./set";
import { unpublishCollection } from "./unpublish";

const Collections = {
  getContentTree: getPublishedContentTree,
  publish: publishCollection,
  set: setCollectionPublishing,
  unpublish: unpublishCollection
};

export { Collections };
