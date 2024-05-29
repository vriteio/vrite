import { ProviderConfigurationView } from "./provider-configuration-view";
import { InitialSetupView } from "./initial-setup-view";
import { providers } from "./providers";
import { SyncView } from "./sync-view";
import {
  Accessor,
  Component,
  createMemo,
  createSignal,
  Match,
  onCleanup,
  Show,
  Switch
} from "solid-js";
import { mdiChevronLeft, mdiClose, mdiTune } from "@mdi/js";
import clsx from "clsx";
import { Dynamic } from "solid-js/web";
import { Motion, Presence } from "solid-motionone";
import { Card, Heading, IconButton, Loader } from "#components/primitives";
import { ScrollShadow } from "#components/fragments";
import { createRef } from "#lib/utils";
import { App, useClient, useLocalStorage } from "#context";

interface SubSection {
  label: string;
  icon: string;
  goBack(): void;
}

const useGitConfig = (): {
  gitConfig: Accessor<App.GitData | null>;
  loading: Accessor<boolean>;
} => {
  const client = useClient();
  const [gitConfig, setGitConfig] = createSignal<App.GitData | null>(null);
  const [loading, setLoading] = createSignal(true);
  const gitConfigChanges = client.git.changes.subscribe(undefined, {
    onData({ action, data }) {
      if (action === "configure") {
        setGitConfig(data);
      } else if (action === "reset") {
        setGitConfig(null);
      } else if (action === "update") {
        setGitConfig((gitConfig) => {
          if (gitConfig) {
            return {
              ...gitConfig,
              ...data
            };
          }

          return null;
        });
      }
    }
  });

  client.git.config
    .query()
    .then((gitConfig) => {
      setGitConfig(gitConfig);
    })
    .catch(() => {
      setGitConfig(null);
    })
    .finally(() => {
      setLoading(false);
    });
  onCleanup(() => {
    gitConfigChanges.unsubscribe();
  });

  return { gitConfig, loading };
};
const GitView: Component = () => {
  const { setStorage, storage } = useLocalStorage();
  const [scrollableContainerRef, setScrollableContainerRef] = createRef<HTMLElement | null>(null);
  const [subSection, setSubSection] = createSignal<SubSection | null>(null);
  const [actionComponent, setActionComponent] = createSignal<Component<{}> | null>(null);
  const openedProvider = (): string => storage().sourceControlSection || "";
  const setOpenedProvider = (providerName: string): void => {
    setStorage((storage) => ({
      ...storage,
      sourceControlSection: providerName
    }));
  };
  const { gitConfig, loading } = useGitConfig();
  const configured = createMemo(() => {
    return Boolean(gitConfig()?.github);
  });
  const currentSection = createMemo(() => {
    const providerName = openedProvider();
    const provider = providers.find(({ name }) => providerName === name);

    if (!provider) return { label: "Source control", name: "menu", icon: "" };

    return { label: `Configure ${provider.label}`, name: provider.name, icon: provider.icon };
  });

  return (
    <Card
      class="@container m-0 p-0 border-0 rounded-none flex flex-col h-full overflow-auto scrollbar-sm-contrast"
      color="contrast"
    >
      <div
        class={clsx(
          "flex justify-start items-start mb-4 px-5 flex-col",
          openedProvider() ? "pt-2" : "pt-5"
        )}
      >
        <IconButton
          variant="text"
          class={clsx("m-0 h-6 -mb-1", !openedProvider() && "hidden")}
          onClick={() => {
            if (subSection()) {
              subSection()?.goBack();
              setSubSection(null);
            } else {
              setActionComponent(null);
              setOpenedProvider("");
            }
          }}
          label={subSection() ? currentSection().label : "Source control"}
          size="small"
          path={mdiChevronLeft}
        ></IconButton>

        <Show
          when={openedProvider()}
          fallback={
            <div class="flex justify-center items-center w-full">
              <IconButton
                path={mdiClose}
                text="soft"
                badge
                class="flex md:hidden mr-2 m-0"
                onClick={() => {
                  setStorage((storage) => ({
                    ...storage,
                    sidePanelWidth: 0
                  }));
                }}
              />
              <Heading level={1} class="py-1 flex-1">
                {currentSection().label}
              </Heading>
              <Show when={gitConfig()}>
                <IconButton
                  path={
                    providers.find(({ name }) => name === gitConfig()!.provider)?.icon || mdiTune
                  }
                  class="m-0"
                  onClick={() => {
                    setOpenedProvider(gitConfig()!.provider);
                  }}
                />
              </Show>
            </div>
          }
        >
          <div class="flex justify-center items-center w-full">
            <IconButton
              class="m-0 mr-1"
              path={subSection() ? subSection()?.icon : currentSection().icon}
              variant="text"
              hover={false}
              badge
            />
            <Heading level={2} class="flex-1">
              {subSection() ? subSection()?.label : currentSection().label}
            </Heading>
            <Show when={actionComponent()}>
              <Dynamic component={actionComponent()!} />
            </Show>
          </div>
        </Show>
      </div>
      <div class="flex-col h-full relative flex overflow-hidden">
        <ScrollShadow scrollableContainerRef={scrollableContainerRef} color="contrast" />
        <div
          class="w-full h-full overflow-x-hidden overflow-y-auto scrollbar-sm-contrast px-5"
          ref={setScrollableContainerRef}
        >
          <div class="flex justify-start flex-col min-h-full h-full items-start w-full relative">
            <Presence initial={false}>
              <Show when={openedProvider() || true} keyed>
                <Motion.div
                  initial={{ opacity: 0, x: openedProvider() ? "100%" : "-100%" }}
                  animate={{ opacity: 1, x: "0%" }}
                  exit={{ opacity: 0, x: openedProvider() ? "100%" : "-100%" }}
                  transition={{ duration: 0.35 }}
                  class="flex justify-start flex-col min-h-[calc(100%-env(safe-area-inset-bottom,0px))] items-start w-full absolute pb-5"
                >
                  <Switch>
                    <Match when={loading()}>
                      <div class="flex justify-center items-center w-full">
                        <Loader />
                      </div>
                    </Match>
                    <Match when={openedProvider()}>
                      <ProviderConfigurationView
                        close={() => setOpenedProvider("")}
                        gitData={gitConfig() || null}
                        providerName={openedProvider()!}
                        setOpenedProvider={setOpenedProvider}
                        setActionComponent={(component) => setActionComponent(() => component)}
                      />
                    </Match>
                    <Match when={!openedProvider() && !configured()}>
                      <InitialSetupView setOpenedProvider={setOpenedProvider} />
                    </Match>
                    <Match when={!openedProvider() && configured()}>
                      <SyncView
                        gitData={gitConfig()!}
                        setActionComponent={(component) => setActionComponent(() => component)}
                      />
                    </Match>
                  </Switch>
                </Motion.div>
              </Show>
            </Presence>
          </div>
        </div>
      </div>
    </Card>
  );
};

export { GitView };
