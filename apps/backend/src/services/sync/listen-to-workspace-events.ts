import { subscribeToWorkspaceEvents, workspaceEventType } from "#backend/events";
import { viaIterator } from "#backend/lib/messaging";
import {
  type SessionData,
  isSessionAuthorizationEvent,
  isWorkspaceEventVisible
} from "#backend/lib/policy";

const createWorkspaceEventStream = async function* (input: {
  auth: SessionData;
  signal?: AbortSignal;
  workspaceID: string;
}) {
  const events = viaIterator(subscribeToWorkspaceEvents, input.workspaceID, {
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

    if (!isWorkspaceEventVisible(input.auth, parsedEvent.data)) continue;

    yield parsedEvent.data;
  }
};
const listenToWorkspaceEvents = (input: {
  auth: SessionData;
  signal?: AbortSignal;
  workspaceID: string;
}) => {
  return { events: createWorkspaceEventStream(input) };
};

export { listenToWorkspaceEvents };
