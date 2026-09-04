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
    [schemaEvent: `${string}:schemas`]: SchemaEvent;
  }
}

const schemaEventDataType = z.object({
  id: id(),
  collectionID: id(),
  enabled: z.boolean(),
  hasActiveVersion: z.boolean(),
  hasUnappliedChanges: z.boolean()
});
const schemaEventType = z.union([
  z.object({
    action: z.literal("schema:create"),
    memberID: id().optional(),
    data: schemaEventDataType
  }),
  z.object({
    action: z.literal("schema:update"),
    memberID: id().optional(),
    data: schemaEventDataType
  }),
  z.object({
    action: z.literal("schema:delete"),
    memberID: id().optional(),
    data: schemaEventDataType
  }),
  z.object({
    action: z.literal("schema:content-reset"),
    data: schemaEventDataType
  })
]);

type SchemaEvent = z.infer<typeof schemaEventType>;

const emitSchemaEvent: EmitEvent<{
  [workspaceID: string]: SchemaEvent;
}> = (workspaceID, event) => {
  emitEvent(`${workspaceID}:schemas`, event);
};
const subscribeToSchemaEvents: SubscribeToEvent<{
  [workspaceID: string]: SchemaEvent;
}> = (workspaceID, callback, options) => {
  return subscribeToEvent(`${workspaceID}:schemas`, callback, {
    ...options,
    schema: schemaEventType
  });
};

export { emitSchemaEvent, schemaEventType, subscribeToSchemaEvents };
export type { SchemaEvent };
