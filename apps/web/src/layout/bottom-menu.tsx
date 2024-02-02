import { mdiHexagonSlice6, mdiCards } from "@mdi/js";
import { Component, Show, createEffect, createSignal, onCleanup } from "solid-js";
import clsx from "clsx";
import { IconButton, Card, Button } from "#components/primitives";
import {
  App,
  Command,
  useAuthenticatedUserData,
  useCommandPalette,
  useContentData,
  useSharedState
} from "#context";

const StatDisplay: Component<{
  value: number;
  label: string;
}> = (props) => {
  return (
    <div class="px-2 leading-6 inline-flex h-6">
      <span class="mr-1 font-semibold font-mono leading-6 h-6 inline-flex">{props.value}</span>
      {props.label}
    </div>
  );
};
const StatsMenu: Component = () => {
  const { useSharedSignal } = useSharedState();
  const [sharedEditor] = useSharedSignal("editor");
  const [stats, setStats] = createSignal({
    words: 0,
    textCharacters: 0,
    paragraphs: 0,
    locs: 0
  });
  const updateStats = (): void => {
    let words = 0;
    let paragraphs = 0;
    let textCharacters = 0;
    let locs = 0;

    sharedEditor()?.state.doc.descendants((node) => {
      if (node.type.name !== "codeBlock") {
        words +=
          sharedEditor()?.storage.characterCount.words({
            node
          }) || 0;
        textCharacters +=
          sharedEditor()?.storage.characterCount.characters({
            node
          }) || 0;
      }

      if (node.type.name === "paragraph") {
        paragraphs += 1;
      }

      if (node.type.name === "codeBlock") {
        locs += node.textContent.split("\n").length;
      }

      return false;
    });
    setStats({
      words,
      paragraphs,
      textCharacters,
      locs
    });
  };

  createEffect(() => {
    sharedEditor()?.on("update", updateStats);
    onCleanup(() => {
      sharedEditor()?.off("update", updateStats);
    });
  });
  updateStats();

  return (
    <Show when={sharedEditor()}>
      <div class="flex text-gray-500 dark:text-gray-400 text-sm">
        <StatDisplay value={stats().paragraphs} label="paragraphs" />
        <StatDisplay value={stats().words} label="words" />
        <StatDisplay value={stats().textCharacters} label="characters" />
        <StatDisplay value={stats().locs} label="LOCs" />
      </div>
    </Show>
  );
};
const BottomMenu: Component = () => {
  const { variants, setActiveVariantId, activeVariantId } = useContentData();
  const { workspace } = useAuthenticatedUserData();
  const { open, registerCommand } = useCommandPalette();
  const VariantCommand: Component<{ selected?: boolean; variant: App.Variant }> = (props) => {
    return (
      <Card
        class={clsx(
          "flex justify-start items-center py-2 px-3 m-0 rounded-none border-none",
          props.selected && "bg-gray-300 dark:bg-gray-700 cursor-pointer",
          !props.selected && "bg-transparent"
        )}
        color="base"
      >
        <span class="flex-1">{props.variant.label}</span>
        <Button
          badge
          hover={false}
          class={clsx("m-0", props.selected && "bg-gray-100 dark:bg-gray-800")}
          text="soft"
          size="small"
        >
          {props.variant.key}
        </Button>
      </Card>
    );
  };
  const selectVariantCommand: Command = {
    category: "workspace",
    icon: mdiCards,
    name: "Select Variant",
    get subCommands() {
      return [
        ...Object.values(variants)
          .map((variant) => {
            if (!variant) return;

            return {
              icon: "",
              name: variant.label,
              render: (props) => <VariantCommand {...props} variant={variant} />,
              action: () => {
                setActiveVariantId(variant.id);
              }
            } as Command;
          })
          .filter(Boolean),
        {
          icon: "",
          name: "Base",
          action: () => {
            setActiveVariantId(null);
          }
        }
      ] as Array<{
        icon: string;
        name: string;
        action(): void;
      }>;
    }
  };

  registerCommand(selectVariantCommand);

  return (
    <div class="w-full flex m-0 bg-gray-50 dark:bg-gray-900 h-6 box-content z-20">
      <Show when={workspace()}>
        <IconButton
          path={mdiHexagonSlice6}
          label={<span class="max-w-48 clamp-1 pl-1">{workspace()!.name}</span>}
          link="/workspaces"
          size="small"
          class="m-0 rounded-0 px-2"
          variant="text"
          text="soft"
        />
      </Show>
      <IconButton
        path={mdiCards}
        label={
          <span class="max-w-48 clamp-1 pl-1">
            {activeVariantId() ? variants[activeVariantId()!]?.label : "Base"}
          </span>
        }
        size="small"
        class="m-0 rounded-0 px-2"
        variant="text"
        text="soft"
        onClick={() => {
          open("command", selectVariantCommand);
        }}
      />
      <div class="flex-1" />
      <StatsMenu />
    </div>
  );
};

export { BottomMenu };
