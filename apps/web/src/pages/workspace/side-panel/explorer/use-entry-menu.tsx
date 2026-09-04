import { type MenuItem } from "@andesine/components";
import { createEffect, createMemo, createSignal, on } from "solid-js";
import { useTree } from "#web/components/tree";
import { useClipboard } from "#web/context/clipboard";
import { useWorkspace } from "#web/context/workspace";
import { usePublishingActions } from "./publishing-actions";

const useEntryMenu = (entryID: string) => {
  const { copyText } = useClipboard();
  const { content } = useWorkspace();
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
      ids: targetEntries.map((selectedEntry) => selectedEntry.id),
      type: "entry" as const
    };
    const canEdit = targetEntries.every((selectedEntry) => {
      return content.canEntry(selectedEntry.collectionID || null, "entry:update");
    });
    const selectedIDs = isMulti ? selection() : [entryID];
    const selected = content.tree.splitIDs({ ids: selectedIDs });
    const canDelete =
      selected.collections.every((id) => {
        return content.canCollection(id, "collection:delete");
      }) &&
      selected.entries.every((id) => {
        const targetEntry = content.entries.get({ entryID: id });

        return content.canEntry(targetEntry?.collectionID || null, "entry:delete");
      });
    const canManagePublishing =
      targetEntries.every((selectedEntry) => {
        return content.canEntry(selectedEntry.collectionID || null, "publishing:publish");
      }) &&
      content.publishing() !== null &&
      !content.offline() &&
      !content.syncing();
    const migrationBlocked =
      selected.collections.some((id) => content.hasActiveSchemaMigration(id, true)) ||
      selected.entries.some((id) => {
        const selectedEntry = content.entries.get({ entryID: id });

        return content.hasActiveSchemaMigration(selectedEntry?.collectionID || null);
      });
    const migrationDisabled = migrationBlocked ? "Schema migration in progress" : false;

    if (!isMulti) {
      const entryOptions: MenuItem[] = [
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
        }
      ];

      if (canEdit) {
        entryOptions.push({
          label: "Rename entry",
          icon: "i-lucide:pencil",
          disabled: migrationDisabled,
          shortcut: "f2",
          onClick: () => {
            if (canEdit && !content.readOnly(entry?.collectionID || null)) startRenaming();
          }
        });
      }

      options.push(entryOptions);
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

    if (canDelete) {
      options.push([
        {
          label: isMulti ? `Delete ${selectedCount} items` : "Delete",
          icon: "i-lucide:trash",
          color: "danger",
          disabled: migrationDisabled,
          shortcut: "$mod+backspace",
          onClick: () => {
            if (!canDelete || content.offline() || content.syncing()) return;
            content.tree.delete({ ids: isMulti ? selection() : [entryID] });
            setSelection([]);
          }
        }
      ]);
    }
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
