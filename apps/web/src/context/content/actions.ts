import { SetStoreFunction } from "solid-js/store";
import { App, ContentLevel } from "#context";

interface ContentActionsInput {
  contentGroups: Record<string, App.ContentGroup | undefined>;
  contentPieces: Record<string, App.ExtendedContentPieceWithAdditionalData<"order"> | undefined>;
  contentLevels: Record<string, ContentLevel | undefined>;
  setContentGroups: SetStoreFunction<Record<string, App.ContentGroup | undefined>>;
  setContentPieces: SetStoreFunction<
    Record<string, App.ExtendedContentPieceWithAdditionalData<"order"> | undefined>
  >;
  setContentLevels: SetStoreFunction<Record<string, ContentLevel | undefined>>;
}
interface ContentActions {
  createContentGroup(data: App.ContentGroup): void;
  deleteContentGroup(data: Pick<App.ContentGroup, "id">): void;
  moveContentGroup(data: Pick<App.ContentGroup, "id" | "ancestors">): void;
  updateContentGroup(data: Partial<App.ContentGroup> & Pick<App.ContentGroup, "id">): void;
  reorderContentGroup(data: Pick<App.ContentGroup, "id"> & { index: number }): void;
  createContentPiece(data: App.ExtendedContentPieceWithAdditionalData<"order">): void;
  deleteContentPiece(data: Pick<App.ContentPiece, "id">): void;
  updateContentPiece(
    data: Partial<App.ExtendedContentPieceWithAdditionalData<"order">> &
      Pick<App.ContentPiece, "id">
  ): void;
  moveContentPiece(data: {
    contentPiece: App.ExtendedContentPieceWithAdditionalData<"order">;
    nextReferenceId?: string;
    previousReferenceId?: string;
  }): void;
}

