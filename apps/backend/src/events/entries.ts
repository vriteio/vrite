import { entryType } from "#backend/db";
import {
  emitEvent,
  type EmitEvent,
  subscribeToEvent,
  type SubscribeToEvent
} from "#backend/lib/messaging";
import { id } from "#backend/lib/primitives";
import * as z from "zod";

declare module "#backend/lib/messaging/events" {
  interface Events {
    [entryEvent: `${string}:entries`]: EntryEvent;
  }
}

const entryEventType = z.union([
  z.object({
    action: z.literal("entry:create"),
    memberID: id().optional(),
    data: entryType
  }),
  z.object({
    action: z.literal("entry:update"),
    memberID: id().optional(),
    data: z.object({
      ...entryType.pick({ id: true }).shape,
      ...entryType.omit({ id: true }).partial().shape
    })
  }),
  z.object({
    action: z.literal("entry:delete"),
    memberID: id().optional(),
    data: z.object({ ids: z.array(id()) })
  }),
  z.object({
    action: z.literal("entry:move"),
    memberID: id().optional(),
    data: z.object({
      id: id(),
      collectionID: id().nullable().optional(),
      order: z.string().optional()
    })
  })
]);

type EntryEvent = z.infer<typeof entryEventType>;

const emitEntryEvent: EmitEvent<{
  [workspaceID: string]: EntryEvent;
}> = (workspaceID, event) => {
  emitEvent(`${workspaceID}:entries`, event);
};
const subscribeToEntryEvents: SubscribeToEvent<{
  [workspaceID: string]: EntryEvent;
}> = (workspaceID, callback, options) => {
  return subscribeToEvent(`${workspaceID}:entries`, callback, {
    ...options,
    schema: entryEventType
  });
};

export { entryEventType, emitEntryEvent, subscribeToEntryEvents };
export type { EntryEvent };
