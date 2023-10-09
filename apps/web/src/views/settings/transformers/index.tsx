import { ConfigureTransformerSubsection } from "./configure-subsection";
import { SettingsSectionComponent } from "../view";
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
import { mdiFormatListBulleted, mdiPlusCircle, mdiPuzzle, mdiTrashCan, mdiTune } from "@mdi/js";
import { createStore } from "solid-js/store";
import { TitledCard } from "#components/fragments";
import { App, hasPermission, useClient, useNotifications } from "#context";
import { Button, Card, Heading, IconButton, Loader, Tooltip } from "#components/primitives";

interface TransformerDetailsProps {
  transformer: App.Transformer & { inUse?: boolean; extension?: boolean };
  onEdit?(): void;
  onDelete?(): void;
}

const useTransformers = (): {
  loading: Accessor<boolean>;
  transformers(): Array<App.Transformer & { inUse?: boolean; extension?: boolean }>;
} => {
  const client = useClient();
  const [loading, setLoading] = createSignal(false);
  const [state, setState] = createStore<{
    transformers: Array<App.Transformer & { inUse?: boolean; extension?: boolean }>;
  }>({
    transformers: []
  });
  const loadData = async (): Promise<void> => {
    setLoading(true);
    client.transformers.list.query().then((data) => {
      setLoading(false);
      setState("transformers", (transformers) => [...transformers, ...data]);
    });
  };
  const transformersChanges = client.transformers.changes.subscribe(undefined, {
    onData({ action, data }) {
      switch (action) {
        case "create":
          setState("transformers", (transformers) => [data, ...transformers]);
          break;
        case "delete":
          setState("transformers", (transformers) => {
            return transformers.filter((transformer) => transformer.id !== data.id);
          });
          break;
      }
    }
  });

  loadData();
  onCleanup(() => {
    transformersChanges.unsubscribe();
  });

  return { loading, transformers: () => state.transformers };
};
const TransformerDetails: Component<TransformerDetailsProps> = (props) => {
  const client = useClient();
  const { notify } = useNotifications();
  const [loading, setLoading] = createSignal(false);

  return (
    <Card color="contrast" class="relative flex m-0 w-full gap-1 justify-center items-start">
      <Heading level={2} class="break-anywhere flex-1">
        {props.transformer.label}
      </Heading>
      <Show
        when={!props.transformer.extension}
        fallback={
          <Tooltip text="Extension" class="mt-1">
            <IconButton path={mdiPuzzle} text="soft" class="m-0" badge />
          </Tooltip>
        }
      >
        <Show when={hasPermission("manageWorkspace")}>
          <div class="flex gap-2">
            <Tooltip text="Delete" class="mt-1" enabled={!props.transformer.inUse}>
              <IconButton
                path={mdiTrashCan}
                loading={loading()}
                disabled={props.transformer.inUse}
                class="m-0"
                text="soft"
                onClick={async () => {
                  setLoading(true);
                  await client.transformers.delete.mutate({ id: props.transformer.id });
                  setLoading(false);
                  props.onDelete?.();
                  notify({ text: "Transformer deleted", type: "success" });
                }}
              />
            </Tooltip>
          </div>
        </Show>
      </Show>
    </Card>
  );
};
const TransformersSection: SettingsSectionComponent = (props) => {
  const { transformers, loading } = useTransformers();
  const [configureTransformerSectionOpened, setConfigureTransformerSectionOpened] =
    createSignal(false);

  createEffect(
    on(configureTransformerSectionOpened, (configureTransformerSectionOpened) => {
      if (!configureTransformerSectionOpened) {
        props.setSubSection(null);
        props.setActionComponent(() => {
          return (
            <Show when={hasPermission("manageWorkspace")}>
              <Button
                color="primary"
                class="m-0"
                onClick={() => {
                  setConfigureTransformerSectionOpened(true);
                  props.setSubSection({
                    label: "New Transformer",
                    icon: mdiPlusCircle,
                    goBack() {
                      setConfigureTransformerSectionOpened(false);
                    }
                  });
                }}
              >
                New Transformer
              </Button>
            </Show>
          );
        });
      }
    })
  );

  return (
    <Show
      when={!configureTransformerSectionOpened()}
      fallback={
        <ConfigureTransformerSubsection
          setActionComponent={props.setActionComponent}
          onTransformerConfigured={() => {
            setConfigureTransformerSectionOpened(false);
          }}
        />
      }
    >
      <TitledCard icon={mdiFormatListBulleted} label="List">
        <Show when={transformers().length || !loading()} fallback={<Loader />}>
          <For
            each={transformers()}
            fallback={<p class="px-2 w-full text-start">No registered Transformers</p>}
          >
            {(transformer) => <TransformerDetails transformer={transformer} />}
          </For>
        </Show>
      </TitledCard>
    </Show>
  );
};

export { TransformersSection };
