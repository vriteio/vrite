import { SolidEditor } from "@vrite/tiptap-solid";
import { mdiInformationOutline } from "@mdi/js";
import { Component, createSignal, onCleanup } from "solid-js";
import { Button, Dropdown, IconButton } from "#components/primitives";

interface StatsMenuProps {
  editor?: SolidEditor;
}

const StatsMenu: Component<StatsMenuProps> = (props) => {
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

  return (
    <div>
      <Dropdown
        placement="bottom-start"
        cardProps={{ class: "mt-3" }}
        activatorButton={() => (
          <IconButton
            path={mdiInformationOutline}
            label={`${stats().words} word${stats().words === 1 ? "" : "s"}`}
            text="soft"
            variant="text"
            class="m-0"
            id="content-piece-stats"
          />
        )}
      >
        <div class="grid w-64 grid-cols-2 text-gray-700 dark:text-gray-200">
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
    </div>
  );
};

export { StatsMenu };
