import { useClipboard } from "#web/context/clipboard";
import { useWorkspace } from "#web/context/workspace";
import { useTree } from "#web/components/tree";
import { useNavigate } from "@solidjs/router";

const useExplorerActions = () => {
  const { copyText } = useClipboard();
  const navigate = useNavigate();
  const [{ focusedID, selection, flattenedOrder }, tree] = useTree();
  const { workspaceID, content } = useWorkspace();

  const getFocusedVisibleID = () => {
    const focused = focusedID();

    return focused && flattenedOrder().includes(focused) ? focused : null;
  };
  const getCommandTargetID = () => {
    const selected = selection();

    return selected.length ? (selected.length === 1 ? selected[0] : null) : getFocusedVisibleID();
  };
  const ensureCollectionAction = (
    collectionID: string | null,
    action: "collection:create-child" | "collection:update"
  ) => {
    const migrationBlocked = content.hasActiveSchemaMigration(
      collectionID,
      action === "collection:update"
    );

    if (
      !content.offline() &&
      !content.syncing() &&
      !migrationBlocked &&
      content.canCollection(collectionID, action)
    ) {
      return true;
    }

    return false;
  };
  const ensureEntryAction = (
    collectionID: string | null,
    action: "entry:create" | "entry:update"
  ) => {
    if (
      !content.offline() &&
      !content.syncing() &&
      !content.hasActiveSchemaMigration(collectionID) &&
      content.canEntry(collectionID, action)
    ) {
      return true;
    }

    return false;
  };
  const createEntry = (collectionID?: string) => {
    if (!ensureEntryAction(collectionID || null, "entry:create")) return;

    tree.setRenaming(content.entries.create({ collectionID })?.id ?? "");
  };
  const createCollection = (collectionID?: string) => {
    if (!ensureCollectionAction(collectionID || null, "collection:create-child")) return;

    tree.setRenaming(content.collections.create({ parentID: collectionID })?.id ?? "");
  };
  const createForCommandTarget = (type: "entry" | "collection") => {
    const targetID = getCommandTargetID();
    const targetCollection = targetID
      ? content.collections.get({ collectionID: targetID })
      : undefined;
    const targetEntry = targetID ? content.entries.get({ entryID: targetID }) : undefined;
    const parentID = targetCollection?.id ?? targetEntry?.collectionID;
    const canCreate =
      type === "entry"
        ? ensureEntryAction(parentID || null, "entry:create")
        : ensureCollectionAction(parentID || null, "collection:create-child");

    if (!canCreate) return true;

    const created =
      type === "entry"
        ? content.entries.create({ collectionID: parentID })
        : content.collections.create({ parentID });

    if (targetCollection) {
      tree.setExpanded((expanded) => {
        return expanded.includes(targetCollection.id)
          ? expanded
          : [...expanded, targetCollection.id];
      });
    }

    tree.setRenaming(created?.id ?? "");
    return true;
  };
  const deleteTarget = () => {
    const selected = selection();
    const focused = getFocusedVisibleID();
    const ids = selected.length ? selected : focused ? [focused] : [];

    if (!ids.length) return false;

    const selectedContent = content.tree.splitIDs({ ids });
    const canDelete =
      selectedContent.collections.every((collectionID) => {
        return (
          content.canCollection(collectionID, "collection:delete") &&
          !content.hasActiveSchemaMigration(collectionID, true)
        );
      }) &&
      selectedContent.entries.every((entryID) => {
        const entry = content.entries.get({ entryID });

        return (
          content.canEntry(entry?.collectionID || null, "entry:delete") &&
          !content.hasActiveSchemaMigration(entry?.collectionID || null)
        );
      });

    if (!canDelete || content.offline() || content.syncing()) {
      return true;
    }

    content.tree.delete({ ids });
    tree.setSelection([]);
    if (!selected.length) tree.setFocusedID(null);
    return true;
  };
  const renameTarget = () => {
    const targetID = getCommandTargetID();
    const collection = targetID ? content.collections.get({ collectionID: targetID }) : undefined;
    const entry = targetID ? content.entries.get({ entryID: targetID }) : undefined;
    const canRename = collection
      ? content.canCollection(collection.id, "collection:update") &&
        !content.hasActiveSchemaMigration(collection.id, true)
      : content.canEntry(entry?.collectionID || null, "entry:update") &&
        !content.hasActiveSchemaMigration(entry?.collectionID || null);

    if (!targetID || !canRename || content.offline() || content.syncing()) return false;
    tree.setRenaming(targetID);
    return true;
  };
  const activateFocused = () => {
    const id = getFocusedVisibleID();

    if (!id) return false;
    tree.setExactSelection([]);
    if (content.collections.get({ collectionID: id })) {
      tree.toggleExpanded(id);
      return true;
    }
    if (!content.entries.get({ entryID: id })) return false;

    navigate(`/${workspaceID()}/${id}`);
    return true;
  };
  const copyTargetID = () => {
    const id = getCommandTargetID();

    if (!id) return false;
    void copyText(id, {
      success: "ID copied to clipboard",
      fallback: { title: "Copy ID manually" }
    });
    return true;
  };

  return {
    activateFocused,
    copyTargetID,
    createCollection,
    createEntry,
    createForCommandTarget,
    deleteTarget,
    getFocusedVisibleID,
    renameTarget
  };
};

export { useExplorerActions };
