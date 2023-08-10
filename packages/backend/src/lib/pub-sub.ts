import { Context } from "./context";
import { PubSubMessage } from "fastify";
import { Observable, observable } from "@trpc/server/observable";

const createEventPublisher = <E extends PubSubMessage>(
  createEventName: (eventNameParam: string) => string
) => {
  return (ctx: Pick<Context, "fastify">, eventNameParam: string | string[], event: E): void => {
    if (typeof eventNameParam === "string") {
      ctx.fastify.pubsub.publish(createEventName(eventNameParam), event);
    } else {
      eventNameParam.forEach((eventNameParam) => {
        ctx.fastify.pubsub.publish(createEventName(eventNameParam), event);
      });
    }
  };
};
const createEventSubscription = <E extends PubSubMessage>(
  ctx: Context,
  eventName: string
): Observable<E, unknown> => {
  return observable<E>((observer) => {
    const eventHandler = (event: PubSubMessage): void => {
      observer.next(event as E);
    };

    ctx.fastify.pubsub.subscribe(eventName, eventHandler);

    return () => {
      ctx.fastify.pubsub.unsubscribe(eventName, eventHandler);
    };
  });
};

export { createEventPublisher, createEventSubscription };
