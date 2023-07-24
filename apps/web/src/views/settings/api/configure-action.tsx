import { FreshToken } from "./configure-subsection";
import { mdiCheck, mdiRefresh } from "@mdi/js";
import { Component, Show } from "solid-js";
import { createStore } from "solid-js/store";
import { Tooltip, IconButton, Button } from "#components/primitives";
import { App, useClient, useNotifications } from "#context";

interface ConfigureTokenActionProps {
  editedTokenId: string;
  tokenData: Omit<App.Token, "id">;
  onTokenConfigured(token: FreshToken | null): void;
}

const ConfigureTokenAction: Component<ConfigureTokenActionProps> = (props) => {
  const client = useClient();
  const { notify } = useNotifications();
  const [loading, setLoading] = createStore({
    regenerate: false,
    save: false
  });
  const onClick = async (): Promise<void> => {
    setLoading("save", true);

    try {
      let value = "";

      if (props.editedTokenId) {
        await client.tokens.update.mutate({
          ...props.tokenData,
          id: props.editedTokenId
        });
        props.onTokenConfigured(null);
      } else {
        const result = await client.tokens.create.mutate(props.tokenData);

        value = result.value || "";
        props.onTokenConfigured({
          id: result.id,
          token: value || "",
          name: props.tokenData.name
        });
      }

      setLoading("save", false);
      notify({
        type: "success",
        text: props.editedTokenId ? "API token updated" : "New API token created"
      });
    } catch (e) {
      let text = "Failed to create a new API token";

      if (props.editedTokenId) text = "Failed to update the API token";

      setLoading("save", false);
      notify({
        type: "error",
        text
      });
    }
  };

  return (
    <div class="flex gap-2 justify-center items-center">
      <Show when={props.editedTokenId}>
        <Tooltip text="Regenerate token" class="mt-1">
          <IconButton
            path={mdiRefresh}
            text="soft"
            class="m-0"
            loading={loading.regenerate}
            onClick={async () => {
              setLoading("regenerate", true);

              try {
                const { value } = await client.tokens.regenerate.mutate({
                  id: props.editedTokenId
                });

                setLoading("regenerate", false);
                notify({
                  type: "success",
                  text: "API token regenerated"
                });
                props.onTokenConfigured({
                  id: props.editedTokenId,
                  token: value || "",
                  name: props.tokenData.name
                });
              } catch (e) {
                setLoading("regenerate", false);
                notify({
                  type: "error",
                  text: "Failed to regenerate API token"
                });
              }
            }}
          />
        </Tooltip>
      </Show>
      <Tooltip
        text={props.editedTokenId ? "Update API token" : "Create API token"}
        fixed
        class="mt-1"
        wrapperClass="flex @md:hidden"
      >
        <IconButton
          color="primary"
          class="m-0 flex justify-center items-center"
          disabled={!props.tokenData.name}
          loading={loading.save}
          path={mdiCheck}
          onClick={onClick}
        />
      </Tooltip>
      <Button
        loading={loading.save}
        disabled={!props.tokenData.name}
        color="primary"
        class="m-0 hidden @md:flex"
        onClick={onClick}
      >
        {props.editedTokenId ? "Update API token" : "Create API token"}
      </Button>
    </div>
  );
};

export { ConfigureTokenAction };
