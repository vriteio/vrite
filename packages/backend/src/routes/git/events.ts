import { GitData } from "#database";
import { createEventPublisher } from "#lib/pub-sub";

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

export { publishGitDataEvent };
export type { GitDataEvent };
