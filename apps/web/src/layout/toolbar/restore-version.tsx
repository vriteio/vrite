import { Component, Show, createSignal } from "solid-js";
import { mdiRestore } from "@mdi/js";
import { useNavigate } from "@solidjs/router";
import { IconButton } from "#components/primitives";
import { useClient, useContentData, useHistoryData, useLocalStorage } from "#context";

interface RestoreVersionProps {
  onClick?(): void;
}

const RestoreVersion: Component<RestoreVersionProps> = (props) => {
  const { activeContentPieceId } = useContentData();
  const { activeVersionId } = useHistoryData();
  const { setStorage } = useLocalStorage();
  const navigate = useNavigate();
  const client = useClient();
  const [loading, setLoading] = createSignal(false);
  const restore = async (): Promise<void> => {
    try {
      setLoading(true);
      await client.versions.restore.mutate({ id: activeVersionId() });
    } finally {
      props.onClick?.();
      setLoading(false);
      setStorage((storage) => ({
        ...storage,
        sidePanelRightView:
          storage.sidePanelRightView === "history" ? "explorer" : storage.sidePanelRightView
      }));
      navigate(`/editor/${activeContentPieceId() || ""}`);
    }
  };

  return (
    <Show when={activeVersionId()}>
      <IconButton
        class="m-0"
        path={mdiRestore}
        loading={loading()}
        label="Restore version"
        variant="text"
        text="soft"
        onClick={restore}
      />
    </Show>
  );
};

export { RestoreVersion };
