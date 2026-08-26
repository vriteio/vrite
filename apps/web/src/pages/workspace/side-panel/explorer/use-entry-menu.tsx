import { type MenuItem } from "@andesine/components";
import { createEffect, createMemo, createSignal, on } from "solid-js";
import { useTree } from "#web/components/tree";
import { useClipboard } from "#web/context/clipboard";
import { useWorkspace } from "#web/context/workspace";
import { usePublishingActions } from "./publishing-actions";

const useEntryMenu = (entryID: string) => {
  const { copyText } = useClipboard();
  const { content, hasPermission } = useWorkspace();
  const publishingActions = usePublishingActions();
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
    const entry = content.entries.get({ entryID });
    const selectedEntries = selection().flatMap((id) => {
      const selectedEntry = content.entries.get({ entryID: id });

      return selectedEntry ? [selectedEntry] : [];
    });
    const targetEntries = isMulti ? selectedEntries : entry ? [entry] : [];
    const entriesOnly = targetEntries.length === selectedCount;
    const publishingEnabled = targetEntries.every((selectedEntry) => {
      const status = content.getEntryPublishingStatus(selectedEntry.id);

      return status === "published" || status === "unpublished";
    });
    const publishingTarget = {
      items: targetEntries.map((selectedEntry) => ({
        id: selectedEntry.id,
        label: selectedEntry.name
      })),
      type: "entry" as const
    };
    const canManagePublishing =
      hasPermission("publishing") &&
      content.publishing() !== null &&
      !content.offline() &&
      !content.syncing();

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

    if (entriesOnly && publishingEnabled && canManagePublishing) {
      options.push([
        {
          label: isMulti ? `Publish current for ${selectedCount} entries` : "Publish current",
          icon: "i-material-symbols:publish-rounded",
          onClick: () => publishingActions.open("publish", publishingTarget)
        },
        {
          label: isMulti ? `Unpublish ${selectedCount} entries` : "Unpublish",
          icon: "i-material-symbols:unpublished-outline-rounded",
          onClick: () => publishingActions.open("unpublish", publishingTarget)
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
      if (!opened) return;

      setSelection((current) => (current.includes(entryID) ? current : [entryID]));
    })
  );

  return { dropdownOptions, menuOpened, setMenuOpened };
};

export { useEntryMenu };
