import { entryType } from "#backend/db";
import { emitEvent, EmitEvent, subscribeToEvent, SubscribeToEvent } from "#backend/lib/events";
import { objectID } from "#backend/lib/mongo";
import * as z from "zod";

declare module "#backend/lib/events" {
  interface Events {
    [entryEvent: `${string}:entries`]: EntryEvent;
  }
}

const entryEventType = z.union([
  z.object({
    action: z.literal("entry:create"),
    memberID: objectID().optional(),
    data: entryType
  }),
  z.object({
    action: z.literal("entry:update"),
    memberID: objectID().optional(),
    data: z.object({
      ...entryType.pick({ id: true }).shape,
      ...entryType.omit({ id: true }).partial().shape
    })
  }),
  z.object({
    action: z.literal("entry:delete"),
    memberID: objectID().optional(),
    data: z.object({ ids: z.array(objectID()) })
  }),
  z.object({
    action: z.literal("entry:move"),
    memberID: objectID().optional(),
    data: z.object({
      id: objectID(),
      collectionID: objectID().nullable().optional(),
      order: z.string().optional()
    })
  })
]);

type EntryEvent = z.infer<typeof entryEventType>;

const emitEntryEvent: EmitEvent<{
  [workspaceID: string]: EntryEvent;
}> = async (workspaceID, event) => {
  await emitEvent(`${workspaceID}:entries`, event);
};
const subscribeToEntryEvents: SubscribeToEvent<{
  [workspaceID: string]: EntryEvent;
}> = (workspaceID, callback, options) => {
  return subscribeToEvent(`${workspaceID}:entries`, callback, options);
};

export { entryEventType, emitEntryEvent, subscribeToEntryEvents };
export type { EntryEvent };
