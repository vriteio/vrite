import { keyType } from "#backend/db";
import { emitEvent, EmitEvent, subscribeToEvent, SubscribeToEvent } from "#backend/lib/events";
import { id } from "#backend/lib/id";
import * as z from "zod";

declare module "#backend/lib/events" {
  interface Events {
    [keyEvent: `${string}:keys`]: KeyEvent;
  }
}

const keyEventType = z.union([
  z.object({
    action: z.literal("key:create"),
    memberID: id().optional(),
    data: keyType
  }),
  z.object({
    action: z.literal("key:update"),
    memberID: id().optional(),
    data: z.object({
      ...keyType.pick({ id: true }).shape,
      ...keyType.omit({ id: true }).partial().shape
    })
  }),
  z.object({
    action: z.literal("key:delete"),
    memberID: id().optional(),
    data: z.object({ ids: z.array(keyType.shape.id) })
  }),
  z.object({
    action: z.literal("key:rotate"),
    memberID: id().optional(),
    data: z.object({
      previousKeyID: keyType.shape.id,
      key: keyType
    })
  })
]);

type KeyEvent = z.infer<typeof keyEventType>;

const emitKeyEvent: EmitEvent<{
  [workspaceID: string]: KeyEvent;
}> = (workspaceID, event) => {
  emitEvent(`${workspaceID}:keys`, event);
};
const subscribeToKeyEvents: SubscribeToEvent<{
  [workspaceID: string]: KeyEvent;
}> = (workspaceID, callback, options) => {
  return subscribeToEvent(`${workspaceID}:keys`, callback, options);
};

export { keyEventType, emitKeyEvent, subscribeToKeyEvents };
export type { KeyEvent };
