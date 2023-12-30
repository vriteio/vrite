import { mdiHexagonSlice6, mdiCards, mdiSourceBranch } from "@mdi/js";
import { IconButton } from "@vrite/components";
import { Component } from "solid-js";
import { useCommandPalette } from "#context";

const BottomMenu: Component = () => {
  const { setOpened, registerCommand } = useCommandPalette();

  registerCommand({
    category: "workspace",
    icon: mdiCards,
    name: "Select Variant",
    subCommands: [
      {
        icon: "",
        name: "Polish",
        action: () => {
          console.log("polish");
        }
      },
      {
        icon: "",
        name: "Base",
        action: () => {
          console.log("base");
        }
      }
    ]
  });

  return (
    <div class="w-full flex z-50 m-0 bg-gray-50 dark:bg-gray-900 h-6 border-t-2 border-gray-200 dark:border-gray-700 box-content">
      <IconButton
        path={mdiHexagonSlice6}
        label="Drizzle ORM"
        size="small"
        class="m-0 rounded-0 px-2"
        variant="text"
        text="soft"
      />
      <IconButton
        path={mdiCards}
        label="Base Variant"
        size="small"
        class="m-0 rounded-0 px-2"
        variant="text"
        text="soft"
        onClick={() => {
          setOpened(true);
        }}
      />
    </div>
  );
};

export { BottomMenu };
