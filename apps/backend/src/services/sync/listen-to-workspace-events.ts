import { subscribeToWorkspaceEvents, workspaceEventType } from "#backend/events";
import { viaIterator } from "#backend/lib/messaging";
import {
  type SessionData,
  filterRestrictedWorkspaceEvent,
  isSessionAuthorizationEvent,
  isRestrictedAuthorizationEvent,
  isWorkspaceEventVisible,
  withAuthorization
} from "#backend/lib/policy";

const createWorkspaceEventStream = async function* (input: {
  auth: SessionData;
  signal?: AbortSignal;
}) {
  const events = viaIterator(subscribeToWorkspaceEvents, input.auth.workspaceID, {
    signal: input.signal
  });

  for await (const event of events) {
    const parsedEvent = workspaceEventType.safeParse(event);

    if (!parsedEvent.success) {
      continue;
    }

    if (isSessionAuthorizationEvent(input.auth, parsedEvent.data)) {
      yield parsedEvent.data;
      return;
    }

    if (isRestrictedAuthorizationEvent(input.auth, parsedEvent.data)) return;

    if (!isWorkspaceEventVisible(input.auth, parsedEvent.data)) continue;

    const visibleEvent = await filterRestrictedWorkspaceEvent(input.auth, parsedEvent.data);

    if (visibleEvent) {
      yield visibleEvent;
    }
  }
};
const listenToWorkspaceEvents = withAuthorization<
  { signal?: AbortSignal },
  undefined,
  { events: AsyncGenerator }
>({}, async ({ auth, input }) => ({
  events: createWorkspaceEventStream({ auth, signal: input.signal })
}));

export { listenToWorkspaceEvents };
