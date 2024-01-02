import { Observable } from "@trpc/server/observable";
import { AppearanceSettings } from "#collections";
import { Context } from "#lib/context";
import { createEventPublisher, createEventSubscription } from "#lib/pub-sub";

type UserSettingsEvent = { action: "update"; data: Partial<AppearanceSettings> };

const publishUserSettingsEvent = createEventPublisher<UserSettingsEvent>(
  (userId) => `userSettings:${userId}`
);
const subscribeToUserSettingsEvents = (
  ctx: Context,
  userId: string
): Observable<UserSettingsEvent, unknown> => {
  return createEventSubscription<UserSettingsEvent>(ctx, `userSettings:${userId}`);
};

export { publishUserSettingsEvent, subscribeToUserSettingsEvents };
export type { UserSettingsEvent };
