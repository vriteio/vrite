import { collectionType } from "#backend/db";
import { emitEvent, EmitEvent, subscribeToEvent, SubscribeToEvent } from "#backend/lib/messaging";
import { id } from "#backend/lib/primitives";
import * as z from "zod";

declare module "#backend/lib/messaging/events" {
  interface Events {
    [collectionEvent: `${string}:collections`]: CollectionEvent;
  }
}

const collectionEventType = z.union([
  z.object({
    action: z.literal("collection:create"),
    memberID: id().optional(),
    data: collectionType
  }),
  z.object({
    action: z.literal("collection:update"),
    memberID: id().optional(),
    data: z.object({
      ...collectionType.pick({ id: true }).shape,
      ...collectionType.omit({ id: true }).partial().shape
    })
  }),
  z.object({
    action: z.literal("collection:delete"),
    memberID: id().optional(),
    data: z.object({ ids: z.array(id()) })
  }),
  z.object({
    action: z.literal("collection:move"),
    memberID: id().optional(),
    data: z.object({
      id: id(),
      newParentID: id().nullable().optional(),
      index: z.number().int().min(0).optional()
    })
  })
]);

type CollectionEvent = z.infer<typeof collectionEventType>;

const emitCollectionEvent: EmitEvent<{
  [workspaceID: string]: CollectionEvent;
}> = (workspaceID, event) => {
  emitEvent(`${workspaceID}:collections`, event);
};
const subscribeToCollectionEvents: SubscribeToEvent<{
  [workspaceID: string]: CollectionEvent;
}> = (workspaceID, callback, options) => {
  return subscribeToEvent(`${workspaceID}:collections`, callback, {
    ...options,
    schema: collectionEventType
  });
};

export { collectionEventType, emitCollectionEvent, subscribeToCollectionEvents };
export type { CollectionEvent };
