import { collectionType } from "#backend/db";
import { emitEvent, EmitEvent, subscribeToEvent, SubscribeToEvent } from "#backend/lib/events";
import { objectID } from "#backend/lib/mongo";
import * as z from "zod";

declare module "#backend/lib/events" {
  interface Events {
    [collectionEvent: `${string}:collections`]: CollectionEvent;
  }
}

const collectionEventType = z.union([
  z.object({
    action: z.literal("collection:create"),
    memberID: objectID().optional(),
    data: collectionType
  }),
  z.object({
    action: z.literal("collection:update"),
    memberID: objectID().optional(),
    data: z.object({
      ...collectionType.pick({ id: true }).shape,
      ...collectionType.omit({ id: true }).partial().shape
    })
  }),
  z.object({
    action: z.literal("collection:delete"),
    memberID: objectID().optional(),
    data: z.object({ ids: z.array(objectID()) })
  }),
  z.object({
    action: z.literal("collection:move"),
    memberID: objectID().optional(),
    data: z.object({
      id: objectID(),
      newParentID: objectID().nullable().optional(),
      index: z.number().int().min(0).optional()
    })
  })
]);

type CollectionEvent = z.infer<typeof collectionEventType>;

const emitCollectionEvent: EmitEvent<{
  [workspaceID: string]: CollectionEvent;
}> = async (workspaceID, event) => {
  await emitEvent(`${workspaceID}:collections`, event);
};
const subscribeToCollectionEvents: SubscribeToEvent<{
  [workspaceID: string]: CollectionEvent;
}> = (workspaceID, callback, options) => {
  return subscribeToEvent(`${workspaceID}:collections`, callback, options);
};

export { collectionEventType, emitCollectionEvent, subscribeToCollectionEvents };
export type { CollectionEvent };
