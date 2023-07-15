import { ConfigureTokenSubSection, FreshToken } from "./configure-subsection";
import { SettingsSectionComponent } from "../view";
import {
  mdiClipboardOutline,
  mdiKey,
  mdiKeyPlus,
  mdiKeyStar,
  mdiPuzzle,
  mdiShieldKey,
  mdiTrashCan,
  mdiTune
} from "@mdi/js";
import {
  Accessor,
  Component,
  For,
  Show,
  createEffect,
  createSignal,
  on,
  onCleanup
} from "solid-js";
import { createStore } from "solid-js/store";
import { IconButton, Heading, Input, Tooltip, Loader, Card, Button } from "#components/primitives";
import { App, hasPermission, useClientContext, useNotificationsContext } from "#context";
import { TitledCard } from "#components/fragments";

const useTokens = (): {
  loading: Accessor<boolean>;
  moreToLoad: Accessor<boolean>;
  loadMore(): void;
  tokens(): Array<App.Token & { extension?: boolean }>;
} => {
  const [state, setState] = createStore<{
    tokens: Array<App.Token & { extension?: boolean }>;
  }>({
    tokens: []
  });
  const { client } = useClientContext();
  const [loading, setLoading] = createSignal(false);
  const [moreToLoad, setMoreToLoad] = createSignal(true);
  const loadMore = (): void => {
    const lastId = state.tokens[state.tokens.length - 1]?.id;

    if (loading() || !moreToLoad()) return;

    setLoading(true);
    client.tokens.list.query({ perPage: 20, lastId }).then((data) => {
      setLoading(false);
      setState("tokens", (tokens) => [...tokens, ...data]);
      setMoreToLoad(data.length === 20);
    });
  };

  loadMore();

  const tokensChanges = client.tokens.changes.subscribe(undefined, {
    onData({ action, data }) {
      switch (action) {
        case "create":
          setState("tokens", (tokens) => [data, ...tokens]);
          break;
        case "update":
          setState("tokens", (tokens) => {
            return tokens.map((token) => {
              if (token.id === data.id) {
                return { ...token, ...data };
              }

              return token;
            });
          });
          break;
        case "delete":
          setState("tokens", (tokens) => {
            return tokens.filter((token) => token.id !== data.id);
          });
          break;
      }
    }
  });

  onCleanup(() => {
    tokensChanges.unsubscribe();
  });

  return { loadMore, loading, moreToLoad, tokens: () => state.tokens };
};
const TokenDetails: Component<{
  token: {
    id: string;
    name: string;
    description: string;
    extension?: boolean;
  };
  onEdit?(): void;
  onDelete?(): void;
}> = (props) => {
  const { notify } = useNotificationsContext();
  const { client } = useClientContext();
  const [loading, setLoading] = createSignal(false);

  return (
    <Card class="flex flex-col gap-0 w-full m-0" color="contrast">
      <div class="flex items-start justify-center gap-2 w-full">
        <Heading level={3} class="flex-1 flex justify-start items-center min-h-8">
          {props.token.name || "[No name]"}
        </Heading>
        <Show
          when={!props.token.extension}
          fallback={
            <Tooltip text="Extension" class="mt-1">
              <IconButton path={mdiPuzzle} text="soft" class="m-0" badge />
            </Tooltip>
          }
        >
          <Show when={hasPermission("manageTokens")}>
            <Tooltip text="Edit" class="mt-1">
              <IconButton
                path={mdiTune}
                text="soft"
                disabled={loading()}
                class="m-0"
                onClick={() => {
                  props.onEdit?.();
                }}
              />
            </Tooltip>
            <Tooltip text="Delete" class="mt-1">
              <IconButton
                path={mdiTrashCan}
                text="soft"
                class="m-0"
                loading={loading()}
                onClick={async () => {
                  setLoading(true);
                  await client.tokens.delete.mutate({
                    id: props.token.id
                  });
                  setLoading(false);
                  props.onDelete?.();
                  notify({
                    text: "API Token deleted",
                    type: "success"
                  });
                }}
              />
            </Tooltip>
          </Show>
        </Show>
      </div>
      <Show when={props.token.description}>
        <p class="prose max-w-sm text-gray-500 dark:text-gray-400 ">{props.token.description}</p>
      </Show>
    </Card>
  );
};
const APISection: SettingsSectionComponent = (props) => {
  const { notify } = useNotificationsContext();
  const [createdToken, setCreatedToken] = createSignal<FreshToken | null>(null);
  const [editedTokenId, setEditedTokenId] = createSignal("");
  const [configureTokenSectionOpened, setConfigureTokenSectionOpened] = createSignal(false);
  const { loadMore, loading, moreToLoad, tokens } = useTokens();

  createEffect(
    on(configureTokenSectionOpened, (configureTokenSectionOpened) => {
      const onClick = (): void => {
        setConfigureTokenSectionOpened(true);
        props.setSubSection({
          label: "New API token",
          icon: mdiKeyPlus,
          goBack() {
            setConfigureTokenSectionOpened(false);
          }
        });
      };

      if (configureTokenSectionOpened) {
        setCreatedToken(null);
      } else {
        setEditedTokenId("");
        props.setSubSection(null);
        props.setActionComponent(() => {
          return (
            <Show when={hasPermission("manageTokens")}>
              <Button color="primary" class="m-0" onClick={onClick}>
                New API token
              </Button>
            </Show>
          );
        });
      }
    })
  );

  return (
    <Show
      when={!configureTokenSectionOpened()}
      fallback={
        <ConfigureTokenSubSection
          setActionComponent={props.setActionComponent}
          editedTokenId={editedTokenId()}
          onTokenConfigured={(token) => {
            setCreatedToken(token);
            setConfigureTokenSectionOpened(false);
          }}
        />
      }
    >
      <Show when={createdToken()}>
        <TitledCard icon={mdiKeyStar} label={createdToken()?.name || "[No name]"} gradient>
          <p class="w-full">Save your API token now. You won’t be able to see it again!</p>
          <div class="flex items-center justify-center gap-2 w-full">
            <Input
              value={createdToken()?.token || ""}
              color="contrast"
              wrapperClass="flex-1"
              class="m-0 text-gray-700 dark:text-white"
            />
            <Tooltip text="Copy" class="mt-1">
              <IconButton
                path={mdiClipboardOutline}
                text="soft"
                color="contrast"
                class="m-0"
                onClick={async () => {
                  await window.navigator.clipboard.writeText(createdToken()?.token || "");
                  notify({
                    text: "Token copied to the clipboard",
                    type: "success"
                  });
                }}
              />
            </Tooltip>
          </div>
        </TitledCard>
      </Show>
      <TitledCard icon={mdiShieldKey} label="Access tokens">
        <Show when={tokens().length || !loading()} fallback={<Loader />}>
          <For each={tokens()} fallback={<p class="px-2 w-full text-start">No tokens found</p>}>
            {(token) => {
              return (
                <TokenDetails
                  token={token}
                  onEdit={() => {
                    setEditedTokenId(token.id);
                    setConfigureTokenSectionOpened(true);
                    props.setSubSection({
                      label: "Edit API token",
                      icon: mdiKey,
                      goBack() {
                        setConfigureTokenSectionOpened(false);
                      }
                    });
                  }}
                  onDelete={() => {
                    if (createdToken()?.id === token.id) {
                      setCreatedToken(null);
                    }
                  }}
                />
              );
            }}
          </For>
          <Show when={moreToLoad()}>
            <Button
              class="m-0 w-full"
              text="soft"
              loading={loading()}
              onClick={() => {
                loadMore();
              }}
            >
              Load more
            </Button>
          </Show>
        </Show>
      </TitledCard>
    </Show>
  );
};

export { APISection };
