import { Accessor, Component, For, Show, createSignal, onCleanup } from "solid-js";
import { createStore } from "solid-js/store";
import clsx from "clsx";
import { App, useClientContext, useUIContext } from "#context";
import { Button, Loader } from "#components/primitives";

interface VariantsSectionProps {
  activeVariant: App.Variant | null;
  setActiveVariant(variant: App.Variant | null): void;
}

const useVariants = (): {
  loading: Accessor<boolean>;
  variants(): Array<App.Variant>;
} => {
  const { client } = useClientContext();
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
const VariantsSection: Component<VariantsSectionProps> = (props) => {
  const { setReferences } = useUIContext();
  const { loading, variants } = useVariants();

  return (
    <div class="w-full flex flex-col m-0 p-0 gap-1 items-start">
      <div class="flex flex-wrap justify-start items-center gap-2 w-full p-0">
        <For
          each={variants()}
          fallback={
            <Show
              when={loading()}
              fallback={
                <span class="text-gray-500 dark:text-gray-400 px-1">No Variants found</span>
              }
            >
              <Loader />
            </Show>
          }
        >
          {(variant) => {
            const active = (): boolean => {
              return props.activeVariant?.id === variant.id;
            };

            return (
              <Button
                class="flex text-start pr-1 m-0"
                color={active() ? "primary" : "base"}
                text={active() ? "primary" : "soft"}
                onClick={() => {
                  if (active()) {
                    props.setActiveVariant(null);
                    setReferences({ activeVariant: undefined });
                  } else {
                    props.setActiveVariant(variant);
                    setReferences({ activeVariant: variant });
                  }
                }}
              >
                <span class="flex-1 mr-2">{variant.label}</span>
                <Button
                  badge
                  hover={false}
                  class="m-0 bg-gray-100 dark:bg-gray-800"
                  text="soft"
                  size="small"
                >
                  {variant.name}
                </Button>
              </Button>
            );
          }}
        </For>
      </div>
    </div>
  );
};

export { VariantsSection };
