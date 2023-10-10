import { Observable } from "@trpc/server/observable";
import { GitData } from "#database";
import { Context } from "#lib/context";
import { createEventPublisher, createEventSubscription } from "#lib/pub-sub";

type GitDataEvent =
  | {
      action: "configure";
      data: GitData;
    }
  | {
      action: "update";
      data: Partial<GitData>;
    }
  | {
      action: "reset";
      data: {};
    };

const publishGitDataEvent = createEventPublisher<GitDataEvent>((workspaceId) => {
  return `gitData:${workspaceId}`;
});
const subscribeToGitDataEvents = (
  ctx: Context,
  workspaceId: string
): Observable<GitDataEvent, unknown> => {
  return createEventSubscription<GitDataEvent>(ctx, `gitData:${workspaceId}`);
};

export { publishGitDataEvent, subscribeToGitDataEvents };
export type { GitDataEvent };
