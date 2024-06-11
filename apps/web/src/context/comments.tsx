import {
  Accessor,
  InitializedResource,
  ParentComponent,
  Setter,
  createContext,
  createEffect,
  createMemo,
  createResource,
  createSignal,
  on,
  onCleanup,
  useContext
} from "solid-js";
import { SetStoreFunction, createStore, reconcile } from "solid-js/store";
import { App, useClient, useContentData } from "#context";

type ThreadWithFirstComment = Omit<App.CommentThread, "comments"> & {
  firstComment: (Omit<App.Comment, "memberId"> & { member: App.CommentMember | null }) | null;
};
type UseCommentsOutput = {
  comments: Accessor<Array<Omit<App.Comment, "memberId"> & { member: App.CommentMember | null }>>;
  loading: Accessor<boolean>;
};
interface CommentFragmentData {
  id: string;
  top: Accessor<number>;
  computedTop: Accessor<number>;
  overlap: number;
  pos: number;
  size: number;
}
interface CommentDataProviderProps {}
interface CommentDataContextData {
  fragments: Record<string, CommentFragmentData | undefined>;
  orderedFragmentIds: Accessor<string[]>;
  threads: InitializedResource<ThreadWithFirstComment[]>;
  setOrderedFragmentIds: Setter<string[]>;
  setFragments: SetStoreFunction<Record<string, CommentFragmentData | undefined>>;
  activeFragmentId: Accessor<string | null>;
  setActiveFragmentId: Setter<string | null>;
  getThreadByFragment(fragmentId: string): ThreadWithFirstComment | null;
  getCommentNumbers(fragmentId: string): number;
  useCommentsInFragment(fragmentId: Accessor<string>): UseCommentsOutput;
  useCommentsInThread(threadId: Accessor<string>): UseCommentsOutput;
}

const CommentDataContext = createContext<CommentDataContextData>();
const CommentDataProvider: ParentComponent<CommentDataProviderProps> = (props) => {
  const { activeContentPieceId } = useContentData();
  const client = useClient();
  const [orderedFragmentIds, setOrderedFragmentIds] = createSignal<string[]>([]);
  const [activeFragmentId, setActiveFragmentId] = createSignal<string | null>(null);
  const [fragments, setFragments] = createStore<Record<string, CommentFragmentData | undefined>>(
    {}
  );
  const [loadingComments, setLoadingComments] = createStore<Record<string, boolean | undefined>>(
    {}
  );
  const [threads, { mutate: setThreads }] = createResource(
    activeContentPieceId,
    () => {
      if (!activeContentPieceId()) return [];

      return client.comments.listThreads.query({
        contentPieceId: activeContentPieceId()!
      });
    },
    { initialValue: [] }
  );
  const [commentsByFragmentId, setCommentsByFragmentId] = createStore<
    Record<
      string,
      Array<Omit<App.Comment, "memberId"> & { member: App.CommentMember | null }> | undefined
    >
  >({});
  const useCommentsInFragment = (fragmentId: Accessor<string>): UseCommentsOutput => {
    createEffect(
      on(fragmentId, (fragmentId, previousFragmentId) => {
        if (fragmentId && fragmentId !== previousFragmentId && !commentsByFragmentId[fragmentId]) {
          setLoadingComments(fragmentId, true);
          client.comments.listComments
            .query({
              fragment: fragmentId
            })
            .then((comments) => {
              setCommentsByFragmentId(fragmentId, comments);
              setLoadingComments(fragmentId, undefined);
            })
            .finally(() => {
              setLoadingComments(fragmentId, undefined);
            });
        }
      })
    );

    return {
      comments: () => commentsByFragmentId[fragmentId()] || [],
      loading: () => loadingComments[fragmentId()] || false
    };
  };
  const useCommentsInThread = (threadId: Accessor<string>): UseCommentsOutput => {
    const fragmentId = createMemo(() => {
      return threads().find((thread) => thread.id === threadId())?.fragment || "";
    });

    return useCommentsInFragment(fragmentId);
  };
  const getThreadByFragment = (fragmentId: string): ThreadWithFirstComment | null => {
    return threads().find((thread) => thread.fragment === fragmentId) || null;
  };
  const getCommentNumbers = (fragmentId: string): number => {
    return commentsByFragmentId[fragmentId]?.length || 0;
  };

  createEffect(
    on(activeContentPieceId, () => {
      const commentChangesSubscription = client.comments.changes.subscribe(
        { contentPieceId: activeContentPieceId()! },
        {
          onData({ action, data }) {
            if (action.includes("Comment")) {
              const thread = threads().find((thread) => {
                return "threadId" in data && thread.id === data.threadId;
              });

              if (action === "createComment" && thread && thread.fragment in commentsByFragmentId) {
                return setCommentsByFragmentId(thread.fragment, (comments) => [
                  ...(comments || []),
                  data
                ]);
              }

              if (action === "updateComment" && thread && thread.fragment in commentsByFragmentId) {
                return setCommentsByFragmentId(thread.fragment, (comments) => {
                  return (comments || []).map((comment) => {
                    if (comment.id === data.id) {
                      return { ...comment, content: data.content };
                    }

                    return comment;
                  });
                });
              }

              if (action === "deleteComment" && thread && thread.fragment in commentsByFragmentId) {
                return setCommentsByFragmentId(thread.fragment, (comments) => {
                  return (comments || []).filter((comment) => comment.id !== data.id);
                });
              }
            }

            if (action === "createThread") {
              return setThreads((threads) => [...threads, { ...data, firstComment: null }]);
            }

            if (action === "resolveThread") {
              return setThreads((threads) => {
                return threads.map((thread) => {
                  if (thread.id === data.id) {
                    return { ...thread, resolved: data.resolved };
                  }

                  return thread;
                });
              });
            }

            if (action === "deleteThread") {
              setCommentsByFragmentId(data.fragment, undefined);

              return setThreads((threads) => {
                return threads.filter((thread) => thread.id !== data.id);
              });
            }
          }
        }
      );

      onCleanup(() => {
        commentChangesSubscription.unsubscribe();
        setCommentsByFragmentId(reconcile({}));
      });
    })
  );

  return (
    <CommentDataContext.Provider
      value={{
        useCommentsInFragment,
        useCommentsInThread,
        orderedFragmentIds,
        getThreadByFragment,
        getCommentNumbers,
        activeFragmentId,
        setOrderedFragmentIds,
        setActiveFragmentId,
        fragments,
        threads,
        setFragments
      }}
    >
      {props.children}
    </CommentDataContext.Provider>
  );
};
const useCommentData = (): CommentDataContextData => {
  return useContext(CommentDataContext)!;
};

export { CommentDataProvider, useCommentData };
export type { ThreadWithFirstComment, CommentFragmentData, CommentDataContextData };
