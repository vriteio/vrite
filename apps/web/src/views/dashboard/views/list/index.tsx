import { ContentGroupRow } from "./content-group-row";
import { ContentPieceRow } from "./content-piece-row";
import { ContentGroupsContextProvider } from "../../content-groups-context";
import { Component, For, Show } from "solid-js";
import { mdiFilePlus, mdiFolderPlus } from "@mdi/js";
import { createRef } from "@vrite/components/src/ref";
import { Card, IconButton } from "#components/primitives";
import { App, useCache, useClient, useLocalStorage, useNotifications } from "#context";
import { useContentPieces } from "#lib/composables";

interface DashboardListViewProps {
  ancestor?: App.ContentGroup | null;
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
}> = (props) => {
  const cache = useCache();
  const { contentPieces, setContentPieces, loadMore, loading } = cache(
    `contentPieces:${props.ancestor.id}`,
    () => {
      return useContentPieces(props.ancestor.id);
    }
  );

  return (
    <For each={contentPieces()}>
      {(contentPiece) => {
        return <ContentPieceRow contentPiece={contentPiece} />;
      }}
    </For>
  );
};
const DashboardListView: Component<DashboardListViewProps> = (props) => {
  const client = useClient();
  const { notify } = useNotifications();
  const [scrollableContainerRef, setScrollableContainerRef] = createRef<HTMLElement | null>(null);

  return (
    <div class="relative overflow-hidden w-full">
      <ContentGroupsContextProvider ancestor={() => props.ancestor} setAncestor={props.setAncestor}>
        <div class="flex flex-col w-full h-full" ref={setScrollableContainerRef}>
          <For each={props.contentGroups}>
            {(contentGroup, index) => {
              return (
                <ContentGroupRow
                  contentGroup={contentGroup}
                  index={index()}
                  remove={(id) => {
                    props.setContentGroups(
                      props.contentGroups.filter((contentGroup) => contentGroup.id !== id)
                    );
                  }}
                />
              );
            }}
          </For>
          <Show when={props.ancestor} keyed>
            <ContentPieceList ancestor={props.ancestor!} />
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
