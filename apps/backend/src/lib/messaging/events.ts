import { redis, subscriberRedis } from "#backend/lib/adapters/redis";
import type * as z from "zod";

/* eslint-disable @typescript-eslint/no-empty-object-type, @typescript-eslint/no-explicit-any -- Event payloads are supplied through declaration merging. */
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
  callback: (payload: Events[E], channel: string) => void,
  options?: { schema?: z.ZodType<unknown>; unsubscribeKey?: string }
) => () => void;

const eventListeners: {
  [E in keyof Events]: Array<(payload: Events[E], channel: string) => void>;
} = {};
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
const subscribeToEvent: SubscribeToEvent<Events> = (
  event,
  callback,
  { schema, unsubscribeKey } = {}
) => {
  if (eventListeners[event]) {
    eventListeners[event].push(callback);
  } else {
    eventListeners[event] = [callback];

    void subscriberRedis.pSubscribe(event, (payload, channel) => {
      let parsedPayload: Events[typeof event];

      try {
        const parsedJSON: unknown = JSON.parse(payload);

        if (schema) {
          const result = schema.safeParse(parsedJSON);

          if (!result.success) {
            console.error("Invalid event payload", { event, issues: result.error.issues });
            return;
          }

          parsedPayload = result.data as Events[typeof event];
        } else {
          parsedPayload = parsedJSON as Events[typeof event];
        }
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
          listener(parsedPayload, channel);
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
      void subscriberRedis.pUnsubscribe(event);
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
