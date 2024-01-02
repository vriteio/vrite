import { Observable } from "@trpc/server/observable";
import { Variant } from "#collections";
import { Context } from "#lib/context";
import { createEventPublisher, createEventSubscription } from "#lib/pub-sub";

type VariantEvent =
  | {
      action: "create";
      data: Variant & { id: string };
    }
  | {
      action: "update";
      data: Partial<Variant> & { id: string };
    }
  | {
      action: "delete";
      data: { id: string };
    };

const publishVariantEvent = createEventPublisher<VariantEvent>(
  (workspaceId) => `variants:${workspaceId}`
);
const subscribeToVariantEvents = (
  ctx: Context,
  workspaceId: string
): Observable<VariantEvent, unknown> => {
  return createEventSubscription<VariantEvent>(ctx, `variants:${workspaceId}`);
};

export { publishVariantEvent, subscribeToVariantEvents };
export type { VariantEvent };
