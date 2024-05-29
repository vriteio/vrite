import { ConfigureVariantSubsection } from "./configure-subsection";
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
import { mdiFormatListBulleted, mdiPlusCircle, mdiTrashCan, mdiTune } from "@mdi/js";
import { createStore } from "solid-js/store";
import { CollapsibleSection } from "#components/fragments";
import { App, hasPermission, useClient, useNotifications } from "#context";
import { Button, Card, Heading, IconButton, Loader, Tooltip } from "#components/primitives";

interface VariantDetailsProps {
  variant: App.Variant;
  onEdit?(): void;
  onDelete?(): void;
}

const useVariants = (): {
  loading: Accessor<boolean>;
  variants(): Array<App.Variant>;
} => {
  const client = useClient();
  const [loading, setLoading] = createSignal(false);
  const [state, setState] = createStore<{
    variants: Array<App.Variant>;
  }>({
    variants: []
  });
  const loadData = async (): Promise<void> => {
    setLoading(true);
    client.variants.list.query().then((data) => {
      setLoading(false);
      setState("variants", (variants) => [...variants, ...data]);
    });
  };
  const variantsChanges = client.variants.changes.subscribe(undefined, {
    onData({ action, data }) {
      switch (action) {
        case "create":
          setState("variants", (variants) => [data, ...variants]);
          break;
        case "update":
          setState("variants", (variants) => {
            return variants.map((variant) => {
              if (variant.id === data.id) {
                return { ...variant, ...data };
              }

              return variant;
            });
          });
          break;
        case "delete":
          setState("variants", (variants) => {
            return variants.filter((variant) => variant.id !== data.id);
          });
          break;
      }
    }
  });

  loadData();
  onCleanup(() => {
    variantsChanges.unsubscribe();
  });

  return { loading, variants: () => state.variants };
};
const VariantDetails: Component<VariantDetailsProps> = (props) => {
  const client = useClient();
  const { notify } = useNotifications();
  const [loading, setLoading] = createSignal(false);

  return (
    <Card class="relative flex flex-col m-0 w-full">
      <div class="flex gap-1 justify-center items-center">
        <Button badge size="small" class="m-0" hover={false}>
          {props.variant.key}
        </Button>
        <div class="flex-1" />
        <Show when={hasPermission("manageVariants")}>
          <div class="flex gap-2">
            <Tooltip text="Edit" class="mt-1">
              <IconButton
                disabled={loading()}
                path={mdiTune}
                class="m-0"
                text="soft"
                onClick={() => {
                  props.onEdit?.();
                }}
              />
            </Tooltip>
            <Tooltip text="Delete" class="mt-1">
              <IconButton
                path={mdiTrashCan}
                loading={loading()}
                class="m-0"
                text="soft"
                onClick={async () => {
                  setLoading(true);
                  await client.variants.delete.mutate({ id: props.variant.id });
                  setLoading(false);
                  props.onDelete?.();
                  notify({ text: "Variant deleted", type: "success" });
                }}
              />
            </Tooltip>
          </div>
        </Show>
      </div>
      <Heading level={2} class="break-anywhere">
        {props.variant.label}
      </Heading>
      <p class="font-mono text-xs break-anywhere text-gray-500 dark:text-gray-400 ">
        {props.variant.description}
      </p>
    </Card>
  );
};
const VariantsSection: SettingsSectionComponent = (props) => {
  const [editedVariantData, setEditedVariantData] = createSignal<App.Variant | null>(null);
  const { variants, loading } = useVariants();
  const [configureVariantSectionOpened, setConfigureVariantSectionOpened] = createSignal(false);

  createEffect(
    on(configureVariantSectionOpened, (configureVariantSectionOpened) => {
      if (!configureVariantSectionOpened) {
        setEditedVariantData(null);
        props.setSubSection(null);
        props.setActionComponent(() => {
          return (
            <Show when={hasPermission("manageVariants")}>
              <Button
                color="primary"
                class="m-0"
                onClick={() => {
                  setConfigureVariantSectionOpened(true);
                  props.setSubSection({
                    label: "New Variant",
                    icon: mdiPlusCircle,
                    goBack() {
                      setConfigureVariantSectionOpened(false);
                    }
                  });
                }}
              >
                New Variant
              </Button>
            </Show>
          );
        });
      }
    })
  );

  return (
    <Show
      when={!configureVariantSectionOpened()}
      fallback={
        <ConfigureVariantSubsection
          editedVariantData={editedVariantData()}
          setActionComponent={props.setActionComponent}
          onVariantConfigured={() => {
            setConfigureVariantSectionOpened(false);
          }}
        />
      }
    >
      <CollapsibleSection icon={mdiFormatListBulleted} label="List">
        <Show
          when={variants().length || !loading()}
          fallback={
            <div class="flex justify-center items-center">
              <Loader />
            </div>
          }
        >
          <For
            each={variants()}
            fallback={<p class="px-2 w-full text-start">No registered Variants</p>}
          >
            {(variant) => (
              <VariantDetails
                variant={variant}
                onEdit={() => {
                  setEditedVariantData(variant);
                  setConfigureVariantSectionOpened(true);
                  props.setSubSection({
                    label: "Edit Variant",
                    icon: mdiTune,
                    goBack() {
                      setConfigureVariantSectionOpened(false);
                    }
                  });
                }}
              />
            )}
          </For>
        </Show>
      </CollapsibleSection>
    </Show>
  );
};

export { VariantsSection };
