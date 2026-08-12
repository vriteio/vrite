import { type MenuItem } from "@andesine/components";
import { createEffect, createMemo, createSignal, on } from "solid-js";
import { useClipboard } from "#web/context/clipboard";
import { useWorkspace } from "#web/context/workspace";
import { useTree } from "#web/components/tree";

const useCollectionMenu = (collectionID: string) => {
  const { copyText } = useClipboard();
  const { content } = useWorkspace();
  const [{ selection }, { setExpanded, setRenaming, setSelection }] = useTree();
  const [menuOpened, setMenuOpened] = createSignal(false);
  const startRenaming = (id: string) => {
    setMenuOpened(false);
    queueMicrotask(() => setRenaming(id));
  };
  const dropdownOptions = createMemo(() => {
    const opts: Array<MenuItem[]> = [];
    const selectedCount = selection().length;
    const isMulti = selectedCount > 1;

    if (!isMulti) {
      opts.push([
        {
          label: "Copy ID",
          icon: "i-lucide:copy",
          shortcut: "$mod+alt+c",
          onClick: () => {
            void copyText(collectionID, {
              success: "ID copied to clipboard",
              fallback: { title: "Copy ID manually" }
            });
          }
        },
        {
          label: "Rename group",
          icon: "i-lucide:pencil",
          onClick: () => {
            if (content.readOnly()) return;

            startRenaming(collectionID);
          },
          shortcut: "f2"
        }
      ]);
      opts.push([
        {
          label: "New piece",
          icon: "i-material-symbols:create-new-folder-outline-rounded",
          onClick: () => {
            if (content.readOnly()) return;

            const entry = content.entries.create({ collectionID });

            startRenaming(entry?.id || "");
            setExpanded((prev) => {
              return prev.includes(collectionID) ? prev : [...prev, collectionID];
            });
          },
          shortcut: "$mod+n"
        },
        {
          label: "New group",
          icon: "i-lucide:file-plus-2",
          onClick: () => {
            if (content.readOnly()) return;

            const collection = content.collections.create({ parentID: collectionID });

            startRenaming(collection?.id || "");
            setExpanded((prev) => {
              return prev.includes(collectionID) ? prev : [...prev, collectionID];
            });
          },
          shortcut: "$mod+shift+n"
        }
      ]);
    }

    opts.push([
      {
        label: isMulti ? `Delete ${selectedCount} items` : "Delete",
        icon: "i-lucide:trash",
        color: "danger",
        onClick: () => {
          const selectedIDs = selection();

          if (content.readOnly()) return;

          content.tree.delete({ ids: isMulti ? selectedIDs : [collectionID] });
          setSelection([]);
        },
        shortcut: "$mod+backspace"
      }
    ]);

    return opts;
  });

  createEffect(
    on(menuOpened, (opened) => {
      if (!opened) return;
      setSelection((current) => (current.includes(collectionID) ? current : [collectionID]));
    })
  );

  return { dropdownOptions, menuOpened, setMenuOpened };
};

export { useCollectionMenu };
