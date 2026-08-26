import { getPublishedContentTree } from "./get-content-tree";
import { publishCollection } from "./publish";
import { setCollectionsPublishing } from "./set";
import { unpublishCollection } from "./unpublish";

const Collections = {
  getContentTree: getPublishedContentTree,
  publish: publishCollection,
  set: setCollectionsPublishing,
  unpublish: unpublishCollection
};

export { Collections };
