import * as z from "zod";

const collectionActionType = z.enum([
  "collection:read",
  "collection:create-child",
  "collection:update",
  "collection:move",
  "collection:delete",
  "collection:set-restricted",
  "collection:manage-restricted-access",
  "collection:set-publishing",
  "publishing:publish-tree",
  "publishing:unpublish-tree"
]);
const entryActionType = z.enum([
  "entry:create",
  "entry:read",
  "entry:update",
  "entry:move",
  "entry:delete",
  "version:read",
  "version:create",
  "version:update",
  "version:revert",
  "publishing:read",
  "publishing:publish",
  "publishing:unpublish"
]);
const collectionAccessType = z.object({
  collectionActions: z.array(collectionActionType),
  entryActions: z.array(entryActionType)
});

type CollectionAction = z.infer<typeof collectionActionType>;
type EntryAction = z.infer<typeof entryActionType>;
type CollectionAccess = z.infer<typeof collectionAccessType>;

export { collectionAccessType };
export type { CollectionAccess, CollectionAction, EntryAction };
