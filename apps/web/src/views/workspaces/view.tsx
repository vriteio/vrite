import { WorkspaceSwitchOverlay } from "./overlay";
import { WorkspaceCreateSection } from "./create-workspace-subsection";
import { ScrollShadow } from "../../components/fragments/scroll-shadow";
import {
  Accessor,
  Component,
  For,
  Show,
  createEffect,
  createResource,
  createSignal
} from "solid-js";
import { mdiChevronLeft, mdiHexagonSlice6, mdiPlus } from "@mdi/js";
import clsx from "clsx";
import { throttle } from "@solid-primitives/scheduled";
import { Dynamic } from "solid-js/web";
import { createStore } from "solid-js/store";
import { useNavigate } from "@solidjs/router";
import { createRef, navigateAndReload } from "#lib/utils";
import { App, useClient, useLocalStorage } from "#context";
import { Button, Card, Heading, Icon, IconButton, Loader, Tooltip } from "#components/primitives";

interface WorkspaceViewAction {
  icon: string;
  label: string;
  onClick(): void;
}
interface UserWorkspaceData {
  id: string;
  workspace: Omit<App.Workspace, "contentGroups">;
  role?: Omit<App.Role, "description" | "permissions">;
}

const useWorkspaces = (): {
  loading: Accessor<boolean>;
  moreToLoad: Accessor<boolean>;
  loadMore(): void;
  refetch(): Promise<void>;
  workspaces(): UserWorkspaceData[];
} => {
  const client = useClient();
  const [loading, setLoading] = createSignal(false);
  const [moreToLoad, setMoreToLoad] = createSignal(true);
  const [state, setState] = createStore<{
    workspaces: UserWorkspaceData[];
  }>({
    workspaces: []
  });
  const loadMore = (): void => {
    const lastId = state.workspaces[state.workspaces.length - 1]?.id;

    if (loading() || !moreToLoad()) return;

    setLoading(true);
    client.workspaceMemberships.listWorkspaces.query({ perPage: 7, lastId }).then((data) => {
      setLoading(false);
      setState("workspaces", (workspace) => [...workspace, ...data]);
      setMoreToLoad(data.length === 7);
    });
  };
  const refetch = async (): Promise<void> => {
    setState("workspaces", []);
    setMoreToLoad(true);
    setLoading(false);
    loadMore();
  };

  loadMore();

  return { loadMore, loading, moreToLoad, refetch, workspaces: () => state.workspaces };
};
const WorkspacesView: Component = () => {
  const client = useClient();
  const { setStorage } = useLocalStorage();
  const [currentWorkspaceId] = createResource<string | null>(
    async () => {
      try {
        const { workspaceId } = await client.userSettings.getWorkspaceId.query();

        return workspaceId;
      } catch (error) {
        return null;
      }
    },
    { initialValue: null }
  );
  const [createWorkspaceSectionOpened, setCreateWorkspaceSectionOpened] = createSignal(false);
  const baseActionComponent: Component = () => {
    return (
      <Tooltip text="New workspace" class="mt-1" fixed>
        <IconButton
          color="primary"
          path={mdiPlus}
          class="m-0"
          onClick={() => {
            setCreateWorkspaceSectionOpened(!createWorkspaceSectionOpened());
          }}
        ></IconButton>
      </Tooltip>
    );
  };
  const [actionComponent, setActionComponent] = createSignal<Component>(baseActionComponent);
  const [destinationWorkspace, setDestinationWorkspace] = createSignal<Omit<
    App.Workspace,
    "contentGroups"
  > | null>(null);
  const [scrollableContainerRef, setScrollableContainerRef] = createRef<HTMLElement | null>(null);
  const navigate = useNavigate();
  const switchWorkspace = throttle(async (workspaceId: string) => {
    if (currentWorkspaceId() !== workspaceId) {
      await client.auth.switchWorkspace.mutate({ workspaceId });
      setStorage((storage) => ({
        sidePanelWidth: storage.sidePanelWidth
      }));
    }

    navigate("/");
  }, 500);
  const { loadMore, loading, workspaces, refetch } = useWorkspaces();

  createEffect(() => {
    if (!createWorkspaceSectionOpened()) {
      setActionComponent(() => baseActionComponent);
    }
  });

  return (
    <div class="relative">
      <Card class="flex flex-col m-0 p-0 gap-2 items-start w-96 max-h-xl h-full overflow-hidden">
        <div class="flex flex-col justify-center items-start pl-3 pr-4 pt-3 w-full">
          <Show when={createWorkspaceSectionOpened()}>
            <IconButton
              variant="text"
              class="m-0 h-6 -mb-1"
              label="Select workspace"
              size="small"
              path={mdiChevronLeft}
              onClick={() => {
                setCreateWorkspaceSectionOpened(false);
              }}
            ></IconButton>
          </Show>
          <div class="flex w-full justify-center items-center">
            <IconButton
              badge
              path={mdiHexagonSlice6}
              class="m-0 pl-0"
              variant="text"
              hover={false}
            />
            <Heading level={2} class="pl-1 flex-1">
              {createWorkspaceSectionOpened() ? "New workspace" : "Select workspace"}
            </Heading>
            <Dynamic component={actionComponent()} />
          </div>
        </div>
        <Show
          when={!createWorkspaceSectionOpened()}
          fallback={
            <WorkspaceCreateSection
              onWorkspaceCreated={() => {
                setCreateWorkspaceSectionOpened(false);
                refetch();
              }}
              setActionComponent={(component) => setActionComponent(() => component)}
            />
          }
        >
          <div class="flex flex-col justify-center items-center gap-2 w-full pl-4 pr-2 pb-4 overflow-hidden h-full">
            <div class="relative overflow-hidden grid w-full h-full">
              <ScrollShadow
                scrollableContainerRef={scrollableContainerRef}
                onScrollEnd={loadMore}
              />
              <div
                class="flex flex-col gap-2 w-full overflow-y-auto h-full scrollbar-sm pr-2 min-h-8"
                ref={setScrollableContainerRef}
              >
                <Show
                  when={workspaces().length > 0 || !loading()}
                  fallback={
                    <div class="flex justify-center items-center">
                      <Loader />
                    </div>
                  }
                >
                  <For
                    each={workspaces()}
                    fallback={<p class="px-2 w-full text-start">No workspaces found</p>}
                  >
                    {({ workspace, role }) => {
                      return (
                        <button
                          class="w-full"
                          onClick={async () => {
                            setDestinationWorkspace(workspace);
                            switchWorkspace(workspace.id);
                          }}
                        >
                          <Card
                            class={clsx(
                              "flex gap-3 justify-start items-start m-0 w-full",
                              "hover:bg-gray-300 dark:hover:bg-gray-700"
                            )}
                            color="contrast"
                          >
                            <Show
                              when={workspace.logo}
                              fallback={
                                <Icon
                                  path={mdiHexagonSlice6}
                                  class={clsx("h-12 w-12", "text-gray-500 dark:text-gray-400")}
                                />
                              }
                            >
                              <img
                                src={workspace.logo}
                                class="h-12 w-12 bg-gray-50 dark:bg-gray-900 rounded-full border-gray-50 dark:border-gray-900 border-2"
                              />
                            </Show>
                            <div class="flex flex-col flex-1 justify-center items-start gap-1 min-h-12 text-start">
                              <span class="font-semibold leading-4 break-anywhere">
                                {workspace.name}
                              </span>
                              <Show when={role}>
                                <span class="break-anywhere text-sm leading-3 opacity-80">
                                  {role?.name}
                                </span>
                              </Show>
                            </div>
                          </Card>
                        </button>
                      );
                    }}
                  </For>
                </Show>
              </div>
            </div>
          </div>
        </Show>
      </Card>
      <div class="flex-col absolute left-0 flex items-center justify-center w-full m-0 transform -bottom-8">
        <Button
          variant="text"
          text="soft"
          size="small"
          onClick={async () => {
            await fetch("/session/logout", { method: "POST" });
            setStorage({});
            navigateAndReload("/auth");
          }}
        >
          Logout
        </Button>
      </div>
      <WorkspaceSwitchOverlay destinationWorkspace={destinationWorkspace()} />
    </div>
  );
};

export { WorkspacesView, WorkspaceViewAction };
