import {
  ParentComponent,
  createContext,
  createEffect,
  createResource,
  on,
  onCleanup,
  useContext
} from "solid-js";
import { App, useClient } from "#context";

type CommentUpdateData =
  | { action: "createThread"; data: App.CommentThread }
  | { action: "resolveThread"; data: Pick<App.CommentThread, "id" | "fragment" | "resolved"> }
  | { action: "deleteThread"; data: Pick<App.CommentThread, "id" | "fragment"> }
  | {
      action: "createComment";
      data: Omit<App.Comment, "memberId"> & { member: App.CommentMember | null };
    }
  | {
      action: "updateComment";
      data: Pick<App.Comment, "id" | "content">;
    }
  | {
      action: "deleteComment";
      data: Pick<App.Comment, "id">;
    };
type ThreadWithFirstComment = Omit<App.CommentThread, "comments"> & {
  firstComment: (Omit<App.Comment, "memberId"> & { member: App.CommentMember | null }) | null;
};
type CommentUpdateHandler = (data: CommentUpdateData) => void;
interface CommentUpdatesProviderProps {
  contentPieceId: string;
}
interface CommentUpdatesContextData {
  getThreadByFragment(fragmentId: string): ThreadWithFirstComment | null;
  subscribeToUpdates(handler: CommentUpdateHandler): () => void;
}

const CommentUpdatesContext = createContext<CommentUpdatesContextData>();
const CommentDataProvider: ParentComponent<CommentUpdatesProviderProps> = (props) => {
  const client = useClient();
  const handlers: CommentUpdateHandler[] = [];
  const [threads, { mutate: setThreads }] = createResource(
    () => {
      if (!props.contentPieceId) return [];

      return client.comments.listThreads.query({
        contentPieceId: props.contentPieceId
      });
    },
    { initialValue: [] }
  );
  const getThreadByFragment = (fragmentId: string): ThreadWithFirstComment | null => {
    return threads().find((thread) => thread.fragment === fragmentId) || null;
  };
  const subscribeToUpdates: CommentUpdatesContextData["subscribeToUpdates"] = (handler) => {
    const unsubscribe = (): void => {
      const index = handlers.indexOf(handler);

      if (index > -1) {
        handlers.splice(index, 1);
      }
    };

    handlers.push(handler);
    onCleanup(() => {
      unsubscribe();
    });

    return unsubscribe;
  };

  subscribeToUpdates(({ action, data }) => {
    if (action === "createThread") {
      setThreads((threads) => [...threads, { ...data, firstComment: null }]);
    } else if (action === "resolveThread") {
      setThreads((threads) => {
        return threads.map((thread) => {
          if (thread.id === data.id) {
            return { ...thread, resolved: data.resolved };
          }

          return thread;
        });
      });
    } else if (action === "deleteThread") {
      setThreads((threads) => {
        return threads.filter((thread) => thread.id !== data.id);
      });
    }
  });
  createEffect(
    on(
      () => props.contentPieceId,
      () => {
        const commentChangesSubscription = client.comments.changes.subscribe(
          { contentPieceId: props.contentPieceId },
          {
            onData(data) {
              handlers.forEach((handler) => handler(data));
            }
          }
        );

        onCleanup(() => {
          commentChangesSubscription.unsubscribe();
        });
      }
    )
  );

  return (
    <CommentUpdatesContext.Provider value={{ subscribeToUpdates, getThreadByFragment }}>
      {props.children}
    </CommentUpdatesContext.Provider>
  );
};
const useCommentData = (): CommentUpdatesContextData => {
  return useContext(CommentUpdatesContext)!;
};

export { CommentDataProvider, useCommentData };
export type { ThreadWithFirstComment };
