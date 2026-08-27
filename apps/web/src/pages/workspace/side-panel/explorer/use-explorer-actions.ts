import { useClipboard } from "#web/context/clipboard";
import { useNotify } from "#web/context/notifications";
import { useWorkspace } from "#web/context/workspace";
import { useTree } from "#web/components/tree";
import { useNavigate } from "@solidjs/router";

const useExplorerActions = () => {
  const notify = useNotify();
  const { copyText } = useClipboard();
  const navigate = useNavigate();
  const [{ focusedID, selection, flattenedOrder }, tree] = useTree();
  const { workspaceID, content, hasPermission } = useWorkspace();

  const getFocusedVisibleID = () => {
    const focused = focusedID();

    return focused && flattenedOrder().includes(focused) ? focused : null;
  };
  const getCommandTargetID = () => {
    const selected = selection();

    return selected.length ? (selected.length === 1 ? selected[0] : null) : getFocusedVisibleID();
  };
  const notifyReadOnly = () => {
    return notify({
      type: "error",
      text: content.offline() || content.syncing() ? "Explorer is read-only" : "Permission denied"
    });
  };
  const ensureWritable = (collectionID: string | null = null) => {
    if (!content.readOnly(collectionID)) return true;

    notifyReadOnly();
    return false;
  };
  const createEntry = (collectionID?: string) => {
    if (!ensureWritable(collectionID || null)) return;

    tree.setRenaming(content.entries.create({ collectionID })?.id ?? "");
  };
  const createCollection = (collectionID?: string) => {
    if (!ensureWritable(collectionID || null)) return;

    tree.setRenaming(content.collections.create({ parentID: collectionID })?.id ?? "");
  };
  const createForCommandTarget = (type: "entry" | "collection") => {
    const targetID = getCommandTargetID();
    const targetCollection = targetID
      ? content.collections.get({ collectionID: targetID })
      : undefined;
    const targetEntry = targetID ? content.entries.get({ entryID: targetID }) : undefined;
    const parentID = targetCollection?.id ?? targetEntry?.collectionID;

    if (!ensureWritable(parentID || null)) return true;

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

    const deletable = content.tree.getDeletableIDs({ ids });
    const canDelete =
      deletable.collections.every((collectionID) => {
        return content.hasCollectionPermission(collectionID, "content");
      }) &&
      deletable.entries.every((entryID) => {
        const entry = content.entries.get({ entryID });

        return content.hasCollectionPermission(entry?.collectionID || null, "content");
      }) &&
      (hasPermission("restricted_collections") ||
        !deletable.collections.some((collectionID) => {
          return content.collections.isRestrictionRoot({ collectionID });
        }));

    if (!canDelete || content.offline() || content.syncing()) {
      notifyReadOnly();
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
    const collectionID = collection?.id ?? entry?.collectionID ?? null;

    if (!targetID || content.readOnly(collectionID)) return false;
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
    notifyReadOnly,
    renameTarget
  };
};

export { useExplorerActions };
