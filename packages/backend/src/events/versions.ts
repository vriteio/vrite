import { Observable } from "@trpc/server/observable";
import { Context } from "#lib/context";
import { createEventPublisher, createEventSubscription } from "#lib/pub-sub";
import { FullVersionWithAdditionalData } from "#collections";

type VersionEvent =
  | { action: "create"; userId: string; data: FullVersionWithAdditionalData }
  | {
      action: "update";
      userId: string;
      data: Partial<FullVersionWithAdditionalData> & { id: string };
    };

const publishVersionEvent = createEventPublisher<VersionEvent>((contentGroupId) => {
  return `versions:${contentGroupId}`;
});
const subscribeToVersionEvents = (
  ctx: Context,
  workspaceId: string
): Observable<VersionEvent, unknown> => {
  return createEventSubscription<VersionEvent>(ctx, `versions:${workspaceId}`);
};

export { publishVersionEvent, subscribeToVersionEvents };
export type { VersionEvent };
