import { entryType } from "#backend/db";
import { emitEvent, EmitEvent, subscribeToEvent, SubscribeToEvent } from "#backend/lib/events";
import { objectID } from "#backend/lib/mongo";
import { Static, t } from "elysia";

declare module "#backend/lib/events" {
  interface Events {
    [entryEvent: `${string}:entries`]: EntryEvent;
  }
}

const entryEventType = t.Union([
  t.Object({
    action: t.Literal("entry:create"),
    userID: objectID(),
    data: entryType
  }),
  t.Object({
    action: t.Literal("entry:update"),
    userID: objectID(),
    data: t.Intersect([t.Pick(entryType, ["id"]), t.Partial(t.Omit(entryType, ["id"]))])
  }),
  t.Object({
    action: t.Literal("entry:delete"),
    userID: objectID(),
    data: t.Object({ ids: t.Array(objectID()) })
  }),
  t.Object({
    action: t.Literal("entry:move"),
    userID: objectID(),
    data: t.Object({
      id: objectID(),
      followingEntryID: t.Optional(objectID()),
      precedingEntryID: t.Optional(objectID())
    })
  })
]);

type EntryEvent = Static<typeof entryEventType>;

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
