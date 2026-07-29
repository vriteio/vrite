import { redis, subscriberRedis } from "./redis";

interface Events extends Record<string, Record<string, any>> {}

type EmitEvent<Events extends Record<string, Record<string, any>>> = <
  E extends Extract<keyof Events, string>
>(
  key: E,
  payload: Events[E]
) => void;
type SubscribeToEvent<Events extends Record<string, Record<string, any>>> = <
  E extends Extract<keyof Events, string>
>(
  event: E,
  callback: (payload: Events[E]) => void,
  options?: { unsubscribeKey?: string }
) => () => void;

const eventListeners: { [E in keyof Events]: Array<(payload: Events[E]) => void> } = {};
const unsubscribeCallbacks: Record<string, () => void> = {};
const emitEvent: EmitEvent<Events> = async (event, payload) => {
  try {
    const serializedPayload = JSON.stringify(payload);

    await redis.publish(event, serializedPayload).catch((error) => {
      console.error("Failed to publish event", { event, error });
    });
  } catch (error) {
    console.error("Failed to serialize event", { event, error });
  }
};
const subscribeToEvent: SubscribeToEvent<Events> = (event, callback, { unsubscribeKey } = {}) => {
  if (eventListeners[event]) {
    eventListeners[event].push(callback);
  } else {
    eventListeners[event] = [callback];
    subscriberRedis.pSubscribe(event, (payload) => {
      let parsedPayload: Events[typeof event];

      try {
        parsedPayload = JSON.parse(payload);
      } catch (error) {
        console.error("Failed to parse event payload", {
          event,
          payload,
          error
        });
        return;
      }

      const callbacks = eventListeners[event] || [];

      for (const listener of callbacks) {
        try {
          listener(parsedPayload);
        } catch (error) {
          console.error("Event listener failed", {
            event,
            error
          });
          continue;
        }
      }
    });
  }
  const unsubscribe = () => {
    eventListeners[event] = eventListeners[event].filter((filteredCallback) => {
      return filteredCallback !== callback;
    });

    if (eventListeners[event].length === 0) {
      subscriberRedis.pUnsubscribe(event);
      delete eventListeners[event];
    }
  };

  if (unsubscribeKey) {
    if (unsubscribeCallbacks[unsubscribeKey]) {
      unsubscribeCallbacks[unsubscribeKey]();
    }

    unsubscribeCallbacks[unsubscribeKey] = unsubscribe;
  }

  return unsubscribe;
};
const unsubscribeFromEventByKey = (key: string) => {
  if (unsubscribeCallbacks[key]) {
    unsubscribeCallbacks[key]();
    delete unsubscribeCallbacks[key];
  }
};

async function* viaIterator<
  Events extends Record<string, Record<string, any>>,
  E extends Extract<keyof Events, string>
>(subscribe: SubscribeToEvent<Events>, event: E, options?: { signal?: AbortSignal }) {
  const queue: Array<Events[E]> = [];

  let resolveNext: (() => void) | null = null;
  let done = false;

  const unsubscribe = subscribe(event, (payload) => {
    if (done) return;

    queue.push(payload);

    if (resolveNext) {
      resolveNext();
      resolveNext = null;
    }
  });

  if (options?.signal) {
    options.signal.addEventListener("abort", () => {
      done = true;
      if (resolveNext) {
        resolveNext();
      } else {
        unsubscribe();
      }
    });
  }

  try {
    while (!done) {
      if (queue.length > 0) {
        yield queue.shift()!;
      } else {
        await new Promise<void>((resolve) => {
          resolveNext = resolve;
        });
      }
    }
  } finally {
    done = true;
    unsubscribe();
  }
}

export { emitEvent, subscribeToEvent, unsubscribeFromEventByKey, viaIterator };
export type { Events, EmitEvent, SubscribeToEvent };
