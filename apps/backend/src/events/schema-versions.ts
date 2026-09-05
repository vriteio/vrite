import { type SchemaVersionSummary, schemaVersionSummaryType } from "#backend/lib/data";
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
    [schemaVersionEvent: `${string}:schema-versions`]: SchemaVersionEvent;
  }
}

const schemaVersionEventType = z.union([
  z.object({
    action: z.literal("schema-version:create"),
    memberID: id().optional(),
    data: z.lazy(() => schemaVersionSummaryType)
  }),
  z.object({
    action: z.literal("schema-version:update"),
    memberID: id().optional(),
    data: z.lazy(() => schemaVersionSummaryType)
  })
]);

type SchemaVersionEvent = z.infer<typeof schemaVersionEventType>;

const emitSchemaVersionEvent: EmitEvent<{
  [workspaceID: string]: SchemaVersionEvent;
}> = (workspaceID, event) => {
  emitEvent(`${workspaceID}:schema-versions`, event);
};
const emitSchemaVersionCreationEvents = (
  workspaceID: string,
  versions: SchemaVersionSummary[],
  memberID?: string
): void => {
  for (const version of versions) {
    emitSchemaVersionEvent(workspaceID, {
      action: "schema-version:create",
      data: version,
      memberID
    });
  }
};
const subscribeToSchemaVersionEvents: SubscribeToEvent<{
  [workspaceID: string]: SchemaVersionEvent;
}> = (workspaceID, callback, options) => {
  return subscribeToEvent(`${workspaceID}:schema-versions`, callback, {
    ...options,
    schema: schemaVersionEventType
  });
};

export {
  emitSchemaVersionCreationEvents,
  emitSchemaVersionEvent,
  schemaVersionEventType,
  subscribeToSchemaVersionEvents
};
export type { SchemaVersionEvent };
