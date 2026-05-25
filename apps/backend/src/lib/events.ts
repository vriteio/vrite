import { redis, subscriberRedis } from "./redis";

interface Events extends Record<string, Record<string, any>> {}

type EmitEvent<Events extends Record<string, Record<string, any>>> = <
  E extends Extract<keyof Events, string>
>(
  key: E,
  payload: Events[E]
) => Promise<void>;
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
  await redis.publish(event, JSON.stringify(payload));
};
const subscribeToEvent: SubscribeToEvent<Events> = (event, callback, { unsubscribeKey } = {}) => {
  if (eventListeners[event]) {
    eventListeners[event].push(callback);
  } else {
    eventListeners[event] = [callback];
    subscriberRedis.pSubscribe(event, (payload) => {
      callback(JSON.parse(payload));
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

export { emitEvent, subscribeToEvent, unsubscribeFromEventByKey };
export type { Events, EmitEvent, SubscribeToEvent };
