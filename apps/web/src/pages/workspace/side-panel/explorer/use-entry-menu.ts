import { type MenuItem } from "@andesine/components";
import { createEffect, createMemo, createSignal, on } from "solid-js";
import { useTree } from "#web/components/tree";
import { useClipboard } from "#web/context/clipboard";
import { useWorkspace } from "#web/context/workspace";

const useEntryMenu = (entryID: string) => {
  const { copyText } = useClipboard();
  const { content } = useWorkspace();
  const [{ selection }, { setRenaming, setSelection }] = useTree();
  const [menuOpened, setMenuOpened] = createSignal(false);
  const startRenaming = () => {
    setMenuOpened(false);
    queueMicrotask(() => setRenaming(entryID));
  };
  const dropdownOptions = createMemo(() => {
    const options: Array<MenuItem[]> = [];
    const selectedCount = selection().length;
    const isMulti = selectedCount > 1;

    if (!isMulti) {
      options.push([
        {
          label: "Copy ID",
          icon: "i-lucide:copy",
          shortcut: "$mod+alt+c",
          onClick: () => {
            void copyText(entryID, {
              success: "ID copied to clipboard",
              fallback: { title: "Copy ID manually" }
            });
          }
        },
        {
          label: "Rename entry",
          icon: "i-lucide:pencil",
          shortcut: "f2",
          onClick: () => {
            if (!content.readOnly()) startRenaming();
          }
        }
      ]);
    }

    options.push([
      {
        label: isMulti ? `Delete ${selectedCount} items` : "Delete",
        icon: "i-lucide:trash",
        color: "danger",
        shortcut: "$mod+backspace",
        onClick: () => {
          if (content.readOnly()) return;
          content.tree.delete({ ids: isMulti ? selection() : [entryID] });
          setSelection([]);
        }
      }
    ]);
    return options;
  });

  createEffect(
    on(menuOpened, (opened) => {
      if (opened) setSelection((current) => (current.includes(entryID) ? current : [entryID]));
    })
  );

  return { dropdownOptions, menuOpened, setMenuOpened };
};

export { useEntryMenu };
