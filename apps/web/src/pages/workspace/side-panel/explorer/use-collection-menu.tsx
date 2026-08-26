import { type MenuItem } from "@andesine/components";
import { createEffect, createMemo, createSignal, on } from "solid-js";
import { useClipboard } from "#web/context/clipboard";
import { useWorkspace } from "#web/context/workspace";
import { useTree } from "#web/components/tree";
import { usePublishingActions } from "./publishing-actions";

const useCollectionMenu = (collectionID: string) => {
  const { copyText } = useClipboard();
  const { content, hasPermission } = useWorkspace();
  const publishingActions = usePublishingActions();
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
    const collection = content.collections.get({ collectionID });
    const selectedCollections = selection().flatMap((id) => {
      const selectedCollection = content.collections.get({ collectionID: id });

      return selectedCollection ? [selectedCollection] : [];
    });
    const targetCollections = isMulti ? selectedCollections : collection ? [collection] : [];
    const collectionsOnly = targetCollections.length === selectedCount;
    const publishingEnabled = targetCollections.every((selectedCollection) => {
      return content.isCollectionPublishingEnabled(selectedCollection.id);
    });
    const publishingRoot = targetCollections.some((selectedCollection) => {
      return content.isCollectionPublishingRoot(selectedCollection.id);
    });
    const publishingTarget = {
      items: targetCollections.map((selectedCollection) => ({
        id: selectedCollection.id,
        label: selectedCollection.name
      })),
      type: "collection" as const
    };
    const canManagePublishing =
      hasPermission("publishing") &&
      content.publishing() !== null &&
      !content.offline() &&
      !content.syncing();

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
          label: "New entry",
          icon: "i-lucide:file-plus-2",
          onClick: () => {
            if (content.readOnly()) return;

            const entry = content.entries.create({ collectionID });

            startRenaming(entry?.id || "");
            setExpanded((prev) => {
              return prev.includes(collectionID) ? prev : [...prev, collectionID];
            });
          },
          shortcut: "$mod+e"
        },
        {
          label: "New collection",
          icon: "i-material-symbols:create-new-folder-outline-rounded",
          onClick: () => {
            if (content.readOnly()) return;

            const collection = content.collections.create({ parentID: collectionID });

            startRenaming(collection?.id || "");
            setExpanded((prev) => {
              return prev.includes(collectionID) ? prev : [...prev, collectionID];
            });
          },
          shortcut: "$mod+shift+c"
        }
      ]);
    }

    if (collectionsOnly && canManagePublishing) {
      const publishingOptions: MenuItem[] = [];

      if (!publishingEnabled) {
        publishingOptions.push({
          label: isMulti ? `Enable publishing for ${selectedCount} groups` : "Enable publishing",
          icon: "i-lucide:radio",
          onClick: () => {
            publishingActions.open("enable", publishingTarget);
          }
        });
      }

      if (publishingEnabled) {
        publishingOptions.push(
          {
            label: isMulti ? `Publish ${selectedCount} groups` : "Publish group",
            icon: "i-material-symbols:publish-rounded",
            onClick: () => publishingActions.open("publish", publishingTarget)
          },
          {
            label: isMulti ? `Unpublish ${selectedCount} groups` : "Unpublish group",
            icon: "i-material-symbols:unpublished-outline-rounded",
            onClick: () => publishingActions.open("unpublish", publishingTarget)
          }
        );
      }

      if (publishingRoot) {
        publishingOptions.push({
          label: isMulti ? `Disable publishing for ${selectedCount} groups` : "Disable publishing",
          icon: "i-lucide:radio-off",
          color: "danger",
          onClick: () => {
            publishingActions.open("disable", publishingTarget);
          }
        });
      }

      opts.push(publishingOptions);
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
