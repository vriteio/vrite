import { Observable } from "@trpc/server/observable";
import { Context } from "#lib/context";
import { createEventPublisher, createEventSubscription } from "#lib/pub-sub";
import { Transformer } from "#collections";

type TransformerEvent =
  | {
      action: "create";
      data: Transformer & { id: string };
    }
  | {
      action: "delete";
      data: { id: string };
    };

const publishTransformerEvent = createEventPublisher<TransformerEvent>(
  (workspaceId) => `transformers:${workspaceId}`
);
const subscribeToTransformerEvents = (
  ctx: Context,
  workspaceId: string
): Observable<TransformerEvent, unknown> => {
  return createEventSubscription<TransformerEvent>(ctx, `transformers:${workspaceId}`);
};

export { publishTransformerEvent, subscribeToTransformerEvents };
export type { TransformerEvent };