const createContentActions = ({
  contentGroups,
  contentPieces,
  contentLevels,
  setContentGroups,
  setContentPieces,
  setContentLevels
}: ContentActionsInput): ContentActions => {
  const createContentGroup: ContentActions["createContentGroup"] = (data) => {
    const parentId = data.ancestors.at(-1) || "";

    setContentGroups(data.id, data);

    if (contentLevels[parentId]) {
      setContentLevels(parentId, "groups", (groups) => [...groups, data.id]);
    }

    if (contentGroups[parentId]) {
      setContentGroups(parentId, "descendants", (descendants) => [...descendants, data.id]);
    }
  };
  const deleteContentGroup: ContentActions["deleteContentGroup"] = (data) => {
    const parentId = contentGroups[data.id]?.ancestors.at(-1) || "";

    // Update parent group
    if (contentLevels[parentId]) {
      setContentLevels(parentId, "groups", (groups) => {
        return groups.filter((groupId) => groupId !== data.id);
      });
    }

    if (contentGroups[parentId]) {
      setContentGroups(parentId, "descendants", (descendants) => {
        return descendants.filter((id) => id !== data.id);
      });
    }

    if (contentGroups[data.id]) {
      // Remove group
      setContentGroups(data.id, undefined);

      // Remove descendants (content pieces and groups)
      const removeDescendants = (groupId: string): void => {
        const group = contentGroups[groupId];

        if (!group) return;

        group.descendants.forEach((descendantId) => {
          const descendant = contentGroups[descendantId];

          if (contentLevels[descendantId]) {
            setContentLevels(descendantId, undefined);
          }

          if (descendant) {
            setContentGroups(descendantId, undefined);
            removeDescendants(descendantId);
          }
        });
      };

      removeDescendants(data.id);
    }
  };
  const moveContentGroup: ContentActions["moveContentGroup"] = (data) => {
    const currentParentId = contentGroups[data.id]?.ancestors.at(-1);
    const currentParent = contentGroups[currentParentId || ""];
    const newParentId = data.ancestors.at(-1) || "";
    const newParent = contentGroups[newParentId];

    if (contentGroups[data.id]) {
      // Update ancestors of the moved group
      setContentGroups(data.id, (group) => ({
        ...group,
        ancestors: data.ancestors
      }));

      // Update ancestors of the group's descendants
      const updateDescendants = (groupId: string): void => {
        const group = contentGroups[groupId];

        if (!group) return;

        group.descendants.forEach((descendantId) => {
          const descendant = contentGroups[descendantId];

          if (!descendant) return;

          const newAncestors = [
            ...group.ancestors,
            ...descendant.ancestors.slice(descendant.ancestors.indexOf(groupId) + 1)
          ];

          setContentGroups(descendantId, (descendant) => ({
            ...descendant,
            ancestors: newAncestors
          }));
          updateDescendants(descendantId);
        });
      };

      updateDescendants(data.id);
    }

    // Update old parent group
    if (currentParentId === "" || (currentParentId && currentParent)) {
      if (contentLevels[currentParentId]) {
        setContentLevels(currentParentId, "groups", (groups) => {
          return groups.filter((groupId) => groupId !== data.id);
        });
      }

      if (contentGroups[currentParentId]) {
        setContentGroups(currentParentId, (group) => ({
          ...group,
          descendants: currentParent!.descendants.filter((id) => id !== data.id)
        }));
      }
    }

    // Update new parent group
    if (newParentId === "" || (newParentId && newParent)) {
      if (contentLevels[newParentId]) {
        setContentLevels(newParentId, "groups", (groups) => [...groups, data.id]);
      }

      if (contentGroups[newParentId]) {
        setContentGroups(newParentId, (group) => ({
          ...group,
          descendants: [...(group?.descendants || []), data.id]
        }));
      }
    }
  };
  const updateContentGroup: ContentActions["updateContentGroup"] = (data) => {
    const contentGroup = contentGroups[data.id];

    if (contentGroup) {
      if (data.ancestors && data.ancestors.join(":") !== contentGroup.ancestors.join(":")) {
        moveContentGroup({
          ancestors: data.ancestors,
          id: data.id
        });
      }

      setContentGroups(data.id, data);
    }
  };
  const reorderContentGroup: ContentActions["reorderContentGroup"] = (data) => {
    const contentGroup = contentGroups[data.id];
    const parentId = contentGroup?.ancestors.at(-1) || "";

    if (contentGroups[parentId]) {
      setContentGroups(parentId, "descendants", (descendants) => {
        const newDescendants = [...descendants];
        const index = newDescendants.indexOf(data.id);

        if (index < 0) return descendants;

        newDescendants.splice(index, 1);
        newDescendants.splice(data.index, 0, data.id);

        return newDescendants;
      });
    }

    if (contentLevels[parentId]) {
      setContentLevels(parentId, "groups", (groups) => {
        const newGroups = [...groups];
        const index = newGroups.indexOf(data.id);

        if (index < 0) return groups;

        newGroups.splice(index, 1);
        newGroups.splice(data.index, 0, data.id);

        return newGroups;
      });
    }
  };
  const createContentPiece: ContentActions["createContentPiece"] = (data) => {
    setContentPieces(data.id, data);

    if (contentLevels[data.contentGroupId]) {
      setContentLevels(data.contentGroupId, "pieces", (pieces) => [data.id, ...pieces]);
    }
  };
  const moveContentPiece: ContentActions["moveContentPiece"] = (data) => {
    const currentContentPiece = contentPieces[data.contentPiece.id];
    const currentParentId = currentContentPiece?.contentGroupId || "";
    const newParentId = data.contentPiece.contentGroupId || "";

    if (currentContentPiece || contentGroups[newParentId] || contentGroups[currentParentId]) {
      setContentPieces(data.contentPiece.id, data.contentPiece);
    }

    if (!newParentId && !currentParentId) return;

    if (
      newParentId &&
      currentParentId &&
      newParentId !== currentParentId &&
      contentLevels[currentParentId]
    ) {
      // Remove content piece from old parent group
      setContentLevels(currentParentId, "pieces", (pieces) => {
        return pieces.filter((pieceId) => pieceId !== data.contentPiece.id);
      });
    }

    // Place content piece within the group
    if (!contentLevels[newParentId]) return;

    if (data.nextReferenceId) {
      setContentLevels(newParentId, "pieces", (pieces) => {
        const newPieces = [...pieces.filter((pieceId) => pieceId !== data.contentPiece.id)];
        const index = newPieces.indexOf(data.nextReferenceId!);

        if (index < 0) return pieces;

        newPieces.splice(index + 1, 0, data.contentPiece.id);

        return newPieces;
      });
    } else if (data.previousReferenceId) {
      setContentLevels(newParentId, "pieces", (pieces) => {
        const newPieces = [...pieces.filter((pieceId) => pieceId !== data.contentPiece.id)];
        const index = newPieces.indexOf(data.previousReferenceId!);

        if (index < 0) return pieces;

        newPieces.splice(index, 0, data.contentPiece.id);

        return newPieces;
      });
    } else {
      setContentLevels(newParentId, "pieces", (pieces) => {
        return [
          data.contentPiece.id,
          ...pieces.filter((pieceId) => pieceId !== data.contentPiece.id)
        ];
      });
    }
  };
  const updateContentPiece: ContentActions["updateContentPiece"] = (data) => {
    const currentContentPiece = contentPieces[data.id];
    const currentParentId = currentContentPiece?.contentGroupId || "";
    const newParentId = data.contentGroupId;

    if (currentContentPiece) {
      setContentPieces(data.id, data);
    }

    if (!newParentId || !currentParentId) return;

    if (newParentId !== currentParentId && currentContentPiece) {
      moveContentPiece({
        contentPiece: {
          ...currentContentPiece,
          ...data
        }
      });
    }
  };
  const deleteContentPiece: ContentActions["deleteContentPiece"] = (data) => {
    const currentContentPiece = contentPieces[data.id];
    const currentParentId = currentContentPiece?.contentGroupId || "";

    if (contentLevels[currentParentId]) {
      setContentLevels(currentParentId, "pieces", (pieces) => {
        return pieces.filter((pieceId) => pieceId !== data.id);
      });
    }

    if (currentContentPiece) {
      setContentPieces(data.id, undefined);
    }
  };

  return {
    createContentGroup,
    deleteContentGroup,
    updateContentGroup,
    moveContentGroup,
    reorderContentGroup,
    createContentPiece,
    deleteContentPiece,
    updateContentPiece,
    moveContentPiece
  };
};

export { createContentActions };
export type { ContentActions };
