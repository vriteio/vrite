import { SolidEditor } from "@vrite/tiptap-solid";
import { mdiInformationOutline } from "@mdi/js";
import { Component, createSignal, onCleanup } from "solid-js";
import clsx from "clsx";
import { Button, Dropdown, IconButton } from "#components/primitives";
import { useCommandPalette } from "#context";

interface StatsMenuProps {
  editor?: SolidEditor;
  wrapperClass?: string;
  class?: string;
  onClick?(): void;
}

const StatsMenu: Component<StatsMenuProps> = (props) => {
  const { registerCommand } = useCommandPalette();
  const [opened, setOpened] = createSignal(false);
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

    props.editor?.state.doc.descendants((node) => {
      if (node.type.name !== "codeBlock") {
        words +=
          props.editor?.storage.characterCount.words({
            node
          }) || 0;
        textCharacters +=
          props.editor?.storage.characterCount.characters({
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

  props.editor?.on("update", updateStats);
  updateStats();
  onCleanup(() => {
    props.editor?.off("update", updateStats);
  });
  registerCommand({
    action() {
      setOpened(true);
    },
    category: "editor",
    icon: mdiInformationOutline,
    name: "View stats"
  });

  return (
    <Dropdown
      placement="bottom-start"
      cardProps={{ class: "mt-3" }}
      fixed
      opened={opened()}
      setOpened={setOpened}
      class={props.wrapperClass}
      activatorWrapperClass="w-full"
      activatorButton={() => (
        <IconButton
          path={mdiInformationOutline}
          label={`${stats().words} word${stats().words === 1 ? "" : "s"}`}
          onClick={props.onClick}
          text="soft"
          variant="text"
          class={clsx("m-0", props.class)}
          id="content-piece-stats"
        />
      )}
    >
      <div class="grid md:w-64 grid-cols-2 text-gray-700 dark:text-gray-200">
        <Button
          class="flex flex-col items-start justify-center p-2"
          color="contrast"
          text="soft"
          badge
        >
          <span class="mr-2 text-2xl font-bold">{stats().paragraphs}</span>
          <span class="text-sm">paragraphs</span>
        </Button>
        <Button
          class="flex flex-col items-start justify-center p-2"
          color="contrast"
          text="soft"
          badge
        >
          <span class="mr-2 text-2xl font-bold">{stats().words}</span>
          <span class="text-sm">words</span>
        </Button>
        <Button
          class="flex flex-col items-start justify-center p-2"
          color="contrast"
          text="soft"
          badge
        >
          <span class="mr-2 text-2xl font-bold">{stats().textCharacters}</span>
          <span class="text-sm whitespace-nowrap">text characters</span>
        </Button>
        <Button
          class="flex flex-col items-start justify-center p-2"
          color="contrast"
          text="soft"
          badge
        >
          <span class="mr-2 text-2xl font-bold">{stats().locs}</span>
          <span class="text-sm">LOCs</span>
        </Button>
      </div>
    </Dropdown>
  );
};

export { StatsMenu };
