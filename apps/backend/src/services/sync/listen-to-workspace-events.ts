import { subscribeToWorkspaceEvents, workspaceEventType } from "#backend/events";
import { viaIterator } from "#backend/lib/events";
import type { SessionData } from "#backend/lib/middleware";
import { isSessionAuthorizationEvent } from "#backend/services/auth";
import { isWorkspaceEventVisible } from "./is-workspace-event-visible";

const listenToWorkspaceEvents = async function* (input: {
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

export { listenToWorkspaceEvents };
