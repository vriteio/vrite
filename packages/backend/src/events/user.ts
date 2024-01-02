import { Observable } from "@trpc/server/observable";
import { VerificationDetails, Profile } from "#collections";
import { Context } from "#lib/context";
import { createEventPublisher, createEventSubscription } from "#lib/pub-sub";

type UserEvent = {
  action: "update";
  data: Partial<Profile> & { id: string } & Partial<VerificationDetails>;
};

const publishUserEvent = createEventPublisher<UserEvent>((userId: string) => `user:${userId}`);
const subscribeToUserEvents = (ctx: Context, userId: string): Observable<UserEvent, unknown> => {
  return createEventSubscription<UserEvent>(ctx, `user:${userId}`);
};

export { publishUserEvent, subscribeToUserEvents };
export type { UserEvent };
