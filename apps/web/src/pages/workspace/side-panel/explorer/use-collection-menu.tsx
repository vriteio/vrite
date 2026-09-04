import { type MenuItem } from "@andesine/components";
import { useNavigate, useParams } from "@solidjs/router";
import { createEffect, createMemo, createSignal, type JSX, on } from "solid-js";
import { useClipboard } from "#web/context/clipboard";
import { useNotify } from "#web/context/notifications";
import { useWorkspace } from "#web/context/workspace";
import { useTree } from "#web/components/tree";
import { usePublishingActions } from "./publishing-actions";
import { useSchemaActions } from "./schema-actions";
import { ExplorerSchemaMigrationMenu } from "./explorer-schema-migration";

const useCollectionMenu = (collectionID: string) => {
  const { copyText } = useClipboard();
  const notify = useNotify();
  const { content, currentWorkspace } = useWorkspace();
  const navigate = useNavigate();
  const params = useParams<{ workspaceID?: string }>();
  const publishingActions = usePublishingActions();
  const schemaActions = useSchemaActions();
  const [{ selection }, { setExpanded, setRenaming, setSelection }] = useTree();
  const [menuOpened, setMenuOpened] = createSignal(false);
  const startRenaming = (id: string) => {
    setMenuOpened(false);
    queueMicrotask(() => setRenaming(id));
  };
  const dropdownOptions = createMemo(() => {
    const opts: Array<Array<MenuItem | (() => JSX.Element)>> = [];
    const selectedCount = selection().length;
    const isMulti = selectedCount > 1;
    const selectedIDs = isMulti ? selection() : [collectionID];
    const selected = content.tree.splitIDs({ ids: selectedIDs });
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
      ids: targetCollections.map((selectedCollection) => selectedCollection.id),
      type: "collection" as const
    };
    const canConfigurePublishing =
      targetCollections.every((selectedCollection) => {
        return content.canCollection(selectedCollection.id, "collection:set-publishing");
      }) &&
      content.publishing() !== null &&
      !content.offline() &&
      !content.syncing();
    const canPublish = targetCollections.every((selectedCollection) => {
      return content.canCollection(selectedCollection.id, "publishing:publish-tree");
    });
    const canUnpublish = targetCollections.every((selectedCollection) => {
      return content.canCollection(selectedCollection.id, "publishing:unpublish-tree");
    });
    const migrationBlocked =
      selected.collections.some((id) => content.hasActiveSchemaMigration(id, true)) ||
      selected.entries.some((id) => {
        const selectedEntry = content.entries.get({ entryID: id });

        return content.hasActiveSchemaMigration(selectedEntry?.collectionID || null);
      });
    const migrationDisabled = migrationBlocked ? "Schema migration in progress" : false;

    if (!isMulti) {
      const canEditCollection = Boolean(
        collection && content.canCollection(collection.id, "collection:update")
      );
      const canCreateCollection = Boolean(
        collection && content.canCollection(collection.id, "collection:create-child")
      );
      const canCreateEntry = Boolean(collection && content.canEntry(collection.id, "entry:create"));
      const schema = collection ? content.schemas.get(collection.id) : null;

      if (content.getSchemaMigration(collectionID)) {
        opts.push([() => <ExplorerSchemaMigrationMenu collectionID={collectionID} />]);
      }

      const collectionOptions: MenuItem[] = [
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
        }
      ];

      if (canEditCollection) {
        collectionOptions.push({
          label: "Rename group",
          icon: "i-lucide:pencil",
          disabled: migrationDisabled,
          onClick: () => {
            if (!collection || content.readOnly(collection.id)) return;

            startRenaming(collectionID);
          },
          shortcut: "f2"
        });
      }

      opts.push(collectionOptions);

      const schemaOptions: MenuItem[] = [];

      if (schema) {
        schemaOptions.push({
          label: "Edit schema",
          icon: "i-tabler:pyramid",
          onClick: () => {
            setMenuOpened(false);
            navigate(`/${params.workspaceID || ""}/${schema.id}`);
          }
        });

        if (collection && canEditCollection && !content.offline() && !content.syncing()) {
          schemaOptions.push({
            label: "Remove schema",
            icon: "i-tabler:pyramid-off",
            disabled: migrationDisabled,
            onClick: () => {
              setMenuOpened(false);
              schemaActions.remove({
                collectionID: collection.id,
                collectionName: collection.name,
                schemaID: schema.id
              });
            }
          });
        }
      } else if (canEditCollection && !content.offline() && !content.syncing()) {
        schemaOptions.push({
          label: "Add schema",
          icon: "i-tabler:pyramid-plus",
          disabled: migrationDisabled,
          onClick: () => {
            if (!collection) return;

            setMenuOpened(false);
            void content.schemas
              .create(collection.id)
              .then((createdSchema) => {
                navigate(`/${params.workspaceID || ""}/${createdSchema.id}`);
              })
              .catch((error) => {
                console.error(error);
                notify({ type: "error", text: "Failed to add schema" });
              });
          }
        });
      }

      if (schemaOptions.length > 0) opts.push(schemaOptions);

      const createOptions: MenuItem[] = [];

      if (canCreateEntry) {
        createOptions.push({
          label: "New entry",
          icon: "i-lucide:file-plus-2",
          disabled: content.hasActiveSchemaMigration(collectionID)
            ? "Schema migration in progress"
            : false,
          onClick: () => {
            if (!collection || content.readOnly(collection.id)) return;

            const entry = content.entries.create({ collectionID });

            startRenaming(entry?.id || "");
            setExpanded((prev) => {
              return prev.includes(collectionID) ? prev : [...prev, collectionID];
            });
          },
          shortcut: "$mod+e"
        });
      }

      if (canCreateCollection) {
        createOptions.push({
          label: "New collection",
          icon: "i-material-symbols:create-new-folder-outline-rounded",
          disabled: content.hasActiveSchemaMigration(collectionID)
            ? "Schema migration in progress"
            : false,
          onClick: () => {
            if (!collection || content.readOnly(collection.id)) return;

            const newCollection = content.collections.create({ parentID: collectionID });

            startRenaming(newCollection?.id || "");
            setExpanded((prev) => {
              return prev.includes(collectionID) ? prev : [...prev, collectionID];
            });
          },
          shortcut: "$mod+shift+c"
        });
      }

      if (createOptions.length > 0) opts.push(createOptions);

      if (
        collection &&
        (content.canCollection(collection.id, "collection:set-restricted") ||
          content.canCollection(collection.id, "collection:manage-restricted-access"))
      ) {
        const restrictionRoot = content.collections.isRestrictionRoot({ collectionID });
        const requiresPro = !restrictionRoot && currentWorkspace()?.subscriptionPlan !== "pro";
        const canManageAssignments =
          restrictionRoot &&
          currentWorkspace()?.subscriptionPlan === "pro" &&
          content.canCollection(collection.id, "collection:manage-restricted-access");

        if (!requiresPro) {
          const restrictedOptions: MenuItem[] = [];

          if (canManageAssignments) {
            restrictedOptions.push({
              label: "Manage access",
              icon: "i-lucide:shield",
              disabled: migrationDisabled,
              onClick: () => {
                navigate(`/${params.workspaceID || ""}/${encodeURIComponent(collection.id)}`);
              }
            });
          }

          if (content.canCollection(collection.id, "collection:set-restricted")) {
            restrictedOptions.push({
              label: restrictionRoot ? "Derestrict access" : "Restrict access",
              icon: restrictionRoot ? "i-lucide:lock-open" : "i-lucide:lock",
              disabled: migrationDisabled,
              onClick: () => {
                void content.collections
                  .setRestricted({
                    collectionID: collection.id,
                    restricted: !restrictionRoot
                  })
                  .catch((error) => {
                    console.error(error);
                    notify({
                      type: "error",
                      text: restrictionRoot
                        ? "Failed to remove access restriction"
                        : "Failed to restrict collection"
                    });
                  });
              }
            });
          }

          if (restrictedOptions.length > 0) {
            opts.push(restrictedOptions);
          }
        }
      }
    }

    if (collectionsOnly && content.publishing() !== null) {
      const publishingOptions: MenuItem[] = [];

      if (!publishingEnabled && canConfigurePublishing) {
        publishingOptions.push({
          label: isMulti ? `Enable publishing for ${selectedCount} groups` : "Enable publishing",
          icon: "i-lucide:radio",
          onClick: () => {
            publishingActions.open("enable", publishingTarget);
          }
        });
      }

      if (publishingEnabled && canPublish) {
        publishingOptions.push({
          label: isMulti ? `Publish ${selectedCount} groups` : "Publish group",
          icon: "i-material-symbols:publish-rounded",
          onClick: () => publishingActions.open("publish", publishingTarget)
        });
      }

      if (publishingEnabled && canUnpublish) {
        publishingOptions.push({
          label: isMulti ? `Unpublish ${selectedCount} groups` : "Unpublish group",
          icon: "i-material-symbols:unpublished-outline-rounded",
          onClick: () => publishingActions.open("unpublish", publishingTarget)
        });
      }

      if (publishingRoot && canConfigurePublishing) {
        publishingOptions.push({
          label: isMulti ? `Disable publishing for ${selectedCount} groups` : "Disable publishing",
          icon: "i-lucide:radio-off",
          onClick: () => {
            publishingActions.open("disable", publishingTarget);
          }
        });
      }

      if (publishingOptions.length > 0) {
        opts.push(publishingOptions);
      }
    }

    const canDelete =
      selected.collections.every((id) => {
        return content.canCollection(id, "collection:delete");
      }) &&
      selected.entries.every((id) => {
        const entry = content.entries.get({ entryID: id });

        return content.canEntry(entry?.collectionID || null, "entry:delete");
      });

    if (canDelete) {
      opts.push([
        {
          label: isMulti ? `Delete ${selectedCount} items` : "Delete",
          icon: "i-lucide:trash",
          color: "danger",
          disabled: migrationBlocked ? "Schema migration in progress" : false,
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
