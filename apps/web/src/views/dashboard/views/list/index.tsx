import { ContentGroupRow } from "./content-group-row";
import { ContentPieceRow } from "./content-piece-row";
import { ContentGroupsContextProvider } from "../../content-groups-context";
import {
  Component,
  For,
  Show,
  createEffect,
  createMemo,
  createResource,
  createSignal,
  on
} from "solid-js";
import { mdiFilePlus, mdiFolderPlus } from "@mdi/js";
import { createRef } from "@vrite/components/src/ref";
import { Card, IconButton, Loader } from "#components/primitives";
import { App, useCache, useClient, useLocalStorage, useNotifications } from "#context";
import { useContentPieces } from "#lib/composables";

interface DashboardListViewProps {
  ancestor?: App.ContentGroup | null;
  contentGroupsLoading?: boolean;
  contentGroups: App.ContentGroup<string>[];
  setAncestor(ancestor: App.ContentGroup | null | undefined): void;
  setContentGroups(contentGroups: App.ContentGroup<string>[]): void;
}

const NewContentPieceButton: Component<{
  ancestor: App.ContentGroup;
}> = (props) => {
  const cache = useCache();
  const client = useClient();
  const { notify } = useNotifications();
  const { setStorage } = useLocalStorage();
  const { contentPieces, setContentPieces, loadMore, loading } = cache(
    `contentPieces:${props.ancestor.id}`,
    () => {
      return useContentPieces(props.ancestor.id);
    }
  );

  return (
    <IconButton
      path={mdiFilePlus}
      class="whitespace-nowrap w-full m-0 justify-start"
      text="soft"
      variant="text"
      color="base"
      label="New content piece"
      onClick={async () => {
        if (props.ancestor) {
          const { id } = await client.contentPieces.create.mutate({
            contentGroupId: props.ancestor.id,
            referenceId: contentPieces()[0]?.id,
            tags: [],
            members: [],
            title: ""
          });

          notify({ type: "success", text: "New content piece created" });
          setStorage((storage) => ({
            ...storage,
            sidePanelView: "contentPiece",
            sidePanelWidth: storage.sidePanelWidth || 375,
            contentPieceId: id
          }));
        }
      }}
    />
  );
};
const ContentPieceList: Component<{
  ancestor: App.ContentGroup;
  removedContentPieces?: string[];
  setContentPiecesLoading(loading: boolean): void;
}> = (props) => {
  const cache = useCache();
  const { contentPieces, setContentPieces, loading } = cache(
    `contentPieces:${props.ancestor.id}`,
    () => {
      return useContentPieces(props.ancestor.id);
    }
  );
  const filteredContentPieces = createMemo(() => {
    return contentPieces().filter(
      (contentPiece) => !props.removedContentPieces?.includes(contentPiece.id)
    );
  });

  createEffect(() => {
    props.setContentPiecesLoading(loading());
  });

  return (
    <For each={filteredContentPieces()}>
      {(contentPiece) => {
        return <ContentPieceRow contentPiece={contentPiece} />;
      }}
    </For>
  );
};
const DashboardListView: Component<DashboardListViewProps> = (props) => {
  const client = useClient();
  const { notify } = useNotifications();
  const [contentPiecesLoading, setContentPiecesLoading] = createSignal(false);
  const [removedContentPieces, setRemovedContentPieces] = createSignal<string[]>([]);
  const [, setScrollableContainerRef] = createRef<HTMLElement | null>(null);
  const [higherAncestor] = createResource(
    () => props.ancestor,
    (ancestor) => {
      const higherAncestorId = ancestor?.ancestors[ancestor.ancestors.length - 1];

      if (!higherAncestorId) return null;

      try {
        return client.contentGroups.get.query({ id: higherAncestorId });
      } catch (error) {
        return null;
      }
    }
  );
  const removeContentGroup = (id: string): void => {
    props.setContentGroups(props.contentGroups.filter((contentGroup) => contentGroup.id !== id));
  };
  const removeContentPiece = (id: string): void => {
    setRemovedContentPieces([...removedContentPieces(), id]);
  };

  createEffect(
    on(
      () => props.ancestor,
      () => {
        setRemovedContentPieces([]);
      }
    )
  );

  return (
    <div class="relative overflow-hidden w-full">
      <ContentGroupsContextProvider ancestor={() => props.ancestor} setAncestor={props.setAncestor}>
        <div class="flex flex-col w-full h-full relative" ref={setScrollableContainerRef}>
          <Show when={higherAncestor()} keyed>
            <ContentGroupRow
              contentGroup={higherAncestor()!}
              draggable={false}
              menuDisabled={true}
              customLabel=".."
              removeContentGroup={removeContentGroup}
              removeContentPiece={removeContentPiece}
            />
          </Show>
          <For each={props.contentGroups}>
            {(contentGroup, index) => {
              return (
                <ContentGroupRow
                  contentGroup={contentGroup}
                  removeContentGroup={removeContentGroup}
                  removeContentPiece={removeContentPiece}
                />
              );
            }}
          </For>
          <Show when={props.ancestor} keyed>
            <ContentPieceList
              ancestor={props.ancestor!}
              setContentPiecesLoading={setContentPiecesLoading}
              removedContentPieces={removedContentPieces()}
            />
          </Show>
          <Show
            when={props.contentGroupsLoading || contentPiecesLoading() || higherAncestor.loading}
          >
            <div class="h-full w-full absolute top-0 left-0 bg-gray-100 dark:bg-gray-800 flex justify-center items-center">
              <Loader />
            </div>
          </Show>
        </div>
        <Card class="flex fixed bottom-18 md:bottom-4 right-4 m-0 gap-2" color="soft">
          <Show when={props.ancestor} keyed>
            <NewContentPieceButton ancestor={props.ancestor!} />
          </Show>
          <IconButton
            path={mdiFolderPlus}
            class="whitespace-nowrap w-full m-0 justify-start"
            text="soft"
            variant="text"
            color="base"
            label="New group"
            onClick={async () => {
              try {
                await client.contentGroups.create.mutate({
                  name: "",
                  ancestor: props.ancestor?.id
                });
                notify({ text: "New content group created", type: "success" });
              } catch (error) {
                notify({ text: "Couldn't create new content group", type: "error" });
              }
            }}
          />
        </Card>
      </ContentGroupsContextProvider>
    </div>
  );
};

export { DashboardListView };
