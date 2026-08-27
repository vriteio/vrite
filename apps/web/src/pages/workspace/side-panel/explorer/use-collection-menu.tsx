import { type MenuItem } from "@andesine/components";
import { useNavigate, useParams } from "@solidjs/router";
import { createEffect, createMemo, createSignal, on } from "solid-js";
import { useClipboard } from "#web/context/clipboard";
import { useWorkspace } from "#web/context/workspace";
import { useTree } from "#web/components/tree";
import { usePublishingActions } from "./publishing-actions";
import { useRestrictedActions } from "./restricted-actions";

const useCollectionMenu = (collectionID: string) => {
  const { copyText } = useClipboard();
  const { content, currentWorkspace, hasPermission } = useWorkspace();
  const navigate = useNavigate();
  const params = useParams<{ workspaceID?: string }>();
  const publishingActions = usePublishingActions();
  const restrictedActions = useRestrictedActions();
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
    const containsRestrictionRoot = targetCollections.some((selectedCollection) => {
      return content.collections.containsRestrictionRoot({
        collectionID: selectedCollection.id
      });
    });
    const publishingTarget = {
      items: targetCollections.map((selectedCollection) => ({
        id: selectedCollection.id,
        label: selectedCollection.name,
        restricted: content.collections.isRestricted({ collectionID: selectedCollection.id })
      })),
      type: "collection" as const
    };
    const canManagePublishing =
      targetCollections.every((selectedCollection) => {
        return content.hasCollectionPermission(selectedCollection.id, "publishing");
      }) &&
      content.publishing() !== null &&
      !content.offline() &&
      !content.syncing();

    if (!isMulti) {
      const canEditCollection = Boolean(
        collection && content.hasCollectionPermission(collection.id, "content")
      );

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
          disabled: !canEditCollection,
          onClick: () => {
            if (!collection || content.readOnly(collection.id)) return;

            startRenaming(collectionID);
          },
          shortcut: "f2"
        }
      ]);
      opts.push([
        {
          label: "New entry",
          icon: "i-lucide:file-plus-2",
          disabled: !canEditCollection,
          onClick: () => {
            if (!collection || content.readOnly(collection.id)) return;

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
          disabled: !canEditCollection,
          onClick: () => {
            if (!collection || content.readOnly(collection.id)) return;

            const newCollection = content.collections.create({ parentID: collectionID });

            startRenaming(newCollection?.id || "");
            setExpanded((prev) => {
              return prev.includes(collectionID) ? prev : [...prev, collectionID];
            });
          },
          shortcut: "$mod+shift+c"
        }
      ]);

      if (hasPermission("restricted_collections") && collection) {
        const restrictionRoot = content.collections.isRestrictionRoot({ collectionID });
        const requiresPro = !restrictionRoot && currentWorkspace()?.subscriptionPlan !== "pro";
        const canManageAssignments =
          restrictionRoot &&
          currentWorkspace()?.subscriptionPlan === "pro" &&
          hasPermission("workspace");

        if (!requiresPro) {
          const restrictedOptions: MenuItem[] = [];

          if (canManageAssignments) {
            restrictedOptions.push({
              label: "Manage access",
              icon: "i-lucide:shield",
              onClick: () => {
                navigate(`/${params.workspaceID || ""}/${encodeURIComponent(collection.id)}`);
              }
            });
          }

          restrictedOptions.push({
            label: restrictionRoot ? "Derestrict access" : "Restrict access",
            icon: restrictionRoot ? "i-lucide:lock-open" : "i-lucide:lock",
            onClick: () => {
              restrictedActions.open({
                id: collection.id,
                label: collection.name,
                restricted: restrictionRoot
              });
            }
          });
          opts.push(restrictedOptions);
        }
      }
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
          onClick: () => {
            publishingActions.open("disable", publishingTarget);
          }
        });
      }

      opts.push(publishingOptions);
    }

    if (!containsRestrictionRoot || hasPermission("restricted_collections")) {
      const deletableIDs = content.tree.getDeletableIDs({
        ids: isMulti ? selection() : [collectionID]
      });
      const canDelete =
        deletableIDs.collections.every((id) => {
          return content.hasCollectionPermission(id, "content");
        }) &&
        deletableIDs.entries.every((id) => {
          const entry = content.entries.get({ entryID: id });

          return content.hasCollectionPermission(entry?.collectionID || null, "content");
        });

      opts.push([
        {
          label: isMulti ? `Delete ${selectedCount} items` : "Delete",
          icon: "i-lucide:trash",
          color: "danger",
          disabled: !canDelete,
          onClick: () => {
            const selectedIDs = selection();

            if (!canDelete || content.offline() || content.syncing()) return;

            content.tree.delete({ ids: isMulti ? selectedIDs : [collectionID] });
            setSelection([]);
          },
          shortcut: "$mod+backspace"
        }
      ]);
    }

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
