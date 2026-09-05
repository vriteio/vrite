import {
  emitEvent,
  type EmitEvent,
  subscribeToEvent,
  type SubscribeToEvent
} from "#backend/lib/messaging";
import { schemaMigrationStatusType } from "#backend/lib/data";
import { id } from "#backend/lib/primitives";
import * as z from "zod";

declare module "#backend/lib/messaging/events" {
  interface Events {
    [schemaMigrationEvent: `${string}:schema-migrations`]: SchemaMigrationEvent;
  }
}

const schemaMigrationEventType = z.object({
  action: z.literal("schema-migration:update"),
  data: z.object({
    id: id(),
    schemaID: id().nullable(),
    collectionIDs: z.array(id()),
    status: z.lazy(() => schemaMigrationStatusType),
    totalEntries: z.number().int().nonnegative(),
    processedEntries: z.number().int().nonnegative()
  })
});

type SchemaMigrationEvent = z.infer<typeof schemaMigrationEventType>;

const emitSchemaMigrationEvent: EmitEvent<{
  [workspaceID: string]: SchemaMigrationEvent;
}> = (workspaceID, event) => {
  emitEvent(`${workspaceID}:schema-migrations`, event);
};
const subscribeToSchemaMigrationEvents: SubscribeToEvent<{
  [workspaceID: string]: SchemaMigrationEvent;
}> = (workspaceID, callback, options) => {
  return subscribeToEvent(`${workspaceID}:schema-migrations`, callback, {
    ...options,
    schema: schemaMigrationEventType
  });
};

export {
  emitSchemaMigrationEvent,
  schemaMigrationEventType,
  schemaMigrationStatusType,
  subscribeToSchemaMigrationEvents
};
export type { SchemaMigrationEvent };
